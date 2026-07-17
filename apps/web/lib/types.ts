export type Room = {
  id: string;
  code: string;
  name: string;
  leaderNickname: string;
  leaderUserId?: string | null;
  leaderParticipantId?: string | null;
  started: boolean;
  destinationLabel?: string | null;
  destinationLat?: number | null;
  destinationLng?: number | null;
  createdAt: string;
};

export type LobbyParticipant = {
  participantId: string;
  nickname: string;
};

export type Destination = { label: string; lat: number; lng: number };

export type SafetyPoint = {
  id: string;
  type: "traffic_signal" | "camera";
  lat: number;
  lng: number;
  title: string;
  description?: string | null;
  distanceM?: number;
};

export type ParticipantLocation = {
  participantId: string;
  nickname: string;
  lat: number;
  lng: number;
  speed?: number;
  recordedAt?: string;
};
