"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReadonlyURLSearchParams } from "next/navigation";
import type { LogisticsRouteCatalog as LogisticsRouteCatalogData } from "@/app/actions/logistics-routes";
import type { RouteMemberRow } from "@/lib/shipment-types";
import type { LogisticsRouteRow } from "@/lib/logistics-routing";
import {
  buildDriverPickerOptions,
  buildLogisticsDayRouteFilterOptions,
  formatLogisticsTaskStatusLabel,
  matchesLogisticsDateFilter,
  matchesLogisticsRouteTemplateFilter,
  matchesLogisticsWeekdayFilter,
  resolveLogisticsShipmentDeepLink,
  resolveLogisticsToolbarRoute,
  sortLogisticsInvoiceItemsByPriority,
} from "@/lib/logistics-view";
import {
  defaultLogisticsWeekdayFilter,
  enabledWeekdayIndexes,
  logisticsEnabledWeekdayFilterOptions,
  selectWeekdayDate,
} from "@/lib/logistics-day-route";
import { getLogisticsWeekdayIndex } from "@/lib/logistics-route-week";
import { formatScheduleDateInput } from "@/lib/schedule-date";
import { isLogisticsFailedTask } from "@/lib/logistics-reprogram";
import {
  buildLogisticsRoutesListFilters,
  logisticsRoutesListFiltersKey,
  type ListLogisticsRoutesOptions,
} from "@/lib/logistics-routes-pagination";
import { taskTypeLabel } from "@/components/logistica/lib/constants";
import type { LogisticsInvoiceItem, LogisticsTaskItem, TaskAddressMeta } from "@/components/logistica/types";

export function useLogisticsFilters({
  routes,
  routeCatalog,
  routeMembers,
  loaded,
  searchParams,
  allTasks,
  routeByTaskId,
  addressByTaskId,
  invoiceItems,
  onRouteServerFiltersChange,
}: {
  routes: LogisticsRouteRow[];
  routeCatalog: LogisticsRouteCatalogData | undefined;
  routeMembers: RouteMemberRow[];
  loaded: boolean;
  searchParams: ReadonlyURLSearchParams;
  allTasks: LogisticsTaskItem[];
  routeByTaskId: Map<string, { route: LogisticsRouteRow; stop: import("@/lib/logistics-routing").LogisticsRouteStopRow }>;
  addressByTaskId: Map<string, TaskAddressMeta>;
  invoiceItems: LogisticsInvoiceItem[];
  onRouteServerFiltersChange?: (filters: ListLogisticsRoutesOptions) => void;
}) {
  const appliedDeepLinkRef = useRef(false);
  const weekdayFilterInitializedRef = useRef(false);

  const [query, setQuery] = useState("");
  const [todayDate] = useState(() => formatScheduleDateInput(new Date()));
  const [weekdayFilter, setWeekdayFilter] = useState<number | null>(null);
  const [routeTemplateFilter, setRouteTemplateFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [driverFilter, setDriverFilter] = useState("");
  const [zoneFilter, setZoneFilter] = useState("");
  const [failedFilter, setFailedFilter] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [operationScope, setOperationScope] = useState<"domicilios" | "agencias">("domicilios");
  const [showRouteHistory, setShowRouteHistory] = useState(false);
  const [selectedRouteId, setSelectedRouteId] = useState("");
  const [highlightTaskId, setHighlightTaskId] = useState<string | null>(null);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [routeAssignmentOpen, setRouteAssignmentOpen] = useState(false);

  const memberById = useMemo(() => {
    return new Map(routeMembers.map((member) => [member.id, member.label]));
  }, [routeMembers]);

  const filterDriverPickerOptions = useMemo(
    () => buildDriverPickerOptions(routeMembers, "Todo chofer"),
    [routeMembers],
  );

  const todayWeekday = getLogisticsWeekdayIndex(todayDate);

  const availableFilterWeekdays = useMemo(
    () => enabledWeekdayIndexes(routeCatalog?.enabledDays || []),
    [routeCatalog?.enabledDays],
  );

  const weekdayFilterOptions = useMemo(
    () => logisticsEnabledWeekdayFilterOptions(availableFilterWeekdays),
    [availableFilterWeekdays],
  );

  const filterRoutePickerOptions = useMemo(
    () =>
      buildLogisticsDayRouteFilterOptions({
        weekday: weekdayFilter,
        templates: routeCatalog?.templates || [],
        enabledWeekdays: routeCatalog?.enabledDays || [],
      }),
    [routeCatalog?.enabledDays, routeCatalog?.templates, weekdayFilter],
  );

  const filterAnchorDate = useMemo(() => {
    if (dateFilter) {
      return dateFilter;
    }
    if (weekdayFilter == null) {
      return todayDate;
    }
    return selectWeekdayDate(weekdayFilter, todayDate);
  }, [dateFilter, todayDate, weekdayFilter]);

  const toolbarRoute = useMemo(() => {
    if (!routeTemplateFilter) {
      return null;
    }
    return resolveLogisticsToolbarRoute({
      routes,
      routeTemplateId: routeTemplateFilter,
      routeDate: dateFilter || filterAnchorDate,
    });
  }, [dateFilter, filterAnchorDate, routeTemplateFilter, routes]);

  function selectWeekdayFilter(next: number | null) {
    setWeekdayFilter(next);
    setRouteTemplateFilter("");
    setDateFilter(next == null ? "" : selectWeekdayDate(next, todayDate));
  }

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (!availableFilterWeekdays.length) {
        weekdayFilterInitializedRef.current = false;
        setWeekdayFilter((current) => (current == null ? current : null));
        setRouteTemplateFilter("");
        setDateFilter("");
        return;
      }

      if (!weekdayFilterInitializedRef.current) {
        weekdayFilterInitializedRef.current = true;
        const initial = defaultLogisticsWeekdayFilter(availableFilterWeekdays, todayWeekday);
        setWeekdayFilter(initial);
        setRouteTemplateFilter("");
        setDateFilter(initial == null ? "" : selectWeekdayDate(initial, todayDate));
        return;
      }

      setWeekdayFilter((current) => {
        if (current == null || availableFilterWeekdays.includes(current)) {
          return current;
        }
        const next = defaultLogisticsWeekdayFilter(availableFilterWeekdays, todayWeekday);
        setRouteTemplateFilter("");
        setDateFilter(next == null ? "" : selectWeekdayDate(next, todayDate));
        return next;
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [availableFilterWeekdays, todayDate, todayWeekday]);

  const taskSearchOptions = useMemo(
    () =>
      invoiceItems.map((item) => {
        const task = item.currentTask || item.nextTask;
        const address = task ? addressByTaskId.get(task.id) : undefined;

        return {
          value: item.shipment.id,
          label: `${item.shipment.code} - ${item.shipment.customer_name}`,
          searchText: [
            item.shipment.code,
            item.shipment.customer_name,
            item.shipment.customerPhone,
            item.shipment.country,
            item.shipment.carrier,
            task ? taskTypeLabel[item.step.stepType] : null,
            task ? formatLogisticsTaskStatusLabel(task.status, task.assignedTo, memberById) : null,
            item.quote?.label,
            task?.notes,
            memberById.get(task?.assignedTo || ""),
            address?.zoneLabel,
            address?.address.formattedAddress,
          ]
            .filter(Boolean)
            .join(" "),
        };
      }),
    [addressByTaskId, invoiceItems, memberById],
  );

  const filteredInvoiceItems = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();
    const cleanType = typeFilter.trim();
    const cleanDriver = driverFilter.trim();
    const cleanZone = zoneFilter.trim();

    return sortLogisticsInvoiceItemsByPriority(
      invoiceItems.filter((item) => {
        const task = item.currentTask;
        const fallbackTask = item.currentTask || item.nextTask;
        const address = fallbackTask ? addressByTaskId.get(fallbackTask.id) : undefined;
        const routeInfo = task ? routeByTaskId.get(task.id) : undefined;
        const dateMatches = matchesLogisticsWeekdayFilter({
          weekdayFilter,
          scheduledAt: task?.scheduledAt || task?.requestedScheduleAt || null,
          routeDate: routeInfo?.route.routeDate,
        });
        const routeMatches = matchesLogisticsRouteTemplateFilter({
          routeTemplateIdFilter: routeTemplateFilter,
          routeTemplateId: routeInfo?.route.routeTemplateId,
        });
        const calendarMatches = matchesLogisticsDateFilter({
          dateFilter,
          scheduledAt: task?.scheduledAt || task?.requestedScheduleAt || null,
          routeDate: routeInfo?.route.routeDate,
        });
        const haystack = [
          item.shipment.code,
          item.shipment.customer_name,
          item.shipment.customerPhone,
          item.shipment.country,
          item.shipment.carrier,
          item.shipment.invoice_priority ? "prioridad" : null,
          taskTypeLabel[item.step.stepType],
          fallbackTask?.notes,
          item.quote?.label,
          memberById.get(task?.assignedTo || ""),
          address?.zoneLabel,
          address?.address.formattedAddress,
          routeInfo?.route.name,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return (
          dateMatches &&
          routeMatches &&
          calendarMatches &&
          (!cleanQuery || haystack.includes(cleanQuery)) &&
          (!cleanType || item.step.stepType === cleanType) &&
          (!cleanDriver || task?.assignedTo === cleanDriver || routeInfo?.route.assignedTo === cleanDriver) &&
          (!cleanZone || address?.zoneKey === cleanZone)
        );
      }),
    );
  }, [
    addressByTaskId,
    dateFilter,
    driverFilter,
    invoiceItems,
    memberById,
    query,
    routeByTaskId,
    routeTemplateFilter,
    typeFilter,
    weekdayFilter,
    zoneFilter,
  ]);

  const filteredTasks = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();
    const cleanType = typeFilter.trim();
    const cleanDriver = driverFilter.trim();
    const cleanZone = zoneFilter.trim();

    return allTasks.filter((task) => {
      const address = addressByTaskId.get(task.id);
      const routeInfo = routeByTaskId.get(task.id);
      const dateMatches = matchesLogisticsWeekdayFilter({
        weekdayFilter,
        scheduledAt: task.scheduledAt || task.requestedScheduleAt || null,
        routeDate: routeInfo?.route.routeDate,
      });
      const routeMatches = matchesLogisticsRouteTemplateFilter({
        routeTemplateIdFilter: routeTemplateFilter,
        routeTemplateId: routeInfo?.route.routeTemplateId,
      });
      const calendarMatches = matchesLogisticsDateFilter({
        dateFilter,
        scheduledAt: task.scheduledAt || task.requestedScheduleAt || null,
        routeDate: routeInfo?.route.routeDate,
      });
      const haystack = [
        task.shipment.code,
        task.shipment.customer_name,
        task.shipment.customerPhone,
        task.shipment.country,
        task.shipment.carrier,
        taskTypeLabel[task.taskType],
        formatLogisticsTaskStatusLabel(task.status, task.assignedTo, memberById),
        task.quote?.label,
        task.notes,
        memberById.get(task.assignedTo || ""),
        address?.zoneLabel,
        address?.address.formattedAddress,
        routeInfo?.route.name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return (
        dateMatches &&
        routeMatches &&
        calendarMatches &&
        (!cleanQuery || haystack.includes(cleanQuery)) &&
        (!cleanType || task.taskType === cleanType) &&
        (!cleanDriver || task.assignedTo === cleanDriver || routeInfo?.route.assignedTo === cleanDriver) &&
        (!cleanZone || address?.zoneKey === cleanZone)
      );
    });
  }, [
    addressByTaskId,
    allTasks,
    dateFilter,
    driverFilter,
    memberById,
    query,
    routeByTaskId,
    routeTemplateFilter,
    typeFilter,
    weekdayFilter,
    zoneFilter,
  ]);

  const failedTasks = useMemo(
    () =>
      filteredTasks.filter((task) => isLogisticsFailedTask(task) && !routeByTaskId.has(task.id)),
    [filteredTasks, routeByTaskId],
  );

  const failedInvoiceItems = useMemo<LogisticsInvoiceItem[]>(() => {
    return failedTasks.map((task) => ({
      shipment: task.shipment,
      quote: task.quote,
      step: {
        stepType: task.taskType,
        currentTask: task,
        nextTask: null,
        emptyBoxDone: false,
        pickupReady: false,
        canAssignDriver: false,
        assignment: "unassigned" as const,
      },
      currentTask: task,
      nextTask: null,
    }));
  }, [failedTasks]);

  const visibleInvoiceItems = useMemo(
    () => (failedFilter ? failedInvoiceItems : filteredInvoiceItems),
    [failedFilter, failedInvoiceItems, filteredInvoiceItems],
  );

  useEffect(() => {
    if (!loaded || appliedDeepLinkRef.current) {
      return;
    }

    const shipmentCode = searchParams.get("q")?.trim();
    if (!shipmentCode) {
      return;
    }

    appliedDeepLinkRef.current = true;
    const focus = resolveLogisticsShipmentDeepLink(shipmentCode, allTasks, routeByTaskId);

    const frame = window.requestAnimationFrame(() => {
      setQuery(focus.query);
      if (focus.clearDateFilter) {
        setDateFilter("");
      }
      if (focus.routeId) {
        setSelectedRouteId(focus.routeId);
      }
      if (focus.highlightTaskId) {
        setHighlightTaskId(focus.highlightTaskId);
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, [allTasks, loaded, routeByTaskId, searchParams]);

  useEffect(() => {
    if (!highlightTaskId) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      const element = document.querySelector(`[data-logistics-task-id="${highlightTaskId}"]`);
      element?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });

    const timeout = window.setTimeout(() => {
      setHighlightTaskId(null);
    }, 4000);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timeout);
    };
  }, [filteredInvoiceItems, highlightTaskId, selectedRouteId]);

  const routeServerFilters = useMemo(
    () =>
      buildLogisticsRoutesListFilters({
        dateFilter,
        weekdayFilter,
        driverFilter,
        zoneFilter,
        routeTemplateFilter,
        showRouteHistory,
      }),
    [dateFilter, driverFilter, routeTemplateFilter, showRouteHistory, weekdayFilter, zoneFilter],
  );

  const routeServerFiltersKey = logisticsRoutesListFiltersKey(routeServerFilters);
  const lastRouteServerFiltersKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!loaded || !onRouteServerFiltersChange) {
      return;
    }

    if (lastRouteServerFiltersKeyRef.current === routeServerFiltersKey) {
      return;
    }

    lastRouteServerFiltersKeyRef.current = routeServerFiltersKey;
    onRouteServerFiltersChange(routeServerFilters);
  }, [loaded, onRouteServerFiltersChange, routeServerFilters, routeServerFiltersKey]);

  // Routes arrive already filtered/paginated from the server.
  const filteredRoutes = routes;

  const selectedRoute = useMemo(() => {
    return routes.find((route) => route.id === selectedRouteId) || filteredRoutes[0] || null;
  }, [filteredRoutes, routes, selectedRouteId]);

  const defaultWeekdayFilter = defaultLogisticsWeekdayFilter(availableFilterWeekdays, todayWeekday);
  const defaultDateFilter =
    defaultWeekdayFilter == null ? "" : selectWeekdayDate(defaultWeekdayFilter, todayDate);
  const hasFilters = Boolean(
    query.trim() ||
      weekdayFilter !== defaultWeekdayFilter ||
      routeTemplateFilter ||
      dateFilter !== defaultDateFilter ||
      typeFilter ||
      driverFilter ||
      zoneFilter ||
      failedFilter,
  );

  const selectedTasks = useMemo(
    () => allTasks.filter((task) => selectedTaskIds.includes(task.id)),
    [allTasks, selectedTaskIds],
  );

  const assignableRoutes = useMemo(
    () =>
      routes.filter(
        (route) =>
          route.status === "draft" ||
          route.status === "planned" ||
          route.status === "in_progress",
      ),
    [routes],
  );

  function taskCanBeSelectedForRoute(task: LogisticsTaskItem, routeInfo?: { route: LogisticsRouteRow }) {
    return !routeInfo && task.status !== "completed" && task.status !== "cancelled";
  }

  function toggleTaskSelection(task: LogisticsTaskItem, routeInfo?: { route: LogisticsRouteRow }) {
    if (!taskCanBeSelectedForRoute(task, routeInfo)) {
      return;
    }

    setSelectedTaskIds((current) =>
      current.includes(task.id) ? current.filter((id) => id !== task.id) : [...current, task.id],
    );
  }

  return {
    query,
    setQuery,
    todayDate,
    weekdayFilter,
    setWeekdayFilter,
    routeTemplateFilter,
    setRouteTemplateFilter,
    dateFilter,
    setDateFilter,
    typeFilter,
    setTypeFilter,
    driverFilter,
    setDriverFilter,
    zoneFilter,
    setZoneFilter,
    failedFilter,
    setFailedFilter,
    filtersOpen,
    setFiltersOpen,
    operationScope,
    setOperationScope,
    showRouteHistory,
    setShowRouteHistory,
    selectedRouteId,
    setSelectedRouteId,
    highlightTaskId,
    selectedTaskIds,
    setSelectedTaskIds,
    routeAssignmentOpen,
    setRouteAssignmentOpen,
    memberById,
    filterDriverPickerOptions,
    weekdayFilterOptions,
    filterRoutePickerOptions,
    filterAnchorDate,
    toolbarRoute,
    selectWeekdayFilter,
    taskSearchOptions,
    filteredInvoiceItems,
    visibleInvoiceItems,
    filteredRoutes,
    selectedRoute,
    hasFilters,
    selectedTasks,
    assignableRoutes,
    failedTasks,
    taskCanBeSelectedForRoute,
    toggleTaskSelection,
    availableFilterWeekdays,
    defaultWeekdayFilter,
  };
}
