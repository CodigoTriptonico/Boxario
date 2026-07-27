"use client";

import { useState } from "react";
import { TimePickerInput } from "@/components/time-picker-input";
import {
  applyScheduleTimePreset,
  formatScheduleTimePart,
  formatTime12Hour,
  parseScheduleTime,
  scheduleTimePresetMatches,
  type ScheduleTimeKind,
} from "@/lib/sale/schedule-time";
import {
  DEFAULT_SCHEDULE_SUGGESTIONS,
  type ScheduleTimeSuggestions,
} from "@/lib/sale/schedule-suggestions";

const PRESET_LABELS = {
  exact: "Horas frecuentes",
  until: "Límites sugeridos",
  from: "Inicios sugeridos",
  range: "Rangos sugeridos",
} as const;

function segmentClass(selected: boolean) {
  return selected
    ? "bg-emerald-400 text-slate-950"
    : "text-slate-400 hover:text-slate-200";
}

type ScheduleTimeFieldProps = {
  value: string;
  onChange: (timePart: string) => void;
  suggestions?: ScheduleTimeSuggestions;
};

export function ScheduleTimeField({ value, onChange, suggestions }: ScheduleTimeFieldProps) {
  const parsed = parseScheduleTime(value);
  const [rangeTarget, setRangeTarget] = useState<"start" | "end">("start");
  const resolvedSuggestions: ScheduleTimeSuggestions = suggestions ?? {
    ...DEFAULT_SCHEDULE_SUGGESTIONS.delivery,
    range: ["08:00-10:00", "10:00-12:00", "12:00-14:00", "14:00-17:00"],
  };

  function update(next: Partial<typeof parsed>) {
    onChange(formatScheduleTimePart({ ...parsed, ...next }));
  }

  function setKind(kind: ScheduleTimeKind) {
    if (kind === parsed.kind) {
      return;
    }

    if (kind === "range") {
      setRangeTarget("start");
      onChange(
        formatScheduleTimePart({
          kind,
          start: parsed.start,
          end: parsed.kind === "range" ? parsed.end || "" : "",
        }),
      );
      return;
    }

    onChange(
      formatScheduleTimePart({
        kind,
        start: parsed.kind === "range" ? parsed.end || parsed.start : parsed.start,
      }),
    );
  }

  const singleTimePresets =
    parsed.kind === "range" ? [] : resolvedSuggestions[parsed.kind].map((time) => [
      formatTime12Hour(time).replace(":00", ""),
      time,
    ] as const);
  const rangePresets = resolvedSuggestions.range.flatMap((range) => {
    const [start, end] = range.split("-");
    if (!start || !end) {
      return [];
    }

    return [[`${formatTime12Hour(start).replace(":00", "")}–${formatTime12Hour(end).replace(":00", "")}`, start, end] as const];
  });

  return (
    <div className="grid min-w-0 gap-2">
      <div className="flex min-w-0 gap-1 rounded-lg bg-surface-panel p-1">
        {(
          [
            ["exact", "Exacta"],
            ["until", "Antes de"],
            ["from", "A partir"],
            ["range", "Entre"],
          ] as const
        ).map(([kind, label]) => (
          <button
            key={kind}
            type="button"
            onClick={() => setKind(kind)}
            className={`h-9 min-w-0 flex-1 whitespace-nowrap rounded-md px-1 text-[10px] font-black transition ${segmentClass(parsed.kind === kind)}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid gap-1.5">
        <span className="text-[11px] font-black uppercase text-slate-500">
          {PRESET_LABELS[parsed.kind]}
        </span>
        <div className="grid grid-cols-4 gap-1.5">
          {parsed.kind === "range"
            ? rangePresets.map(([label, start, end]) => (
                <button
                  key={label}
                  type="button"
                  onClick={() =>
                    onChange(formatScheduleTimePart({ kind: "range", start, end }))
                  }
                  className={`h-8 min-w-0 rounded-md border px-1 text-[10px] font-black transition ${
                    parsed.start === start && parsed.end === end
                      ? "border-emerald-600 bg-emerald-400 text-slate-950"
                      : "border-black bg-surface-inset text-slate-300 hover:bg-surface-card-hover"
                  }`}
                >
                  {label}
                </button>
              ))
            : singleTimePresets.map(([label, time]) => (
            <button
              key={label}
              type="button"
              onClick={() => onChange(applyScheduleTimePreset(value, time))}
              className={`h-8 min-w-0 rounded-md border px-1 text-[11px] font-black transition ${
                scheduleTimePresetMatches(value, time)
                  ? "border-emerald-600 bg-emerald-400 text-slate-950"
                  : "border-black bg-surface-inset text-slate-300 hover:bg-surface-card-hover"
              }`}
            >
              {label}
            </button>
              ))}
        </div>
      </div>

      {parsed.kind === "exact" ? (
        <label className="grid gap-1.5">
          <span className="text-[11px] font-black uppercase text-slate-500">Hora exacta</span>
          <TimePickerInput
            value={parsed.start}
            ariaLabel="Hora exacta de entrega"
            onChange={(nextValue) => update({ start: nextValue })}
          />
        </label>
      ) : null}

      {parsed.kind === "range" ? (
        <div className="grid min-w-0 grid-cols-1 gap-2">
          <label className="grid min-w-0 gap-1.5">
            <span className="text-[11px] font-black uppercase text-slate-500">Desde</span>
            <TimePickerInput
              value={parsed.start}
              ariaLabel="Hora desde"
              active={rangeTarget === "start"}
              onFocus={() => setRangeTarget("start")}
              onChange={(nextValue) => update({ start: nextValue })}
            />
          </label>
          <label className="grid min-w-0 gap-1.5">
            <span className="text-[11px] font-black uppercase text-slate-500">Hasta</span>
            <TimePickerInput
              value={parsed.end || ""}
              ariaLabel="Hora hasta"
              active={rangeTarget === "end"}
              onFocus={() => setRangeTarget("end")}
              onChange={(nextValue) => update({ end: nextValue })}
            />
          </label>
        </div>
      ) : null}

      {parsed.kind === "from" ? (
        <label className="grid gap-1.5">
          <span className="text-[11px] font-black uppercase text-slate-500">A partir de</span>
          <TimePickerInput
            value={parsed.start}
            ariaLabel="Hora a partir de"
            onChange={(nextValue) => update({ start: nextValue })}
          />
        </label>
      ) : null}

      {parsed.kind === "until" ? (
        <label className="grid gap-1.5">
          <span className="text-[11px] font-black uppercase text-slate-500">Antes de</span>
          <TimePickerInput
            value={parsed.start}
            ariaLabel="Hora antes de"
            onChange={(nextValue) => update({ start: nextValue })}
          />
        </label>
      ) : null}
    </div>
  );
}
