import { create } from "zustand";
import { clearTokens, saveTokens } from "../storage/tokenStore";

type AuthState = {
  isAuthenticated: boolean;
  setTokens: (accessToken: string, refreshToken: string) => Promise<void>;
  logout: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  async setTokens(accessToken, refreshToken) {
    await saveTokens(accessToken, refreshToken);
    set({ isAuthenticated: true });
  },
  async logout() {
    await clearTokens();
    set({ isAuthenticated: false });
  }
}));
