"use client";

import { Save, Settings2 } from "lucide-react";
import { useState } from "react";
import {
  saveSalesAxisSettingsAction,
  type SalesAxisSettings,
} from "@/app/actions/axis-settings";
import { ScheduleSuggestionsEditor } from "@/components/config/schedule-suggestions-editor";
import { primaryButtonClass } from "@/components/ui-blocks";
import { useNotify } from "@/hooks/use-notify";
import { moneyInputDisplayValue, normalizeMoneyInput } from "@/lib/logistics-fees";

export function SalesSettingsPanel({ initialSettings }: { initialSettings: SalesAxisSettings }) {
  const notify = useNotify();
  const [settings, setSettings] = useState(initialSettings);
  const [saving, setSaving] = useState(false);

  async function saveGeneral() {
    setSaving(true);
    const result = await saveSalesAxisSettingsAction(settings);
    setSaving(false);

    if (!result.ok) {
      notify.error(result.error);
      return;
    }

    setSettings(result.data);
    notify.success("Configuración de ventas guardada");
  }

  return (
    <main className="mx-auto grid w-full max-w-6xl gap-4 p-3 pb-28 sm:p-5">
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-black bg-surface-card p-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-emerald-400/15 text-emerald-300">
            <Settings2 className="h-5 w-5" />
          </span>
          <span className="min-w-0">
            <span className="block text-lg font-black text-white">Configuración de ventas</span>
            <span className="block text-sm font-semibold text-slate-400">
              Lo que el vendedor ofrece al programar una entrega o recolección.
            </span>
          </span>
        </div>
        <button type="button" className={`${primaryButtonClass} gap-2`} onClick={saveGeneral} disabled={saving}>
          <Save className="h-4 w-4" />
          {saving ? "Guardando…" : "Guardar"}
        </button>
      </header>

      <section className="grid gap-3 rounded-xl border border-black bg-surface-card p-4 md:grid-cols-2">
        <label className="grid gap-1.5">
          <span className="text-sm font-black text-white">Depósito mínimo</span>
          <span className="text-xs font-semibold text-slate-400">Monto mínimo para abrir el invoice.</span>
          <span className="flex h-11 items-center rounded-lg border border-black bg-surface-inset px-3">
            <span className="mr-1 text-slate-400">$</span>
            <input
              inputMode="decimal"
              value={moneyInputDisplayValue(settings.minimumDeposit)}
              onChange={(event) =>
                setSettings((current) => ({
                  ...current,
                  minimumDeposit: normalizeMoneyInput(event.target.value),
                }))
              }
              placeholder="0"
              className="min-w-0 flex-1 bg-transparent font-black text-white outline-none"
            />
          </span>
        </label>

        <label className="flex items-center justify-between gap-4 rounded-lg border border-black bg-surface-inset p-3">
          <span>
            <span className="block text-sm font-black text-white">Permitir programación pendiente</span>
            <span className="mt-1 block text-xs font-semibold text-slate-400">
              El vendedor puede dejar día, ruta u hora para definir después.
            </span>
          </span>
          <input
            type="checkbox"
            checked={settings.pendingAllowed}
            onChange={(event) =>
              setSettings((current) => ({ ...current, pendingAllowed: event.target.checked }))
            }
            className="h-5 w-5 accent-emerald-400"
          />
        </label>
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        <ScheduleSuggestionsEditor
          service="delivery"
          value={settings.scheduleSuggestions.delivery}
          onChange={(delivery) =>
            setSettings((current) => ({
              ...current,
              scheduleSuggestions: { ...current.scheduleSuggestions, delivery },
            }))
          }
        />
        <ScheduleSuggestionsEditor
          service="pickup"
          value={settings.scheduleSuggestions.pickup}
          onChange={(pickup) =>
            setSettings((current) => ({
              ...current,
              scheduleSuggestions: { ...current.scheduleSuggestions, pickup },
            }))
          }
        />
      </div>
    </main>
  );
}

