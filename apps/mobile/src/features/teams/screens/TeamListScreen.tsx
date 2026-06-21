import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import { Button, FlatList, Text, TouchableOpacity } from "react-native";
import { RootStackParamList } from "../../../navigation/types";
import { api } from "../../../core/api/client";
import { Screen } from "../../../shared/components/Screen";

type Props = NativeStackScreenProps<RootStackParamList, "TeamList">;

export function TeamListScreen({ navigation }: Props) {
  const teams = useQuery({ queryKey: ["teams"], queryFn: () => api<Array<{ id: string; name: string }>>("/teams") });
  return (
    <Screen>
      <Button title="Create team" onPress={() => navigation.navigate("CreateTeam")} />
      <FlatList
        data={teams.data ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => navigation.navigate("TeamDetail", { teamId: item.id })}>
            <Text style={{ paddingVertical: 14, fontSize: 18 }}>{item.name}</Text>
          </TouchableOpacity>
        )}
      />
    </Screen>
  );
}
