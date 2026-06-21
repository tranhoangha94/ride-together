import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

export type MemberRole = "owner" | "leader" | "member";
export type MembershipStatus = "active" | "left";

@Entity("team_members")
export class TeamMember {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "team_id" })
  teamId!: string;

  @Column({ name: "user_id" })
  userId!: string;

  @Column({ type: "enum", enum: ["owner", "leader", "member"], default: "member" })
  role!: MemberRole;

  @Column({ type: "enum", enum: ["active", "left"], default: "active" })
  status!: MembershipStatus;

  @Column({ name: "joined_at", type: "timestamptz", default: () => "now()" })
  joinedAt!: Date;
}
