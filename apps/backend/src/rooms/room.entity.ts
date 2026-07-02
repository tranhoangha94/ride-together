import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("rooms")
export class Room {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ unique: true })
  code!: string;

  @Column()
  destination!: string;

  @Column({ name: "leader_nickname" })
  leaderNickname!: string;

  @Column({ default: false })
  started!: boolean;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;
}
