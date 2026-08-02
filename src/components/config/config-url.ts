import { isOrganizationManagementTab } from "@/components/config/organization-management-panel";
import { configSections, type ConfigSection } from "@/components/config/config-sections";

export type CostosPanel = "paises" | "operativos";

export function parseConfigUrl(params: URLSearchParams) {
  const view = params.get("view");
  const legacyManagementTab = isOrganizationManagementTab(view) ? view : null;
  const requestedTab = params.get("tab");
  const managementTab = isOrganizationManagementTab(requestedTab)
    ? requestedTab
    : legacyManagementTab || "company";
  const costosPanel: CostosPanel = params.get("panel") === "operativos" ? "operativos" : "paises";

  return {
    section: legacyManagementTab
      ? ("organization" as ConfigSection)
      : configSections.includes(view as ConfigSection)
        ? (view as ConfigSection)
        : ("menu" as ConfigSection),
    managementTab,
    costosPanel,
  };
}
