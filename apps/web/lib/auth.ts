import { api, ApiError, clearTokens, getAccessToken, setTokens } from "./api";

export type CurrentUser = {
  id: string;
  email?: string | null;
  phone?: string | null;
  displayName: string;
  avatarUrl?: string | null;
  role: "user" | "admin";
};

type AuthResponse = {
  user: CurrentUser;
  accessToken: string;
  refreshToken: string;
};

export function isLoggedIn(): boolean {
  return !!getAccessToken();
}

export function logout() {
  clearTokens();
}

export async function register(dto: { email?: string; phone?: string; password: string; displayName: string }) {
  const result = await api<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(dto)
  });
  setTokens(result.accessToken, result.refreshToken);
  return result.user;
}

export async function login(emailOrPhone: string, password: string) {
  const result = await api<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ emailOrPhone, password })
  });
  setTokens(result.accessToken, result.refreshToken);
  return result.user;
}

// Also creates the account on first sign-in - same endpoint handles both.
export async function loginWithGoogle(idToken: string) {
  const result = await api<AuthResponse>("/auth/google", {
    method: "POST",
    body: JSON.stringify({ idToken })
  });
  setTokens(result.accessToken, result.refreshToken);
  return result.user;
}

export async function fetchCurrentUser(): Promise<CurrentUser | null> {
  if (!getAccessToken()) return null;
  try {
    return await api<CurrentUser>("/users/me");
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) clearTokens();
    return null;
  }
}
