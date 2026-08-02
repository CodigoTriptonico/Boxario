import { formatMoneyValue } from "@/lib/logistics-fees";
import type { LogisticsTaskType } from "@/lib/logistics-routing";

export type ConductorPaymentChoice = "expected" | "custom" | "none";
export type ConductorPaymentOutcome = "collected" | "not_collected" | "not_applicable";

/** Cent-rounded money helper shared by conductor collection rules (FIN-004). */
function money(value: number) {
  return Math.round(Math.max(0, Number(value) || 0) * 100) / 100;
}

export function isConductorPaymentChoice(value: unknown): value is ConductorPaymentChoice {
  return value === "expected" || value === "custom" || value === "none";
}

export function conductorExpectedDepositCollection(input: {
  result: "completed" | "failed";
  taskType: LogisticsTaskType;
  depositDue: number;
  balanceDue: number;
}) {
  if (input.result !== "completed" || input.taskType !== "deliver_empty_box") {
    return 0;
  }

  return Math.min(money(input.depositDue), money(input.balanceDue));
}

export function conductorPaymentChoiceError(input: {
  choice: ConductorPaymentChoice | null;
  expectedAmount: number;
  customAmount: number;
  balanceDue?: number;
}) {
  if (!input.choice) {
    return "Indica si recibiste el depósito.";
  }

  if (input.choice === "custom" && money(input.customAmount) <= 0) {
    return "Indica un monto recibido válido.";
  }

  if (input.choice !== "none" && input.balanceDue !== undefined) {
    const amount =
      input.choice === "expected" ? money(input.expectedAmount) : money(input.customAmount);
    if (amount - money(input.balanceDue) > 0.009) {
      return "El monto no puede superar el saldo pendiente.";
    }
  }

  return null;
}

export function resolveConductorPaymentAmount(input: {
  choice: ConductorPaymentChoice;
  expectedAmount: number;
  customAmount: number;
}) {
  if (input.choice === "none") {
    return { amount: 0, outcome: "not_collected" as const };
  }

  return {
    amount: input.choice === "expected" ? money(input.expectedAmount) : money(input.customAmount),
    outcome: "collected" as const,
  };
}

/**
 * FIN-004: never raise quotedTotal to absorb an overpayment.
 * Overpayment must be rejected by the caller / SQL collector.
 */
export function settleConductorPayment(input: {
  quotedTotal: number;
  alreadyPaid: number;
  receivedAmount: number;
}) {
  const quotedTotal = money(input.quotedTotal);
  const alreadyPaid = money(input.alreadyPaid);
  const receivedAmount = money(input.receivedAmount);
  const balanceDueBefore = money(Math.max(quotedTotal - alreadyPaid, 0));

  if (receivedAmount <= 0) {
    throw new Error("El monto debe ser mayor a cero");
  }

  if (receivedAmount - balanceDueBefore > 0.009) {
    throw new Error(`El monto no puede superar ${formatMoneyValue(balanceDueBefore)}`);
  }

  const paid = money(alreadyPaid + receivedAmount);
  const balanceDue = money(Math.max(quotedTotal - paid, 0));

  return {
    paid,
    balanceDue,
    quotedTotal,
    adjustedQuotedTotal: quotedTotal,
    totalAdjusted: false,
    totalAdjustment: 0,
    isPaidInFull: balanceDue <= 0.009,
  };
}

export function conductorCollectionAuditDescription(input: {
  expectedAmount: number;
  receivedAmount: number;
  outcome: Extract<ConductorPaymentOutcome, "collected" | "not_collected">;
}) {
  const expectedAmount = formatMoneyValue(money(input.expectedAmount));

  if (input.outcome === "not_collected") {
    return `No recibió ${expectedAmount}; el cobro queda pendiente.`;
  }

  const receivedAmount = formatMoneyValue(money(input.receivedAmount));
  return input.expectedAmount === input.receivedAmount
    ? `Recibió ${receivedAmount}.`
    : `Esperado ${expectedAmount}; recibió ${receivedAmount}.`;
}
