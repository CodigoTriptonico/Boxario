"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarCheck2, Check, ChevronLeft, CircleAlert, Route, Truck } from "lucide-react";
import type { LogisticsWeekdaySchedule } from "@/app/actions/logistics-routes";
import { DateInput } from "@/components/date-input";
import { InlineSearchPicker } from "@/components/inline-search-picker";
import { LogisticsWeekdayPicker } from "@/components/logistica/logistics-weekday-picker";
import { ScheduleTimeField } from "@/components/sale/schedule-time-field";
import { primaryButtonClass, secondaryButtonClass } from "@/components/ui-blocks";
import { formatDateInputDisplay } from "@/lib/date-picker";
import { logisticsWeekdayKeys, type LogisticsWeekdayKey } from "@/lib/logistics-route-catalog";
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
  formatScheduleTimeLabel,
  scheduleTimeComplete,
} from "@/lib/sale/schedule-time";
import { isoToPlanScheduleAt } from "@/lib/shipment-schedule-history";
import {
  routeScheduleHasAvailabilityMismatch,
  routeScheduleRangeSuggestions,
} from "@/lib/logistics-route-schedule";
import {
  DEFAULT_SCHEDULE_SUGGESTIONS,
  type ScheduleTimeSuggestions,
} from "@/lib/sale/schedule-suggestions";

type RouteTemplate = {
  id: string;
  weekday: number;
  name: string;
  startTime?: string | null;
  estimatedEndTime?: string | null;
};
type Driver = { id: string; label: string; roleSlug: string };
type SelectionOrder = "date-first" | "route-first";
type DateFirstStep = "day" | "route";
type RouteFirstStep = "route" | "date" | "time";
type WizardStep = DateFirstStep | RouteFirstStep;

/** Día, fecha y hora van juntos; la ruta se resuelve en el segundo paso. */
const DATE_FIRST_STEPS: DateFirstStep[] = ["day", "route"];
const ROUTE_FIRST_STEPS: RouteFirstStep[] = ["route", "date", "time"];

const STEP_LABELS: Record<WizardStep, string> = {
  day: "Día y hora",
  date: "Fecha",
  route: "Ruta",
  time: "Hora",
};

function scheduleDraft(scheduledAt: string | null) {
  if (!scheduledAt) {
    return { date: minScheduleDateInput(), time: "10:00" };
  }

  const [date = minScheduleDateInput(), time = "10:00"] = isoToPlanScheduleAt(scheduledAt).split("T");
  return { date, time: time || "10:00" };
}

function templateLabel(template: RouteTemplate) {
  const day = logisticsWeekdayKeys[template.weekday] || `Día ${template.weekday}`;
  return `${day} · ${template.name}`;
}

function initialWizardStep(routeFirst: boolean): WizardStep {
  return routeFirst ? "route" : "day";
}

function wizardStepTileClass(status: "done" | "active" | "upcoming") {
  if (status === "active") {
    return "border-2 border-emerald-600 bg-emerald-600/35 text-emerald-50 shadow-[0_8px_18px_rgba(16,185,129,0.2)] ring-1 ring-emerald-400/45";
  }

  if (status === "done") {
    return "border-emerald-800/80 bg-[#1c2822] text-[#f8fafc] hover:border-emerald-700 hover:bg-[#223028]";
  }

  return "cursor-default border-black/80 bg-surface-inset text-slate-600";
}

function wizardStepBadgeClass(status: "done" | "active" | "upcoming") {
  if (status === "active" || status === "done") {
    return "border-emerald-300 bg-emerald-400 text-slate-950";
  }

  return "border-black bg-surface-card text-slate-500";
}

export function LogisticsTaskScheduleConfirmPanel({
  open,
  taskTypeLabel,
  scheduledAt,
  templates,
  scheduleSuggestions,
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
  templates: RouteTemplate[];
  scheduleSuggestions?: ScheduleTimeSuggestions;
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
  const wizardSteps = routeFirst ? ROUTE_FIRST_STEPS : DATE_FIRST_STEPS;
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
  const contextualScheduleSuggestions = useMemo<ScheduleTimeSuggestions>(
    () => ({
      ...(scheduleSuggestions || DEFAULT_SCHEDULE_SUGGESTIONS.delivery),
      range: routeScheduleRangeSuggestions(
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
    }),
    [dayTemplates, scheduleSuggestions, selectedTemplate, weekday, weekdaySchedule],
  );
  const dayAsRoute =
    !showAllRoutes &&
    dayTemplates.length === 0 &&
    availableWeekdays.includes(weekday);
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
  const showTimeField = !routeFirst || Boolean(dayAsRoute || routeTemplateId);
  const isFinalStep = routeFirst ? step === "time" : step === "route";
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
      (pendingDayRouteMode ? onConfirmPendingDay : onConfirmPendingRoute),
  );

  const pendingRouteAction =
    showPendingRoute ? (
      <button
        type="button"
        disabled={saving || !canLeavePendingRoute}
        onClick={() => {
          if (pendingDayRouteMode) {
            void onConfirmPendingDay?.();
            return;
          }
          void onConfirmPendingRoute?.({ routeDate: draft.date });
        }}
        className={`${secondaryButtonClass} h-11 w-full text-sm font-black disabled:opacity-40`}
      >
        {pendingRouteLabel}
      </button>
    ) : null;

  const pendingDayAction =
    showPendingDay ? (
      <button
        type="button"
        disabled={saving}
        onClick={() => {
          if (onConfirmPreferredRoute) {
            enterPendingDayRouteMode();
            return;
          }
          void onConfirmPendingDay?.();
        }}
        className={`${secondaryButtonClass} h-11 w-full text-sm font-black disabled:opacity-40`}
      >
        {pendingDayLabel}
      </button>
    ) : null;

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
  const dateStepField = showAllRoutes && !pendingDayRouteMode ? (
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

  const timeField = showTimeField ? (
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

  let stepContent = null;
  if (step === "day") {
    stepContent = (
      <div className="grid gap-4">
        {dayStepField}
        {dateStepField}
        {timeField}
        {pendingDayAction}
      </div>
    );
  } else if (step === "date") {
    stepContent = dateStepField;
  } else if (step === "route") {
    stepContent = (
      <div className="grid gap-4">
        {routeStepField}
        {!routeFirst && !pendingDayRouteMode ? driverField : null}
        {pendingRouteAction}
      </div>
    );
  } else {
    stepContent = timeStepField;
  }

  const canContinueFromDay = Boolean(
    weekdayChosen !== null &&
      /^\d{4}-\d{2}-\d{2}$/.test(draft.date) &&
      dateMatchesLogisticsWeekday(draft.date, weekdayChosen) &&
      availableWeekdays.includes(weekdayChosen),
  );
  const canContinueFromDate = Boolean(
    /^\d{4}-\d{2}-\d{2}$/.test(draft.date) &&
      (showAllRoutes && !pendingDayRouteMode
        ? selectedTemplate
        : availableWeekdays.includes(weekday)),
  );
  const canContinueFromRoute = Boolean(dayAsRoute || routeTemplateId);
  const showContinuePrimary =
    !pendingDayRouteMode &&
    ((!isFinalStep && step === "day" && canContinueFromDay && hasCompleteTime) ||
      (!isFinalStep && step === "date" && canContinueFromDate) ||
      (!isFinalStep && step === "route" && dayAsRoute && canContinueFromRoute));
  const showConfirmPrimary = isFinalStep && !pendingDayRouteMode;
  const showPrimary = showContinuePrimary || showConfirmPrimary;

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
      value: dayAsRoute
        ? weekdayLabel || "Día"
        : selectedTemplate?.name || "Ruta elegida",
    });
  }

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

          {allowPendingRoute && (step === "day" || step === "route") ? (
            <p className="text-center text-[11px] font-bold text-slate-500">
              {allowPendingDay
                ? pendingDayRouteMode
                  ? "Elige una ruta ahora, o No sé la ruta deja día y ruta pendientes."
                  : "No sé el día te deja elegir ruta sin fecha. No sé la ruta conserva el día elegido."
                : "Ruta pendiente conserva el día; Logística define la ruta y la hora."}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
