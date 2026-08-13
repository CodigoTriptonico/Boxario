"use client";

import {
  Building2,
  Check,
  CircleDollarSign,
  Home,
  MapPinCheck,
  Package,
  PackageCheck,
  Plane,
  Receipt,
  Store,
  Truck,
  type LucideIcon,
} from "lucide-react";
import { useCallback, useLayoutEffect, useRef, useState } from "react";
import type { ShipmentRow, ShipmentStatus } from "@/lib/shipment-types";
import { pickupServiceWindow } from "@/lib/pickup-service-window";
import {
  legHasScheduleChange,
  planLegRecord,
  type LogisticsLegKey,
} from "@/lib/shipment-schedule-history";
import {
  EMPTY_BOX_LEG_LABELS,
  FULL_BOX_LEG_LABELS,
  logisticsLegCompactLabel,
} from "@/lib/shipment-leg-labels";
import type { ShipmentAuditContext } from "@/lib/shipment-audit";
import {
  EMPTY_BOX_DRIVER_MODE,
  EMPTY_BOX_OFFICE_MODE,
  FULL_BOX_DRIVER_MODE,
  FULL_BOX_OFFICE_MODE,
} from "@/components/sale/venta-parts";
import {
  ShipmentStepContextMenu,
  isLogisticsLegKind,
  isStatusStepKind,
  logisticsLegMenuSummary,
  statusForProgressKind,
  type ShipmentStepMenuState,
} from "@/components/shipment-step-context-menu";
import { ShipmentStepDetailPanel } from "@/components/shipment-step-detail-panel";
import {
  canRevertFullBoxOfficeReception,
  emptyBoxLegLockReason,
  emptyBoxLegLocked,
  fullBoxLegLockReason,
  fullBoxLegLocked,
  shipmentLogisticsEditorState,
  type ShipmentLogisticsEditorState,
} from "@/lib/shipment-logistics-edit";
import type {
  ShipmentProgressChannel,
  ShipmentProgressKind,
  ShipmentProgressStep,
} from "@/lib/shipment-display";
import {
  saleAgeTextClass,
  stepShortName,
  stepTimingTooltip,
  type ShipmentTimings,
} from "@/lib/shipment-timing";

type ShipmentProgressStepsProps = {
  steps: ShipmentProgressStep[];
  timings?: ShipmentTimings;
  row?: ShipmentRow;
  canEdit?: boolean;
  canEditLogistics?: boolean;
  canEditStatus?: boolean;
  saving?: boolean;
  compact?: boolean;
  singleLine?: boolean;
  onLogisticsPatch?: (patch: Partial<ShipmentLogisticsEditorState>, audit: ShipmentAuditContext) => void;
  onStatusChange?: (status: ShipmentStatus, audit: ShipmentAuditContext) => void;
  onFullBoxReceivedAtOffice?: (audit: ShipmentAuditContext) => void;
  onRevertFullBoxOfficeReception?: (audit: ShipmentAuditContext) => void;
  onProgramRoute?: (kind: "empty_box" | "full_box") => void;
  routeByTaskId?: (taskId: string) => {
    routeName: string;
    assignedTo: string | null;
    routeTemplateId: string | null;
  } | undefined;
  requestedRouteTaskIds?: Set<string>;
  onLockedLeg?: (message: string) => void;
};

function stepDotClass(state: ShipmentProgressStep["state"]) {
  if (state === "done") {
    return "border-emerald-600 bg-emerald-400 text-slate-950";
  }

  if (state === "active") {
    return "border-amber-500 bg-amber-400 text-slate-950";
  }

  return "border-black bg-surface-inset text-slate-500";
}

function timelineRowClass(state: ShipmentProgressStep["state"], interactive: boolean, compact: boolean) {
  const base = compact ? "rounded px-1 py-0 transition" : "rounded-lg px-2 py-1.5 transition";

  if (state === "active") {
    return `${base} bg-amber-950/30`;
  }

  if (state === "pending") {
    return `${base} text-slate-300`;
  }

  if (interactive) {
    return `${base} cursor-pointer hover:bg-surface-inset/60`;
  }

  return base;
}

function timelineLineClass(state: ShipmentProgressStep["state"]) {
  return state === "done" ? "bg-emerald-500/70" : "bg-surface-inset";
}

function stepIcon(kind: ShipmentProgressKind, channel: ShipmentProgressChannel): LucideIcon {
  if (kind === "sale") {
    return Receipt;
  }

  if (kind === "payment") {
    return CircleDollarSign;
  }

  if (kind === "empty_box") {
    if (channel === "home") {
      return Truck;
    }

    return channel === "office" ? Store : Package;
  }

  if (kind === "full_box") {
    if (channel === "home") {
      return Home;
    }

    return PackageCheck;
  }

  if (kind === "office") {
    return Building2;
  }

  if (kind === "pickup") {
    return Truck;
  }

  if (kind === "transit") {
    return Plane;
  }

  return MapPinCheck;
}

/** Pendiente = ámbar outline; en logística = cian relleno (distinto de hecho = verde). */
function compactLogisticsLegUsesOutline(step: ShipmentProgressStep) {
  if (step.state !== "active") {
    return false;
  }

  if (step.kind !== "empty_box" && step.kind !== "full_box") {
    return false;
  }

  return !step.driverTaskOrdered;
}

function compactStepNodeClass(
  step: ShipmentProgressStep,
  isDetailOpen: boolean,
) {
  const detailRing = isDetailOpen
    ? "ring-2 ring-emerald-400 ring-offset-2 ring-offset-surface-list-row"
    : "";

  if (compactLogisticsLegUsesOutline(step)) {
    return `border-amber-400 bg-amber-400/10 text-amber-200 ${detailRing}`;
  }

  if (step.state === "done") {
    return `border-emerald-500 bg-emerald-400 text-slate-950 ${detailRing}`;
  }

  if (step.state === "active") {
    if (step.kind === "empty_box" || step.kind === "full_box") {
      return `border-sky-400 bg-sky-400 text-slate-950 ${detailRing}`;
    }
    return `border-amber-400 bg-amber-400 text-slate-950 ${detailRing}`;
  }

  return `border-slate-600 bg-surface-inset text-slate-500 ${detailRing}`;
}

function compactStepLabelClass(step: ShipmentProgressStep) {
  if (step.state === "done") {
    return "text-emerald-300";
  }

  if (step.state === "active") {
    if (compactLogisticsLegUsesOutline(step)) {
      return "text-amber-100";
    }
    if (step.kind === "empty_box" || step.kind === "full_box") {
      return "text-sky-200";
    }
    return "text-slate-100";
  }

  return "text-slate-500";
}

function compactConnectorClass(done: boolean) {
  return done ? "bg-emerald-500/75" : "bg-slate-700";
}

function compactStepName(
  step: ShipmentProgressStep,
  row?: ShipmentRow,
  routeByTaskId?: ShipmentProgressStepsProps["routeByTaskId"],
  requestedRouteTaskIds?: Set<string>,
) {
  if (step.kind === "empty_box" || step.kind === "full_box") {
    const taskType =
      step.kind === "empty_box" ? "deliver_empty_box" : "pickup_full_box";
    const task = row?.logisticsTasks.find(
      (candidate) =>
        candidate.taskType === taskType && candidate.status !== "cancelled",
    );
    const assignedRoute = task ? routeByTaskId?.(task.id) : undefined;

    return logisticsLegCompactLabel(step.kind, {
      active: step.state === "active",
      ordered: Boolean(
        task && (assignedRoute?.routeName || requestedRouteTaskIds?.has(task.id)),
      ),
      scheduledAt: task?.scheduledAt || task?.requestedScheduleAt || null,
      routeConfirmed: Boolean(assignedRoute?.routeName),
    });
  }

  if (step.kind === "pickup") {
    return "Salida";
  }

  return stepShortName(step.kind);
}

function legLockReason(row: ShipmentRow, kind: ShipmentProgressKind) {
  if (kind === "empty_box") {
    return emptyBoxLegLocked(row) ? emptyBoxLegLockReason(row) : "";
  }

  if (kind === "full_box") {
    return fullBoxLegLocked(row) ? fullBoxLegLockReason(row) : "";
  }

  return "";
}

export function stepIsReachable(step: ShipmentProgressStep) {
  return step.state === "active" || step.state === "done";
}

function toggleLegPatch(
  state: ShipmentLogisticsEditorState,
  kind: "empty_box" | "full_box",
): Partial<ShipmentLogisticsEditorState> {
  if (kind === "empty_box") {
    const toDriver = state.emptyBoxMode === EMPTY_BOX_OFFICE_MODE;

    return {
      emptyBoxMode: toDriver ? EMPTY_BOX_DRIVER_MODE : EMPTY_BOX_OFFICE_MODE,
      emptyBoxHandingNow: toDriver ? false : state.emptyBoxHandingNow,
      emptyBoxScheduleMode: toDriver ? state.emptyBoxScheduleMode || "pending" : "pending",
      emptyBoxScheduleAt: toDriver ? state.emptyBoxScheduleAt : "",
    };
  }

  const toDriver = state.fullBoxMode === FULL_BOX_OFFICE_MODE;

  return {
    fullBoxMode: toDriver ? FULL_BOX_DRIVER_MODE : FULL_BOX_OFFICE_MODE,
    fullBoxScheduleMode: toDriver ? state.fullBoxScheduleMode || "pending" : "pending",
    fullBoxScheduleAt: toDriver ? state.fullBoxScheduleAt : "",
  };
}

export function ShipmentProgressSteps({
  steps,
  timings,
  row,
  canEdit = false,
  canEditLogistics,
  canEditStatus,
  saving = false,
  compact = false,
  singleLine = false,
  onLogisticsPatch,
  onStatusChange,
  onFullBoxReceivedAtOffice,
  onRevertFullBoxOfficeReception,
  onProgramRoute,
  routeByTaskId,
  requestedRouteTaskIds,
  onLockedLeg,
}: ShipmentProgressStepsProps) {
  const [menu, setMenu] = useState<ShipmentStepMenuState>(null);
  const [detailStepId, setDetailStepId] = useState<string | null>(null);
  const [detailAnchor, setDetailAnchor] = useState<DOMRect | null>(null);
  const [detailStepAnchor, setDetailStepAnchor] = useState<DOMRect | null>(null);
  const progressCardRef = useRef<HTMLDivElement>(null);
  const stepButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const editorState = row ? shipmentLogisticsEditorState(row) : null;
  const logisticsEditable = canEditLogistics ?? canEdit;
  const statusEditable = canEditStatus ?? canEdit;

  function stepAllowsEdit(step: ShipmentProgressStep) {
    if (isLogisticsLegKind(step.kind)) {
      return logisticsEditable;
    }

    if (isStatusStepKind(step.kind)) {
      return statusEditable;
    }

    return false;
  }

  function menuLockReason(kind: ShipmentProgressKind) {
    if (isLogisticsLegKind(kind) && !logisticsEditable) {
      return "Sin permiso para cambiar esta etapa";
    }

    if (isStatusStepKind(kind) && !statusEditable) {
      return "Sin permiso para cambiar el estado";
    }

    if (!row || !isLogisticsLegKind(kind)) {
      return "";
    }

    return legLockReason(row, kind);
  }

  function menuLegContext(kind: ShipmentProgressKind) {
    if (!editorState || !isLogisticsLegKind(kind)) {
      return {
        currentLegMode: "",
        legOrdered: false,
        currentSummary: "",
      };
    }

    const taskType = kind === "empty_box" ? "deliver_empty_box" : "pickup_full_box";
    const activeTask = row?.logisticsTasks.find(
      (task) => task.taskType === taskType && task.status !== "cancelled",
    );
    const legOrdered = Boolean(activeTask);
    const assignedRoute = activeTask ? routeByTaskId?.(activeTask.id) : undefined;

    return {
      currentLegMode: kind === "empty_box" ? editorState.emptyBoxMode : editorState.fullBoxMode,
      legOrdered,
      routeName: assignedRoute?.routeName || "",
      emptyBoxHandingNow: editorState.emptyBoxHandingNow,
      currentSummary: logisticsLegMenuSummary(kind, editorState),
      scheduleChanged: legHasScheduleChange(
        planLegRecord(row?.logistics_plan, (kind === "empty_box" ? "emptyBox" : "fullBox") as LogisticsLegKey),
      ),
    };
  }

  const syncDetailAnchors = useCallback((stepId: string | null = detailStepId) => {
    setDetailAnchor(progressCardRef.current?.getBoundingClientRect() ?? null);
    setDetailStepAnchor(
      stepId ? stepButtonRefs.current[stepId]?.getBoundingClientRect() ?? null : null,
    );
  }, [detailStepId]);

  function shouldOpenLegMenuOnClick(step: ShipmentProgressStep) {
    return (step.kind === "empty_box" || step.kind === "full_box") && step.state === "active";
  }

  function openStepMenu(
    step: ShipmentProgressStep,
    x: number,
    y: number,
    trigger: "left_click" | "context_menu",
  ) {
    setMenu({
      kind: step.kind,
      title: step.title,
      x,
      y,
      trigger,
    });
  }

  function openStepMenuFromButton(
    step: ShipmentProgressStep,
    stepId: string,
    fallbackEvent?: React.MouseEvent,
  ) {
    const rect = stepButtonRefs.current[stepId]?.getBoundingClientRect();

    openStepMenu(
      step,
      rect ? Math.min(rect.left, window.innerWidth - 300) : fallbackEvent?.clientX ?? 0,
      rect ? rect.bottom + 6 : fallbackEvent?.clientY ?? 0,
      "left_click",
    );
  }

  function handleLeftClick(step: ShipmentProgressStep, event?: React.MouseEvent) {
    if (!stepIsInteractive(step)) {
      return;
    }

    if (!stepAllowsEdit(step) || saving || !row) {
      return;
    }

    if (isLogisticsLegKind(step.kind)) {
      if (shouldOpenLegMenuOnClick(step)) {
        if (event) {
          openStepMenu(step, event.clientX, event.clientY, "left_click");
        }
        return;
      }

      const lock = legLockReason(row, step.kind);
      if (lock) {
        if (
          step.kind === "full_box" &&
          canRevertFullBoxOfficeReception(row) &&
          onRevertFullBoxOfficeReception &&
          event
        ) {
          openStepMenu(step, event.clientX, event.clientY, "left_click");
          return;
        }

        onLockedLeg?.(lock);
        return;
      }

      if (!editorState) {
        return;
      }

      onLogisticsPatch?.(toggleLegPatch(editorState, step.kind), {
        interaction: "left_click",
        source: "envios.progress",
        stepTitle: step.title,
        stepKind: step.kind,
      });
      return;
    }

    if (isStatusStepKind(step.kind)) {
      const status = statusForProgressKind(step.kind);
      if (status) {
        onStatusChange?.(status, {
          interaction: "left_click",
          source: "envios.progress",
          stepTitle: step.title,
          stepKind: step.kind,
        });
      }
    }
  }

  function handleContextMenu(event: React.MouseEvent, step: ShipmentProgressStep) {
    if (!stepIsInteractive(step)) {
      return;
    }

    if (!stepAllowsEdit(step) || saving || !row) {
      return;
    }

    if (!isLogisticsLegKind(step.kind) && !isStatusStepKind(step.kind)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    setMenu({
      kind: step.kind,
      title: step.title,
      x: event.clientX,
      y: event.clientY,
      trigger: "context_menu",
    });
  }

  const activeMenuKind = menu?.kind;
  const menuScheduleMode =
    activeMenuKind === "empty_box"
      ? editorState?.emptyBoxScheduleMode || "pending"
      : activeMenuKind === "full_box"
        ? editorState?.fullBoxScheduleMode || "pending"
        : "pending";
  const menuScheduleAt =
    activeMenuKind === "empty_box"
      ? editorState?.emptyBoxScheduleAt || ""
      : activeMenuKind === "full_box"
        ? editorState?.fullBoxScheduleAt || ""
        : "";

  function stepIsInteractive(step: ShipmentProgressStep) {
    return stepAllowsEdit(step) && !saving && Boolean(row) && stepIsReachable(step);
  }

  function openContextMenu(event: React.MouseEvent, step: ShipmentProgressStep) {
    if (!stepIsInteractive(step)) {
      return;
    }

    handleContextMenu(event, step);
  }

  const activeStep = steps.find((step) => step.state === "active") ?? steps[steps.length - 1];
  const detailStep = detailStepId ? steps.find((step) => step.id === detailStepId) : null;
  const detailStepNumber = detailStep ? steps.findIndex((step) => step.id === detailStep.id) + 1 : 0;

  useLayoutEffect(() => {
    if (!detailStepId) {
      return;
    }

    syncDetailAnchors(detailStepId);

    function handleViewportChange() {
      syncDetailAnchors(detailStepId);
    }

    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);

    return () => {
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [detailStepId, syncDetailAnchors]);

  const detailPanel =
    row && detailStep ? (
      <ShipmentStepDetailPanel
        row={row}
        step={detailStep}
        stepNumber={detailStepNumber}
        totalSteps={steps.length}
        timings={timings}
        anchorRect={detailAnchor}
        stepAnchorRect={detailStepAnchor}
        onClose={() => setDetailStepId(null)}
      />
    ) : null;

  const contextMenuPanel =
    row && menu ? (
      <ShipmentStepContextMenu
        menu={menu}
        lockReason={menuLockReason(menu.kind)}
        scheduleMode={menuScheduleMode}
        scheduleAt={menuScheduleAt}
        {...menuLegContext(menu.kind)}
        latePickupNotice={(() => {
          if (menu.kind !== "full_box") return "";
          const pickupWindow = pickupServiceWindow({
            logisticsPlan: row.logistics_plan,
            emptyBoxDeliveredAt: row.empty_box_delivered_at,
          });
          return pickupWindow?.chargeApplies
            ? `El plazo incluido venció. Al pedir que el chofer la recoja se agregará ${pickupWindow.latePickupFee} al invoice.`
            : "";
        })()}
        currentStatus={row.status}
        onClose={() => setMenu(null)}
        onApply={(patch) => {
          onLogisticsPatch?.(patch, {
            interaction: "context_menu",
            source: "envios.progress",
            stepTitle: menu.title,
            stepKind: menu.kind,
          });
          setMenu(null);
        }}
        onStatusChange={(status) => {
          onStatusChange?.(status, {
            interaction: "context_menu",
            source: "envios.progress",
            stepTitle: menu.title,
            stepKind: menu.kind,
          });
        }}
        onFullBoxReceivedAtOffice={() => {
          onFullBoxReceivedAtOffice?.({
            interaction: "context_menu",
            source: "envios.progress",
            stepTitle: menu.title,
            stepKind: menu.kind,
          });
        }}
        onRevertFullBoxOfficeReception={
          row && canRevertFullBoxOfficeReception(row)
            ? () => {
                onRevertFullBoxOfficeReception?.({
                  interaction: "context_menu",
                  source: "envios.progress",
                  stepTitle: menu.title,
                  stepKind: menu.kind,
                });
              }
            : undefined
        }
        onProgramRoute={onProgramRoute}
      />
    ) : null;

  if (compact) {
    const waiting = activeStep?.state === "active";
    const focusStep = waiting ? activeStep : steps.filter((step) => step.state === "done").at(-1) ?? activeStep;
    const stepButtonClass = singleLine
      ? "group relative flex min-h-12 w-full min-w-0 flex-col items-center gap-1 px-1 py-0.5 text-center disabled:cursor-default"
      : "group relative flex min-h-14 w-full min-w-0 flex-col items-center gap-1.5 px-1 py-0.5 text-center disabled:cursor-default";
    const stepLabelClass = singleLine
      ? "w-full min-w-0 whitespace-normal break-words text-[10px] font-black leading-tight sm:truncate sm:whitespace-nowrap sm:text-[11px]"
      : "w-full min-w-0 text-[11px] font-black leading-tight";
    const stepIconWrapClass = singleLine ? "h-7 w-7" : "h-8 w-8";
    const stepIconClass = singleLine ? "h-3.5 w-3.5" : "h-4 w-4";

    const stepButtons = steps.map((step, index) => {
      const isDetailOpen = detailStepId === step.id;
      const Icon = stepIcon(step.kind, step.channel);
      const connectorTopClass = singleLine ? "top-[1.05rem]" : "top-4";

      return (
        <button
          type="button"
          key={step.id}
          disabled={!stepIsInteractive(step)}
          ref={(element) => {
            stepButtonRefs.current[step.id] = element;
          }}
          title={timings ? stepTimingTooltip(step) : step.title}
          onClick={(event) => {
            event.stopPropagation();
            if (!stepIsReachable(step)) {
              return;
            }

            if (shouldOpenLegMenuOnClick(step) && stepIsInteractive(step)) {
              openStepMenuFromButton(step, step.id, event);
              setDetailStepId(null);
              return;
            }

            if (
              step.kind === "full_box" &&
              row &&
              canRevertFullBoxOfficeReception(row) &&
              onRevertFullBoxOfficeReception &&
              stepIsInteractive(step)
            ) {
              openStepMenuFromButton(step, step.id, event);
              setDetailStepId(null);
              return;
            }

            const nextStepId = detailStepId === step.id ? null : step.id;
            setDetailStepId(nextStepId);
            if (nextStepId) {
              queueMicrotask(() => syncDetailAnchors(nextStepId));
            } else {
              setDetailStepAnchor(null);
            }
          }}
          onContextMenu={(event) => openContextMenu(event, step)}
          className={`${stepButtonClass} ${stepIsInteractive(step) ? "cursor-pointer" : ""}`}
          aria-label={step.title}
          aria-expanded={isDetailOpen}
          aria-current={step.state === "active" ? "step" : undefined}
        >
          {index > 0 ? (
            <span
              className={`pointer-events-none absolute left-0 right-1/2 h-px ${connectorTopClass} ${compactConnectorClass(steps[index - 1]?.state === "done")}`}
              aria-hidden
            />
          ) : null}
          {index < steps.length - 1 ? (
            <span
              className={`pointer-events-none absolute left-1/2 right-0 h-px ${connectorTopClass} ${compactConnectorClass(step.state === "done")}`}
              aria-hidden
            />
          ) : null}
          <span
            className={`relative z-10 flex shrink-0 items-center justify-center rounded-full border transition-transform ${stepIconWrapClass} ${compactStepNodeClass(step, isDetailOpen)} ${stepIsInteractive(step) ? "group-hover:scale-105" : ""}`}
          >
            {step.state === "done" ? (
              <Check className={stepIconClass} strokeWidth={3} aria-hidden />
            ) : (
              <Icon className={stepIconClass} strokeWidth={2.25} aria-hidden />
            )}
          </span>
          <span className={`${stepLabelClass} ${compactStepLabelClass(step)}`}>
            {compactStepName(step, row, routeByTaskId, requestedRouteTaskIds)}
          </span>
          {isDetailOpen ? (
            <span
              className="pointer-events-none absolute -bottom-1.5 left-1/2 h-0 w-0 -translate-x-1/2 border-x-[5px] border-t-[6px] border-x-transparent border-t-emerald-400"
              aria-hidden
            />
          ) : null}
        </button>
      );
    });

    if (singleLine) {
      return (
        <>
          <div
            ref={progressCardRef}
            onContextMenu={(event) => {
              if (focusStep) {
                openContextMenu(event, focusStep);
              }
            }}
            title={
              focusStep && stepIsInteractive(focusStep)
                ? isLogisticsLegKind(focusStep.kind)
                  ? focusStep.kind === "full_box"
                    ? `Oficina o programar ${FULL_BOX_LEG_LABELS.short.toLowerCase()}`
                    : `Oficina o programar ${EMPTY_BOX_LEG_LABELS.short.toLowerCase()}`
                  : "Clic derecho: más opciones"
                : undefined
            }
            className="relative w-full max-w-full min-w-0 px-1 py-0.5"
          >
            <div
              className="grid w-full max-w-full gap-1"
              style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}
            >
              {stepButtons}
            </div>
          </div>

          {detailPanel}

          {contextMenuPanel}
        </>
      );
    }

    const focusIndex = focusStep ? steps.findIndex((step) => step.id === focusStep.id) + 1 : 0;

    return (
      <>
        <div className="min-w-0">
          <div
            ref={progressCardRef}
            onContextMenu={(event) => {
              if (focusStep) {
                openContextMenu(event, focusStep);
              }
            }}
            title={
              focusStep && stepIsInteractive(focusStep)
                ? isLogisticsLegKind(focusStep.kind)
                  ? focusStep.kind === "full_box"
                    ? `Oficina o programar ${FULL_BOX_LEG_LABELS.short.toLowerCase()}`
                    : `Oficina o programar ${EMPTY_BOX_LEG_LABELS.short.toLowerCase()}`
                  : "Clic derecho: más opciones"
                : undefined
            }
            className="relative rounded-lg border border-black/60 bg-black/10 p-2.5"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="inline-flex max-w-full items-center rounded border border-black bg-surface-card-header px-2 py-1 text-[10px] font-black uppercase leading-none text-slate-400">
                  Paso {focusIndex || steps.length} de {steps.length}
                </p>
              </div>
              {timings?.saleAgeLabel ? (
                <p
                  className={`truncate text-[10px] font-black ${saleAgeTextClass(timings.saleAgeMs)}`}
                >
                  {timings.saleAgeLabel}
                </p>
              ) : null}
            </div>

            <div
              className="mt-2 grid gap-1"
              style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}
            >
              {stepButtons}
            </div>
          </div>
        </div>

        {detailPanel}

        {contextMenuPanel}
      </>
    );
  }

  return (
    <>
      <ol className="relative m-0 list-none p-0">
        {steps.map((step, index) => {
          const Icon = stepIcon(step.kind, step.channel);
          const interactive = stepIsInteractive(step);
          const DotTag = interactive ? "button" : "span";

          return (
            <li key={step.id} className="relative flex gap-3">
              <div className="flex w-8 shrink-0 flex-col items-center">
                <DotTag
                  type={interactive ? "button" : undefined}
                  onClick={
                    interactive
                      ? (event) => handleLeftClick(step, event)
                      : undefined
                  }
                  onContextMenu={(event) => openContextMenu(event, step)}
                  title={
                    interactive
                      ? isLogisticsLegKind(step.kind)
                        ? step.state === "active"
                          ? step.kind === "full_box"
                            ? `Oficina o programar ${FULL_BOX_LEG_LABELS.short.toLowerCase()}`
                            : `Oficina o programar ${EMPTY_BOX_LEG_LABELS.short.toLowerCase()}`
                          : "Clic: alternar oficina / domicilio"
                        : "Clic: marcar estado · Clic derecho: elegir otro"
                      : undefined
                  }
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${stepDotClass(step.state)} ${interactive ? "cursor-pointer hover:brightness-110" : ""}`}
                >
                  <Icon className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
                </DotTag>
                {index < steps.length - 1 ? (
                  <div
                    className={`my-1 w-0.5 flex-1 min-h-[1.25rem] rounded-full ${timelineLineClass(step.state)}`}
                    aria-hidden
                  />
                ) : null}
              </div>

              <div
                className={`mb-3 min-w-0 flex-1 ${timelineRowClass(step.state, interactive, false)}`}
                onClick={interactive ? (event) => handleLeftClick(step, event) : undefined}
                onContextMenu={interactive ? (event) => openContextMenu(event, step) : undefined}
              >
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <p
                    className={`text-sm font-black ${step.state === "active" ? "text-amber-100" : step.state === "done" ? "text-emerald-200" : "text-slate-400"}`}
                  >
                    {step.title}
                  </p>
                  {step.channelLabel ? (
                    <span className="text-[10px] font-black uppercase tracking-wide text-slate-500">
                      {step.channelLabel}
                    </span>
                  ) : null}
                </div>
                <p className="mt-0.5 text-xs font-bold leading-snug text-slate-300">{step.detail}</p>
                {step.scheduleChanged ? (
                  <span className="mt-1 inline-flex rounded border border-amber-700/50 bg-amber-950/30 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-amber-200">
                    Fecha modificada
                  </span>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>

      {contextMenuPanel}
    </>
  );
}
