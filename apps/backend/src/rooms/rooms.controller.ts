import { Body, Controller, Get, Headers, Param, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { AuthUser, CurrentUser } from "../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CreateRoomDto, InviteToRoomDto, JoinRoomDto } from "./dto";
import { OptionalAuthService } from "./optional-auth.service";
import { RoomsService } from "./rooms.service";

@ApiTags("Rooms")
@Controller("rooms")
export class RoomsController {
  constructor(
    private readonly rooms: RoomsService,
    private readonly optionalAuth: OptionalAuthService
  ) {}

  @Post()
  async create(@Body() dto: CreateRoomDto, @Headers("authorization") authHeader?: string) {
    const user = await this.optionalAuth.resolve(this.optionalAuth.fromAuthHeader(authHeader));
    return this.rooms.create(dto, user?.id);
  }

  @Post("join")
  join(@Body() dto: JoinRoomDto) {
    return this.rooms.findByCode(dto.code);
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
