"use client";

import { Plus, X } from "lucide-react";
import { useState } from "react";
import { saveScheduleSuggestionsAction } from "@/app/actions/schedule-suggestions";
import { TimePickerInput } from "@/components/time-picker-input";
import { useNotify } from "@/hooks/use-notify";
import { formatTime12Hour } from "@/lib/sale/schedule-time";
import type { ScheduleSuggestionModes } from "@/lib/sale/schedule-suggestions";

const modes = [
  { key: "exact", label: "Exacta", text: "Horas puntuales que Ventas ofrecerá como atajo." },
  { key: "until", label: "Antes de", text: "Límites para entregas que deben ocurrir antes." },
  { key: "from", label: "A partir", text: "Inicios para entregas disponibles desde esa hora." },
] as const;

export function ScheduleSuggestionsEditor({
  service,
  value,
  onChange,
}: {
  service: "delivery" | "pickup";
  value: ScheduleSuggestionModes;
  onChange: (value: ScheduleSuggestionModes) => void;
}) {
  const notify = useNotify();
  const [newTimes, setNewTimes] = useState<Record<keyof ScheduleSuggestionModes, string>>({
    exact: "",
    until: "",
    from: "",
  });

  async function persist(next: ScheduleSuggestionModes) {
    const result = await saveScheduleSuggestionsAction({ service, suggestions: next });
    if (!result.ok) {
      notify.error(result.error);
      return;
    }

    notify.success("Sugerencias horarias actualizadas");
  }

  function updateMode(mode: keyof ScheduleSuggestionModes, nextTimes: string[]) {
    const next = { ...value, [mode]: nextTimes };
    onChange(next);
    void persist(next);
  }

  function addTime(mode: keyof ScheduleSuggestionModes) {
    const time = newTimes[mode];
    if (!time || value[mode].includes(time)) {
      return;
    }

    updateMode(mode, [...value[mode], time].sort());
    setNewTimes((current) => ({ ...current, [mode]: "" }));
  }

  return (
    <section className="rounded-xl border border-black bg-surface-card p-4 xl:col-span-2">
      <div className="mb-4 flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-surface-panel text-slate-400">
          <Plus className="h-5 w-5" />
        </span>
        <span className="min-w-0">
          <span className="block text-xl font-black">Atajos de horario para Ventas</span>
          <span className="mt-1 block text-sm font-bold text-slate-300">
            {service === "delivery" ? "Entrega" : "Recolección"}: administra las sugerencias de Exacta, Antes de y A partir. Los rangos de Entre se administran en la sección Rangos disponibles.
          </span>
        </span>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {modes.map((mode) => (
          <div key={mode.key} className="grid min-w-0 gap-2 rounded-lg border border-black bg-surface-inset p-3">
            <div>
              <p className="text-sm font-black text-[#f8fafc]">{mode.label}</p>
              <p className="mt-0.5 text-[11px] font-bold leading-snug text-slate-500">{mode.text}</p>
            </div>
            <div className="flex min-h-10 flex-wrap content-start gap-1.5">
              {value[mode.key].map((time) => (
                <button
                  key={time}
                  type="button"
                  onClick={() => updateMode(mode.key, value[mode.key].filter((item) => item !== time))}
                  className="group inline-flex h-8 items-center gap-1 rounded-md border border-black bg-surface-card px-2 text-xs font-black text-slate-200"
                  title={`Quitar ${formatTime12Hour(time)}`}
                >
                  {formatTime12Hour(time)}
                  <X className="h-3.5 w-3.5 opacity-60 group-hover:opacity-100" />
                </button>
              ))}
            </div>
            <div className="grid grid-cols-[minmax(0,1fr)_2.25rem] gap-1.5">
              <TimePickerInput
                value={newTimes[mode.key]}
                ariaLabel={`Nueva sugerencia ${mode.label.toLowerCase()} para ${service === "delivery" ? "entrega" : "recolección"}`}
                shellClassName="!h-9 min-w-0"
                onChange={(time) => setNewTimes((current) => ({ ...current, [mode.key]: time }))}
              />
              <button
                type="button"
                onClick={() => addTime(mode.key)}
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-400 text-slate-950 disabled:opacity-40"
                disabled={!newTimes[mode.key] || value[mode.key].length >= 12}
                aria-label={`Agregar sugerencia ${mode.label.toLowerCase()}`}
                title="Agregar sugerencia"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
