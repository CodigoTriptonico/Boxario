/**
 * Agency operation idempotency helpers (AGE-001).
 * Keys are generated once per intention in the UI and must reach PostgreSQL unchanged.
 */

export const AGENCY_IDEMPOTENCY_CONFLICT = "AGENCY_IDEMPOTENCY_CONFLICT";
export const AGENCY_REQUEST_ALREADY_ASSIGNED = "REQUEST_ALREADY_ASSIGNED";
const REQUEST_CANCELLED = "REQUEST_CANCELLED";
const REQUEST_NOT_ASSIGNABLE = "REQUEST_NOT_ASSIGNABLE";

const AGENCY_IDEMPOTENCY_KEY_MIN_LENGTH = 8;
const AGENCY_IDEMPOTENCY_KEY_MAX_LENGTH = 128;

/** Stable assign key: same request+route retries share one operation. */
export function agencyAssignIdempotencyKey(
  requestId: string,
  routeId: string,
  scheduledFor?: string,
): string {
  const when = scheduledFor?.trim() || "";
  return when ? `assign:${requestId}:${routeId}:${when}` : `assign:${requestId}:${routeId}`;
}

/** Stable complete key so driver retries replay instead of minting a fresh UUID. */
export function agencyCompleteVisitIdempotencyKey(visitId: string): string {
  return `complete-visit:${visitId}`;
}

export function requireClientIdempotencyKey(value: string | undefined, label: string): string {
  const key = value?.trim() || "";
  if (!key) {
    throw new Error(`${label} requiere una clave de idempotencia del cliente`);
  }
  return key;
}

export function validateClientAgencyIdempotencyKey(
  raw: string | undefined | null,
): { ok: true; value: string } | { ok: false; error: string } {
  const value = String(raw || "").trim();
  if (
    value.length < AGENCY_IDEMPOTENCY_KEY_MIN_LENGTH ||
    value.length > AGENCY_IDEMPOTENCY_KEY_MAX_LENGTH
  ) {
    return { ok: false, error: "Falta la clave de operación de agencia" };
  }
  return { ok: true, value };
}

export function parseAgencyCreateRpcResult(
  data: unknown,
): { requestId: string; replayed: boolean; fingerprint: string | null } | null {
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const row = data as Record<string, unknown>;
  const requestId = typeof row.requestId === "string" ? row.requestId : null;
  if (!requestId) return null;
  return {
    requestId,
    replayed: Boolean(row.replayed),
    fingerprint: typeof row.fingerprint === "string" ? row.fingerprint : null,
  };
}

export function parseAgencyAssignRpcResult(
  data: unknown,
): {
  visitId: string;
  requestId: string | null;
  replayed: boolean;
  routeId: string | null;
  fingerprint: string | null;
} | null {
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const row = data as Record<string, unknown>;
  const visitId = typeof row.visitId === "string" ? row.visitId : null;
  if (!visitId) return null;
  return {
    visitId,
    requestId: typeof row.requestId === "string" ? row.requestId : null,
    replayed: Boolean(row.replayed),
    routeId: typeof row.routeId === "string" ? row.routeId : null,
    fingerprint: typeof row.fingerprint === "string" ? row.fingerprint : null,
  };
}

export function mapAgencyOperationError(message: string): string {
  const text = String(message || "");
  if (/AGENCY_IDEMPOTENCY_CONFLICT/i.test(text)) return AGENCY_IDEMPOTENCY_CONFLICT;
  if (/REQUEST_ALREADY_ASSIGNED/i.test(text)) return AGENCY_REQUEST_ALREADY_ASSIGNED;
  if (/REQUEST_CANCELLED/i.test(text)) return REQUEST_CANCELLED;
  if (/REQUEST_NOT_ASSIGNABLE/i.test(text)) return REQUEST_NOT_ASSIGNABLE;
  if (/IDEMPOTENCY_KEY_REQUIRED/i.test(text)) {
    return "Falta la clave de operación de agencia";
  }
  if (/FORBIDDEN/i.test(text)) return "FORBIDDEN";
  if (/UNAUTHENTICATED/i.test(text)) return "UNAUTHORIZED";
  return text;
}

export function isAgencyIdempotencyConflict(error: string): boolean {
  return /AGENCY_IDEMPOTENCY_CONFLICT/i.test(String(error || ""));
}

function isAgencyAlreadyAssignedError(error: string): boolean {
  return /REQUEST_ALREADY_ASSIGNED/i.test(String(error || ""));
}

export function isDefinitiveAgencyClientError(error: string): boolean {
  const text = String(error || "");
  if (isAgencyIdempotencyConflict(text) || isAgencyAlreadyAssignedError(text)) return true;
  if (/REQUEST_CANCELLED|REQUEST_NOT_ASSIGNABLE|FORBIDDEN|UNAUTHORIZED/i.test(text)) {
    return true;
  }
  if (/Falta la clave|requiere una clave de idempotencia|IDEMPOTENCY_KEY_INVALID/i.test(text)) {
    return true;
  }
  if (/Agrega al menos/i.test(text)) return true;
  if (/SOLICITUD_INVALIDA|LINEA_INVALIDA|REQUEST_NOT_FOUND/i.test(text)) return true;
  return false;
}

export function agencyIdempotencyConflictUserMessage(): string {
  return "Esta operación ya se registró con otros datos. Abre de nuevo para una intención nueva.";
}

export function agencyAlreadyAssignedUserMessage(): string {
  return "Esta solicitud ya está asignada a otra ruta. No se puede reasignar desde aquí.";
}

export function agencyCreateConflictUserMessage(): string {
  return agencyIdempotencyConflictUserMessage();
}
