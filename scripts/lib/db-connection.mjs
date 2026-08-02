import pg from "pg";
import {
  assertLocalSupabaseUrl,
  loadEnvLocal,
} from "./env-local.mjs";

export { loadEnvLocal, projectRoot } from "./env-local.mjs";

function resolvePgConnectionConfig() {
  loadEnvLocal();
  assertLocalSupabaseUrl();

  const explicitUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
  if (explicitUrl) {
    if (explicitUrl.includes("supabase.co")) {
      throw new Error("SUPABASE_DB_URL remota no permitida. Usa Supabase local.");
    }

    return {
      connectionString: explicitUrl,
      ssl: false,
      label: "custom local database URL",
      mode: "local",
    };
  }

  const host = process.env.SUPABASE_DB_HOST || "127.0.0.1";
  const port = process.env.SUPABASE_DB_PORT || "54322";
  const password = process.env.SUPABASE_DB_PASSWORD || "postgres";

  return {
    connectionString: `postgresql://postgres:${encodeURIComponent(password)}@${host}:${port}/postgres`,
    ssl: false,
    label: `local postgres @ ${host}:${port}`,
    mode: "local",
  };
}

export async function connectPg() {
  const config = resolvePgConnectionConfig();
  const client = new pg.Client({
    connectionString: config.connectionString,
    ssl: config.ssl,
  });

  await client.connect();
  return { client, ...config };
}
