export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Home: undefined;
  TeamList: undefined;
  TeamDetail: { teamId: string };
  CreateTeam: undefined;
  TripList: undefined;
  CreateTrip: { teamId?: string };
  TripMap: { tripId: string; demo?: boolean };
  TripMembers: { tripId: string };
  Checkpoints: { tripId: string };
  Settings: undefined;
};
