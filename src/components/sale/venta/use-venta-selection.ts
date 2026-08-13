"use client";

import {
  saleCartLineId,
  saleCartTotalCost,
  type SaleDriverLeg,
} from "@/components/sale/venta/shared";
import { type MouseEvent } from "react";
import { listLogisticsRouteCatalogAction, type LogisticsRouteCatalog } from "@/app/actions/logistics-routes";
import { type SaleRouteDecision } from "@/lib/sale-route-decision";
import { isoToPlanScheduleAt } from "@/lib/shipment-schedule-history";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import {
  EMPTY_BOX_OFFICE_MODE,
  FULL_BOX_OFFICE_MODE,
} from "@/lib/sale-logistics-modes";
import type { ViewLayout } from "@/lib/view-layout";
import { ContextMenuState, contextActiveClass, selectedCardClass, salePersonRowContextActiveClass, salePersonRowSelectedClass, unselectedDimClass } from "@/components/sale/venta-parts";
import type { VentaCore } from "@/components/sale/venta/use-venta-core";
import type { VentaFoundation } from "@/components/sale/venta/use-venta-foundation";
import type { VentaData } from "@/components/sale/venta/use-venta-data";
import type { VentaFlow } from "@/components/sale/venta/use-venta-flow";
import type { VentaSelectionBase } from "@/components/sale/venta/use-venta-selection-base";

type VentaSelectionContext = VentaCore & VentaFoundation & VentaData & VentaFlow & VentaSelectionBase;

export function useVentaSelection(context: VentaSelectionContext) {
  const {
    contextMenu,
    openContextMenuAt,
    openContextMenuForTarget,
    resetSaleLogistics,
    routeCatalog,
    routePlannerLeg,
    selectedBoxLines,
    setActiveStep,
    setEmptyBoxMode,
    setEmptyBoxRouteDecision,
    setEmptyBoxScheduleAt,
    setEmptyBoxScheduleMode,
    setFullBoxMode,
    setFullBoxPickupExpanded,
    setFullBoxRouteDecision,
    setFullBoxScheduleAt,
    setFullBoxScheduleMode,
    setQuickEmptyBoxRouteDecision,
    setRouteCatalog,
    setRoutePlannerLeg,
    setSelectedBoxLines,
    setSelectedPromotionId,
    setStockMessage,
    viewLayout,
  } = context;

  function chooseBox(box: string[]) {
    resetSaleLogistics();
    const lineId = saleCartLineId(box);
    setSelectedBoxLines((current) => {
      const existing = current.find((line) => line.id === lineId);

      if (existing) {
        return current.map((line) =>
          line.id === lineId ? { ...line, quantity: line.quantity + 1 } : line,
        );
      }

      return [...current, { id: lineId, box, quantity: 1 }];
    });
    setSelectedPromotionId("");
  }

  function removeBoxFromCart(box: string[]) {
    const lineId = saleCartLineId(box);
    setSelectedBoxLines((current) => {
      const existing = current.find((line) => line.id === lineId);
      if (!existing) {
        return current;
      }

      if (existing.quantity <= 1) {
        return current.filter((line) => line.id !== lineId);
      }

      return current.map((line) =>
        line.id === lineId ? { ...line, quantity: line.quantity - 1 } : line,
      );
    });
    setSelectedPromotionId("");
  }

  function updateSelectedBoxCount(lineId: string, rawValue: string) {
    const nextCount = Math.max(Number.parseInt(rawValue, 10) || 1, 1);
    setSelectedBoxLines((current) =>
      current.map((line) => (line.id === lineId ? { ...line, quantity: nextCount } : line)),
    );
    setSelectedPromotionId("");
  }

  function adjustSelectedBoxCount(lineId: string, delta: number) {
    setSelectedBoxLines((current) =>
      current.map((line) =>
        line.id === lineId
          ? { ...line, quantity: Math.max(line.quantity + delta, 1) }
          : line,
      ),
    );
    setSelectedPromotionId("");
  }

  function removeSelectedBoxLine(lineId: string) {
    setSelectedBoxLines((current) => current.filter((line) => line.id !== lineId));
    setSelectedPromotionId("");
  }

  function selectedBoxTotalCost() {
    return saleCartTotalCost(selectedBoxLines);
  }

  function selectEmptyBoxMode(mode: string) {
    setEmptyBoxMode(mode);

    if (mode === EMPTY_BOX_OFFICE_MODE) {
      setEmptyBoxScheduleMode("");
      setEmptyBoxScheduleAt("");
      setEmptyBoxRouteDecision(null);
      return;
    }

    setEmptyBoxScheduleMode("");
    setEmptyBoxScheduleAt("");
    setEmptyBoxRouteDecision(null);
    setActiveStep("delivery");
    void openRoutePlanner("emptyBox");
  }

  function selectFullBoxMode(mode: string) {
    setFullBoxPickupExpanded(true);
    setFullBoxMode(mode);

    if (mode === FULL_BOX_OFFICE_MODE) {
      setFullBoxScheduleMode("");
      setFullBoxScheduleAt("");
      setFullBoxRouteDecision(null);
      return;
    }

    setFullBoxScheduleMode("");
    setFullBoxScheduleAt("");
    setFullBoxRouteDecision(null);
    setActiveStep("delivery");
    void openRoutePlanner("fullBox");
  }

  async function openRoutePlanner(leg: SaleDriverLeg) {
    const emptyScheduleSuggestions = {
      exact: [],
      until: [],
      from: [],
      ranges: [],
      range: [],
    };
    const fallbackCatalog: LogisticsRouteCatalog = {
      enabledDays: [],
      routeDefinitions: [],
      schedules: [],
      templates: [],
      defaultDriverByWeekday: Array<string | null>(7).fill(null),
      weekdayScheduleByWeekday: Array(7).fill(null),
      scheduleSuggestionsByWeekday: {
        delivery: Array.from({ length: 7 }, () => ({ ...emptyScheduleSuggestions })),
        pickup: Array.from({ length: 7 }, () => ({ ...emptyScheduleSuggestions })),
      },
    };

    setRoutePlannerLeg(leg);
    setRouteCatalog(fallbackCatalog);

    if (!isSupabaseConfigured()) {
      setStockMessage("Configura Supabase para programar la ruta del chofer.");
      return;
    }

    try {
      const result = await listLogisticsRouteCatalogAction();

      if (!result.ok) {
        setRouteCatalog(fallbackCatalog);
        return;
      }

      setRouteCatalog(result.data);
    } catch {
      setRouteCatalog(fallbackCatalog);
    }
  }

  function confirmSaleRoute(input: {
    scheduledAt: string;
    routeTemplateId: string;
  }) {
    if (!routePlannerLeg) {
      return;
    }

    const planScheduleAt = isoToPlanScheduleAt(input.scheduledAt);
    const routeDate = planScheduleAt.split("T")[0] || "";
    const routeLabel =
      routeCatalog?.templates.find((template) => template.id === input.routeTemplateId)?.name ||
      "Ruta del día";
    const decision: SaleRouteDecision = {
      kind: "selected",
      routeDate,
      routeTemplateId: input.routeTemplateId,
      routeLabel,
      scheduledAt: input.scheduledAt,
    };

    if (routePlannerLeg === "emptyBox") {
      setEmptyBoxScheduleMode("scheduled");
      setEmptyBoxScheduleAt(planScheduleAt);
      setEmptyBoxRouteDecision(decision);
    } else if (routePlannerLeg === "fullBox") {
      setFullBoxScheduleMode("scheduled");
      setFullBoxScheduleAt(planScheduleAt);
      setFullBoxRouteDecision(decision);
    } else {
      setQuickEmptyBoxRouteDecision(decision);
    }

    setRoutePlannerLeg(null);
  }

  function confirmSalePendingRoute(input: { routeDate: string; }) {
    if (!routePlannerLeg) {
      return;
    }

    const decision: SaleRouteDecision = { kind: "pending", routeDate: input.routeDate };

    if (routePlannerLeg === "emptyBox") {
      setEmptyBoxScheduleMode("pending");
      setEmptyBoxScheduleAt("");
      setEmptyBoxRouteDecision(decision);
    } else if (routePlannerLeg === "fullBox") {
      setFullBoxScheduleMode("pending");
      setFullBoxScheduleAt("");
      setFullBoxRouteDecision(decision);
    } else if (routePlannerLeg === "quickEmptyBox") {
      setQuickEmptyBoxRouteDecision(decision);
    }

    setRoutePlannerLeg(null);
  }

  function confirmSalePendingDay() {
    if (!routePlannerLeg || routePlannerLeg === "emptyBox" || routePlannerLeg === "quickEmptyBox") {
      return;
    }

    const decision: SaleRouteDecision = { kind: "undated", routeDate: null };

    if (routePlannerLeg === "fullBox") {
      setFullBoxScheduleMode("pending");
      setFullBoxScheduleAt("");
      setFullBoxRouteDecision(decision);
    }

    setRoutePlannerLeg(null);
  }

  function confirmSalePreferredRoute(input: { routeTemplateId: string; }) {
    if (!routePlannerLeg || routePlannerLeg === "emptyBox" || routePlannerLeg === "quickEmptyBox") {
      return;
    }

    const routeLabel =
      routeCatalog?.templates.find((template) => template.id === input.routeTemplateId)?.name ||
      "Ruta del día";
    const decision: SaleRouteDecision = {
      kind: "route_preferred",
      routeDate: null,
      routeTemplateId: input.routeTemplateId,
      routeLabel,
    };

    if (routePlannerLeg === "fullBox") {
      setFullBoxScheduleMode("pending");
      setFullBoxScheduleAt("");
      setFullBoxRouteDecision(decision);
    }

    setRoutePlannerLeg(null);
  }

  function openContextMenu(
    event: MouseEvent,
    title: string,
    type: ContextMenuState["type"],
    targetKey: string,
    phones: string[] = [],
    address: ContextMenuState["address"] = {},
    firstName = "",
    lastName = "",
    customerId?: string,
    recipientId?: string,
  ) {
    event.preventDefault();
    openContextMenuAt(
      event.clientX,
      event.clientY,
      title,
      type,
      targetKey,
      phones,
      address,
      firstName,
      lastName,
      customerId,
      recipientId,
    );
  }

  function openSaleContextFromEvent(event: MouseEvent) {
    const target = event.target instanceof Element
      ? event.target.closest<HTMLElement>("[data-sale-context-key]")
      : null;

    if (!target) {
      return;
    }

    if (!openContextMenuForTarget(target, event.clientX, event.clientY, 50)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
  }

  function contextCardClass(
    type: ContextMenuState["type"],
    targetKey: string,
    selected: boolean,
    defaultClass: string,
    groupHasSelection = false,
  ) {
    if (contextMenu?.type === type) {
      return contextMenu.targetKey === targetKey ? contextActiveClass : "";
    }

    if (selected) {
      return selectedCardClass;
    }

    if (groupHasSelection) {
      return `${defaultClass} ${unselectedDimClass}`;
    }

    return defaultClass;
  }

  function contextPersonClass(
    type: ContextMenuState["type"],
    targetKey: string,
    selected: boolean,
    groupHasSelection = false,
    layout: ViewLayout = viewLayout,
  ) {
    if (contextMenu?.type === type) {
      const activeClass =
        layout === "rows" ? salePersonRowContextActiveClass : contextActiveClass;
      return contextMenu.targetKey === targetKey ? activeClass : "";
    }

    if (selected) {
      return layout === "rows" ? salePersonRowSelectedClass : selectedCardClass;
    }

    if (groupHasSelection) {
      return unselectedDimClass;
    }

    return "";
  }

  return {
    chooseBox,
    removeBoxFromCart,
    updateSelectedBoxCount,
    adjustSelectedBoxCount,
    removeSelectedBoxLine,
    selectedBoxTotalCost,
    selectEmptyBoxMode,
    selectFullBoxMode,
    openRoutePlanner,
    confirmSaleRoute,
    confirmSalePendingRoute,
    confirmSalePendingDay,
    confirmSalePreferredRoute,
    openContextMenu,
    openSaleContextFromEvent,
    contextCardClass,
    contextPersonClass,
  };
}

export type VentaSelection = ReturnType<typeof useVentaSelection>;
