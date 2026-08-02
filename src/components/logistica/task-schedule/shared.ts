import { logisticsWeekdayKeys } from "@/lib/logistics-route-catalog";
import { minScheduleDateInput } from "@/lib/schedule-date";
import { isoToPlanScheduleAt } from "@/lib/shipment-schedule-history";

export type RouteTemplate = {
  id: string;
  weekday: number;
  name: string;
  startTime?: string | null;
  estimatedEndTime?: string | null;
};

export type Driver = { id: string; label: string; roleSlug: string };
export type SelectionOrder = "date-first" | "route-first";
export type DateFirstStep = "day" | "route";
export type RouteFirstStep = "route" | "date" | "time";
export type WizardStep = DateFirstStep | RouteFirstStep;

/** Día, fecha y hora van juntos; la ruta solo se pregunta cuando existen subrutas. */
export const IMPLICIT_DAY_STEPS: DateFirstStep[] = ["day"];
export const DATE_FIRST_STEPS: DateFirstStep[] = ["day", "route"];
export const ROUTE_FIRST_STEPS: RouteFirstStep[] = ["route", "date", "time"];

export const STEP_LABELS: Record<WizardStep, string> = {
  day: "Día y hora",
  date: "Fecha",
  route: "Ruta",
  time: "Hora",
};

export function scheduleDraft(scheduledAt: string | null) {
  if (!scheduledAt) {
    return { date: minScheduleDateInput(), time: "10:00" };
  }

  const [date = minScheduleDateInput(), time = "10:00"] = isoToPlanScheduleAt(scheduledAt).split("T");
  return { date, time: time || "10:00" };
}

export function templateLabel(template: RouteTemplate) {
  const day = logisticsWeekdayKeys[template.weekday] || `Día ${template.weekday}`;
  return `${day} · ${template.name}`;
}

export function initialWizardStep(routeFirst: boolean): WizardStep {
  return routeFirst ? "route" : "day";
}

export function wizardStepTileClass(status: "done" | "active" | "upcoming") {
  if (status === "active") {
    return "border-2 border-emerald-600 bg-emerald-600/35 text-emerald-50 shadow-[0_8px_18px_rgba(16,185,129,0.2)] ring-1 ring-emerald-400/45";
  }

  if (status === "done") {
    return "border-emerald-800/80 bg-[#1c2822] text-[#f8fafc] hover:border-emerald-700 hover:bg-[#223028]";
  }

  return "cursor-default border-black/80 bg-surface-inset text-slate-600";
}

export function wizardStepBadgeClass(status: "done" | "active" | "upcoming") {
  if (status === "active" || status === "done") {
    return "border-emerald-300 bg-emerald-400 text-slate-950";
  }

  return "border-black bg-surface-card text-slate-500";
}
