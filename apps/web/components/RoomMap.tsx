"use client";

import L from "leaflet";
import { useEffect } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import { MemberLocation, SafetyPoint } from "../lib/types";

type Props = {
  center: { lat: number; lng: number };
  members: MemberLocation[];
  leaderId?: string;
  safetyPoints: SafetyPoint[];
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

function RecenterOnChange({ center }: { center: { lat: number; lng: number } }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom(), { animate: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center.lat, center.lng]);
  return null;
}

export function RoomMap({ center, members, leaderId, safetyPoints }: Props) {
  return (
    <div className="room-map">
      <MapContainer center={center} zoom={15} style={{ width: "100%", height: "100%" }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <RecenterOnChange center={center} />
        {members.map((member) => (
          <Marker
            key={member.userId}
            position={[member.lat, member.lng]}
            icon={member.userId === leaderId ? LEADER_ICON : MEMBER_ICON}
          >
            <Popup>
              {member.displayName} · {Math.round(member.speed ?? 0)} km/h
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
    </div>
  );
}
