import {
  insetShellClass,
  selectionActiveClass,
  selectionShellClass,
} from "@/components/ui-blocks";
import { CountryFlag } from "@/components/country-flag";
import type { AddressValidation } from "@/lib/sale-address-validation";
import type {
  AddressSuggestion,
  Sender,
} from "@/components/sale/venta/parts-types";

const selectedBorderClass = `${selectionShellClass} ${selectionActiveClass}`;

export type AddressSuggestResponse = {
  ok?: boolean;
  error?: string;
  suggestions?: AddressSuggestion[];
};

export function applyAddressSuggestResult(
  data: AddressSuggestResponse,
  responseOk: boolean,
  setSuggestions: (suggestions: AddressSuggestion[]) => void,
  setValidation: (validation: AddressValidation) => void,
) {
  if (!responseOk || data.ok === false) {
    setSuggestions([]);
    if (data.error?.includes("GOOGLE_MAPS_API_KEY")) {
      setValidation({
        status: "invalid",
        message: "Configura GOOGLE_MAPS_API_KEY en .env.local y reinicia el servidor",
      });
    } else if (data.error) {
      setValidation({ status: "invalid", message: data.error });
    }
    return;
  }

  const suggestions = data.suggestions || [];
  setSuggestions(suggestions);

  if (!suggestions.length) {
    setValidation({
      status: "idle",
      message: "Google no encontro coincidencias. Revisa la direccion o usala sin verificar.",
    });
  }
}

const clientFormControlShellClass =
  "rounded-lg border border-slate-700/80 bg-surface-inset shadow-sm";

const clientFormInputPendingShellClass =
  "rounded-lg border border-rose-500/70 bg-rose-950/20 shadow-sm";

export const clientFormInputClass =
  `client-form-field h-11 w-full px-3.5 text-[15px] font-black text-[#f8fafc] outline-none transition placeholder:font-bold placeholder:text-slate-500 focus:border-sky-300 focus:ring-4 focus:ring-sky-300/30 ${clientFormControlShellClass}`;

export function clientFormAddressFieldClass(
  value: string,
  options?: { required?: boolean; enabled?: boolean; },
) {
  const enabled = options?.enabled ?? true;
  const isPending = enabled && !value.trim();
  const shell = isPending ? clientFormInputPendingShellClass : clientFormControlShellClass;
  const focus = isPending
    ? "focus:border-rose-400 focus:ring-4 focus:ring-rose-400/25"
    : "focus:border-sky-300 focus:ring-4 focus:ring-sky-300/30";

  return `client-form-field h-11 w-full px-3.5 text-[15px] font-black text-[#f8fafc] outline-none transition placeholder:font-bold placeholder:text-slate-500 ${focus} ${shell}`;
}

export function clientFormAddressLabelClass(
  value: string,
  options?: { required?: boolean; enabled?: boolean; },
) {
  const enabled = options?.enabled ?? true;

  if (enabled && !value.trim()) {
    return "text-[11px] font-black uppercase tracking-[0.08em] text-rose-400";
  }

  return clientFormLabelClass;
}

export const clientFormPickerShellClass =
  `${insetShellClass} box-border inline-flex h-11 w-full min-w-0 items-center gap-2 px-3 text-sm font-black text-[#f8fafc] ${clientFormControlShellClass}`;
export const clientFormLabelClass =
  "text-[11px] font-black uppercase tracking-wide text-slate-400";
export const noBrowserAutocomplete = {
  autoComplete: "off",
  autoCorrect: "off",
  autoCapitalize: "off",
  spellCheck: false,
  "data-1p-ignore": true,
  "data-lpignore": "true",
  "data-form-type": "other",
} as const;

function cleanPhone(phone: string) {
  return phone.replace(/\D/g, "");
}

function senderPrimaryPhone(sender: Pick<Sender, "phones">) {
  return sender.phones[0]?.trim() || "";
}

export function senderPhoneKey(sender: Pick<Sender, "phones">) {
  return cleanPhone(senderPrimaryPhone(sender));
}

export function senderPhonesLabel(sender: Pick<Sender, "phones">) {
  return sender.phones.filter(Boolean).join(" · ");
}

export function senderHasPhone(sender: Pick<Sender, "phones">, phone: string) {
  const target = cleanPhone(phone);
  if (!target) {
    return false;
  }

  return sender.phones.some((entry) => cleanPhone(entry) === target);
}

export function normalizePhoneList(phones: string[]) {
  return phones.map((phone) => phone.trim()).filter(Boolean);
}

export function Flag({ country }: { country: string; }) {
  return <CountryFlag name={country} size="sm" />;
}

export const contextActiveClass = selectedBorderClass;
export const selectedCardClass = selectedBorderClass;
export const salePersonRowSelectedClass = "bg-emerald-400/10 hover:bg-emerald-400/15";
export const salePersonRowContextActiveClass = "bg-emerald-400/20 hover:bg-emerald-400/25";
export const boxCardClass =
  "w-full border border-black bg-surface-card shadow-[0_6px_20px_rgba(0,0,0,0.22)] transition-colors hover:bg-surface-card-hover";
