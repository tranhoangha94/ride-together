import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { makeInviteCode } from "../common/utils/invite-code";
import { CreateRoomDto } from "./dto";
import { Room } from "./room.entity";

@Injectable()
export class RoomsService {
  constructor(@InjectRepository(Room) private readonly rooms: Repository<Room>) {}

  create(dto: CreateRoomDto) {
    return this.rooms.save(
      this.rooms.create({
        name: dto.name,
        leaderNickname: dto.nickname,
        code: makeInviteCode()
      })
    );
  }

  async findByCode(code: string) {
    const room = await this.rooms.findOneBy({ code: code.trim() });
    if (!room) throw new NotFoundException("Không tìm thấy phòng với mã này.");
    return room;
  }

  async findById(id: string) {
    const room = await this.rooms.findOneBy({ id });
    if (!room) throw new NotFoundException("Phòng không tồn tại.");
    return room;
  }

  async start(id: string) {
    const room = await this.findById(id);
    room.started = true;
    return this.rooms.save(room);
  }

  async stop(id: string) {
    const room = await this.findById(id);
    room.started = false;
    return this.rooms.save(room);
  }

  async setDestination(id: string, label: string, lat: number, lng: number) {
    const room = await this.findById(id);
    room.destinationLabel = label;
    room.destinationLat = lat;
    room.destinationLng = lng;
    return this.rooms.save(room);
  }
}
