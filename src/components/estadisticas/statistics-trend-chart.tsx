"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type {
  StatisticsDashboard,
  StatisticsTrendGranularity,
  StatisticsTrendMetricKey,
} from "@/lib/statistics/types";
import {
  formatStatisticDateRange,
  formatStatisticMoney,
  formatStatisticNumber,
  formatStatisticPercent,
} from "./statistics-format";

const METRICS: Array<{ key: StatisticsTrendMetricKey; label: string; money?: boolean }> = [
  { key: "sales", label: "Ventas", money: true },
  { key: "collections", label: "Cobros", money: true },
  { key: "pending", label: "Pendiente", money: true },
  { key: "shipments", label: "Envíos" },
  { key: "boxes", label: "Cajas" },
  { key: "customers", label: "Clientes" },
];

const GRANULARITY_LABELS: Record<StatisticsTrendGranularity, string> = {
  hour: "hora",
  day: "día",
  week: "semana",
  month: "mes",
};

function parseBusinessDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
}

function dateForBucket(from: string, index: number, granularity: StatisticsTrendGranularity) {
  const date = parseBusinessDate(from);
  if (granularity === "hour") date.setHours(index, 0, 0, 0);
  else if (granularity === "day") date.setDate(date.getDate() + index);
  else if (granularity === "week") date.setDate(date.getDate() + index * 7);
  else date.setMonth(date.getMonth() + index);
  return date;
}

function bucketLabel(
  from: string,
  index: number,
  granularity: StatisticsTrendGranularity,
  long = false,
) {
  const date = dateForBucket(from, index, granularity);
  if (granularity === "hour") {
    if (!long) return new Intl.DateTimeFormat("es-US", { hour: "2-digit", minute: "2-digit", hour12: false }).format(date);
    return new Intl.DateTimeFormat("es-US", { day: "numeric", month: "long", hour: "numeric", minute: "2-digit" }).format(date);
  }
  if (granularity === "month") {
    return new Intl.DateTimeFormat("es-US", { month: long ? "long" : "short", year: "numeric" }).format(date);
  }
  const formatted = new Intl.DateTimeFormat("es-US", {
    day: "numeric",
    month: long ? "long" : "short",
  }).format(date);
  return granularity === "week" ? `${long ? "Semana del" : "Sem"} ${formatted}` : formatted;
}

function niceStep(value: number) {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  const multiplier = [1, 2, 2.5, 5, 10].find((candidate) => normalized <= candidate) ?? 10;
  return multiplier * magnitude;
}

function axisScale(maximum: number) {
  const step = niceStep(maximum / 4);
  const max = Math.max(step, Math.ceil(maximum / step) * step);
  const tickCount = Math.round(max / step);
  return {
    max,
    ticks: Array.from({ length: tickCount + 1 }, (_, index) => index * step),
  };
}

function pointPath(
  values: number[],
  plotLeft: number,
  plotTop: number,
  plotWidth: number,
  plotHeight: number,
  max: number,
) {
  if (!values.length) return "";
  return values.map((value, index) => {
    const x = values.length === 1
      ? plotLeft + plotWidth / 2
      : plotLeft + (index / (values.length - 1)) * plotWidth;
    const y = plotTop + plotHeight - (value / max) * plotHeight;
    return `${index ? "L" : "M"}${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(" ");
}

function axisValue(value: number, money: boolean, currency: string, maximum: number) {
  if (!money) return formatStatisticNumber(value);
  return new Intl.NumberFormat("es-US", {
    style: "currency",
    currency,
    notation: maximum >= 10_000 ? "compact" : "standard",
    maximumFractionDigits: maximum < 10 ? 1 : 0,
  }).format(value);
}

function signedValue(value: number, format: (amount: number) => string) {
  return `${value > 0 ? "+" : ""}${format(value)}`;
}

export function StatisticsTrendChart({ dashboard }: { dashboard: StatisticsDashboard }) {
  const [metric, setMetric] = useState<StatisticsTrendMetricKey>("sales");
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [chartWidth, setChartWidth] = useState(760);
  const chartFrameRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const gradientId = useId().replaceAll(":", "");
  const availableMetrics = dashboard.capabilities.finance
    ? METRICS
    : METRICS.filter((item) => !item.money);
  const effectiveMetric = availableMetrics.some((item) => item.key === metric)
    ? metric
    : availableMetrics[0]?.key ?? "shipments";
  const metricDefinition = availableMetrics.find((item) => item.key === effectiveMetric) ?? METRICS[3];
  const buckets = dashboard.trend.buckets;
  const currentValues = buckets.map((bucket) => bucket.current[effectiveMetric] ?? 0);
  const previousValues = buckets.map((bucket) => bucket.previous[effectiveMetric] ?? 0);
  const activeIndex = hoveredIndex ?? selectedIndex;
  const scale = axisScale(Math.max(0, ...currentValues, ...previousValues));
  const chartHeight = chartWidth < 560 ? 264 : chartWidth < 960 ? 300 : 340;
  const plotLeft = chartWidth < 480 ? 58 : 72;
  const plotRight = chartWidth - 16;
  const plotTop = 24;
  const plotBottom = chartHeight - 42;
  const plotWidth = Math.max(1, plotRight - plotLeft);
  const plotHeight = plotBottom - plotTop;
  const currentPath = pointPath(currentValues, plotLeft, plotTop, plotWidth, plotHeight, scale.max);
  const previousPath = pointPath(previousValues, plotLeft, plotTop, plotWidth, plotHeight, scale.max);
  const areaPath = currentPath
    ? `${currentPath} L${plotRight},${plotBottom} L${plotLeft},${plotBottom} Z`
    : "";
  const totalCurrent = currentValues.reduce((total, value) => total + value, 0);
  const totalPrevious = previousValues.reduce((total, value) => total + value, 0);
  const format = (value: number) => metricDefinition.money
    ? formatStatisticMoney(value, dashboard.meta.currency)
    : formatStatisticNumber(value);
  const selectedCurrent = activeIndex === null ? totalCurrent : currentValues[activeIndex];
  const selectedPrevious = activeIndex === null ? totalPrevious : previousValues[activeIndex];
  const selectedDifference = selectedCurrent - selectedPrevious;
  const selectedDelta = selectedPrevious === 0
    ? selectedCurrent === 0 ? 0 : null
    : (selectedDifference / Math.abs(selectedPrevious)) * 100;
  const peakIndex = currentValues.length
    ? currentValues.reduce((best, value, index) => value > currentValues[best] ? index : best, 0)
    : null;
  const activeX = activeIndex === null
    ? null
    : currentValues.length === 1
      ? plotLeft + plotWidth / 2
      : plotLeft + (activeIndex / (currentValues.length - 1)) * plotWidth;

  useEffect(() => {
    const element = chartFrameRef.current;
    if (!element) return;
    const updateWidth = () => setChartWidth(Math.max(280, Math.round(element.clientWidth)));
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const labelIndexes = useMemo(() => {
    const target = chartWidth < 520 ? 3 : chartWidth < 900 ? 4 : chartWidth < 1_300 ? 5 : 7;
    if (buckets.length <= target) return buckets.map((_, index) => index);
    return Array.from(new Set(Array.from(
      { length: target },
      (_, index) => Math.round((index / (target - 1)) * (buckets.length - 1)),
    )));
  }, [buckets, chartWidth]);

  const currentRange = formatStatisticDateRange(dashboard.meta.period.from, dashboard.meta.period.to);
  const previousRange = formatStatisticDateRange(dashboard.meta.period.compareFrom, dashboard.meta.period.compareTo);
  const summaryLabel = activeIndex === null
    ? "Resumen del periodo"
    : bucketLabel(dashboard.meta.period.from, activeIndex, dashboard.trend.granularity, true);
  const previousPointLabel = activeIndex === null
    ? "Periodo anterior"
    : bucketLabel(dashboard.meta.period.compareFrom, activeIndex, dashboard.trend.granularity, true);

  return (
    <section className="border-b border-black/70 px-3 py-5 sm:px-5 sm:py-6" aria-labelledby={titleId}>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-300">Evolución del negocio</p>
          <h2 id={titleId} className="mt-1 text-lg font-black text-slate-50 sm:text-xl">Tendencia y comparación</h2>
          <p className="mt-1 text-xs font-bold text-slate-500">
            Valores agrupados por {GRANULARITY_LABELS[dashboard.trend.granularity]}; ambos periodos se alinean por posición.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-1 rounded-lg border border-black bg-surface-inset p-1 sm:flex" role="tablist" aria-label="Métrica de tendencia">
          {availableMetrics.map((item) => (
            <button
              key={item.key}
              type="button"
              role="tab"
              aria-selected={effectiveMetric === item.key}
              onClick={() => {
                setMetric(item.key);
                setSelectedIndex(null);
                setHoveredIndex(null);
              }}
              className={`min-h-11 rounded-md px-2.5 text-xs font-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300 ${effectiveMetric === item.key ? "bg-emerald-400 text-slate-950" : "text-slate-300 hover:bg-surface-card"}`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_18rem] xl:items-stretch">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-black text-slate-300" aria-label="Leyenda">
            <span className="inline-flex items-center gap-2">
              <span className="h-0.5 w-6 bg-emerald-300" aria-hidden /> Actual · {currentRange}
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="w-6 border-t-2 border-dashed border-slate-500" aria-hidden /> Anterior · {previousRange}
            </span>
          </div>
          <div ref={chartFrameRef} className="relative w-full overflow-hidden rounded-lg border border-black/60 bg-surface-inset/55">
            {buckets.length ? (
              <svg
                width={chartWidth}
                height={chartHeight}
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                className="block w-full"
                role="img"
                aria-label={`Gráfico de ${metricDefinition.label}: ${format(totalCurrent)} en el periodo actual y ${format(totalPrevious)} en el anterior`}
                preserveAspectRatio="xMidYMid meet"
                shapeRendering="geometricPrecision"
              >
                <defs>
                  <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="rgb(110 231 183)" stopOpacity="0.18" />
                    <stop offset="100%" stopColor="rgb(110 231 183)" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <text x={plotLeft} y="15" fill="currentColor" className="text-[10px] font-black uppercase tracking-wide text-slate-500">
                  {metricDefinition.label}{metricDefinition.money ? ` · ${dashboard.meta.currency}` : " · total"}
                </text>
                {scale.ticks.map((tick) => {
                  const y = plotBottom - (tick / scale.max) * plotHeight;
                  return (
                    <g key={tick}>
                      <line x1={plotLeft} y1={y} x2={plotRight} y2={y} stroke="currentColor" className="text-slate-800" strokeWidth="1" vectorEffect="non-scaling-stroke" />
                      <text x={plotLeft - 10} y={y + 4} textAnchor="end" fill="currentColor" className="text-[10px] font-bold text-slate-500">
                        {axisValue(tick, Boolean(metricDefinition.money), dashboard.meta.currency, scale.max)}
                      </text>
                    </g>
                  );
                })}
                {activeX !== null ? (
                  <line x1={activeX} y1={plotTop} x2={activeX} y2={plotBottom} stroke="currentColor" className="text-emerald-300/50" strokeDasharray="3 5" strokeWidth="1" vectorEffect="non-scaling-stroke" />
                ) : null}
                <path d={areaPath} fill={`url(#${gradientId})`} />
                <path d={previousPath} fill="none" stroke="currentColor" className="text-slate-500" strokeWidth="2" strokeDasharray="7 7" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                <path d={currentPath} fill="none" stroke="currentColor" className="text-emerald-300" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                {currentValues.map((value, index) => {
                  const x = currentValues.length === 1
                    ? plotLeft + plotWidth / 2
                    : plotLeft + (index / (currentValues.length - 1)) * plotWidth;
                  const y = plotBottom - (value / scale.max) * plotHeight;
                  const currentDate = bucketLabel(dashboard.meta.period.from, index, dashboard.trend.granularity, true);
                  const previousDate = bucketLabel(dashboard.meta.period.compareFrom, index, dashboard.trend.granularity, true);
                  return (
                    <g key={buckets[index].key}>
                      <circle cx={x} cy={y} r={activeIndex === index ? 8 : 5} fill="currentColor" className="pointer-events-none text-emerald-300" />
                      <circle
                        cx={x}
                        cy={y}
                        r="15"
                        fill="transparent"
                        className="cursor-pointer outline-none"
                        tabIndex={0}
                        role="button"
                        aria-label={`${currentDate}: actual ${format(value)}; ${previousDate}: anterior ${format(previousValues[index])}`}
                        onFocus={() => setSelectedIndex(index)}
                        onMouseEnter={() => setHoveredIndex(index)}
                        onMouseLeave={() => setHoveredIndex(null)}
                        onClick={() => setSelectedIndex(index)}
                      />
                    </g>
                  );
                })}
                {labelIndexes.map((index) => {
                  const x = buckets.length === 1
                    ? plotLeft + plotWidth / 2
                    : plotLeft + (index / (buckets.length - 1)) * plotWidth;
                  return (
                    <text
                      key={buckets[index].key}
                      x={x}
                      y={chartHeight - 16}
                      textAnchor={index === 0 ? "start" : index === buckets.length - 1 ? "end" : "middle"}
                      fill="currentColor"
                      className="text-[10px] font-bold text-slate-500 sm:text-[11px]"
                    >
                      {bucketLabel(dashboard.meta.period.from, index, dashboard.trend.granularity)}
                    </text>
                  );
                })}
              </svg>
            ) : (
              <div className="flex h-64 items-center justify-center p-6 text-center text-sm font-bold text-slate-400 sm:h-72">No hay puntos para este periodo y filtros.</div>
            )}
          </div>
        </div>

        <aside className="flex flex-col border-t border-black/70 pt-5 xl:border-l xl:border-t-0 xl:pl-5 xl:pt-0" aria-live="polite">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">{summaryLabel}</p>
          <p className="mt-2 break-words text-3xl font-black tracking-tight text-emerald-300">{format(selectedCurrent)}</p>
          <p className="mt-1 text-xs font-bold text-slate-400">{activeIndex === null ? `Actual · ${currentRange}` : "Periodo actual"}</p>

          <div className="mt-5 grid grid-cols-2 border-y border-black/60">
            <div className="min-w-0 py-3 pr-3">
              <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">Anterior</p>
              <p className="mt-1 break-words text-base font-black text-slate-100">{format(selectedPrevious)}</p>
              <p className="mt-1 text-[10px] font-bold leading-snug text-slate-500">{previousPointLabel}</p>
            </div>
            <div className="min-w-0 border-l border-black/60 py-3 pl-3">
              <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">Variación</p>
              <p className="mt-1 break-words text-base font-black text-slate-100">{formatStatisticPercent(selectedDelta)}</p>
              <p className="mt-1 text-[10px] font-bold leading-snug text-slate-500">{signedValue(selectedDifference, format)}</p>
            </div>
          </div>

          {peakIndex !== null ? (
            <div className="mt-4">
              <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">Pico del periodo</p>
              <p className="mt-1 text-sm font-black text-slate-200">
                {bucketLabel(dashboard.meta.period.from, peakIndex, dashboard.trend.granularity, true)} · {format(currentValues[peakIndex])}
              </p>
            </div>
          ) : null}

          {activeIndex !== null ? (
            <button
              type="button"
              className="mt-4 min-h-11 self-start text-xs font-black text-emerald-300 underline decoration-emerald-700 underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300"
              onClick={() => {
                setSelectedIndex(null);
                setHoveredIndex(null);
              }}
            >
              Ver resumen del periodo
            </button>
          ) : null}

          <p className="mt-auto pt-5 text-xs font-bold leading-relaxed text-slate-500">
            Pasa el cursor, toca o enfoca un punto para comparar el mismo tramo de ambos periodos.
          </p>
        </aside>
      </div>
    </section>
  );
}
