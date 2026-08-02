export type OperationLogInput = {
  operation: string;
  organizationId?: string;
  actorUserId?: string;
  resourceType?: string;
  resourceId?: string;
  durationMs?: number;
  result: "ok" | "error";
  errorCode?: string;
  operationId?: string;
};

const REDACT_KEYS = /^(password|token|secret|authorization|cookie|payment|card|cvv|ssn)$/i;

/**
 * Structured single-line operation log for critical flows.
 * Never pass tokens, passwords, or payment payloads.
 */
export function logOperation(input: OperationLogInput): void {
  const payload: Record<string, string | number | undefined> = {
    type: "operation",
    operation: String(input.operation || "").slice(0, 120),
    result: input.result === "error" ? "error" : "ok",
  };

  if (input.organizationId) payload.organizationId = input.organizationId;
  if (input.actorUserId) payload.actorUserId = input.actorUserId;
  if (input.resourceType) payload.resourceType = input.resourceType;
  if (input.resourceId) payload.resourceId = input.resourceId;
  if (typeof input.durationMs === "number" && Number.isFinite(input.durationMs)) {
    payload.durationMs = Math.round(input.durationMs);
  }
  if (input.errorCode) payload.errorCode = String(input.errorCode).slice(0, 80);
  if (input.operationId) payload.operationId = input.operationId;

  for (const key of Object.keys(payload)) {
    if (REDACT_KEYS.test(key)) {
      delete payload[key];
    }
  }

  console.info(JSON.stringify(payload));
}
