import { PackageCheck, PackageOpen } from "lucide-react";
import type { LogisticsTaskStatus, LogisticsTaskType } from "@/lib/shipment-types";
import type { LogisticsRouteStatus } from "@/lib/logistics-routing";
import type { LogisticsTaskItem } from "@/components/logistica/types";
import { LOGISTICS_FIELD_BASE, taskActionVerb } from "@/components/logistica/lib/constants";

export function taskSortValue(task: LogisticsTaskItem) {
  const value = task.scheduledAt || task.requestedScheduleAt || task.createdAt;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

export function statusBadgeClass(status: LogisticsTaskStatus) {
  if (status === "completed") {
    return "border-emerald-600 bg-emerald-400 text-slate-950";
  }

  if (status === "cancelled") {
    return "border-rose-700 bg-rose-500 text-slate-950";
  }

  if (status === "loaded_to_truck") {
    return "border-sky-700 bg-sky-400 text-slate-950";
  }

  if (status === "scheduled") {
    return "border-amber-700 bg-amber-400 text-slate-950";
  }

  if (status === "assigned") {
    return "border-emerald-700 bg-emerald-900 text-emerald-200";
  }

  return "border-black bg-surface-inset text-slate-300";
}

export function routeStatusClass(status: LogisticsRouteStatus) {
  if (status === "planned") {
    return "border-emerald-700 bg-emerald-900 text-emerald-200";
  }

  if (status === "cancelled") {
    return "border-rose-700 bg-rose-950/60 text-rose-200";
  }

  if (status === "completed") {
    return "border-sky-700 bg-sky-950/60 text-sky-200";
  }

  return "border-black bg-surface-inset text-slate-300";
}

export function taskTypeIcon(taskType: LogisticsTaskType, className = "h-4 w-4") {
  return taskType === "deliver_empty_box" ? (
    <PackageOpen className={className} aria-hidden />
  ) : (
    <PackageCheck className={className} aria-hidden />
  );
}

export function invoiceActionLabel(taskType: LogisticsTaskType) {
  return taskActionVerb[taskType];
}

export function invoiceActionFieldClass() {
  return `${LOGISTICS_FIELD_BASE} text-slate-200`;
}

export function invoiceDriverFieldClass(assignedTo: string | null | undefined, hasTask: boolean) {
  if (!hasTask) {
    return `${LOGISTICS_FIELD_BASE} text-slate-400`;
  }

  return assignedTo
    ? `${LOGISTICS_FIELD_BASE} text-slate-200`
    : "logistics-unassigned-alert border-rose-500/90 bg-rose-950/50 text-rose-50";
}
