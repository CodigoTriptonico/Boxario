#!/usr/bin/env node
import { resolve } from "node:path";
import {
  analyzeArchitecture,
  formatArchitectureIssue,
} from "./lib/architecture-health.mjs";

const MAX_RUNTIME_FILE_LINES = 800;
const root = resolve(import.meta.dirname, "..");
const result = analyzeArchitecture(root, { maxLines: MAX_RUNTIME_FILE_LINES });

if (result.issues.length > 0) {
  console.error(
    `[architecture] ${result.issues.length} problema(s) en ${result.files} archivos runtime:`,
  );
  for (const issue of result.issues) {
    console.error(`- ${formatArchitectureIssue(issue)}`);
  }
  process.exit(1);
}

console.log(
  `[architecture] ${result.files} archivos runtime: sin ciclos, inversiones de capa ni archivos sobre ${MAX_RUNTIME_FILE_LINES} líneas.`,
);
