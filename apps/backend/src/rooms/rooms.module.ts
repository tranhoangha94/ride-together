import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule } from "../auth/auth.module";
import { OptionalAuthService } from "./optional-auth.service";
import { Room } from "./room.entity";
import { RoomInvite } from "./room-invite.entity";
import { RoomMember } from "./room-member.entity";
import { RoomsController } from "./rooms.controller";
import { RoomsGateway } from "./rooms.gateway";
import { RoomsService } from "./rooms.service";

@Module({
  imports: [TypeOrmModule.forFeature([Room, RoomMember, RoomInvite]), AuthModule],
  controllers: [RoomsController],
  providers: [RoomsService, RoomsGateway, OptionalAuthService],
  exports: [RoomsService]
})
export class RoomsModule {}
