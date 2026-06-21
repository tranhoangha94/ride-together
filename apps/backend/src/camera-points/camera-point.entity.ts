import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

export type CameraType = "speed_camera" | "red_light" | "traffic_hazard" | "police_checkpoint" | "other";

@Entity("camera_points")
export class CameraPoint {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

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

  @Column("double precision", { nullable: true })
  direction?: number;

  @Column({ type: "enum", enum: ["active", "inactive"], default: "active" })
  status!: "active" | "inactive";

  @Column({ type: "enum", enum: ["admin", "user_report"], default: "admin" })
  source!: "admin" | "user_report";
}
