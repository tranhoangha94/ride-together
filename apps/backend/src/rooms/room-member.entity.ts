import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";

export type RoomMemberRole = "leader" | "member";

// Only ever written for a logged-in participant (see RoomsService.recordMember) -
// guests never get a row here, which is what makes "guests can't save room
// history" true by construction rather than by a flag.
@Entity("room_members")
export class RoomMember {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "room_id" })
  roomId!: string;

  @Column({ name: "user_id" })
  userId!: string;

  @Column()
  nickname!: string;

  @Column({ type: "enum", enum: ["leader", "member"], default: "member" })
  role!: RoomMemberRole;

  @CreateDateColumn({ name: "joined_at" })
  joinedAt!: Date;

  @Column({ name: "kicked_at", type: "timestamptz", nullable: true })
  kickedAt?: Date;
}
