import { EnviosPageContent } from "@/components/envios-page-content";
import { loadAxisSettingsAction } from "@/app/actions/axis-settings";
import { SalesSettingsPanel } from "@/components/settings/sales-settings-panel";
import { sessionHasPermission } from "@/lib/auth/permissions";
import { requirePathAccess } from "@/lib/auth/require";

export default async function SeguimientoPage({
  searchParams,
}: {
  searchParams?: Promise<{ view?: string }>;
}) {
  const params = await searchParams;
  if (params?.view === "configuracion") {
    const session = await requirePathAccess("/seguimiento");
    if (
      !session ||
      (!sessionHasPermission(session, "sales.settings.manage") &&
        !sessionHasPermission(session, "settings.manage"))
    ) {
      return <EnviosPageContent mode="tracking" />;
    }

    const result = await loadAxisSettingsAction();
    if (result.ok) {
      return <SalesSettingsPanel initialSettings={result.data.sales} />;
    }
  }

  return <EnviosPageContent mode="tracking" />;
}
