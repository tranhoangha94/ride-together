import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { Button, StyleSheet, Text, TextInput } from "react-native";
import { api } from "../../../core/api/client";
import { useAuthStore } from "../../../core/auth/authStore";
import { Screen } from "../../../shared/components/Screen";
import { RootStackParamList } from "../../../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "Login">;

export function LoginScreen({ navigation }: Props) {
  const [emailOrPhone, setEmailOrPhone] = useState("leader@example.com");
  const [password, setPassword] = useState("password123");
  const setTokens = useAuthStore((state) => state.setTokens);

  async function login() {
    const result = await api<{ accessToken: string; refreshToken: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ emailOrPhone, password })
    });
    await setTokens(result.accessToken, result.refreshToken);
    navigation.replace("Home");
  }

  return (
    <Screen>
      <Text style={styles.title}>Ride Together</Text>
      <TextInput style={styles.input} value={emailOrPhone} onChangeText={setEmailOrPhone} autoCapitalize="none" />
      <TextInput style={styles.input} value={password} onChangeText={setPassword} secureTextEntry />
      <Button title="Login" onPress={login} />
      <Button title="Create account" onPress={() => navigation.navigate("Register")} />
      <Button title="View demo map" onPress={() => navigation.navigate("TripMap", { tripId: "demo-trip", demo: true })} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 28, fontWeight: "700", marginBottom: 24 },
  input: { borderWidth: 1, borderColor: "#D0D5DD", borderRadius: 8, padding: 12, marginBottom: 12, backgroundColor: "#FFF" }
});
