import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { makeInviteCode } from "../common/utils/invite-code";
import { User } from "../users/user.entity";
import { CreateRoomDto } from "./dto";
import { Room } from "./room.entity";
import { RoomInvite } from "./room-invite.entity";
import { RoomMember, RoomMemberRole } from "./room-member.entity";

@Injectable()
export class RoomsService {
  constructor(
    @InjectRepository(Room) private readonly rooms: Repository<Room>,
    @InjectRepository(RoomMember) private readonly roomMembers: Repository<RoomMember>,
    @InjectRepository(RoomInvite) private readonly roomInvites: Repository<RoomInvite>,
    @InjectRepository(User) private readonly users: Repository<User>
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

  // Marks a logged-in member as kicked so a later join_room (even after
  // logging back in) is rejected. Guests have no row to mark - the gateway
  // handles blocking their rejoin via an in-memory per-room nickname set
  // instead, since there's no durable identity to attach it to.
  async kickMember(roomId: string, userId: string, nickname: string) {
    const existing = await this.roomMembers.findOneBy({ roomId, userId });
    if (existing) {
      existing.kickedAt = new Date();
      await this.roomMembers.save(existing);
      return;
    }
    await this.roomMembers.save(this.roomMembers.create({ roomId, userId, nickname, role: "member", kickedAt: new Date() }));
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

  // Invite is only available when the room's own leader is logged in and
  // matches leaderUserId, same scope line as kick.
  async createInvite(roomId: string, invitedByUserId: string, emailOrPhone: string) {
    const room = await this.findById(roomId);
    if (room.leaderUserId !== invitedByUserId) {
      throw new ForbiddenException("Chỉ trưởng đoàn mới có thể mời thành viên.");
    }

    const target = await this.users
      .createQueryBuilder("user")
      .where("user.email = :value OR user.phone = :value", { value: emailOrPhone })
      .getOne();
    if (!target) throw new NotFoundException("Không tìm thấy tài khoản với email/số điện thoại này.");

    const existing = await this.roomInvites.findOneBy({ roomId, invitedUserId: target.id, status: "pending" });
    if (existing) return existing;

    return this.roomInvites.save(this.roomInvites.create({ roomId, invitedUserId: target.id, invitedByUserId, status: "pending" }));
  }

  async myInvites(userId: string) {
    const invites = await this.roomInvites.find({ where: { invitedUserId: userId, status: "pending" }, order: { createdAt: "DESC" } });
    const roomIds = [...new Set(invites.map((i) => i.roomId))];
    const rooms = roomIds.length ? await this.rooms.findBy({ id: In(roomIds) }) : [];
    const roomsById = new Map(rooms.map((r) => [r.id, r]));
    return invites.map((invite) => ({ invite, room: roomsById.get(invite.roomId) }));
  }

  async respondToInvite(inviteId: string, userId: string, accept: boolean) {
    const invite = await this.roomInvites.findOneBy({ id: inviteId });
    if (!invite || invite.invitedUserId !== userId) throw new NotFoundException("Lời mời không tồn tại.");
    if (invite.status !== "pending") throw new BadRequestException("Lời mời đã được xử lý.");

    invite.status = accept ? "accepted" : "declined";
    await this.roomInvites.save(invite);

    if (accept) {
      const user = await this.users.findOneBy({ id: userId });
      await this.recordMember(invite.roomId, userId, user?.displayName ?? "Rider", "member");
    }

    return { invite, roomId: invite.roomId };
  }
}
