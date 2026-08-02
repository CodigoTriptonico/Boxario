"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ListTodo } from "lucide-react";
import { reactivateConductorTaskAction } from "@/app/actions/conductor-tasks";
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
import { useConductorOfflineSync } from "@/components/conductor/use-conductor-offline-sync";
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
import {
  CONDUCTOR_TASK_FAILURE_REASONS,
  type ConductorTruckInventorySummary,
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
  initialTruckSummary?: ConductorTruckInventorySummary | null;
  initialRouteArrival?: ConductorRouteArrivalWorkspace;
  agencyModuleEnabled?: boolean;
};

type TaskListMode = "pending" | "completed";

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
  initialTruckSummary = null,
  initialRouteArrival = { routes: [], warehouses: [] },
  agencyModuleEnabled = false,
}: ConductorTareasClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const notify = useNotify();
  const { layout: viewLayout } = usePageViewLayout("conductor.tasks");
  const previewOptions = buildConductorPreviewPickerOptions(drivers);
  const [listMode, setListMode] = useState<TaskListMode>("pending");
  const [operationScope, setOperationScope] = useState<"domicilios" | "agencias">("domicilios");
  const [doneTaskIds, setDoneTaskIds] = useState<string[]>([]);
  const [completedTasks, setCompletedTasks] = useState<ConductorDriverTask[]>(initialCompletedTasks);
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

  const pendingTasks = useMemo(
    () => initialTasks.filter((task) => !doneTaskIds.includes(task.id) && !offlineOperationByTaskId.has(task.id)),
    [doneTaskIds, initialTasks, offlineOperationByTaskId],
  );
  const activeTasks = listMode === "pending" ? pendingTasks : completedTasks;
  const pendingSummary = useMemo(() => summarizeConductorTasks(pendingTasks), [pendingTasks]);
  const completedSummary = useMemo(() => summarizeConductorTasks(completedTasks), [completedTasks]);
  const [taskFilter, setTaskFilter] = useState<LogisticsTaskType>(() =>
    pendingSummary.deliverCount > 0 ? "deliver_empty_box" : "pickup_full_box",
  );
  const filteredTasks = useMemo(
    () => activeTasks.filter((task) => task.taskType === taskFilter),
    [activeTasks, taskFilter],
  );

  function handleListModeChange(next: TaskListMode) {
    if (next === listMode) {
      return;
    }

    setListMode(next);
  }

  function handleTaskFilterChange(nextFilter: LogisticsTaskType) {
    setTaskFilter(nextFilter);
  }
  const completedCount = completedSummary.deliverCount + completedSummary.pickupCount;
  const pendingCount = pendingSummary.deliverCount + pendingSummary.pickupCount;
  const selectedPendingTasks = useMemo(
    () => pendingTasks.filter((task) => task.taskType === taskFilter),
    [pendingTasks, taskFilter],
  );
  const selectedCompletedTasks = useMemo(
    () => completedTasks.filter((task) => task.taskType === taskFilter),
    [completedTasks, taskFilter],
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
  }, [initialCompletedTasks, offlineSnapshot.operations]);

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

      const query = params.toString();
      router.replace(query ? `/conductor/tareas?${query}` : "/conductor/tareas", {
        scroll: false,
      });
    },
    [router, searchParams],
  );

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

  const shortageTotal = initialTruckSummary?.shortageTotal ?? 0;
  const routeBlocked = !canPreview && listMode === "pending" && shortageTotal > 0;

  return (
    <>
    <Panel
      title={canPreview ? "Tareas conductor" : "Mis tareas"}
      hideHeader
      className="lg:flex lg:min-h-0 lg:flex-1 lg:flex-col lg:overflow-hidden"
      contentClassName="flex flex-col p-4 sm:p-5 lg:min-h-0 lg:flex-1"
    >
        <ConductorTareasToolbar
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
          onTaskFilterChange={handleTaskFilterChange}
          pendingSummary={pendingSummary}
          listMode={listMode}
          onListModeChange={handleListModeChange}
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
            <Link
              href="/conductor/inventario-camion"
              className={`${secondaryButtonClass} h-9 border-rose-800/70 px-3 text-xs text-rose-100 hover:bg-rose-900/40`}
            >
              Cargar cajas
            </Link>
          </div>
        ) : null}

        {operationScope === "domicilios" && effectiveDriverId ? (
          <ConductorRouteArrivalPanel
            initialWorkspace={initialRouteArrival}
            driverId={effectiveDriverId}
          />
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
