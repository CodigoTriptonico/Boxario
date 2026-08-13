"use client";

import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { CompactInfoDisclosure } from "@/components/ui-blocks";
import type { StatisticsDashboard } from "@/lib/statistics/types";
import {
  formatStatisticMoney,
  formatStatisticNumber,
  formatStatisticPercent,
} from "./statistics-format";

type KpiKey = keyof StatisticsDashboard["kpis"];

const KPI_DEFINITIONS: Array<{
  key: KpiKey;
  label: string;
  money?: boolean;
  inverse?: boolean;
  neutral?: boolean;
  formula: string;
}> = [
  { key: "sales", label: "Ventas", money: true, formula: "Suma del total cotizado persistido de facturas no anuladas creadas en el periodo." },
  { key: "collections", label: "Cobrado", money: true, formula: "Suma de pagos registrados durante el periodo, según la fecha real del cobro." },
  { key: "pending", label: "Saldo pendiente", money: true, inverse: true, formula: "Fotografía actual del total cotizado menos lo pagado para ventas creadas en el periodo; no es una deuda histórica al cierre." },
  { key: "averageTicket", label: "Ticket promedio", money: true, formula: "Ventas del periodo divididas entre facturas no anuladas con total cotizado disponible." },
  { key: "shipments", label: "Envíos creados", neutral: true, formula: "Cantidad de envíos no anulados creados dentro del periodo filtrado." },
  { key: "boxes", label: "Cajas vendidas", neutral: true, formula: "Unidades declaradas en las líneas persistidas del snapshot de facturación." },
  { key: "customers", label: "Clientes atendidos", neutral: true, formula: "Clientes únicos con identificador real en ventas del periodo. Los registros sin identificador no se deduplican por nombre." },
];

export function StatisticsKpiStrip({ dashboard }: { dashboard: StatisticsDashboard }) {
  const definitions = KPI_DEFINITIONS.filter((definition) =>
    dashboard.capabilities.finance
      || !["sales", "collections", "pending", "averageTicket"].includes(definition.key),
  );
  if (!definitions.length) return null;
  return (
    <dl className="grid grid-cols-2 border-b border-black/70 sm:grid-cols-4 2xl:grid-cols-7" aria-label="Indicadores principales">
      {definitions.map((definition, index) => {
        const metric = dashboard.kpis[definition.key];
        const delta = metric.deltaPct;
        const rising = delta !== null && delta > 0;
        const falling = delta !== null && delta < 0;
        const isRisk = definition.inverse ? rising : false;
        const isPositive = definition.neutral ? false : definition.inverse ? falling : rising;
        const deltaTone = isRisk ? "text-rose-300" : isPositive ? "text-emerald-300" : "text-slate-400";
        const value = definition.money
          ? formatStatisticMoney(metric.value, dashboard.meta.currency)
          : formatStatisticNumber(metric.value);
        const valueTone = definition.key === "collections"
          ? "text-emerald-300"
          : definition.key === "pending" && metric.value > 0
            ? "text-amber-200"
            : "text-slate-50";
        return (
          <div
            key={definition.key}
            className={`min-w-0 border-black/70 px-3 py-3 sm:px-4 sm:py-4 ${
              index % 2 ? "border-l" : ""
            } ${index >= 2 ? "border-t" : ""} ${
              index % 4 ? "sm:border-l" : "sm:border-l-0"
            } ${index >= 4 ? "sm:border-t" : "sm:border-t-0"} ${index ? "2xl:border-l" : "2xl:border-l-0"} 2xl:border-t-0`}
          >
            <dt className="flex min-h-11 items-start justify-between gap-1 text-[10px] font-black uppercase tracking-wide text-slate-500 sm:text-xs [&>button]:h-11 [&>button]:w-11">
              <span>{definition.label}</span>
              <CompactInfoDisclosure ariaLabel={`Cómo se calcula ${definition.label}`} align="right">{definition.formula}</CompactInfoDisclosure>
            </dt>
            <dd className={`mt-1 break-words text-xl font-black leading-none sm:text-2xl ${valueTone}`}>{value}</dd>
            <div className={`mt-2 flex flex-wrap items-center gap-x-1 gap-y-0.5 text-xs font-black ${deltaTone}`}>
              {rising ? <ArrowUpRight className="h-3.5 w-3.5" aria-hidden /> : falling ? <ArrowDownRight className="h-3.5 w-3.5" aria-hidden /> : <Minus className="h-3.5 w-3.5" aria-hidden />}
              <span>{formatStatisticPercent(delta)}</span>
              <span className="text-[10px] text-slate-500">vs. periodo anterior</span>
            </div>
          </div>
        );
      })}
    </dl>
  );
}
