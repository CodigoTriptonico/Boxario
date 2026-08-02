import { readBillingFromPlan } from "@/lib/invoice-billing";
import {
  formatMoneyValue,
  parseMoneyValue,
} from "@/lib/logistics-fees";
import type { ShipmentRow } from "@/lib/shipment-types";

export type ShipmentQuote = {
  label: string;
  paid: string;
  cost: string;
  total: string;
};

export type ShipmentBoxLine = {
  label: string;
  quantity: number;
  paid: string;
  cost: string;
};

export function formatBoxQuantityLabel(
  label: string,
  quantity = 1,
) {
  const cleanLabel = String(label || "").trim();
  const count = Math.max(Number(quantity) || 1, 1);

  if (!cleanLabel) {
    return "";
  }

  return `(${count}) ${cleanLabel}`;
}

function readBoxLineEntries(
  plan: Record<string, unknown>,
): ShipmentBoxLine[] {
  const rawLines = Array.isArray(plan.boxLines) ? plan.boxLines : [];

  return rawLines
    .map((entry) => {
      const line =
        entry && typeof entry === "object" && !Array.isArray(entry)
          ? (entry as Record<string, unknown>)
          : null;

      if (!line) {
        return null;
      }

      const label = String(line.label || "").trim();

      if (!label) {
        return null;
      }

      return {
        label,
        quantity: Math.max(Number(line.quantity) || 1, 1),
        paid: String(line.paid || "0"),
        cost: String(line.cost || "0"),
      } satisfies ShipmentBoxLine;
    })
    .filter((line): line is ShipmentBoxLine => Boolean(line));
}

export function readShipmentBoxLines(
  row: ShipmentRow,
): ShipmentBoxLine[] {
  return readBoxLinesFromLogisticsPlan(row.logistics_plan);
}

/** Parse box lines from a raw logistics_plan JSON blob (no full ShipmentRow needed). */
export function readBoxLinesFromLogisticsPlan(
  plan: unknown,
): ShipmentBoxLine[] {
  const normalized =
    plan && typeof plan === "object" && !Array.isArray(plan)
      ? (plan as Record<string, unknown>)
      : {};
  const lines = readBoxLineEntries(normalized);

  if (lines.length) {
    return lines;
  }

  const box =
    normalized.box &&
    typeof normalized.box === "object" &&
    !Array.isArray(normalized.box)
      ? (normalized.box as Record<string, unknown>)
      : null;
  const label = String(box?.label || "").trim();
  const boxCount = Math.max(Number(normalized.boxCount) || 1, 1);

  if (!label) {
    return [];
  }

  return [
    {
      label,
      quantity: boxCount,
      paid: String(box?.paid || "0"),
      cost: String(box?.cost || "0"),
    },
  ];
}

export function shipmentBoxLinesTriggerLabel(
  lines: ShipmentBoxLine[],
): string {
  if (!lines.length) {
    return "";
  }

  if (lines.length === 1 && lines[0].quantity === 1) {
    return formatBoxQuantityLabel(lines[0].label, 1);
  }

  return "Cajas";
}

export function shipmentBoxLinesDetailLabel(
  lines: ShipmentBoxLine[],
): string {
  return lines
    .map((line) =>
      formatBoxQuantityLabel(line.label, line.quantity),
    )
    .filter(Boolean)
    .join(" + ");
}

export function shipmentBoxLineTotal(
  line: ShipmentBoxLine,
): string {
  return formatMoneyValue(
    parseMoneyValue(line.paid) * line.quantity,
  );
}

export function quoteFromShipment(
  row: ShipmentRow,
): ShipmentQuote | null {
  const lines = readShipmentBoxLines(row);

  if (lines.length) {
    const total = lines.reduce(
      (sum, line) =>
        sum + parseMoneyValue(line.paid) * line.quantity,
      0,
    );
    const cost = lines.reduce(
      (sum, line) =>
        sum + parseMoneyValue(line.cost) * line.quantity,
      0,
    );

    return {
      label: shipmentBoxLinesDetailLabel(lines),
      paid: formatMoneyValue(total),
      cost: formatMoneyValue(cost),
      total: formatMoneyValue(total),
    };
  }

  return null;
}

export function balanceDueFromShipment(
  row: ShipmentRow,
  quote: ShipmentQuote | null,
) {
  const billing = readBillingFromPlan(row.logistics_plan);

  if (billing) {
    return Math.max(
      parseMoneyValue(billing.quotedTotal) - row.paid,
      0,
    );
  }

  if (!quote) {
    return 0;
  }

  return Math.max(parseMoneyValue(quote.total) - row.paid, 0);
}

export function depositFromShipment(row: ShipmentRow) {
  const billing = readBillingFromPlan(row.logistics_plan);

  if (billing) {
    return parseMoneyValue(billing.depositRequired);
  }

  return row.paid;
}

export function totalFromShipment(
  row: ShipmentRow,
  quote: ShipmentQuote | null,
) {
  const billing = readBillingFromPlan(row.logistics_plan);

  if (billing) {
    return parseMoneyValue(billing.quotedTotal);
  }

  if (!quote) {
    return row.paid;
  }

  return parseMoneyValue(quote.total);
}

export function invoiceStatusLabel(
  status: ShipmentRow["invoice_status"],
) {
  if (status === "paid") {
    return "Pagado";
  }

  if (status === "void") {
    return "Anulado";
  }

  return "Abierto";
}

export type ShipmentPaymentProgress = {
  total: number;
  paid: number;
  pending: number;
  percentPaid: number;
  status: "paid" | "partial" | "void" | "open";
  statusLabel: string;
};

export function shipmentPaymentProgress(
  row: ShipmentRow,
  quote: ShipmentQuote | null,
): ShipmentPaymentProgress {
  const total = totalFromShipment(row, quote);
  const pending = balanceDueFromShipment(row, quote);
  const paid = Math.max(Math.min(row.paid, total), 0);

  if (row.invoice_status === "void") {
    return {
      total,
      paid,
      pending: 0,
      percentPaid: 0,
      status: "void",
      statusLabel: "Anulado",
    };
  }

  if (row.invoice_status === "paid" || pending <= 0) {
    return {
      total,
      paid: total > 0 ? total : paid,
      pending: 0,
      percentPaid: 100,
      status: "paid",
      statusLabel: "Pagado",
    };
  }

  const percentPaid =
    total > 0
      ? Math.round((paid / total) * 100)
      : paid > 0
        ? 100
        : 0;

  return {
    total,
    paid,
    pending,
    percentPaid: Math.max(0, Math.min(percentPaid, 100)),
    status: paid > 0 ? "partial" : "open",
    statusLabel: paid > 0 ? "Abono parcial" : "Sin abonos",
  };
}
