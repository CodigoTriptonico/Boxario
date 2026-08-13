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
  const port = process.env.SUPABASE_DB_PORT || "60022";
  const password = process.env.SUPABASE_DB_PASSWORD || "postgres";

  return {
    connectionString: `postgresql://postgres:${encodeURIComponent(password)}@${host}:${port}/postgres`,
    ssl: false,
    label: `local postgres @ ${host}:${port}`,
    mode: "local",
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isTransientPgError(error) {
  const message = String(error?.message || error || "").toLowerCase();
  return (
    message.includes("connection terminated") ||
    message.includes("connection refused") ||
    message.includes("econnrefused") ||
    message.includes("econnreset") ||
    message.includes("timeout") ||
    message.includes("starting up") ||
    message.includes("the database system is not yet accepting connections") ||
    message.includes("could not connect to server")
  );
}

/**
 * Connects to local Postgres, retrying while Supabase containers finish booting.
 */
export async function connectPg(options = {}) {
  const config = resolvePgConnectionConfig();
  const maxAttempts = options.maxAttempts ?? 30;
  const delayMs = options.delayMs ?? 2_000;
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const client = new pg.Client({
      connectionString: config.connectionString,
      ssl: config.ssl,
      connectionTimeoutMillis: 5_000,
    });

    try {
      await client.connect();
      await client.query("select 1");
      return { client, ...config };
    } catch (error) {
      lastError = error;
      try {
        await client.end();
      } catch {
        // ignore cleanup errors while postgres is still booting
      }

      if (attempt >= maxAttempts || !isTransientPgError(error)) {
        break;
      }

      const detail = error instanceof Error ? error.message : String(error);
      console.log(
        `Postgres aún no responde (${attempt}/${maxAttempts}): ${detail}`,
      );
      await sleep(delayMs);
    }
  }

  throw lastError;
}
