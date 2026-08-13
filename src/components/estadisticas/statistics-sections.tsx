"use client";

import {
  AlertTriangle,
  ArrowUpRight,
  Boxes,
  CircleDollarSign,
  ClipboardCheck,
  PackageSearch,
  ShieldAlert,
  Warehouse,
} from "lucide-react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import type {
  StatisticsAgencyRow,
  StatisticsCountRow,
  StatisticsDashboard,
  StatisticsDimensionRankingRow,
  StatisticsDriverRankingRow,
  StatisticsProductRankingRow,
  StatisticsRouteRankingRow,
  StatisticsSellerRankingRow,
} from "@/lib/statistics/types";
import { CompactInfoDisclosure } from "@/components/ui-blocks";
import { formatStatisticMoney, formatStatisticNumber } from "./statistics-format";

function humanize(value: string) {
  const known: Record<string, string> = {
    pending: "Pendiente",
    open: "Abierta",
    paid: "Pagada",
    partial: "Parcial",
    completed: "Completada",
    scheduled: "Programada",
    assigned: "Asignada",
    failed: "Fallida",
    cancelled: "Cancelada",
    draft: "En preparación",
    planned: "Cerrada",
    in_progress: "En curso",
    cash: "Efectivo",
    card: "Tarjeta",
    check: "Cheque",
    transfer: "Transferencia",
    awaiting_full_box: "Esperando caja llena",
    awaiting_empty_box: "Esperando caja vacía",
    in_transit: "En tránsito",
    received: "Recibida",
    stored: "En bodega",
    loaded: "Cargada",
    delivered: "Entregada",
  };
  return known[value] ?? value.replaceAll("_", " ").replace(/(^|\s)\p{L}/gu, (letter) => letter.toUpperCase());
}

function countLabel(value: number, singular: string, plural: string) {
  return `${formatStatisticNumber(value)} ${value === 1 ? singular : plural}`;
}

function attentionTitle(kind: StatisticsDashboard["attention"][number]["kind"], fallback: string) {
  const labels: Record<typeof kind, string> = {
    overdue_task: "Tarea vencida",
    operational_exception: "Excepción operativa",
    weight_review: "Diferencia de peso sin revisar",
    custody_handoff: "Custodia pendiente de recibir",
    financial_hold: "Retención financiera activa",
    low_stock: "Inventario bajo mínimo",
  };
  return labels[kind] ?? fallback;
}

function attentionDetail(value: string) {
  return value
    .replaceAll("deliver_empty_box", "entrega de caja vacía")
    .replaceAll("pickup_full_box", "recolección de caja llena");
}

function SectionHeading({ eyebrow, title, detail, info }: { eyebrow: string; title: string; detail?: string; info?: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-300">{eyebrow}</p>
        <h2 className="mt-1 text-lg font-black text-slate-50 sm:text-xl">{title}</h2>
        {detail ? <p className="mt-1 text-xs font-bold leading-relaxed text-slate-500">{detail}</p> : null}
      </div>
      {info ? <span className="[&>button]:h-11 [&>button]:w-11"><CompactInfoDisclosure ariaLabel={`Información sobre ${title}`} align="right">{info}</CompactInfoDisclosure></span> : null}
    </div>
  );
}

function Metric({ label, value, detail, tone = "text-slate-50" }: { label: string; value: string; detail?: string; tone?: string }) {
  return (
    <div className="min-w-0 border-t border-black/60 py-3 first:border-t-0">
      <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 break-words text-xl font-black ${tone}`}>{value}</p>
      {detail ? <p className="mt-1 text-xs font-bold text-slate-500">{detail}</p> : null}
    </div>
  );
}

function EmptyBlock({ text }: { text: string }) {
  return <p className="rounded-lg border border-dashed border-slate-700 px-4 py-7 text-center text-sm font-bold text-slate-400">{text}</p>;
}

function CountBars({ rows, currency }: { rows: StatisticsCountRow[]; currency: string }) {
  const max = Math.max(1, ...rows.map((row) => row.amount ?? row.count));
  if (!rows.length) return <EmptyBlock text="No hay actividad en este periodo y alcance." />;
  return (
    <ul className="grid gap-3">
      {rows.map((row) => {
        const value = row.amount ?? row.count;
        return (
          <li key={row.key}>
            <div className="mb-1.5 flex items-baseline justify-between gap-3 text-xs font-black">
              <span className="min-w-0 break-words text-slate-300">{humanize(row.label)}</span>
              <span className="shrink-0 text-slate-100">{row.amount == null ? formatStatisticNumber(row.count) : formatStatisticMoney(row.amount, currency)}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-800" role="progressbar" aria-label={humanize(row.label)} aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
              <div className="h-full rounded-full bg-emerald-400" style={{ width: `${Math.max(value > 0 ? 4 : 0, (value / max) * 100)}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

type RankingItem = { key: string; label: string; primary: number; secondary: string; href?: string | null };

function RankingBars({ rows, currency, money = true }: { rows: RankingItem[]; currency: string; money?: boolean }) {
  const max = Math.max(1, ...rows.map((row) => row.primary));
  if (!rows.length) return <EmptyBlock text="No hay datos suficientes para construir este ranking." />;
  return (
    <ol className="grid gap-3">
      {rows.slice(0, 8).map((row, index) => (
        <li key={row.key} className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-2">
          <span className="pt-0.5 text-xs font-black text-slate-600">{index + 1}</span>
          <div className="min-w-0">
            <div className="flex items-start justify-between gap-3 text-xs font-black">
              {row.href ? <Link className="min-w-0 break-words text-slate-200 hover:text-emerald-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300" href={row.href}>{row.label}</Link> : <span className="min-w-0 break-words text-slate-200">{row.label}</span>}
              <span className="shrink-0 text-right text-slate-100">{money ? formatStatisticMoney(row.primary, currency) : formatStatisticNumber(row.primary)}</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-emerald-400" style={{ width: `${Math.max(row.primary > 0 ? 3 : 0, (row.primary / max) * 100)}%` }} /></div>
            <p className="mt-1 text-[10px] font-bold text-slate-500">{row.secondary}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function Subsection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0 border-t border-black/70 pt-4 first:border-t-0 first:pt-0 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0 lg:first:border-l-0 lg:first:pl-0">
      <h3 className="mb-4 text-sm font-black text-slate-200">{title}</h3>
      {children}
    </div>
  );
}

export function StatisticsFinanceSection({ dashboard }: { dashboard: StatisticsDashboard }) {
  if (!dashboard.capabilities.finance) return null;
  return (
    <section className="border-b border-black/70 px-3 py-5 sm:px-5">
      <SectionHeading eyebrow="Ventas y finanzas" title="Caja, cartera y estado de facturas" detail="Los cobros se atribuyen a la fecha del pago; el pendiente es una fotografía actual de las ventas del periodo." info="Cobrado y facturado son flujos con fechas propias. El saldo pendiente no reconstruye una cartera histórica al cierre del periodo." />
      <div className="mt-5 grid gap-5 lg:grid-cols-[0.8fr_1.15fr_1fr]">
        <Subsection title="Resumen financiero">
          <Metric label="Facturado en el periodo" value={formatStatisticMoney(dashboard.finance.billed, dashboard.meta.currency)} />
          <Metric label="Cobrado en el periodo" value={formatStatisticMoney(dashboard.finance.collected, dashboard.meta.currency)} tone="text-emerald-300" />
          <Metric label="Pendiente actual" value={formatStatisticMoney(dashboard.finance.pending, dashboard.meta.currency)} tone={dashboard.finance.pending > 0 ? "text-amber-200" : "text-slate-50"} />
          <Metric label="Ticket promedio" value={formatStatisticMoney(dashboard.finance.averageTicket, dashboard.meta.currency)} />
        </Subsection>
        <Subsection title="Estado de facturas">
          <CountBars rows={dashboard.finance.byStatus} currency={dashboard.meta.currency} />
          <p className="mt-4 text-xs font-bold text-slate-500">{formatStatisticNumber(dashboard.finance.paidInvoices)} pagadas · {formatStatisticNumber(dashboard.finance.openInvoices)} abiertas</p>
        </Subsection>
        <Subsection title="Métodos de pago">
          <CountBars rows={dashboard.finance.paymentMethods ?? []} currency={dashboard.meta.currency} />
        </Subsection>
      </div>
    </section>
  );
}

export function StatisticsOperationsSection({ dashboard }: { dashboard: StatisticsDashboard }) {
  if (!dashboard.capabilities.logistics) return null;
  return (
    <section className="border-b border-black/70 px-3 py-5 sm:px-5">
      <SectionHeading eyebrow="Logística y operación" title="Flujo operativo y cuellos de botella" detail="Los flujos del periodo se mantienen separados del backlog actual." />
      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Subsection title="Tareas"><CountBars rows={dashboard.logistics.tasks} currency={dashboard.meta.currency} /></Subsection>
        <Subsection title="Rutas"><CountBars rows={dashboard.logistics.routes} currency={dashboard.meta.currency} /></Subsection>
        <Subsection title="Cajas físicas"><CountBars rows={dashboard.logistics.packages} currency={dashboard.meta.currency} /></Subsection>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-black bg-black sm:max-w-lg">
        <div className="bg-surface-inset p-3"><p className="text-[10px] font-black uppercase text-slate-500">Excepciones abiertas</p><p className={`mt-1 text-2xl font-black ${dashboard.logistics.exceptions ? "text-rose-300" : "text-slate-50"}`}>{formatStatisticNumber(dashboard.logistics.exceptions)}</p></div>
        <div className="bg-surface-inset p-3"><p className="text-[10px] font-black uppercase text-slate-500">Custodias pendientes</p><p className={`mt-1 text-2xl font-black ${dashboard.logistics.pendingCustody ? "text-amber-200" : "text-slate-50"}`}>{formatStatisticNumber(dashboard.logistics.pendingCustody)}</p></div>
      </div>
    </section>
  );
}

export function StatisticsRankingsSection({ dashboard }: { dashboard: StatisticsDashboard }) {
  const finance = dashboard.capabilities.finance;
  const sellerRows: RankingItem[] = dashboard.rankings.sellers.map((row: StatisticsSellerRankingRow) => ({
    key: row.id ?? row.label,
    label: row.label,
    primary: finance ? row.sales : row.shipments,
    secondary: finance
      ? `${countLabel(row.shipments, "envío", "envíos")} · ${countLabel(row.customers, "cliente", "clientes")} · ${formatStatisticMoney(row.pending, dashboard.meta.currency)} pendiente`
      : `${countLabel(row.customers, "cliente", "clientes")} · ${countLabel(row.boxes, "caja", "cajas")}`,
  }));
  const countryRows: RankingItem[] = dashboard.rankings.countries.map((row: StatisticsDimensionRankingRow) => ({ key: row.key, label: row.label, primary: finance ? row.sales : row.shipments, secondary: `${countLabel(row.shipments, "envío", "envíos")} · ${countLabel(row.boxes, "caja", "cajas")}` }));
  const productRows: RankingItem[] = dashboard.rankings.products.map((row: StatisticsProductRankingRow) => ({ key: row.key, label: row.label, primary: row.quantity, secondary: `${formatStatisticMoney(row.sales, dashboard.meta.currency)} · ${countLabel(row.shipments, "envío", "envíos")}` }));
  return (
    <section className="border-b border-black/70 px-3 py-5 sm:px-5">
      <SectionHeading eyebrow="Mercado y equipo" title="Países, vendedores y productos" detail="Rankings basados únicamente en líneas, clientes y responsables identificados en la fuente de verdad." />
      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Subsection title={finance ? "Ventas por país" : "Envíos por país"}><RankingBars rows={countryRows} currency={dashboard.meta.currency} money={finance} /></Subsection>
        <Subsection title={finance ? "Ventas por vendedor" : "Envíos por responsable"}><RankingBars rows={sellerRows} currency={dashboard.meta.currency} money={finance} /></Subsection>
        <Subsection title="Productos o cajas"><RankingBars rows={productRows} currency={dashboard.meta.currency} money={false} /></Subsection>
      </div>
    </section>
  );
}

export function StatisticsRoutesSection({ dashboard }: { dashboard: StatisticsDashboard }) {
  if (!dashboard.capabilities.logistics || (!dashboard.rankings.routes.length && !dashboard.rankings.drivers.length)) return null;
  const routeRows: RankingItem[] = dashboard.rankings.routes.map((row: StatisticsRouteRankingRow) => ({ key: row.id, label: row.label, primary: row.stops, secondary: `${countLabel(row.completedStops, "completada", "completadas")} · ${row.driverName ?? "Sin conductor"} · ${humanize(row.status)}`, href: `/logistica?view=rutas&route=${encodeURIComponent(row.id)}` }));
  const driverRows: RankingItem[] = dashboard.rankings.drivers.map((row: StatisticsDriverRankingRow) => ({ key: row.id, label: row.label, primary: row.completedStops, secondary: `${countLabel(row.routes, "ruta", "rutas")} · ${countLabel(row.tasks, "tarea", "tareas")} · ${countLabel(row.completedTasks, "tarea completada", "tareas completadas")}` }));
  return (
    <section className="border-b border-black/70 px-3 py-5 sm:px-5">
      <SectionHeading eyebrow="Rutas y conductores" title="Actividad operativa verificable" detail="Las visitas completadas provienen de resultados operativos; los cobros permanecen en el ledger de pagos." />
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Subsection title="Rutas con más actividad"><RankingBars rows={routeRows} currency={dashboard.meta.currency} money={false} /></Subsection>
        <Subsection title="Conductores por paradas completadas"><RankingBars rows={driverRows} currency={dashboard.meta.currency} money={false} /></Subsection>
      </div>
    </section>
  );
}

export function StatisticsAgenciesSection({ dashboard }: { dashboard: StatisticsDashboard }) {
  if (!dashboard.capabilities.agencies) return null;
  if (!dashboard.capabilities.agencyFinance) {
    return (
      <section className="border-b border-black/70 px-3 py-5 sm:px-5">
        <SectionHeading eyebrow="Agencias" title="Red comercial dentro del alcance" detail="Tu permiso permite consultar la red, pero no saldos, cobros ni deuda intercompañía." />
        <div className="mt-5"><EmptyBlock text="Los datos financieros de agencia se omiten en la consulta; no se sustituyen por ceros ni se ocultan solo en la interfaz." /></div>
      </section>
    );
  }
  if (!dashboard.agencies.rows.length) {
    return (
      <section className="border-b border-black/70 px-3 py-5 sm:px-5">
        <SectionHeading eyebrow="Agencias" title="Red comercial y obligaciones separadas" detail="No hay agencias con registros disponibles en el motor financiero para este alcance." />
        <div className="mt-5"><EmptyBlock text="No mostramos saldos en cero como prueba de ausencia de actividad. Cuando existan registros autoritativos de agencia, aparecerán separados de la deuda de clientes." /></div>
      </section>
    );
  }
  const rows: RankingItem[] = dashboard.agencies.rows.map((row: StatisticsAgencyRow) => ({ key: row.id, label: `${row.label} · ${row.code}`, primary: row.sales, secondary: `${countLabel(row.shipments, "envío", "envíos")} · ${formatStatisticMoney(row.agencyReceivable, dashboard.meta.currency)} debe a matriz`, href: `/agencias/${encodeURIComponent(row.id)}` }));
  return (
    <section className="border-b border-black/70 px-3 py-5 sm:px-5">
      <SectionHeading eyebrow="Agencias" title="Red comercial y obligaciones separadas" detail="La deuda de la agencia hacia la matriz nunca se suma con la deuda de sus clientes." info="Los tres saldos pertenecen a cuentas distintas. Un cero no se interpreta como ausencia de actividad cuando el motor financiero no tiene cobertura." />
      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_1.4fr]">
        <Subsection title="Saldos del módulo de agencias">
          <Metric label="Agencias deben a matriz" value={formatStatisticMoney(dashboard.agencies.agencyReceivable, dashboard.meta.currency)} tone={dashboard.agencies.agencyReceivable > 0 ? "text-amber-200" : "text-slate-50"} />
          <Metric label="Clientes locales deben a agencias" value={formatStatisticMoney(dashboard.agencies.customerReceivable, dashboard.meta.currency)} />
          <Metric label="Pagos de agencia sin aplicar" value={formatStatisticMoney(dashboard.agencies.unappliedAgencyPayments, dashboard.meta.currency)} />
        </Subsection>
        <Subsection title="Actividad por agencia"><RankingBars rows={rows} currency={dashboard.meta.currency} /></Subsection>
      </div>
    </section>
  );
}

export function StatisticsInventorySection({ dashboard }: { dashboard: StatisticsDashboard }) {
  if (!dashboard.capabilities.inventory) return null;
  const inventory = dashboard.inventory;
  return (
    <section className="border-b border-black/70 px-3 py-5 sm:px-5">
      <SectionHeading eyebrow="Inventario" title="Disponibilidad y cobertura de costos" detail="Disponible = stock menos reservado. Asignado y no disponible se informan por separado." info="El valor estimado solo aparece cuando hay costo unitario real suficiente. Los ajustes absolutos de inventario no se suman como movimientos netos." />
      <div className="mt-5 grid gap-5 lg:grid-cols-[1.1fr_1fr]">
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-black bg-black sm:grid-cols-3">
          {[
            ["Stock", inventory.stock, "text-slate-50"],
            ["Disponible", inventory.available, "text-emerald-300"],
            ["Reservado", inventory.reserved, "text-amber-200"],
            ["Asignado", inventory.assigned, "text-sky-300"],
            ["No disponible", inventory.unavailable, "text-rose-300"],
          ].map(([label, value, tone]) => <div key={String(label)} className="bg-surface-inset p-3"><p className="text-[10px] font-black uppercase text-slate-500">{label}</p><p className={`mt-1 text-xl font-black ${tone}`}>{formatStatisticNumber(Number(value))}</p></div>)}
          <div className="bg-surface-inset p-3"><p className="text-[10px] font-black uppercase text-slate-500">Valor estimado</p><p className="mt-1 break-words text-xl font-black text-slate-50">{inventory.estimatedValue === null ? "No disponible" : formatStatisticMoney(inventory.estimatedValue, dashboard.meta.currency)}</p><p className="mt-1 text-[10px] font-bold text-slate-500">Cobertura {formatStatisticNumber(inventory.valuationCoveragePct)}%</p></div>
        </div>
        <Subsection title="Productos con stock bajo"><CountBars rows={inventory.lowStockItems.map((row) => ({ ...row, amount: undefined }))} currency={dashboard.meta.currency} /></Subsection>
      </div>
    </section>
  );
}

const ATTENTION_ICON: Record<string, LucideIcon> = {
  overdue_task: ClipboardCheck,
  operational_exception: ShieldAlert,
  weight_review: PackageSearch,
  custody_handoff: Boxes,
  financial_hold: CircleDollarSign,
  low_stock: Warehouse,
};

export function StatisticsAttentionSection({ dashboard }: { dashboard: StatisticsDashboard }) {
  const items = dashboard.attention;
  return (
    <section className="border-b border-black/70 px-3 py-5 sm:px-5">
      <SectionHeading eyebrow="Atención requerida" title="Riesgos con evidencia y siguiente acción" detail="Solo aparecen condiciones verificables; no se aplican umbrales arbitrarios de rendimiento o vigilancia." />
      {items.length ? (
        <div className="mt-5 grid gap-2 lg:grid-cols-2">
          {items.map((item) => {
            const Icon = ATTENTION_ICON[item.kind] ?? AlertTriangle;
            const shell = item.severity === "critical" ? "border-rose-900/80 bg-rose-950/20" : item.severity === "warning" ? "border-amber-900/80 bg-amber-950/20" : "border-slate-700 bg-surface-inset";
            const content = (
              <>
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-black ${item.severity === "critical" ? "bg-rose-400 text-slate-950" : item.severity === "warning" ? "bg-amber-300 text-slate-950" : "bg-slate-700 text-slate-100"}`}><Icon className="h-5 w-5" aria-hidden /></span>
                <span className="min-w-0 flex-1"><span className="block font-black text-slate-100">{attentionTitle(item.kind, item.title)}</span><span className="mt-1 block text-xs font-bold leading-relaxed text-slate-400">{attentionDetail(item.detail)}</span></span>
                {item.href ? <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden /> : null}
              </>
            );
            return item.href ? <Link key={`${item.kind}:${item.id}`} href={item.href} className={`flex min-h-16 items-start gap-3 rounded-lg border p-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300 ${shell}`}>{content}</Link> : <article key={`${item.kind}:${item.id}`} className={`flex min-h-16 items-start gap-3 rounded-lg border p-3 ${shell}`}>{content}</article>;
          })}
        </div>
      ) : <div className="mt-5"><EmptyBlock text="No hay elementos de atención respaldados por datos para este alcance." /></div>}
    </section>
  );
}

export function StatisticsDataQuality({ dashboard }: { dashboard: StatisticsDashboard }) {
  const coverage = dashboard.meta.coverage.filter((item) => item.status !== "complete");
  if (!coverage.length && !dashboard.meta.limitations.length) return null;
  return (
    <section className="px-3 py-5 sm:px-5">
      <SectionHeading eyebrow="Calidad de datos" title="Cobertura y límites de interpretación" detail="Estas notas evitan convertir ausencias o snapshots parciales en cifras engañosas." />
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {coverage.map((item) => <article key={item.key} className="border-l-2 border-amber-400 pl-3"><p className="text-sm font-black text-slate-200">{item.label}</p><p className="mt-1 text-xs font-bold text-slate-500">{formatStatisticNumber(item.available)} de {formatStatisticNumber(item.total)} registros · {formatStatisticNumber(item.percent)}% de cobertura</p></article>)}
        {dashboard.meta.limitations.map((item) => <article key={item.key} className={`border-l-2 pl-3 ${item.impact === "warning" ? "border-amber-400" : "border-sky-400"}`}><p className="text-sm font-black text-slate-200">{item.title}</p><p className="mt-1 text-xs font-bold leading-relaxed text-slate-500">{item.detail}</p></article>)}
      </div>
    </section>
  );
}
