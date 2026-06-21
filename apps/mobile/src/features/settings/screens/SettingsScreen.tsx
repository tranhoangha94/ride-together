import { Button, Text } from "react-native";
import { useAuthStore } from "../../../core/auth/authStore";
import { Screen } from "../../../shared/components/Screen";

export function SettingsScreen() {
  const logout = useAuthStore((state) => state.logout);
  return (
    <Screen>
      <Text style={{ fontSize: 20, fontWeight: "700", marginBottom: 16 }}>Settings</Text>
      <Button title="Logout" onPress={logout} />
    </Screen>
  );
}
