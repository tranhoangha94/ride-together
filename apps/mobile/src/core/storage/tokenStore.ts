import * as SecureStore from "expo-secure-store";

const ACCESS_TOKEN = "ride.accessToken";
const REFRESH_TOKEN = "ride.refreshToken";

export async function saveTokens(accessToken: string, refreshToken: string) {
  await SecureStore.setItemAsync(ACCESS_TOKEN, accessToken);
  await SecureStore.setItemAsync(REFRESH_TOKEN, refreshToken);
}

export async function getAccessToken() {
  return SecureStore.getItemAsync(ACCESS_TOKEN);
}

export async function clearTokens() {
  await SecureStore.deleteItemAsync(ACCESS_TOKEN);
  await SecureStore.deleteItemAsync(REFRESH_TOKEN);
}
