const PERSON_NAME_LOCALE = "es";
export const PERSON_NAME_MAX_LENGTH = 80;

const PERSON_NAME_ALLOWED_CHARACTERS = /[^\p{L}\p{M}\s'’-]/gu;
const VALID_PERSON_NAME =
  /^\p{L}[\p{L}\p{M}]*(?:[ '’-]\p{L}[\p{L}\p{M}]*)*$/u;

/** Keeps the typing position stable while capitalizing each part of a human name. */
export function formatPersonNameInput(value: string) {
  return value
    .toLocaleLowerCase(PERSON_NAME_LOCALE)
    .replace(/(^|[\s'-])(\p{L})/gu, (_match, prefix: string, letter: string) => (
      `${prefix}${letter.toLocaleUpperCase(PERSON_NAME_LOCALE)}`
    ));
}

/** Removes characters that can never be part of a real human name. */
export function sanitizePersonNameInput(value: string) {
  return formatPersonNameInput(
    value.replace(PERSON_NAME_ALLOWED_CHARACTERS, "").slice(0, PERSON_NAME_MAX_LENGTH),
  );
}

/** Canonical format stored for a first name, surname, or complete human name. */
export function normalizePersonName(value: string) {
  return formatPersonNameInput(value.trim().replace(/\s+/g, " "));
}

export function isValidPersonName(value: string) {
  const normalized = normalizePersonName(value);
  return (
    normalized.length > 0 &&
    normalized.length <= PERSON_NAME_MAX_LENGTH &&
    VALID_PERSON_NAME.test(normalized)
  );
}

export function personNameValidationMessage(value: string, label: "nombre" | "apellido") {
  const normalized = normalizePersonName(value);
  if (!normalized) {
    return `Escribe el ${label}`;
  }
  if (normalized.length > PERSON_NAME_MAX_LENGTH) {
    return `El ${label} no puede superar ${PERSON_NAME_MAX_LENGTH} caracteres`;
  }
  if (!VALID_PERSON_NAME.test(normalized)) {
    return `El ${label} solo puede contener letras, espacios, apostrofes y guiones`;
  }
  return "";
}

export function normalizePersonNameSnapshot(
  snapshot: Record<string, unknown> | null | undefined,
) {
  if (!snapshot) {
    return null;
  }

  const normalized = { ...snapshot };
  for (const key of ["firstName", "lastName", "name"] as const) {
    if (typeof normalized[key] === "string") {
      normalized[key] = normalizePersonName(normalized[key]);
    }
  }
  return normalized;
}
