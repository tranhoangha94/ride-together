import { MigrationInterface, QueryRunner } from "typeorm";

export class RoomDestination1730100000000 implements MigrationInterface {
  name = "RoomDestination1730100000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE rooms RENAME COLUMN destination TO name`);
    await queryRunner.query(`ALTER TABLE rooms ADD COLUMN destination_label varchar`);
    await queryRunner.query(`ALTER TABLE rooms ADD COLUMN destination_lat double precision`);
    await queryRunner.query(`ALTER TABLE rooms ADD COLUMN destination_lng double precision`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE rooms DROP COLUMN destination_lng`);
    await queryRunner.query(`ALTER TABLE rooms DROP COLUMN destination_lat`);
    await queryRunner.query(`ALTER TABLE rooms DROP COLUMN destination_label`);
    await queryRunner.query(`ALTER TABLE rooms RENAME COLUMN name TO destination`);
  }
}
