import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAccountsToRooms1740000000000 implements MigrationInterface {
  name = "AddAccountsToRooms1740000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE users ADD COLUMN email_verified_at timestamptz`);
    await queryRunner.query(`ALTER TABLE rooms ADD COLUMN leader_user_id uuid REFERENCES users(id)`);

    await queryRunner.query(`CREATE TYPE room_member_role AS ENUM ('leader', 'member')`);
    await queryRunner.query(`
      CREATE TABLE room_members (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        room_id uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        nickname varchar NOT NULL,
        role room_member_role NOT NULL DEFAULT 'member',
        joined_at timestamptz NOT NULL DEFAULT now(),
        kicked_at timestamptz,
        UNIQUE(room_id, user_id)
      )
    `);

    await queryRunner.query(`CREATE TYPE room_invite_status AS ENUM ('pending', 'accepted', 'declined')`);
    await queryRunner.query(`
      CREATE TABLE room_invites (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        room_id uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
        invited_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        invited_by_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status room_invite_status NOT NULL DEFAULT 'pending',
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS room_invites`);
    await queryRunner.query(`DROP TYPE IF EXISTS room_invite_status`);
    await queryRunner.query(`DROP TABLE IF EXISTS room_members`);
    await queryRunner.query(`DROP TYPE IF EXISTS room_member_role`);
    await queryRunner.query(`ALTER TABLE rooms DROP COLUMN leader_user_id`);
    await queryRunner.query(`ALTER TABLE users DROP COLUMN email_verified_at`);
  }
}
