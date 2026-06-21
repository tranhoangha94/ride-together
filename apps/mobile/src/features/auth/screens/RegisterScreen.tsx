import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { Button, StyleSheet, Text, TextInput } from "react-native";
import { api } from "../../../core/api/client";
import { useAuthStore } from "../../../core/auth/authStore";
import { Screen } from "../../../shared/components/Screen";
import { RootStackParamList } from "../../../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "Register">;

export function RegisterScreen({ navigation }: Props) {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const setTokens = useAuthStore((state) => state.setTokens);

  async function register() {
    const result = await api<{ accessToken: string; refreshToken: string }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, displayName })
    });
    await setTokens(result.accessToken, result.refreshToken);
    navigation.replace("TripMap", { tripId: "demo-trip", demo: true });
  }

  return (
    <Screen>
      <Text style={styles.title}>Create account</Text>
      <TextInput style={styles.input} value={displayName} onChangeText={setDisplayName} placeholder="Display name" />
      <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="Email" autoCapitalize="none" />
      <TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder="Password" secureTextEntry />
      <Button title="Register" onPress={register} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: "700", marginBottom: 24 },
  input: { borderWidth: 1, borderColor: "#D0D5DD", borderRadius: 8, padding: 12, marginBottom: 12, backgroundColor: "#FFF" }
});
