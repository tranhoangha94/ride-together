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

type NeedsVerificationResponse = {
  needsVerification: true;
  userId: string;
};

export function isLoggedIn(): boolean {
  return !!getAccessToken();
}

export function logout() {
  clearTokens();
}

// Register returns either tokens right away (phone signup - no verification
// needed) or a userId to verify (email signup).
export async function register(dto: { email?: string; phone?: string; password: string; displayName: string }) {
  const result = await api<AuthResponse | NeedsVerificationResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(dto)
  });
  if ("accessToken" in result) setTokens(result.accessToken, result.refreshToken);
  return result;
}

export async function login(emailOrPhone: string, password: string) {
  const result = await api<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ emailOrPhone, password })
  });
  setTokens(result.accessToken, result.refreshToken);
  return result.user;
}

export async function verifyEmail(userId: string, code: string) {
  const result = await api<AuthResponse>("/auth/verify-email", {
    method: "POST",
    body: JSON.stringify({ userId, code })
  });
  setTokens(result.accessToken, result.refreshToken);
  return result.user;
}

export async function resendVerification(userId: string) {
  return api<{ sent: true }>("/auth/resend-verification", {
    method: "POST",
    body: JSON.stringify({ userId })
  });
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
