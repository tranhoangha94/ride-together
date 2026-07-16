import { MigrationInterface, QueryRunner } from "typeorm";

export class RemoveEmailVerification1741000000000 implements MigrationInterface {
  name = "RemoveEmailVerification1741000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE users DROP COLUMN IF EXISTS email_verified_at`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE users ADD COLUMN email_verified_at timestamptz`);
  }
}
