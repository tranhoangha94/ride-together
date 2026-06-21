import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

export type SosStatus = "active" | "resolved";

@Entity("sos_events")
export class SosEvent {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "trip_id" })
  tripId!: string;

  @Column({ name: "user_id" })
  userId!: string;

  @Column({ type: "geography", spatialFeatureType: "Point", srid: 4326 })
  point!: string;

  @Column("double precision")
  lat!: number;

  @Column("double precision")
  lng!: number;

  @Column({ nullable: true })
  message?: string;

  @Column({ type: "enum", enum: ["active", "resolved"], default: "active" })
  status!: SosStatus;

  @Column({ name: "resolved_by", nullable: true })
  resolvedBy?: string;

  @Column({ name: "resolved_at", type: "timestamptz", nullable: true })
  resolvedAt?: Date;

  @Column({ name: "created_at", type: "timestamptz", default: () => "now()" })
  createdAt!: Date;
}
