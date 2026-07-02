import { io, Socket } from "socket.io-client";
import { getAccessToken, getSocketUrl } from "./api";

let socket: Socket | null = null;

export function getTripSocket(): Socket {
  if (socket?.connected || socket?.active) return socket;
  socket = io(getSocketUrl(), {
    transports: ["websocket"],
    auth: { token: getAccessToken() }
  });
  return socket;
}

export function disconnectTripSocket() {
  socket?.disconnect();
  socket = null;
}
