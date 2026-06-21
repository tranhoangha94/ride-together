import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import { CameraType } from "./camera-point.entity";

@Entity("camera_reports")
export class CameraReport {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "reporter_id" })
  reporterId!: string;

  @Column({ type: "enum", enum: ["speed_camera", "red_light", "traffic_hazard", "police_checkpoint", "other"] })
  type!: CameraType;

  @Column({ type: "geography", spatialFeatureType: "Point", srid: 4326 })
  point!: string;

  @Column("double precision")
  lat!: number;

  @Column("double precision")
  lng!: number;

  @Column()
  title!: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ type: "enum", enum: ["pending", "approved", "rejected"], default: "pending" })
  status!: "pending" | "approved" | "rejected";

  @Column({ name: "reviewed_by", nullable: true })
  reviewedBy?: string;

  @Column({ name: "reviewed_at", type: "timestamptz", nullable: true })
  reviewedAt?: Date;
}
