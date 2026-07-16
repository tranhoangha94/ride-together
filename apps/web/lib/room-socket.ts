import { io, Socket } from "socket.io-client";
import { getAccessToken, getSocketUrl } from "./api";

const NICKNAME_KEY = "ride_together_nickname";

export function getNickname(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(NICKNAME_KEY) ?? "";
}

export function setNickname(nickname: string) {
  window.localStorage.setItem(NICKNAME_KEY, nickname);
}

let socket: Socket | null = null;

export function getRoomSocket(nickname: string): Socket {
  if (socket?.connected || socket?.active) return socket;
  const token = getAccessToken();
  socket = io(`${getSocketUrl()}/rooms`, {
    transports: ["websocket"],
    auth: token ? { nickname, token } : { nickname }
  });
  return socket;
}

export function disconnectRoomSocket() {
  socket?.disconnect();
  socket = null;
}
