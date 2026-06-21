import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

export type TripMemberStatus = "joined" | "left";
export type TripMemberRole = "leader" | "member";

@Entity("trip_members")
export class TripMember {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "trip_id" })
  tripId!: string;

  @Column({ name: "user_id" })
  userId!: string;

  @Column({ type: "enum", enum: ["leader", "member"], default: "member" })
  role!: TripMemberRole;

  @Column({ type: "enum", enum: ["joined", "left"], default: "joined" })
  status!: TripMemberStatus;

  @Column({ name: "share_location_enabled", default: false })
  shareLocationEnabled!: boolean;

  @Column({ name: "joined_at", type: "timestamptz", default: () => "now()" })
  joinedAt!: Date;

  @Column({ name: "left_at", type: "timestamptz", nullable: true })
  leftAt?: Date;
}
