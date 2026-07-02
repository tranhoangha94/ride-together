import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { CreateRoomDto, JoinRoomDto } from "./dto";
import { RoomsService } from "./rooms.service";

@ApiTags("Rooms")
@Controller("rooms")
export class RoomsController {
  constructor(private readonly rooms: RoomsService) {}

  @Post()
  create(@Body() dto: CreateRoomDto) {
    return this.rooms.create(dto);
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
