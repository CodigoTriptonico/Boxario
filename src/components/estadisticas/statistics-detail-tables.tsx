"use client";

import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, ExternalLink, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { inputClass, secondaryButtonClass } from "@/components/ui-blocks";
import type { StatisticsDashboard } from "@/lib/statistics/types";
import { formatStatisticDateTime, formatStatisticMoney } from "./statistics-format";

type TableView = "shipments" | "payments" | "tasks";
type Cell = { key: string; label: string; value: string | number; display: string; money?: boolean };
type DetailRow = { id: string; search: string; href: string; title: string; subtitle: string; cells: Cell[] };

const PAGE_SIZE = 10;

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function rowsForView(view: TableView, dashboard: StatisticsDashboard): DetailRow[] {
  if (view === "payments") {
    return dashboard.tables.payments.map((row) => ({
      id: row.id,
      href: `/seguimiento/${encodeURIComponent(row.shipmentId)}/expediente`,
      title: row.shipmentCode,
      subtitle: row.customerName,
      search: normalize(`${row.shipmentCode} ${row.customerName} ${row.sellerName} ${row.method}`),
      cells: [
        { key: "shipment", label: "Envío", value: row.shipmentCode, display: row.shipmentCode },
        { key: "customer", label: "Cliente", value: row.customerName, display: row.customerName },
        { key: "seller", label: "Registrado por", value: row.sellerName, display: row.sellerName },
        { key: "method", label: "Método", value: row.method, display: row.method },
        { key: "amount", label: "Monto", value: row.amount, display: formatStatisticMoney(row.amount, dashboard.meta.currency), money: true },
        { key: "date", label: "Fecha", value: row.createdAt, display: formatStatisticDateTime(row.createdAt) },
      ],
    }));
  }

  if (view === "tasks") {
    return dashboard.tables.tasks.map((row) => ({
      id: row.id,
      href: `/seguimiento/${encodeURIComponent(row.shipmentId)}/expediente`,
      title: row.shipmentCode,
      subtitle: `${row.taskType} · ${row.status}`,
      search: normalize(`${row.shipmentCode} ${row.customerName} ${row.country} ${row.taskType} ${row.status} ${row.routeName ?? ""} ${row.driverName ?? ""}`),
      cells: [
        { key: "shipment", label: "Envío", value: row.shipmentCode, display: row.shipmentCode },
        { key: "customer", label: "Cliente", value: row.customerName, display: row.customerName },
        { key: "task", label: "Tarea", value: row.taskType, display: row.taskType },
        { key: "route", label: "Ruta", value: row.routeName ?? "", display: row.routeName ?? "Sin ruta" },
        { key: "driver", label: "Conductor", value: row.driverName ?? "", display: row.driverName ?? "Sin conductor" },
        { key: "status", label: "Estado", value: row.status, display: row.status },
        { key: "date", label: "Programada", value: row.scheduledAt, display: formatStatisticDateTime(row.scheduledAt) },
      ],
    }));
  }

  return dashboard.tables.shipments.map((row) => ({
    id: row.id,
    href: `/seguimiento/${encodeURIComponent(row.id)}/expediente`,
    title: row.code,
    subtitle: `${row.customerName} · ${row.country}`,
    search: normalize(`${row.code} ${row.customerName} ${row.country} ${row.status} ${row.invoiceStatus} ${row.sellerName} ${row.agencyName ?? ""}`),
    cells: [
      { key: "shipment", label: "Envío", value: row.code, display: row.code },
      { key: "customer", label: "Cliente", value: row.customerName, display: row.customerName },
      { key: "country", label: "País", value: row.country, display: row.country },
      ...(dashboard.capabilities.finance ? [
        { key: "sales", label: "Venta", value: row.sales, display: formatStatisticMoney(row.sales, dashboard.meta.currency), money: true },
        { key: "paid", label: "Pagado", value: row.paid, display: formatStatisticMoney(row.paid, dashboard.meta.currency), money: true },
        { key: "pending", label: "Pendiente", value: row.pending, display: formatStatisticMoney(row.pending, dashboard.meta.currency), money: true },
      ] : []),
      { key: "status", label: "Estado", value: row.status, display: row.status },
      { key: "date", label: "Creado", value: row.createdAt, display: formatStatisticDateTime(row.createdAt) },
    ],
  }));
}

export function StatisticsDetailTables({
  dashboard,
  mode = "company",
}: {
  dashboard: StatisticsDashboard;
  mode?: "company" | "logistics";
}) {
  const availableViews: TableView[] = mode === "logistics"
    ? ["tasks"]
    : dashboard.capabilities.finance
      ? ["shipments", "payments"]
      : ["shipments"];
  const [view, setView] = useState<TableView>(availableViews[0]);
  const effectiveView = availableViews.includes(view) ? view : availableViews[0];
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(0);
  const allRows = useMemo(() => rowsForView(effectiveView, dashboard), [dashboard, effectiveView]);
  const rows = useMemo(() => {
    const normalizedQuery = normalize(query.trim());
    const filtered = normalizedQuery ? allRows.filter((row) => row.search.includes(normalizedQuery)) : allRows;
    return [...filtered].sort((left, right) => {
      const leftValue = left.cells.find((cell) => cell.key === sortKey)?.value ?? "";
      const rightValue = right.cells.find((cell) => cell.key === sortKey)?.value ?? "";
      const comparison = typeof leftValue === "number" && typeof rightValue === "number"
        ? leftValue - rightValue
        : String(leftValue).localeCompare(String(rightValue), "es", { numeric: true });
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [allRows, query, sortDirection, sortKey]);
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const visibleRows = rows.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);
  const columns = allRows[0]?.cells ?? [];

  const toggleSort = (key: string) => {
    setPage(0);
    if (key === sortKey) setSortDirection((current) => current === "asc" ? "desc" : "asc");
    else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  const switchView = (next: TableView) => {
    setPage(0);
    setView(next);
    setSortKey("date");
    setSortDirection("desc");
  };

  return (
    <section className="border-b border-black/70 px-3 py-5 sm:px-5" aria-labelledby="statistics-detail-title">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-300">Detalle verificable</p>
          <h2 id="statistics-detail-title" className="mt-1 text-lg font-black text-slate-50 sm:text-xl">{mode === "logistics" ? "Tareas logísticas del periodo" : "Actividad comercial reciente"}</h2>
          <p className="mt-1 text-xs font-bold text-slate-500">{mode === "logistics" ? "Este detalle usa la fecha operativa programada; los indicadores superiores usan la finalización real." : "Listados acotados y agregados en servidor; abre el expediente para revisar la fuente."}</p>
        </div>
        {availableViews.length > 1 ? <div className="grid grid-cols-2 gap-1 rounded-lg border border-black bg-surface-inset p-1" role="tablist" aria-label="Tipo de detalle">
          {availableViews.map((value) => (
            <button key={value} type="button" role="tab" aria-selected={effectiveView === value} className={`min-h-11 rounded-md px-3 text-xs font-black ${effectiveView === value ? "bg-emerald-400 text-slate-950" : "text-slate-300 hover:bg-surface-card"}`} onClick={() => switchView(value)}>{value === "payments" ? "Cobros" : "Envíos"}</button>
          ))}
        </div> : null}
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <label className="relative block w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden />
          <span className="sr-only">Buscar en el detalle</span>
          <input className={`${inputClass} w-full pl-9`} value={query} onChange={(event) => { setPage(0); setQuery(event.target.value); }} placeholder="Buscar envío, cliente o estado" />
        </label>
        <p className="text-xs font-black text-slate-500" aria-live="polite">{rows.length} resultado{rows.length === 1 ? "" : "s"}</p>
      </div>

      {visibleRows.length ? (
        <>
          <div className="mt-4 hidden overflow-hidden rounded-lg border border-black xl:block">
            <table className="w-full border-collapse text-left text-xs">
              <thead className="bg-surface-card-header text-slate-400">
                <tr>
                  {columns.map((column) => <th key={column.key} scope="col" aria-sort={sortKey === column.key ? (sortDirection === "asc" ? "ascending" : "descending") : "none"} className={`border-b border-black px-3 py-3 font-black ${column.money ? "text-right" : ""}`}><button type="button" className={`inline-flex min-h-8 items-center gap-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300 ${column.money ? "ml-auto" : ""}`} onClick={() => toggleSort(column.key)}>{column.label}{sortKey === column.key ? sortDirection === "asc" ? <ArrowUp className="h-3 w-3" aria-hidden /> : <ArrowDown className="h-3 w-3" aria-hidden /> : null}</button></th>)}
                  <th scope="col" className="border-b border-black px-3 py-3"><span className="sr-only">Abrir</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/70 bg-surface-list-row">
                {visibleRows.map((row) => <tr key={row.id} className="hover:bg-surface-list-row-hover">{row.cells.map((cell) => <td key={cell.key} className={`max-w-48 px-3 py-3 font-bold text-slate-300 [overflow-wrap:anywhere] ${cell.money ? "text-right font-black text-slate-100" : ""}`}>{cell.display}</td>)}<td className="px-3 py-2 text-right"><Link href={row.href} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-black bg-surface-inset text-emerald-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300" aria-label={`Abrir expediente ${row.title}`}><ExternalLink className="h-4 w-4" aria-hidden /></Link></td></tr>)}
              </tbody>
            </table>
          </div>

          <div className="mt-4 grid gap-2 xl:hidden">
            {visibleRows.map((row) => <article key={row.id} className="rounded-lg border border-black bg-surface-list-row p-3"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="break-words font-black text-slate-100">{row.title}</p><p className="mt-1 break-words text-xs font-bold text-slate-500">{row.subtitle}</p></div><Link href={row.href} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-black bg-surface-inset text-emerald-300" aria-label={`Abrir expediente ${row.title}`}><ExternalLink className="h-4 w-4" aria-hidden /></Link></div><dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2">{row.cells.slice(2, 8).map((cell) => <div key={cell.key} className="min-w-0"><dt className="text-[9px] font-black uppercase text-slate-600">{cell.label}</dt><dd className="mt-0.5 break-words text-xs font-bold text-slate-300">{cell.display}</dd></div>)}</dl></article>)}
          </div>
        </>
      ) : <div className="mt-4"><p className="rounded-lg border border-dashed border-slate-700 p-8 text-center text-sm font-bold text-slate-400">No hay registros que coincidan con la búsqueda y los filtros.</p></div>}

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-black/60 pt-3">
        <button type="button" className={`${secondaryButtonClass} h-11`} disabled={safePage === 0} onClick={() => setPage((current) => Math.max(0, current - 1))}><ChevronLeft className="h-4 w-4" aria-hidden /> Anterior</button>
        <p className="text-xs font-black text-slate-500">Página {safePage + 1} de {pageCount}</p>
        <button type="button" className={`${secondaryButtonClass} h-11`} disabled={safePage >= pageCount - 1} onClick={() => setPage((current) => Math.min(pageCount - 1, current + 1))}>Siguiente <ChevronRight className="h-4 w-4" aria-hidden /></button>
      </div>
    </section>
  );
}
