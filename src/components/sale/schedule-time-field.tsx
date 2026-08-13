"use client";

import { useEffect, useState } from "react";
import { CompactInfoDisclosure } from "@/components/compact-info-disclosure";
import { TimePickerInput } from "@/components/time-picker-input";
import {
  applyScheduleTimePreset,
  formatScheduleTimePart,
  formatTime12Hour,
  parseScheduleTime,
  scheduleTimePresetMatches,
  type ScheduleTimeKind,
  type ScheduleTimeValue,
} from "@/lib/sale/schedule-time";
import {
  scheduleSuggestionModeEnabled,
  SCHEDULE_SINGLE_TIME_MODE_KEYS,
  type ScheduleTimeSuggestions,
} from "@/lib/sale/schedule-suggestions";

const CLIENT_PREFERENCE_LABEL = "Preferencia del cliente";

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
    exact: [],
    until: [],
    from: [],
    ranges: [],
    range: [],
  };
  const configurableModes = SCHEDULE_SINGLE_TIME_MODE_KEYS.filter((kind) =>
    scheduleSuggestionModeEnabled(resolvedSuggestions, kind),
  );

  const rangePresets = resolvedSuggestions.range.flatMap((range) => {
    const [start, end] = range.split("-");
    if (!start || !end) {
      return [];
    }

    return [[`${formatTime12Hour(start).replace(":00", "")}–${formatTime12Hour(end).replace(":00", "")}`, start, end] as const];
  });
  const rangeAvailable = scheduleSuggestionModeEnabled(resolvedSuggestions, "range");
  const activeKind: ScheduleTimeKind =
    parsed.kind === "range"
      ? rangeAvailable
        ? "range"
        : configurableModes[0] || "exact"
      : configurableModes.includes(parsed.kind)
        ? parsed.kind
        : configurableModes[0] || (rangeAvailable ? "range" : "exact");
  const activeParsed: ScheduleTimeValue =
    activeKind === parsed.kind
      ? parsed
      : {
          ...parsed,
          kind: activeKind,
          end: activeKind === "range" ? parsed.end : undefined,
        };
  const activeValue = formatScheduleTimePart(activeParsed);

  useEffect(() => {
    if (parsed.kind !== activeKind) {
      onChange(activeValue);
    }
  }, [activeKind, activeValue, onChange, parsed.kind]);

  function update(next: Partial<typeof activeParsed>) {
    onChange(formatScheduleTimePart({ ...activeParsed, ...next }));
  }

  function setKind(kind: ScheduleTimeKind) {
    if (kind === activeKind && parsed.kind === kind) {
      return;
    }

    if (kind === "range") {
      setRangeTarget("start");
      onChange(
        formatScheduleTimePart({
          kind,
          start: activeParsed.start,
          end: activeParsed.kind === "range" ? activeParsed.end || "" : "",
        }),
      );
      return;
    }

    onChange(
      formatScheduleTimePart({
        kind,
        start: activeParsed.kind === "range" ? activeParsed.end || activeParsed.start : activeParsed.start,
      }),
    );
  }

  const singleTimePresets =
    activeKind === "range" ? [] : resolvedSuggestions[activeKind].map((time) => [
      formatTime12Hour(time).replace(":00", ""),
      time,
    ] as const);
  const modeOptions = [
    ...configurableModes.map((kind) => [
      kind,
      kind === "exact" ? "Exacta" : kind === "until" ? "Antes de" : "A partir",
    ] as const),
    ...(rangeAvailable ? ([(["range", "Entre"] as const)] as const) : []),
  ] as Array<readonly [ScheduleTimeKind, string]>;
  const hasPresets =
    activeKind === "range" ? rangePresets.length > 0 : singleTimePresets.length > 0;

  return (
    <div className="grid min-w-0 gap-1.5">
      <div className="flex min-w-0 items-center gap-1.5">
        <span className="text-[11px] font-black uppercase text-slate-500">
          {CLIENT_PREFERENCE_LABEL}
        </span>
        <CompactInfoDisclosure ariaLabel="Qué significa la preferencia del cliente">
          No es el horario oficial de la ruta. Logística confirma después la hora de recolección
          o entrega.
        </CompactInfoDisclosure>
      </div>

      <div className="flex min-w-0 gap-1 rounded-lg bg-surface-panel p-1">
        {modeOptions.map(([kind, label]) => (
          <button
            key={kind}
            type="button"
            onClick={() => setKind(kind)}
            className={`h-9 min-w-0 flex-1 whitespace-nowrap rounded-md px-1 text-[10px] font-black transition ${segmentClass(activeKind === kind)}`}
          >
            {label}
          </button>
        ))}
      </div>

      {hasPresets ? (
        <div className="grid grid-cols-4 gap-1.5">
          {activeKind === "range"
            ? rangePresets.map(([label, start, end]) => (
                <button
                  key={label}
                  type="button"
                  onClick={() =>
                    onChange(formatScheduleTimePart({ kind: "range", start, end }))
                  }
                  className={`h-8 min-w-0 rounded-md border px-1 text-[10px] font-black transition ${
                    activeParsed.start === start && activeParsed.end === end
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
                  onClick={() => onChange(applyScheduleTimePreset(activeValue, time))}
                  className={`h-8 min-w-0 rounded-md border px-1 text-[11px] font-black transition ${
                    scheduleTimePresetMatches(activeValue, time)
                      ? "border-emerald-600 bg-emerald-400 text-slate-950"
                      : "border-black bg-surface-inset text-slate-300 hover:bg-surface-card-hover"
                  }`}
                >
                  {label}
                </button>
              ))}
        </div>
      ) : null}

      {activeKind === "exact" ? (
        <TimePickerInput
          value={activeParsed.start}
          ariaLabel="Preferencia del cliente: hora exacta"
          onChange={(nextValue) => update({ start: nextValue })}
        />
      ) : null}

      {activeKind === "from" ? (
        <TimePickerInput
          value={activeParsed.start}
          ariaLabel="Preferencia del cliente: a partir de"
          onChange={(nextValue) => update({ start: nextValue })}
        />
      ) : null}

      {activeKind === "until" ? (
        <TimePickerInput
          value={activeParsed.start}
          ariaLabel="Preferencia del cliente: antes de"
          onChange={(nextValue) => update({ start: nextValue })}
        />
      ) : null}

      {activeKind === "range" ? (
        <div className="grid min-w-0 grid-cols-1 gap-2">
          <label className="grid min-w-0 gap-1.5">
            <span className="text-[11px] font-black uppercase text-slate-500">Desde</span>
            <TimePickerInput
              value={activeParsed.start}
              ariaLabel="Preferencia del cliente: desde"
              active={rangeTarget === "start"}
              onFocus={() => setRangeTarget("start")}
              onChange={(nextValue) => update({ start: nextValue })}
            />
          </label>
          <label className="grid min-w-0 gap-1.5">
            <span className="text-[11px] font-black uppercase text-slate-500">Hasta</span>
            <TimePickerInput
              value={activeParsed.end || ""}
              ariaLabel="Preferencia del cliente: hasta"
              active={rangeTarget === "end"}
              onFocus={() => setRangeTarget("end")}
              onChange={(nextValue) => update({ end: nextValue })}
            />
          </label>
        </div>
      ) : null}
    </div>
  );
}
