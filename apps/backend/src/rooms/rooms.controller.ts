import { Body, ConflictException, Controller, Get, Headers, Param, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { AuthUser, CurrentUser } from "../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CreateRoomDto, InviteToRoomDto, JoinRoomDto, LeaveActiveRoomDto } from "./dto";
import { OptionalAuthService } from "./optional-auth.service";
import { RoomsGateway } from "./rooms.gateway";
import { RoomsService } from "./rooms.service";

@ApiTags("Rooms")
@Controller("rooms")
export class RoomsController {
  constructor(
    private readonly rooms: RoomsService,
    private readonly optionalAuth: OptionalAuthService,
    private readonly gateway: RoomsGateway
  ) {}

  @Post()
  async create(@Body() dto: CreateRoomDto, @Headers("authorization") authHeader?: string) {
    const user = await this.optionalAuth.resolve(this.optionalAuth.fromAuthHeader(authHeader));
    const active = await this.rooms.findActiveRoom({ userId: user?.id, participantId: dto.participantId });
    if (active) {
      throw new ConflictException({
        message: "Bạn đang có một chuyến đi khác đang hoạt động.",
        activeRoomId: active.id
      });
    }
    return this.rooms.create(dto, user?.id);
  }

  @Post("join")
  async join(@Body() dto: JoinRoomDto, @Headers("authorization") authHeader?: string) {
    const room = await this.rooms.findByCode(dto.code);
    const user = await this.optionalAuth.resolve(this.optionalAuth.fromAuthHeader(authHeader));
    const active = await this.rooms.findActiveRoom({ userId: user?.id, participantId: dto.participantId });
    if (active && active.id !== room.id) {
      throw new ConflictException({
        message: "Bạn đang có một chuyến đi khác đang hoạt động.",
        activeRoomId: active.id
      });
    }
    return room;
  }

  // Wrapped in an object rather than returning the room directly - Nest
  // treats a bare `null` return the same as `undefined` (an empty body, not
  // the JSON literal `null`), which broke response.json() parsing on the
  // common "no active room" case.
  @Get("active")
  async active(@Query("participantId") participantId?: string, @Headers("authorization") authHeader?: string) {
    const user = await this.optionalAuth.resolve(this.optionalAuth.fromAuthHeader(authHeader));
    const room = await this.rooms.findActiveRoom({ userId: user?.id, participantId });
    return { room };
  }

  // A direct escape hatch that doesn't depend on ever reaching the room's
  // own socket session - a rider who got auto-redirected into a stuck/
  // broken trip on the home page needs a way out that works over plain
  // HTTP alone. Leader identities end the trip for everyone (same effect
  // as "Kết thúc"); non-leader identities just leave it.
  @Post("active/leave")
  async leaveActive(@Body() dto: LeaveActiveRoomDto, @Headers("authorization") authHeader?: string) {
    const user = await this.optionalAuth.resolve(this.optionalAuth.fromAuthHeader(authHeader));
    const identity = { userId: user?.id, participantId: dto.participantId };
    const active = await this.rooms.findActiveRoom(identity);
    if (!active) return { ok: false };

    const isLeader =
      (!!identity.userId && identity.userId === active.leaderUserId) ||
      (!!identity.participantId && identity.participantId === active.leaderParticipantId);

    if (isLeader) {
      await this.rooms.stop(active.id);
      // Matches the realtime effect of the in-room "Kết thúc" button so
      // anyone currently viewing the trip is kicked back to the lobby
      // immediately, not just whenever they next reload.
      this.gateway.server.to(`room:${active.id}`).emit("room_stopped");
    } else {
      await this.rooms.leaveRoom(active.id, identity);
    }
    return { ok: true, roomId: active.id };
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.rooms.findById(id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post(":id/invite")
  invite(@Param("id") id: string, @CurrentUser() user: AuthUser, @Body() dto: InviteToRoomDto) {
    return this.rooms.createInvite(id, user.id, dto.emailOrPhone);
  }
}
