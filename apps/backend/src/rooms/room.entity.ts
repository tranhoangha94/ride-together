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
