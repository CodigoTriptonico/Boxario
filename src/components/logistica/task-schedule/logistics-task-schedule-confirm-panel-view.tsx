"use client";

import { useEffect, useMemo, useState } from "react";
import { Truck } from "lucide-react";
import {
  resolveCompatibleGeographicRoutesAction,
  type CompatibleGeographicRoute,
  type LogisticsWeekdaySchedule,
} from "@/app/actions/logistics-routes";
import { DateInput } from "@/components/date-input";
import { InlineSearchPicker } from "@/components/inline-search-picker";
import { LogisticsWeekdayPicker } from "@/components/logistica/logistics-weekday-picker";
import { ScheduleTimeField } from "@/components/sale/schedule-time-field";
import {
  buildLogisticsScheduleStepContent,
  buildLogisticsScheduleSummaryChips,
  canConfirmLogisticsSchedule,
  canContinueFromScheduleDate,
  canContinueFromScheduleDay,
  computeLogisticsSchedulePrimaryButtons,
} from "@/components/logistica/task-schedule/logistics-task-schedule-confirm-helpers";
import { logisticsWeekdayKeys } from "@/lib/logistics-route-catalog";
import {
  DAY_AS_ROUTE_TEMPLATE_ID,
  enabledWeekdayIndexes,
  isDayAsRouteTemplateId,
  namedLogisticsRouteTemplates,
  nextWeekdayScheduleHint,
  resolveDayRouteTemplateId,
  selectWeekdayDate,
} from "@/lib/logistics-day-route";
import { resolveScheduleConfirmDriverId } from "@/lib/logistics-schedule-confirm-driver";
import { resolveLogisticsDefaultDriverId } from "@/lib/logistics-default-driver";
import {
  dateMatchesLogisticsWeekday,
  getLogisticsWeekdayIndex,
  nextDateForAvailableWeekdays,
  nextDateForLogisticsWeekday,
} from "@/lib/logistics-route-week";
import { minScheduleDateInput } from "@/lib/schedule-date";
import {
  scheduleTimeComplete,
} from "@/lib/sale/schedule-time";
import {
  routeScheduleHasAvailabilityMismatch,
  routeScheduleRangeSuggestions,
} from "@/lib/logistics-route-schedule";
import {
  type ScheduleTimeSuggestions,
} from "@/lib/sale/schedule-suggestions";
import {
  DATE_FIRST_STEPS,
  IMPLICIT_DAY_STEPS,
  ROUTE_FIRST_STEPS,
  initialWizardStep,
  scheduleDraft,
  templateLabel,
  type WizardStep,
} from "@/components/logistica/task-schedule/shared";
import { ScheduleConfirmView } from "@/components/logistica/task-schedule/schedule-confirm-view";
import {
  LogisticsTaskSchedulePendingDayAction,
  LogisticsTaskSchedulePendingRouteAction,
} from "@/components/logistica/task-schedule/logistics-task-schedule-pending-actions";
import { LogisticsTaskScheduleRouteField } from "@/components/logistica/task-schedule/logistics-task-schedule-route-field";
import { LogisticsRouteCoveragePreviewDialog } from "@/components/logistica/task-schedule/logistics-route-coverage-preview-dialog";
import type { LogisticsTaskScheduleConfirmPanelProps } from "@/components/logistica/task-schedule/logistics-task-schedule-confirm-panel-types";

const EMPTY_SCHEDULE_SUGGESTIONS: ScheduleTimeSuggestions = {
  exact: [],
  until: [],
  from: [],
  ranges: [],
  range: [],
};

export function LogisticsTaskScheduleConfirmPanel({
  open,
  taskTypeLabel,
  scheduledAt,
  initialRouteTemplateId = null,
  templates: allTemplates,
  customerId = "",
  requestedBoxes = 1,
  scheduleSuggestionsByWeekday,
  enabledDays = [],
  defaultDriverByWeekday,
  weekdayScheduleByWeekday = Array<LogisticsWeekdaySchedule | null>(7).fill(null),
  routeMembers,
  saving = false,
  title = "Confirmar y programar",
  confirmLabel = "Confirmar y programar",
  selectionOrder = "date-first",
  showDriverPicker = true,
  allowPendingDay = false,
  pendingDayLabel = "No sé el día",
  allowPendingRoute = false,
  pendingRouteLabel = "No sé la ruta todavía",
  pendingRouteDate = null,
  requireExplicitRouteSelection = false,
  onCancel,
  onConfirm,
  onConfirmPendingDay,
  onConfirmPendingRoute,
  onConfirmPreferredRoute,
}: LogisticsTaskScheduleConfirmPanelProps) {
  const templates = allTemplates;
  const routeFirst = selectionOrder === "route-first";
  const namedTemplates = useMemo(
    () => namedLogisticsRouteTemplates(templates),
    [templates],
  );
  const routeChoiceTemplates = routeFirst ? templates : namedTemplates;
  const availableWeekdays = useMemo(
    () => enabledWeekdayIndexes(enabledDays),
    [enabledDays],
  );
  const initialScheduleDraft = scheduleDraft(scheduledAt);
  const initialDraft =
    /^\d{4}-\d{2}-\d{2}$/.test(String(pendingRouteDate || ""))
      ? { ...initialScheduleDraft, date: String(pendingRouteDate) }
      : initialScheduleDraft;
  const initialWeekday = getLogisticsWeekdayIndex(initialDraft.date);
  const initialTemplate =
    routeChoiceTemplates.find((template) => template.id === initialRouteTemplateId) ||
    routeChoiceTemplates.find((template) => Number(template.weekday) === initialWeekday) ||
    routeChoiceTemplates.find((template) => availableWeekdays.includes(Number(template.weekday))) ||
    routeChoiceTemplates[0] ||
    null;
  const [draft, setDraft] = useState(() => {
    if (routeFirst) {
      if (!initialTemplate) {
        return initialDraft;
      }
      return {
        ...initialDraft,
        date: dateMatchesLogisticsWeekday(initialDraft.date, initialTemplate.weekday)
          ? initialDraft.date
          : nextDateForLogisticsWeekday(initialTemplate.weekday, minScheduleDateInput()),
      };
    }

    const fallbackDate = nextDateForAvailableWeekdays(availableWeekdays, minScheduleDateInput());
    return {
      ...initialDraft,
      date: availableWeekdays.includes(getLogisticsWeekdayIndex(initialDraft.date))
        ? initialDraft.date
        : fallbackDate,
    };
  });
  const [routeTemplateId, setRouteTemplateId] = useState(() => {
    if (initialRouteTemplateId && routeChoiceTemplates.some((template) => template.id === initialRouteTemplateId)) {
      return initialRouteTemplateId;
    }

    if (routeFirst) {
      return initialTemplate?.id || "";
    }
    const fallbackDate = nextDateForAvailableWeekdays(availableWeekdays, minScheduleDateInput());
    const startDate = availableWeekdays.includes(getLogisticsWeekdayIndex(initialDraft.date))
      ? initialDraft.date
      : fallbackDate;
    const startWeekday = getLogisticsWeekdayIndex(startDate);
    const resolvedTemplateId = resolveDayRouteTemplateId({
      weekday: startWeekday,
      templates: routeChoiceTemplates,
    });
    return requireExplicitRouteSelection && !isDayAsRouteTemplateId(resolvedTemplateId)
      ? ""
      : resolvedTemplateId;
  });
  const [pendingDayRouteMode, setPendingDayRouteMode] = useState(false);
  const [routeCoverageMatches, setRouteCoverageMatches] = useState<Map<string, boolean> | null>(null);
  const [coverageRoutes, setCoverageRoutes] = useState<CompatibleGeographicRoute[]>([]);
  const [coverageCustomerLocation, setCoverageCustomerLocation] = useState<{
    lat: number;
    lng: number;
    label: string;
  } | null>(null);
  const [coverageMapOpen, setCoverageMapOpen] = useState(false);
  const compatibilityLookupEnabled = Boolean(
    open && customerId && /^\d{4}-\d{2}-\d{2}$/.test(draft.date) && scheduleTimeComplete(draft.time),
  );
  const activeRouteCoverageMatches = compatibilityLookupEnabled ? routeCoverageMatches : null;
  const [step, setStep] = useState<WizardStep>(() => initialWizardStep(routeFirst));
  const [weekdayChosen, setWeekdayChosen] = useState<number | null>(() =>
    scheduledAt && availableWeekdays.includes(initialWeekday) ? initialWeekday : null,
  );
  const selectedTemplate = useMemo(
    () => routeChoiceTemplates.find((template) => template.id === routeTemplateId) || null,
    [routeChoiceTemplates, routeTemplateId],
  );
  const showAllRoutes = routeFirst || pendingDayRouteMode;
  const weekday = showAllRoutes
    ? selectedTemplate
      ? Number(selectedTemplate.weekday)
      : getLogisticsWeekdayIndex(draft.date)
    : weekdayChosen !== null
      ? weekdayChosen
      : getLogisticsWeekdayIndex(draft.date);
  const hasSelectedWeekday = routeFirst || weekdayChosen !== null;
  const selectedDefaultDriverId = resolveLogisticsDefaultDriverId({
    weekday,
    routeTemplateId,
    templates: routeChoiceTemplates,
    defaultDriverByWeekday,
  });
  const [driverId, setDriverId] = useState(selectedDefaultDriverId);
  const resolvedDriverId = resolveScheduleConfirmDriverId({
    showDriverPicker,
    selectedDriverId: driverId,
    defaultDriverId: selectedDefaultDriverId,
    conductors: routeMembers,
  });

  const dayTemplates = useMemo(
    () =>
      showAllRoutes
        ? routeChoiceTemplates.filter(
            (template) =>
              !routeScheduleHasAvailabilityMismatch(draft.time, template) &&
              (!activeRouteCoverageMatches || activeRouteCoverageMatches.has(template.id)),
          )
        : routeChoiceTemplates.filter(
            (template) =>
              Number(template.weekday) === weekday &&
              !routeScheduleHasAvailabilityMismatch(draft.time, template) &&
              (!activeRouteCoverageMatches || activeRouteCoverageMatches.has(template.id)),
          ),
    [activeRouteCoverageMatches, draft.time, routeChoiceTemplates, showAllRoutes, weekday],
  );
  const matchingTemplateCount = activeRouteCoverageMatches
    ? dayTemplates.filter((template) => activeRouteCoverageMatches.get(template.id) === true).length
    : null;
  const allNamedTemplatesForDay = namedLogisticsRouteTemplates(allTemplates).filter(
    (template) => Number(template.weekday) === weekday,
  );
  const weekdaySchedule = weekdayScheduleByWeekday[weekday];
  const dayScheduleSuggestions = hasSelectedWeekday
    ? scheduleSuggestionsByWeekday?.[weekday] ?? EMPTY_SCHEDULE_SUGGESTIONS
    : EMPTY_SCHEDULE_SUGGESTIONS;
  const contextualScheduleSuggestions = useMemo<ScheduleTimeSuggestions>(
    () => {
      if (!hasSelectedWeekday) {
        return EMPTY_SCHEDULE_SUGGESTIONS;
      }

      return {
        ...dayScheduleSuggestions,
      range: Array.from(
        new Set([
          ...dayScheduleSuggestions.range,
          ...routeScheduleRangeSuggestions(
            selectedTemplate
              ? [selectedTemplate]
              : dayTemplates.length
                ? dayTemplates
                : weekdaySchedule
                  ? [{
                      id: "__implicit_day_schedule__",
                      weekday,
                      name: logisticsWeekdayKeys[weekday] || "Día",
                      startTime: weekdaySchedule.startTime,
                      estimatedEndTime: weekdaySchedule.estimatedEndTime,
                    }]
                  : [],
          ),
        ]),
      ).sort(),
      };
    },
    [dayScheduleSuggestions, dayTemplates, hasSelectedWeekday, selectedTemplate, weekday, weekdaySchedule],
  );
  const dayAsRoute =
    !showAllRoutes &&
    allNamedTemplatesForDay.length === 0 &&
    availableWeekdays.includes(weekday);
  const requiresNamedRouteChoice = pendingDayRouteMode || dayTemplates.length > 0;
  const wizardSteps: WizardStep[] = routeFirst
    ? ROUTE_FIRST_STEPS
    : requiresNamedRouteChoice
      ? DATE_FIRST_STEPS
      : IMPLICIT_DAY_STEPS;
  const templateOptions = useMemo(
    () =>
      dayTemplates.map((template) => ({
        value: template.id,
        label: showAllRoutes ? templateLabel(template) : template.name,
        searchText: `${logisticsWeekdayKeys[template.weekday] || ""} ${template.name}`,
        trailing: template.startTime ? (
          <span
            className={
              activeRouteCoverageMatches?.get(template.id) === false
                ? "text-amber-300"
                : "text-emerald-300"
            }
          >
            {activeRouteCoverageMatches?.get(template.id) === false
              ? "Verificar cobertura"
              : "Cobertura compatible"}
          </span>
        ) : (
          <span className="text-slate-500">Sin horario</span>
        ),
      })),
    [activeRouteCoverageMatches, dayTemplates, showAllRoutes],
  );
  const driverOptions = useMemo(
    () => [
      { value: "", label: "Sin conductor todavía", searchText: "sin conductor" },
      ...routeMembers
        .filter((member) => member.roleSlug === "conductor")
        .map((member) => ({ value: member.id, label: member.label, searchText: member.label })),
    ],
    [routeMembers],
  );
  const allowedWeekdays = showAllRoutes
    ? selectedTemplate
      ? [Number(selectedTemplate.weekday)]
      : undefined
    : availableWeekdays;
  const weekdayLabel = logisticsWeekdayKeys[weekday] || "";
  const dateHint = nextWeekdayScheduleHint(draft.date);
  const stepIndex = Math.max(0, wizardSteps.indexOf(step as never));
  const stepCount = wizardSteps.length;
  const canGoBack = stepIndex > 0 || pendingDayRouteMode;

  useEffect(() => {
    if (!compatibilityLookupEnabled) return;
    let active = true;
    void resolveCompatibleGeographicRoutesAction({
      customerId: String(customerId),
      scheduledAt: `${draft.date}T${draft.time}`,
      boxCount: requestedBoxes,
    }).then((result) => {
      if (!active) return;
      const routes = result.ok ? result.data.routes : [];
      const selectableRoutes = routes
        .filter((route) => routeChoiceTemplates.some((template) => template.id === route.routeScheduleId));
      const coverageBySchedule = new Map(
        selectableRoutes.map((route) => [route.routeScheduleId, route.coverageMatches]),
      );
      const matchingRouteIds = selectableRoutes
        .filter((route) => route.coverageMatches)
        .map((route) => route.routeScheduleId)
      setRouteCoverageMatches(result.ok ? coverageBySchedule : null);
      setCoverageRoutes(result.ok ? selectableRoutes : []);
      setCoverageCustomerLocation(result.ok ? result.data.customerLocation : null);
      if (result.ok) {
        setRouteTemplateId((current) =>
          coverageBySchedule.has(current)
            ? current
            : matchingRouteIds.length === 1
              ? matchingRouteIds[0]
              : routeChoiceTemplates.length === 0
                ? DAY_AS_ROUTE_TEMPLATE_ID
                : "",
        );
      }
    });
    return () => { active = false; };
  }, [compatibilityLookupEnabled, customerId, draft.date, draft.time, requestedBoxes, routeChoiceTemplates]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const reopenWeekday = getLogisticsWeekdayIndex(scheduleDraft(scheduledAt).date);
    let active = true;
    queueMicrotask(() => {
      if (!active) {
        return;
      }
      setPendingDayRouteMode(false);
      setStep(initialWizardStep(routeFirst));
      setWeekdayChosen(
        scheduledAt && availableWeekdays.includes(reopenWeekday) ? reopenWeekday : null,
      );
    });
    return () => {
      active = false;
    };
    // Reset only when the panel opens (or the leg/order changes), not when catalog arrays churn.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- availableWeekdays read on open
  }, [open, routeFirst, scheduledAt]);

  useEffect(() => {
    if (!open || saving) {
      return;
    }

    const closeFromEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCancel();
      }
    };

    window.addEventListener("keydown", closeFromEscape);
    return () => window.removeEventListener("keydown", closeFromEscape);
  }, [open, saving, onCancel]);

  function goToStep(nextStep: WizardStep) {
    setStep(nextStep);
  }

  function goBack() {
    if (pendingDayRouteMode) {
      setPendingDayRouteMode(false);
      setRouteTemplateId("");
      goToStep("day");
      return;
    }

    if (stepIndex <= 0) {
      return;
    }
    goToStep(wizardSteps[stepIndex - 1] as WizardStep);
  }

  function goNextFrom(current: WizardStep) {
    const index = wizardSteps.indexOf(current as never);
    if (index < 0 || index >= wizardSteps.length - 1) {
      return;
    }
    goToStep(wizardSteps[index + 1] as WizardStep);
  }

  function enterPendingDayRouteMode() {
    setPendingDayRouteMode(true);
    setRouteTemplateId("");
    goToStep("route");
  }

  function selectRouteTemplate(nextTemplateId: string) {
    setRouteTemplateId(nextTemplateId);
    const template = routeChoiceTemplates.find((entry) => entry.id === nextTemplateId);
    if (!template) {
      return;
    }

    if (pendingDayRouteMode) {
      void onConfirmPreferredRoute?.({ routeTemplateId: nextTemplateId });
      return;
    }

    const nextWeekday = Number(template.weekday);
    setDriverId(resolveLogisticsDefaultDriverId({
      weekday: nextWeekday,
      routeTemplateId: nextTemplateId,
      templates: routeChoiceTemplates,
      defaultDriverByWeekday,
    }));
    if (routeFirst) {
      setDraft((current) => ({
        ...current,
        date: dateMatchesLogisticsWeekday(current.date, nextWeekday)
          ? current.date
          : nextDateForLogisticsWeekday(nextWeekday, minScheduleDateInput()),
      }));
      goToStep("date");
      return;
    }

  }

  function routeTemplateForWeekday(nextWeekday: number, currentTemplateId?: string) {
    const resolvedTemplateId = resolveDayRouteTemplateId({
      weekday: nextWeekday,
      templates: routeChoiceTemplates,
      currentTemplateId,
    });

    return requireExplicitRouteSelection && !isDayAsRouteTemplateId(resolvedTemplateId)
      ? ""
      : resolvedTemplateId;
  }

  function selectDate(date: string) {
    if (routeFirst) {
      setDraft((current) => ({ ...current, date }));
      goToStep("time");
      return;
    }

    const nextWeekday = getLogisticsWeekdayIndex(date);
    const nextRouteTemplateId = routeTemplateForWeekday(nextWeekday, routeTemplateId);
    setWeekdayChosen(nextWeekday);
    setDraft((current) => ({ ...current, date }));
    setDriverId(resolveLogisticsDefaultDriverId({
      weekday: nextWeekday,
      routeTemplateId: nextRouteTemplateId,
      templates: routeChoiceTemplates,
      defaultDriverByWeekday,
    }));
    setRouteTemplateId(nextRouteTemplateId);
  }

  function selectWeekday(nextWeekday: number) {
    const date = selectWeekdayDate(nextWeekday, minScheduleDateInput());
    const nextRouteTemplateId = routeTemplateForWeekday(nextWeekday, routeTemplateId);
    setWeekdayChosen(nextWeekday);
    setDraft((current) => ({ ...current, date }));
    setDriverId(resolveLogisticsDefaultDriverId({
      weekday: nextWeekday,
      routeTemplateId: nextRouteTemplateId,
      templates: routeChoiceTemplates,
      defaultDriverByWeekday,
    }));
    setRouteTemplateId(nextRouteTemplateId);
  }

  if (!open) return null;

  const scheduleAt = `${draft.date}T${draft.time}`;
  const hasCompleteTime = scheduleTimeComplete(draft.time);
  const dateMatchesRoute =
    !selectedTemplate || dateMatchesLogisticsWeekday(draft.date, selectedTemplate.weekday);
  const routeSelectionValid = Boolean(
    dayAsRoute
      ? isDayAsRouteTemplateId(routeTemplateId)
      : routeTemplateId && dayTemplates.length,
  );
  // Day + route are enough; driver can be assigned later after filtering by route.
  const canConfirm = canConfirmLogisticsSchedule({
    hasSelectedWeekday,
    hasCompleteTime,
    routeSelectionValid,
    dateMatchesRoute,
  });
  const canLeavePendingRoute = pendingDayRouteMode
    ? Boolean(onConfirmPendingDay)
    : Boolean(
        /^\d{4}-\d{2}-\d{2}$/.test(draft.date) &&
          (weekdayChosen !== null
            ? availableWeekdays.includes(weekdayChosen)
            : availableWeekdays.includes(weekday)),
      );
  const showTimeField =
    hasSelectedWeekday && (!routeFirst || Boolean(dayAsRoute || routeTemplateId));
  const isFinalStep = wizardSteps[wizardSteps.length - 1] === step;
  const showPendingDay = Boolean(
    !routeFirst &&
      !pendingDayRouteMode &&
      step === "day" &&
      allowPendingDay &&
      (onConfirmPreferredRoute || onConfirmPendingDay),
  );
  const showPendingRoute = Boolean(
    step === "route" &&
      allowPendingRoute &&
      requiresNamedRouteChoice &&
      (pendingDayRouteMode ? onConfirmPendingDay : onConfirmPendingRoute),
  );

  const pendingRouteAction = (
    <LogisticsTaskSchedulePendingRouteAction
      showPendingRoute={showPendingRoute}
      saving={saving}
      canLeavePendingRoute={canLeavePendingRoute}
      pendingRouteLabel={pendingRouteLabel}
      onPendingRoute={() => {
        if (pendingDayRouteMode) {
          void onConfirmPendingDay?.();
          return;
        }
        void onConfirmPendingRoute?.({ routeDate: draft.date });
      }}
    />
  );

  const pendingDayAction = (
    <LogisticsTaskSchedulePendingDayAction
      showPendingDay={showPendingDay}
      saving={saving}
      pendingDayLabel={pendingDayLabel}
      onPendingDay={() => {
        if (onConfirmPreferredRoute) {
          enterPendingDayRouteMode();
          return;
        }
        void onConfirmPendingDay?.();
      }}
    />
  );

  const dayStepField = (
    <div className="grid gap-1">
      <span className="text-[10px] font-black uppercase text-slate-500">Día</span>
      <LogisticsWeekdayPicker
        value={weekdayChosen}
        availableWeekdays={availableWeekdays}
        disabled={availableWeekdays.length === 0}
        onChange={selectWeekday}
        ariaLabel="Día de entrega"
      />
      {availableWeekdays.length === 0 ? (
        <span className="text-[11px] font-bold text-amber-200">
          No hay días disponibles en el calendario de rutas.
        </span>
      ) : (
        <span className="text-[11px] font-bold text-slate-500">
          Primero elige el día de la semana; después la fecha.
        </span>
      )}
    </div>
  );

  const dateUnlocked = routeFirst || weekdayChosen !== null;
  const dateStepField = !dateUnlocked ? null : showAllRoutes && !pendingDayRouteMode ? (
    <div className="grid gap-1">
      <span className="text-[10px] font-black uppercase text-slate-500">Qué día de esa ruta</span>
      <DateInput
        value={draft.date}
        min={minScheduleDateInput()}
        allowedWeekdays={allowedWeekdays}
        disabled={!selectedTemplate}
        onChange={selectDate}
        ariaLabel="Día de la ruta"
        className="w-full"
      />
      {weekdayLabel ? (
        <span className="text-[11px] font-bold text-slate-500">{weekdayLabel}</span>
      ) : null}
    </div>
  ) : (
    <div className="grid gap-1">
      <span className="text-[10px] font-black uppercase text-slate-500">Fecha</span>
      <DateInput
        value={dateUnlocked ? draft.date : ""}
        min={minScheduleDateInput()}
        allowedWeekdays={
          weekdayChosen !== null
            ? [weekdayChosen]
            : availableWeekdays.includes(weekday)
              ? [weekday]
              : availableWeekdays
        }
        disabled={!dateUnlocked || availableWeekdays.length === 0}
        onChange={selectDate}
        ariaLabel="Fecha de entrega"
        className="w-full"
      />
      {!dateUnlocked ? (
        <span className="text-[11px] font-bold text-slate-500">
          Elige un día arriba para desbloquear la fecha.
        </span>
      ) : availableWeekdays.length === 0 ? null : dateHint ? (
        <span className="text-[11px] font-bold text-slate-500">{dateHint}</span>
      ) : weekdayLabel ? (
        <span className="text-[11px] font-bold text-slate-500">
          Solo fechas de {weekdayLabel}.
        </span>
      ) : null}
    </div>
  );

  const routeStepField = (
    <LogisticsTaskScheduleRouteField
      dayAsRoute={dayAsRoute}
      pendingDayRouteMode={pendingDayRouteMode}
      showAllRoutes={showAllRoutes}
      routeTemplateId={routeTemplateId}
      onRouteTemplateChange={selectRouteTemplate}
      templateOptions={templateOptions}
      dayTemplateCount={dayTemplates.length}
      matchingTemplateCount={matchingTemplateCount}
      namedTemplateCount={allNamedTemplatesForDay.length}
      weekdayLabel={weekdayLabel}
      selectedTemplate={selectedTemplate}
      selectedCoverageMatches={
        selectedTemplate ? activeRouteCoverageMatches?.get(selectedTemplate.id) : undefined
      }
      canOpenCoverageMap={coverageRoutes.length > 0}
      onOpenCoverageMap={() => setCoverageMapOpen(true)}
      draftTime={draft.time}
    />
  );

  const timeField = !hasSelectedWeekday ? null : showTimeField ? (
    <ScheduleTimeField
      value={draft.time}
      suggestions={contextualScheduleSuggestions}
      onChange={(time) => setDraft((current) => ({ ...current, time }))}
    />
  ) : (
    <p className="text-sm font-bold text-amber-200">
      Falta elegir una ruta antes de confirmar.
    </p>
  );

  const driverField = showDriverPicker ? (
    <label className="grid gap-1">
      <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-slate-500">
        <Truck className="h-3.5 w-3.5" /> Conductor
      </span>
      <InlineSearchPicker
        value={driverId}
        onChange={setDriverId}
        options={driverOptions}
        placeholder="Sin conductor todavía"
        searchPlaceholder="Buscar conductor..."
        emptyLabel="Sin conductores"
        ariaLabel="Conductor confirmado"
      />
      {selectedDefaultDriverId ? (
        <span className="text-[11px] font-bold text-slate-500">
          Se seleccionó el conductor predeterminado de esta ruta; puedes cambiarlo o dejarlo vacío.
        </span>
      ) : (
        <span className="text-[11px] font-bold text-slate-500">
          Opcional. Puedes asignar el conductor después filtrando por ruta.
        </span>
      )}
    </label>
  ) : null;

  const timeStepField = (
    <div className="grid gap-4">
      {timeField}
      {driverField}
    </div>
  );

  const stepContent = buildLogisticsScheduleStepContent({
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
  });

  const canContinueFromDay = canContinueFromScheduleDay(
    weekdayChosen,
    draft.date,
    availableWeekdays,
  );
  const canContinueFromDate = canContinueFromScheduleDate(
    draft.date,
    showAllRoutes,
    pendingDayRouteMode,
    selectedTemplate,
    weekday,
    availableWeekdays,
  );
  const canContinueFromRoute = Boolean(dayAsRoute || routeTemplateId);
  const { showContinuePrimary, showConfirmPrimary, showPrimary } =
    computeLogisticsSchedulePrimaryButtons({
      pendingDayRouteMode,
      isFinalStep,
      step,
      canContinueFromDay,
      canContinueFromDate,
      canContinueFromRoute,
      hasCompleteTime,
      dayAsRoute,
    });

  const summaryChips = buildLogisticsScheduleSummaryChips({
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
  });

  async function confirmSchedule() {
    if (!canConfirm) {
      return;
    }

    await onConfirm({
      scheduledAt: scheduleAt,
      driverId: resolvedDriverId,
      routeTemplateId,
    });
  }

  return (
    <>
      <ScheduleConfirmView
      canConfirm={canConfirm}
      canGoBack={canGoBack}
      confirmLabel={confirmLabel}
      confirmSchedule={confirmSchedule}
      goBack={goBack}
      goNextFrom={goNextFrom}
      goToStep={goToStep}
      onCancel={onCancel}
      pendingDayRouteMode={pendingDayRouteMode}
      saving={saving}
      setPendingDayRouteMode={setPendingDayRouteMode}
      setRouteTemplateId={setRouteTemplateId}
      showConfirmPrimary={showConfirmPrimary}
      showContinuePrimary={showContinuePrimary}
      showPendingDay={showPendingDay}
      showPendingRoute={showPendingRoute}
      showPrimary={showPrimary}
      step={step}
      stepContent={stepContent}
      stepCount={stepCount}
      stepIndex={stepIndex}
      summaryChips={summaryChips}
      taskTypeLabel={taskTypeLabel}
      title={title}
        wizardSteps={wizardSteps}
      />
      <LogisticsRouteCoveragePreviewDialog
        open={coverageMapOpen}
        onClose={() => setCoverageMapOpen(false)}
        routes={coverageRoutes}
        selectedRouteId={routeTemplateId}
        customerLocation={coverageCustomerLocation}
      />
    </>
  );
}
