"use client";

import L from "leaflet";
import { useEffect, useRef, useState } from "react";
import { MapContainer, Marker, Polyline, Popup, TileLayer, Tooltip, useMap, useMapEvents } from "react-leaflet";
import { fetchRoute, RouteResult, RouteStep } from "../lib/geocode";
import { distanceMeters } from "../lib/geo";
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

function badgeIcon(svgInner: string, color: string, size = 26) {
  return L.divIcon({
    className: "",
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;">${svgInner}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2]
  });
}

const LEADER_ICON = dotIcon("#1570EF", 20);
const MEMBER_ICON = dotIcon("#12B76A", 20);

// Camera glyph (surveillance camera silhouette) so a "camera phạt nguội"
// marker reads at a glance instead of just being an unlabeled red dot.
const CAMERA_ICON = badgeIcon(
  `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 8a2 2 0 0 1 2-2h2.5l1.2-1.6a1 1 0 0 1 .8-.4h5a1 1 0 0 1 .8.4L16.5 6H19a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8Z" stroke="#fff" stroke-width="1.7" stroke-linejoin="round"/>
    <circle cx="12" cy="13" r="3.3" stroke="#fff" stroke-width="1.7"/>
  </svg>`,
  "#D92D20"
);

// Traffic-light glyph (three stacked lamps) for signal markers.
const SIGNAL_ICON = badgeIcon(
  `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="7" y="2" width="10" height="20" rx="3" stroke="#fff" stroke-width="1.7"/>
    <circle cx="12" cy="7.2" r="1.9" fill="#fff"/>
    <circle cx="12" cy="12" r="1.9" fill="#fff"/>
    <circle cx="12" cy="16.8" r="1.9" fill="#fff"/>
  </svg>`,
  "#DC6803"
);
const DESTINATION_ICON = L.divIcon({
  className: "",
  html: `<div style="width:22px;height:22px;border-radius:50% 50% 50% 0;background:#D92D20;border:2px solid #fff;transform:rotate(-45deg);box-shadow:0 1px 4px rgba(0,0,0,0.4)"></div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 22]
});

const ROUTE_REFETCH_METERS = 50;
const ROUTE_REFETCH_MIN_MS = 10_000;

// Draws a suggested route (via OSRM's free public routing) from the rider's
// own position to the room's destination. Refetches only when the rider has
// moved meaningfully or the destination changed, to stay light on the
// public OSRM instance. Reports the full route (incl. turn-by-turn steps)
// up to the parent so it can drive a Google-Maps-style navigation banner.
function RouteLayer({
  from,
  to,
  onRoute
}: {
  from: { lat: number; lng: number } | null;
  to: Destination | null;
  onRoute: (route: RouteResult | null) => void;
}) {
  const [route, setRoute] = useState<RouteResult | null>(null);
  const lastFetchRef = useRef<{ at: number; from: { lat: number; lng: number } } | null>(null);

  useEffect(() => {
    if (!from || !to) {
      setRoute(null);
      onRoute(null);
      return;
    }
    const last = lastFetchRef.current;
    const now = Date.now();
    if (last && now - last.at < ROUTE_REFETCH_MIN_MS && distanceMeters(last.from, from) < ROUTE_REFETCH_METERS) {
      return;
    }
    let cancelled = false;
    fetchRoute(from, to).then((result) => {
      // Only record this as "the last fetch" once it actually lands - if it
      // got cancelled (e.g. React 18 Strict Mode's dev-only double-invoke of
      // effects), the refetch-throttle above must not treat it as done, or
      // the real, surviving effect run gets starved out and never retries.
      if (!cancelled) {
        lastFetchRef.current = { at: Date.now(), from };
        setRoute(result);
        onRoute(result);
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from?.lat, from?.lng, to?.lat, to?.lng]);

  if (!route) return null;
  return <Polyline positions={route.coordinates} pathOptions={{ color: "#1570EF", weight: 4, opacity: 0.6 }} />;
}

const NEXT_STEP_ARRIVE_M = 40;

function maneuverArrow(instruction: string): string {
  if (instruction.includes("đến nơi")) return "🏁";
  if (instruction.includes("vòng xuyến")) return "⟳";
  if (instruction.includes("Quay đầu")) return "↩";
  if (instruction.includes("gắt sang trái")) return "↙";
  if (instruction.includes("gắt sang phải")) return "↘";
  if (instruction.includes("nhẹ sang trái")) return "↖";
  if (instruction.includes("nhẹ sang phải")) return "↗";
  if (instruction.includes("Rẽ trái")) return "⬅";
  if (instruction.includes("Rẽ phải")) return "➡";
  return "⬆";
}

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters / 10) * 10} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

// Tracks which upcoming turn to show, Google-Maps-style: advances to the
// next step once the rider gets within NEXT_STEP_ARRIVE_M of the current
// step's maneuver point. Resets whenever a brand new route comes in.
function useCurrentStep(steps: RouteStep[], position: { lat: number; lng: number } | null) {
  const indexRef = useRef(1);
  const [index, setIndex] = useState(1);

  useEffect(() => {
    indexRef.current = Math.min(1, Math.max(0, steps.length - 1));
    setIndex(indexRef.current);
  }, [steps]);

  useEffect(() => {
    if (!position || steps.length === 0) return;
    let idx = indexRef.current;
    while (idx < steps.length - 1 && distanceMeters(position, steps[idx].location) < NEXT_STEP_ARRIVE_M) {
      idx++;
    }
    if (idx !== indexRef.current) {
      indexRef.current = idx;
      setIndex(idx);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position?.lat, position?.lng, steps]);

  return steps[index] ?? null;
}

// Google-Maps-style turn-by-turn banner: big arrow + instruction + live
// distance to the upcoming turn, overlaid on top of the map.
function NavigationBanner({ steps, position }: { steps: RouteStep[]; position: { lat: number; lng: number } | null }) {
  const step = useCurrentStep(steps, position);
  if (!step || !position) return null;

  const distance = distanceMeters(position, step.location);
  return (
    <div className="nav-banner">
      <span className="nav-banner-arrow">{maneuverArrow(step.instruction)}</span>
      <div className="nav-banner-text">
        <div className="nav-banner-instruction">{step.instruction}</div>
        <div className="nav-banner-distance">{formatDistance(distance)}</div>
      </div>
    </div>
  );
}

function RouteSummaryBar({ route }: { route: RouteResult }) {
  const minutes = Math.round(route.totalDurationS / 60);
  return (
    <div className="route-summary-bar">
      {formatDistance(route.totalDistanceM)} · {minutes < 1 ? "dưới 1 phút" : `${minutes} phút`}
    </div>
  );
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
  const [route, setRoute] = useState<RouteResult | null>(null);
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
        {destination ? <RouteLayer from={followTarget} to={destination} onRoute={setRoute} /> : null}
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

      {route && route.steps.length > 0 ? <NavigationBanner steps={route.steps} position={followTarget} /> : null}
      {route ? <RouteSummaryBar route={route} /> : null}

      {!following && followTarget ? (
        <button className="locate-btn" onClick={() => setFollowing(true)} aria-label="Về vị trí của tôi">
          <span className="locate-btn-dot" />
        </button>
      ) : null}
    </div>
  );
}
