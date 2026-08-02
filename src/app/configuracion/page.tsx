import { ConfiguracionClient } from "@/components/configuracion-client";
import { sessionHasPermission } from "@/lib/auth/permissions";
import { requirePathAccess } from "@/lib/auth/require";
import { loadTimeClockDashboard, syncTimeClockAlertsForOrganization } from "@/lib/time-clock-data";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { redirect } from "next/navigation";
import { loadAxisSettingsAction } from "@/app/actions/axis-settings";

async function loadTimeClockInitialSnapshot(
  session: NonNullable<Awaited<ReturnType<typeof requirePathAccess>>>,
  canManage: boolean,
) {
  try {
    if (canManage) {
      await syncTimeClockAlertsForOrganization(session.organizationId);
    }
    return await loadTimeClockDashboard(session);
  } catch {
    return undefined;
  }
}

export default async function ConfiguracionPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const session = await requirePathAccess("/configuracion");
  const { view } = await searchParams;
  if (view === "deliveries") {
    redirect("/seguimiento?view=configuracion");
  }
  const canManageTimeClock = Boolean(session && sessionHasPermission(session, "time_clock.manage"));
  const canManageLogisticsSettings = Boolean(
    session &&
      (sessionHasPermission(session, "logistics.settings.manage") ||
        sessionHasPermission(session, "settings.manage")),
  );

  let initialPricing;
  let timeClockInitialSnapshot;
  let initialLogisticsSettings;

  if (isSupabaseConfigured() && session) {
    if (view === "timeclock") {
      timeClockInitialSnapshot = await loadTimeClockInitialSnapshot(session, canManageTimeClock);
    } else {
      try {
        const { loadPricingConfigForSession } = await import("@/lib/pricing/load-config");
        initialPricing = await loadPricingConfigForSession(session);
      } catch {
        initialPricing = undefined;
      }

      if (view === "prices" && canManageLogisticsSettings) {
        const axisSettingsResult = await loadAxisSettingsAction();
        if (axisSettingsResult.ok) {
          initialLogisticsSettings = axisSettingsResult.data?.logistics;
        }
      }
    }
  }

  return (
    <ConfiguracionClient
      initialPricing={initialPricing}
      timeClockInitialSnapshot={timeClockInitialSnapshot}
      canManageTimeClock={canManageTimeClock}
      agencyModuleEnabled={session?.agencyModuleEnabled ?? false}
      initialLogisticsSettings={initialLogisticsSettings}
      canManageOperatingCosts={canManageLogisticsSettings}
    />
  );
}
