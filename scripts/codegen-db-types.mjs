#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const outPath = resolve(root, "src/lib/db/database.generated.ts");

mkdirSync(dirname(outPath), { recursive: true });

const result = spawnSync(
  "npx",
  ["--yes", "supabase", "gen", "types", "typescript", "--local"],
  {
    cwd: root,
    encoding: "utf8",
    shell: true,
  },
);

if (result.status !== 0) {
  process.stderr.write(result.stderr || result.stdout || "codegen failed\n");
  process.exit(result.status || 1);
}

const start = result.stdout.indexOf("export type Json");
if (start < 0) {
  process.stderr.write("codegen:db-types: unexpected output (missing export type Json)\n");
  process.stderr.write(result.stdout.slice(0, 500));
  process.exit(1);
}

writeFileSync(outPath, result.stdout.slice(start), "utf8");
console.log(`[codegen:db-types] wrote ${outPath}`);
