export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

/** Taxonomía estable de fallos de action (Fase 3). Usar en throws nuevos; mapear a mensaje seguro. */
export type ActionErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "VALIDATION"
  | "NOT_FOUND"
  | "CONFLICT"
  | "CONCURRENCY"
  | "IDEMPOTENCY"
  | "INSUFFICIENT_STOCK"
  | "INVALID_PAYMENT"
  | "EXTERNAL"
  | "INTERNAL";

export class ActionError extends Error {
  readonly code: ActionErrorCode;

  constructor(code: ActionErrorCode, message: string) {
    super(message);
    this.name = "ActionError";
    this.code = code;
  }
}

export function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

const INTERNAL_ERROR_PATTERN =
  /\b(postgres|sqlstate|pgrst|relation|column|constraint|duplicate key|violates|invalid input syntax|syntax error|permission denied for|schema|function public\.|rpc)\b/i;

export function publicActionErrorMessage(error: string) {
  const message = String(error || "").trim();
  if (!message || message.length > 300 || INTERNAL_ERROR_PATTERN.test(message)) {
    return "No se pudo completar la operacion";
  }
  return message;
}

export function fail<T>(error: string): ActionResult<T> {
  return { ok: false, error: publicActionErrorMessage(error) };
}

const CODE_USER_MESSAGE: Partial<Record<ActionErrorCode, string>> = {
  UNAUTHORIZED: "Sesion requerida",
  FORBIDDEN: "No tienes permiso para esta accion",
  INSUFFICIENT_STOCK: "Stock insuficiente",
  INVALID_PAYMENT: "Pago no valido",
  CONCURRENCY: "Otro cambio ocurrio primero; vuelve a intentar",
  IDEMPOTENCY: "La operacion ya fue procesada",
  NOT_FOUND: "No se encontro el recurso",
  CONFLICT: "El estado actual no permite esta operacion",
};

export function actionErrorMessage(error: unknown) {
  if (error instanceof ActionError) {
    return CODE_USER_MESSAGE[error.code] || publicActionErrorMessage(error.message);
  }

  if (error instanceof Error) {
    if (error.message === "UNAUTHORIZED") {
      return "Sesion requerida";
    }
    if (error.message === "FORBIDDEN") {
      return "No tienes permiso para esta accion";
    }
    return publicActionErrorMessage(error.message);
  }

  return "Error inesperado";
}
