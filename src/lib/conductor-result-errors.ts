import { ActionError, publicActionErrorMessage, type ActionErrorCode } from "@/lib/actions/errors";

/**
 * L-H4: contrato único de error para resultados de tarea del conductor (API + cola offline).
 */
export type ConductorResultError = {
  ok: false;
  code: string;
  message: string;
  retryable: boolean;
  status: number;
};

const TRANSIENT_MESSAGE_PATTERNS = [
  /\bfetch failed\b/i,
  /\btimeout\b/i,
  /\btimed out\b/i,
  /\btemporar(?:y|ily)\b/i,
  /\bunavailable\b/i,
  /\bconnection\b/i,
  /\beconnrefused\b/i,
  /\beconnreset\b/i,
  /\bdeadlock\b/i,
  /\bcould not serialize\b/i,
  /\b40001\b/,
  /\b40P01\b/,
  /\brate limit\b/i,
  /\bsincronizaci[oó]n en curso\b/i,
  /\bservicio no disponible\b/i,
];

type ErrorRule = {
  code: string;
  status: number;
  retryable: boolean;
  /** Match against raw exception / ActionError message / public message. */
  patterns: RegExp[];
  message?: string;
};

const DEFINITE_RULES: ErrorRule[] = [
  {
    code: "UNAUTHORIZED",
    status: 401,
    retryable: false,
    patterns: [/^UNAUTHORIZED$/i, /sesion requerida/i],
    message: "Sesion requerida",
  },
  {
    code: "FORBIDDEN",
    status: 403,
    retryable: false,
    patterns: [/^FORBIDDEN$/i, /no tienes permiso/i, /TASK_NOT_ASSIGNED_TO_DRIVER/i],
    message: "No tienes permiso para esta accion",
  },
  {
    code: "PAYLOAD_TOO_LARGE",
    status: 413,
    retryable: false,
    patterns: [/demasiado grande/i],
    message: "Operacion demasiado grande",
  },
  {
    code: "UNSUPPORTED_MEDIA",
    status: 415,
    retryable: false,
    patterns: [/formato de operacion invalido/i],
    message: "Formato de operacion invalido",
  },
  {
    code: "ATTEMPT_CONFLICT",
    status: 409,
    retryable: false,
    patterns: [/^ATTEMPT_CONFLICT$/i, /IDEMPOTENCY/i, /operacion ya fue procesada/i],
    message: "Esta operacion ya se registro con otro resultado",
  },
  {
    code: "TASK_CANCELLED",
    status: 409,
    retryable: false,
    patterns: [/^TASK_CANCELLED$/i, /^tarea cancelada$/i],
    message: "Tarea cancelada",
  },
  {
    code: "TASK_ALREADY_COMPLETED",
    status: 409,
    retryable: false,
    patterns: [/^TASK_ALREADY_COMPLETED$/i, /TASK_ALREADY_COMPLETED/i],
    message: "La tarea ya fue completada",
  },
  {
    code: "TASK_NOT_EXECUTABLE",
    status: 409,
    retryable: false,
    patterns: [
      /^TASK_NOT_EXECUTABLE$/i,
      /^TASK_REQUIRES_ROUTE_IN_PROGRESS$/i,
      /inicia la ruta antes/i,
      /estado actual no permite/i,
    ],
    message: "El estado actual no permite esta operacion",
  },
  {
    code: "NOT_FOUND",
    status: 404,
    retryable: false,
    patterns: [/^TASK_NOT_FOUND$/i, /^SHIPMENT_NOT_FOUND$/i, /invoice no encontrado/i, /no se encontro/i],
    message: "No se encontro el recurso",
  },
  {
    code: "VALIDATION",
    status: 422,
    retryable: false,
    patterns: [
      /^VALIDATION$/i,
      /^OPERATION_KEY_REQUIRED$/i,
      /^FAILURE_REASON_REQUIRED$/i,
      /^INVALID_TASK_RESULT$/i,
      /^INVALID_PAYMENT_OUTCOME$/i,
      /^DRIVER_REQUIRED$/i,
      /^TASK_ROUTE_REQUIRED$/i,
      /^PAYMENT_REQUIRES_COMPLETED_TASK$/i,
      /^falta tarea$/i,
      /^foto requerida$/i,
      /^foto maxima/i,
      /^foto debe/i,
      /^indica /i,
      /^selecciona /i,
      /evidencia/i,
      /motivo/i,
    ],
    message: undefined,
  },
  {
    code: "BUSINESS_RULE",
    status: 422,
    retryable: false,
    patterns: [
      /stock insuficiente/i,
      /pago no valido/i,
      /saldo/i,
      /camion/i,
      /inventario/i,
      /caja /i,
    ],
    message: undefined,
  },
];

const ACTION_CODE_TO_HTTP: Record<ActionErrorCode, { status: number; retryable: boolean; code: string }> = {
  UNAUTHORIZED: { status: 401, retryable: false, code: "UNAUTHORIZED" },
  FORBIDDEN: { status: 403, retryable: false, code: "FORBIDDEN" },
  VALIDATION: { status: 422, retryable: false, code: "VALIDATION" },
  NOT_FOUND: { status: 404, retryable: false, code: "NOT_FOUND" },
  CONFLICT: { status: 409, retryable: false, code: "CONFLICT" },
  CONCURRENCY: { status: 409, retryable: true, code: "CONCURRENCY" },
  IDEMPOTENCY: { status: 409, retryable: false, code: "ATTEMPT_CONFLICT" },
  INSUFFICIENT_STOCK: { status: 422, retryable: false, code: "BUSINESS_RULE" },
  INVALID_PAYMENT: { status: 422, retryable: false, code: "BUSINESS_RULE" },
  EXTERNAL: { status: 503, retryable: true, code: "EXTERNAL" },
  INTERNAL: { status: 500, retryable: false, code: "INTERNAL" },
};

function rawErrorText(error: unknown): string {
  if (error instanceof ActionError) {
    return `${error.code} ${error.message}`;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error || "");
}

function isTransientText(text: string) {
  return TRANSIENT_MESSAGE_PATTERNS.some((pattern) => pattern.test(text));
}

/**
 * Clasifica un fallo de submit de resultado de tarea.
 * Fuente de verdad para code / message / status / retryable.
 */
export function classifyConductorTaskResultError(error: unknown): ConductorResultError {
  if (error instanceof ActionError) {
    const mapped = ACTION_CODE_TO_HTTP[error.code];
    return {
      ok: false,
      code: mapped.code,
      message: publicActionErrorMessage(
        error.code === "UNAUTHORIZED"
          ? "Sesion requerida"
          : error.code === "FORBIDDEN"
            ? "No tienes permiso para esta accion"
            : error.message,
      ),
      retryable: mapped.retryable,
      status: mapped.status,
    };
  }

  const raw = rawErrorText(error).trim();
  const publicMessage = publicActionErrorMessage(
    raw === "UNAUTHORIZED"
      ? "Sesion requerida"
      : raw === "FORBIDDEN"
        ? "No tienes permiso para esta accion"
        : raw,
  );

  for (const rule of DEFINITE_RULES) {
    if (rule.patterns.some((pattern) => pattern.test(raw) || pattern.test(publicMessage))) {
      return {
        ok: false,
        code: rule.code,
        message: rule.message || publicMessage,
        retryable: rule.retryable,
        status: rule.status,
      };
    }
  }

  if (isTransientText(raw)) {
    return {
      ok: false,
      code: "TEMPORARY",
      message: "No se pudo procesar la operacion",
      retryable: true,
      status: 503,
    };
  }

  // Unknown: safe message, not universally retryable (L-H4).
  return {
    ok: false,
    code: "INTERNAL",
    message: publicMessage === raw && raw.length > 0 && raw.length <= 300
      ? publicMessage
      : "No se pudo completar la operacion",
    retryable: false,
    status: 500,
  };
}

/** Prefer explicit server `retryable`; never infer retry from 5xx alone when flag is present. */
export function resolveConductorOfflineRetryable(input: {
  payloadRetryable: unknown;
  httpStatus: number;
}): boolean {
  if (typeof input.payloadRetryable === "boolean") {
    return input.payloadRetryable;
  }
  return input.httpStatus === 408
    || input.httpStatus === 425
    || input.httpStatus === 429
    || input.httpStatus >= 500;
}
