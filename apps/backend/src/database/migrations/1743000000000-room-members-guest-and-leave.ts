import { MigrationInterface, QueryRunner } from "typeorm";

export class RoomMembersGuestAndLeave1743000000000 implements MigrationInterface {
  name = "RoomMembersGuestAndLeave1743000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE room_members ALTER COLUMN user_id DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE room_members ADD COLUMN participant_id varchar`);
    await queryRunner.query(`ALTER TABLE room_members ADD COLUMN left_at timestamptz`);
    await queryRunner.query(`ALTER TABLE room_members DROP CONSTRAINT room_members_room_id_user_id_key`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX room_members_room_user_uq ON room_members(room_id, user_id) WHERE user_id IS NOT NULL`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX room_members_room_participant_uq ON room_members(room_id, participant_id) WHERE participant_id IS NOT NULL`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS room_members_room_participant_uq`);
    await queryRunner.query(`DROP INDEX IF EXISTS room_members_room_user_uq`);
    await queryRunner.query(`ALTER TABLE room_members ADD CONSTRAINT room_members_room_id_user_id_key UNIQUE (room_id, user_id)`);
    await queryRunner.query(`ALTER TABLE room_members DROP COLUMN left_at`);
    await queryRunner.query(`ALTER TABLE room_members DROP COLUMN participant_id`);
    await queryRunner.query(`ALTER TABLE room_members ALTER COLUMN user_id SET NOT NULL`);
  }
}
