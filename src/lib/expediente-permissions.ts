import { sessionHasPermission } from "@/lib/auth/permissions";
import type { AppSession } from "@/lib/auth/types";

export type ExpedienteSectionPermissions = {
  canViewFinancial: boolean;
  canViewLogistics: boolean;
  canViewAudit: boolean;
  canViewPackages: boolean;
  canEditShipment: boolean;
};

export function resolveExpedienteSectionPermissions(
  session: AppSession,
): ExpedienteSectionPermissions {
  return {
    canViewFinancial:
      sessionHasPermission(session, "sales.manage") ||
      sessionHasPermission(session, "accounting.view") ||
      sessionHasPermission(session, "audit.immutable.view") ||
      sessionHasPermission(session, "settings.manage"),
    canViewLogistics:
      sessionHasPermission(session, "sales.manage") ||
      sessionHasPermission(session, "routes.view") ||
      sessionHasPermission(session, "routes.update_status") ||
      sessionHasPermission(session, "logistics.settings.manage"),
    canViewAudit:
      sessionHasPermission(session, "audit.immutable.view") ||
      sessionHasPermission(session, "settings.manage"),
    canViewPackages:
      sessionHasPermission(session, "sales.manage") ||
      sessionHasPermission(session, "warehouses.manage") ||
      sessionHasPermission(session, "routes.view") ||
      sessionHasPermission(session, "routes.update_status"),
    canEditShipment: sessionHasPermission(session, "sales.manage"),
  };
}
