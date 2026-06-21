const { Client } = require("pg");

function shouldUseDatabaseSsl(databaseUrl, override) {
  if (override === "true") {
    return { rejectUnauthorized: false };
  }
  if (override === "false") {
    return false;
  }
  if (
    databaseUrl.includes(".railway.app") ||
    databaseUrl.includes("sslmode=require") ||
    databaseUrl.includes("ssl=true")
  ) {
    return { rejectUnauthorized: false };
  }
  return false;
}

async function main() {
  const databaseUrl = process.env.DATABASE_PUBLIC_URL ?? process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("Missing DATABASE_PUBLIC_URL or DATABASE_URL");
  }

  const ssl = shouldUseDatabaseSsl(databaseUrl, process.env.DATABASE_SSL);
  const client = new Client({
    connectionString: databaseUrl,
    ssl: ssl === false ? undefined : ssl
  });

  await client.connect();
  await client.query("CREATE EXTENSION IF NOT EXISTS postgis");
  await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
  await client.end();

  console.log("PostGIS enabled successfully.");
}

main().catch((error) => {
  console.error("Failed to enable PostGIS:", error.message ?? error);
  process.exit(1);
});
