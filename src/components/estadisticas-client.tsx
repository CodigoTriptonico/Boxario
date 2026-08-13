"use client";

import { AlertCircle, Building2, DatabaseZap, ShieldAlert, Truck } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { getStatisticsDashboardAction } from "@/app/actions/statistics-dashboard";
import { StatisticsDetailTables } from "@/components/estadisticas/statistics-detail-tables";
import { downloadStatisticsCsv } from "@/components/estadisticas/statistics-format";
import { StatisticsKpiStrip } from "@/components/estadisticas/statistics-kpis";
import { StatisticsLogisticsAnalytics } from "@/components/estadisticas/statistics-logistics-analytics";
import {
  statisticsStateFromSearchParams,
  statisticsStateToSearchParams,
  type StatisticsUrlState,
  type StatisticsWorkspaceTab,
} from "@/components/estadisticas/statistics-period";
import {
  StatisticsAgenciesSection,
  StatisticsAttentionSection,
  StatisticsDataQuality,
  StatisticsFinanceSection,
  StatisticsInventorySection,
  StatisticsOperationsSection,
  StatisticsRankingsSection,
  StatisticsRoutesSection,
} from "@/components/estadisticas/statistics-sections";
import { StatisticsToolbar } from "@/components/estadisticas/statistics-toolbar";
import { StatisticsTrendChart } from "@/components/estadisticas/statistics-trend-chart";
import { AppTabs, type AppTabDefinition } from "@/components/app-tabs";
import { secondaryButtonClass } from "@/components/ui-blocks";
import type { StatisticsDashboard } from "@/lib/statistics/types";

function StatisticsSkeleton() {
  return (
    <main className="w-full min-w-0 self-stretch" aria-label="Cargando estadísticas" aria-busy="true">
      <div className="overflow-hidden rounded-xl border border-black bg-surface-shell">
        <div className="flex flex-col gap-3 border-b border-black p-3 sm:flex-row sm:items-center sm:p-5"><div className="h-10 w-64 max-w-full animate-pulse rounded-xl bg-slate-800 motion-reduce:animate-none" /><div className="h-10 flex-1 animate-pulse rounded-lg bg-slate-800 motion-reduce:animate-none" /><div className="h-10 w-80 max-w-full animate-pulse rounded-lg bg-slate-800 motion-reduce:animate-none" /></div>
        <div className="grid grid-cols-2 border-b border-black sm:grid-cols-4">{Array.from({ length: 7 }).map((_, index) => <div key={index} className="border-l border-t border-black p-4 first:border-l-0"><div className="h-3 w-20 animate-pulse rounded bg-slate-800 motion-reduce:animate-none" /><div className="mt-4 h-7 w-24 max-w-full animate-pulse rounded bg-slate-700 motion-reduce:animate-none" /></div>)}</div>
        <div className="p-4 sm:p-5"><div className="h-72 animate-pulse rounded-lg bg-surface-inset motion-reduce:animate-none" /></div>
      </div>
    </main>
  );
}

function StatisticsError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <main className="w-full min-w-0 self-stretch">
      <section role="alert" className="rounded-xl border border-rose-900 bg-rose-950/20 p-5 sm:p-8">
        <AlertCircle className="h-7 w-7 text-rose-300" aria-hidden />
        <h1 className="mt-4 text-xl font-black text-slate-50">No pudimos cargar Estadísticas</h1>
        <p className="mt-2 max-w-2xl text-sm font-bold leading-relaxed text-slate-300">{message}</p>
        <button type="button" className={`${secondaryButtonClass} mt-5`} onClick={onRetry}>Volver a intentar</button>
      </section>
    </main>
  );
}

const STATISTICS_TABS: AppTabDefinition<StatisticsWorkspaceTab>[] = [
  { id: "company", label: "Compañía", icon: Building2 },
  { id: "logistics", label: "Logística", icon: Truck },
  { id: "risks", label: "Riesgos", icon: ShieldAlert },
];

function exportDashboard(dashboard: StatisticsDashboard, tab: StatisticsWorkspaceTab) {
  if (tab === "logistics") {
    const logisticsRows: Array<Array<string | number | null | undefined>> = [
      ["BOXARIO · ESTADÍSTICAS LOGÍSTICAS"],
      ["Periodo", dashboard.meta.period.from, dashboard.meta.period.to],
      ["Generado", dashboard.meta.generatedAt],
      [],
      ["DÍA", "Entregas", "Cajas entregadas", "Recolecciones", "Cajas recogidas"],
      ...dashboard.logisticsAnalytics.daily.map((row) => [
        row.date,
        row.deliveryOperations,
        row.deliveryBoxOperations > 0 ? row.deliveredBoxes : row.deliveryOperations > 0 ? null : 0,
        row.pickupOperations,
        row.pickupBoxOperations > 0 ? row.collectedBoxes : row.pickupOperations > 0 ? null : 0,
      ]),
      [],
      ["RUTAS", "Entregas", "Cajas entregadas", "Recolecciones", "Cajas recogidas"],
      ...dashboard.logisticsAnalytics.rankings.routes.map((row) => [`${row.label} · ${row.date}`, row.deliveries, row.deliveredBoxes, row.pickups, row.collectedBoxes]),
      [],
      ["VEHÍCULOS", "Entregas", "Cajas entregadas", "Recolecciones", "Cajas recogidas", "Rutas"],
      ...dashboard.logisticsAnalytics.rankings.vehicles.map((row) => [row.label, row.deliveries, row.deliveredBoxes, row.pickups, row.collectedBoxes, row.routes]),
      [],
      ["CONDUCTORES", "Entregas", "Cajas entregadas", "Recolecciones", "Cajas recogidas", "Rutas"],
      ...dashboard.logisticsAnalytics.rankings.drivers.map((row) => [row.label, row.deliveries, row.deliveredBoxes, row.pickups, row.collectedBoxes, row.routes]),
    ];
    downloadStatisticsCsv(`boxario-logistica-${dashboard.meta.period.from}-${dashboard.meta.period.to}.csv`, logisticsRows);
    return;
  }
  if (tab === "risks") {
    const riskRows: Array<Array<string | number | null | undefined>> = [
      ["BOXARIO · RIESGOS Y COBERTURA"],
      ["Periodo", dashboard.meta.period.from, dashboard.meta.period.to],
      ["Generado", dashboard.meta.generatedAt],
      [],
      ["RIESGOS", "Severidad", "Tipo", "Detalle", "Fecha", "Siguiente acción"],
      ...dashboard.attention.map((item) => [item.title, item.severity, item.kind, item.detail, item.occurredAt, item.href]),
      [],
      ["COBERTURA", "Disponibles", "Total", "Porcentaje", "Estado"],
      ...dashboard.meta.coverage.map((item) => [item.label, item.available, item.total, item.percent, item.status]),
      [],
      ["LÍMITES DE INTERPRETACIÓN", "Impacto", "Detalle"],
      ...dashboard.meta.limitations.map((item) => [item.title, item.impact, item.detail]),
    ];
    downloadStatisticsCsv(`boxario-riesgos-${dashboard.meta.period.from}-${dashboard.meta.period.to}.csv`, riskRows);
    return;
  }
  const rows: Array<Array<string | number | null | undefined>> = [
    ["BOXARIO · ESTADÍSTICAS"],
    ["Periodo", dashboard.meta.period.from, dashboard.meta.period.to],
    ["Generado", dashboard.meta.generatedAt],
    [],
    ["RESUMEN", "Valor actual", "Periodo anterior", "Variación %"],
    ...Object.entries(dashboard.kpis).map(([key, value]) => [key, value.value, value.previous, value.deltaPct]),
    [],
    ["ENVÍOS", "Código", "Cliente", "País", "Estado", "Venta", "Pagado", "Pendiente", "Cajas", "Fecha"],
    ...dashboard.tables.shipments.map((row) => ["envío", row.code, row.customerName, row.country, row.status, row.sales, row.paid, row.pending, row.boxes, row.createdAt]),
    [],
    ["COBROS", "Envío", "Cliente", "Método", "Monto", "Fecha"],
    ...dashboard.tables.payments.map((row) => ["cobro", row.shipmentCode, row.customerName, row.method, row.amount, row.createdAt]),
    [],
    ["TAREAS", "Envío", "Cliente", "Tipo", "Estado", "Ruta", "Conductor", "Programada"],
    ...dashboard.tables.tasks.map((row) => ["tarea", row.shipmentCode, row.customerName, row.taskType, row.status, row.routeName, row.driverName, row.scheduledAt]),
  ];
  downloadStatisticsCsv(`boxario-estadisticas-${dashboard.meta.period.from}-${dashboard.meta.period.to}.csv`, rows);
}

export function EstadisticasClient({
  initialDashboard,
  initialError,
  initialState,
}: {
  initialDashboard?: StatisticsDashboard;
  initialError?: string;
  initialState: StatisticsUrlState;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [dashboard, setDashboard] = useState(initialDashboard);
  const [state, setState] = useState(initialState);
  const [error, setError] = useState(initialError);
  const [busy, setBusy] = useState(false);
  const requestSequence = useRef(0);

  useEffect(() => {
    const view = searchParams.get("view");
    if (view === "auditoria") {
      const shipment = searchParams.get("shipment");
      router.replace(shipment ? `/seguimiento?audit=${encodeURIComponent(shipment)}` : "/seguimiento");
    } else if (view === "inventario") {
      router.replace("/inventario");
    }
  }, [router, searchParams]);

  const load = useCallback(async (nextState: StatisticsUrlState) => {
    const sequence = ++requestSequence.current;
    setBusy(true);
    setError(undefined);
    const result = await getStatisticsDashboardAction({
      from: nextState.from,
      to: nextState.to,
      compareFrom: nextState.compareFrom,
      compareTo: nextState.compareTo,
      filters: nextState.filters,
    });
    if (sequence !== requestSequence.current) return;
    if (result.ok) setDashboard(result.data);
    else setError(result.error);
    setBusy(false);
  }, []);

  const changeState = useCallback((nextState: StatisticsUrlState) => {
    setState(nextState);
    const query = statisticsStateToSearchParams(nextState).toString();
    window.history.replaceState(window.history.state, "", query ? `/estadisticas?${query}` : "/estadisticas");
    void load(nextState);
  }, [load]);

  const changeTab = useCallback((tab: StatisticsWorkspaceTab) => {
    const nextState = { ...state, tab };
    setState(nextState);
    const query = statisticsStateToSearchParams(nextState).toString();
    window.history.replaceState(window.history.state, "", query ? `/estadisticas?${query}` : "/estadisticas");
  }, [state]);

  useEffect(() => {
    const onPopState = () => {
      const nextState = statisticsStateFromSearchParams(new URLSearchParams(window.location.search));
      setState(nextState);
      void load(nextState);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [load]);

  if (!dashboard && busy) return <StatisticsSkeleton />;
  if (!dashboard) return <StatisticsError message={error ?? "El informe no está disponible en este momento."} onRetry={() => void load(state)} />;

  const availableTabs = STATISTICS_TABS
    .filter((tab) => tab.id !== "logistics" || dashboard.capabilities.logistics)
    .map((tab) => tab.id === "risks" ? { ...tab, badge: dashboard.attention.length } : tab);
  const activeTab: StatisticsWorkspaceTab = availableTabs.some((tab) => tab.id === state.tab) ? state.tab : "company";
  const hasPeriodActivity = activeTab === "logistics"
    ? dashboard.logisticsAnalytics.summary.completedOperations > 0 || dashboard.tables.tasks.length > 0
    : activeTab === "risks"
      ? true
      : dashboard.kpis.sales.value > 0 || dashboard.kpis.collections.value > 0 || dashboard.kpis.shipments.value > 0;

  return (
    <main className="w-full min-w-0 self-stretch">
      <div className="overflow-visible rounded-xl border border-black bg-surface-shell shadow-[0_16px_50px_rgba(0,0,0,0.18)]" aria-busy={busy}>
        <div className="print:hidden">
          <StatisticsToolbar
            navigation={<AppTabs tabs={availableTabs} value={activeTab} onChange={changeTab} size="compact" fitMobile ariaLabel="Sección de estadísticas" />}
            state={state}
            generatedAt={dashboard.meta.generatedAt}
            filterOptions={dashboard.filterOptions}
            busy={busy}
            onChange={changeState}
            onRefresh={() => void load(state)}
            onExport={() => exportDashboard(dashboard, activeTab)}
            onPrint={() => window.print()}
          />
        </div>

        {error ? (
          <div role="alert" className="flex flex-col gap-3 border-b border-rose-900 bg-rose-950/20 px-3 py-3 sm:flex-row sm:items-center sm:px-5">
            <AlertCircle className="h-5 w-5 shrink-0 text-rose-300" aria-hidden />
            <p className="min-w-0 flex-1 text-sm font-bold text-rose-100">No se pudo actualizar. Conservamos el último informe válido. {error}</p>
            <button type="button" className={secondaryButtonClass} onClick={() => void load(state)}>Reintentar</button>
          </div>
        ) : null}

        {!hasPeriodActivity ? (
          <div className="flex items-start gap-3 border-b border-black/70 bg-surface-inset/50 px-3 py-4 sm:px-5">
            <DatabaseZap className="h-5 w-5 shrink-0 text-slate-500" aria-hidden />
            <div><p className="text-sm font-black text-slate-200">Sin actividad para este periodo y filtros</p><p className="mt-1 text-xs font-bold text-slate-500">Prueba ampliar las fechas o retirar un filtro. Los saldos de inventario y backlog siguen siendo fotografías actuales cuando tu permiso los incluye.</p></div>
          </div>
        ) : null}

        <div role="tabpanel" aria-label={activeTab === "logistics" ? "Estadísticas de logística" : activeTab === "risks" ? "Riesgos y atención requerida" : "Estadísticas de la compañía"}>
          {activeTab === "logistics" ? (
            <>
              <StatisticsLogisticsAnalytics dashboard={dashboard} />
              <StatisticsOperationsSection dashboard={dashboard} />
              <StatisticsRoutesSection dashboard={dashboard} />
              <StatisticsDetailTables dashboard={dashboard} mode="logistics" />
            </>
          ) : activeTab === "risks" ? (
            <>
              <StatisticsAttentionSection dashboard={dashboard} />
              <StatisticsDataQuality dashboard={dashboard} />
            </>
          ) : (
            <>
              <StatisticsKpiStrip dashboard={dashboard} />
              <StatisticsTrendChart dashboard={dashboard} />
              <StatisticsFinanceSection dashboard={dashboard} />
              <StatisticsAgenciesSection dashboard={dashboard} />
              <StatisticsRankingsSection dashboard={dashboard} />
              <StatisticsInventorySection dashboard={dashboard} />
              <StatisticsDetailTables dashboard={dashboard} />
            </>
          )}
        </div>

        <footer className="border-t border-black/70 px-3 py-3 text-xs font-bold text-slate-600 sm:px-5">
          Zona operativa: {dashboard.meta.timeZone} · Moneda: {dashboard.meta.currency} · Las cifras respetan el alcance de la sesión actual.
        </footer>
      </div>
    </main>
  );
}
