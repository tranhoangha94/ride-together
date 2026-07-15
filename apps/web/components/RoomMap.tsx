"use client";

import L from "leaflet";
import { useEffect, useRef, useState } from "react";
import { MapContainer, Marker, Polyline, Popup, TileLayer, Tooltip, useMap, useMapEvents } from "react-leaflet";
import { fetchRoute } from "../lib/geocode";
import { Destination, ParticipantLocation, SafetyPoint } from "../lib/types";

type Props = {
  center: { lat: number; lng: number };
  members: ParticipantLocation[];
  leaderNickname?: string;
  safetyPoints: SafetyPoint[];
  selfId?: string | null;
  destination?: Destination | null;
};

function dotIcon(color: string, size: number) {
  return L.divIcon({
    className: "",
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.4)"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2]
  });
}

const LEADER_ICON = dotIcon("#1570EF", 20);
const MEMBER_ICON = dotIcon("#12B76A", 20);
const CAMERA_ICON = dotIcon("#D92D20", 14);
const SIGNAL_ICON = dotIcon("#DC6803", 14);
const DESTINATION_ICON = L.divIcon({
  className: "",
  html: `<div style="width:22px;height:22px;border-radius:50% 50% 50% 0;background:#D92D20;border:2px solid #fff;transform:rotate(-45deg);box-shadow:0 1px 4px rgba(0,0,0,0.4)"></div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 22]
});

function distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

const ROUTE_REFETCH_METERS = 50;
const ROUTE_REFETCH_MIN_MS = 10_000;

// Draws a suggested route (via OSRM's free public routing) from the rider's
// own position to the room's destination. Refetches only when the rider has
// moved meaningfully or the destination changed, to stay light on the
// public OSRM instance.
function RouteLayer({ from, to }: { from: { lat: number; lng: number } | null; to: Destination | null }) {
  const [route, setRoute] = useState<[number, number][] | null>(null);
  const lastFetchRef = useRef<{ at: number; from: { lat: number; lng: number } } | null>(null);

  useEffect(() => {
    if (!from || !to) {
      setRoute(null);
      return;
    }
    const last = lastFetchRef.current;
    const now = Date.now();
    if (last && now - last.at < ROUTE_REFETCH_MIN_MS && distanceMeters(last.from, from) < ROUTE_REFETCH_METERS) {
      return;
    }
    lastFetchRef.current = { at: now, from };
    let cancelled = false;
    fetchRoute(from, to).then((coords) => {
      if (!cancelled) setRoute(coords);
    });
    return () => {
      cancelled = true;
    };
  }, [from?.lat, from?.lng, to?.lat, to?.lng]);

  if (!route) return null;
  return <Polyline positions={route} pathOptions={{ color: "#1570EF", weight: 4, opacity: 0.6 }} />;
}

// Follows `target` (the rider's own position) while `following` is on. As
// soon as the rider drags the map themselves, following turns off so their
// pan/zoom isn't yanked back on the next location update.
function FollowController({
  target,
  following,
  onUserDrag
}: {
  target: { lat: number; lng: number } | null;
  following: boolean;
  onUserDrag: () => void;
}) {
  const map = useMap();

  useEffect(() => {
    if (following && target) {
      map.setView(target, Math.max(map.getZoom(), 16), { animate: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target?.lat, target?.lng, following]);

  useMapEvents({
    dragstart: onUserDrag
  });

  return null;
}

type TooltipDirection = "top" | "right" | "bottom" | "left";
const DIRECTIONS: TooltipDirection[] = ["top", "right", "bottom", "left"];
const OVERLAP_PX = 34;
const BASE_OFFSET = 12;
const RING_STEP = 16;

function directionOffset(direction: TooltipDirection, magnitude: number): [number, number] {
  switch (direction) {
    case "top":
      return [0, -magnitude];
    case "bottom":
      return [0, magnitude];
    case "left":
      return [-magnitude, 0];
    case "right":
      return [magnitude, 0];
  }
}

type Placement = { direction: TooltipDirection; offset: [number, number] };

// Riders travelling in a pack land on nearly the same pixel, so their
// permanent name tags stack on top of each other and become unreadable.
// Projects each member to screen pixels and fans out tags that collide
// (within OVERLAP_PX) across top/right/bottom/left instead of always "top".
function useLabelPlacements(members: ParticipantLocation[]): Record<string, Placement> {
  const map = useMap();
  const [placements, setPlacements] = useState<Record<string, Placement>>({});

  useEffect(() => {
    function recompute() {
      const placed: { id: string; pt: L.Point }[] = [];
      const next: Record<string, Placement> = {};

      for (const member of members) {
        const pt = map.latLngToContainerPoint([member.lat, member.lng]);
        const nearbyCount = placed.filter((p) => p.pt.distanceTo(pt) < OVERLAP_PX).length;
        const direction = DIRECTIONS[nearbyCount % DIRECTIONS.length];
        const ring = 1 + Math.floor(nearbyCount / DIRECTIONS.length);
        const magnitude = BASE_OFFSET + (ring - 1) * RING_STEP;
        next[member.participantId] = { direction, offset: directionOffset(direction, magnitude) };
        placed.push({ id: member.participantId, pt });
      }

      setPlacements(next);
    }

    recompute();
    map.on("zoomend", recompute);
    map.on("moveend", recompute);
    return () => {
      map.off("zoomend", recompute);
      map.off("moveend", recompute);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, members]);

  return placements;
}

function MembersLayer({ members, leaderNickname }: { members: ParticipantLocation[]; leaderNickname?: string }) {
  const placements = useLabelPlacements(members);

  return (
    <>
      {members.map((member) => {
        const placement = placements[member.participantId] ?? { direction: "top" as const, offset: [0, -BASE_OFFSET] as [number, number] };
        return (
          <Marker
            // react-leaflet's Tooltip doesn't re-apply `direction`/`offset` to
            // an already-mounted Leaflet tooltip (they're baked in at bind
            // time), so force a remount whenever the computed placement
            // changes by folding it into the key.
            key={`${member.participantId}:${placement.direction}:${placement.offset.join(",")}`}
            position={[member.lat, member.lng]}
            icon={member.nickname === leaderNickname ? LEADER_ICON : MEMBER_ICON}
            // Still useful even with auto-nudging: brings a tag on top of
            // whichever marker was tapped when tags are merely close, not
            // fully overlapping.
            eventHandlers={{ click: (e) => e.target.bringToFront() }}
          >
            <Tooltip permanent direction={placement.direction} offset={placement.offset} className="member-label">
              {member.nickname}
            </Tooltip>
            <Popup>
              {member.nickname} · {Math.round(member.speed ?? 0)} km/h
            </Popup>
          </Marker>
        );
      })}
    </>
  );
}

export function RoomMap({ center, members, leaderNickname, safetyPoints, selfId, destination }: Props) {
  const [following, setFollowing] = useState(true);
  const self = selfId ? members.find((m) => m.participantId === selfId) : undefined;
  const followTarget = self ? { lat: self.lat, lng: self.lng } : null;

  return (
    <div className="room-map">
      <MapContainer center={center} zoom={15} style={{ width: "100%", height: "100%" }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FollowController target={followTarget} following={following} onUserDrag={() => setFollowing(false)} />
        <MembersLayer members={members} leaderNickname={leaderNickname} />
        {destination ? <RouteLayer from={followTarget} to={destination} /> : null}
        {destination ? (
          <Marker position={[destination.lat, destination.lng]} icon={DESTINATION_ICON}>
            <Popup>{destination.label}</Popup>
          </Marker>
        ) : null}
        {safetyPoints.map((point) => (
          <Marker
            key={point.id}
            position={[point.lat, point.lng]}
            icon={point.type === "camera" ? CAMERA_ICON : SIGNAL_ICON}
          >
            <Popup>{point.title}</Popup>
          </Marker>
        ))}
      </MapContainer>

      {!following && followTarget ? (
        <button className="locate-btn" onClick={() => setFollowing(true)} aria-label="Về vị trí của tôi">
          <span className="locate-btn-dot" />
        </button>
      ) : null}
    </div>
  );
}
