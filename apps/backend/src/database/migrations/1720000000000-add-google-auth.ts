import { MigrationInterface, QueryRunner } from "typeorm";

export class AddGoogleAuth1720000000000 implements MigrationInterface {
  name = "AddGoogleAuth1720000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE users ADD COLUMN google_id varchar UNIQUE`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE users DROP COLUMN google_id`);
    await queryRunner.query(`ALTER TABLE users ALTER COLUMN password_hash SET NOT NULL`);
  }
}
