import { Column, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity("user_locations")
export class UserLocation {
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

  @Column("double precision", { nullable: true })
  speed?: number;

  @Column("double precision", { nullable: true })
  heading?: number;

  @Column("double precision", { nullable: true })
  accuracy?: number;

  @Column({ name: "battery_level", nullable: true })
  batteryLevel?: number;

  @Column({ name: "recorded_at", type: "timestamptz" })
  recordedAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}
