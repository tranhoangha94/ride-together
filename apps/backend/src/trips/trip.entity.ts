import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

export type TripStatus = "draft" | "active" | "ended" | "cancelled";

@Entity("trips")
export class Trip {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "team_id" })
  teamId!: string;

  @Column()
  name!: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ name: "leader_id" })
  leaderId!: string;

  @Column({ type: "enum", enum: ["draft", "active", "ended", "cancelled"], default: "draft" })
  status!: TripStatus;

  @Column({ name: "start_time", type: "timestamptz", nullable: true })
  startTime?: Date;

  @Column({ name: "end_time", type: "timestamptz", nullable: true })
  endTime?: Date;

  @Column({ name: "invite_code", unique: true })
  inviteCode!: string;

  @Column({ name: "lagging_threshold_m", default: 2000 })
  laggingThresholdM!: number;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}
