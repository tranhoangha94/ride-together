import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import { Button, Text } from "react-native";
import { RootStackParamList } from "../../../navigation/types";
import { api } from "../../../core/api/client";
import { Screen } from "../../../shared/components/Screen";

type Props = NativeStackScreenProps<RootStackParamList, "TeamDetail">;

export function TeamDetailScreen({ route, navigation }: Props) {
  const { teamId } = route.params;
  const detail = useQuery({ queryKey: ["team", teamId], queryFn: () => api<{ team: { name: string }; members: unknown[] }>(`/teams/${teamId}`) });
  return (
    <Screen>
      <Text style={{ fontSize: 24, fontWeight: "700" }}>{detail.data?.team.name}</Text>
      <Text>{detail.data?.members.length ?? 0} members</Text>
      <Button title="Create trip" onPress={() => navigation.navigate("CreateTrip", { teamId })} />
    </Screen>
  );
}
