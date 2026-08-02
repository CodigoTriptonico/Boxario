import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const dialogSource = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "../components/shipment-journal-dialog.tsx"),
  "utf8",
);

describe("shipment journal UI", () => {
  it("uses progressive disclosure for optional composer fields", () => {
    assert.match(dialogSource, /Detalles del contacto/);
    assert.match(dialogSource, /Recordatorio/);
    assert.match(dialogSource, /contactDetailsOpen/);
    assert.match(dialogSource, /reminderOpen/);
  });

  it("renders a compact continuous timeline instead of fixed-height cards", () => {
    assert.match(dialogSource, /max-h-\[94dvh\]/);
    assert.equal(dialogSource.includes('className="flex h-[94dvh]'), false);
    assert.match(dialogSource, /divide-y divide-black/);
    assert.match(dialogSource, /shipmentJournalDisplayTitle/);
    assert.match(dialogSource, /shipmentJournalReminderBadge/);
  });
});
