"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  Check,
  CalendarDays,
  ChevronDown,
  Loader2,
  MapPin,
  Route,
  Search,
  TriangleAlert,
  X,
} from "lucide-react";
import {
  listPendingCustomerRouteAssignmentRequestsAction,
  reviewCustomerRouteAssignmentRequestAction,
} from "@/app/actions/customer-route-assignments";
import type { CustomerRouteAssignmentRequestRow } from "@/app/actions/customer-route-assignments/types";
import { listLogisticsVehiclesAction } from "@/app/actions/logistics-fleet";
import {
  assignLogisticsRouteDriverAction,
  assignLogisticsRouteVehicleAction,
  cancelLogisticsRouteAction,
  closeLogisticsRouteAction,
  confirmOperationalRouteFromBookingsAction,
  listLogisticsRoutesAction,
  removeLogisticsRouteStopWithDispositionAction,
  reorderLogisticsRouteStopsAction,
  updatePublishedRouteFromBookingsAction,
} from "@/app/actions/logistics-routes";
import type { LogisticsRouteCatalog } from "@/app/actions/logistics-routes";
import { ActionConfirmDialog } from "@/components/action-confirm-dialog";
import { AnchoredMenu } from "@/components/anchored-menu";
import { VentasRutasPanel } from "@/components/config/ventas-rutas-panel";
import {
  LogisticsConfigurationMenu,
  LogisticsOperationsNav,
} from "@/components/logistica/logistics-section-nav";
import {
  panelToolbarClass,
  primaryButtonClass,
} from "@/components/ui-blocks";
import { useNotify } from "@/hooks/use-notify";
import type { LogisticsVehicleRow } from "@/lib/logistics-fleet";
import type {
  LogisticsRouteRow,
  LogisticsRouteStopRow,
} from "@/lib/logistics-routing";
import { bookingGroupKey } from "@/lib/logistics-route-booking-groups";
import { normalizeGenericLogisticsRouteName } from "@/lib/logistics-day-route";
import type { RouteMemberRow } from "@/lib/shipment-types";

import {
  EmptyState,
  OperationalRouteDetail,
  RouteReasonDialog,
  countLabel,
  formatRouteDate,
  routeBoxCountForTask,
  routeStatusChip,
  type ReasonDialogState,
  type RouteConfirmation,
  type RoutesWorkspaceTab,
} from "@/components/logistica/logistics-routes-workspace-details";
import { LogisticsTemplateBookingGroups } from "@/components/logistica/logistics-template-booking-groups";
import { LogisticsConfirmationsExcelTable } from "@/components/logistica/logistics-confirmations-excel-table";
import { LogisticsHistoryRouteList } from "@/components/logistica/logistics-history-route-list";
import {
  LogisticsUnifiedRouteList,
  LogisticsWeekdayTabs,
  LogisticsWeekNavigator,
  LOGISTICS_WEEKDAYS,
  weekStartForOffset,
} from "@/components/logistica/logistics-unified-route-list";
import { getLogisticsWeekdayIndex } from "@/lib/logistics-route-week";
import {
  dateIsInLogisticsOperationRange,
  type LogisticsOperationRange,
} from "@/lib/logistics-operation-range";
import { usePageViewLayout } from "@/components/ui/ui-surface-preferences-provider";
import { useSetShellConfig } from "@/components/app-frame";
import type { UiSurfaceContextId } from "@/lib/ui-surface-context";

function formatRequestedDate(value: string) {
  const parsed = new Date(`${value}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("es-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(parsed);
}

function weekSummariesForBookings(bookings: CustomerRouteAssignmentRequestRow[], status: string) {
  return Array.from({ length: 9 }, (_, index) => index - 4).map((offset) => {
    const start = weekStartForOffset(offset);
    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7, 12);
    const count = bookings.filter((booking) => {
      if (booking.status !== status) return false;
      const date = new Date(`${booking.routeDate}T12:00:00`);
      return !Number.isNaN(date.getTime()) && date >= start && date < end;
    }).length;
    return { offset, count };
  });
}

function requestBoxCount(request: CustomerRouteAssignmentRequestRow) {
  return request.boxLines.reduce((total, line) => total + line.quantity, 0) || 1;
}

function bookingMatchesSearch(booking: CustomerRouteAssignmentRequestRow, query: string) {
  if (!query) {
    return true;
  }

  return [
    booking.shipmentCode,
    booking.customerName,
    booking.formattedAddress,
    booking.routeTemplateName,
    booking.routeDate,
    booking.routeWeekday == null ? "" : String(booking.routeWeekday),
    booking.taskType === "pickup_full_box" ? "recoger" : "entregar",
  ].some((value) => String(value || "").toLocaleLowerCase().includes(query));
}

function routeMatchesSearch(route: LogisticsRouteRow, query: string) {
  if (!query) {
    return true;
  }

  return [
    route.name,
    route.routeDate,
    route.notes,
    route.zoneKey,
    ...route.stops.flatMap((stop) => [
      stop.shipmentCode,
      stop.customerName,
      stop.address.name,
      stop.address.formattedAddress,
      stop.address.city,
      stop.address.postalCode,
    ]),
  ].some((value) => String(value || "").toLocaleLowerCase().includes(query));
}

function bookingRouteWeekday(booking: CustomerRouteAssignmentRequestRow) {
  const weekday = Number(booking.routeWeekday);
  return booking.routeWeekday != null && Number.isInteger(weekday) && weekday >= 0 && weekday <= 6
    ? weekday
    : getLogisticsWeekdayIndex(booking.routeDate);
}

export function LogisticsRoutesWorkspace({
  initialRoutes,
  initialBookings,
  routeMembers,
  canManage,
  onCatalogChange,
  initialTab = "confirmations",
}: {
  initialRoutes: LogisticsRouteRow[];
  initialBookings: CustomerRouteAssignmentRequestRow[];
  routeCatalog?: LogisticsRouteCatalog;
  routeMembers: RouteMemberRow[];
  canManage: boolean;
  onCatalogChange?: () => void | Promise<void>;
  initialTab?: RoutesWorkspaceTab;
}) {
  const router = useRouter();
  const notify = useNotify();
  const tab = initialTab;
  const setShellConfig = useSetShellConfig();
  const viewContext: UiSurfaceContextId =
    tab === "confirmations"
      ? "logistics.confirmations"
      : tab === "templates" || tab === "drafts"
        ? "logistics.preparation"
        : tab === "history"
          ? "logistics.history"
          : "logistics.routes";
  const { layout: viewLayout } = usePageViewLayout(viewContext);
  const [routes, setRoutes] = useState(initialRoutes);
  const [bookings, setBookings] = useState<CustomerRouteAssignmentRequestRow[]>(initialBookings);
  const [vehicles, setVehicles] = useState<LogisticsVehicleRow[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState("");
  const [confirmationWeekOffset, setConfirmationWeekOffset] = useState(0);
  const [confirmationCustomDateRange, setConfirmationCustomDateRange] = useState<LogisticsOperationRange | null>(null);
  const [confirmationQuery, setConfirmationQuery] = useState("");
  const [confirmationRouteFilter, setConfirmationRouteFilter] = useState("");
  const [routeQuery, setRouteQuery] = useState("");
  const [confirmationWeekday, setConfirmationWeekday] = useState<number | null>(null);
  const [routeWeekOffset, setRouteWeekOffset] = useState(0);
  const [routeCustomDateRange, setRouteCustomDateRange] = useState<LogisticsOperationRange | null>(null);
  const [routeWeekday, setRouteWeekday] = useState<number | null>(null);
  const [selectedConfirmationIds, setSelectedConfirmationIds] = useState<Set<string>>(() => new Set());
  const [busyKey, setBusyKey] = useState("");
  const [confirmation, setConfirmation] = useState<RouteConfirmation | null>(null);
  const [reasonDialog, setReasonDialog] = useState<ReasonDialogState | null>(null);
  const [reasonText, setReasonText] = useState("");
  const [loading, startLoading] = useTransition();
  const operationKeys = useRef(new Map<string, string>());

  useEffect(() => {
    setShellConfig({ surfaceContextId: tab === "configuration" ? null : viewContext });
    return () => setShellConfig({ surfaceContextId: undefined });
  }, [setShellConfig, tab, viewContext]);

  const loadOperationalData = useCallback(async () => {
    const [routesResult, bookingsResult, vehiclesResult] = await Promise.all([
      listLogisticsRoutesAction({ limit: 200, offset: 0 }),
      listPendingCustomerRouteAssignmentRequestsAction(),
      listLogisticsVehiclesAction(),
    ]);

    if (routesResult.ok) setRoutes(routesResult.data);
    else notify.error(routesResult.error);
    if (bookingsResult.ok) setBookings(bookingsResult.data);
    else notify.error(bookingsResult.error);
    if (vehiclesResult.ok) setVehicles(vehiclesResult.data);
    else notify.error(vehiclesResult.error);
  }, [notify]);

  useEffect(() => {
    startLoading(() => {
      void loadOperationalData();
    });
  }, [loadOperationalData]);

  const operationalWeekdays = useMemo(() => {
    const weekStart = weekStartForOffset(routeWeekOffset);
    const weekEnd = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 6, 12);
    const weekdays = new Set<number>();
    for (const route of routes) {
      if (route.status !== "draft" && route.status !== "planned" && route.status !== "in_progress") continue;
      const routeDate = new Date(`${route.routeDate}T12:00:00`);
      if (Number.isNaN(routeDate.getTime())) continue;
      if (routeCustomDateRange) {
        if (!dateIsInLogisticsOperationRange(route.routeDate, routeCustomDateRange)) continue;
      } else if (routeDate < weekStart || routeDate > weekEnd) continue;
      weekdays.add(getLogisticsWeekdayIndex(route.routeDate));
    }
    return Array.from(weekdays).sort((left, right) => left - right);
  }, [routeCustomDateRange, routeWeekOffset, routes]);
  const activeRouteWeekday =
    routeWeekday != null && operationalWeekdays.includes(routeWeekday)
      ? routeWeekday
      : operationalWeekdays[0] ?? null;

  const preparationWeekdays = useMemo(() => {
    const weekStart = weekStartForOffset(routeWeekOffset);
    const weekEnd = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 6, 12);
    const weekdays = new Set<number>();
    for (const booking of bookings) {
      if (booking.status !== "template_confirmed") continue;
      const routeDate = new Date(`${booking.routeDate}T12:00:00`);
      if (Number.isNaN(routeDate.getTime())) continue;
      if (routeCustomDateRange) {
        if (!dateIsInLogisticsOperationRange(booking.routeDate, routeCustomDateRange)) continue;
      } else if (routeDate < weekStart || routeDate > weekEnd) continue;
      const dateWeekday = getLogisticsWeekdayIndex(booking.routeDate);
      const configuredWeekday = bookingRouteWeekday(booking);
      if (dateWeekday === configuredWeekday) weekdays.add(dateWeekday);
    }
    return Array.from(weekdays).sort((left, right) => left - right);
  }, [bookings, routeCustomDateRange, routeWeekOffset]);
  const activePreparationWeekday =
    routeWeekday != null && preparationWeekdays.includes(routeWeekday)
      ? routeWeekday
      : preparationWeekdays[0] ?? null;
  const operationTabCounts = useMemo(
    () => ({
      confirmations: bookings.filter((booking) => booking.status === "pending_approval").length,
      templates: bookings.filter((booking) => booking.status === "template_confirmed").length,
      operational: routes.filter((route) => route.status === "draft" || route.status === "planned" || route.status === "in_progress").length,
    }),
    [bookings, routes],
  );

  const templateBookingGroups = useMemo(() => {
    const groups = new Map<string, CustomerRouteAssignmentRequestRow[]>();
    const weekStart = weekStartForOffset(routeWeekOffset);
    const weekEnd = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 6, 12);
    for (const booking of bookings) {
      if (booking.status !== "template_confirmed") continue;
      if (activePreparationWeekday == null) continue;
      const routeDate = new Date(`${booking.routeDate}T12:00:00`);
      if (
        Number.isNaN(routeDate.getTime()) ||
        (!routeCustomDateRange && (routeDate < weekStart || routeDate > weekEnd)) ||
        (routeCustomDateRange && !dateIsInLogisticsOperationRange(booking.routeDate, routeCustomDateRange)) ||
        getLogisticsWeekdayIndex(booking.routeDate) !== activePreparationWeekday ||
        bookingRouteWeekday(booking) !== activePreparationWeekday
      ) {
        continue;
      }
      const key = bookingGroupKey(booking);
      groups.set(key, [...(groups.get(key) || []), booking]);
    }
    const query = routeQuery.trim().toLocaleLowerCase();
    return Array.from(groups.entries())
      .map(([key, items]) => ({ key, items, first: items[0] }))
      .filter((group) => {
        if (!query) {
          return true;
        }
        return group.items.some((booking) => bookingMatchesSearch(booking, query));
      })
      .sort((a, b) =>
        a.first.routeDate.localeCompare(b.first.routeDate) ||
        a.first.routeTemplateName.localeCompare(b.first.routeTemplateName),
      );
  }, [activePreparationWeekday, bookings, routeCustomDateRange, routeQuery, routeWeekOffset]);

  const confirmationWeekdays = useMemo(() => {
    const weekStart = weekStartForOffset(confirmationWeekOffset);
    const weekEnd = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 6, 12);
    const weekdays = new Set<number>();
    for (const booking of bookings) {
      if (booking.status !== "pending_approval") continue;
      const routeDate = new Date(`${booking.routeDate}T12:00:00`);
      if (Number.isNaN(routeDate.getTime())) continue;
      if (confirmationCustomDateRange) {
        if (!dateIsInLogisticsOperationRange(booking.routeDate, confirmationCustomDateRange)) continue;
      } else if (routeDate < weekStart || routeDate > weekEnd) continue;
      if (confirmationRouteFilter && normalizeGenericLogisticsRouteName(booking.routeTemplateName, booking.routeWeekday) !== confirmationRouteFilter) continue;
      weekdays.add(bookingRouteWeekday(booking));
    }
    return Array.from(weekdays).sort((left, right) => left - right);
  }, [bookings, confirmationCustomDateRange, confirmationRouteFilter, confirmationWeekOffset]);
  const confirmationRouteOptions = useMemo(() => {
    const weekStart = weekStartForOffset(confirmationWeekOffset);
    const weekEnd = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 6, 12);
    const names = new Set<string>();
    for (const booking of bookings) {
      if (booking.status !== "pending_approval") continue;
      const routeDate = new Date(`${booking.routeDate}T12:00:00`);
      if (Number.isNaN(routeDate.getTime())) continue;
      if (confirmationCustomDateRange) {
        if (!dateIsInLogisticsOperationRange(booking.routeDate, confirmationCustomDateRange)) continue;
      } else if (routeDate < weekStart || routeDate > weekEnd) continue;
      names.add(normalizeGenericLogisticsRouteName(booking.routeTemplateName, booking.routeWeekday));
    }
    return Array.from(names).sort((left, right) => left.localeCompare(right));
  }, [bookings, confirmationCustomDateRange, confirmationWeekOffset]);
  const confirmationWeekSummaries = useMemo(
    () => weekSummariesForBookings(bookings, "pending_approval"),
    [bookings],
  );
  const confirmationWeekdayCounts = useMemo(() => {
    const counts = Object.fromEntries(LOGISTICS_WEEKDAYS.map((weekday) => [weekday, 0]));
    const weekStart = weekStartForOffset(confirmationWeekOffset);
    const weekEnd = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 6, 12);
    for (const booking of bookings) {
      if (booking.status !== "pending_approval") continue;
      const routeDate = new Date(`${booking.routeDate}T12:00:00`);
      if (Number.isNaN(routeDate.getTime())) continue;
      if (confirmationCustomDateRange) {
        if (!dateIsInLogisticsOperationRange(booking.routeDate, confirmationCustomDateRange)) continue;
      } else if (routeDate < weekStart || routeDate > weekEnd) continue;
      if (confirmationRouteFilter && normalizeGenericLogisticsRouteName(booking.routeTemplateName, booking.routeWeekday) !== confirmationRouteFilter) continue;
      const weekday = bookingRouteWeekday(booking);
      counts[weekday] = (counts[weekday] || 0) + 1;
    }
    return counts;
  }, [bookings, confirmationCustomDateRange, confirmationRouteFilter, confirmationWeekOffset]);
  const activeConfirmationWeekday =
    confirmationWeekday != null && confirmationWeekdays.includes(confirmationWeekday)
      ? confirmationWeekday
      : confirmationWeekdays[0] ?? null;
  const preparationWeekSummaries = useMemo(
    () => weekSummariesForBookings(bookings, "template_confirmed"),
    [bookings],
  );
  const operationalWeekSummaries = useMemo(() => {
    return Array.from({ length: 9 }, (_, index) => index - 4).map((offset) => {
      const start = weekStartForOffset(offset);
      const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7, 12);
      const count = routes.filter((route) => {
        if (!(route.status === "draft" || route.status === "planned" || route.status === "in_progress")) return false;
        const date = new Date(`${route.routeDate}T12:00:00`);
        return !Number.isNaN(date.getTime()) && date >= start && date < end;
      }).length;
      return { offset, count };
    });
  }, [routes]);

  const pendingApprovalRequests = useMemo(() => {
    const weekStart = weekStartForOffset(confirmationWeekOffset);
    const weekEnd = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 6, 12);
    const query = confirmationQuery.trim().toLocaleLowerCase();
    return bookings.filter((booking) => {
      if (booking.status !== "pending_approval") return false;
      const routeDate = new Date(`${booking.routeDate}T12:00:00`);
      if (Number.isNaN(routeDate.getTime())) return false;
      if (confirmationCustomDateRange) {
        if (!dateIsInLogisticsOperationRange(booking.routeDate, confirmationCustomDateRange)) return false;
      } else if (routeDate < weekStart || routeDate > weekEnd) return false;
      if (activeConfirmationWeekday != null && bookingRouteWeekday(booking) !== activeConfirmationWeekday) return false;
      if (confirmationRouteFilter && normalizeGenericLogisticsRouteName(booking.routeTemplateName, booking.routeWeekday) !== confirmationRouteFilter) return false;
      if (!query) return true;
      return [
        booking.shipmentCode,
        booking.customerName,
        booking.formattedAddress,
        booking.routeTemplateName,
        booking.routeWeekday == null ? "" : String(booking.routeWeekday),
        booking.taskType === "pickup_full_box" ? "recoger" : "entregar",
      ].some((value) => String(value || "").toLocaleLowerCase().includes(query));
    });
  }, [activeConfirmationWeekday, bookings, confirmationCustomDateRange, confirmationQuery, confirmationRouteFilter, confirmationWeekOffset]);

  const selectedConfirmationRequests = pendingApprovalRequests.filter((request) => selectedConfirmationIds.has(request.id));
  const hasConfirmationSelection = selectedConfirmationRequests.length > 0;
  const allConfirmationSelected = pendingApprovalRequests.length > 0 &&
    pendingApprovalRequests.every((request) => selectedConfirmationIds.has(request.id));

  const visibleRoutes = useMemo(() => {
    const query = routeQuery.trim().toLocaleLowerCase();
    return routes.filter((route) => {
      if (!routeMatchesSearch(route, query)) return false;
      if (tab === "history") return route.status === "completed" || route.status === "cancelled";
      return false;
    });
  }, [routeQuery, routes, tab]);

  const selectedRoute = routes.find((route) => route.id === selectedRouteId) || null;
  const showSelectedRoute = Boolean(selectedRoute && (tab === "operational" || tab === "history"));
  const memberById = useMemo(
    () => new Map(routeMembers.map((member) => [member.id, member.label])),
    [routeMembers],
  );
  const vehicleById = useMemo(
    () => new Map(vehicles.map((vehicle) => [vehicle.id, vehicle])),
    [vehicles],
  );

  async function createRouteForGroup(groupKey: string, items: CustomerRouteAssignmentRequestRow[]) {
    if (!canManage || busyKey) return;
    const idempotencyKey = operationKeys.current.get(groupKey) || crypto.randomUUID();
    operationKeys.current.set(groupKey, idempotencyKey);
    setBusyKey(`create:${groupKey}`);
    const result = await confirmOperationalRouteFromBookingsAction({
      bookingIds: items.map((item) => item.id),
      idempotencyKey,
    });
    setBusyKey("");
    if (!result.ok) {
      notify.error(result.error);
      return;
    }
    operationKeys.current.delete(groupKey);
    setSelectedRouteId(result.data.id);
    await loadOperationalData();
    notify.success(`Ruta confirmada: ${result.data.name}`);
    router.push("/logistica?view=rutas&tab=operational");
  }

  async function updateRouteForGroup(
    groupKey: string,
    route: LogisticsRouteRow,
    items: CustomerRouteAssignmentRequestRow[],
  ) {
    if (!canManage || busyKey) return;
    const idempotencyKey = operationKeys.current.get(`update:${groupKey}`) || crypto.randomUUID();
    operationKeys.current.set(`update:${groupKey}`, idempotencyKey);
    setBusyKey(`update:${groupKey}`);
    const result = await updatePublishedRouteFromBookingsAction({
      bookingIds: items.map((item) => item.id),
      idempotencyKey,
    });
    setBusyKey("");
    if (!result.ok) {
      notify.error(result.error);
      return;
    }
    operationKeys.current.delete(`update:${groupKey}`);
    setSelectedRouteId(result.data.id || route.id);
    await loadOperationalData();
    notify.success(`Ruta actualizada: ${result.data.name}`);
  }

  async function closeRoute(route: LogisticsRouteRow) {
    setBusyKey(`close:${route.id}`);
    const result = await closeLogisticsRouteAction(route.id);
    setBusyKey("");
    if (!result.ok) {
      notify.error(result.error);
      return;
    }
    setConfirmation(null);
    setSelectedRouteId("");
    await loadOperationalData();
    notify.success("Ruta cerrada. Ya puedes asignar conductor y vehículo.");
  }

  async function cancelRoute(route: LogisticsRouteRow) {
    setBusyKey(`cancel:${route.id}`);
    const result = await cancelLogisticsRouteAction({ routeId: route.id });
    setBusyKey("");
    if (!result.ok) {
      notify.error(result.error);
      return;
    }
    setConfirmation(null);
    setSelectedRouteId("");
    await loadOperationalData();
    notify.success("Ruta cancelada");
  }

  async function assignDriver(route: LogisticsRouteRow, driverId: string | null) {
    setBusyKey(`driver:${route.id}`);
    const result = await assignLogisticsRouteDriverAction({
      routeId: route.id,
      assignedTo: driverId,
    });
    setBusyKey("");
    if (!result.ok) notify.error(result.error);
    else {
      await loadOperationalData();
      notify.success(driverId ? "Conductor asignado" : "Conductor retirado");
    }
  }

  async function assignVehicle(route: LogisticsRouteRow, vehicleId: string | null) {
    setBusyKey(`vehicle:${route.id}`);
    const result = await assignLogisticsRouteVehicleAction({ routeId: route.id, vehicleId });
    setBusyKey("");
    if (!result.ok) notify.error(result.error);
    else {
      await loadOperationalData();
      notify.success(vehicleId ? "Vehiculo asignado" : "Vehiculo retirado");
    }
  }

  function openReasonDialog(input: ReasonDialogState) {
    setReasonText("");
    setReasonDialog(input);
  }

  async function approveRequest(request: CustomerRouteAssignmentRequestRow) {
    if (!canManage || busyKey) return;
    setBusyKey(`approve:${request.id}`);
    const result = await reviewCustomerRouteAssignmentRequestAction({
      requestId: request.id,
      decision: "approved",
    });
    setBusyKey("");
    if (!result.ok) {
      notify.error(result.error);
      return;
    }
    await loadOperationalData();
    notify.success(`Invoice ${request.shipmentCode} enviado a plantilla ${request.routeTemplateName}`);
  }

  function toggleConfirmationSelection(requestId: string) {
    setSelectedConfirmationIds((current) => {
      const next = new Set(current);
      if (next.has(requestId)) next.delete(requestId);
      else next.add(requestId);
      return next;
    });
  }

  function toggleAllConfirmationSelection() {
    setSelectedConfirmationIds((current) => {
      const visibleIds = new Set(pendingApprovalRequests.map((request) => request.id));
      const next = new Set(current);
      const shouldClear = visibleIds.size > 0 && Array.from(visibleIds).every((id) => next.has(id));
      for (const id of visibleIds) {
        if (shouldClear) next.delete(id);
        else next.add(id);
      }
      return next;
    });
  }

  async function approveSelectedRequests() {
    if (!canManage || busyKey || !selectedConfirmationRequests.length) return;
    setBusyKey("approve:selected");
    const acceptedRequests: CustomerRouteAssignmentRequestRow[] = [];
    let failedCount = 0;
    const failedReasons: string[] = [];
    for (const request of selectedConfirmationRequests) {
      const result = await reviewCustomerRouteAssignmentRequestAction({
        requestId: request.id,
        decision: "approved",
      });
      if (result.ok) acceptedRequests.push(request);
      else {
        failedCount += 1;
        failedReasons.push(`${request.shipmentCode}: ${result.error}`);
      }
    }
    setBusyKey("");
    setSelectedConfirmationIds(new Set());
    await loadOperationalData();
    for (const request of acceptedRequests) {
      notify.success(`Invoice ${request.shipmentCode} enviado a plantilla ${request.routeTemplateName}`);
    }
    if (failedCount) {
      const reasons = failedReasons.slice(0, 3).join(" · ");
      const remaining = failedReasons.length - 3;
      notify.error(
        `${failedCount} ${failedCount === 1 ? "solicitud no pudo confirmarse" : "solicitudes no pudieron confirmarse"}.${reasons ? ` ${reasons}` : ""}${remaining > 0 ? ` (+${remaining} más)` : ""}`,
        { durationMs: 9000 },
      );
    }
  }

  /* function openMoveRequest(request: CustomerRouteAssignmentRequestRow) {
    if (!routeCatalog) {
      notify.error("TodavÃ­a no se cargÃ³ el calendario de rutas");
      return;
    }

    const enabledDays = enabledWeekdayIndexes(routeCatalog.enabledDays);
    if (!enabledDays.length) {
      notify.error("No hay dÃ­as disponibles para mover la solicitud");
      return;
    }

    const weekday = enabledDays.find((day) => day !== request.routeWeekday) ?? enabledDays[0];
    const date = weekday === request.routeWeekday
      ? request.routeDate
      : nextDateForTemplateWeekday(weekday, request.routeDate);
    const { time } = draftFromScheduledAt(request.scheduledAt);
    setMoveDraft({
      request,
      weekday,
      date,
      time,
      routeTemplateId: resolveDayRouteTemplateId({
        weekday,
        templates: routeCatalog.templates,
        preferNotId: request.routeTemplateId || undefined,
      }),
    });
  }

  function selectMoveWeekday(weekday: number) {
    if (!moveDraft || !routeCatalog) return;
    const date = weekday === moveDraft.request.routeWeekday
      ? moveDraft.request.routeDate
      : nextDateForTemplateWeekday(weekday, moveDraft.request.routeDate);
    setMoveDraft({
      ...moveDraft,
      weekday,
      date,
      routeTemplateId: resolveDayRouteTemplateId({
        weekday,
        templates: routeCatalog.templates,
        preferNotId: moveDraft.request.routeTemplateId || undefined,
      }),
    });
  }

  async function submitMoveRequest() {
    if (!moveDraft || !routeCatalog) return;
    const { request, routeTemplateId, date, time } = moveDraft;
    setBusyKey(`move:${request.id}`);
    const result = await replaceCustomerRouteAssignmentRequestAction({
      requestId: request.id,
      routeTemplateId,
      scheduledAt: `${date}T${time}`,
    });
    setBusyKey("");
    if (!result.ok) {
      notify.error(result.error);
      return;
    }
    setMoveDraft(null);
    await loadOperationalData();
    notify.success(`Ruta cambiada para ${request.shipmentCode}`);
  } */

  async function submitReasonDialog() {
    if (!reasonDialog || reasonText.trim().length < 3) return;
    const targetKey = reasonDialog.kind === "request"
      ? `decision:${reasonDialog.request.id}`
      : `decision:${reasonDialog.stop.id}`;
    setBusyKey(targetKey);

    const result = reasonDialog.kind === "request"
      ? await reviewCustomerRouteAssignmentRequestAction({
            requestId: reasonDialog.request.id,
            decision: "rejected",
            note: reasonText,
          })
      : await removeLogisticsRouteStopWithDispositionAction({
          routeId: reasonDialog.route.id,
          stopId: reasonDialog.stop.id,
          disposition: reasonDialog.disposition,
          reason: reasonText,
        });

    setBusyKey("");
    if (!result.ok) {
      notify.error(result.error);
      return;
    }

    const dispositionLabel = reasonDialog.disposition === "deferred" ? "devuelta a pendiente" : "rechazada";
    setReasonDialog(null);
    setReasonText("");
    if (reasonDialog.kind === "route-stop") setSelectedRouteId("");
    await loadOperationalData();
    notify.success(`Solicitud ${dispositionLabel} y motivo registrado en la bitÃ¡cora`);
  }

  async function moveStop(route: LogisticsRouteRow, stop: LogisticsRouteStopRow, direction: -1 | 1) {
    const index = route.stops.findIndex((candidate) => candidate.id === stop.id);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= route.stops.length) return;
    const stopIds = route.stops.map((candidate) => candidate.id);
    [stopIds[index], stopIds[nextIndex]] = [stopIds[nextIndex], stopIds[index]];
    setBusyKey(`reorder:${stop.id}`);
    const result = await reorderLogisticsRouteStopsAction({ routeId: route.id, stopIds });
    setBusyKey("");
    if (!result.ok) notify.error(result.error);
    else await loadOperationalData();
  }

  const dismissSelectedRoute = useCallback(() => {
    const routeId = selectedRouteId;
    setSelectedRouteId("");
    if (!routeId || typeof document === "undefined") return;
    requestAnimationFrame(() => {
      document.getElementById(`route-trigger-${routeId}`)?.focus();
    });
  }, [selectedRouteId]);

  useEffect(() => {
    if (!showSelectedRoute || confirmation || reasonDialog) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      dismissSelectedRoute();
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [confirmation, dismissSelectedRoute, reasonDialog, showSelectedRoute]);

  const detail = selectedRoute ? (
    <OperationalRouteDetail
      route={selectedRoute}
      members={routeMembers}
      vehicles={vehicles}
      busyKey={busyKey}
      onDismiss={dismissSelectedRoute}
      onDriverChange={(driverId) => void assignDriver(selectedRoute, driverId)}
      onVehicleChange={(vehicleId) => void assignVehicle(selectedRoute, vehicleId)}
      onRequestClose={() => setConfirmation({ kind: "close", route: selectedRoute })}
      onRequestCancel={() => setConfirmation({ kind: "cancel", route: selectedRoute })}
      onRequestRemove={(stop) =>
        openReasonDialog({
          kind: "route-stop",
          route: selectedRoute,
          stop,
          disposition: "deferred",
        })
      }
      onMoveStop={(stop, direction) => void moveStop(selectedRoute, stop, direction)}
    />
  ) : null;

  const confirmationCopy = confirmation?.kind === "close"
    ? {
        title: `Â¿Cerrar ${confirmation.route.name}?`,
        message: `La ruta quedara cerrada con ${confirmation.route.stops.length} paradas. Ya no se podran agregar ni quitar cajas; podras reordenar las paradas y asignar conductor y vehiculo antes de iniciar.`,
        confirmLabel: "Cerrar ruta",
        confirmingLabel: "Cerrandoâ€¦",
        busy: busyKey === `close:${confirmation.route.id}`,
      }
    : confirmation?.kind === "cancel"
      ? {
          title: `Â¿Cancelar ${confirmation.route.name}?`,
          message: "La ruta dejara de estar disponible para operacion. Las paradas se liberaran y el historial se conservara.",
          confirmLabel: "Cancelar ruta",
          confirmingLabel: "Cancelandoâ€¦",
          busy: busyKey === `cancel:${confirmation.route.id}`,
        }
      : null;
  const headerSearchValue = tab === "confirmations" ? confirmationQuery : routeQuery;
  const headerSearchPlaceholder = tab === "confirmations"
    ? "Buscar invoice, cliente o ruta"
    : tab === "templates"
      ? "Buscar grupo, invoice o cliente"
      : "Buscar ruta, invoice o cliente";
  return (
    <div className="flex min-h-0 w-full flex-1 flex-col">
      <style>{`.route-list-row > span:last-child { font-size: 0; } .route-list-row > span:last-child::after { content: ">"; font-size: 1rem; }`}</style>
      <div className={`${panelToolbarClass} pb-2 lg:pb-3`}>
        <div className="flex min-w-0 flex-wrap items-center gap-1.5 lg:flex-nowrap">
          <div className="flex min-w-0 flex-1 items-center gap-1.5 lg:flex-none">
            <LogisticsOperationsNav
              active={tab === "confirmations" || tab === "templates" || tab === "operational" || tab === "history" ? tab : undefined}
              counts={operationTabCounts}
              className="!flex-1 !shrink lg:!flex-none lg:!shrink-0"
            />
            <span className="lg:hidden">
              <LogisticsConfigurationMenu active={tab === "configuration" ? "configuration" : "routes"} />
            </span>
          </div>
          {tab !== "configuration" ? (
            <label className="order-last flex h-8 min-w-0 basis-full items-center gap-1.5 rounded-md border border-black bg-surface-card px-2 text-slate-400 lg:order-none lg:min-w-[11rem] lg:flex-1 lg:basis-auto">
              <Search className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <input
                type="search"
                value={headerSearchValue}
                onChange={(event) => {
                  if (tab === "confirmations") {
                    setConfirmationQuery(event.target.value);
                  } else {
                    setRouteQuery(event.target.value);
                  }
                  setSelectedConfirmationIds(new Set());
                }}
                placeholder={headerSearchPlaceholder}
                aria-label={tab === "confirmations" ? "Buscar solicitudes por confirmar" : tab === "templates" ? "Buscar grupos en preparación" : "Buscar rutas e historial"}
                className="inset-field min-w-0 flex-1 bg-transparent text-[11px] font-bold text-slate-200 outline-none placeholder:text-slate-500"
              />
              <span className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center" aria-live="polite">
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-500" aria-label="Actualizando" /> : null}
              </span>
            </label>
          ) : null}
          {tab === "configuration" ? <span className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-sm font-black text-slate-100"><Route className="h-4 w-4 text-emerald-300" />Calendario y subrutas</span> : null}
          <span className="ml-auto hidden lg:inline-flex">
            <LogisticsConfigurationMenu active={tab === "configuration" ? "configuration" : "routes"} />
          </span>
        </div>
        {/*
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <LogisticsSectionNav active="routes" />
          <div className="inline-grid h-9 shrink-0 grid-cols-2 rounded-lg border border-black bg-surface-inset p-0.5">
            <button
              type="button"
              className={`inline-flex h-8 items-center justify-center gap-1.5 rounded-md px-2.5 text-xs font-black transition-colors ${
                tab === "drafts" ? "bg-emerald-400 text-slate-950" : "text-slate-300 hover:bg-white/5"
              }`}
              onClick={() => {
                setSelectedRouteId("");
                setTab("drafts");
              }}
            >
              <Route className="h-4 w-4" /> Plantillas
            </button>
            <button
              type="button"
              className={`inline-flex h-8 items-center justify-center gap-1.5 rounded-md px-2.5 text-xs font-black transition-colors ${
                tab === "operational" ? "bg-emerald-400 text-slate-950" : "text-slate-300 hover:bg-white/5"
              }`}
              onClick={() => {
                setSelectedRouteId("");
                if (statusFilter === "draft") setStatusFilter("all");
                setTab("operational");
              }}
            >
              <Route className="h-4 w-4" /> Operativas
            </button>
          </div>
          {tab !== "configuration" ? (
            <>
              <label
                className={`${insetShellClass} flex h-9 min-w-0 flex-[1_1_14rem] items-center gap-2 rounded-lg border border-black bg-surface-inset px-3 lg:min-w-[14rem] lg:flex-[1_1_24rem]`}
              >
                <Search className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
                <input
                  className="min-w-0 flex-1 bg-transparent text-sm font-bold text-[#f8fafc] outline-none placeholder:text-slate-500"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar ruta, invoice o cliente"
                  aria-label="Buscar rutas"
                />
              </label>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as RouteStatusFilter)}
                className="box-border h-9 shrink-0 rounded-lg border border-black bg-surface-inset px-2.5 pr-8 text-sm font-black text-[#f8fafc] outline-none"
                aria-label="Filtrar rutas por estado"
              >
                <option value="all">Todos los estados</option>
                <option value="draft">En preparacion</option>
                <option value="planned">Cerradas</option>
                <option value="in_progress">En curso</option>
                <option value="completed">Terminadas</option>
                <option value="cancelled">Canceladas</option>
              </select>
            </>
          ) : null}
          {loading && tab !== "configuration" ? (
            <span className="ml-auto hidden items-center gap-1.5 text-xs font-bold text-slate-500 sm:inline-flex">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Actualizando
            </span>
          ) : null}
          <LogisticsConfigurationMenu active="routes" className="ml-auto" />
        </div>
      </div>
        */}
      </div>

      {tab === "configuration" ? (
        <div className="min-h-0 flex-1 overflow-y-auto pt-3">
          <VentasRutasPanel canManage={canManage} onCatalogChange={onCatalogChange} />
        </div>
      ) : (
        <div className={`min-h-0 flex-1 ${showSelectedRoute ? "lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(390px,0.75fr)] lg:divide-x lg:divide-black" : ""}`}>
          <section className={`min-h-0 overflow-y-auto ${showSelectedRoute ? "lg:pr-3" : "h-full"}`}>
            {tab === "confirmations" ? (
              <section className="overflow-hidden rounded-xl border border-black bg-surface-panel">
                <LogisticsWeekNavigator
                  weekOffset={confirmationWeekOffset}
                  weekSummaries={confirmationWeekSummaries}
                  customDateRange={confirmationCustomDateRange}
                  onCustomDateRangeChange={(range) => {
                    setConfirmationCustomDateRange(range);
                    setConfirmationWeekday(null);
                    setConfirmationRouteFilter("");
                    setSelectedConfirmationIds(new Set());
                  }}
                  onWeekOffsetChange={(delta) => {
                    setConfirmationWeekOffset((current) => current + delta);
                    setConfirmationWeekday(null);
                    setConfirmationRouteFilter("");
                    setSelectedConfirmationIds(new Set());
                  }}
                >
                  <AnchoredMenu
                    ariaLabel="Filtrar solicitudes por ruta"
                    align="left"
                    panelWidth={220}
                    triggerClassName="inline-flex h-8 max-w-[12rem] shrink-0 items-center gap-1.5 rounded-md border border-black bg-surface-inset px-2 text-[11px] font-black text-slate-200 hover:bg-surface-card focus-visible:outline focus-visible:ring-2 focus-visible:ring-emerald-400"
                    trigger={<><Route className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden /><span className="min-w-0 truncate">{confirmationRouteFilter || "Todas las rutas"}</span><ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-300" aria-hidden /></>}
                  >
                    <button type="button" role="menuitem" className={`flex min-h-8 w-full items-center rounded-md px-2 text-left text-xs font-black ${confirmationRouteFilter === "" ? "bg-emerald-400 text-slate-950" : "text-slate-200 hover:bg-white/10"}`} onClick={() => { setConfirmationRouteFilter(""); setConfirmationWeekday(null); setSelectedConfirmationIds(new Set()); }}>Todas las rutas</button>
                    {confirmationRouteOptions.map((routeName) => <button type="button" role="menuitem" key={routeName} className={`flex min-h-8 w-full items-center rounded-md px-2 text-left text-xs font-black ${confirmationRouteFilter === routeName ? "bg-emerald-400 text-slate-950" : "text-slate-200 hover:bg-white/10"}`} onClick={() => { setConfirmationRouteFilter(routeName); setConfirmationWeekday(null); setSelectedConfirmationIds(new Set()); }}>{routeName}</button>)}
                  </AnchoredMenu>
                  <LogisticsWeekdayTabs
                    weekdays={[...LOGISTICS_WEEKDAYS]}
                    selectedWeekday={activeConfirmationWeekday}
                    counts={confirmationWeekdayCounts}
                    weekStart={confirmationCustomDateRange ? undefined : weekStartForOffset(confirmationWeekOffset)}
                    onSelect={(weekday) => {
                      setConfirmationWeekday(weekday);
                      setSelectedConfirmationIds(new Set());
                    }}
                    panelId="logistics-confirmation-day-panel"
                    compact
                  />
                </LogisticsWeekNavigator>
                {pendingApprovalRequests.length && canManage ? <div className="flex min-h-11 items-center gap-2 border-b border-black bg-surface-inset/20 px-3 py-2 sm:px-4">
                  <label className="flex min-h-7 items-center gap-1.5 text-[11px] font-black text-slate-200">
                    <input
                      type="checkbox"
                      checked={allConfirmationSelected}
                      onChange={toggleAllConfirmationSelection}
                      disabled={Boolean(busyKey)}
                      aria-label="Seleccionar todas las solicitudes visibles"
                      className="h-4 w-4 accent-emerald-400"
                    />
                    Todas
                  </label>
                  <span className={`inline-flex w-[3.5rem] shrink-0 justify-center text-[11px] font-bold text-slate-400 ${hasConfirmationSelection ? "" : "invisible"}`} aria-hidden={!hasConfirmationSelection}>
                    {selectedConfirmationRequests.length} sel.
                  </span>
                  <span className="inline-flex w-[7.25rem] shrink-0" aria-hidden={!hasConfirmationSelection}>
                    <button type="button" className={`${primaryButtonClass} h-7 w-full whitespace-nowrap px-2 text-[11px] ${hasConfirmationSelection ? "" : "invisible pointer-events-none"}`} disabled={Boolean(busyKey) || !hasConfirmationSelection} onClick={() => void approveSelectedRequests()} aria-label="Confirmar solicitudes seleccionadas" title="Confirmar seleccionadas">
                      {busyKey === "approve:selected" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                      Confirmar
                    </button>
                  </span>
                </div> : null}
                <div id="logistics-confirmation-day-panel" role="tabpanel" aria-label="Solicitudes por confirmar">
                {pendingApprovalRequests.length ? (
                  viewLayout === "excel" ? (
                    <LogisticsConfirmationsExcelTable
                      requests={pendingApprovalRequests}
                      canManage={canManage}
                      busyKey={busyKey}
                      selectedIds={selectedConfirmationIds}
                      onToggleSelection={toggleConfirmationSelection}
                      onApprove={(request) => void approveRequest(request)}
                      onReject={(request) => openReasonDialog({ kind: "request", request, disposition: "rejected" })}
                    />
                  ) : (
                    <div className={viewLayout === "cards" ? "grid gap-3 p-3 md:grid-cols-2 2xl:grid-cols-3" : "divide-y divide-black"}>
                    {pendingApprovalRequests.map((request) => {
                      const boxes = requestBoxCount(request);
                      const isPickup = request.taskType === "pickup_full_box";
                      const requestedTime = request.scheduledAt?.match(/T(\d{2}:\d{2})/)?.[1] || "Sin horario";
                      const suggestedRoute = normalizeGenericLogisticsRouteName(request.routeTemplateName, request.routeWeekday);
                      return (
                      <article
                        key={request.id}
                        role={canManage ? "checkbox" : undefined}
                        aria-checked={canManage ? selectedConfirmationIds.has(request.id) : undefined}
                        aria-label={canManage ? `Seleccionar ${request.shipmentCode}` : undefined}
                        tabIndex={canManage ? 0 : undefined}
                        onClick={() => {
                          if (canManage && !busyKey) toggleConfirmationSelection(request.id);
                        }}
                        onKeyDown={(event) => {
                          if (!canManage || busyKey || (event.key !== "Enter" && event.key !== " ")) return;
                          event.preventDefault();
                          toggleConfirmationSelection(request.id);
                        }}
                        className={`${viewLayout === "cards" ? "flex min-h-56 min-w-0 flex-col rounded-xl border border-black border-l-4 bg-surface-card p-4 shadow-sm" : canManage ? "grid min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-2 border-l-4 px-3 py-3 lg:grid-cols-[auto_minmax(18rem,1.3fr)_minmax(12rem,0.8fr)_minmax(10rem,0.6fr)_auto] lg:items-center" : "grid min-w-0 grid-cols-1 gap-x-3 gap-y-2 border-l-4 px-3 py-3 lg:grid-cols-[minmax(18rem,1.3fr)_minmax(12rem,0.8fr)_minmax(10rem,0.6fr)] lg:items-center"} transition-colors sm:px-4 ${canManage ? "cursor-pointer select-none" : ""} ${selectedConfirmationIds.has(request.id) ? "border-l-emerald-400 bg-emerald-400/10" : isPickup ? "border-l-amber-400/60 hover:bg-amber-400/[0.04]" : "border-l-emerald-400/40 hover:bg-emerald-400/[0.04]"}`}
                      >
                        {viewLayout === "cards" ? (
                          <>
                            <div className="flex min-w-0 items-start gap-3">
                              {canManage ? <input type="checkbox" checked={selectedConfirmationIds.has(request.id)} onChange={() => toggleConfirmationSelection(request.id)} onClick={(event) => event.stopPropagation()} disabled={Boolean(busyKey)} aria-label={`Seleccionar ${request.shipmentCode}`} className="mt-0.5 h-5 w-5 shrink-0 accent-emerald-400" /> : null}
                              <div className="min-w-0 flex-1">
                                <div className="flex min-w-0 items-start justify-between gap-2">
                                  <p className="min-w-0 text-sm font-black leading-snug text-white">{request.shipmentCode} · {request.customerName}</p>
                                  <span className={`inline-flex h-6 shrink-0 items-center rounded-md px-2 text-[10px] font-black uppercase tracking-wide ${isPickup ? "bg-amber-400/12 text-amber-200" : "bg-emerald-400/12 text-emerald-200"}`}>{isPickup ? "Recoger" : "Entregar"}</span>
                                </div>
                                <p className="mt-1.5 flex items-start gap-1.5 text-xs font-bold leading-relaxed text-slate-400"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" /><span className="break-words">{request.formattedAddress || "Dirección incompleta"}</span></p>
                                {request.coverageStatus === "outside" ? <p className="mt-2 flex items-start gap-1.5 rounded-lg border border-amber-700/70 bg-amber-950/30 px-2.5 py-2 text-[11px] font-bold leading-4 text-amber-200"><TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden /><span>La dirección de este invoice no coincide con la cobertura de la ruta sugerida. Verifica la excepción antes de confirmar.</span></p> : null}
                              </div>
                            </div>
                            <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-y border-black/70 py-3">
                              <div className="min-w-0">
                                <p className="text-[9px] font-black uppercase tracking-wider text-slate-500">Horario solicitado</p>
                                <p className="mt-1 text-xs font-black leading-snug text-slate-200">{formatRequestedDate(request.routeDate)}</p>
                                <p className="mt-1 text-[11px] font-black text-sky-200">{requestedTime}</p>
                              </div>
                              <div className="min-w-0 border-l border-black/70 pl-4">
                                <p className="text-[9px] font-black uppercase tracking-wider text-slate-500">Ruta sugerida</p>
                                <p className="mt-1 truncate text-xs font-black text-slate-200">{suggestedRoute}</p>
                                <p className="mt-1 text-[11px] font-bold text-slate-400">{boxes} {boxes === 1 ? "caja" : "cajas"}</p>
                              </div>
                            </div>
                            {canManage ? <div className="mt-auto grid grid-cols-2 gap-2 pt-3" onClick={(event) => event.stopPropagation()}><button type="button" className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-emerald-600/70 bg-emerald-400/15 px-3 text-xs font-black text-emerald-100 transition-colors hover:bg-emerald-400/25 disabled:opacity-40" disabled={Boolean(busyKey)} onClick={() => void approveRequest(request)} aria-label={`Confirmar ${request.shipmentCode}`}><Check className="h-4 w-4" />Confirmar</button><button type="button" className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-rose-700/70 bg-rose-500/10 px-3 text-xs font-black text-rose-200 transition-colors hover:bg-rose-500/20 disabled:opacity-40" disabled={Boolean(busyKey)} onClick={() => openReasonDialog({ kind: "request", request, disposition: "rejected" })} aria-label={`Rechazar ${request.shipmentCode}`}><X className="h-4 w-4" />Rechazar</button></div> : null}
                          </>
                        ) : (
                          <>
                            {canManage ? <input type="checkbox" checked={selectedConfirmationIds.has(request.id)} onChange={() => toggleConfirmationSelection(request.id)} onClick={(event) => event.stopPropagation()} disabled={Boolean(busyKey)} aria-label={`Seleccionar ${request.shipmentCode}`} className="mt-1 h-5 w-5 shrink-0 accent-emerald-400 lg:mt-0" /> : null}
                            <div className="min-w-0">
                              <div className="flex min-w-0 flex-wrap items-center gap-2">
                                <p className="min-w-0 truncate text-sm font-black text-white">{request.shipmentCode} · {request.customerName}</p>
                                <span className={`inline-flex h-6 shrink-0 items-center rounded-md px-2 text-[10px] font-black uppercase tracking-wide ${isPickup ? "bg-amber-400/12 text-amber-200" : "bg-emerald-400/12 text-emerald-200"}`}>{isPickup ? "Recoger" : "Entregar"}</span>
                              </div>
                              <p className="mt-1 flex items-start gap-1.5 text-xs font-bold text-slate-400"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" /><span className="break-words">{request.formattedAddress || "Dirección incompleta"}</span></p>
                              {request.coverageStatus === "outside" ? <p className="mt-1.5 flex items-start gap-1.5 text-[11px] font-bold leading-4 text-amber-200"><TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden /><span>Fuera de la cobertura de la ruta sugerida; requiere verificación.</span></p> : null}
                            </div>
                            <div className={`${canManage ? "col-start-2" : "col-start-1"} min-w-0 lg:col-auto`}>
                              <p className="text-[9px] font-black uppercase tracking-wider text-slate-500">Horario solicitado</p>
                              <p className="mt-0.5 text-xs font-black text-slate-200">{formatRequestedDate(request.routeDate)}</p>
                              <p className="mt-0.5 text-[11px] font-bold text-sky-200">{requestedTime}</p>
                            </div>
                            <div className={`${canManage ? "col-start-2" : "col-start-1"} min-w-0 lg:col-auto`}>
                              <p className="text-[9px] font-black uppercase tracking-wider text-slate-500">Ruta sugerida</p>
                              <p className="mt-0.5 truncate text-xs font-black text-slate-200">{suggestedRoute}</p>
                              <p className="mt-0.5 text-[11px] font-bold text-slate-400">{boxes} {boxes === 1 ? "caja" : "cajas"}</p>
                            </div>
                            {canManage ? <div className="col-start-2 flex shrink-0 items-center gap-2 lg:col-auto lg:justify-end" onClick={(event) => event.stopPropagation()}><button type="button" className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-emerald-600/70 bg-emerald-400/15 px-3 text-xs font-black text-emerald-100 transition-colors hover:bg-emerald-400/25 disabled:opacity-40" disabled={Boolean(busyKey)} onClick={() => void approveRequest(request)} aria-label={`Confirmar ${request.shipmentCode}`}><Check className="h-4 w-4" />Confirmar</button><button type="button" className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-rose-700/70 bg-rose-500/10 px-3 text-xs font-black text-rose-200 transition-colors hover:bg-rose-500/20 disabled:opacity-40" disabled={Boolean(busyKey)} onClick={() => openReasonDialog({ kind: "request", request, disposition: "rejected" })} aria-label={`Rechazar ${request.shipmentCode}`}><X className="h-4 w-4" />Rechazar</button></div> : null}
                          </>
                        )}
                      </article>
                      );
                    })}
                    </div>
                  )
                ) : <EmptyState>{confirmationCustomDateRange ? "No hay solicitudes por confirmar en el rango seleccionado." : "No hay solicitudes por confirmar en esta semana."}</EmptyState>}
                </div>
              </section>
            ) : null}
            {tab === "templates" ? (
              <section className="overflow-hidden rounded-xl border border-black bg-surface-panel">
                <LogisticsWeekNavigator
                  weekOffset={routeWeekOffset}
                  weekSummaries={preparationWeekSummaries}
                  customDateRange={routeCustomDateRange}
                  onCustomDateRangeChange={(range) => {
                    setRouteCustomDateRange(range);
                    setRouteWeekday(null);
                    setSelectedRouteId("");
                  }}
                  onWeekOffsetChange={(delta) => {
                    setRouteWeekOffset((current) => current + delta);
                    setRouteWeekday(null);
                    setSelectedRouteId("");
                  }}
                  onWeekChange={() => setSelectedRouteId("")}
                >
                  <LogisticsWeekdayTabs
                    weekdays={preparationWeekdays}
                    selectedWeekday={activePreparationWeekday}
                    onSelect={(weekday) => {
                      setRouteWeekday(weekday);
                      setSelectedRouteId("");
                    }}
                    panelId="logistics-preparation-day-panel"
                    weekStart={routeCustomDateRange ? undefined : weekStartForOffset(routeWeekOffset)}
                    compact
                  />
                </LogisticsWeekNavigator>
                <div id="logistics-preparation-day-panel" role="tabpanel" aria-label="Grupos en preparación">
                  <div className="border-b border-black px-3 py-2.5 sm:px-4">
                    <p className="text-xs font-black text-slate-200">Grupos listos para confirmar</p>
                    <p className="mt-0.5 text-[11px] font-bold text-slate-500">Revisa las cajas y confirma la ruta cuando el grupo esté completo.</p>
                  </div>
                  {templateBookingGroups.length ? (
                    <LogisticsTemplateBookingGroups
                      groups={templateBookingGroups}
                      routes={routes}
                      busyKey={busyKey}
                      canManage={canManage}
                      viewLayout={viewLayout}
                      onCreateRoute={createRouteForGroup}
                      onUpdateRoute={updateRouteForGroup}
                    />
                  ) : <EmptyState>{routeQuery.trim() ? "No encontramos grupos con esa búsqueda." : preparationWeekdays.length ? "No hay grupos esperando confirmar ruta para este día." : routeCustomDateRange ? "No hay grupos esperando confirmar ruta en el rango seleccionado." : "No hay grupos esperando confirmar ruta en esta semana."}</EmptyState>}
                </div>
              </section>
            ) : null}

            {tab === "operational" ? (
              <LogisticsUnifiedRouteList
                routes={routes}
                availableWeekdays={operationalWeekdays}
                routeMembers={routeMembers}
                query={routeQuery}
                selectedRouteId={selectedRouteId}
                onOpenRoute={(route) => setSelectedRouteId(route.id)}
                onWeekOffsetChange={(delta) => {
                  setRouteWeekOffset((current) => current + delta);
                  setRouteWeekday(null);
                  setSelectedRouteId("");
                }}
                onWeekChange={() => setSelectedRouteId("")}
                onWeekdayChange={(weekday) => {
                  setRouteWeekday(weekday);
                  setSelectedRouteId("");
                }}
                selectedWeekday={activeRouteWeekday}
                weekOffset={routeWeekOffset}
                weekSummaries={operationalWeekSummaries}
                customDateRange={routeCustomDateRange}
                onCustomDateRangeChange={(range) => {
                  setRouteCustomDateRange(range);
                  setRouteWeekday(null);
                  setSelectedRouteId("");
                }}
                viewLayout={viewLayout}
              />
            ) : null}

            {tab === "history" && visibleRoutes.length && viewLayout !== "rows" ? (
              <LogisticsHistoryRouteList
                routes={visibleRoutes}
                routeMembers={routeMembers}
                vehicles={vehicles}
                selectedRouteId={selectedRouteId}
                viewLayout={viewLayout}
                onOpenRoute={(route) => setSelectedRouteId(route.id)}
              />
            ) : tab === "history" && visibleRoutes.length ? (
              <div className="divide-y divide-black overflow-hidden rounded-xl border border-black bg-surface-panel">
                {visibleRoutes.map((route) => {
                  const driver = route.assignedTo ? memberById.get(route.assignedTo) || "Conductor" : "Sin conductor";
                  const vehicle = route.vehicleId ? vehicleById.get(route.vehicleId) : null;
                  const deliveryBoxes = routeBoxCountForTask(route, "deliver_empty_box");
                  const pickupBoxes = routeBoxCountForTask(route, "pickup_full_box");
                  const selected = route.id === selectedRouteId;
                  return (
                    <button
                      type="button"
                      key={route.id}
                      className={`route-list-row flex w-full min-w-0 items-center gap-3 px-2 py-3 text-left transition-colors hover:bg-white/[0.035] focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400 ${
                        selected ? "bg-emerald-400/[0.07]" : ""
                      }`}
                      onClick={() => setSelectedRouteId(route.id)}
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-black bg-surface-inset text-emerald-300">
                        <Route className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="text-sm font-black text-[#f8fafc]">{route.name}</span>
                          {routeStatusChip(route.status)}
                        </span>
                        <span className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs font-bold text-slate-400">
                          <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{formatRouteDate(route.routeDate)}</span>
                          <span>{route.stops.length} paradas</span>
                          <span>{countLabel(deliveryBoxes, "caja vacÃ­a para entregar", "cajas vacÃ­as para entregar")}</span>
                          {pickupBoxes ? <span>{countLabel(pickupBoxes, "caja llena para recoger", "cajas llenas para recoger")}</span> : null}
                          <span>{driver}</span>
                          {vehicle ? <span>{vehicle.plate || vehicle.name}</span> : null}
                        </span>
                      </span>
                      <span className="text-slate-600">â€º</span>
                    </button>
                  );
                })}
              </div>
            ) : tab === "history" ? <EmptyState>{routeQuery.trim() ? "No encontramos rutas con esa búsqueda." : "Todavía no hay rutas terminadas o canceladas."}</EmptyState> : null}
          </section>

          {showSelectedRoute ? <aside className="hidden min-h-0 overflow-hidden lg:block">{detail}</aside> : null}
        </div>
      )}

      {typeof document !== "undefined" && selectedRoute && showSelectedRoute
        ? createPortal(
            <div className="fixed inset-0 z-[135] flex justify-end lg:hidden">
              <button
                type="button"
                className="absolute inset-0 bg-black/65"
                aria-label="Cerrar detalle de ruta"
                onClick={dismissSelectedRoute}
              />
              <aside className="relative h-full w-full max-w-lg border-l border-black bg-[#1a221f] shadow-2xl">
                <OperationalRouteDetail
                  route={selectedRoute}
                  members={routeMembers}
                  vehicles={vehicles}
                  busyKey={busyKey}
                  onDismiss={dismissSelectedRoute}
                  onDriverChange={(driverId) => void assignDriver(selectedRoute, driverId)}
                  onVehicleChange={(vehicleId) => void assignVehicle(selectedRoute, vehicleId)}
                  onRequestClose={() => setConfirmation({ kind: "close", route: selectedRoute })}
                  onRequestCancel={() => setConfirmation({ kind: "cancel", route: selectedRoute })}
                  onRequestRemove={(stop) =>
                    openReasonDialog({
                      kind: "route-stop",
                      route: selectedRoute,
                      stop,
                      disposition: "deferred",
                    })
                  }
                  onMoveStop={(stop, direction) => void moveStop(selectedRoute, stop, direction)}
                />
              </aside>
            </div>,
            document.body,
          )
        : null}

      {confirmation && confirmationCopy ? (
        <ActionConfirmDialog
          open
          title={confirmationCopy.title}
          message={confirmationCopy.message}
          confirmLabel={confirmationCopy.confirmLabel}
          confirmingLabel={confirmationCopy.confirmingLabel}
          confirming={confirmationCopy.busy}
          tone={confirmation.kind === "close" ? "warning" : "danger"}
          onCancel={() => {
            if (!confirmationCopy.busy) setConfirmation(null);
          }}
          onConfirm={() => {
            if (confirmation.kind === "close") void closeRoute(confirmation.route);
            else if (confirmation.kind === "cancel") void cancelRoute(confirmation.route);
          }}
        />
      ) : null}

      {/* {moveDraft && routeCatalog ? (
        <div className="fixed inset-0 z-[180] flex items-center justify-center bg-black/75 p-4">
          <button
            type="button"
            className="absolute inset-0"
            aria-label="Cerrar mover de ruta"
            onClick={() => setMoveDraft(null)}
            disabled={busyKey === `move:${moveDraft.request.id}`}
          />
          <section className="relative w-full max-w-lg rounded-xl border border-black bg-surface-panel p-5 shadow-2xl" role="dialog" aria-modal="true">
            <p className="text-[10px] font-black uppercase tracking-wide text-sky-200">Mover solicitud</p>
            <h2 className="mt-1 text-xl font-black text-slate-100">
              {moveDraft.request.shipmentCode} Â· {moveDraft.request.customerName}
            </h2>
            <p className="mt-2 text-sm font-bold leading-relaxed text-slate-400">
              La solicitud saldrÃ¡ de la ruta actual y se colocarÃ¡ en una plantilla de preparaciÃ³n del nuevo dÃ­a.
            </p>
            <label className="mt-4 grid gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-wide text-slate-500">Nuevo dÃ­a</span>
              <select
                value={moveDraft.weekday}
                onChange={(event) => selectMoveWeekday(Number(event.target.value))}
                className="h-10 rounded-lg border border-black bg-surface-inset px-3 text-sm font-black text-slate-100 outline-none focus:border-emerald-400"
              >
                {moveWeekdays.map((weekday) => (
                  <option key={weekday} value={weekday}>{logisticsWeekdayFullLabels[weekday]}</option>
                ))}
              </select>
            </label>
            <div className="mt-3 rounded-lg border border-black bg-surface-inset px-3 py-2">
              <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">Fecha de esta solicitud</p>
              <p className="mt-1 text-sm font-black text-slate-100">{formatRouteDate(moveDraft.date)}</p>
            </div>
            <label className="mt-3 grid gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-wide text-slate-500">Subruta</span>
              {moveTemplates.length ? (
                <select
                  value={moveDraft.routeTemplateId}
                  onChange={(event) => setMoveDraft({ ...moveDraft, routeTemplateId: event.target.value })}
                  className="h-10 rounded-lg border border-black bg-surface-inset px-3 text-sm font-black text-slate-100 outline-none focus:border-emerald-400"
                >
                  {moveTemplates.map((template) => (
                    <option key={template.id} value={template.id}>{template.name}</option>
                  ))}
                </select>
              ) : (
                <p className="rounded-lg border border-black bg-surface-inset px-3 py-2 text-sm font-black text-slate-200">
                  Ruta general del dÃ­a
                </p>
              )}
            </label>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className={`${secondaryButtonClass} h-10`}
                onClick={() => setMoveDraft(null)}
                disabled={busyKey === `move:${moveDraft.request.id}`}
              >
                Cancelar
              </button>
              <button
                type="button"
                className={`${primaryButtonClass} h-10`}
                onClick={() => void submitMoveRequest()}
                disabled={busyKey === `move:${moveDraft.request.id}`}
              >
                {busyKey === `move:${moveDraft.request.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Mover solicitud
              </button>
            </div>
          </section>
        </div>
      ) : null} */}

      {reasonDialog ? (
        <RouteReasonDialog
          title={reasonDialog.kind === "route-stop"
            ? `${reasonDialog.disposition === "rejected" ? "Rechazar" : "Retirar"} ${reasonDialog.stop.shipmentCode || "esta caja"}`
            : `${reasonDialog.disposition === "rejected" ? "Rechazar" : "Dejar pendiente"} ${reasonDialog.request.shipmentCode}`}
          description={reasonDialog.kind === "route-stop"
            ? "La parada saldrÃ¡ de la plantilla y la tarea quedarÃ¡ disponible para una nueva decisiÃ³n. El motivo quedarÃ¡ en la bitÃ¡cora del invoice."
            : "La solicitud saldrÃ¡ de esta plantilla. El vendedor podrÃ¡ consultar el motivo en la bitÃ¡cora y volver a proponerla si corresponde."}
          value={reasonText}
          onChange={setReasonText}
          onCancel={() => {
            if (!busyKey.startsWith("decision:")) {
              setReasonDialog(null);
              setReasonText("");
            }
          }}
          onConfirm={() => void submitReasonDialog()}
          onDispositionChange={reasonDialog.kind === "route-stop"
            ? (disposition) => setReasonDialog({ ...reasonDialog, disposition })
            : undefined}
          disposition={reasonDialog.disposition}
          confirming={busyKey === (reasonDialog.kind === "request" ? `decision:${reasonDialog.request.id}` : `decision:${reasonDialog.stop.id}`)}
        />
      ) : null}
    </div>
  );
}
