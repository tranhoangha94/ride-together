import { randomUUID } from "crypto";
import { Logger } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
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
import { RedisService } from "../redis/redis.service";
import { TripsService } from "../trips/trips.service";

type AuthedSocket = Socket & { userId?: string; role?: "user" | "admin"; tripId?: string };

@WebSocketGateway({ cors: { origin: true, credentials: true } })
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(RealtimeGateway.name);

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly trips: TripsService,
    private readonly redis: RedisService
  ) {}

  async handleConnection(client: AuthedSocket) {
    try {
      const token = client.handshake.auth?.token;
      const payload = await this.jwt.verifyAsync<{ sub: string; role: "user" | "admin" }>(token, {
        secret: this.config.getOrThrow<string>("JWT_ACCESS_SECRET")
      });
      client.userId = payload.sub;
      client.role = payload.role;
    } catch {
      client.disconnect(true);
    }
  }

  async handleDisconnect(client: AuthedSocket) {
    if (client.tripId && client.userId) {
      await this.redis.client.srem(this.redis.onlineUsersKey(client.tripId), client.userId);
      this.server.to(`trip:${client.tripId}`).emit("member_offline", {
        tripId: client.tripId,
        userId: client.userId,
        lastSeenAt: new Date().toISOString()
      });
    }
  }

  @SubscribeMessage("join_trip_room")
  async joinTripRoom(@ConnectedSocket() client: AuthedSocket, @MessageBody() body: { tripId: string }) {
    if (!client.userId) return { ok: false };
    await this.trips.assertTripMember(body.tripId, client.userId);
    client.tripId = body.tripId;
    await client.join(`trip:${body.tripId}`);
    await this.redis.client.sadd(this.redis.onlineUsersKey(body.tripId), client.userId);
    return { ok: true };
  }

  @SubscribeMessage("leave_trip_room")
  async leaveTripRoom(@ConnectedSocket() client: AuthedSocket, @MessageBody() body: { tripId: string }) {
    if (client.userId) await this.redis.client.srem(this.redis.onlineUsersKey(body.tripId), client.userId);
    await client.leave(`trip:${body.tripId}`);
    client.tripId = undefined;
    return { ok: true };
  }

  @SubscribeMessage("location_update")
  async locationUpdate(@ConnectedSocket() client: AuthedSocket, @MessageBody() body: Record<string, unknown>) {
    if (!client.userId || typeof body.tripId !== "string") return { ok: false };
    const { trip, membership } = await this.trips.assertActiveTripMember(body.tripId, client.userId);
    if (!membership.shareLocationEnabled) return { ok: false, reason: "share_location_disabled" };

    const location = {
      tripId: body.tripId,
      userId: client.userId,
      lat: Number(body.lat),
      lng: Number(body.lng),
      speed: body.speed,
      heading: body.heading,
      accuracy: body.accuracy,
      batteryLevel: body.batteryLevel,
      recordedAt: body.recordedAt ?? new Date().toISOString()
    };
    await this.redis.client.set(this.redis.lastLocationKey(body.tripId, client.userId), JSON.stringify(location), "EX", 120);
    this.server.to(`trip:${body.tripId}`).emit("member_location_updated", {
      tripId: body.tripId,
      userId: client.userId,
      location
    });

    this.logger.debug(`Location ${trip.id}:${client.userId}`);
    return { ok: true };
  }

  @SubscribeMessage("sos_trigger")
  async sosTrigger(@ConnectedSocket() client: AuthedSocket, @MessageBody() body: Record<string, unknown>) {
    if (!client.userId || typeof body.tripId !== "string") return { ok: false };
    await this.trips.assertActiveTripMember(body.tripId, client.userId);
    const sos = {
      id: randomUUID(),
      tripId: body.tripId,
      userId: client.userId,
      lat: Number(body.lat),
      lng: Number(body.lng),
      message: body.message,
      status: "active",
      createdAt: new Date().toISOString()
    };
    await this.redis.client.hset(this.redis.activeSosKey(body.tripId), sos.id, JSON.stringify(sos));
    this.server.to(`trip:${body.tripId}`).emit("sos_alert", sos);
    return { ok: true, sos };
  }

  @SubscribeMessage("checkpoint_reached")
  async checkpointReached(@ConnectedSocket() client: AuthedSocket, @MessageBody() body: { tripId: string; checkpointId: string }) {
    if (!client.userId) return { ok: false };
    await this.trips.assertTripMember(body.tripId, client.userId);
    this.server.to(`trip:${body.tripId}`).emit("checkpoint_status_updated", {
      tripId: body.tripId,
      checkpointId: body.checkpointId,
      userId: client.userId
    });
    return { ok: true };
  }
}
