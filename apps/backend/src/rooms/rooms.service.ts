import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { makeInviteCode } from "../common/utils/invite-code";
import { CreateRoomDto } from "./dto";
import { Room } from "./room.entity";
import { RoomMember, RoomMemberRole } from "./room-member.entity";

@Injectable()
export class RoomsService {
  constructor(
    @InjectRepository(Room) private readonly rooms: Repository<Room>,
    @InjectRepository(RoomMember) private readonly roomMembers: Repository<RoomMember>
  ) {}

  create(dto: CreateRoomDto, leaderUserId?: string) {
    return this.rooms.save(
      this.rooms.create({
        name: dto.name,
        leaderNickname: dto.nickname,
        code: makeInviteCode(),
        leaderUserId
      })
    );
  }

  // Only ever called for a resolved (logged-in) user - guests never get a
  // room_members row, which is what makes "guests can't save history" true
  // by construction. Returns whether this user is currently kicked from the
  // room so the gateway can reject the join.
  async recordMember(roomId: string, userId: string, nickname: string, role: RoomMemberRole): Promise<{ kicked: boolean }> {
    const existing = await this.roomMembers.findOneBy({ roomId, userId });
    if (existing) {
      if (existing.kickedAt) return { kicked: true };
      existing.nickname = nickname;
      await this.roomMembers.save(existing);
      return { kicked: false };
    }
    await this.roomMembers.save(this.roomMembers.create({ roomId, userId, nickname, role }));
    return { kicked: false };
  }

  async myRooms(userId: string) {
    const memberships = await this.roomMembers.find({ where: { userId }, order: { joinedAt: "DESC" } });
    const roomIds = [...new Set(memberships.map((m) => m.roomId))];
    if (roomIds.length === 0) return [];

    const rooms = await this.rooms.findBy({ id: In(roomIds) });
    const roomsById = new Map(rooms.map((r) => [r.id, r]));
    // One row per room, most-recently-joined first, carrying this user's role in it.
    const seen = new Set<string>();
    const result: { room: Room; role: RoomMemberRole; joinedAt: Date }[] = [];
    for (const membership of memberships) {
      if (seen.has(membership.roomId)) continue;
      seen.add(membership.roomId);
      const room = roomsById.get(membership.roomId);
      if (room) result.push({ room, role: membership.role, joinedAt: membership.joinedAt });
    }
    return result;
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
