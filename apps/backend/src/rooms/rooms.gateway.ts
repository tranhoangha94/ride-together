import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { RoomsService } from "./rooms.service";

type RoomSocket = Socket & { nickname?: string; roomId?: string };

// Lightweight, no-account realtime channel: knowing the room code is the only
// credential. Kept on its own namespace so it never touches the JWT-guarded
// account/trip gateway.
@WebSocketGateway({ namespace: "/rooms", cors: { origin: true, credentials: true } })
export class RoomsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(private readonly rooms: RoomsService) {}

  handleConnection(client: RoomSocket) {
    const nickname = client.handshake.auth?.nickname;
    if (typeof nickname !== "string" || !nickname.trim()) {
      client.disconnect(true);
      return;
    }
    client.nickname = nickname.trim().slice(0, 40);
    // fetchSockets() only exposes `.data`, not arbitrary instance properties,
    // so mirror the nickname there for the lobby roster lookup.
    client.data.nickname = client.nickname;
  }

  handleDisconnect(client: RoomSocket) {
    if (client.roomId) {
      this.server.to(`room:${client.roomId}`).emit("lobby_participant_left", {
        participantId: client.id,
        nickname: client.nickname
      });
      this.server.to(`room:${client.roomId}`).emit("member_offline", {
        participantId: client.id,
        nickname: client.nickname
      });
    }
  }

  @SubscribeMessage("join_room")
  async joinRoom(@ConnectedSocket() client: RoomSocket, @MessageBody() body: { roomId: string }) {
    const room = await this.rooms.findById(body.roomId);
    client.roomId = body.roomId;

    const existingSockets = await this.server.in(`room:${body.roomId}`).fetchSockets();
    const lobby = existingSockets.map((s) => ({ participantId: s.id, nickname: (s.data as { nickname?: string }).nickname }));

    await client.join(`room:${body.roomId}`);
    client.to(`room:${body.roomId}`).emit("lobby_participant_joined", { participantId: client.id, nickname: client.nickname });

    const destination =
      room.destinationLat != null && room.destinationLng != null
        ? { label: room.destinationLabel, lat: room.destinationLat, lng: room.destinationLng }
        : null;

    return { ok: true, started: room.started, lobby, destination };
  }

  @SubscribeMessage("leave_room")
  async leaveRoom(@ConnectedSocket() client: RoomSocket, @MessageBody() body: { roomId: string }) {
    await client.leave(`room:${body.roomId}`);
    client.roomId = undefined;
    return { ok: true };
  }

  @SubscribeMessage("start_room")
  async startRoom(@ConnectedSocket() client: RoomSocket, @MessageBody() body: { roomId: string }) {
    if (!client.roomId) return { ok: false };
    await this.rooms.start(body.roomId);
    this.server.to(`room:${body.roomId}`).emit("room_started");
    return { ok: true };
  }

  @SubscribeMessage("set_destination")
  async setDestination(
    @ConnectedSocket() client: RoomSocket,
    @MessageBody() body: { roomId: string; label: string; lat: number; lng: number }
  ) {
    if (!client.roomId) return { ok: false };
    const room = await this.rooms.findById(body.roomId);
    if (client.nickname !== room.leaderNickname) return { ok: false, reason: "not_leader" };

    await this.rooms.setDestination(body.roomId, body.label, body.lat, body.lng);
    const destination = { label: body.label, lat: body.lat, lng: body.lng };
    this.server.to(`room:${body.roomId}`).emit("destination_updated", destination);
    return { ok: true };
  }

  @SubscribeMessage("location_update")
  locationUpdate(@ConnectedSocket() client: RoomSocket, @MessageBody() body: Record<string, unknown>) {
    if (!client.roomId) return { ok: false };
    const location = {
      participantId: client.id,
      nickname: client.nickname,
      lat: Number(body.lat),
      lng: Number(body.lng),
      speed: body.speed,
      heading: body.heading,
      accuracy: body.accuracy,
      recordedAt: body.recordedAt ?? new Date().toISOString()
    };
    this.server.to(`room:${client.roomId}`).emit("member_location_updated", location);
    return { ok: true };
  }

  @SubscribeMessage("sos_trigger")
  sosTrigger(@ConnectedSocket() client: RoomSocket, @MessageBody() body: Record<string, unknown>) {
    if (!client.roomId) return { ok: false };
    const sos = {
      participantId: client.id,
      nickname: client.nickname,
      lat: Number(body.lat),
      lng: Number(body.lng),
      message: body.message,
      createdAt: new Date().toISOString()
    };
    this.server.to(`room:${client.roomId}`).emit("sos_alert", sos);
    return { ok: true };
  }
}
