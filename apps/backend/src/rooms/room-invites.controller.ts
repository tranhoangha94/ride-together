import { Controller, Param, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { AuthUser, CurrentUser } from "../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RoomsService } from "./rooms.service";

@ApiTags("Room Invites")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("invites")
export class RoomInvitesController {
  constructor(private readonly rooms: RoomsService) {}

  @Post(":id/accept")
  accept(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.rooms.respondToInvite(id, user.id, true);
  }

  @Post(":id/decline")
  decline(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.rooms.respondToInvite(id, user.id, false);
  }
}
