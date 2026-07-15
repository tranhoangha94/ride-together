"use client";

import L from "leaflet";
import { MapContainer, Marker, TileLayer } from "react-leaflet";

const PIN_ICON = L.divIcon({
  className: "",
  html: `<div style="width:16px;height:16px;border-radius:50% 50% 50% 0;background:#D92D20;border:2px solid #fff;transform:rotate(-45deg);box-shadow:0 1px 4px rgba(0,0,0,0.4)"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 16]
});

export function MiniMap({ lat, lng }: { lat: number; lng: number }) {
  return (
    <div className="mini-map">
      <MapContainer
        key={`${lat}-${lng}`}
        center={[lat, lng]}
        zoom={14}
        style={{ width: "100%", height: "100%" }}
        dragging={false}
        scrollWheelZoom={false}
        doubleClickZoom={false}
        touchZoom={false}
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Marker position={[lat, lng]} icon={PIN_ICON} />
      </MapContainer>
    </div>
  );
}
