import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRoomLeaderParticipantId1742000000000 implements MigrationInterface {
  name = "AddRoomLeaderParticipantId1742000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE rooms ADD COLUMN leader_participant_id varchar`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE rooms DROP COLUMN leader_participant_id`);
  }
}
