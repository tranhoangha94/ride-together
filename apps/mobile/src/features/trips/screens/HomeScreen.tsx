import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Button, Text } from "react-native";
import { RootStackParamList } from "../../../navigation/types";
import { Screen } from "../../../shared/components/Screen";

type Props = NativeStackScreenProps<RootStackParamList, "Home">;

export function HomeScreen({ navigation }: Props) {
  return (
    <Screen>
      <Text style={{ fontSize: 28, fontWeight: "700", marginBottom: 8 }}>Ride Together</Text>
      <Text style={{ color: "#667085", marginBottom: 24 }}>Theo dõi đoàn phượt, cảnh báo camera & đèn giao thông</Text>
      <Button title="🗺️ Xem bản đồ demo" onPress={() => navigation.navigate("TripMap", { tripId: "demo-trip", demo: true })} />
      <Button title="Đội nhóm" onPress={() => navigation.navigate("TeamList")} />
      <Button title="Chuyến đi" onPress={() => navigation.navigate("TripList")} />
      <Button title="Cài đặt" onPress={() => navigation.navigate("Settings")} />
    </Screen>
  );
}
