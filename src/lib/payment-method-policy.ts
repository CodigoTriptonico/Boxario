import type { createScopedSupabase } from "@/lib/supabase/scoped";
import { ActionError } from "@/lib/actions/errors";
import {
  normalizePaymentMethodSettings,
  type PaymentMethod,
  type PaymentMethodSettings,
} from "@/lib/payment-methods";

type ScopedSupabase = NonNullable<Awaited<ReturnType<typeof createScopedSupabase>>>;

export async function loadPaymentMethodSettings(
  supabase: ScopedSupabase,
  organizationId: string,
): Promise<PaymentMethodSettings> {
  const { data, error } = await supabase
    .from("organization_route_settings")
    .select(
      "accepted_payment_methods, driver_payment_methods, default_payment_method, payment_reference_required_methods",
    )
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return normalizePaymentMethodSettings({
    acceptedPaymentMethods: data?.accepted_payment_methods,
    driverPaymentMethods: data?.driver_payment_methods,
    defaultPaymentMethod: data?.default_payment_method,
    referenceRequiredMethods: data?.payment_reference_required_methods,
  });
}

export async function assertPaymentMethodAllowed(input: {
  supabase: ScopedSupabase;
  organizationId: string;
  method: PaymentMethod;
  note?: string | null;
  scope: "office" | "driver";
}) {
  const settings = await loadPaymentMethodSettings(input.supabase, input.organizationId);
  const allowed = input.scope === "driver"
    ? settings.driverPaymentMethods
    : settings.acceptedPaymentMethods;

  if (!allowed.includes(input.method)) {
    throw new ActionError(
      "VALIDATION",
      input.scope === "driver"
        ? "Esta forma de pago no esta habilitada para cobros del conductor"
        : "Esta forma de pago no esta habilitada",
    );
  }

  if (
    settings.referenceRequiredMethods.includes(input.method) &&
    !String(input.note || "").trim()
  ) {
    throw new ActionError("VALIDATION", "Completa la referencia del pago");
  }

  return settings;
}
