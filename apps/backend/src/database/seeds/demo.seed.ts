import "reflect-metadata";
import * as bcrypt from "bcrypt";
import dataSource from "../data-source";

async function seed() {
  await dataSource.initialize();
  const passwordHash = await bcrypt.hash("password123", 12);

  await dataSource.query(
    `
    INSERT INTO users (email, password_hash, display_name, role)
    VALUES
      ('leader@example.com', $1, 'Trip Leader', 'admin'),
      ('rider@example.com', $1, 'Rider One', 'user')
    ON CONFLICT (email) DO NOTHING
    `,
    [passwordHash]
  );

  await dataSource.query(
    `
    INSERT INTO camera_points (type, point, lat, lng, title, description, source)
    VALUES
      ('traffic_hazard', ST_SetSRID(ST_MakePoint(106.7009, 10.7769), 4326)::geography, 10.7769, 106.7009, 'Demo safety point', 'Demo alert for local testing', 'admin')
    ON CONFLICT DO NOTHING
    `
  );

  await dataSource.destroy();
}

seed().catch(async (error) => {
  console.error(error);
  await dataSource.destroy();
  process.exit(1);
});
