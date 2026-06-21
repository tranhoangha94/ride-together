export function shouldUseDatabaseSsl(databaseUrl: string, override?: string) {
  if (override === "true") {
    return { rejectUnauthorized: false };
  }
  if (override === "false") {
    return false;
  }

  // Railway public proxy URLs need SSL; internal *.railway.internal URLs do not.
  if (databaseUrl.includes(".railway.app") || databaseUrl.includes("sslmode=require") || databaseUrl.includes("ssl=true")) {
    return { rejectUnauthorized: false };
  }

  return false;
}

export function getRequiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}
