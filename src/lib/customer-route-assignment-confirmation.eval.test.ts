import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();

function read(relativePath: string) {
  return readFileSync(path.join(root, relativePath), "utf8");
}

test("las solicitudes demo usan la huella real y la confirmación masiva conserva el motivo", () => {
  const seed = read("scripts/seed-logistics-confirmation-cases.mjs");
  const workspace = read("src/components/logistica/logistics-routes-workspace.tsx");

  assert.match(seed, /function addressFingerprint\(customer\)/);
  assert.match(seed, /const fingerprint = addressFingerprint\(item\)/);
  assert.match(seed, /address_fingerprint = \$9/);
  assert.doesNotMatch(seed, /seed-\$\{item\.task_id\}/);

  assert.match(workspace, /const failedReasons: string\[\] = \[\]/);
  assert.match(workspace, /failedReasons\.push\(`\$\{request\.shipmentCode\}: \$\{result\.error\}`\)/);
  assert.match(workspace, /durationMs: 9000/);
  assert.match(workspace, /Invoice \$\{request\.shipmentCode\} enviado a plantilla \$\{request\.routeTemplateName\}/);
  assert.doesNotMatch(workspace, /Solicitud aceptada/);
  assert.doesNotMatch(workspace, /solicitudes aceptadas/);
});
