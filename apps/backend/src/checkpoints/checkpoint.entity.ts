import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("checkpoints")
export class Checkpoint {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "trip_id" })
  tripId!: string;

  @Column()
  name!: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ type: "geography", spatialFeatureType: "Point", srid: 4326 })
  point!: string;

  @Column("double precision")
  lat!: number;

  @Column("double precision")
  lng!: number;

  @Column({ name: "radius_m", default: 100 })
  radiusM!: number;

  @Column({ name: "target_time", type: "timestamptz", nullable: true })
  targetTime?: Date;

  @Column({ name: "created_by" })
  createdBy!: string;
}
