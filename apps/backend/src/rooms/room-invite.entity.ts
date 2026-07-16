import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";

export type RoomInviteStatus = "pending" | "accepted" | "declined";

@Entity("room_invites")
export class RoomInvite {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "room_id" })
  roomId!: string;

  @Column({ name: "invited_user_id" })
  invitedUserId!: string;

  @Column({ name: "invited_by_user_id" })
  invitedByUserId!: string;

  @Column({ type: "enum", enum: ["pending", "accepted", "declined"], default: "pending" })
  status!: RoomInviteStatus;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;
}
