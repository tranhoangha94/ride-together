import { io, Socket } from "socket.io-client";
import { env } from "../config/env";
import { getAccessToken } from "../storage/tokenStore";

let socket: Socket | null = null;

export async function getTripSocket() {
  if (socket?.connected) return socket;
  const token = await getAccessToken();
  socket = io(env.socketUrl, {
    transports: ["websocket"],
    auth: { token }
  });
  return socket;
}

export function disconnectTripSocket() {
  socket?.disconnect();
  socket = null;
}
