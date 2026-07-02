"use client";

import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, clearTokens, getAccessToken, setTokens } from "./api";
import { AuthResponse, User } from "./types";

type RegisterInput = { email?: string; phone?: string; password: string; displayName: string };

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  login: (emailOrPhone: string, password: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const raw = window.localStorage.getItem("ride_together_user");
    const token = getAccessToken();
    if (raw && token) {
      try {
        setUser(JSON.parse(raw));
      } catch {
        // ignore corrupt cache
      }
    }
    setLoading(false);
  }, []);

  const persist = useCallback((res: AuthResponse) => {
    setTokens(res.accessToken, res.refreshToken);
    window.localStorage.setItem("ride_together_user", JSON.stringify(res.user));
    setUser(res.user);
  }, []);

  const login = useCallback(
    async (emailOrPhone: string, password: string) => {
      const res = await api<AuthResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ emailOrPhone, password })
      }, false);
      persist(res);
      router.push("/teams");
    },
    [persist, router]
  );

  const register = useCallback(
    async (input: RegisterInput) => {
      const res = await api<AuthResponse>("/auth/register", {
        method: "POST",
        body: JSON.stringify(input)
      }, false);
      persist(res);
      router.push("/teams");
    },
    [persist, router]
  );

  const loginWithGoogle = useCallback(
    async (idToken: string) => {
      const res = await api<AuthResponse>("/auth/google", {
        method: "POST",
        body: JSON.stringify({ idToken })
      }, false);
      persist(res);
      router.push("/teams");
    },
    [persist, router]
  );

  const logout = useCallback(() => {
    clearTokens();
    window.localStorage.removeItem("ride_together_user");
    setUser(null);
    router.push("/login");
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
