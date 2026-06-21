export type UUID = string;

export type LatLng = {
  lat: number;
  lng: number;
};

export type TripStatus = "draft" | "active" | "ended" | "cancelled";
export type MemberRole = "owner" | "leader" | "member";
export type SosStatus = "active" | "resolved";

export type LocationPayload = LatLng & {
  tripId: UUID;
  speed?: number;
  heading?: number;
  accuracy?: number;
  batteryLevel?: number;
  recordedAt: string;
};

export type MemberLocationUpdatedEvent = {
  tripId: UUID;
  user: {
    id: UUID;
    displayName: string;
    avatarUrl?: string | null;
  };
  location: Omit<LocationPayload, "tripId">;
};
