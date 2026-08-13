import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { readConductorTaskActionsSource } from "@/test-utils/conductor-logistics-action-sources";
import { readConductorTareasClientSource } from "@/test-utils/conductor-tareas-client-source";

const root = process.cwd();
const paymentSource = readFileSync(join(root, "src/lib/conductor-driver-payment.ts"), "utf8");
const actionSource = readConductorTaskActionsSource(root);
const clientSource = readConductorTareasClientSource(root);

describe("conductor driver payment eval", () => {
  it("keeps the conductor choice explicit through UI, action and settlement", () => {
    assert.match(clientSource, /No recibí dinero/);
    assert.match(clientSource, /Recibí otro monto/);
    assert.match(actionSource, /conductorPaymentChoiceError/);
    assert.match(actionSource, /conductorExpectedDepositCollection/);
    assert.match(clientSource, /conductorExpectedDepositCollection/);
    assert.match(actionSource, /resolveConductorPaymentAmount/);
    assert.match(actionSource, /paymentOutcome/);
    assert.match(paymentSource, /"expected" \| "custom" \| "none"/);
    assert.match(paymentSource, /"not_collected"/);
  });

  it("never falls back from a paid deposit to the remaining invoice balance", () => {
    assert.doesNotMatch(actionSource, /task\.depositDue > 0[\s\S]{0,100}task\.balanceDue/);
    assert.doesNotMatch(clientSource, /dialog\.task\.depositDue > 0[\s\S]{0,100}dialog\.task\.balanceDue/);
    assert.match(paymentSource, /Math\.min\(money\(input\.depositDue\), money\(input\.balanceDue\)\)/);
  });

  it("offers an outstanding deposit again at pickup and records why no money was received", () => {
    assert.doesNotMatch(paymentSource, /taskType !== "deliver_empty_box"/);
    assert.match(paymentSource, /input\.choice === "none"/);
    assert.match(paymentSource, /input\.note/);
    assert.match(clientSource, /Motivo de cobro pendiente/);
    assert.match(actionSource, /note,/);
  });
});
