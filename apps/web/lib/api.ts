const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

const ACCESS_TOKEN_KEY = "ride_together_access_token";
const REFRESH_TOKEN_KEY = "ride_together_refresh_token";

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setTokens(accessToken: string, refreshToken: string) {
  window.localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  window.localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function clearTokens() {
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  // Raw JSON error body, e.g. { needsVerification: true, userId } on a
  // "verify your email first" login rejection - callers that need those
  // extra fields can read them off here instead of just the message.
  body: unknown;
  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getAccessToken();
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers as Record<string, string> | undefined)
    }
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ApiError(response.status, body.message ?? `Request failed (${response.status})`, body);
  }

  if (response.status === 204) return undefined as T;
  return response.json();
}

export function getApiUrl() {
  return API_URL;
}

export function getSocketUrl() {
  return process.env.NEXT_PUBLIC_SOCKET_URL ?? API_URL;
}
