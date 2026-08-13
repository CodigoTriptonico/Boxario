import { isOrganizationManagementTab } from "@/components/config/organization-management-panel";
import { configSections, type ConfigSection } from "@/components/config/config-sections";

export type CostosPanel = "paises" | "deposito" | "rutas";

const COSTOS_PANELS = new Set<CostosPanel>(["paises", "deposito", "rutas"]);

export function parseCostosPanel(raw: string | null | undefined): CostosPanel {
  if (raw === "operativos") {
    return "paises";
  }

  // Compatibilidad: la pestaña Horarios pasó a Rutas.
  if (raw === "horarios") {
    return "rutas";
  }

  if (raw && COSTOS_PANELS.has(raw as CostosPanel)) {
    return raw as CostosPanel;
  }

  return "paises";
}

export function parseConfigUrl(params: URLSearchParams) {
  const view = params.get("view");
  const legacyManagementTab = isOrganizationManagementTab(view) ? view : null;
  const requestedTab = params.get("tab");
  const managementTab = isOrganizationManagementTab(requestedTab)
    ? requestedTab
    : legacyManagementTab || "company";

  return {
    section: legacyManagementTab
      ? ("organization" as ConfigSection)
      : configSections.includes(view as ConfigSection)
        ? (view as ConfigSection)
        : ("menu" as ConfigSection),
    managementTab,
    costosPanel: parseCostosPanel(params.get("panel")),
  };
}
