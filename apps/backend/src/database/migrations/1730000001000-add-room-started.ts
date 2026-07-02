import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRoomStarted1730000001000 implements MigrationInterface {
  name = "AddRoomStarted1730000001000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE rooms ADD COLUMN started boolean NOT NULL DEFAULT false`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE rooms DROP COLUMN started`);
  }
}
