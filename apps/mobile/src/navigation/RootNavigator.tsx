import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { LoginScreen } from "../features/auth/screens/LoginScreen";
import { RegisterScreen } from "../features/auth/screens/RegisterScreen";
import { TeamListScreen } from "../features/teams/screens/TeamListScreen";
import { TeamDetailScreen } from "../features/teams/screens/TeamDetailScreen";
import { CreateTeamScreen } from "../features/teams/screens/CreateTeamScreen";
import { TripListScreen } from "../features/trips/screens/TripListScreen";
import { CreateTripScreen } from "../features/trips/screens/CreateTripScreen";
import { TripMembersScreen } from "../features/trips/screens/TripMembersScreen";
import { TripMapScreen } from "../features/map/screens/TripMapScreen";
import { CheckpointScreen } from "../features/checkpoints/screens/CheckpointScreen";
import { SettingsScreen } from "../features/settings/screens/SettingsScreen";
import { HomeScreen } from "../features/trips/screens/HomeScreen";
import { RootStackParamList } from "./types";

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const bypassAuth = process.env.EXPO_PUBLIC_BYPASS_AUTH === "true";

  return (
    <Stack.Navigator initialRouteName={bypassAuth ? "TripMap" : "Login"}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="TeamList" component={TeamListScreen} options={{ title: "Teams" }} />
      <Stack.Screen name="TeamDetail" component={TeamDetailScreen} options={{ title: "Team" }} />
      <Stack.Screen name="CreateTeam" component={CreateTeamScreen} options={{ title: "Create Team" }} />
      <Stack.Screen name="TripList" component={TripListScreen} options={{ title: "Trips" }} />
      <Stack.Screen name="CreateTrip" component={CreateTripScreen} options={{ title: "Create Trip" }} />
      <Stack.Screen
        name="TripMap"
        component={TripMapScreen}
        initialParams={bypassAuth ? { tripId: "demo-trip", demo: true } : undefined}
        options={{ headerShown: false }}
      />
      <Stack.Screen name="TripMembers" component={TripMembersScreen} options={{ title: "Members" }} />
      <Stack.Screen name="Checkpoints" component={CheckpointScreen} options={{ title: "Checkpoints" }} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
    </Stack.Navigator>
  );
}
