import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { Button, TextInput } from "react-native";
import { RootStackParamList } from "../../../navigation/types";
import { api } from "../../../core/api/client";
import { Screen } from "../../../shared/components/Screen";

type Props = NativeStackScreenProps<RootStackParamList, "CreateTeam">;

export function CreateTeamScreen({ navigation }: Props) {
  const [name, setName] = useState("");
  async function create() {
    await api("/teams", { method: "POST", body: JSON.stringify({ name }) });
    navigation.goBack();
  }
  return (
    <Screen>
      <TextInput value={name} onChangeText={setName} placeholder="Team name" style={{ borderWidth: 1, padding: 12, borderRadius: 8 }} />
      <Button title="Create" onPress={create} />
    </Screen>
  );
}
