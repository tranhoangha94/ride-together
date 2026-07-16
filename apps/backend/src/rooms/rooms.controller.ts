import { Body, Controller, Get, Headers, Param, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { CreateRoomDto, JoinRoomDto } from "./dto";
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
}
