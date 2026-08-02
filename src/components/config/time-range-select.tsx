"use client";

import { ChevronDown, Clock } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

const dayOptions = Array.from({ length: 31 }, (_, index) => index + 1);
const weekOptions = Array.from({ length: 12 }, (_, index) => index + 1);
type TimeUnit = "dias" | "semanas";

function parseDeliveryTime(value: string) {
  const match = value.match(/^(\d+)(?:-(\d+))?\s+(dia|dias|semana|semanas)$/);
  const unit: TimeUnit = match?.[3]?.startsWith("semana") ? "semanas" : "dias";
  const start = Number(match?.[1] || 1);
  const end = Number(match?.[2] || match?.[1] || 1);

  return { start, end, unit };
}

function formatDeliveryTime(start: number, end: number, unit: TimeUnit) {
  if (start === end) {
    return `${start} ${unit === "dias" ? "dia" : "semana"}`;
  }

  return `${start}-${end} ${unit}`;
}

export function TimeRangeSelect({
  value,
  onChange,
  large = false,
}: {
  value: string;
  onChange: (value: string) => void;
  large?: boolean;
}) {
  const [openPicker, setOpenPicker] = useState<"start" | "end" | "unit" | null>(null);
  const [drafting, setDrafting] = useState(false);
  const [panelPosition, setPanelPosition] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const startRef = useRef<HTMLButtonElement>(null);
  const endRef = useRef<HTMLButtonElement>(null);
  const unitRef = useRef<HTMLButtonElement>(null);
  const isConfigured = Boolean(value.trim());
  const range = parseDeliveryTime(isConfigured ? value : "1 dia");
  const numbers = range.unit === "dias" ? dayOptions : weekOptions;
  const controlSize = large ? "h-12 text-xl" : "h-11 text-lg";
  const numberButtonClass = large ? "min-w-[4.5rem] px-3" : "min-w-[3.75rem] px-2";

  function updateRange(nextRange: Partial<typeof range>) {
    const next = { ...range, ...nextRange };
    const max = next.unit === "dias" ? 31 : 12;
    next.start = Math.min(next.start, max);
    next.end = Math.min(next.end, max);

    if (next.start > next.end) {
      if (nextRange.start) {
        next.end = next.start;
      } else {
        next.start = next.end;
      }
    }

    onChange(formatDeliveryTime(next.start, next.end, next.unit));
  }

  function pickNumber(key: "start" | "end", number: number) {
    updateRange({ [key]: number });
    setOpenPicker(null);
    setPanelPosition(null);
  }

  function pickUnit(unit: TimeUnit) {
    updateRange({ unit });
    setOpenPicker(null);
    setPanelPosition(null);
  }

  const openPickerAt = useCallback(
    (key: "start" | "end" | "unit") => {
      const trigger =
        key === "start" ? startRef.current : key === "end" ? endRef.current : unitRef.current;

      if (!trigger) {
        return;
      }

      if (openPicker === key) {
        setOpenPicker(null);
        setPanelPosition(null);
        return;
      }

      const rect = trigger.getBoundingClientRect();

      setPanelPosition({
        top: rect.bottom + 6,
        left: rect.left,
        width: key === "unit" ? 132 : 196,
      });
      setOpenPicker(key);
    },
    [openPicker],
  );

  useEffect(() => {
    if (isConfigured) {
      queueMicrotask(() => setDrafting(false));
    }
  }, [isConfigured]);

  useEffect(() => {
    if (!openPicker) {
      return;
    }

    const updatePosition = () => {
      const trigger =
        openPicker === "start"
          ? startRef.current
          : openPicker === "end"
            ? endRef.current
            : unitRef.current;

      if (!trigger) {
        return;
      }

      const rect = trigger.getBoundingClientRect();

      setPanelPosition({
        top: rect.bottom + 6,
        left: rect.left,
        width: openPicker === "unit" ? 132 : 196,
      });
    };

    const close = (event: PointerEvent) => {
      const target = event.target;

      if (target instanceof Element && target.closest("[data-time-range-panel]")) {
        return;
      }

      setOpenPicker(null);
      setPanelPosition(null);
    };

    updatePosition();
    window.addEventListener("pointerdown", close);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [openPicker]);

  if (!isConfigured && !drafting) {
    return (
      <button
        type="button"
        onClick={() => setDrafting(true)}
        className={`inline-flex items-center gap-2 rounded-xl border border-dashed border-black bg-surface-panel px-4 font-black text-slate-400 transition hover:border-emerald-600/50 hover:bg-surface-card-hover hover:text-emerald-300 ${large ? "h-12 text-base" : "h-11 text-sm"}`}
      >
        <Clock className="h-4 w-4" />
        Definir tiempo de entrega
      </button>
    );
  }

  const triggerClass = `flex ${controlSize} shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-lg border border-black bg-surface-panel px-2 font-black tabular-nums text-[#f8fafc] transition hover:bg-surface-card-hover`;
  const numberTriggerClass = `${triggerClass} ${numberButtonClass}`;

  return (
    <>
      <div className="inline-flex max-w-full flex-nowrap items-center gap-2 rounded-xl border border-black bg-[#1a221f] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
        <button
          ref={startRef}
          type="button"
          onClick={() => openPickerAt("start")}
          className={numberTriggerClass}
          aria-expanded={openPicker === "start"}
        >
          {range.start}
          <ChevronDown
            className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition ${openPicker === "start" ? "rotate-180" : ""}`}
          />
        </button>
        <span className="shrink-0 px-0.5 text-sm font-black text-slate-500">a</span>
        <button
          ref={endRef}
          type="button"
          onClick={() => openPickerAt("end")}
          className={numberTriggerClass}
          aria-expanded={openPicker === "end"}
        >
          {range.end}
          <ChevronDown
            className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition ${openPicker === "end" ? "rotate-180" : ""}`}
          />
        </button>
        <button
          ref={unitRef}
          type="button"
          onClick={() => openPickerAt("unit")}
          className={`${triggerClass} min-w-[5.5rem] px-3`}
          aria-expanded={openPicker === "unit"}
        >
          {range.unit}
          <ChevronDown
            className={`h-3.5 w-3.5 text-slate-400 transition ${openPicker === "unit" ? "rotate-180" : ""}`}
          />
        </button>
      </div>

      {openPicker && panelPosition ? (
        <div
          data-time-range-panel
          className="fixed z-[120] overflow-hidden rounded-lg border border-black bg-surface-card shadow-[0_16px_40px_rgba(0,0,0,0.45)]"
          style={{
            top: panelPosition.top,
            left: panelPosition.left,
            width: panelPosition.width,
          }}
          onPointerDown={(event) => event.stopPropagation()}
        >
          {openPicker === "unit" ? (
            <div className="grid gap-1 p-2">
              {(["dias", "semanas"] as TimeUnit[]).map((unit) => (
                <button
                  key={unit}
                  type="button"
                  onClick={() => pickUnit(unit)}
                  className={`h-10 rounded-md px-3 text-left text-sm font-black transition ${
                    unit === range.unit
                      ? "bg-emerald-400 text-slate-950"
                      : "bg-surface-panel text-[#f8fafc] hover:bg-surface-card-hover"
                  }`}
                >
                  {unit}
                </button>
              ))}
            </div>
          ) : (
            <div className="grid max-h-52 grid-cols-4 gap-1 overflow-y-auto p-2">
              {numbers.map((number) => {
                const currentValue = openPicker === "start" ? range.start : range.end;

                return (
                  <button
                    key={number}
                    type="button"
                    onClick={() => pickNumber(openPicker, number)}
                    className={`h-9 rounded-md text-sm font-black transition ${
                      number === currentValue
                        ? "bg-emerald-400 text-slate-950"
                        : "bg-surface-panel text-[#f8fafc] hover:bg-surface-card-hover"
                    }`}
                  >
                    {number}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ) : null}
    </>
  );
}
