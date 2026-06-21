import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import { Button, FlatList, Text, TouchableOpacity } from "react-native";
import { RootStackParamList } from "../../../navigation/types";
import { api } from "../../../core/api/client";
import { Screen } from "../../../shared/components/Screen";

type Props = NativeStackScreenProps<RootStackParamList, "TripList">;

export function TripListScreen({ navigation }: Props) {
  const trips = useQuery({ queryKey: ["trips"], queryFn: () => api<Array<{ id: string; name: string; status: string }>>("/trips") });
  return (
    <Screen>
      <Button title="Create trip" onPress={() => navigation.navigate("CreateTrip", {})} />
      <FlatList
        data={trips.data ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => navigation.navigate("TripMap", { tripId: item.id })}>
            <Text style={{ paddingVertical: 14, fontSize: 18 }}>{item.name}</Text>
            <Text>{item.status}</Text>
          </TouchableOpacity>
        )}
      />
    </Screen>
  );
}
