import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRooms1730000000000 implements MigrationInterface {
  name = "AddRooms1730000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE rooms (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        code varchar NOT NULL UNIQUE,
        destination varchar NOT NULL,
        leader_nickname varchar NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS rooms`);
  }
}
