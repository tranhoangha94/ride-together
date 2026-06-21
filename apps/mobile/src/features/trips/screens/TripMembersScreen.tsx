import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import { FlatList, Text } from "react-native";
import { RootStackParamList } from "../../../navigation/types";
import { api } from "../../../core/api/client";
import { Screen } from "../../../shared/components/Screen";

type Props = NativeStackScreenProps<RootStackParamList, "TripMembers">;

export function TripMembersScreen({ route }: Props) {
  const members = useQuery({
    queryKey: ["trip-members", route.params.tripId],
    queryFn: () => api<Array<{ id: string; userId: string; role: string; shareLocationEnabled: boolean }>>(`/trips/${route.params.tripId}/members`)
  });
  return (
    <Screen>
      <FlatList
        data={members.data ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <Text style={{ paddingVertical: 12 }}>{item.userId} - {item.role}</Text>}
      />
    </Screen>
  );
}
