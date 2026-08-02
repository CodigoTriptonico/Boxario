"use client";

import { Check, EyeOff, Plus, X } from "lucide-react";
import { useRef, useState } from "react";
import {
  saveScheduleSuggestionsAction,
  setScheduleSuggestionModeEnabledAction,
} from "@/app/actions/schedule-suggestions";
import { TimePickerInput } from "@/components/time-picker-input";
import { useNotify } from "@/hooks/use-notify";
import { logisticsWeekdayFullLabels } from "@/lib/logistics-day-route";
import { formatTime12Hour } from "@/lib/sale/schedule-time";
import {
  scheduleSuggestionModeEnabled,
  type ScheduleSuggestionModeKey,
  type ScheduleSuggestionModes,
} from "@/lib/sale/schedule-suggestions";

const modes = [
  { key: "exact", label: "Exacta", text: "Horas puntuales para ofrecer como atajo." },
  { key: "until", label: "Antes de", text: "Límites para completar la operación." },
  { key: "from", label: "A partir", text: "Inicios disponibles desde esa hora." },
  { key: "range", label: "Entre", text: "Ventanas sugeridas entre dos horas." },
] as const;

type SingleModeKey = Exclude<ScheduleSuggestionModeKey, "range">;
type EditingTime = { mode: SingleModeKey; original: string } | null;

export function ScheduleSuggestionsEditor({
  weekday,
  value,
  onChange,
}: {
  weekday: number;
  value: ScheduleSuggestionModes;
  onChange: (value: ScheduleSuggestionModes) => void;
}) {
  const notify = useNotify();
  const persistenceQueue = useRef(Promise.resolve());
  const [activeMode, setActiveMode] = useState<ScheduleSuggestionModeKey>("exact");
  const [newTimes, setNewTimes] = useState<Record<SingleModeKey, string>>({
    exact: "",
    until: "",
    from: "",
  });
  const [newRange, setNewRange] = useState({ start: "", end: "" });
  const [editingTime, setEditingTime] = useState<EditingTime>(null);
  const [editingRange, setEditingRange] = useState<string | null>(null);
  const enabledModeKeys = modes
    .filter((mode) => scheduleSuggestionModeEnabled(value, mode.key))
    .map((mode) => mode.key);
  const selectedMode = enabledModeKeys.includes(activeMode)
    ? activeMode
    : enabledModeKeys[0] || null;
  const selectedModeDetails = modes.find((mode) => mode.key === selectedMode);

  async function persist(next: ScheduleSuggestionModes) {
    const nextWrite = persistenceQueue.current
      .then(async () => {
        const result = await saveScheduleSuggestionsAction({
          service: "shared",
          weekday,
          suggestions: next,
        });
        if (!result.ok) {
          notify.error(result.error);
          return;
        }

        notify.success(
          `Sugerencias de ${logisticsWeekdayFullLabels[weekday] || "ese día"} actualizadas`,
        );
      })
      .catch(() => undefined);

    persistenceQueue.current = nextWrite;
    await nextWrite;
  }

  function updateMode(mode: SingleModeKey, nextTimes: string[]) {
    const next = { ...value, [mode]: nextTimes };
    onChange(next);
    void persist(next);
  }

  function addTime(mode: SingleModeKey) {
    const time = newTimes[mode];
    if (!time) {
      return;
    }

    if (editingTime?.mode === mode) {
      const nextTimes = value[mode].filter((item) => item !== editingTime.original);
      if (nextTimes.includes(time)) {
        return;
      }
      updateMode(mode, [...nextTimes, time].sort());
    } else {
      if (value[mode].includes(time)) {
        return;
      }
      updateMode(mode, [...value[mode], time].sort());
    }

    setEditingTime(null);
    setNewTimes((current) => ({ ...current, [mode]: "" }));
  }

  function startEditTime(mode: SingleModeKey, time: string) {
    setEditingTime({ mode, original: time });
    setNewTimes((current) => ({ ...current, [mode]: time }));
  }

  function updateRanges(nextRanges: string[]) {
    const next = { ...value, ranges: nextRanges };
    onChange(next);
    void persist(next);
  }

  function addRange() {
    if (!newRange.start || !newRange.end) {
      return;
    }

    const range = [newRange.start, newRange.end].sort().join("-");
    const ranges = value.ranges || [];
    if (editingRange) {
      const nextRanges = ranges.filter((item) => item !== editingRange);
      if (nextRanges.includes(range)) {
        return;
      }
      updateRanges([...nextRanges, range].sort());
    } else {
      if (ranges.includes(range)) {
        return;
      }
      updateRanges([...ranges, range].sort());
    }

    setEditingRange(null);
    setNewRange({ start: "", end: "" });
  }

  function startEditRange(range: string) {
    const [start, end] = range.split("-");
    setEditingRange(range);
    setNewRange({ start, end });
  }

  async function setModeEnabled(mode: ScheduleSuggestionModeKey, enabled: boolean) {
    const next = {
      ...value,
      enabledModes: {
        exact: value.enabledModes?.exact !== false,
        until: value.enabledModes?.until !== false,
        from: value.enabledModes?.from !== false,
        range: value.enabledModes?.range !== false,
        [mode]: enabled,
      },
    };
    onChange(next);

    const result = await setScheduleSuggestionModeEnabledAction({
      service: "shared",
      weekday,
      mode,
      enabled,
    });
    if (!result.ok) {
      onChange(value);
      notify.error(result.error);
      return;
    }

    const modeLabel = modes.find((item) => item.key === mode)?.label || "horaria";
    notify.success(
      `Opción ${modeLabel} ${enabled ? "activada" : "desactivada"} para ${logisticsWeekdayFullLabels[weekday] || "ese día"}`,
    );
  }

  return (
    <div className="mt-4 border-t border-black/70 pt-4">
      <div className="flex flex-wrap gap-1 rounded-lg border border-black bg-surface-inset p-1">
        {modes.map((mode) => {
          const enabled = scheduleSuggestionModeEnabled(value, mode.key);
          const selected = enabled && selectedMode === mode.key;

          return (
            <div
              key={mode.key}
              className={`inline-flex min-h-9 rounded-md transition ${
                selected ? "bg-emerald-400 text-slate-950" : "text-slate-400"
              }`}
            >
              <button
                type="button"
                onClick={() => {
                  if (enabled) {
                    setActiveMode(mode.key);
                  } else {
                    setActiveMode(mode.key);
                    void setModeEnabled(mode.key, true);
                  }
                }}
                className={`px-3 text-sm font-black transition ${
                  enabled ? "hover:text-slate-200" : "text-slate-500 hover:text-emerald-300"
                }`}
                aria-pressed={selected}
              >
                {enabled ? mode.label : `+ ${mode.label}`}
              </button>
            </div>
          );
        })}
      </div>

      {selectedMode && selectedModeDetails ? (
        <div className="mt-4 grid gap-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-sm font-black text-[#f8fafc]">{selectedModeDetails.label}</p>
              <p className="mt-0.5 text-[11px] font-bold leading-snug text-slate-500">
                {selectedModeDetails.text}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void setModeEnabled(selectedMode, false)}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-black text-slate-500 transition hover:text-amber-300"
              aria-label="Desactivar modalidad"
              title="Desactivar modalidad"
            >
              <EyeOff className="h-4 w-4" />
            </button>
          </div>

          {selectedMode === "range" ? (
            <>
              <div className="flex flex-wrap content-start gap-1.5">
                {(value.ranges || []).map((range) => {
                  const [start, end] = range.split("-");
                  return (
                    <div
                      key={range}
                      className="inline-flex h-8 items-center rounded-md border border-black bg-surface-card text-xs font-black text-slate-200"
                    >
                      <button
                        type="button"
                        onClick={() => startEditRange(range)}
                        className="h-full px-2 text-left transition hover:text-emerald-300"
                        title={`Editar entre ${formatTime12Hour(start)} y ${formatTime12Hour(end)}`}
                      >
                        {formatTime12Hour(start)} – {formatTime12Hour(end)}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (editingRange === range) {
                            setEditingRange(null);
                            setNewRange({ start: "", end: "" });
                          }
                          updateRanges((value.ranges || []).filter((item) => item !== range));
                        }}
                        className="inline-flex h-full w-7 items-center justify-center text-slate-500 transition hover:text-rose-300"
                        aria-label={`Quitar entre ${formatTime12Hour(start)} y ${formatTime12Hour(end)}`}
                        title={`Quitar entre ${formatTime12Hour(start)} y ${formatTime12Hour(end)}`}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
              <div className="grid max-w-xl gap-2 sm:grid-cols-[minmax(0,14rem)_minmax(0,14rem)_2.25rem]">
                <TimePickerInput
                  value={newRange.start}
                  ariaLabel="Inicio del nuevo rango Entre para entrega y recolección"
                  shellClassName="!h-9 min-w-0"
                  onChange={(time) => setNewRange((current) => ({ ...current, start: time }))}
                />
                <TimePickerInput
                  value={newRange.end}
                  ariaLabel="Fin del nuevo rango Entre para entrega y recolección"
                  shellClassName="!h-9 min-w-0"
                  onChange={(time) => setNewRange((current) => ({ ...current, end: time }))}
                />
                <button
                  type="button"
                  onClick={addRange}
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-400 text-slate-950 disabled:opacity-40"
                  disabled={
                    !newRange.start ||
                    !newRange.end ||
                    (!editingRange && (value.ranges || []).length >= 12)
                  }
                  aria-label={editingRange ? "Guardar rango Entre" : "Agregar rango Entre"}
                  title={editingRange ? "Guardar rango Entre" : "Agregar rango Entre"}
                >
                  {editingRange ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="flex flex-wrap content-start gap-1.5">
                {value[selectedMode].map((time) => (
                  <div
                    key={time}
                    className="inline-flex h-8 items-center rounded-md border border-black bg-surface-card text-xs font-black text-slate-200"
                  >
                    <button
                      type="button"
                      onClick={() => startEditTime(selectedMode, time)}
                      className="h-full px-2 text-left transition hover:text-emerald-300"
                      title={`Editar ${formatTime12Hour(time)}`}
                    >
                      {formatTime12Hour(time)}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (editingTime?.mode === selectedMode && editingTime.original === time) {
                          setEditingTime(null);
                          setNewTimes((current) => ({ ...current, [selectedMode]: "" }));
                        }
                        updateMode(selectedMode, value[selectedMode].filter((item) => item !== time));
                      }}
                      className="inline-flex h-full w-7 items-center justify-center text-slate-500 transition hover:text-rose-300"
                      aria-label={`Quitar ${formatTime12Hour(time)}`}
                      title={`Quitar ${formatTime12Hour(time)}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="grid max-w-md grid-cols-[minmax(0,1fr)_2.25rem] gap-1.5">
                <TimePickerInput
                  value={newTimes[selectedMode]}
                  ariaLabel={`Nueva sugerencia ${selectedModeDetails.label.toLowerCase()} para entrega y recolección`}
                  shellClassName="!h-9 min-w-0"
                  onChange={(time) => setNewTimes((current) => ({ ...current, [selectedMode]: time }))}
                />
                <button
                  type="button"
                  onClick={() => addTime(selectedMode)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-400 text-slate-950 disabled:opacity-40"
                  disabled={
                    !newTimes[selectedMode] ||
                    (!editingTime && value[selectedMode].length >= 12)
                  }
                  aria-label={
                    editingTime?.mode === selectedMode
                      ? "Guardar cambio de hora"
                      : `Agregar sugerencia ${selectedModeDetails.label.toLowerCase()}`
                  }
                  title={editingTime?.mode === selectedMode ? "Guardar cambio" : "Agregar sugerencia"}
                >
                  {editingTime?.mode === selectedMode ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      ) : (
        <p className="mt-4 text-sm font-bold text-slate-500">
          Activa una modalidad para configurar sus sugerencias.
        </p>
      )}
    </div>
  );
}
