"use client";

import { useEffect, useMemo, useState } from "react";
import { CircleAlert, Route, Truck } from "lucide-react";
import type { LogisticsWeekdaySchedule } from "@/app/actions/logistics-routes";
import { DateInput } from "@/components/date-input";
import { InlineSearchPicker } from "@/components/inline-search-picker";
import { LogisticsWeekdayPicker } from "@/components/logistica/logistics-weekday-picker";
import { ScheduleTimeField } from "@/components/sale/schedule-time-field";
import {
  buildLogisticsScheduleStepContent,
  buildLogisticsScheduleSummaryChips,
  canContinueFromScheduleDate,
  canContinueFromScheduleDay,
  computeLogisticsSchedulePrimaryButtons,
} from "@/components/logistica/task-schedule/logistics-task-schedule-confirm-helpers";
import {
  logisticsWeekdayKeys,
  type LogisticsWeekdayKey,
} from "@/lib/logistics-route-catalog";
import {
  enabledWeekdayIndexes,
  isDayAsRouteTemplateId,
  nextWeekdayScheduleHint,
  resolveDayRouteTemplateId,
  selectWeekdayDate,
} from "@/lib/logistics-day-route";
import { resolveScheduleConfirmDriverId } from "@/lib/logistics-schedule-confirm-driver";
import {
  dateMatchesLogisticsWeekday,
  getLogisticsWeekdayIndex,
  nextDateForAvailableWeekdays,
  nextDateForLogisticsWeekday,
} from "@/lib/logistics-route-week";
import { minScheduleDateInput } from "@/lib/schedule-date";
import {
  formatTime12Hour,
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
  type Driver,
  type RouteTemplate,
  type SelectionOrder,
  type WizardStep,
} from "@/components/logistica/task-schedule/shared";
import { ScheduleConfirmView } from "@/components/logistica/task-schedule/schedule-confirm-view";
import {
  LogisticsTaskSchedulePendingDayAction,
  LogisticsTaskSchedulePendingRouteAction,
} from "@/components/logistica/task-schedule/logistics-task-schedule-pending-actions";

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
  templates,
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
}: {
  open: boolean;
  shipmentCode: string;
  customerName: string;
  taskTypeLabel: string;
  scheduledAt: string | null;
  initialRouteTemplateId?: string | null;
  templates: RouteTemplate[];
  scheduleSuggestionsByWeekday?: Array<ScheduleTimeSuggestions | null>;
  /** Catalog-enabled weekdays. When a day has 0 templates, the day itself is the route. */
  enabledDays?: LogisticsWeekdayKey[];
  defaultDriverByWeekday: Array<string | null>;
  weekdayScheduleByWeekday?: Array<LogisticsWeekdaySchedule | null>;
  routeMembers: Driver[];
  saving?: boolean;
  title?: string;
  confirmLabel?: string;
  selectionOrder?: SelectionOrder;
  /** Sellers assign day+route; logistics owns the driver. */
  showDriverPicker?: boolean;
  allowPendingDay?: boolean;
  pendingDayLabel?: string;
  allowPendingRoute?: boolean;
  pendingRouteLabel?: string;
  pendingRouteDate?: string | null;
  requireExplicitRouteSelection?: boolean;
  onCancel: () => void;
  onConfirm: (input: {
    scheduledAt: string;
    driverId: string;
    routeTemplateId: string;
  }) => void | Promise<void>;
  onConfirmPendingDay?: () => void | Promise<void>;
  onConfirmPendingRoute?: (input: { routeDate: string }) => void | Promise<void>;
  /** Known weekly route without a concrete delivery date. */
  onConfirmPreferredRoute?: (input: { routeTemplateId: string }) => void | Promise<void>;
}) {
  const routeFirst = selectionOrder === "route-first";
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
    templates.find((template) => template.id === initialRouteTemplateId) ||
    templates.find((template) => Number(template.weekday) === initialWeekday) ||
    templates.find((template) => availableWeekdays.includes(Number(template.weekday))) ||
    templates[0] ||
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
    if (initialRouteTemplateId && templates.some((template) => template.id === initialRouteTemplateId)) {
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
    const resolvedTemplateId = resolveDayRouteTemplateId({ weekday: startWeekday, templates });
    return requireExplicitRouteSelection && !isDayAsRouteTemplateId(resolvedTemplateId)
      ? ""
      : resolvedTemplateId;
  });
  const [pendingDayRouteMode, setPendingDayRouteMode] = useState(false);
  const [step, setStep] = useState<WizardStep>(() => initialWizardStep(routeFirst));
  const [weekdayChosen, setWeekdayChosen] = useState<number | null>(() =>
    scheduledAt && availableWeekdays.includes(initialWeekday) ? initialWeekday : null,
  );
  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === routeTemplateId) || null,
    [routeTemplateId, templates],
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
  const [driverId, setDriverId] = useState(defaultDriverByWeekday[weekday] || "");
  const resolvedDriverId = resolveScheduleConfirmDriverId({
    showDriverPicker,
    selectedDriverId: driverId,
    defaultDriverId: defaultDriverByWeekday[weekday],
    conductors: routeMembers,
  });

  const dayTemplates = useMemo(
    () =>
      showAllRoutes
        ? templates
        : templates.filter((template) => Number(template.weekday) === weekday),
    [showAllRoutes, templates, weekday],
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
    dayTemplates.length === 0 &&
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
        trailing: template.startTime && template.estimatedEndTime ? (
          <span
            className={
              routeScheduleHasAvailabilityMismatch(draft.time, template)
                ? "text-amber-300"
                : "text-emerald-300"
            }
          >
            {routeScheduleHasAvailabilityMismatch(draft.time, template)
              ? "Revisar horario"
              : "Compatible"}
          </span>
        ) : (
          <span className="text-slate-500">Sin horario</span>
        ),
      })),
    [dayTemplates, draft.time, showAllRoutes],
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
    const template = templates.find((entry) => entry.id === nextTemplateId);
    if (!template) {
      return;
    }

    if (pendingDayRouteMode) {
      void onConfirmPreferredRoute?.({ routeTemplateId: nextTemplateId });
      return;
    }

    const nextWeekday = Number(template.weekday);
    setDriverId(defaultDriverByWeekday[nextWeekday] || "");
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
      templates,
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
    setWeekdayChosen(nextWeekday);
    setDraft((current) => ({ ...current, date }));
    setDriverId(defaultDriverByWeekday[nextWeekday] || "");
    setRouteTemplateId((current) => routeTemplateForWeekday(nextWeekday, current));
  }

  function selectWeekday(nextWeekday: number) {
    const date = selectWeekdayDate(nextWeekday, minScheduleDateInput());
    setWeekdayChosen(nextWeekday);
    setDraft((current) => ({ ...current, date }));
    setDriverId(defaultDriverByWeekday[nextWeekday] || "");
    setRouteTemplateId((current) => routeTemplateForWeekday(nextWeekday, current));
  }

  if (!open) return null;

  const scheduleAt = `${draft.date}T${draft.time}`;
  const hasCompleteTime = scheduleTimeComplete(draft.time);
  const dateMatchesRoute =
    !selectedTemplate || dateMatchesLogisticsWeekday(draft.date, selectedTemplate.weekday);
  // Day + route are enough; driver can be assigned later after filtering by route.
  const canConfirm = Boolean(
    hasCompleteTime &&
      (dayAsRoute
        ? isDayAsRouteTemplateId(routeTemplateId)
        : routeTemplateId && dayTemplates.length) &&
      dateMatchesRoute,
  );
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

  const routeStepField = dayAsRoute ? null : (
    <div className="grid gap-1">
      <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-slate-500">
        <Route className="h-3.5 w-3.5" />{" "}
        {pendingDayRouteMode ? "Ruta sin fecha" : showAllRoutes ? "Ruta" : "Ruta del día"}
      </span>
      <InlineSearchPicker
        value={routeTemplateId}
        onChange={selectRouteTemplate}
        options={templateOptions}
        placeholder={
          pendingDayRouteMode
            ? "Selecciona una ruta (sin fecha)"
            : showAllRoutes
              ? "Selecciona una ruta"
              : dayTemplates.length
                ? `Rutas de ${weekdayLabel}`
                : "No hay rutas ese día"
        }
        searchPlaceholder="Buscar ruta..."
        emptyLabel={
          showAllRoutes ? "No hay rutas semanales" : `No hay rutas para ${weekdayLabel || "ese día"}`
        }
        ariaLabel="Ruta semanal"
        className="w-full"
        minWidthClass="w-full"
      />
      {selectedTemplate ? (
        selectedTemplate.startTime && selectedTemplate.estimatedEndTime ? (
          <div className="rounded-lg border border-black/70 bg-surface-inset px-3 py-2">
            <p className="text-[10px] font-black uppercase text-slate-500">Horario de la ruta</p>
            <p className="mt-1 text-sm font-black text-emerald-100">
              Inicio {formatTime12Hour(selectedTemplate.startTime)} · fin estimado {formatTime12Hour(selectedTemplate.estimatedEndTime)}
            </p>
          </div>
        ) : (
          <p className="rounded-lg border border-black/70 bg-surface-inset px-3 py-2 text-[11px] font-bold text-slate-400">
            Horario de la ruta pendiente de configurar por Logística.
          </p>
        )
      ) : null}
      {selectedTemplate && routeScheduleHasAvailabilityMismatch(draft.time, selectedTemplate) ? (
        <div className="flex items-start gap-2 rounded-lg border border-amber-700/70 bg-amber-950/30 px-3 py-2.5" role="alert">
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" aria-hidden />
          <p className="text-[11px] font-bold leading-4 text-amber-200">
            La disponibilidad del cliente podría no coincidir con el horario de la ruta. Verifica con Logística antes de confirmar.
          </p>
        </div>
      ) : null}
      {pendingDayRouteMode ? (
        <span className="text-[11px] font-bold text-slate-500">
          Elige la ruta ahora. Logística define el día y la hora.
        </span>
      ) : !showAllRoutes && weekdayLabel ? (
        <span className="text-[11px] font-bold text-slate-500">
          Solo aparecen rutas de {weekdayLabel}.
        </span>
      ) : null}
      {showAllRoutes && !pendingDayRouteMode && selectedTemplate ? (
        <span className="text-[11px] font-bold text-slate-500">
          Solo se pueden elegir fechas de {logisticsWeekdayKeys[selectedTemplate.weekday] || "ese día"}.
        </span>
      ) : null}
    </div>
  );

  const timeField = !hasSelectedWeekday ? null : showTimeField ? (
    <div className="grid gap-1">
      <span className="text-[10px] font-black uppercase text-slate-500">Hora</span>
      <ScheduleTimeField
        value={draft.time}
        suggestions={contextualScheduleSuggestions}
        onChange={(time) => setDraft((current) => ({ ...current, time }))}
      />
    </div>
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
      {defaultDriverByWeekday[weekday] ? (
        <span className="text-[11px] font-bold text-slate-500">
          Se seleccionó el conductor predeterminado de este día; puedes cambiarlo o dejarlo vacío.
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
    if (!hasCompleteTime || !routeTemplateId) {
      return;
    }

    await onConfirm({
      scheduledAt: scheduleAt,
      driverId: resolvedDriverId,
      routeTemplateId,
    });
  }

  return (
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
  );
}
