"use client";

import { ClipboardList } from "lucide-react";
import type { LogisticsRouteCatalog as LogisticsRouteCatalogData } from "@/app/actions/logistics-routes";
import { AgencyLogisticsPanel } from "@/components/logistica/agency-logistics-panel";
import { CustomerRouteApprovalPanel } from "@/components/logistica/customer-route-approval-panel";
import {
  panelListStackClass,
  panelListScrollClass,
} from "@/components/ui-blocks";
import type { RouteMemberRow } from "@/lib/shipment-types";
import { LOGISTICS_INVOICE_CARD_GRID_CLASS } from "@/components/logistica/lib/constants";
import {
  LogisticsInvoiceCard,
  type LogisticsInvoicePanelProps,
} from "@/components/logistica/panels/logistics-invoice-card";
import { LogisticsInvoiceRow } from "@/components/logistica/panels/logistics-invoice-row";
import type { LogisticsInvoiceItem } from "@/components/logistica/types";

export function LogisticsTasksBoard({
  agencyModuleEnabled,
  operationScope,
  canManageRoutes,
  routeCatalog,
  routeMembers,
  visibleInvoiceItems,
  viewLayout,
  invoicePanelProps,
  showRouteHistory,
  failedFilter,
}: {
  agencyModuleEnabled: boolean;
  operationScope: "domicilios" | "agencias";
  canManageRoutes: boolean;
  routeCatalog: LogisticsRouteCatalogData | undefined;
  routeMembers: RouteMemberRow[];
  visibleInvoiceItems: LogisticsInvoiceItem[];
  viewLayout: "cards" | "rows";
  invoicePanelProps: Omit<LogisticsInvoicePanelProps, "item">;
  showRouteHistory: boolean;
  failedFilter: boolean;
}) {
  return (
    <div className={`${panelListScrollClass} pt-2 lg:pt-3`}>
      {agencyModuleEnabled && operationScope === "agencias" ? (
        <AgencyLogisticsPanel />
      ) : (
        <div className="grid gap-3">
          {canManageRoutes ? (
            <CustomerRouteApprovalPanel
              templates={routeCatalog?.templates || []}
              enabledDays={routeCatalog?.enabledDays || []}
              defaultDriverByWeekday={
                routeCatalog?.defaultDriverByWeekday || Array<string | null>(7).fill(null)
              }
              routeMembers={routeMembers}
            />
          ) : null}
          {visibleInvoiceItems.length ? (
            viewLayout === "rows" ? (
              <div className={panelListStackClass}>
                {visibleInvoiceItems.map((item) => (
                  <LogisticsInvoiceRow
                    key={item.currentTask?.id || item.shipment.id}
                    item={item}
                    {...invoicePanelProps}
                  />
                ))}
              </div>
            ) : (
              <div className={LOGISTICS_INVOICE_CARD_GRID_CLASS}>
                {visibleInvoiceItems.map((item) => (
                  <LogisticsInvoiceCard
                    key={item.currentTask?.id || item.shipment.id}
                    item={item}
                    {...invoicePanelProps}
                  />
                ))}
              </div>
            )
          ) : (
            <div className="flex min-h-40 flex-col items-center justify-center px-4 text-center">
              <ClipboardList className="h-7 w-7 text-slate-600" />
              <p className="mt-2 text-sm font-black text-slate-300">
                {showRouteHistory
                  ? "Sin rutas en historial"
                  : failedFilter
                    ? "Sin tareas fallidas"
                    : "Sin invoices"}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
