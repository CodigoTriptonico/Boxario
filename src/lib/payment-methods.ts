export const PAYMENT_METHOD_OPTIONS = [
  { value: "cash", label: "Efectivo" },
  { value: "card", label: "Tarjeta" },
  { value: "check", label: "Cheque" },
  { value: "zelle", label: "Zelle" },
  { value: "venmo", label: "Venmo" },
  { value: "paypal", label: "PayPal" },
  { value: "cash_app", label: "Cash App" },
  { value: "bank_transfer", label: "Transferencia" },
  { value: "deposit", label: "Deposito bancario" },
  { value: "other", label: "Otro" },
] as const;

export type PaymentMethod = (typeof PAYMENT_METHOD_OPTIONS)[number]["value"];

export const DEFAULT_PAYMENT_METHOD: PaymentMethod = "cash";

export type PaymentMethodSettings = {
  acceptedPaymentMethods: PaymentMethod[];
  driverPaymentMethods: PaymentMethod[];
  defaultPaymentMethod: PaymentMethod;
  referenceRequiredMethods: PaymentMethod[];
};

export const DEFAULT_PAYMENT_METHOD_SETTINGS: PaymentMethodSettings = {
  acceptedPaymentMethods: PAYMENT_METHOD_OPTIONS.map((option) => option.value),
  driverPaymentMethods: PAYMENT_METHOD_OPTIONS.map((option) => option.value),
  defaultPaymentMethod: DEFAULT_PAYMENT_METHOD,
  referenceRequiredMethods: [],
};

const PAYMENT_METHOD_LABELS = new Map<PaymentMethod, string>(
  PAYMENT_METHOD_OPTIONS.map((option) => [option.value, option.label]),
);

export function isPaymentMethod(value: unknown): value is PaymentMethod {
  return (
    typeof value === "string" &&
    PAYMENT_METHOD_OPTIONS.some((option) => option.value === value)
  );
}

export function paymentMethodLabel(method: PaymentMethod) {
  return PAYMENT_METHOD_LABELS.get(method) || "Otro";
}

function normalizeMethodList(value: unknown, fallback: PaymentMethod[]) {
  if (!Array.isArray(value)) {
    return [...fallback];
  }

  const methods = Array.from(new Set(value.filter(isPaymentMethod)));
  return methods.length ? methods : [...fallback];
}

export function normalizePaymentMethodSettings(
  value: Partial<PaymentMethodSettings> | null | undefined,
): PaymentMethodSettings {
  const acceptedPaymentMethods = normalizeMethodList(
    value?.acceptedPaymentMethods,
    DEFAULT_PAYMENT_METHOD_SETTINGS.acceptedPaymentMethods,
  );
  const driverPaymentMethods = normalizeMethodList(
    value?.driverPaymentMethods,
    acceptedPaymentMethods,
  ).filter((method) => acceptedPaymentMethods.includes(method));
  const defaultPaymentMethod =
    isPaymentMethod(value?.defaultPaymentMethod) &&
    acceptedPaymentMethods.includes(value.defaultPaymentMethod)
      ? value.defaultPaymentMethod
      : acceptedPaymentMethods[0] || DEFAULT_PAYMENT_METHOD;
  const referenceRequiredMethods = normalizeMethodList(
    value?.referenceRequiredMethods,
    [],
  ).filter((method) => acceptedPaymentMethods.includes(method));

  return {
    acceptedPaymentMethods,
    driverPaymentMethods: driverPaymentMethods.length
      ? driverPaymentMethods
      : [defaultPaymentMethod],
    defaultPaymentMethod,
    referenceRequiredMethods,
  };
}

export function paymentMethodOptionsFor(methods: readonly PaymentMethod[]) {
  const allowed = new Set(methods);
  return PAYMENT_METHOD_OPTIONS.filter((option) => allowed.has(option.value));
}
