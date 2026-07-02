export type User = {
  id: string;
  email?: string | null;
  phone?: string | null;
  displayName: string;
  role: string;
};

export type AuthResponse = {
  user: User;
  accessToken: string;
  refreshToken: string;
};

export type Team = {
  id: string;
  name: string;
  description?: string | null;
  ownerId: string;
  inviteCode: string;
  createdAt: string;
  updatedAt: string;
};

export type TeamMember = {
  teamId: string;
  userId: string;
  role: "owner" | "leader" | "member";
  status: string;
  user?: User;
};

export type TripStatus = "draft" | "active" | "ended" | "cancelled";

export type Trip = {
  id: string;
  teamId: string;
  name: string;
  description?: string | null;
  leaderId: string;
  status: TripStatus;
  startTime?: string | null;
  endTime?: string | null;
  inviteCode: string;
  laggingThresholdM: number;
  createdAt: string;
  updatedAt: string;
};

export type TripMember = {
  tripId: string;
  userId: string;
  shareLocationEnabled: boolean;
  user?: User;
};

export type SafetyPoint = {
  id: string;
  type: "traffic_signal" | "camera";
  lat: number;
  lng: number;
  title: string;
  description?: string | null;
  distanceM?: number;
};

export type MemberLocation = {
  userId: string;
  displayName: string;
  lat: number;
  lng: number;
  speed?: number;
  recordedAt?: string;
};
