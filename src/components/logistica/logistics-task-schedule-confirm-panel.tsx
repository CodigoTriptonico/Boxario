"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarCheck2, CalendarOff, Check, ChevronLeft, Route, Truck } from "lucide-react";
import { ensureLogisticsDayRouteTemplateAction } from "@/app/actions/logistics-routes";
import { DateInput } from "@/components/date-input";
import { InlineSearchPicker } from "@/components/inline-search-picker";
import { LogisticsWeekdayPicker } from "@/components/logistica/logistics-weekday-picker";
import { TimePickerInput } from "@/components/time-picker-input";
import { primaryButtonClass, secondaryButtonClass } from "@/components/ui-blocks";
import { useNotify } from "@/hooks/use-notify";
import { formatDateInputDisplay } from "@/lib/date-picker";
import { logisticsWeekdayKeys, type LogisticsWeekdayKey } from "@/lib/logistics-route-catalog";
import {
  dayAsRouteHint,
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
import { scheduleAtToTimestamp } from "@/lib/sale/schedule-time";
import { isoToPlanScheduleAt } from "@/lib/shipment-schedule-history";

type RouteTemplate = { id: string; weekday: number; name: string };
type Driver = { id: string; label: string; roleSlug: string };
type SelectionOrder = "date-first" | "route-first";
type DateFirstStep = "day" | "date" | "route" | "time";
type RouteFirstStep = "route" | "date" | "time";
type WizardStep = DateFirstStep | RouteFirstStep;

const DATE_FIRST_STEPS: DateFirstStep[] = ["day", "date", "route", "time"];
const ROUTE_FIRST_STEPS: RouteFirstStep[] = ["route", "date", "time"];

const STEP_LABELS: Record<WizardStep, string> = {
  day: "Día",
  date: "Fecha",
  route: "Ruta",
  time: "Hora",
};

function scheduleDraft(scheduledAt: string | null) {
  if (!scheduledAt) {
    return { date: minScheduleDateInput(), time: "10:00" };
  }

  const [date = minScheduleDateInput(), time = "10:00"] = isoToPlanScheduleAt(scheduledAt).split("T");
  return { date, time: time.slice(0, 5) || "10:00" };
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
  shipmentCode,
  customerName,
  taskTypeLabel,
  scheduledAt,
  templates,
  enabledDays = [],
  defaultDriverByWeekday,
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
}: {
  open: boolean;
  shipmentCode: string;
  customerName: string;
  taskTypeLabel: string;
  scheduledAt: string | null;
  templates: RouteTemplate[];
  /** Catalog-enabled weekdays. When a day has 0 templates, the day itself is the route. */
  enabledDays?: LogisticsWeekdayKey[];
  defaultDriverByWeekday: Array<string | null>;
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
}) {
  const notify = useNotify();
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
  const [ensuringDayRoute, setEnsuringDayRoute] = useState(false);
  const [step, setStep] = useState<WizardStep>(() => initialWizardStep(routeFirst));
  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === routeTemplateId) || null,
    [routeTemplateId, templates],
  );
  const weekday = routeFirst
    ? selectedTemplate
      ? Number(selectedTemplate.weekday)
      : getLogisticsWeekdayIndex(draft.date)
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
      routeFirst
        ? templates
        : templates.filter((template) => Number(template.weekday) === weekday),
    [routeFirst, templates, weekday],
  );
  const dayAsRoute = !routeFirst && dayTemplates.length === 0 && availableWeekdays.includes(weekday);
  const templateOptions = useMemo(
    () =>
      dayTemplates.map((template) => ({
        value: template.id,
        label: routeFirst ? templateLabel(template) : template.name,
        searchText: `${logisticsWeekdayKeys[template.weekday] || ""} ${template.name}`,
      })),
    [dayTemplates, routeFirst],
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
  const allowedWeekdays = routeFirst
    ? selectedTemplate
      ? [Number(selectedTemplate.weekday)]
      : undefined
    : availableWeekdays;
  const weekdayLabel = logisticsWeekdayKeys[weekday] || "";
  const dateHint = nextWeekdayScheduleHint(draft.date);
  const stepIndex = Math.max(0, wizardSteps.indexOf(step as never));
  const stepCount = wizardSteps.length;
  const canGoBack = stepIndex > 0;

  useEffect(() => {
    if (!open) {
      return;
    }
    setStep(initialWizardStep(routeFirst));
  }, [open, routeFirst]);

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

  function selectRouteTemplate(nextTemplateId: string) {
    setRouteTemplateId(nextTemplateId);
    const template = templates.find((entry) => entry.id === nextTemplateId);
    if (!template) {
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

    goToStep("time");
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
    setDraft((current) => ({ ...current, date }));
    setDriverId(defaultDriverByWeekday[nextWeekday] || "");
    setRouteTemplateId((current) => routeTemplateForWeekday(nextWeekday, current));
    goToStep("route");
  }

  function selectWeekday(nextWeekday: number) {
    const date = selectWeekdayDate(nextWeekday, minScheduleDateInput());
    setDraft((current) => ({ ...current, date }));
    setDriverId(defaultDriverByWeekday[nextWeekday] || "");
    setRouteTemplateId((current) => routeTemplateForWeekday(nextWeekday, current));
    goToStep("date");
  }

  if (!open) return null;

  const scheduledTimestamp = scheduleAtToTimestamp(`${draft.date}T${draft.time}`);
  const dateMatchesRoute =
    !selectedTemplate || dateMatchesLogisticsWeekday(draft.date, selectedTemplate.weekday);
  // Day + route are enough; driver can be assigned later after filtering by route.
  const canConfirm = Boolean(
    scheduledTimestamp &&
      (dayAsRoute
        ? isDayAsRouteTemplateId(routeTemplateId)
        : routeTemplateId && dayTemplates.length) &&
      dateMatchesRoute,
  );
  const canLeavePendingRoute = Boolean(
    /^\d{4}-\d{2}-\d{2}$/.test(draft.date) && availableWeekdays.includes(weekday),
  );
  const showTimeField = Boolean(dayAsRoute || routeTemplateId);
  const isFinalStep = step === "time";
  const showPendingDay = Boolean(
    !routeFirst && step === "day" && allowPendingDay && onConfirmPendingDay,
  );
  const showPendingRoute = Boolean(
    step === "route" && allowPendingRoute && onConfirmPendingRoute,
  );

  const dayStepField = (
    <div className="grid gap-1">
      <span className="text-[10px] font-black uppercase text-slate-500">Día</span>
      <LogisticsWeekdayPicker
        value={weekday}
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
          Elige el día de la semana; después eliges la fecha.
        </span>
      )}
    </div>
  );

  const dateStepField = routeFirst ? (
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
        value={draft.date}
        min={minScheduleDateInput()}
        allowedWeekdays={
          availableWeekdays.includes(weekday) ? [weekday] : availableWeekdays
        }
        disabled={availableWeekdays.length === 0}
        onChange={selectDate}
        ariaLabel="Fecha de entrega"
        className="w-full"
      />
      {availableWeekdays.length === 0 ? null : dateHint ? (
        <span className="text-[11px] font-bold text-slate-500">{dateHint}</span>
      ) : weekdayLabel ? (
        <span className="text-[11px] font-bold text-slate-500">
          Solo fechas de {weekdayLabel}.
        </span>
      ) : null}
    </div>
  );

  const routeStepField = (
    <div className="grid gap-1">
      <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-slate-500">
        <Route className="h-3.5 w-3.5" /> {routeFirst ? "Ruta" : "Ruta del día"}
      </span>
      {dayAsRoute ? (
        <div className="rounded-lg border border-black bg-surface-inset px-3 py-2.5">
          <p className="text-sm font-black text-[#f8fafc]">{weekdayLabel || "Día"}</p>
          <p className="mt-0.5 text-[11px] font-bold text-slate-500">{dayAsRouteHint(weekday)}</p>
        </div>
      ) : (
        <InlineSearchPicker
          value={routeTemplateId}
          onChange={selectRouteTemplate}
          options={templateOptions}
          placeholder={
            routeFirst
              ? "Selecciona una ruta"
              : dayTemplates.length
                ? `Rutas de ${weekdayLabel}`
                : "No hay rutas ese día"
          }
          searchPlaceholder="Buscar ruta..."
          emptyLabel={routeFirst ? "No hay rutas semanales" : `No hay rutas para ${weekdayLabel || "ese día"}`}
          ariaLabel="Ruta semanal"
          className="w-full"
          minWidthClass="w-full"
        />
      )}
      {!routeFirst && !dayAsRoute && weekdayLabel ? (
        <span className="text-[11px] font-bold text-slate-500">
          Solo aparecen rutas de {weekdayLabel}.
        </span>
      ) : null}
      {routeFirst && selectedTemplate ? (
        <span className="text-[11px] font-bold text-slate-500">
          Solo se pueden elegir fechas de {logisticsWeekdayKeys[selectedTemplate.weekday] || "ese día"}.
        </span>
      ) : null}
    </div>
  );

  const timeStepField = (
    <div className="grid gap-4">
      {showTimeField ? (
        <div className="grid gap-1">
          <span className="text-[10px] font-black uppercase text-slate-500">Hora</span>
          <TimePickerInput
            value={draft.time}
            onChange={(time) => setDraft((current) => ({ ...current, time }))}
            ariaLabel="Hora confirmada"
          />
        </div>
      ) : (
        <p className="text-sm font-bold text-amber-200">
          Falta elegir una ruta antes de confirmar.
        </p>
      )}

      {showDriverPicker ? (
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
      ) : null}
    </div>
  );

  let stepContent = null;
  if (step === "day") {
    stepContent = dayStepField;
  } else if (step === "date") {
    stepContent = dateStepField;
  } else if (step === "route") {
    stepContent = routeStepField;
  } else {
    stepContent = timeStepField;
  }

  const canContinueFromDate = Boolean(
    /^\d{4}-\d{2}-\d{2}$/.test(draft.date) &&
      (routeFirst ? selectedTemplate : availableWeekdays.includes(weekday)),
  );
  const canContinueFromRoute = Boolean(dayAsRoute || routeTemplateId);
  const showContinuePrimary =
    (!isFinalStep && step === "date" && canContinueFromDate) ||
    (!isFinalStep && step === "route" && dayAsRoute && canContinueFromRoute);
  const showConfirmPrimary = isFinalStep;
  const showPrimary = showContinuePrimary || showConfirmPrimary;

  const summaryChips: Array<{ label: string; value: string }> = [];
  if (!routeFirst && stepIndex > 0 && weekdayLabel) {
    summaryChips.push({ label: "Día", value: weekdayLabel });
  }
  if (
    (routeFirst ? step === "time" : stepIndex > 1) &&
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
    if (!scheduledTimestamp || !routeTemplateId) {
      return;
    }

    let resolvedTemplateId = routeTemplateId;
    if (isDayAsRouteTemplateId(resolvedTemplateId)) {
      setEnsuringDayRoute(true);
      const ensured = await ensureLogisticsDayRouteTemplateAction({
        weekday: getLogisticsWeekdayIndex(draft.date),
      });
      setEnsuringDayRoute(false);
      if (!ensured.ok) {
        notify.error(ensured.error);
        return;
      }
      resolvedTemplateId = ensured.data.id;
    }
    await onConfirm({
      scheduledAt: scheduledTimestamp,
      driverId: resolvedDriverId,
      routeTemplateId: resolvedTemplateId,
    });
  }

  return (
    <div className="app-modal-overlay fixed inset-0 z-[145] flex justify-center bg-black/70 p-3 sm:p-4">
      <div
        className="app-modal-content flex w-full max-w-md flex-col overflow-hidden rounded-xl border border-black bg-surface-panel shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-task-schedule-title"
      >
        <div className="flex items-start gap-3 border-b border-black px-4 py-4 sm:px-5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-emerald-600 bg-emerald-400 text-slate-950">
            <CalendarCheck2 className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-black uppercase text-slate-500">{taskTypeLabel}</p>
            <p id="confirm-task-schedule-title" className="text-2xl font-black text-[#f8fafc]">
              {title}
            </p>
            <p className="mt-0.5 break-words text-sm font-bold text-slate-400">
              {shipmentCode} · {customerName}
            </p>
          </div>
        </div>

        <div className="px-4 pt-3 sm:px-5">
          <nav aria-label={`Paso ${stepIndex + 1} de ${stepCount}`} className="w-full">
            <ol className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${stepCount}, minmax(0, 1fr))` }}>
              {wizardSteps.map((entry, index) => {
                const status =
                  index < stepIndex ? "done" : index === stepIndex ? "active" : "upcoming";
                const canJump = index < stepIndex;

                return (
                  <li key={entry}>
                    <button
                      type="button"
                      disabled={!canJump}
                      onClick={() => {
                        if (canJump) {
                          goToStep(entry);
                        }
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

        <div className="grid flex-1 gap-4 px-4 py-4 sm:px-5">
          {showPendingDay ? (
            <button
              type="button"
              disabled={saving || ensuringDayRoute}
              onClick={() => void onConfirmPendingDay?.()}
              className="flex min-h-12 w-full items-center gap-3 rounded-lg border border-black bg-surface-inset px-3 py-2.5 text-left transition hover:bg-surface-card-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300 disabled:opacity-40"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-black bg-surface-card text-slate-300">
                <CalendarOff className="h-4 w-4" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-black text-slate-100">
                  {pendingDayLabel}
                </span>
                <span className="mt-0.5 block text-[11px] font-bold text-slate-500">
                  Deja día, fecha, ruta y conductor pendientes.
                </span>
              </span>
            </button>
          ) : null}

          {stepContent}
        </div>

        <div className="grid gap-3 border-t border-black px-4 py-4 sm:px-5">
          {showPendingRoute ? (
            <button
              type="button"
              disabled={saving || ensuringDayRoute || !canLeavePendingRoute}
              onClick={() => void onConfirmPendingRoute?.({ routeDate: draft.date })}
              className={`${secondaryButtonClass} h-11 w-full text-sm font-black disabled:opacity-40`}
            >
              {pendingRouteLabel}
            </button>
          ) : null}

          {canGoBack ? (
            <button
              type="button"
              onClick={goBack}
              disabled={saving || ensuringDayRoute}
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
              disabled={saving || ensuringDayRoute}
              className={`${secondaryButtonClass} h-11 text-sm font-black disabled:opacity-40`}
            >
              Cancelar
            </button>

            {showContinuePrimary ? (
              <button
                type="button"
                disabled={saving || ensuringDayRoute}
                onClick={() => goNextFrom(step)}
                className={`${primaryButtonClass} h-11 text-sm font-black disabled:opacity-40`}
              >
                Siguiente
              </button>
            ) : null}

            {showConfirmPrimary ? (
              <button
                type="button"
                disabled={saving || ensuringDayRoute || !canConfirm}
                onClick={() => void confirmSchedule()}
                className={`${primaryButtonClass} h-11 text-sm font-black disabled:opacity-40`}
              >
                {saving || ensuringDayRoute ? "Confirmando..." : confirmLabel}
              </button>
            ) : null}
          </div>

          {allowPendingRoute && (step === "day" || step === "route") ? (
            <p className="text-center text-[11px] font-bold text-slate-500">
              {allowPendingDay
                ? "No sé el día deja todo pendiente. No sé la ruta conserva el día elegido."
                : "Ruta pendiente conserva el día; Logística define la ruta y la hora."}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
