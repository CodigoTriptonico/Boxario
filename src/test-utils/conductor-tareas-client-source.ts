import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const CONDUCTOR_TAREAS_CLIENT_FILES = [
  "components/conductor/conductor-tareas-client.tsx",
  "components/conductor/conductor-task-items.tsx",
  "components/conductor/conductor-task-result-dialog.tsx",
  "components/conductor/conductor-tareas-toolbar.tsx",
] as const;

function resolveSrcRoot(root = process.cwd()) {
  if (existsSync(join(root, "src", "components", "conductor", "conductor-tareas-client.tsx"))) {
    return join(root, "src");
  }

  if (existsSync(join(root, "components", "conductor", "conductor-tareas-client.tsx"))) {
    return root;
  }

  return join(root, "src");
}

export function readConductorTareasClientSource(root = process.cwd()) {
  const srcRoot = resolveSrcRoot(root);

  return CONDUCTOR_TAREAS_CLIENT_FILES
    .map((file) => readFileSync(join(srcRoot, file), "utf8"))
    .join("\n");
}
