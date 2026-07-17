import { io, Socket } from "socket.io-client";
import { getAccessToken, getSocketUrl } from "./api";

const NICKNAME_KEY = "ride_together_nickname";
const PARTICIPANT_ID_KEY = "ride_together_participant_id";

export function getNickname(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(NICKNAME_KEY) ?? "";
}

export function setNickname(nickname: string) {
  // Trimmed consistently everywhere a nickname is stored or compared - the
  // socket handshake already trims (see rooms.gateway.ts), so an untrimmed
  // value saved here would silently stop matching room.leaderNickname
  // (e.g. a mobile keyboard adding a trailing space) and the leader would
  // lose their leader privileges on the next reconnect.
  window.localStorage.setItem(NICKNAME_KEY, nickname.trim());
}

// A persistent per-browser identity, generated once and reused forever -
// even for guests with no account ("temporary id"). Nickname text alone
// isn't reliable for recognizing "this is the same rider reconnecting"
// (case/whitespace differences, two people picking the same name, or the
// rider retyping a different name entirely), so this is the primary
// signal the server uses to de-duplicate the live roster and to
// re-recognize a guest leader returning to their own room.
export function getParticipantId(): string {
  if (typeof window === "undefined") return "";
  let id = window.localStorage.getItem(PARTICIPANT_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(PARTICIPANT_ID_KEY, id);
  }
  return id;
}

let socket: Socket | null = null;

export function getRoomSocket(nickname: string): Socket {
  if (socket?.connected || socket?.active) return socket;
  const token = getAccessToken();
  socket = io(`${getSocketUrl()}/rooms`, {
    transports: ["websocket"],
    auth: token ? { nickname, token, participantId: getParticipantId() } : { nickname, participantId: getParticipantId() }
  });
  return socket;
}

export function disconnectRoomSocket() {
  socket?.disconnect();
  socket = null;
}
