"use client";

import type { Dispatch, ReactNode, SetStateAction } from "react";
import { CalendarCheck2, Check, ChevronLeft, Loader2, X } from "lucide-react";
import { primaryButtonClass, secondaryButtonClass } from "@/components/ui-blocks";
import {
  STEP_LABELS,
  type WizardStep,
} from "@/components/logistica/task-schedule/shared";

export type ScheduleConfirmViewModel = {
  canConfirm: boolean;
  canGoBack: boolean;
  confirmLabel: string;
  confirmSchedule: () => void | Promise<void>;
  goBack: () => void;
  goNextFrom: (step: WizardStep) => void;
  goToStep: (step: WizardStep) => void;
  onCancel: () => void;
  pendingDayRouteMode: boolean;
  saving: boolean;
  setPendingDayRouteMode: Dispatch<SetStateAction<boolean>>;
  setRouteTemplateId: Dispatch<SetStateAction<string>>;
  showConfirmPrimary: boolean;
  showContinuePrimary: boolean;
  showPendingDay: boolean;
  showPendingRoute: boolean;
  showPrimary: boolean;
  step: WizardStep;
  stepContent: ReactNode;
  stepCount: number;
  stepIndex: number;
  summaryChips: Array<{ label: string; value: string }>;
  taskTypeLabel: string;
  title: string;
  wizardSteps: WizardStep[];
};

export function ScheduleConfirmView(model: ScheduleConfirmViewModel) {
  const {
    canConfirm,
    canGoBack,
    confirmLabel,
    confirmSchedule,
    goBack,
    goNextFrom,
    goToStep,
    onCancel,
    pendingDayRouteMode,
    saving,
    setPendingDayRouteMode,
    setRouteTemplateId,
    showConfirmPrimary,
    showContinuePrimary,
    showPendingDay,
    showPendingRoute,
    showPrimary,
    step,
    stepContent,
    stepCount,
    stepIndex,
    summaryChips,
    taskTypeLabel,
    title,
    wizardSteps,
  } = model;

  return (
    <div className="app-modal-overlay fixed inset-0 z-[145] flex items-center justify-center bg-black/80 p-3 sm:p-4 backdrop-blur-sm">
      <div
        className="app-modal-content flex max-h-[calc(100dvh-2rem)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-800 bg-[#121815] shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-800 bg-[#0f1412] px-5 py-3.5">
          <div className="flex items-center gap-3 min-w-0">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-950/60 text-emerald-400 shadow-sm">
              <CalendarCheck2 className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs font-black uppercase tracking-wider text-white">
                {taskTypeLabel}
              </p>
              <p className="truncate text-[11px] font-medium text-slate-400">
                {title || "Programación de entrega"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-slate-800 bg-[#161f1b] text-slate-400 transition hover:border-slate-700 hover:bg-[#1e2a24] hover:text-white"
            title="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Steps Progress */}
        <div className="shrink-0 border-b border-slate-800/80 bg-[#141c18] px-5 py-3 space-y-2.5">
          <nav aria-label={`Paso ${stepIndex + 1} de ${stepCount}`} className="w-full">
            <ol className="grid gap-2" style={{ gridTemplateColumns: `repeat(${stepCount}, minmax(0, 1fr))` }}>
              {wizardSteps.map((entry, index) => {
                const status =
                  index < stepIndex ? "done" : index === stepIndex ? "active" : "upcoming";
                const canJump =
                  index < stepIndex && (!pendingDayRouteMode || entry === "day");

                return (
                  <li key={entry}>
                    <button
                      type="button"
                      disabled={!canJump}
                      onClick={() => {
                        if (!canJump) return;
                        if (pendingDayRouteMode && entry === "day") {
                          setPendingDayRouteMode(false);
                          setRouteTemplateId("");
                        }
                        goToStep(entry);
                      }}
                      aria-current={status === "active" ? "step" : undefined}
                      className={`flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left transition-all ${
                        status === "active"
                          ? "border-emerald-500/60 bg-emerald-950/60 text-white ring-1 ring-emerald-500/40 shadow-sm"
                          : status === "done"
                          ? "border-slate-700/80 bg-[#19221e] text-slate-200 hover:border-slate-600 hover:bg-[#202c27] cursor-pointer"
                          : "border-slate-800/80 bg-[#101614] text-slate-500 cursor-default"
                      }`}
                    >
                      <span
                        className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-black ${
                          status === "active"
                            ? "bg-emerald-400 text-slate-950 shadow-sm"
                            : status === "done"
                            ? "bg-emerald-500/30 text-emerald-300 border border-emerald-500/40"
                            : "bg-slate-800 text-slate-500"
                        }`}
                      >
                        {status === "done" ? (
                          <Check className="h-3 w-3" aria-hidden />
                        ) : (
                          index + 1
                        )}
                      </span>
                      <span className="truncate text-xs font-black tracking-wide">
                        {STEP_LABELS[entry]}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>
        </div>

        {/* Content Body */}
        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-3">
          {stepContent}
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-slate-800 bg-[#0f1412] px-5 py-3.5 space-y-2.5">
          <div className="flex items-center justify-between gap-3">
            {canGoBack ? (
              <button
                type="button"
                onClick={goBack}
                disabled={saving}
                className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-700/80 bg-[#161f1b] px-3 text-xs font-bold text-slate-300 transition hover:border-slate-600 hover:bg-[#1e2a24] hover:text-white disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden />
                Atrás
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onCancel}
                disabled={saving}
                className={`${secondaryButtonClass} h-9 px-4 text-xs font-bold disabled:opacity-40`}
              >
                Cancelar
              </button>

              {showContinuePrimary ? (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => goNextFrom(step)}
                  className={`${primaryButtonClass} h-9 px-4 text-xs font-bold disabled:opacity-40`}
                >
                  Siguiente
                </button>
              ) : null}

              {showConfirmPrimary ? (
                <button
                  type="button"
                  disabled={saving || !canConfirm}
                  onClick={() => void confirmSchedule()}
                  className={`${primaryButtonClass} h-9 px-4 text-xs font-bold disabled:opacity-40`}
                >
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  {confirmLabel}
                </button>
              ) : null}
            </div>
          </div>

          {showPendingDay || showPendingRoute ? (
            <p className="text-center text-[10px] font-bold text-slate-500">
              {pendingDayRouteMode
                ? "Elige una ruta ahora o deja día y ruta pendientes."
                : showPendingDay
                  ? "No sé el día permite elegir una ruta semanal sin fecha."
                  : "Ruta pendiente conserva el día; Logística define la ruta y la hora."}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

