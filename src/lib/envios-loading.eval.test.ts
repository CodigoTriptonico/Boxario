import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const clientPath = new URL("../components/envios-client.tsx", import.meta.url);
const panelPath = new URL("../components/envios/envios-shipments-panel.tsx", import.meta.url);
const loadingPath = new URL("../components/page-loading.tsx", import.meta.url);

test("envios mantiene la carga durante la lectura fresca del bootstrap", async () => {
  const [source, panelSource, loadingSource] = await Promise.all([
    readFile(clientPath, "utf8"),
    readFile(panelPath, "utf8"),
    readFile(loadingPath, "utf8"),
  ]);

  assert.match(source, /useState\(supabaseReady\)/);
  assert.match(source, /queueMicrotask\(\(\) => \{[\s\S]*?setShipmentsLoading\(true\);/);
  assert.match(source, /<PageLoading inline seamless \/>/);
  assert.match(panelSource, /<PageLoading inline seamless \/>/);
  assert.match(loadingSource, /seamless\?: boolean/);
});
