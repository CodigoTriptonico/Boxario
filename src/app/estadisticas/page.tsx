import { redirect } from "next/navigation";
import { getStatisticsDashboardAction } from "@/app/actions/statistics-dashboard";
import { EstadisticasClient } from "@/components/estadisticas-client";
import { statisticsStateFromParams } from "@/components/estadisticas/statistics-period";
import { requirePathAccess } from "@/lib/auth/require";
import { isSupabaseConfigured } from "@/lib/supabase/env";

type StatisticsSearchParams = Record<string, string | string[] | undefined>;

export default async function EstadisticasPage({
  searchParams,
}: {
  searchParams: Promise<StatisticsSearchParams>;
}) {
  await requirePathAccess("/estadisticas");
  const params = await searchParams;
  const view = Array.isArray(params.view) ? params.view[0] : params.view;
  if (view === "auditoria") {
    const shipment = Array.isArray(params.shipment) ? params.shipment[0] : params.shipment;
    redirect(shipment ? `/seguimiento?audit=${encodeURIComponent(shipment)}` : "/seguimiento");
  }
  if (view === "inventario") redirect("/inventario");

  const initialState = statisticsStateFromParams(params);
  if (!isSupabaseConfigured()) {
    return <EstadisticasClient initialState={initialState} initialError="Supabase no está configurado." />;
  }

  const result = await getStatisticsDashboardAction({
    from: initialState.from,
    to: initialState.to,
    compareFrom: initialState.compareFrom,
    compareTo: initialState.compareTo,
    filters: initialState.filters,
  });

  return (
    <EstadisticasClient
      initialState={initialState}
      initialDashboard={result.ok ? result.data : undefined}
      initialError={result.ok ? undefined : result.error}
    />
  );
}
