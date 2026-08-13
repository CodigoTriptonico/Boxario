"use client";

import { Check, MapPin, TriangleAlert, X } from "lucide-react";
import type { CustomerRouteAssignmentRequestRow } from "@/app/actions/customer-route-assignments/types";
import { normalizeGenericLogisticsRouteName } from "@/lib/logistics-day-route";

function formatRequestedDate(value: string) {
  const parsed = new Date(`${value}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("es-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(parsed);
}

function requestBoxCount(request: CustomerRouteAssignmentRequestRow) {
  return request.boxLines.reduce((total, line) => total + line.quantity, 0) || 1;
}

function cellClass(extra = "") {
  return `border-b border-black/70 px-3 py-2 align-middle ${extra}`;
}

export function LogisticsConfirmationsExcelTable({
  requests,
  canManage,
  busyKey,
  selectedIds,
  onToggleSelection,
  onApprove,
  onReject,
}: {
  requests: CustomerRouteAssignmentRequestRow[];
  canManage: boolean;
  busyKey: string;
  selectedIds: Set<string>;
  onToggleSelection: (requestId: string) => void;
  onApprove: (request: CustomerRouteAssignmentRequestRow) => void;
  onReject: (request: CustomerRouteAssignmentRequestRow) => void;
}) {
  return (
    <div className="overflow-x-auto bg-surface-panel">
      <table className="min-w-[1080px] w-full border-collapse text-left text-xs">
        <caption className="sr-only">Solicitudes por confirmar en vista Excel</caption>
        <thead className="sticky top-0 z-10 bg-surface-card-header text-[10px] font-black uppercase tracking-wide text-slate-400">
          <tr>
            {canManage ? <th scope="col" className="w-12 border-b border-black px-3 py-2">Sel.</th> : null}
            <th scope="col" className="border-b border-black px-3 py-2">Invoice / cliente</th>
            <th scope="col" className="border-b border-black px-3 py-2">Dirección</th>
            <th scope="col" className="border-b border-black px-3 py-2">Operación</th>
            <th scope="col" className="border-b border-black px-3 py-2">Fecha solicitada</th>
            <th scope="col" className="border-b border-black px-3 py-2">Ruta sugerida</th>
            <th scope="col" className="border-b border-black px-3 py-2">Cajas</th>
            {canManage ? <th scope="col" className="border-b border-black px-3 py-2">Acciones</th> : null}
          </tr>
        </thead>
        <tbody>
          {requests.map((request) => {
            const selected = selectedIds.has(request.id);
            const boxCount = requestBoxCount(request);
            const scheduledTime = request.scheduledAt?.match(/T(\d{2}:\d{2})/)?.[1] || "Sin horario";

            return (
              <tr
                key={request.id}
                tabIndex={canManage ? 0 : undefined}
                aria-selected={canManage ? selected : undefined}
                className={`text-slate-200 transition hover:bg-surface-inset focus-visible:bg-surface-inset focus-visible:outline-none ${selected ? "bg-emerald-400/10" : ""}`}
                onClick={() => {
                  if (canManage && !busyKey) onToggleSelection(request.id);
                }}
                onKeyDown={(event) => {
                  if (!canManage || busyKey || (event.key !== "Enter" && event.key !== " ")) return;
                  event.preventDefault();
                  onToggleSelection(request.id);
                }}
              >
                {canManage ? (
                  <td className={cellClass("text-center")}>
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => onToggleSelection(request.id)}
                      onClick={(event) => event.stopPropagation()}
                      disabled={Boolean(busyKey)}
                      aria-label={`Seleccionar ${request.shipmentCode}`}
                      className="h-5 w-5 accent-emerald-400"
                    />
                  </td>
                ) : null}
                <td className={cellClass("min-w-[14rem]")}>
                  <p className="font-black text-white">{request.shipmentCode}</p>
                  <p className="mt-1 font-bold text-slate-300">{request.customerName}</p>
                  {request.customerPhone ? (
                    <p className="mt-1 text-[10px] font-bold text-slate-500">{request.customerPhone}</p>
                  ) : null}
                </td>
                <td className={cellClass("min-w-[18rem] max-w-[24rem]")}>
                  <p className={`flex items-start gap-1.5 font-bold ${request.formattedAddress === "Sin dirección" ? "text-amber-200" : "text-slate-300"}`}>
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                    <span>{request.formattedAddress || "Dirección incompleta"}</span>
                  </p>
                  {request.addressReference ? (
                    <p className="mt-1 text-[10px] font-bold text-slate-500">Ref: {request.addressReference}</p>
                  ) : null}
                  {request.coverageStatus === "outside" ? (
                    <p className="mt-1.5 flex items-start gap-1 text-[10px] font-bold leading-4 text-amber-200">
                      <TriangleAlert className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
                      <span>Fuera de cobertura; verificar antes de confirmar.</span>
                    </p>
                  ) : null}
                </td>
                <td className={cellClass("min-w-[7rem]")}>
                  <span className="font-black text-slate-100">
                    {request.taskType === "pickup_full_box" ? "Recoger" : "Entregar"}
                  </span>
                  <span className="mt-1 block text-[10px] font-bold text-slate-500">Pendiente de confirmar</span>
                </td>
                <td className={cellClass("min-w-[14rem]")}>
                  <p className="font-black text-slate-200">{formatRequestedDate(request.routeDate)}</p>
                  <p className="mt-1 text-[10px] font-bold text-slate-500">{scheduledTime}</p>
                </td>
                <td className={cellClass("min-w-[12rem]")}>
                  <span className="font-black text-slate-200">
                    {normalizeGenericLogisticsRouteName(request.routeTemplateName, request.routeWeekday)}
                  </span>
                  {request.zoneKey ? <span className="mt-1 block text-[10px] font-bold text-slate-500">Zona {request.zoneKey}</span> : null}
                </td>
                <td className={cellClass("whitespace-nowrap font-black text-slate-200")}>
                  {boxCount} {boxCount === 1 ? "caja" : "cajas"}
                </td>
                {canManage ? (
                  <td className={cellClass("min-w-[7rem]")} onClick={(event) => event.stopPropagation()}>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-emerald-600/70 bg-emerald-400/15 text-emerald-200 disabled:opacity-40"
                        disabled={Boolean(busyKey)}
                        onClick={() => onApprove(request)}
                        aria-label={`Confirmar ${request.shipmentCode}`}
                        title="Confirmar"
                      >
                        <Check className="h-5 w-5" aria-hidden />
                      </button>
                      <button
                        type="button"
                        className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-rose-700/70 bg-rose-500/10 text-rose-200 disabled:opacity-40"
                        disabled={Boolean(busyKey)}
                        onClick={() => onReject(request)}
                        aria-label={`Rechazar ${request.shipmentCode}`}
                        title="Rechazar"
                      >
                        <X className="h-5 w-5" aria-hidden />
                      </button>
                    </div>
                  </td>
                ) : null}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
