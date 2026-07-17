import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";

export type RoomMemberRole = "leader" | "member";

// Written for every room join, guest or logged-in - identity is whichever of
// userId/participantId is present (see RoomsService.recordMember). Guests
// still can't save history (GET /users/me/rooms only ever looks up by
// userId), but they do get a durable row now so the single-active-room and
// kick/leave mechanics work uniformly for everyone.
@Entity("room_members")
export class RoomMember {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "room_id" })
  roomId!: string;

  @Column({ name: "user_id", nullable: true })
  userId?: string;

  @Column({ name: "participant_id", nullable: true })
  participantId?: string;

  @Column()
  nickname!: string;

  @Column({ type: "enum", enum: ["leader", "member"], default: "member" })
  role!: RoomMemberRole;

  @CreateDateColumn({ name: "joined_at" })
  joinedAt!: Date;

  @Column({ name: "kicked_at", type: "timestamptz", nullable: true })
  kickedAt?: Date;

  // Set when a non-leader member voluntarily leaves a started room (see
  // RoomsGateway's leave_journey handler) - explicitly cleared back to null
  // (never left undefined - TypeORM's save() treats undefined as "don't
  // touch this column") on rejoin, so a returning member is recognized as
  // active again.
  @Column({ name: "left_at", type: "timestamptz", nullable: true })
  leftAt?: Date | null;
}
