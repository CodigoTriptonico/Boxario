"use client";

import {
  CalendarDays,
  MapPin,
  PackageCheck,
  PackageOpen,
  Route,
  Truck,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import type {
  StatisticsDashboard,
  StatisticsLogisticsRankingRow,
  StatisticsLogisticsRouteRankingRow,
} from "@/lib/statistics/types";
import { formatStatisticNumber } from "./statistics-format";

function count(value: number, singular: string, plural: string) {
  return `${formatStatisticNumber(value)} ${value === 1 ? singular : plural}`;
}

function knownBoxes(value: number, knownOperations: number, totalOperations: number) {
  if (totalOperations === 0) return "0";
  if (knownOperations === 0) return "No disponible";
  const formatted = formatStatisticNumber(value);
  return knownOperations < totalOperations ? `${formatted} registradas` : formatted;
}

function formatDate(value: string, long = false) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day, 12);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("es-US", {
    weekday: long ? "short" : undefined,
    day: "numeric",
    month: long ? "long" : "short",
    year: long ? "numeric" : undefined,
  }).format(date);
}

function maxBy<T>(rows: T[], value: (row: T) => number) {
  return rows.reduce<T | undefined>((best, row) => {
    if (value(row) <= 0) return best;
    return !best || value(row) > value(best) ? row : best;
  }, undefined);
}

function SummaryMetric({
  label,
  value,
  detail,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  tone: string;
}) {
  return (
    <div className="min-w-0 bg-surface-inset px-3 py-4 sm:px-4">
      <div className="flex items-start justify-between gap-3">
        <dt className="text-[10px] font-black uppercase tracking-wide text-slate-500">{label}</dt>
        <Icon className={`h-4 w-4 shrink-0 ${tone}`} aria-hidden />
      </div>
      <dd className={`mt-2 break-words text-2xl font-black sm:text-3xl ${tone}`}>{value}</dd>
      <p className="mt-1 text-xs font-bold text-slate-500">{detail}</p>
    </div>
  );
}

function Leader({
  eyebrow,
  title,
  value,
  detail,
  icon: Icon,
  href,
}: {
  eyebrow: string;
  title: string;
  value?: string;
  detail?: string;
  icon: LucideIcon;
  href?: string;
}) {
  const content = (
    <>
      <div className="flex items-center gap-2 text-emerald-300">
        <Icon className="h-4 w-4" aria-hidden />
        <p className="text-[10px] font-black uppercase tracking-[0.15em]">{eyebrow}</p>
      </div>
      <p className="mt-3 text-xs font-black text-slate-500">{title}</p>
      <p className="mt-1 break-words text-lg font-black text-slate-50">{value ?? "Sin actividad completada"}</p>
      {detail ? <p className="mt-1 text-xs font-bold leading-relaxed text-slate-500">{detail}</p> : null}
    </>
  );
  const className = "min-w-0 bg-surface-inset p-4 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-emerald-300";
  return href ? <Link className={className} href={href}>{content}</Link> : <div className={className}>{content}</div>;
}

function CoverageNotice({ dashboard }: { dashboard: StatisticsDashboard }) {
  const boxes = dashboard.logisticsAnalytics.coverage.boxes;
  const postalCodes = dashboard.logisticsAnalytics.coverage.postalCodes;
  if (boxes.status === "complete" && postalCodes.status === "complete") return null;
  return (
    <div className="border-b border-amber-900/70 bg-amber-950/15 px-3 py-3 text-xs font-bold leading-relaxed text-amber-100 sm:px-5" role="status">
      Cobertura del periodo: cantidades de cajas {formatStatisticNumber(boxes.available)} de {formatStatisticNumber(boxes.total)} operaciones; código postal {formatStatisticNumber(postalCodes.available)} de {formatStatisticNumber(postalCodes.total)}. Los rankings omiten el dato que no está persistido; no lo sustituyen por una estimación.
    </div>
  );
}

function DailyActivity({ dashboard }: { dashboard: StatisticsDashboard }) {
  const rows = dashboard.logisticsAnalytics.daily;
  const maxBoxes = Math.max(1, ...rows.map((row) => Math.max(row.deliveredBoxes, row.collectedBoxes)));
  return (
    <section className="border-b border-black/70 px-3 py-5 sm:px-5" aria-labelledby="logistics-daily-title">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-300">Día por día</p>
        <h2 id="logistics-daily-title" className="mt-1 text-lg font-black text-slate-50 sm:text-xl">Cajas entregadas y recogidas</h2>
        <p className="mt-1 text-xs font-bold text-slate-500">Cada cantidad se atribuye a la fecha real de finalización de la tarea en la zona operativa.</p>
      </div>

      <div className="mt-4 hidden max-h-[32rem] overflow-auto border-y border-black/70 lg:block">
        <table className="w-full border-collapse text-left text-xs">
          <thead className="sticky top-0 z-10 bg-surface-card-header text-slate-400">
            <tr>
              <th scope="col" className="px-3 py-3 font-black">Día</th>
              <th scope="col" className="px-3 py-3 text-right font-black">Cajas entregadas</th>
              <th scope="col" className="px-3 py-3 text-right font-black">Cajas recogidas</th>
              <th scope="col" className="min-w-64 px-3 py-3 font-black">Movimiento</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/60">
            {rows.map((row) => (
              <tr key={row.date} className="bg-surface-list-row hover:bg-surface-list-row-hover">
                <th scope="row" className="px-3 py-3 font-black text-slate-200">{formatDate(row.date, true)}</th>
                <td className="px-3 py-3 text-right"><span className="font-black text-emerald-300">{knownBoxes(row.deliveredBoxes, row.deliveryBoxOperations, row.deliveryOperations)}</span><span className="ml-1 text-[10px] font-bold text-slate-500">({row.deliveryOperations} entregas)</span></td>
                <td className="px-3 py-3 text-right"><span className="font-black text-sky-300">{knownBoxes(row.collectedBoxes, row.pickupBoxOperations, row.pickupOperations)}</span><span className="ml-1 text-[10px] font-bold text-slate-500">({row.pickupOperations} recolecciones)</span></td>
                <td className="px-3 py-3">
                  <div className="grid gap-1" aria-label={`${formatStatisticNumber(row.deliveredBoxes)} cajas entregadas y ${formatStatisticNumber(row.collectedBoxes)} recogidas`}>
                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-emerald-400" style={{ width: `${(row.deliveredBoxes / maxBoxes) * 100}%` }} /></div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-sky-400" style={{ width: `${(row.collectedBoxes / maxBoxes) * 100}%` }} /></div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 grid max-h-[34rem] gap-2 overflow-y-auto lg:hidden">
        {rows.map((row) => (
          <article key={row.date} className="border-b border-black/70 bg-surface-list-row px-3 py-3 last:border-b-0">
            <h3 className="text-sm font-black text-slate-200">{formatDate(row.date, true)}</h3>
            <dl className="mt-3 grid grid-cols-2 gap-3">
              <div><dt className="text-[9px] font-black uppercase text-slate-500">Entregadas</dt><dd className="mt-1 break-words text-xl font-black text-emerald-300">{knownBoxes(row.deliveredBoxes, row.deliveryBoxOperations, row.deliveryOperations)}</dd><p className="text-[10px] font-bold text-slate-500">{count(row.deliveryOperations, "entrega", "entregas")}</p></div>
              <div><dt className="text-[9px] font-black uppercase text-slate-500">Recogidas</dt><dd className="mt-1 break-words text-xl font-black text-sky-300">{knownBoxes(row.collectedBoxes, row.pickupBoxOperations, row.pickupOperations)}</dd><p className="text-[10px] font-bold text-slate-500">{count(row.pickupOperations, "recolección", "recolecciones")}</p></div>
            </dl>
          </article>
        ))}
      </div>
    </section>
  );
}

function RankingList({
  title,
  rows,
  routeLinks = false,
}: {
  title: string;
  rows: Array<StatisticsLogisticsRankingRow | StatisticsLogisticsRouteRankingRow>;
  routeLinks?: boolean;
}) {
  if (!rows.length) {
    return <div className="min-w-0 py-4"><h3 className="text-sm font-black text-slate-200">{title}</h3><p className="mt-4 border-t border-dashed border-slate-700 py-6 text-center text-xs font-bold text-slate-500">Sin datos identificados.</p></div>;
  }
  return (
    <div className="min-w-0 py-4">
      <h3 className="text-sm font-black text-slate-200">{title}</h3>
      <ol className="mt-3 divide-y divide-black/60">
        {rows.slice(0, 8).map((row, index) => {
          const route = routeLinks && "id" in row ? row : null;
          return (
            <li key={row.key} className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-2 py-3">
              <span className="text-xs font-black text-slate-600">{index + 1}</span>
              <div className="min-w-0">
                {route ? <Link className="break-words text-xs font-black text-slate-200 hover:text-emerald-200" href={`/logistica?view=rutas&route=${encodeURIComponent(route.id)}`}>{row.label} · {formatDate(route.date)}</Link> : <p className="break-words text-xs font-black text-slate-200">{row.label}</p>}
                <p className="mt-1 text-[10px] font-bold leading-relaxed text-slate-500">{count(row.deliveries, "entrega", "entregas")} · {formatStatisticNumber(row.deliveredBoxes)} cajas · {count(row.pickups, "recolección", "recolecciones")} · {formatStatisticNumber(row.collectedBoxes)} cajas</p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function StatisticsLogisticsAnalytics({ dashboard }: { dashboard: StatisticsDashboard }) {
  const analytics = dashboard.logisticsAnalytics;
  const topPostal = maxBy(analytics.rankings.postalCodes, (row) => row.deliveredBoxes);
  const topDeliveryRoute = maxBy(analytics.rankings.routes, (row) => row.deliveries);
  const topPickupRoute = maxBy(analytics.rankings.routes, (row) => row.pickups);
  const topVehicle = maxBy(analytics.rankings.vehicles, (row) => row.deliveredBoxes + row.collectedBoxes);
  const topDriver = maxBy(analytics.rankings.drivers, (row) => row.deliveries);

  return (
    <>
      <CoverageNotice dashboard={dashboard} />
      <section className="border-b border-black/70" aria-labelledby="logistics-summary-title">
        <div className="px-3 py-5 sm:px-5">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-300">Operación completada</p>
          <h2 id="logistics-summary-title" className="mt-1 text-lg font-black text-slate-50 sm:text-xl">Pulso logístico del periodo</h2>
          <p className="mt-1 text-xs font-bold text-slate-500">{count(analytics.summary.completedOperations, "operación finalizada", "operaciones finalizadas")} con evidencia de cierre.</p>
        </div>
        <dl className="grid grid-cols-2 gap-px bg-black sm:grid-cols-4">
          <SummaryMetric label="Entregas completadas" value={formatStatisticNumber(analytics.summary.deliveryOperations)} detail="Paradas de caja vacía" icon={PackageCheck} tone="text-emerald-300" />
          <SummaryMetric label="Cajas entregadas" value={knownBoxes(analytics.summary.deliveredBoxes, analytics.summary.deliveryBoxOperations, analytics.summary.deliveryOperations)} detail="Unidades con cantidad persistida" icon={PackageOpen} tone="text-emerald-300" />
          <SummaryMetric label="Recolecciones completadas" value={formatStatisticNumber(analytics.summary.pickupOperations)} detail="Paradas de caja llena" icon={PackageCheck} tone="text-sky-300" />
          <SummaryMetric label="Cajas recogidas" value={knownBoxes(analytics.summary.collectedBoxes, analytics.summary.pickupBoxOperations, analytics.summary.pickupOperations)} detail="Unidades con cantidad persistida" icon={PackageOpen} tone="text-sky-300" />
        </dl>
      </section>

      <section className="border-b border-black/70" aria-labelledby="logistics-leaders-title">
        <div className="px-3 py-5 sm:px-5">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-300">Líderes del periodo</p>
          <h2 id="logistics-leaders-title" className="mt-1 text-lg font-black text-slate-50 sm:text-xl">Dónde y con quién se movieron más cajas</h2>
        </div>
        <div className="grid gap-px bg-black sm:grid-cols-2 xl:grid-cols-5">
          <Leader eyebrow="Zona" title="ZIP con más cajas entregadas" value={topPostal?.label} detail={topPostal ? `${formatStatisticNumber(topPostal.deliveredBoxes)} cajas · ${count(topPostal.deliveries, "entrega", "entregas")}` : undefined} icon={MapPin} />
          <Leader eyebrow="Ruta" title="Más entregas completadas" value={topDeliveryRoute ? `${topDeliveryRoute.label} · ${formatDate(topDeliveryRoute.date)}` : undefined} detail={topDeliveryRoute ? `${count(topDeliveryRoute.deliveries, "entrega", "entregas")} · ${formatStatisticNumber(topDeliveryRoute.deliveredBoxes)} cajas` : undefined} icon={Route} href={topDeliveryRoute ? `/logistica?view=rutas&route=${encodeURIComponent(topDeliveryRoute.id)}` : undefined} />
          <Leader eyebrow="Ruta" title="Más recolecciones completadas" value={topPickupRoute ? `${topPickupRoute.label} · ${formatDate(topPickupRoute.date)}` : undefined} detail={topPickupRoute ? `${count(topPickupRoute.pickups, "recolección", "recolecciones")} · ${formatStatisticNumber(topPickupRoute.collectedBoxes)} cajas` : undefined} icon={Route} href={topPickupRoute ? `/logistica?view=rutas&route=${encodeURIComponent(topPickupRoute.id)}` : undefined} />
          <Leader eyebrow="Flota" title="Vehículo con más cajas" value={topVehicle?.label} detail={topVehicle ? `${formatStatisticNumber(topVehicle.deliveredBoxes + topVehicle.collectedBoxes)} cajas · ${count(topVehicle.routes, "ruta", "rutas")}` : undefined} icon={Truck} />
          <Leader eyebrow="Equipo" title="Conductor con más entregas" value={topDriver?.label} detail={topDriver ? `${count(topDriver.deliveries, "entrega", "entregas")} · ${formatStatisticNumber(topDriver.deliveredBoxes)} cajas` : undefined} icon={UserRound} />
        </div>
      </section>

      <DailyActivity dashboard={dashboard} />

      <section className="border-b border-black/70 px-3 py-5 sm:px-5" aria-labelledby="logistics-ranking-title">
        <div className="flex items-center gap-3">
          <CalendarDays className="h-5 w-5 text-emerald-300" aria-hidden />
          <div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-300">Comparativos</p><h2 id="logistics-ranking-title" className="mt-1 text-lg font-black text-slate-50 sm:text-xl">Rankings logísticos completos</h2></div>
        </div>
        <div className="mt-4 grid gap-x-5 divide-y divide-black/70 lg:grid-cols-2 lg:divide-y-0 xl:grid-cols-4 xl:[&>*+*]:border-l xl:[&>*+*]:border-black/70 xl:[&>*+*]:pl-5">
          <RankingList title="Códigos postales" rows={analytics.rankings.postalCodes} />
          <RankingList title="Rutas operativas" rows={analytics.rankings.routes} routeLinks />
          <RankingList title="Vehículos" rows={analytics.rankings.vehicles} />
          <RankingList title="Conductores" rows={analytics.rankings.drivers} />
        </div>
      </section>
    </>
  );
}
