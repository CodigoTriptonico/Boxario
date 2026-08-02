#!/usr/bin/env node
/**
 * Verifica drift entre tipos generados versionados y el esquema Supabase local.
 *
 * Requisitos: Docker + `npx supabase start` (proyecto local).
 * Regenerar: `npm run codegen:db-types`
 * Verificar: `npm run check:db-types`
 *
 * Si falla: regenerar tipos, revisar el diff de database.generated.ts y commitear.
 */
import { spawnSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const versionedPath = resolve(root, "src/lib/db/database.generated.ts");

function normalizeGenerated(source) {
  const start = source.indexOf("export type Json");
  if (start < 0) {
    return null;
  }
  return source.slice(start).replace(/\r\n/g, "\n").trimEnd() + "\n";
}

if (!existsSync(versionedPath)) {
  console.error(
    `[check:db-types] falta el archivo versionado: ${versionedPath}\n` +
      `Ejecuta: npm run codegen:db-types`,
  );
  process.exit(1);
}

const result = spawnSync(
  "npx",
  ["--yes", "supabase", "gen", "types", "typescript", "--local"],
  {
    cwd: root,
    encoding: "utf8",
    shell: true,
    timeout: 120_000,
  },
);

if (result.status !== 0) {
  const detail = (result.stderr || result.stdout || "").trim();
  console.error(
    `[check:db-types] no se pudo generar tipos desde Supabase local.\n` +
      `Requisitos: Docker Desktop en marcha y \`npm run supabase:start\`.\n` +
      `Detalle:\n${detail.slice(0, 2000)}`,
  );
  process.exit(result.status || 1);
}

const fresh = normalizeGenerated(result.stdout || "");
if (!fresh) {
  console.error(
    "[check:db-types] salida inesperada de supabase gen types (falta export type Json).",
  );
  process.exit(1);
}

const versioned = normalizeGenerated(readFileSync(versionedPath, "utf8"));
if (!versioned) {
  console.error(
    "[check:db-types] el archivo versionado no parece un codegen de Supabase válido.",
  );
  process.exit(1);
}

if (fresh === versioned) {
  console.log(
    "[check:db-types] OK — database.generated.ts coincide con el esquema local.",
  );
  process.exit(0);
}

console.error(
  `[check:db-types] DRIFT detectado.\n` +
    `El esquema local no coincide con ${versionedPath}.\n` +
    `Acción: npm run codegen:db-types && revisar el diff && commitear.`,
);
process.exit(1);
