"use client";

import type { Dispatch, ReactNode, SetStateAction } from "react";
import { CalendarCheck2, Check, ChevronLeft } from "lucide-react";
import { primaryButtonClass, secondaryButtonClass } from "@/components/ui-blocks";
import {
  STEP_LABELS,
  wizardStepBadgeClass,
  wizardStepTileClass,
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
    <div className="app-modal-overlay fixed inset-0 z-[145] flex justify-center bg-black/70 p-3 sm:p-4">
      <div
        className="app-modal-content flex max-h-[calc(100dvh-1.5rem)] w-full max-w-md flex-col overflow-hidden rounded-xl border border-black bg-surface-panel shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex shrink-0 items-center gap-3 border-b border-black px-4 py-3 sm:px-5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-emerald-600 bg-emerald-400 text-slate-950">
            <CalendarCheck2 className="h-5 w-5" />
          </span>
          <p className="min-w-0 text-sm font-black uppercase text-slate-300">
            {taskTypeLabel}
          </p>
        </div>

        <div className="shrink-0 px-4 pt-3 sm:px-5">
          <nav aria-label={`Paso ${stepIndex + 1} de ${stepCount}`} className="w-full">
            <ol className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${stepCount}, minmax(0, 1fr))` }}>
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
                        if (!canJump) {
                          return;
                        }
                        if (pendingDayRouteMode && entry === "day") {
                          setPendingDayRouteMode(false);
                          setRouteTemplateId("");
                        }
                        goToStep(entry);
                      }}
                      aria-current={status === "active" ? "step" : undefined}
                      className={`flex w-full flex-col items-center gap-1 rounded-lg border px-1 py-2 transition ${wizardStepTileClass(status)} ${
                        canJump ? "cursor-pointer" : ""
                      }`}
                    >
                      <span
                        className={`inline-flex h-6 w-6 items-center justify-center rounded-md border text-[11px] font-black tabular-nums ${wizardStepBadgeClass(status)}`}
                      >
                        {status === "done" ? (
                          <Check className="h-3.5 w-3.5" aria-hidden />
                        ) : (
                          index + 1
                        )}
                      </span>
                      <span className="text-[10px] font-black uppercase tracking-wide">
                        {STEP_LABELS[entry]}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>

          {summaryChips.length ? (
            <dl className="mt-3 flex flex-wrap gap-1.5">
              {summaryChips.map((chip) => (
                <div
                  key={chip.label}
                  className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-black/70 bg-[#26322e] px-2.5 py-1.5"
                >
                  <dt className="text-[10px] font-black uppercase text-slate-500">{chip.label}</dt>
                  <dd className="truncate text-xs font-black text-[#f8fafc]">{chip.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>

        <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto px-4 py-4 sm:px-5">
          {stepContent}
        </div>

        <div className="grid shrink-0 gap-3 border-t border-black px-4 py-4 sm:px-5">
          {canGoBack ? (
            <button
              type="button"
              onClick={goBack}
              disabled={saving}
              className="inline-flex h-9 w-fit items-center gap-1 rounded-lg px-1.5 text-sm font-black text-slate-400 transition hover:bg-white/5 hover:text-emerald-300 disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
              Atrás
            </button>
          ) : null}

          <div className={`grid gap-3 ${showPrimary ? "sm:grid-cols-2" : ""}`}>
            <button
              type="button"
              onClick={onCancel}
              disabled={saving}
              className={`${secondaryButtonClass} h-11 text-sm font-black disabled:opacity-40`}
            >
              Cancelar
            </button>

            {showContinuePrimary ? (
              <button
                type="button"
                disabled={saving}
                onClick={() => goNextFrom(step)}
                className={`${primaryButtonClass} h-11 text-sm font-black disabled:opacity-40`}
              >
                Siguiente
              </button>
            ) : null}

            {showConfirmPrimary ? (
              <button
                type="button"
                disabled={saving || !canConfirm}
                onClick={() => void confirmSchedule()}
                className={`${primaryButtonClass} h-11 text-sm font-black disabled:opacity-40`}
              >
                {saving ? "Confirmando..." : confirmLabel}
              </button>
            ) : null}
          </div>

          {showPendingDay || showPendingRoute ? (
            <p className="text-center text-[11px] font-bold text-slate-500">
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

