/**
 * Office payment idempotency helpers (FIN-004).
 * clientPaymentId is generated once per payment intention in the UI and must
 * reach PostgreSQL unchanged. Never mint a new id inside the Server Action.
 */

export const PAYMENT_IDEMPOTENCY_CONFLICT = "PAYMENT_IDEMPOTENCY_CONFLICT";
const PAYMENT_OPERATION_ID_INVALID = "PAYMENT_OPERATION_ID_INVALID";

const CLIENT_PAYMENT_ID_MIN_LENGTH = 8;
const CLIENT_PAYMENT_ID_MAX_LENGTH = 128;

export type CollectPaymentRpcResult = {
  replayed: boolean;
  paymentId: string;
  shipmentId: string;
  paid: number;
  invoiceStatus: string | null;
  clientPaymentId: string | null;
};

export function validateClientPaymentId(raw: string | undefined | null):
  | { ok: true; value: string }
  | { ok: false; error: string } {
  const value = String(raw || "").trim();
  if (!value) {
    return { ok: false, error: "Falta la clave de operación del cobro" };
  }
  if (
    value.length < CLIENT_PAYMENT_ID_MIN_LENGTH ||
    value.length > CLIENT_PAYMENT_ID_MAX_LENGTH
  ) {
    return { ok: false, error: PAYMENT_OPERATION_ID_INVALID };
  }
  return { ok: true, value };
}

export function parseCollectPaymentRpcResult(data: unknown): CollectPaymentRpcResult | null {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return null;
  }
  const row = data as Record<string, unknown>;
  const paymentId = typeof row.paymentId === "string" ? row.paymentId : null;
  const shipmentId = typeof row.shipmentId === "string" ? row.shipmentId : null;
  if (!paymentId || !shipmentId) {
    return null;
  }
  const paidRaw = row.paid;
  const paid =
    typeof paidRaw === "number"
      ? paidRaw
      : typeof paidRaw === "string"
        ? Number(paidRaw)
        : NaN;
  if (!Number.isFinite(paid)) {
    return null;
  }
  return {
    replayed: Boolean(row.replayed),
    paymentId,
    shipmentId,
    paid,
    invoiceStatus: typeof row.invoiceStatus === "string" ? row.invoiceStatus : null,
    clientPaymentId:
      typeof row.clientPaymentId === "string" ? row.clientPaymentId : null,
  };
}

/** Map RPC / DB errors to stable domain codes or safe user messages. */
export function mapCollectPaymentError(message: string): string {
  const text = String(message || "");
  if (/PAYMENT_IDEMPOTENCY_CONFLICT/i.test(text)) {
    return PAYMENT_IDEMPOTENCY_CONFLICT;
  }
  if (/PAYMENT_OPERATION_ID_INVALID/i.test(text)) {
    return PAYMENT_OPERATION_ID_INVALID;
  }
  if (/UNAUTHORIZED/i.test(text)) {
    return "UNAUTHORIZED";
  }
  if (/FORBIDDEN/i.test(text)) {
    return "FORBIDDEN";
  }
  if (/No hay pendiente/i.test(text)) {
    return "No hay pendiente en este invoice";
  }
  if (/superar el saldo|Monto de pago invalido/i.test(text)) {
    return text.includes("invalido")
      ? "El monto debe ser mayor a cero"
      : "El monto no puede superar el saldo pendiente";
  }
  return text;
}

export function isPaymentIdempotencyConflict(error: string): boolean {
  return String(error || "").includes(PAYMENT_IDEMPOTENCY_CONFLICT);
}

export function paymentIdempotencyConflictUserMessage(): string {
  return "Este cobro ya fue registrado con otros datos. Abre de nuevo el diálogo para un pago nuevo.";
}

/**
 * Errors that are definitive before/without an ambiguous commit.
 * These may discard the client intention key. Network / unknown must NOT match.
 */
export function isDefinitiveOfficePaymentClientError(error: string): boolean {
  const text = String(error || "");
  if (isPaymentIdempotencyConflict(text)) {
    return true;
  }
  if (/UNAUTHORIZED|FORBIDDEN|PAYMENT_OPERATION_ID_INVALID/i.test(text)) {
    return true;
  }
  if (/Falta la clave de operación/i.test(text)) {
    return true;
  }
  if (/El monto debe ser mayor a cero/i.test(text)) {
    return true;
  }
  if (/El monto no puede superar/i.test(text)) {
    return true;
  }
  if (/No hay pendiente en este invoice/i.test(text)) {
    return true;
  }
  if (/Metodo de pago invalido|Método de pago/i.test(text)) {
    return true;
  }
  if (/Invoice no encontrado/i.test(text)) {
    return true;
  }
  if (/Clave de operacion de cobro invalida/i.test(text)) {
    return true;
  }
  return false;
}
