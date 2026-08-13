import { formatDateInputDisplay } from "@/lib/date-picker";
import { dateMatchesLogisticsWeekday } from "@/lib/logistics-route-week";
import { formatScheduleTimeLabel } from "@/lib/sale/schedule-time";
import type { WizardStep } from "@/components/logistica/task-schedule/shared";

type ScheduleDraft = { date: string; time: string };

type BuildScheduleStepContentParams = {
  step: WizardStep;
  dayStepField: React.ReactNode;
  dateStepField: React.ReactNode;
  timeField: React.ReactNode;
  routeStepField: React.ReactNode;
  driverField: React.ReactNode;
  timeStepField: React.ReactNode;
  dayAsRoute: boolean;
  routeFirst: boolean;
  pendingDayRouteMode: boolean;
  pendingDayAction: React.ReactNode;
  pendingRouteAction: React.ReactNode;
};

export function buildLogisticsScheduleStepContent(params: BuildScheduleStepContentParams) {
  const {
    step,
    dayStepField,
    dateStepField,
    timeField,
    routeStepField,
    driverField,
    timeStepField,
    dayAsRoute,
    routeFirst,
    pendingDayRouteMode,
    pendingDayAction,
    pendingRouteAction,
  } = params;

  if (step === "day") {
    return (
      <div className="grid gap-4">
        {dayStepField}
        {dateStepField}
        {timeField}
        {dayAsRoute ? driverField : null}
        {pendingDayAction}
      </div>
    );
  }

  if (step === "date") {
    return dateStepField;
  }

  if (step === "route") {
    return (
      <div className="grid gap-4">
        {routeStepField}
        {!routeFirst && !pendingDayRouteMode ? driverField : null}
        {pendingRouteAction}
      </div>
    );
  }

  return timeStepField;
}

type BuildScheduleSummaryChipsParams = {
  pendingDayRouteMode: boolean;
  routeFirst: boolean;
  step: WizardStep;
  stepIndex: number;
  weekdayChosen: number | null;
  weekdayLabel: string;
  draft: ScheduleDraft;
  dayAsRoute: boolean;
  selectedTemplate: { name: string } | null;
  routeTemplateId: string;
};

export function buildLogisticsScheduleSummaryChips(params: BuildScheduleSummaryChipsParams) {
  const {
    pendingDayRouteMode,
    routeFirst,
    step,
    stepIndex,
    weekdayChosen,
    weekdayLabel,
    draft,
    dayAsRoute,
    selectedTemplate,
    routeTemplateId,
  } = params;

  const summaryChips: Array<{ label: string; value: string }> = [];

  if (pendingDayRouteMode) {
    summaryChips.push({ label: "Día", value: "Pendiente" });
  } else if (
    !routeFirst &&
    stepIndex > 0 &&
    weekdayChosen !== null &&
    weekdayLabel &&
    /^\d{4}-\d{2}-\d{2}$/.test(draft.date)
  ) {
    summaryChips.push({
      label: "Día y hora",
      value: `${weekdayLabel} · ${formatDateInputDisplay(draft.date)} · ${formatScheduleTimeLabel(draft.time)}`,
    });
  }

  if (
    !pendingDayRouteMode &&
    routeFirst &&
    step === "time" &&
    /^\d{4}-\d{2}-\d{2}$/.test(draft.date)
  ) {
    summaryChips.push({ label: "Fecha", value: formatDateInputDisplay(draft.date) });
  }

  if (step === "time" && (dayAsRoute || selectedTemplate || routeTemplateId)) {
    summaryChips.push({
      label: "Ruta",
      value: dayAsRoute ? weekdayLabel || "Día" : selectedTemplate?.name || "Ruta elegida",
    });
  }

  return summaryChips;
}

export function canConfirmLogisticsSchedule(params: {
  hasSelectedWeekday: boolean;
  hasCompleteTime: boolean;
  routeSelectionValid: boolean;
  dateMatchesRoute: boolean;
}) {
  return Boolean(
    params.hasSelectedWeekday &&
      params.hasCompleteTime &&
      params.routeSelectionValid &&
      params.dateMatchesRoute,
  );
}

type ComputeSchedulePrimaryButtonsParams = {
  pendingDayRouteMode: boolean;
  isFinalStep: boolean;
  step: WizardStep;
  canContinueFromDay: boolean;
  canContinueFromDate: boolean;
  canContinueFromRoute: boolean;
  hasCompleteTime: boolean;
  dayAsRoute: boolean;
};

export function computeLogisticsSchedulePrimaryButtons(params: ComputeSchedulePrimaryButtonsParams) {
  const {
    pendingDayRouteMode,
    isFinalStep,
    step,
    canContinueFromDay,
    canContinueFromDate,
    canContinueFromRoute,
    hasCompleteTime,
    dayAsRoute,
  } = params;

  const showContinuePrimary =
    !pendingDayRouteMode &&
    ((!isFinalStep && step === "day" && canContinueFromDay && hasCompleteTime) ||
      (!isFinalStep && step === "date" && canContinueFromDate) ||
      (!isFinalStep && step === "route" && dayAsRoute && canContinueFromRoute));
  const showConfirmPrimary = isFinalStep && !pendingDayRouteMode;
  const showPrimary = showContinuePrimary || showConfirmPrimary;

  return { showContinuePrimary, showConfirmPrimary, showPrimary };
}

export function canContinueFromScheduleDay(
  weekdayChosen: number | null,
  draftDate: string,
  availableWeekdays: number[],
) {
  return Boolean(
    weekdayChosen !== null &&
      /^\d{4}-\d{2}-\d{2}$/.test(draftDate) &&
      dateMatchesLogisticsWeekday(draftDate, weekdayChosen) &&
      availableWeekdays.includes(weekdayChosen),
  );
}

export function canContinueFromScheduleDate(
  draftDate: string,
  showAllRoutes: boolean,
  pendingDayRouteMode: boolean,
  selectedTemplate: unknown,
  weekday: number,
  availableWeekdays: number[],
) {
  return Boolean(
    /^\d{4}-\d{2}-\d{2}$/.test(draftDate) &&
      (showAllRoutes && !pendingDayRouteMode
        ? selectedTemplate
        : availableWeekdays.includes(weekday)),
  );
}
