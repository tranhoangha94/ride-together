"use client";

import L from "leaflet";
import { useEffect, useState } from "react";
import { MapContainer, Marker, Popup, TileLayer, Tooltip, useMap, useMapEvents } from "react-leaflet";
import { ParticipantLocation, SafetyPoint } from "../lib/types";

type Props = {
  center: { lat: number; lng: number };
  members: ParticipantLocation[];
  leaderNickname?: string;
  safetyPoints: SafetyPoint[];
  selfId?: string | null;
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

export function RoomMap({ center, members, leaderNickname, safetyPoints, selfId }: Props) {
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
        {members.map((member) => (
          <Marker
            key={member.participantId}
            position={[member.lat, member.lng]}
            icon={member.nickname === leaderNickname ? LEADER_ICON : MEMBER_ICON}
            // Riders bunched up together will have overlapping name tags;
            // tapping a dot brings its tag to the front so it's readable.
            eventHandlers={{ click: (e) => e.target.bringToFront() }}
          >
            <Tooltip permanent direction="top" offset={[0, -12]} className="member-label">
              {member.nickname}
            </Tooltip>
            <Popup>
              {member.nickname} · {Math.round(member.speed ?? 0)} km/h
            </Popup>
          </Marker>
        ))}
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
