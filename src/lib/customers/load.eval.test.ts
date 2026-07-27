import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const loadSource = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "load.ts"),
  "utf8",
);
const ventaSource = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "../../components/venta-client.tsx"),
  "utf8",
);

describe("customer recipients load eval", () => {
  it("loads recipients in a separate query instead of nested embed", () => {
    assert.equal(loadSource.includes("customer_recipients ("), false);
    assert.equal(loadSource.includes('from("customer_recipients")'), true);
    assert.equal(loadSource.includes("mergeCustomersWithRecipients"), true);
    assert.equal(loadSource.includes("listRecipientsForCustomerSession"), true);
  });

  it("refreshes customers on mount and hydrates recipients when choosing sender", () => {
    assert.equal(ventaSource.includes("customersBootstrappedRef"), false);
    assert.equal(ventaSource.includes("activeSender"), true);
    assert.equal(ventaSource.includes("listRecipientsForCustomerAction"), true);
    assert.equal(ventaSource.includes("ensureSenderRecipients"), true);
    assert.equal(ventaSource.includes('setRecipientQuery("")'), true);
    assert.equal(ventaSource.includes("leftHasRecipients"), true);

    const chooseSenderStart = ventaSource.indexOf("function chooseSender(sender: Sender)");
    const chooseSenderBody = ventaSource.slice(
      chooseSenderStart,
      ventaSource.indexOf("function patchSenderCardStyle", chooseSenderStart),
    );
    assert.match(chooseSenderBody, /setSelectedSender\(resolved\);/);
    assert.doesNotMatch(chooseSenderBody, /await ensureSenderRecipients\(resolved\)/);
  });
});
