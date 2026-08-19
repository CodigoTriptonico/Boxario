import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (relativePath: string) => readFileSync(path.join(root, relativePath), "utf8");

test("la dirección de remitentes y destinatarios abre el mapa exacto", () => {
  const card = read("src/components/sale/sale-person-card.tsx");
  const senderList = read("src/components/sale/sale-sender-list.tsx");
  const recipientList = read("src/components/sale/sale-recipient-list.tsx");
  const senderStep = read("src/components/sale/venta/venta-client-step.tsx");
  const recipientStep = read("src/components/sale/venta/venta-recipient-box-steps.tsx");
  const map = read("src/components/sale/sale-person-address-map.tsx");

  assert.match(card, /onAddressClick\?: \(\) => void/);
  assert.match(card, /aria-label="Mostrar direcci/);
  assert.match(card, /event\.stopPropagation\(\)/);
  assert.match(card, /inline-flex h-8 w-8 shrink-0 items-center justify-center/);
  assert.doesNotMatch(card, /cursor-crosshair/);
  assert.match(senderList, /onAddressClick=\{onAddressClick/);
  assert.match(recipientList, /onAddressClick=\{onAddressClick/);
  assert.match(senderStep, /onAddressClick=\{addressMap\.openSender\}/);
  assert.match(recipientStep, /onAddressClick=\{activeSender \?/);
  assert.match(map, /updateCustomerAction/);
  assert.match(map, /updateRecipientAction/);
  assert.match(map, /SaleExactEntranceWindow/);
  assert.match(map, /exactEntranceLat: draft\.lat/);
});

test("el mapa intenta ubicar una dirección sin coordenadas y conserva el guardado explícito", () => {
  const map = read("src/components/sale/sale-exact-entrance-step.tsx");

  assert.match(map, /addressFields\.street/);
  assert.match(map, /fetch\("\/api\/validate-address"/);
  assert.match(map, /setDraft\(nextDraft\)/);
  assert.match(map, /await onConfirm\(draft\)/);
  assert.match(map, /if \(!draft \|\| confirming\)/);
  assert.match(map, /syncMapMarkers/);
});

test("parseAccessPoints, formatAccessPoints y syncMapMarkers aseguran la coexistencia y persistencia de múltiples pines", () => {
  const file = read("src/components/sale/sale-exact-entrance-step.tsx");

  assert.match(file, /export function parseAccessPoints/);
  assert.match(file, /export function formatAccessPoints/);
  assert.match(file, /function syncMapMarkers/);
  assert.match(file, /pointsRef\.current/);
  assert.match(file, /selectedTagRef\.current/);
  assert.match(file, /syncMapMarkers\(maps, map, pointsRef\.current, selectedTagRef\.current\)/);
  assert.match(file, /handleCustomLabelChange/);
  assert.match(file, /Otro \(\$\{data\.customLabel/);
});
