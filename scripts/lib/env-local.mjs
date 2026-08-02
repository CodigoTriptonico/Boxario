import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
export const projectRoot = path.join(currentDirectory, "..", "..");

export function loadEnvLocal(root = projectRoot) {
  const envPath = path.join(root, ".env.local");
  if (!fs.existsSync(envPath)) {
    return;
  }

  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const eq = trimmed.indexOf("=");
    if (eq === -1) {
      continue;
    }

    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

export function assertLocalSupabaseUrl(
  url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
) {
  if (!url) {
    throw new Error("Falta NEXT_PUBLIC_SUPABASE_URL en .env.local");
  }

  if (url.includes("supabase.co")) {
    throw new Error(
      "Este proyecto solo usa Supabase local. Ejecuta: npm run env:local (y npm run supabase:start).",
    );
  }

  if (!url.includes("127.0.0.1") && !url.includes("localhost")) {
    throw new Error(
      `NEXT_PUBLIC_SUPABASE_URL debe apuntar a Supabase local (127.0.0.1 o localhost). Valor actual: ${url}`,
    );
  }
}
