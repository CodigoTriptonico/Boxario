"use client";

import { DollarSign, Save } from "lucide-react";
import { useState } from "react";
import {
  saveLogisticsAxisSettingsAction,
  type LogisticsAxisSettings,
} from "@/app/actions/axis-settings";
import { primaryButtonClass } from "@/components/ui-blocks";
import { useNotify } from "@/hooks/use-notify";
import { moneyInputDisplayValue, normalizeMoneyInput } from "@/lib/logistics-fees";

function settingsEqual(a: LogisticsAxisSettings, b: LogisticsAxisSettings) {
  return (
    a.emptyBoxDeliveryFee === b.emptyBoxDeliveryFee &&
    a.fullBoxPickupFee === b.fullBoxPickupFee &&
    a.routeLeadTime === b.routeLeadTime
  );
}

export function LogisticsSettingsPanel({
  initialSettings,
}: {
  initialSettings: LogisticsAxisSettings;
}) {
  const notify = useNotify();
  const [baseline, setBaseline] = useState(initialSettings);
  const [settings, setSettings] = useState(initialSettings);
  const [saving, setSaving] = useState(false);
  const hasChanges = !settingsEqual(settings, baseline);

  async function save() {
    setSaving(true);
    const result = await saveLogisticsAxisSettingsAction(settings);
    setSaving(false);
    if (!result.ok) {
      notify.error(result.error);
      return;
    }
    setSettings(result.data);
    setBaseline(result.data);
    notify.success("Configuración de logística guardada");
  }

  return (
    <main className="grid gap-4 pb-24">
      <section className="grid gap-4 rounded-xl border border-black bg-surface-card p-4 md:grid-cols-3">
        <div className="md:col-span-3">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-amber-300" />
            <h2 className="text-lg font-black text-white">
              Sugerencias de cargos adicionales
            </h2>
          </div>
          <p className="mt-1 text-xs font-semibold text-slate-400">
            Son opcionales: Ventas decide si aplicarlas. El servicio normal sigue incluido. Los días
            y horarios se administran en Rutas.
          </p>
        </div>
        {[
          ["Entrega con conductor", "emptyBoxDeliveryFee"] as const,
          ["Recolección con conductor", "fullBoxPickupFee"] as const,
        ].map(([label, key]) => (
          <label key={key} className="grid gap-1.5">
            <span className="text-sm font-black text-white">{label}</span>
            <span className="flex h-11 items-center rounded-lg border border-black bg-surface-inset px-3">
              <span className="mr-1 text-slate-400">$</span>
              <input
                inputMode="decimal"
                value={moneyInputDisplayValue(settings[key])}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    [key]: normalizeMoneyInput(event.target.value),
                  }))
                }
                placeholder="0"
                className="min-w-0 flex-1 bg-transparent font-black text-white outline-none"
              />
            </span>
          </label>
        ))}
        <label className="grid gap-1.5">
          <span className="text-sm font-black text-white">Anticipación mínima</span>
          <input
            value={settings.routeLeadTime}
            onChange={(event) =>
              setSettings((current) => ({
                ...current,
                routeLeadTime: event.target.value,
              }))
            }
            placeholder="Ej. 2 horas"
            className="h-11 rounded-lg border border-black bg-surface-inset px-3 font-bold text-white outline-none"
          />
        </label>
      </section>

      {hasChanges ? (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-black bg-surface-card/95 p-3 backdrop-blur">
          <div className="mx-auto flex max-w-6xl justify-end">
            <button
              type="button"
              className={`${primaryButtonClass} gap-2`}
              onClick={() => void save()}
              disabled={saving}
            >
              <Save className="h-4 w-4" />
              {saving ? "Guardando…" : "Guardar cambios"}
            </button>
          </div>
        </div>
      ) : null}
    </main>
  );
}
