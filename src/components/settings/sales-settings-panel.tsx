"use client";

import { Save } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  saveSalesAxisSettingsAction,
  type SalesAxisSettings,
} from "@/app/actions/axis-settings";
import { useSetShellConfig } from "@/components/app-frame";
import { ScheduleSuggestionsEditor } from "@/components/config/schedule-suggestions-editor";
import { primaryButtonClass } from "@/components/ui-blocks";
import { useNotify } from "@/hooks/use-notify";
import { logisticsWeekdayFullLabels } from "@/lib/logistics-day-route";
import { logisticsWeekdayKeys } from "@/lib/logistics-route-catalog";
import { moneyInputDisplayValue, normalizeMoneyInput } from "@/lib/logistics-fees";
import {
  scheduleSuggestionModesForWeekday,
  setSharedScheduleSuggestionModesForWeekday,
  type ScheduleSuggestionModes,
} from "@/lib/sale/schedule-suggestions";

type SettingsTab = "rules" | "schedule";

function generalSettingsEqual(a: SalesAxisSettings, b: SalesAxisSettings) {
  return a.minimumDeposit === b.minimumDeposit && a.pendingAllowed === b.pendingAllowed;
}

export function SalesSettingsPanel({ initialSettings }: { initialSettings: SalesAxisSettings }) {
  const notify = useNotify();
  const setShellConfig = useSetShellConfig();
  const [baseline, setBaseline] = useState(initialSettings);
  const [settings, setSettings] = useState(initialSettings);
  const [settingsTab, setSettingsTab] = useState<SettingsTab>("rules");
  const [scheduleWeekday, setScheduleWeekday] = useState<number | null>(() => {
    const firstEnabledDay = initialSettings.enabledDays?.[0];
    return firstEnabledDay ? logisticsWeekdayKeys.indexOf(firstEnabledDay) : null;
  });
  const [saving, setSaving] = useState(false);
  const hasGeneralChanges = !generalSettingsEqual(settings, baseline);
  const enabledWeekdays = useMemo(
    () =>
      (settings.enabledDays || [])
        .map((day) => logisticsWeekdayKeys.indexOf(day))
        .filter((day) => day >= 0),
    [settings.enabledDays],
  );
  const activeScheduleWeekday =
    scheduleWeekday !== null && enabledWeekdays.includes(scheduleWeekday)
      ? scheduleWeekday
      : enabledWeekdays[0] ?? null;
  const selectedScheduleSuggestions =
    activeScheduleWeekday === null
      ? null
      : scheduleSuggestionModesForWeekday(
          settings.scheduleSuggestions,
          activeScheduleWeekday,
          "delivery",
        );

  useEffect(() => {
    setShellConfig({ contentEdgeToEdge: true });
    return () => setShellConfig({ contentEdgeToEdge: undefined });
  }, [setShellConfig]);

  async function saveGeneral() {
    setSaving(true);
    const result = await saveSalesAxisSettingsAction(settings);
    setSaving(false);

    if (!result.ok) {
      notify.error(result.error);
      return;
    }

    setSettings(result.data);
    setBaseline(result.data);
    notify.success("Configuración de ventas guardada");
  }

  function updateScheduleSuggestions(next: ScheduleSuggestionModes) {
    if (activeScheduleWeekday === null) {
      return;
    }

    setSettings((current) => ({
      ...current,
      scheduleSuggestions: setSharedScheduleSuggestionModesForWeekday(
        current.scheduleSuggestions,
        activeScheduleWeekday,
        next,
      ),
    }));
  }

  return (
    <main className="w-full max-w-none px-0 pb-24">
      <section className="w-full overflow-hidden rounded-xl border border-black bg-surface-shell">
        <div
          role="tablist"
          aria-label="Configuración de ventas"
          className="flex gap-5 border-b border-black/70 px-4 sm:px-5"
        >
          {([
            ["rules", "Reglas"],
            ["schedule", "Sugerencias de horario"],
          ] as const).map(([tab, label]) => {
            const active = settingsTab === tab;

            return (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={active}
                aria-controls={`sales-settings-${tab}`}
                className={`relative min-h-11 px-1 text-sm font-black transition ${
                  active ? "text-[#f8fafc]" : "text-slate-500 hover:text-slate-300"
                }`}
                onClick={() => setSettingsTab(tab)}
              >
                {label}
                {active ? (
                  <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-emerald-400" />
                ) : null}
              </button>
            );
          })}
        </div>

        <div>
          {settingsTab === "rules" ? (
            <section id="sales-settings-rules" role="tabpanel" className="p-4 sm:p-5">
              <div className="grid gap-5 sm:grid-cols-2 sm:divide-x sm:divide-black/70">
                <label className="grid min-w-0 gap-1.5 sm:pr-5">
                  <span className="text-sm font-black text-white">Depósito mínimo</span>
                  <span className="text-xs font-semibold text-slate-400">
                    Monto mínimo para abrir el invoice.
                  </span>
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
                      setSettings((current) => ({ ...current, pendingAllowed: event.target.checked }))
                    }
                    className="mt-0.5 h-5 w-5 shrink-0 accent-emerald-400"
                  />
                </label>
              </div>
            </section>
          ) : (
            <section id="sales-settings-schedule" role="tabpanel" className="p-4 sm:p-5">
              <div className="flex flex-wrap items-center gap-3 border-t border-black/70 pt-4">
                <p className="text-sm font-black text-[#f8fafc]">Día de ruta</p>
                <div
                  role="tablist"
                  aria-label="Día de las sugerencias horarias"
                  className="flex max-w-full flex-wrap gap-1 rounded-lg border border-black bg-surface-inset p-1"
                >
                  {logisticsWeekdayKeys.map((_, day) => {
                    const available = enabledWeekdays.includes(day);
                    const active = available && activeScheduleWeekday === day;

                    return (
                      <button
                        key={day}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        aria-disabled={!available}
                        disabled={!available}
                        className={`min-h-9 rounded-md px-3 text-sm font-black transition ${
                          active
                            ? "bg-emerald-400 text-slate-950"
                            : available
                              ? "text-slate-400 hover:text-slate-200"
                              : "cursor-not-allowed text-slate-700/70"
                        }`}
                        onClick={() => setScheduleWeekday(day)}
                      >
                        {logisticsWeekdayFullLabels[day]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {!enabledWeekdays.length ? (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-bold text-slate-400">
                    Activa un día en el calendario de Rutas para configurar sus sugerencias.
                  </p>
                  <Link
                    href="/logistica?view=rutas"
                    className="text-sm font-black text-emerald-300 hover:text-emerald-200"
                  >
                    Abrir Rutas
                  </Link>
                </div>
              ) : null}

              {activeScheduleWeekday !== null && selectedScheduleSuggestions ? (
                <ScheduleSuggestionsEditor
                  key={activeScheduleWeekday}
                  weekday={activeScheduleWeekday}
                  value={selectedScheduleSuggestions}
                  onChange={updateScheduleSuggestions}
                />
              ) : null}
            </section>
          )}

          {hasGeneralChanges && settingsTab === "rules" ? (
            <div className="flex justify-end border-t border-black/70 px-4 py-3 sm:px-5">
              <button
                type="button"
                className={`${primaryButtonClass} gap-2`}
                onClick={() => void saveGeneral()}
                disabled={saving}
              >
                <Save className="h-4 w-4" />
                {saving ? "Guardando…" : "Guardar cambios"}
              </button>
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
