"use client";

import { Save } from "lucide-react";
import { useEffect, useState } from "react";
import {
  loadAxisSettingsAction,
  saveSalesAxisSettingsAction,
  type SalesAxisSettings,
} from "@/app/actions/axis-settings";
import { LoadingButton } from "@/components/loading-button";
import { PageLoading } from "@/components/page-loading";
import { primaryButtonClass } from "@/components/ui-blocks";
import { useNotify } from "@/hooks/use-notify";
import { moneyInputDisplayValue, normalizeMoneyInput } from "@/lib/logistics-fees";
import {
  PAYMENT_METHOD_OPTIONS,
  paymentMethodOptionsFor,
  type PaymentMethod,
} from "@/lib/payment-methods";

function depositSettingsEqual(a: SalesAxisSettings, b: SalesAxisSettings) {
  return (
    a.minimumDeposit === b.minimumDeposit &&
    a.pickupIncludedDays === b.pickupIncludedDays &&
    a.latePickupFee === b.latePickupFee &&
    a.pendingAllowed === b.pendingAllowed &&
    a.defaultPaymentMethod === b.defaultPaymentMethod &&
    a.acceptedPaymentMethods.join("|") === b.acceptedPaymentMethods.join("|") &&
    a.driverPaymentMethods.join("|") === b.driverPaymentMethods.join("|") &&
    a.referenceRequiredMethods.join("|") === b.referenceRequiredMethods.join("|")
  );
}

export function CostosDepositPanel() {
  const notify = useNotify();
  const [baseline, setBaseline] = useState<SalesAxisSettings | null>(null);
  const [settings, setSettings] = useState<SalesAxisSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      setLoading(true);
      setLoadError(null);
      const result = await loadAxisSettingsAction();
      if (cancelled) {
        return;
      }

      if (!result.ok) {
        setLoadError(result.error);
        setBaseline(null);
        setSettings(null);
        setLoading(false);
        return;
      }

      setBaseline(result.data.sales);
      setSettings(result.data.sales);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const hasChanges =
    Boolean(baseline && settings) &&
    !depositSettingsEqual(settings as SalesAxisSettings, baseline as SalesAxisSettings);

  async function save() {
    if (!settings) {
      return;
    }

    setSaving(true);
    const result = await saveSalesAxisSettingsAction(settings);
    setSaving(false);

    if (!result.ok) {
      notify.error(result.error);
      return;
    }

    setSettings(result.data);
    setBaseline(result.data);
    notify.success("Configuración de cobros guardada");
  }

  function toggleAccepted(method: PaymentMethod) {
    setSettings((current) => {
      if (!current) return current;
      const enabled = current.acceptedPaymentMethods.includes(method);
      if (enabled && current.acceptedPaymentMethods.length === 1) return current;
      const acceptedPaymentMethods = enabled
        ? current.acceptedPaymentMethods.filter((candidate) => candidate !== method)
        : [...current.acceptedPaymentMethods, method];
      const defaultPaymentMethod = acceptedPaymentMethods.includes(current.defaultPaymentMethod)
        ? current.defaultPaymentMethod
        : acceptedPaymentMethods[0] || current.defaultPaymentMethod;

      return {
        ...current,
        acceptedPaymentMethods,
        defaultPaymentMethod,
        driverPaymentMethods: current.driverPaymentMethods.filter((candidate) =>
          acceptedPaymentMethods.includes(candidate),
        ),
        referenceRequiredMethods: current.referenceRequiredMethods.filter((candidate) =>
          acceptedPaymentMethods.includes(candidate),
        ),
      };
    });
  }

  function toggleMethodList(
    field: "driverPaymentMethods" | "referenceRequiredMethods",
    method: PaymentMethod,
  ) {
    setSettings((current) => {
      if (!current || !current.acceptedPaymentMethods.includes(method)) return current;
      const enabled = current[field].includes(method);
      if (field === "driverPaymentMethods" && enabled && current[field].length === 1) {
        return current;
      }
      return {
        ...current,
        [field]: enabled
          ? current[field].filter((candidate) => candidate !== method)
          : [...current[field], method],
      };
    });
  }

  if (loading) {
    return <PageLoading inline />;
  }

  if (loadError || !settings) {
    return (
      <p className="rounded-lg border border-amber-700 bg-amber-950/40 px-3 py-2 text-sm font-bold text-amber-200">
        {loadError || "No se pudo cargar el depósito mínimo."}
      </p>
    );
  }

  return (
    <div className="grid gap-5">
      <div className="grid gap-5 sm:grid-cols-2 sm:divide-x sm:divide-black/70">
        <label className="grid min-w-0 gap-1.5 sm:pr-5">
          <span className="text-sm font-black text-white">Depósito por caja</span>
          <span className="text-xs font-semibold text-slate-400">
            Se multiplica por la cantidad de cajas de la venta.
          </span>
          <span className="flex h-11 items-center rounded-lg border border-black bg-surface-inset px-3">
            <span className="mr-1 text-slate-400">$</span>
            <input
              inputMode="decimal"
              value={moneyInputDisplayValue(settings.minimumDeposit)}
              onChange={(event) =>
                setSettings((current) =>
                  current
                    ? {
                        ...current,
                        minimumDeposit: normalizeMoneyInput(event.target.value),
                      }
                    : current,
                )
              }
              placeholder="0"
              className="min-w-0 flex-1 bg-transparent font-black text-white outline-none"
            />
          </span>
        </label>

        <label className="flex min-w-0 items-start justify-between gap-4 sm:pl-5">
          <span>
            <span className="block text-sm font-black text-white">
              Permitir programación pendiente
            </span>
            <span className="mt-1 block text-xs font-semibold text-slate-400">
              El vendedor puede dejar día, ruta u hora para definir después.
            </span>
          </span>
          <input
            type="checkbox"
            checked={settings.pendingAllowed}
            onChange={(event) =>
              setSettings((current) =>
                current ? { ...current, pendingAllowed: event.target.checked } : current,
              )
            }
            className="mt-0.5 h-5 w-5 shrink-0 accent-emerald-400"
          />
        </label>
      </div>

      <div className="grid gap-5 border-t border-black/70 pt-5 sm:grid-cols-2 sm:divide-x sm:divide-black/70">
        <label className="grid min-w-0 gap-1.5 sm:pr-5">
          <span className="text-sm font-black text-white">Recolección incluida</span>
          <span className="text-xs font-semibold text-slate-400">
            Días desde que el cliente recibe la caja vacía para pedir que la recojamos sin costo extra.
          </span>
          <span className="flex h-11 items-center rounded-lg border border-black bg-surface-inset px-3">
            <input
              type="number"
              min="1"
              max="3650"
              step="1"
              value={settings.pickupIncludedDays}
              onChange={(event) =>
                setSettings((current) =>
                  current
                    ? { ...current, pickupIncludedDays: Number(event.target.value) }
                    : current,
                )
              }
              className="min-w-0 flex-1 bg-transparent font-black text-white outline-none"
            />
            <span className="ml-2 text-sm font-bold text-slate-400">días</span>
          </span>
        </label>

        <label className="grid min-w-0 gap-1.5 sm:pl-5">
          <span className="text-sm font-black text-white">Cargo fuera de plazo</span>
          <span className="text-xs font-semibold text-slate-400">
            Se agrega una sola vez cuando se solicita la recolección después del plazo.
          </span>
          <span className="flex h-11 items-center rounded-lg border border-black bg-surface-inset px-3">
            <span className="mr-1 text-slate-400">$</span>
            <input
              inputMode="decimal"
              value={moneyInputDisplayValue(settings.latePickupFee)}
              onChange={(event) =>
                setSettings((current) =>
                  current
                    ? { ...current, latePickupFee: normalizeMoneyInput(event.target.value) }
                    : current,
                )
              }
              placeholder="0"
              className="min-w-0 flex-1 bg-transparent font-black text-white outline-none"
            />
          </span>
        </label>
      </div>

      <div className="grid gap-5 border-t border-black/70 pt-5 lg:grid-cols-3 lg:divide-x lg:divide-black/70">
        <fieldset className="min-w-0">
          <legend className="text-sm font-black text-white">Formas aceptadas</legend>
          <p className="mt-1 text-xs font-semibold text-slate-400">
            Solo estas opciones aparecen al registrar un cobro.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
            {PAYMENT_METHOD_OPTIONS.map((option) => {
              const checked = settings.acceptedPaymentMethods.includes(option.value);
              return (
                <label key={option.value} className="flex items-center gap-2 text-sm font-bold text-slate-200">
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={checked && settings.acceptedPaymentMethods.length === 1}
                    onChange={() => toggleAccepted(option.value)}
                    className="h-4 w-4 accent-emerald-400"
                  />
                  {option.label}
                </label>
              );
            })}
          </div>
        </fieldset>

        <fieldset className="min-w-0 lg:pl-5">
          <legend className="text-sm font-black text-white">Cobros del conductor</legend>
          <p className="mt-1 text-xs font-semibold text-slate-400">
            Subconjunto permitido durante una ruta.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
            {paymentMethodOptionsFor(settings.acceptedPaymentMethods).map((option) => (
              <label key={option.value} className="flex items-center gap-2 text-sm font-bold text-slate-200">
                <input
                  type="checkbox"
                  checked={settings.driverPaymentMethods.includes(option.value)}
                  disabled={settings.driverPaymentMethods.includes(option.value) && settings.driverPaymentMethods.length === 1}
                  onChange={() => toggleMethodList("driverPaymentMethods", option.value)}
                  className="h-4 w-4 accent-emerald-400"
                />
                {option.label}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="min-w-0 lg:pl-5">
          <legend className="text-sm font-black text-white">Comprobantes</legend>
          <p className="mt-1 text-xs font-semibold text-slate-400">
            Marca los métodos que deben incluir número de operación, cheque o últimos cuatro dígitos.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
            {paymentMethodOptionsFor(settings.acceptedPaymentMethods).map((option) => (
              <label key={option.value} className="flex items-center gap-2 text-sm font-bold text-slate-200">
                <input
                  type="checkbox"
                  checked={settings.referenceRequiredMethods.includes(option.value)}
                  onChange={() => toggleMethodList("referenceRequiredMethods", option.value)}
                  className="h-4 w-4 accent-emerald-400"
                />
                {option.label}
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      <div className="border-t border-black/70 pt-5">
        <label className="grid max-w-md gap-1.5">
          <span className="text-sm font-black text-white">Forma predeterminada</span>
          <span className="text-xs font-semibold text-slate-400">
            Aparece seleccionada al iniciar un cobro en Ventas o Seguimiento.
          </span>
          <select
            value={settings.defaultPaymentMethod}
            onChange={(event) =>
              setSettings((current) =>
                current
                  ? { ...current, defaultPaymentMethod: event.target.value as PaymentMethod }
                  : current,
              )
            }
            className="h-11 rounded-lg border border-black bg-surface-inset px-3 text-sm font-black text-white"
          >
            {paymentMethodOptionsFor(settings.acceptedPaymentMethods).map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
      </div>

      {hasChanges ? (
        <div className="flex justify-end border-t border-black/70 pt-3">
          <LoadingButton
            loading={saving}
            loadingLabel={
              <>
                <Save className="h-4 w-4" />
                Guardando…
              </>
            }
            onClick={() => void save()}
            className={`${primaryButtonClass} gap-2`}
          >
            <Save className="h-4 w-4" />
            Guardar cambios
          </LoadingButton>
        </div>
      ) : null}
    </div>
  );
}
