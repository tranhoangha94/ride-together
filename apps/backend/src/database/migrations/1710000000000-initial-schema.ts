import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1710000000000 implements MigrationInterface {
  name = "InitialSchema1710000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS postgis`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(`CREATE TYPE user_role AS ENUM ('user', 'admin')`);
    await queryRunner.query(`CREATE TYPE member_role AS ENUM ('owner', 'leader', 'member')`);
    await queryRunner.query(`CREATE TYPE membership_status AS ENUM ('active', 'left')`);
    await queryRunner.query(`CREATE TYPE trip_status AS ENUM ('draft', 'active', 'ended', 'cancelled')`);
    await queryRunner.query(`CREATE TYPE trip_member_status AS ENUM ('joined', 'left')`);
    await queryRunner.query(`CREATE TYPE sos_status AS ENUM ('active', 'resolved')`);
    await queryRunner.query(`CREATE TYPE camera_type AS ENUM ('speed_camera', 'red_light', 'traffic_hazard', 'police_checkpoint', 'other')`);
    await queryRunner.query(`CREATE TYPE moderation_status AS ENUM ('pending', 'approved', 'rejected')`);
    await queryRunner.query(`CREATE TYPE point_status AS ENUM ('active', 'inactive')`);
    await queryRunner.query(`CREATE TYPE point_source AS ENUM ('admin', 'user_report')`);
    await queryRunner.query(`CREATE TYPE alert_type AS ENUM ('member_offline', 'member_lagging', 'sos', 'checkpoint_delay', 'traffic_camera')`);

    await queryRunner.query(`
      CREATE TABLE users (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        email varchar UNIQUE,
        phone varchar UNIQUE,
        password_hash varchar NOT NULL,
        display_name varchar NOT NULL,
        avatar_url text,
        role user_role NOT NULL DEFAULT 'user',
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE teams (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        name varchar NOT NULL,
        description text,
        owner_id uuid NOT NULL REFERENCES users(id),
        invite_code varchar NOT NULL UNIQUE,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE team_members (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role member_role NOT NULL DEFAULT 'member',
        status membership_status NOT NULL DEFAULT 'active',
        joined_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE(team_id, user_id)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE trips (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
        name varchar NOT NULL,
        description text,
        leader_id uuid NOT NULL REFERENCES users(id),
        status trip_status NOT NULL DEFAULT 'draft',
        start_time timestamptz,
        end_time timestamptz,
        invite_code varchar NOT NULL UNIQUE,
        lagging_threshold_m int NOT NULL DEFAULT 2000,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE trip_members (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role member_role NOT NULL DEFAULT 'member',
        status trip_member_status NOT NULL DEFAULT 'joined',
        share_location_enabled boolean NOT NULL DEFAULT false,
        joined_at timestamptz NOT NULL DEFAULT now(),
        left_at timestamptz,
        UNIQUE(trip_id, user_id)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE user_locations (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        point geography(Point, 4326) NOT NULL,
        lat double precision NOT NULL,
        lng double precision NOT NULL,
        speed double precision,
        heading double precision,
        accuracy double precision,
        battery_level int,
        recorded_at timestamptz NOT NULL,
        updated_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE(trip_id, user_id)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE sos_events (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        point geography(Point, 4326) NOT NULL,
        lat double precision NOT NULL,
        lng double precision NOT NULL,
        message text,
        status sos_status NOT NULL DEFAULT 'active',
        resolved_by uuid REFERENCES users(id),
        resolved_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE checkpoints (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
        name varchar NOT NULL,
        description text,
        point geography(Point, 4326) NOT NULL,
        lat double precision NOT NULL,
        lng double precision NOT NULL,
        radius_m int NOT NULL DEFAULT 100,
        target_time timestamptz,
        created_by uuid NOT NULL REFERENCES users(id),
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE checkpoint_reaches (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        checkpoint_id uuid NOT NULL REFERENCES checkpoints(id) ON DELETE CASCADE,
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        reached_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE(checkpoint_id, user_id)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE camera_points (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        type camera_type NOT NULL,
        point geography(Point, 4326) NOT NULL,
        lat double precision NOT NULL,
        lng double precision NOT NULL,
        title varchar NOT NULL,
        description text,
        direction double precision,
        status point_status NOT NULL DEFAULT 'active',
        source point_source NOT NULL DEFAULT 'admin',
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE camera_reports (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        reporter_id uuid NOT NULL REFERENCES users(id),
        type camera_type NOT NULL,
        point geography(Point, 4326) NOT NULL,
        lat double precision NOT NULL,
        lng double precision NOT NULL,
        title varchar NOT NULL,
        description text,
        status moderation_status NOT NULL DEFAULT 'pending',
        reviewed_by uuid REFERENCES users(id),
        reviewed_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE alert_logs (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        trip_id uuid REFERENCES trips(id) ON DELETE SET NULL,
        user_id uuid REFERENCES users(id) ON DELETE SET NULL,
        type alert_type NOT NULL,
        payload jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`CREATE INDEX idx_user_locations_point ON user_locations USING GIST(point)`);
    await queryRunner.query(`CREATE INDEX idx_camera_points_point ON camera_points USING GIST(point)`);
    await queryRunner.query(`CREATE INDEX idx_checkpoints_point ON checkpoints USING GIST(point)`);
    await queryRunner.query(`CREATE INDEX idx_trip_members_trip_user ON trip_members(trip_id, user_id)`);
    await queryRunner.query(`CREATE INDEX idx_team_members_team_user ON team_members(team_id, user_id)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS alert_logs`);
    await queryRunner.query(`DROP TABLE IF EXISTS camera_reports`);
    await queryRunner.query(`DROP TABLE IF EXISTS camera_points`);
    await queryRunner.query(`DROP TABLE IF EXISTS checkpoint_reaches`);
    await queryRunner.query(`DROP TABLE IF EXISTS checkpoints`);
    await queryRunner.query(`DROP TABLE IF EXISTS sos_events`);
    await queryRunner.query(`DROP TABLE IF EXISTS user_locations`);
    await queryRunner.query(`DROP TABLE IF EXISTS trip_members`);
    await queryRunner.query(`DROP TABLE IF EXISTS trips`);
    await queryRunner.query(`DROP TABLE IF EXISTS team_members`);
    await queryRunner.query(`DROP TABLE IF EXISTS teams`);
    await queryRunner.query(`DROP TABLE IF EXISTS users`);
    await queryRunner.query(`DROP TYPE IF EXISTS alert_type`);
    await queryRunner.query(`DROP TYPE IF EXISTS point_source`);
    await queryRunner.query(`DROP TYPE IF EXISTS point_status`);
    await queryRunner.query(`DROP TYPE IF EXISTS moderation_status`);
    await queryRunner.query(`DROP TYPE IF EXISTS camera_type`);
    await queryRunner.query(`DROP TYPE IF EXISTS sos_status`);
    await queryRunner.query(`DROP TYPE IF EXISTS trip_member_status`);
    await queryRunner.query(`DROP TYPE IF EXISTS trip_status`);
    await queryRunner.query(`DROP TYPE IF EXISTS membership_status`);
    await queryRunner.query(`DROP TYPE IF EXISTS member_role`);
    await queryRunner.query(`DROP TYPE IF EXISTS user_role`);
  }
}
