"use client";

import Link from "next/link";
import {
  DollarSign,
  MapPin,
  PackageCheck,
  Phone,
  RefreshCw,
  RotateCcw,
  XCircle,
} from "lucide-react";
import { CompactInfoDisclosure as SharedCompactInfoDisclosure } from "@/components/compact-info-disclosure";
import { ShipmentBoxLinesTrigger } from "@/components/shipment-box-lines-trigger";
import {
  listCardShellClass,
  listRowBaseClass,
  listRowHoverClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/components/ui-blocks";
import { formatMoneyValue } from "@/lib/logistics-fees";
import { conductorOfflineStatusLabel } from "@/lib/conductor-offline/queue-core";
import type { ConductorOfflineOperation } from "@/lib/conductor-offline/types";
import {
  conductorTaskStatusClass,
  type ConductorDriverTask,
} from "@/lib/conductor-tasks";
import { buildMapsNavigationUrl } from "@/lib/logistics-navigation";
import { estimateRouteStopEtaMinutes, formatEtaMinutes } from "@/lib/logistics-eta";
import { buildLogisticaShipmentDeepLink } from "@/lib/logistics-view";
import { formatScheduleAtDisplay } from "@/lib/sale/schedule-time";
import type { ReactNode } from "react";

function streetViewReferenceUrl(task: ConductorDriverTask) {
  if (!task.exactEntrancePanoId) return null;
  const query = new URLSearchParams({
    api: "1",
    map_action: "pano",
    pano: task.exactEntrancePanoId,
  });
  if (task.exactEntranceHeading != null) query.set("heading", String(task.exactEntranceHeading));
  if (task.exactEntrancePitch != null) query.set("pitch", String(task.exactEntrancePitch));
  return `https://www.google.com/maps/@?${query.toString()}`;
}

export type ConductorTaskItemProps = {
  task: ConductorDriverTask;
  isCompletedView: boolean;
  successDisabled: boolean;
  outcomeLabel: string;
  syncOperation?: ConductorOfflineOperation;
  onOpenDialog: (task: ConductorDriverTask, result: "completed" | "failed") => void;
  onReactivate: (task: ConductorDriverTask) => void;
  onRetrySync: (operationId: string) => void;
};

function ConductorTaskSyncBadge({
  operation,
  onRetry,
}: {
  operation: ConductorOfflineOperation;
  onRetry: (operationId: string) => void;
}) {
  const needsAttention = operation.status === "needs_attention";
  const tone = needsAttention
    ? "border-rose-800/70 bg-rose-950/35 text-rose-200"
    : operation.status === "synced"
      ? "border-emerald-800/70 bg-emerald-950/35 text-emerald-200"
      : "border-amber-800/70 bg-amber-950/30 text-amber-200";

  if (needsAttention) {
    return (
      <button
        type="button"
        className={`inline-flex min-h-8 items-center gap-1.5 rounded-md border px-2 text-[11px] font-black ${tone}`}
        title={operation.lastError || undefined}
        onClick={() => onRetry(operation.id)}
      >
        <RefreshCw className="h-3.5 w-3.5" />
        {conductorOfflineStatusLabel(operation)}
      </button>
    );
  }

  return (
    <span className={`inline-flex min-h-8 items-center rounded-md border px-2 text-[11px] font-black ${tone}`}>
      {conductorOfflineStatusLabel(operation)}
    </span>
  );
}

export function CompactInfoDisclosure({
  ariaLabel,
  children,
  align = "left",
  tone = "slate",
}: {
  ariaLabel: string;
  children: ReactNode;
  align?: "left" | "right";
  tone?: "sky" | "slate";
}) {
  return (
    <SharedCompactInfoDisclosure ariaLabel={ariaLabel} align={align} tone={tone} compact>
      {children}
    </SharedCompactInfoDisclosure>
  );
}

function ConductorTaskRecipientPeek({
  task,
  className = "",
}: {
  task: Pick<
    ConductorDriverTask,
    "recipientName" | "recipientCountry" | "recipientPhone" | "recipientCity"
  >;
  className?: string;
}) {
  const hasRecipient =
    task.recipientName || task.recipientCountry || task.recipientPhone || task.recipientCity;

  if (!hasRecipient) {
    return null;
  }

  return (
    <div className={className}>
      <CompactInfoDisclosure ariaLabel="Ver destinatario" align="right">
        <p className="mb-1 text-xs font-black uppercase tracking-wide text-slate-500">Destinatario</p>
        {task.recipientName ? <p className="font-black text-slate-100">{task.recipientName}</p> : null}
        {task.recipientCity || task.recipientCountry ? (
          <p className="text-slate-400">
            {[task.recipientCity, task.recipientCountry].filter(Boolean).join(", ")}
          </p>
        ) : null}
        {task.recipientPhone ? (
          <a href={`tel:${task.recipientPhone}`} className="text-sky-300 hover:text-sky-200">
            {task.recipientPhone}
          </a>
        ) : null}
      </CompactInfoDisclosure>
    </div>
  );
}

function ConductorTaskSenderSummary({
  task,
  layout,
}: {
  task: Pick<ConductorDriverTask, "senderName" | "senderPhone">;
  layout: "card" | "row";
}) {
  if (layout === "card") {
    return (
      <div className="min-w-0">
        <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">Remitente</p>
        <p className="break-words text-sm font-black text-slate-100 sm:truncate">{task.senderName}</p>
        {task.senderPhone ? (
          <p className="mt-0.5 inline-flex max-w-full flex-wrap items-center justify-center gap-1 text-[11px] font-black text-slate-400 sm:flex-nowrap sm:truncate">
            <Phone className="h-3 w-3 shrink-0" />
            <span className="break-words sm:truncate">{task.senderPhone}</span>
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
      <span className="text-[11px] font-black uppercase text-slate-500">Remitente</span>
      <span className="break-words text-sm font-bold text-slate-100 sm:truncate">{task.senderName}</span>
      {task.senderPhone ? (
        <span className="inline-flex max-w-full flex-wrap items-center gap-1 text-[11px] font-bold text-slate-400 sm:flex-nowrap sm:truncate">
          <Phone className="h-3 w-3 shrink-0" />
          <span className="break-words sm:truncate">{task.senderPhone}</span>
        </span>
      ) : null}
    </div>
  );
}

function ConductorTaskBoxSummary({
  task,
  compact = false,
  className = "",
}: {
  task: ConductorDriverTask;
  compact?: boolean;
  className?: string;
}) {
  if (!task.boxDisplayLines.length) {
    return null;
  }

  return (
    <ShipmentBoxLinesTrigger
      lines={task.boxDisplayLines}
      variant={compact ? "inline" : "card"}
      className={className}
    />
  );
}

export function ConductorTaskCard({
  task,
  isCompletedView,
  successDisabled,
  outcomeLabel,
  syncOperation,
  onOpenDialog,
  onReactivate,
  onRetrySync,
}: ConductorTaskItemProps) {
  return (
    <article className={`${listCardShellClass} flex flex-col overflow-hidden p-0`}>
      <div className="relative border-b border-black bg-surface-card-header px-3 py-2.5">
        <div className="absolute right-2 top-2">
          <ConductorTaskRecipientPeek task={task} className="relative" />
        </div>
        <p className="break-all text-center text-base font-black text-[#f8fafc] sm:truncate">{task.shipmentCode}</p>
        <div className="mt-1 text-center">
          <ConductorTaskSenderSummary task={task} layout="card" />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-3">
        {task.addressLine ? (
          <div className="grid gap-2">
            <p className="line-clamp-2 rounded-md border border-black bg-surface-inset px-2.5 py-1.5 text-sm font-bold leading-snug text-slate-300">
              <MapPin className="mr-1 inline h-3.5 w-3.5 shrink-0 text-slate-500" />
              {task.addressLine}
              {task.zoneLabel ? <span className="text-slate-500"> · {task.zoneLabel}</span> : null}
            </p>
            {buildMapsNavigationUrl({
              lat: task.lat,
              lng: task.lng,
              label: task.addressLine,
            }) ? (
              <div className="flex flex-wrap gap-2">
                <a
                  href={
                    buildMapsNavigationUrl({
                      lat: task.lat,
                      lng: task.lng,
                      label: task.addressLine,
                    })!.google
                  }
                  target="_blank"
                  rel="noreferrer"
                  className={`${secondaryButtonClass} h-9 px-3 text-xs`}
                >
                  Google Maps
                </a>
                <a
                  href={
                    buildMapsNavigationUrl({
                      lat: task.lat,
                      lng: task.lng,
                      label: task.addressLine,
                    })!.apple
                  }
                  className={`${secondaryButtonClass} h-9 px-3 text-xs`}
                >
                  Apple Maps
                </a>
              </div>
            ) : null}
            {task.exactEntranceConfirmed ? (
              <div className="rounded-md border border-emerald-400/35 bg-emerald-950/25 px-2.5 py-2 text-xs font-bold text-emerald-100">
                <p className="font-black">Entrada exacta confirmada</p>
                {task.exactEntranceNote ? <p className="mt-1 text-slate-200">{task.exactEntranceNote}</p> : null}
                {streetViewReferenceUrl(task) ? (
                  <a href={streetViewReferenceUrl(task)!} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-sky-200 underline underline-offset-2">Ver referencia a nivel de calle</a>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        {task.scheduledAt ? (
          <p className="text-sm font-bold text-slate-300">{formatScheduleAtDisplay(task.scheduledAt)}</p>
        ) : null}

        {task.routeName ? (
          <p className="text-sm font-bold text-slate-400">
            Ruta {task.routeName}
            {task.stopOrder ? ` - parada ${task.stopOrder}` : ""}
            {task.stopOrder && formatEtaMinutes(estimateRouteStopEtaMinutes(task.stopOrder))
              ? ` · ETA ~${formatEtaMinutes(estimateRouteStopEtaMinutes(task.stopOrder))}`
              : ""}
            {task.routeDate ? ` - ${task.routeDate}` : ""}
            {task.vehicleLabel ? ` · ${task.vehicleLabel}` : ""}
          </p>
        ) : null}

        {task.balanceDue > 0 ? (
          <p className="flex items-center gap-2 rounded-lg border border-amber-900/70 bg-amber-950/25 px-3 py-2 text-sm font-black text-amber-100">
            <DollarSign className="h-4 w-4" />
            Pendiente {formatMoneyValue(task.balanceDue)}
          </p>
        ) : null}

        {task.senderPhone ? (
          <a className={`${secondaryButtonClass} h-10 text-xs`} href={`tel:${task.senderPhone}`}>
            <Phone className="h-4 w-4" />
            Llamar
          </a>
        ) : null}

        {isCompletedView ? (
          <>
            {syncOperation ? (
              <ConductorTaskSyncBadge operation={syncOperation} onRetry={onRetrySync} />
            ) : null}
            <p
              className={`rounded-md border px-3 py-2 text-center text-sm font-black ${conductorTaskStatusClass(task.status)}`}
            >
              {outcomeLabel}
            </p>
            <Link
              href={buildLogisticaShipmentDeepLink(task.shipmentCode)}
              className={`${secondaryButtonClass} h-9 text-xs`}
            >
              Ver en logistica
            </Link>
            {task.status === "cancelled" && !syncOperation ? (
              <button
                type="button"
                className={`${secondaryButtonClass} h-11 text-sm`}
                onClick={() => onReactivate(task)}
              >
                <RotateCcw className="h-4 w-4" />
                Volver al listado
              </button>
            ) : null}
          </>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              className={`${primaryButtonClass} h-11 text-sm disabled:cursor-not-allowed disabled:opacity-40`}
              disabled={successDisabled}
              onClick={() => onOpenDialog(task, "completed")}
            >
              <PackageCheck className="h-4 w-4" />
              Listo
            </button>
            <button
              type="button"
              className={`${secondaryButtonClass} h-11 text-sm disabled:cursor-not-allowed disabled:opacity-40`}
              onClick={() => onOpenDialog(task, "failed")}
            >
              <XCircle className="h-4 w-4" />
              No se pudo
            </button>
          </div>
        )}

        {task.boxSummary ? (
          <ConductorTaskBoxSummary task={task} className="mt-auto" />
        ) : null}
      </div>
    </article>
  );
}

export function ConductorTaskRow({
  task,
  isCompletedView,
  successDisabled,
  outcomeLabel,
  syncOperation,
  onOpenDialog,
  onReactivate,
  onRetrySync,
}: ConductorTaskItemProps) {
  const mapsUrl = task.addressLine
    ? buildMapsNavigationUrl({ lat: task.lat, lng: task.lng, label: task.addressLine })
    : null;

  return (
    <article className={`${listRowBaseClass} grid gap-2 px-3 py-2.5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-3 sm:px-4 ${listRowHoverClass}`}>
      <div className="min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-sm font-black text-[#f8fafc]">{task.shipmentCode}</span>
              {task.balanceDue > 0 ? (
                <span className="text-[11px] font-black text-amber-200">
                  {formatMoneyValue(task.balanceDue)}
                </span>
              ) : null}
            </div>
            <div className="mt-0.5">
              <ConductorTaskSenderSummary task={task} layout="row" />
            </div>
          </div>
          <ConductorTaskRecipientPeek task={task} className="relative shrink-0" />
        </div>
        {task.addressLine ? (
          <p className="mt-1 line-clamp-1 text-sm font-bold text-slate-300">
            <MapPin className="mr-1 inline h-3 w-3 shrink-0 text-slate-500" />
            {task.addressLine}
            {task.zoneLabel ? <span className="text-slate-500"> · {task.zoneLabel}</span> : null}
          </p>
        ) : null}
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-bold text-slate-500">
          {task.scheduledAt ? <span>{formatScheduleAtDisplay(task.scheduledAt)}</span> : null}
          {task.routeName ? (
            <span>
              Ruta {task.routeName}
              {task.stopOrder ? ` · parada ${task.stopOrder}` : ""}
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 sm:justify-end">
        {task.exactEntranceConfirmed ? (
          <span className="rounded-md border border-emerald-400/35 bg-emerald-950/25 px-2 py-1 text-[10px] font-black text-emerald-200" title={task.exactEntranceNote || "Entrada exacta confirmada"}>Entrada exacta</span>
        ) : null}
        {streetViewReferenceUrl(task) ? (
          <a href={streetViewReferenceUrl(task)!} target="_blank" rel="noreferrer" className={`${secondaryButtonClass} h-9 px-3 text-xs`}>Vista calle</a>
        ) : null}
        {mapsUrl ? (
          <a
            href={mapsUrl.google}
            target="_blank"
            rel="noreferrer"
            className={`${secondaryButtonClass} h-9 px-3 text-xs`}
          >
            Maps
          </a>
        ) : null}
        {task.senderPhone ? (
          <a className={`${secondaryButtonClass} h-9 px-3 text-xs`} href={`tel:${task.senderPhone}`}>
            <Phone className="h-4 w-4" />
            Llamar
          </a>
        ) : null}
        {isCompletedView ? (
          <>
            {syncOperation ? (
              <ConductorTaskSyncBadge operation={syncOperation} onRetry={onRetrySync} />
            ) : null}
            <span
              className={`rounded-md border px-2 py-1 text-[11px] font-black ${conductorTaskStatusClass(task.status)}`}
            >
              {outcomeLabel}
            </span>
            <Link
              href={buildLogisticaShipmentDeepLink(task.shipmentCode)}
              className={`${secondaryButtonClass} h-9 px-3 text-xs`}
            >
              Logística
            </Link>
            {task.status === "cancelled" && !syncOperation ? (
              <button
                type="button"
                className={`${secondaryButtonClass} h-9 px-3 text-xs`}
                onClick={() => onReactivate(task)}
              >
                <RotateCcw className="h-4 w-4" />
                Reintentar
              </button>
            ) : null}
          </>
        ) : (
          <>
            <button
              type="button"
              className={`${primaryButtonClass} h-9 px-3 text-xs disabled:cursor-not-allowed disabled:opacity-40`}
              disabled={successDisabled}
              onClick={() => onOpenDialog(task, "completed")}
            >
              <PackageCheck className="h-4 w-4" />
              Listo
            </button>
            <button
              type="button"
              className={`${secondaryButtonClass} h-9 px-3 text-xs disabled:cursor-not-allowed disabled:opacity-40`}
              onClick={() => onOpenDialog(task, "failed")}
            >
              <XCircle className="h-4 w-4" />
              No se pudo
            </button>
          </>
        )}
      </div>

      {task.boxSummary ? (
        <div className="sm:col-span-2">
          <ConductorTaskBoxSummary task={task} compact />
        </div>
      ) : null}
    </article>
  );
}
