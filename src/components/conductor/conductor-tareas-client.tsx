"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Boxes, ChevronDown, ListTodo, Loader2, RefreshCw, Route, Truck } from "lucide-react";
import {
  getConductorTruckInventoryAction,
  reactivateConductorTaskAction,
  type ConductorTruckInventoryView,
} from "@/app/actions/conductor-tasks";
import { ActionConfirmDialog } from "@/components/action-confirm-dialog";
import { AgencyVisitsPanel } from "@/components/conductor/agency-visits-panel";
import { ConductorRouteArrivalPanel } from "@/components/conductor/conductor-route-arrival-panel";
import {
  CompactInfoDisclosure,
  ConductorTaskCard,
  ConductorTaskRow,
} from "@/components/conductor/conductor-task-items";
import { ConductorTaskResultDialog } from "@/components/conductor/conductor-task-result-dialog";
import { ConductorTareasToolbar } from "@/components/conductor/conductor-tareas-toolbar";
import { ConductorTruckInventoryClient } from "@/components/conductor/conductor-truck-inventory-client";
import { useConductorOfflineSync } from "@/components/conductor/use-conductor-offline-sync";
import { ConductorTaskPageControl, useConductorTaskPages } from "@/components/conductor/use-conductor-task-pages";
import { InlineSearchPicker } from "@/components/inline-search-picker";
import {
  cardClass,
  Panel,
  secondaryButtonClass,
} from "@/components/ui-blocks";
import { usePageViewLayout } from "@/components/ui/ui-surface-preferences-provider";
import { useNotify } from "@/hooks/use-notify";
import type { PaymentMethod } from "@/lib/payment-methods";
import {
  conductorExpectedDepositCollection,
  type ConductorPaymentChoice,
} from "@/lib/conductor-driver-payment";
import {
  buildConductorPreviewPickerOptions,
  type ConductorDriverOption,
} from "@/lib/conductor-tareas-view";
import {
  conductorTaskOutcomeLabel,
  type ConductorDriverTask,
} from "@/lib/conductor-tasks";
import { summarizeConductorTasks, summarizeConductorCompletedOutcomes } from "@/lib/conductor-dashboard";
import type { LogisticsTaskType } from "@/lib/logistics-routing";
import { formatScheduleDateLabel } from "@/lib/sale/schedule-time";
import {
  CONDUCTOR_TASK_FAILURE_REASONS,
} from "@/lib/conductor-truck-inventory";
import type { ConductorRouteArrivalWorkspace } from "@/lib/conductor-route-arrival";
import {
  enqueueConductorTaskResult,
  requestConductorBackgroundSync,
} from "@/lib/conductor-offline/queue";

type ConductorTareasClientProps = {
  canPreview?: boolean;
  drivers?: ConductorDriverOption[];
  previewDriverId?: string | null;
  effectiveDriverId?: string | null;
  effectiveDriverLabel: string;
  organizationId: string;
  userId: string;
  initialTasks?: ConductorDriverTask[];
  initialCompletedTasks?: ConductorDriverTask[];
  initialTasksCursor?: { sortAt: string; id: string } | null; initialCompletedTasksCursor?: { sortAt: string; id: string } | null; scopeDate: string;
  initialTruckView?: ConductorTruckInventoryView | null;
  initialTruckError?: string;
  initialReadError?: string;
  initialWorkspaceView?: string;
  initialRouteArrival?: ConductorRouteArrivalWorkspace;
  agencyModuleEnabled?: boolean;
};

type TaskListMode = "pending" | "completed";
type ConductorWorkspaceView = "carga" | "paradas" | "camion";

type TaskDialogState = {
  task: ConductorDriverTask;
  result: "completed" | "failed";
};

export function ConductorTareasClient({
  canPreview = false,
  drivers = [],
  previewDriverId = null,
  effectiveDriverId = null,
  effectiveDriverLabel,
  organizationId,
  userId,
  initialTasks = [],
  initialCompletedTasks = [],
  initialTasksCursor = null, initialCompletedTasksCursor = null, scopeDate,
  initialTruckView = null,
  initialTruckError = "",
  initialReadError = "",
  initialWorkspaceView = "",
  initialRouteArrival = { routes: [], warehouses: [] },
  agencyModuleEnabled = false,
}: ConductorTareasClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const notify = useNotify();
  const { layout: viewLayout } = usePageViewLayout("conductor.tasks");
  const previewOptions = buildConductorPreviewPickerOptions(drivers);
  const initialRoute = initialTruckView?.routes.find((route) => route.id === initialTruckView.selectedRouteId) || null;
  const defaultWorkspaceView: ConductorWorkspaceView =
    initialWorkspaceView === "carga" || initialWorkspaceView === "camion" || initialWorkspaceView === "paradas"
      ? initialWorkspaceView
      : initialRoute?.status === "planned"
        ? "carga"
        : "paradas";
  const [workspaceView, setWorkspaceView] = useState<ConductorWorkspaceView>(defaultWorkspaceView);
  const [truckView, setTruckView] = useState<ConductorTruckInventoryView | null>(initialTruckView);
  const [truckError, setTruckError] = useState(initialTruckError);
  const [routeLoading, setRouteLoading] = useState(false);
  const [listMode, setListMode] = useState<TaskListMode>("pending");
  const [operationScope, setOperationScope] = useState<"domicilios" | "agencias">("domicilios");
  const [doneTaskIds, setDoneTaskIds] = useState<string[]>([]);
  const { tasks, completedTasks, setCompletedTasks, cursor: taskCursor, pageLoading, pageError, loadNext } = useConductorTaskPages({
    driverId: effectiveDriverId, scopeDate, initialTasks, initialCompletedTasks,
    initialTasksCursor, initialCompletedCursor: initialCompletedTasksCursor,
  });
  const [dialog, setDialog] = useState<TaskDialogState | null>(null);
  const [saving, setSaving] = useState(false);
  const [failureReason, setFailureReason] = useState<string>(CONDUCTOR_TASK_FAILURE_REASONS[0]);
  const [note, setNote] = useState("");
  const [evidence, setEvidence] = useState<File | null>(null);
  const [invoiceVisible, setInvoiceVisible] = useState(false);
  const [paymentChoice, setPaymentChoice] = useState<ConductorPaymentChoice | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [reactivateTask, setReactivateTask] = useState<ConductorDriverTask | null>(null);
  const [reactivating, setReactivating] = useState(false);
  const boxInvoicesLabel = dialog?.task.boxInvoiceCodes.join(", ") || dialog?.task.shipmentCode || "";
  const submittingRef = useRef(false);

  const {
    online,
    offlineSnapshot,
    offlineScope,
    offlineOperationByTaskId,
    offlineGlobalLabel,
    hasSyncActivity,
    reloadOfflineSnapshot,
    syncOfflineResults,
    handleRetrySync,
    handleRetryAllSync,
    removeOperationsForTask,
  } = useConductorOfflineSync({
    organizationId,
    userId,
    effectiveDriverId,
    initialCompletedTasks,
  });

  const selectedRouteId = truckView?.selectedRouteId ?? null;
  const selectedRoute = truckView?.routes.find((route) => route.id === selectedRouteId) || null;
  const routeOpenTasks = useMemo(
    () => tasks.filter((task) => !selectedRouteId || task.routeId === selectedRouteId),
    [tasks, selectedRouteId],
  );
  const routeCompletedTasks = useMemo(
    () => completedTasks.filter((task) => !selectedRouteId || task.routeId === selectedRouteId),
    [completedTasks, selectedRouteId],
  );

  const pendingTasks = useMemo(
    () => routeOpenTasks.filter((task) => !doneTaskIds.includes(task.id) && !offlineOperationByTaskId.has(task.id)),
    [doneTaskIds, offlineOperationByTaskId, routeOpenTasks],
  );
  const activeTasks = listMode === "pending" ? pendingTasks : routeCompletedTasks;
  const pendingSummary = useMemo(() => summarizeConductorTasks(pendingTasks), [pendingTasks]);
  const completedSummary = useMemo(
    () => summarizeConductorTasks(routeCompletedTasks),
    [routeCompletedTasks],
  );
  const [taskFilter, setTaskFilter] = useState<LogisticsTaskType>(() =>
    pendingSummary.deliverCount > 0 ? "deliver_empty_box" : "pickup_full_box",
  );
  const filteredTasks = useMemo(
    () => activeTasks.filter((task) => task.taskType === taskFilter),
    [activeTasks, taskFilter],
  );


  const completedCount = completedSummary.deliverCount + completedSummary.pickupCount;
  const pendingCount = pendingSummary.deliverCount + pendingSummary.pickupCount;
  const selectedPendingTasks = useMemo(
    () => pendingTasks.filter((task) => task.taskType === taskFilter),
    [pendingTasks, taskFilter],
  );
  const selectedCompletedTasks = useMemo(
    () => routeCompletedTasks.filter((task) => task.taskType === taskFilter),
    [routeCompletedTasks, taskFilter],
  );
  const selectedPendingSummary = useMemo(
    () => summarizeConductorTasks(selectedPendingTasks),
    [selectedPendingTasks],
  );
  const completedOutcomeSummary = useMemo(
    () => summarizeConductorCompletedOutcomes(selectedCompletedTasks),
    [selectedCompletedTasks],
  );
  const selectedPendingBoxes =
    taskFilter === "deliver_empty_box"
      ? selectedPendingSummary.deliverCount
      : selectedPendingSummary.pickupCount;

  useEffect(() => {
    queueMicrotask(() => {
      const localTasks = offlineSnapshot.operations.map((operation) => ({
        ...operation.task,
        status: operation.result === "completed" ? "completed" as const : "cancelled" as const,
      }));
      const merged = [...localTasks, ...initialCompletedTasks];
      setCompletedTasks(merged.filter((task, index) => merged.findIndex((entry) => entry.id === task.id) === index));
    });
  }, [initialCompletedTasks, offlineSnapshot.operations, setCompletedTasks]);

  const paymentExpectedAmount = dialog
    ? conductorExpectedDepositCollection({
        result: dialog.result,
        taskType: dialog.task.taskType,
        depositDue: dialog.task.depositDue,
        balanceDue: dialog.task.balanceDue,
      })
    : 0;
  const needsPaymentChoice = paymentExpectedAmount > 0;
  const dialogNeedsPhoto = Boolean(
    dialog && (dialog.result === "completed" || failureReason === "Invoice no visible"),
  );

  const handlePreviewDriverChange = useCallback(
    (nextDriverId: string) => {
      const params = new URLSearchParams(searchParams.toString());

      if (nextDriverId) {
        params.set("conductor", nextDriverId);
      } else {
        params.delete("conductor");
      }
      params.delete("route");

      const query = params.toString();
      router.replace(query ? `/conductor/tareas?${query}` : "/conductor/tareas", {
        scroll: false,
      });
    },
    [router, searchParams],
  );

  function updateWorkspaceView(nextView: ConductorWorkspaceView) {
    setWorkspaceView(nextView);
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", nextView);
    globalThis.history?.replaceState(null, "", `/conductor/tareas?${params.toString()}`);

    if (nextView !== "paradas" && effectiveDriverId) {
      void getConductorTruckInventoryAction(effectiveDriverId, selectedRouteId).then((result) => {
        if (result.ok) {
          setTruckView(result.data);
          setTruckError("");
        }
      });
    }
  }

  async function handleRouteChange(routeId: string) {
    if (!effectiveDriverId || routeId === selectedRouteId || routeLoading) {
      return;
    }

    setRouteLoading(true);
    setTruckError("");
    try {
      const nextRouteDate = truckView?.routes.find((route) => route.id === routeId)?.routeDate;
      const result = await getConductorTruckInventoryAction(effectiveDriverId, routeId, nextRouteDate);
      if (!result.ok) {
        setTruckError(result.error);
        notify.error(result.error);
        return;
      }

      setTruckView(result.data);
      const nextRoute = result.data.routes.find((route) => route.id === result.data.selectedRouteId);
      const nextView = nextRoute?.status === "planned" ? "carga" : "paradas";
      setWorkspaceView(nextView);
      const params = new URLSearchParams(searchParams.toString());
      params.set("route", routeId);
      if (nextRouteDate) params.set("date", nextRouteDate);
      params.set("view", nextView);
      router.push(`/conductor/tareas?${params.toString()}`);
    } finally {
      setRouteLoading(false);
    }
  }

  function openDialog(task: ConductorDriverTask, result: "completed" | "failed") {
    setDialog({ task, result });
    setFailureReason(CONDUCTOR_TASK_FAILURE_REASONS[0]);
    setNote("");
    setEvidence(null);
    setInvoiceVisible(false);
    setPaymentMethod("cash");
    setPaymentChoice(null);
    setPaymentAmount("");
  }

  function closeDialog() {
    if (saving) {
      return;
    }

    setDialog(null);
  }

  async function submitDialog() {
    if (!dialog || submittingRef.current) {
      return;
    }

    const needsPhoto = dialog.result === "completed" || failureReason === "Invoice no visible";

    if (needsPhoto && !evidence) {
      notify.error("Foto requerida");
      return;
    }

    if (dialog.result === "completed" && !invoiceVisible) {
      notify.error("Confirma que el invoice se ve escrito en la caja");
      return;
    }

    if (needsPaymentChoice && !paymentChoice) {
      notify.error("Indica si recibiste el depósito");
      return;
    }

    if (paymentChoice === "custom" && !paymentAmount.trim()) {
      notify.error("Indica el monto recibido");
      return;
    }

    if (paymentChoice === "none" && note.trim().length < 3) {
      notify.error("Indica por que no recibiste dinero");
      return;
    }

    if (!offlineScope) {
      notify.error("No se pudo preparar el almacenamiento local");
      return;
    }

    submittingRef.current = true;
    setSaving(true);

    try {
      await enqueueConductorTaskResult({
        scope: offlineScope,
        task: dialog.task,
        result: dialog.result,
        invoiceVisible,
        failureReason,
        note,
        paymentChoice,
        paymentAmount,
        paymentMethod,
        evidence,
      });

      setDoneTaskIds((current) =>
        current.includes(dialog.task.id) ? current : [...current, dialog.task.id],
      );
      setCompletedTasks((current) => {
        const nextTask: ConductorDriverTask = {
          ...dialog.task,
          status: dialog.result === "completed" ? "completed" : "cancelled",
        };

        return [nextTask, ...current.filter((task) => task.id !== nextTask.id)];
      });
      setDialog(null);
      notify.success("Guardada en este teléfono");
      await reloadOfflineSnapshot();
      void requestConductorBackgroundSync();
      void syncOfflineResults();
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "No se pudo guardar en este teléfono");
    } finally {
      submittingRef.current = false;
      setSaving(false);
    }
  }

  async function confirmReactivateTask() {
    if (!reactivateTask) {
      return;
    }

    setReactivating(true);

    try {
      const result = await reactivateConductorTaskAction({
        taskId: reactivateTask.id,
        driverId: effectiveDriverId,
      });

      if (!result.ok) {
        notify.error(result.error);
        return;
      }

      setCompletedTasks((current) => current.filter((task) => task.id !== reactivateTask.id));
      setDoneTaskIds((current) => current.filter((taskId) => taskId !== reactivateTask.id));
      await removeOperationsForTask(reactivateTask.id);
      setReactivateTask(null);
      setTaskFilter(reactivateTask.taskType);
      setListMode("pending");
      notify.success("Tarea devuelta al listado");
      router.refresh();
    } finally {
      setReactivating(false);
    }
  }

  const emptyMessage =
    listMode === "completed"
      ? taskFilter === "deliver_empty_box"
        ? "Sin entregas completadas"
        : "Sin recogidas completadas"
      : canPreview
        ? effectiveDriverId
          ? taskFilter === "deliver_empty_box"
            ? "Sin cajas por dejar"
            : "Sin cajas por recoger"
          : "No hay conductores activos"
        : taskFilter === "deliver_empty_box"
          ? "Sin cajas por dejar"
          : "Sin cajas por recoger";

  const emptyDetail =
    listMode === "completed"
      ? "Aquí verás las cajas que marcaste como listas o que no se pudieron entregar."
      : canPreview
        ? effectiveDriverId
          ? `Vista de ${effectiveDriverLabel}. Puedes completar tareas en su nombre; queda registrado como admin.`
          : "Crea o activa conductores en Logística para previsualizar su vista."
        : taskFilter === "deliver_empty_box"
          ? "Aquí verás entregas de cajas vacías y paradas de tu ruta del día."
          : "Aquí verás recogidas de cajas llenas y paradas de tu ruta del día.";

  const shortageTotal = truckView?.summary.shortageTotal ?? 0;
  const routeBlocked = !canPreview && listMode === "pending" && shortageTotal > 0;
  const routeTaskTotal = pendingTasks.length + routeCompletedTasks.length;
  const routeDeliveries = [...pendingTasks, ...routeCompletedTasks].filter(
    (task) => task.taskType === "deliver_empty_box",
  ).length;
  const routePickups = Math.max(routeTaskTotal - routeDeliveries, 0);
  const vehicleLabel =
    [...pendingTasks, ...routeCompletedTasks].find((task) => task.vehicleLabel)?.vehicleLabel ||
    (selectedRoute?.vehicleId ? "Vehiculo asignado" : "Sin vehiculo");

  return (
    <>
    <Panel
      title={canPreview ? "Ruta del conductor" : "Mi ruta"}
      hideHeader
      className="lg:flex lg:min-h-0 lg:flex-1 lg:flex-col lg:overflow-hidden"
      contentClassName="flex flex-col p-0 lg:min-h-0 lg:flex-1"
    >
      {initialReadError ? (
        <div role="alert" className="mx-3 mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-rose-800/70 bg-rose-950/35 px-3 py-2 text-sm font-bold text-rose-100 sm:mx-4">
          <span>No se pudo cargar la jornada: {initialReadError}</span>
          <button type="button" className={`${secondaryButtonClass} h-8 border-rose-700/70 px-2.5 text-xs text-rose-100`} onClick={() => router.refresh()}>
            Reintentar
          </button>
        </div>
      ) : null}
        <section className="border-b border-app-border-divider p-4 sm:p-5">
          <div className="grid gap-3 xl:grid-cols-[minmax(28rem,1fr)_auto] xl:items-stretch">
            <div className="grid min-w-0 gap-2 sm:grid-cols-2">
            {canPreview ? (
              <div className="flex min-h-12 min-w-0 items-center gap-2 rounded-lg border border-sky-800/70 bg-sky-950/25 pl-3">
                <span className="text-[11px] font-black uppercase tracking-[0.12em] text-sky-300">Conductor</span>
                <InlineSearchPicker
                  value={previewDriverId || ""}
                  onChange={handlePreviewDriverChange}
                  options={previewOptions}
                  placeholder="Elegir conductor"
                  searchPlaceholder="Buscar conductor"
                  emptyLabel="Sin conductores"
                  ariaLabel="Conductor a previsualizar"
                  minWidthClass="min-w-[11rem] sm:min-w-[15rem]"
                  disabled={!previewOptions.length}
                />
              </div>
            ) : (
              <div className="flex min-h-12 min-w-0 items-center gap-2 rounded-lg border border-app-border-control bg-surface-inset px-3">
                <Route className="h-5 w-5 shrink-0 text-emerald-300" />
                <span className="break-words text-sm font-black text-app-text-primary sm:truncate">{effectiveDriverLabel}</span>
              </div>
            )}

            <div className="relative flex min-h-12 min-w-0 items-center gap-2 rounded-lg border border-app-border-control bg-surface-inset px-3">
              <Route className="h-5 w-5 shrink-0 text-emerald-300" aria-hidden />
              {truckView?.routes.length ? (
                <select
                  className="!bg-surface-inset h-full min-w-0 flex-1 appearance-none border-0 p-0 pr-6 text-sm font-black text-app-text-primary outline-none"
                  value={selectedRouteId || ""}
                  disabled={routeLoading}
                  aria-label="Ruta asignada"
                  onChange={(event) => void handleRouteChange(event.target.value)}
                >
                  {truckView.routes.map((route) => (
                    <option key={route.id} value={route.id}>
                      {route.name} · {formatScheduleDateLabel(route.routeDate)} · {route.stopCount} {route.stopCount === 1 ? "parada" : "paradas"}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="min-w-0 flex-1 text-sm font-black text-app-text-primary">
                  Sin ruta asignada
                </span>
              )}
              {routeLoading ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-emerald-300" aria-hidden />
              ) : truckView?.routes.length ? (
                <ChevronDown className="pointer-events-none h-4 w-4 shrink-0 text-app-text-secondary" aria-hidden />
              ) : null}
            </div>
            </div>

            <div className="grid min-h-12 grid-cols-1 overflow-hidden rounded-lg border border-app-border-control bg-surface-card sm:grid-cols-3">
              <span className="flex min-w-0 flex-col justify-center px-3 py-2 text-[10px] font-black uppercase tracking-wide text-app-text-secondary">
                <strong className="text-xl leading-none tabular-nums text-app-text-primary">{selectedRoute?.stopCount ?? routeTaskTotal}</strong>
                paradas
              </span>
              <span className="flex min-w-0 flex-col justify-center border-t border-app-border-divider bg-emerald-950/25 px-3 py-2 text-[10px] font-black uppercase tracking-wide text-emerald-200 sm:border-l sm:border-t-0">
                <strong className="text-xl leading-none tabular-nums">{routeDeliveries}</strong>
                entregas
              </span>
              <span className="flex min-w-0 flex-col justify-center border-t border-app-border-divider bg-amber-950/25 px-3 py-2 text-[10px] font-black uppercase tracking-wide text-amber-200 sm:border-l sm:border-t-0">
                <strong className="text-xl leading-none tabular-nums">{routePickups}</strong>
                recogidas
              </span>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-app-border-divider pt-3">
            <Route className="h-4 w-4 shrink-0 text-app-text-muted" />
            <p className="min-w-0 break-words text-sm font-bold text-app-text-secondary sm:truncate">
              {selectedRoute ? `${vehicleLabel} - ${formatScheduleDateLabel(selectedRoute.routeDate)}` : "Logística debe asignarte una ruta operativa."}
            </p>
          </div>
          {truckError ? <p role="alert" className="mt-2 text-sm font-black text-rose-200">{truckError}</p> : null}
        </section>

        {!selectedRoute ? (
          <div className="flex min-h-[24rem] flex-1 items-center justify-center px-5 py-10 text-center">
            <div className="max-w-md">
              <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-sky-800/70 bg-sky-950/30 text-sky-200">
                <Route className="h-8 w-8" />
              </span>
              <p className="mt-5 text-xl font-black text-app-text-primary">
                {!effectiveDriverId
                  ? "No hay conductores activos"
                  : truckView?.routes.length
                    ? "Selecciona una ruta para prepararte"
                  : canPreview
                    ? `${effectiveDriverLabel} no tiene ruta asignada`
                    : "Aún no tienes una ruta asignada"}
              </p>
              <p className="mt-2 text-sm font-bold leading-6 text-app-text-secondary">
                {!effectiveDriverId
                  ? "Activa un conductor en Logística para previsualizar su jornada."
                  : truckView?.routes.length
                    ? "Puedes revisar la carga y las paradas de hoy o de una próxima fecha."
                  : canPreview
                    ? "Cuando Logística publique su recorrido, aquí aparecerán la carga, las paradas y el regreso."
                    : "Cuando Logística publique tu recorrido, aquí verás qué cargar y cuál es tu primera parada."}
              </p>
              <button
                type="button"
                className={`${secondaryButtonClass} mx-auto mt-5 h-11 px-4`}
                onClick={() => router.refresh()}
              >
                <RefreshCw className="h-4 w-4" />
                Actualizar
              </button>
            </div>
          </div>
        ) : (
        <div className="lg:grid lg:min-h-0 lg:flex-1 lg:grid-cols-[15rem_minmax(0,1fr)]">
          <nav
            className="grid grid-cols-3 gap-2 border-b border-app-border-divider p-3 lg:grid-cols-1 lg:content-start lg:border-b-0 lg:border-r lg:p-4"
            role="tablist"
            aria-label="Etapa de mi ruta"
          >
              {([
                ["carga", "Carga", "Preparar carga", "Subir cajas vacías", Boxes],
                ["paradas", "Paradas", "Paradas", "Entregar y recoger", ListTodo],
                ["camion", "Camión", "Camión / regreso", "Revisar y cerrar", Truck],
              ] as const).map(([value, shortLabel, label, description, Icon], index) => (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={Boolean(effectiveDriverId && workspaceView === value)}
                  disabled={!effectiveDriverId}
                  className={`flex min-h-14 min-w-0 items-center gap-1.5 rounded-lg border px-1.5 text-left transition-colors lg:min-h-[4.5rem] lg:gap-2 lg:px-3 ${
                    effectiveDriverId && workspaceView === value
                      ? "border-emerald-700/80 bg-emerald-950/45 text-emerald-100"
                      : "border-app-border-control bg-surface-card text-app-text-secondary hover:bg-surface-inset disabled:cursor-not-allowed disabled:opacity-55"
                  }`}
                  onClick={() => updateWorkspaceView(value)}
                >
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md border text-xs font-black lg:h-8 lg:w-8 ${
                    effectiveDriverId && workspaceView === value
                      ? "border-emerald-700 bg-emerald-900/60 text-emerald-100"
                      : "border-app-border-divider bg-surface-inset text-app-text-muted"
                  }`}>
                    <Icon className="h-4 w-4 lg:hidden" />
                    <span className="hidden lg:inline">{index + 1}</span>
                  </span>
                  <span className="min-w-0">
                    <span className="block break-words text-xs font-black sm:hidden">{shortLabel}</span>
                    <span className="hidden truncate text-sm font-black sm:block">{label}</span>
                    <span className="mt-0.5 hidden truncate text-xs font-bold text-app-text-muted lg:block">{description}</span>
                  </span>
                </button>
              ))}
          </nav>

          <div className="flex min-w-0 flex-1 flex-col p-4 sm:p-5 lg:min-h-0 lg:overflow-hidden">
        {!effectiveDriverId ? (
          <div className="flex min-h-[18rem] flex-1 items-center justify-center text-center">
            <div className="max-w-lg">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl border border-sky-800/70 bg-sky-950/30 text-sky-200">
                <Route className="h-7 w-7" />
              </span>
              <p className="mt-4 text-xl font-black text-app-text-primary">No hay conductores activos</p>
              <p className="mt-2 text-sm font-bold leading-6 text-app-text-secondary">
                Activa un conductor en Logística. Aquí aparecerá su ruta completa, la carga que debe preparar y cada parada por resolver.
              </p>
            </div>
          </div>
        ) : <>

        {workspaceView !== "carga" && operationScope === "domicilios" && effectiveDriverId ? (
          <ConductorRouteArrivalPanel
            initialWorkspace={initialRouteArrival}
            driverId={effectiveDriverId}
          />
        ) : null}

        {workspaceView === "paradas" ? <>
        <ConductorTareasToolbar
          showDriverContext={false}
          canPreview={canPreview}
          effectiveDriverLabel={effectiveDriverLabel}
          previewDriverId={previewDriverId}
          previewOptions={previewOptions}
          onPreviewDriverChange={handlePreviewDriverChange}
          selectedPendingBoxes={selectedPendingBoxes}
          completedOutcomeSummary={completedOutcomeSummary}
          operationScope={operationScope}
          onOperationScopeChange={setOperationScope}
          agencyModuleEnabled={agencyModuleEnabled}
          taskFilter={taskFilter}
          onTaskFilterChange={setTaskFilter}
          pendingSummary={pendingSummary}
          listMode={listMode}
          onListModeChange={setListMode}
          pendingCount={pendingCount}
          completedCount={completedCount}
          offlineSnapshot={offlineSnapshot}
          online={online}
          hasSyncActivity={hasSyncActivity}
          offlineGlobalLabel={offlineGlobalLabel}
          onRetryAllSync={() => void handleRetryAllSync()}
        />

        {routeBlocked ? (
          <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-rose-800/70 bg-rose-950/35 px-3 py-2">
            <AlertTriangle className="h-5 w-5 shrink-0 text-rose-300" />
            <p className="min-w-0 flex-1 text-sm font-black text-rose-100">
              Faltan {shortageTotal} {shortageTotal === 1 ? "caja vacía" : "cajas vacías"} en el camión.
            </p>
            <button
              type="button"
              className={`${secondaryButtonClass} h-9 border-rose-800/70 px-3 text-xs text-rose-100 hover:bg-rose-900/40`}
              onClick={() => updateWorkspaceView("carga")}
            >
              Cargar cajas
            </button>
          </div>
        ) : null}

        {agencyModuleEnabled && operationScope === "agencias" && effectiveDriverId ? <AgencyVisitsPanel driverId={effectiveDriverId} /> : filteredTasks.length ? (
          <div className="pr-1 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
            {viewLayout === "rows" ? (
              <div className={`${cardClass} overflow-hidden p-2`}>
                <div className="flex flex-col gap-2">
                  {filteredTasks.map((task) => {
                    const isCompletedView = listMode === "completed";
                    const successDisabled =
                      !isCompletedView &&
                      task.taskType === "deliver_empty_box" &&
                      routeBlocked &&
                      task.status !== "loaded_to_truck";

                    return (
                      <ConductorTaskRow
                        key={task.id}
                        task={task}
                        isCompletedView={isCompletedView}
                        successDisabled={successDisabled}
                        outcomeLabel={conductorTaskOutcomeLabel(task.status)}
                        syncOperation={offlineOperationByTaskId.get(task.id)}
                        onOpenDialog={openDialog}
                        onReactivate={setReactivateTask}
                        onRetrySync={(operationId) => void handleRetrySync(operationId)}
                      />
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="grid items-start gap-2.5 lg:grid-cols-2 xl:grid-cols-3">
                {filteredTasks.map((task) => {
                  const isCompletedView = listMode === "completed";
                  const successDisabled =
                    !isCompletedView &&
                    task.taskType === "deliver_empty_box" &&
                    routeBlocked &&
                    task.status !== "loaded_to_truck";

                  return (
                    <ConductorTaskCard
                      key={task.id}
                      task={task}
                      isCompletedView={isCompletedView}
                      successDisabled={successDisabled}
                      outcomeLabel={conductorTaskOutcomeLabel(task.status)}
                      syncOperation={offlineOperationByTaskId.get(task.id)}
                      onOpenDialog={openDialog}
                      onReactivate={setReactivateTask}
                      onRetrySync={(operationId) => void handleRetrySync(operationId)}
                    />
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="flex min-h-[8rem] items-center justify-center rounded-lg border border-dashed border-black/70 bg-surface-card/40 px-4 py-6 text-center">
            <div className="flex flex-wrap items-center justify-center gap-2.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-black bg-surface-inset text-slate-300">
                <ListTodo className="h-5 w-5" />
              </span>
              <p className="text-lg font-black text-[#f8fafc]">{emptyMessage}</p>
              <CompactInfoDisclosure ariaLabel="Ver más información">
                {emptyDetail}
              </CompactInfoDisclosure>
            </div>
          </div>
        )}
        <ConductorTaskPageControl cursor={taskCursor(listMode === "completed" ? "closed" : "open")} loading={pageLoading} error={pageError} onLoad={() => void loadNext(listMode === "completed" ? "closed" : "open")} />
        </> : (
          <ConductorTruckInventoryClient
            canPreview={canPreview}
            drivers={drivers}
            previewDriverId={previewDriverId}
            effectiveDriverId={effectiveDriverId}
            effectiveDriverLabel={effectiveDriverLabel}
            initialView={truckView}
            initialError={truckError}
            embedded
            mode={workspaceView === "carga" ? "load" : "truck"}
            onViewChange={(nextView) => {
              setTruckView(nextView);
              setTruckError("");
            }}
            onRouteStarted={() => updateWorkspaceView("paradas")}
          />
        )}
        </>}
          </div>
        </div>
        )}
      </Panel>

      {dialog ? (
        <ConductorTaskResultDialog
          dialog={dialog}
          saving={saving}
          failureReason={failureReason}
          note={note}
          evidence={evidence}
          invoiceVisible={invoiceVisible}
          paymentChoice={paymentChoice}
          paymentAmount={paymentAmount}
          paymentMethod={paymentMethod}
          boxInvoicesLabel={boxInvoicesLabel}
          paymentExpectedAmount={paymentExpectedAmount}
          needsPaymentChoice={needsPaymentChoice}
          dialogNeedsPhoto={dialogNeedsPhoto}
          onClose={closeDialog}
          onFailureReasonChange={setFailureReason}
          onNoteChange={setNote}
          onEvidenceChange={setEvidence}
          onInvoiceVisibleChange={setInvoiceVisible}
          onPaymentChoiceChange={setPaymentChoice}
          onPaymentAmountChange={setPaymentAmount}
          onPaymentMethodChange={setPaymentMethod}
          onSubmit={() => void submitDialog()}
        />
      ) : null}

      <ActionConfirmDialog
        open={Boolean(reactivateTask)}
        title="Volver al listado"
        message={
          reactivateTask
            ? `¿Devolver ${reactivateTask.shipmentCode} al listado de pendientes? Podrás intentar la visita de nuevo.`
            : ""
        }
        confirmLabel="Volver al listado"
        tone="warning"
        confirming={reactivating}
        overlayClassName="z-[170]"
        onCancel={() => {
          if (!reactivating) {
            setReactivateTask(null);
          }
        }}
        onConfirm={() => void confirmReactivateTask()}
      />
    </>
  );
}
