import {
  isValidNationalPhone,
  maxNationalDigitsForDialCode,
  minNationalDigitsForDialCode,
  splitPhoneNumber,
} from "@/lib/phone/countries";
import { normalizePhoneDigits } from "@/lib/phone/normalize";
import {
  createOrgSteps,
  type CreateOrgStep,
} from "@/components/platform/platform-create-org-flow-nav";
import { passwordConfirmationMessage } from "@/lib/auth/password-confirmation";

export const createOrgPageShellClass = "flex w-full min-h-0 flex-1 flex-col space-y-5 pb-8";
export const createOrgPanelContentClass = "p-3 sm:p-4";
export const createOrgStepBodyClass = "w-full p-1 sm:p-2";
export const configBoxClass = "border-l border-emerald-400/35 pl-4";
export const dataColumnClass = "min-w-0 w-full space-y-5";

export const emptyForm = {
  orgName: "",
  adminFirstName: "",
  adminLastName: "",
  adminEmail: "",
  adminPhones: [""],
  adminPassword: "",
  adminPasswordConfirmation: "",
};

export const addContactRowButtonClass =
  "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-emerald-300/30 bg-emerald-400 text-slate-950 shadow-[0_8px_18px_rgba(16,185,129,0.18)] transition hover:bg-emerald-300";
export const removeContactRowButtonClass =
  "flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-rose-400/20 bg-rose-950/45 text-rose-100 transition hover:bg-rose-900/60 disabled:cursor-not-allowed disabled:opacity-35";
export const shareMenuItemClass =
  "flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-black text-[#f8fafc] transition hover:bg-white/5";

export function normalizeContactList(values: string[]) {
  return values.map((value) => value.trim()).filter(Boolean);
}

export function formatContactList(values: string[]) {
  return normalizeContactList(values).join(" · ");
}

export function getAdminFullName(form: typeof emptyForm) {
  return [form.adminFirstName.trim(), form.adminLastName.trim()].filter(Boolean).join(" ");
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function getDataStepValidationMessage(form: typeof emptyForm): string | null {
  if (form.orgName.trim().length < 2) {
    return "Escribe el nombre comercial (mínimo 2 caracteres).";
  }
  if (form.adminFirstName.trim().length < 2) {
    return "Escribe el nombre del dueño.";
  }
  if (form.adminLastName.trim().length < 2) {
    return "Escribe el apellido del dueño.";
  }
  if (!isValidEmail(form.adminEmail)) {
    return "Ingresa un correo válido para el dueño.";
  }

  const phones = normalizeContactList(form.adminPhones);
  if (!phones.length || !isValidNationalPhone(phones[0])) {
    const { dialCode } = splitPhoneNumber(phones[0] || "");
    const min = minNationalDigitsForDialCode(dialCode);
    const max = maxNationalDigitsForDialCode(dialCode);
    const range = min === max ? `${min}` : `${min} a ${max}`;
    return `Ingresa un celular válido (${range} dígitos sin el código de país).`;
  }
  for (let index = 1; index < phones.length; index += 1) {
    if (!isValidNationalPhone(phones[index])) {
      return `El celular adicional ${index + 1} no es válido.`;
    }
  }
  const phoneDigits = phones.map((phone) => normalizePhoneDigits(phone));
  if (new Set(phoneDigits).size !== phoneDigits.length) {
    return "No repitas números de celular del dueño.";
  }
  if (form.adminPassword.trim().length < 8) {
    return "La contraseña debe tener al menos 8 caracteres.";
  }
  return passwordConfirmationMessage(form.adminPassword, form.adminPasswordConfirmation);
}

export function resolveCompletedStep(created: boolean): CreateOrgStep {
  return created ? "done" : "data";
}

export function clampPlanLimit(
  value: string,
  min: number,
  max: number,
  fallback: number,
): number {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.max(min, Math.min(max, Math.trunc(parsed)));
}

export function findCompletedStepIndex(completedStep: CreateOrgStep) {
  return createOrgSteps.findIndex((step) => step.id === completedStep);
}
