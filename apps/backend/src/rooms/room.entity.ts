import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("rooms")
export class Room {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ unique: true })
  code!: string;

  @Column()
  name!: string;

  @Column({ name: "leader_nickname" })
  leaderNickname!: string;

  // Set only when the room's creator was logged in at create time. Rooms
  // created by a guest leave this null, which is what makes kick/invite
  // (both gated on matching this column) simply unavailable in guest-led
  // rooms rather than a half-secured feature.
  @Column({ name: "leader_user_id", nullable: true })
  leaderUserId?: string;

  // The creator's persistent per-browser id (see lib/room-socket.ts
  // getParticipantId on the frontend) - set regardless of login status.
  // Lets a guest leader be recognized on reconnect without relying on
  // nickname text matching exactly, and backs the live-roster dedup in
  // rooms.gateway.ts (evicting a stale duplicate connection).
  @Column({ name: "leader_participant_id", nullable: true })
  leaderParticipantId?: string;

  @Column({ default: false })
  started!: boolean;

  @Column({ name: "destination_label", nullable: true })
  destinationLabel?: string;

  @Column({ name: "destination_lat", type: "double precision", nullable: true })
  destinationLat?: number;

  @Column({ name: "destination_lng", type: "double precision", nullable: true })
  destinationLng?: number;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;
}
