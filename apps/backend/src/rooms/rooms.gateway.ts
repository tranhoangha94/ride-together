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
import { OptionalAuthService } from "./optional-auth.service";
import { Room } from "./room.entity";
import { RoomsService } from "./rooms.service";

type RoomSocket = Socket & { nickname?: string; roomId?: string; userId?: string; participantId?: string };

// Lightweight, no-account realtime channel: knowing the room code is the only
// credential a guest needs. An optional `token` in the handshake resolves a
// logged-in user's id on top of that - never required, never rejects the
// connection on its own, so guests are completely unaffected.
@WebSocketGateway({ namespace: "/rooms", cors: { origin: true, credentials: true } })
export class RoomsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly rooms: RoomsService,
    private readonly optionalAuth: OptionalAuthService
  ) {}

  async handleConnection(client: RoomSocket) {
    const nickname = client.handshake.auth?.nickname;
    if (typeof nickname !== "string" || !nickname.trim()) {
      client.disconnect(true);
      return;
    }
    client.nickname = nickname.trim().slice(0, 40);
    // fetchSockets() only exposes `.data`, not arbitrary instance properties,
    // so mirror the nickname there for the lobby roster lookup.
    client.data.nickname = client.nickname;

    const participantId = client.handshake.auth?.participantId;
    if (typeof participantId === "string" && participantId) {
      client.participantId = participantId;
      client.data.participantId = participantId;
    }

    const token = client.handshake.auth?.token;
    const user = await this.optionalAuth.resolve(typeof token === "string" ? token : undefined);
    if (user) {
      client.userId = user.id;
      client.data.userId = user.id;
    }
  }

  // Nickname matching alone is fragile (case/whitespace, or a guest
  // retyping a different name in a new browser session) - prefer the
  // stronger signals when they're available: a logged-in leader's account
  // id, or a guest leader's persistent per-browser participantId.
  private isRoomLeader(client: RoomSocket, room: Room): boolean {
    if (client.userId && room.leaderUserId) return client.userId === room.leaderUserId;
    if (client.participantId && room.leaderParticipantId) return client.participantId === room.leaderParticipantId;
    return client.nickname === room.leaderNickname;
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

    // A shared link can route straight into this handler without ever
    // hitting the REST layer's own active-elsewhere check, so it needs the
    // same guard: block joining (lobby or started) a different room while
    // this identity is still active elsewhere, but let rejoining the same
    // active room through.
    const active = await this.rooms.findActiveRoom({ userId: client.userId, participantId: client.participantId });
    if (active && active.id !== body.roomId) {
      return { ok: false, reason: "active_elsewhere", activeRoomId: active.id };
    }

    const role = this.isRoomLeader(client, room) ? "leader" : "member";
    const { kicked } = await this.rooms.recordMember(
      body.roomId,
      { userId: client.userId, participantId: client.participantId },
      client.nickname ?? "",
      role
    );
    if (kicked) return { ok: false, reason: "kicked" };

    // A rider reconnecting (page reload, phone app hand-off, a flaky
    // connection) opens a brand new socket with a brand new id, which
    // otherwise shows up as a second "ghost" marker alongside their old,
    // now-stale one instead of replacing it. Evict any other live socket
    // that's clearly the same person - matched by the persistent
    // participantId first (survives a retyped/different nickname), falling
    // back to nickname (covers a fresh browser with no participantId yet,
    // or two same-named devices handing off mid-trip) - last connection
    // for a given identity wins.
    const priorSockets = await this.server.in(`room:${body.roomId}`).fetchSockets();
    for (const prior of priorSockets) {
      if (prior.id === client.id) continue;
      const priorData = prior.data as { nickname?: string; participantId?: string };
      const sameParticipant = client.participantId && priorData.participantId === client.participantId;
      const sameNickname = priorData.nickname === client.nickname;
      if (sameParticipant || sameNickname) prior.disconnect(true);
    }

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

  @SubscribeMessage("stop_room")
  async stopRoom(@ConnectedSocket() client: RoomSocket, @MessageBody() body: { roomId: string }) {
    if (!client.roomId) return { ok: false };
    const room = await this.rooms.findById(body.roomId);
    if (!this.isRoomLeader(client, room)) return { ok: false, reason: "not_leader" };

    await this.rooms.stop(body.roomId);
    this.server.to(`room:${body.roomId}`).emit("room_stopped");
    return { ok: true };
  }

  @SubscribeMessage("set_destination")
  async setDestination(
    @ConnectedSocket() client: RoomSocket,
    @MessageBody() body: { roomId: string; label: string; lat: number; lng: number }
  ) {
    if (!client.roomId) return { ok: false };
    const room = await this.rooms.findById(body.roomId);
    if (!this.isRoomLeader(client, room)) return { ok: false, reason: "not_leader" };

    await this.rooms.setDestination(body.roomId, body.label, body.lat, body.lng);
    const destination = { label: body.label, lat: body.lat, lng: body.lng };
    this.server.to(`room:${body.roomId}`).emit("destination_updated", destination);
    return { ok: true };
  }

  // Kick is only available when the room's leader is logged in and matches
  // room.leaderUserId - a clean, explicit scope line rather than a
  // half-secured feature bolted onto the nickname-based leader check the
  // other leader actions use.
  @SubscribeMessage("kick_member")
  async kickMember(
    @ConnectedSocket() client: RoomSocket,
    @MessageBody() body: { roomId: string; targetParticipantId: string }
  ) {
    if (!client.roomId) return { ok: false };
    const room = await this.rooms.findById(body.roomId);
    if (!client.userId || client.userId !== room.leaderUserId) return { ok: false, reason: "not_leader" };

    const sockets = await this.server.in(`room:${body.roomId}`).fetchSockets();
    const target = sockets.find((s) => s.id === body.targetParticipantId);
    if (!target) return { ok: false, reason: "not_found" };

    const targetData = target.data as { nickname?: string; userId?: string; participantId?: string };
    await this.rooms.kickMember(body.roomId, { userId: targetData.userId, participantId: targetData.participantId }, targetData.nickname ?? "");

    this.server.to(`room:${body.roomId}`).emit("member_kicked", {
      participantId: target.id,
      nickname: targetData.nickname
    });
    target.disconnect(true);
    return { ok: true };
  }

  // A non-leader member choosing to leave a started room - distinct from
  // the plain `leave_room` event above, which is just Socket.IO room
  // bookkeeping fired on every unmount and carries no "I'm quitting the
  // trip" meaning. Broadcasts `member_left` so the room sees an explicit
  // "chose to leave" message, then leaves the Socket.IO room (not a hard
  // socket disconnect - forcing one here raced the ack packet off the wire
  // before the client ever received it, since disconnect() tears down the
  // transport immediately). The client navigates itself to the home page
  // once it gets this ack; a real accidental disconnect still only ever
  // fires the normal member_offline/lobby_participant_left cleanup via
  // handleDisconnect, unchanged.
  @SubscribeMessage("leave_journey")
  async leaveJourney(@ConnectedSocket() client: RoomSocket, @MessageBody() body: { roomId: string }) {
    if (!client.roomId) return { ok: false };
    const room = await this.rooms.findById(body.roomId);
    if (this.isRoomLeader(client, room)) return { ok: false, reason: "leader_cannot_leave" };

    await this.rooms.leaveRoom(body.roomId, { userId: client.userId, participantId: client.participantId });
    client.to(`room:${body.roomId}`).emit("member_left", { participantId: client.id, nickname: client.nickname });
    await client.leave(`room:${body.roomId}`);
    client.roomId = undefined;
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
