import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { Button, TextInput } from "react-native";
import { RootStackParamList } from "../../../navigation/types";
import { api } from "../../../core/api/client";
import { Screen } from "../../../shared/components/Screen";

type Props = NativeStackScreenProps<RootStackParamList, "CreateTrip">;

export function CreateTripScreen({ route, navigation }: Props) {
  const [teamId, setTeamId] = useState(route.params?.teamId ?? "");
  const [name, setName] = useState("");

  async function create() {
    const trip = await api<{ id: string }>("/trips", {
      method: "POST",
      body: JSON.stringify({ teamId, name })
    });
    navigation.replace("TripMap", { tripId: trip.id });
  }

  return (
    <Screen>
      <TextInput value={teamId} onChangeText={setTeamId} placeholder="Team ID" style={{ borderWidth: 1, padding: 12, borderRadius: 8, marginBottom: 12 }} />
      <TextInput value={name} onChangeText={setName} placeholder="Trip name" style={{ borderWidth: 1, padding: 12, borderRadius: 8, marginBottom: 12 }} />
      <Button title="Create trip" onPress={create} />
    </Screen>
  );
}
