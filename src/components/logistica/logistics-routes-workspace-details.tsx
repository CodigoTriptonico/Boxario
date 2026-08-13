"use client";

import { useMemo, type ReactNode } from "react";
import { ArrowDown, ArrowUp, Boxes, ClipboardList, ExternalLink, Loader2, Map, MapPin, Trash2, Truck, X } from "lucide-react";
import type { CustomerRouteAssignmentRequestRow } from "@/lib/customer-route-assignment-types";
import { InlineSearchPicker } from "@/components/inline-search-picker";
import { LogisticsStopsMap } from "@/components/logistica/logistics-stops-map";
import { primaryButtonClass, secondaryButtonClass } from "@/components/ui-blocks";
import type { LogisticsVehicleRow } from "@/lib/logistics-fleet";
import { buildGoogleMapsRouteUrl } from "@/lib/logistics-navigation";
import type { LogisticsRouteRow, LogisticsRouteStatus, LogisticsRouteStopRow } from "@/lib/logistics-routing";
import { routeAllowsPreDepartureStopReorder } from "@/lib/logistics-state-machine";
import type { RouteMemberRow } from "@/lib/shipment-types";

export type RoutesWorkspaceTab = "confirmations" | "templates" | "drafts" | "operational" | "history" | "configuration";
export type RouteConfirmation = { kind: "close"; route: LogisticsRouteRow } | { kind: "cancel"; route: LogisticsRouteRow };
export type RouteDisposition = "deferred" | "rejected";
export type ReasonDialogState =
  | { kind: "request"; request: CustomerRouteAssignmentRequestRow; disposition: RouteDisposition }
  | { kind: "route-stop"; route: LogisticsRouteRow; stop: LogisticsRouteStopRow; disposition: RouteDisposition };

const statusLabel: Record<LogisticsRouteStatus, string> = {
  draft: "En preparación", planned: "Cerrada", in_progress: "En curso", completed: "Terminada", cancelled: "Cancelada",
};

export function routeBoxCount(route: LogisticsRouteRow) {
  return route.stops.reduce((total, stop) => total + Math.max(stop.boxCount || 0, 0), 0);
}

export function bookingBoxCountForTask(bookings: CustomerRouteAssignmentRequestRow[], taskType: string) {
  return bookings.filter((booking) => booking.taskType === taskType).reduce(
    (total, booking) => total + booking.boxLines.reduce((lineTotal, line) => lineTotal + line.quantity, 0), 0,
  );
}

export function routeBoxCountForTask(route: LogisticsRouteRow, taskType: string) {
  return route.stops.reduce((total, stop) => total + (stop.taskType === taskType ? Math.max(stop.boxCount || 0, 0) : 0), 0);
}

export function countLabel(count: number, singular: string, plural: string) {
  if (singular.includes("entregar")) return `${count} cajas para entregar`;
  if (singular.includes("recoger")) return `${count} cajas para recoger`;
  return `${count} ${count === 1 ? singular : plural}`;
}

export function routeTaskLabel(taskType?: string) {
  return taskType === "pickup_full_box" ? "Recoger caja" : taskType === "deliver_empty_box" ? "Entregar caja" : taskType || "Tarea logística";
}

export function formatRouteDate(value: string) {
  const parsed = new Date(`${value}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("es-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }).format(parsed);
}

export function routeStatusChip(status: LogisticsRouteStatus) {
  const tone = status === "planned" ? "bg-sky-400/10 text-sky-100" : status === "in_progress" ? "bg-emerald-400/10 text-emerald-100" : status === "cancelled" ? "bg-rose-500/10 text-rose-200" : "bg-amber-400/10 text-amber-100";
  return <span className={`inline-flex rounded-md border border-black px-2 py-1 text-[11px] font-black ${tone}`}>{statusLabel[status]}</span>;
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="flex min-h-40 flex-col items-center justify-center px-4 text-center text-slate-400"><ClipboardList className="h-7 w-7 text-slate-600" /><p className="mt-2 text-sm font-black">{children}</p></div>;
}

export function RouteReasonDialog({ title, description, value, onChange, onCancel, onConfirm, disposition, confirming }: {
  title: string; description: string; value: string; onChange: (value: string) => void; onCancel: () => void; onConfirm: () => void; onDispositionChange?: (disposition: RouteDisposition) => void; disposition: RouteDisposition; confirming: boolean;
}) {
  return <div className="fixed inset-0 z-[180] flex items-center justify-center bg-black/75 p-4"><button type="button" className="absolute inset-0" aria-label="Cerrar diálogo" onClick={onCancel} disabled={confirming} /><section className="relative w-full max-w-lg rounded-xl border border-black bg-surface-panel p-5 shadow-2xl" role="dialog" aria-modal="true"><p className="text-[10px] font-black uppercase tracking-wide text-amber-200">Decisión de Logística</p><h2 className="mt-1 text-xl font-black text-slate-100">{title}</h2><p className="mt-2 text-sm font-bold text-slate-400">{description}</p><label className="mt-4 grid gap-1.5"><span className="text-[10px] font-black uppercase tracking-wide text-slate-500">Motivo obligatorio</span><textarea value={value} onChange={(event) => onChange(event.target.value)} disabled={confirming} autoFocus placeholder="Escribe qué se debe corregir" className="min-h-28 rounded-lg border border-black bg-surface-inset px-3 py-2.5 text-sm font-bold text-slate-100 outline-none focus:border-emerald-400" /></label><div className="mt-4 flex justify-end gap-2"><button type="button" className={`${secondaryButtonClass} h-10`} onClick={onCancel} disabled={confirming}>Cancelar</button><button type="button" className={`${primaryButtonClass} h-10`} onClick={onConfirm} disabled={confirming || value.trim().length < 3}>{confirming ? <Loader2 className="h-4 w-4 animate-spin" /> : null}{disposition === "rejected" ? "Rechazar y registrar" : "Guardar motivo"}</button></div></section></div>;
}

export function OperationalRouteDetail({ route, members, vehicles, busyKey, onDismiss, onDriverChange, onVehicleChange, onRequestClose, onRequestCancel, onRequestRemove, onMoveStop }: {
  route: LogisticsRouteRow; members: RouteMemberRow[]; vehicles: LogisticsVehicleRow[]; busyKey: string; onDismiss: () => void; onDriverChange: (driverId: string | null) => void; onVehicleChange: (vehicleId: string | null) => void; onRequestClose: () => void; onRequestCancel: () => void; onRequestRemove: (stop: LogisticsRouteStopRow) => void; onMoveStop: (stop: LogisticsRouteStopRow, direction: -1 | 1) => void;
}) {
  const editable = route.status === "draft";
  const reorderable = routeAllowsPreDepartureStopReorder(route.status);
  const assignable = route.status === "planned";
  const drivers = [{ value: "", label: "Sin conductor", searchText: "sin conductor" }, ...members.map((member) => ({ value: member.id, label: member.label, searchText: member.label }))];
  const fleet = [{ value: "", label: "Sin vehículo", searchText: "sin vehículo" }, ...vehicles.filter((vehicle) => vehicle.isActive).map((vehicle) => ({ value: vehicle.id, label: vehicle.plate ? `${vehicle.name} · ${vehicle.plate}` : vehicle.name, searchText: `${vehicle.name} ${vehicle.plate || ""}` }))];
  const mapStops = useMemo(() => route.stops.map((stop, index) => ({
      id: stop.id,
      lat: stop.lat,
      lng: stop.lng,
      label: stop.shipmentCode || stop.customerName || stop.address.name || "Parada",
      kind: stop.taskType === "pickup_full_box" ? "pickup" as const : "delivery" as const,
      sequence: index + 1,
    })), [route.stops]);
  const googleMapsRoute = buildGoogleMapsRouteUrl(mapStops);

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#1a221f]">
      <header className="shrink-0 border-b border-black px-4 py-4">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-black text-white">{route.name}</h2>
              {routeStatusChip(route.status)}
            </div>
            <p className="mt-1 text-sm font-bold text-slate-400">
              {formatRouteDate(route.routeDate)} · {route.stops.length} paradas · {routeBoxCount(route)} cajas
            </p>
          </div>
          <button type="button" className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-black bg-surface-inset text-slate-300 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400" onClick={onDismiss} aria-label="Cerrar detalle de ruta" title="Cerrar detalle">
            <X className="h-4 w-4" />
          </button>
        </div>
        {editable ? (
          <div className="mt-4 flex gap-2">
            <button type="button" className={primaryButtonClass + " h-10 px-3 text-xs"} disabled={busyKey === "close:" + route.id || !route.stops.length} onClick={onRequestClose}>
              {busyKey === "close:" + route.id ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Cerrar ruta
            </button>
            <button type="button" className={secondaryButtonClass + " h-10 px-3 text-xs text-rose-200"} disabled={busyKey === "cancel:" + route.id} onClick={onRequestCancel}>
              <Trash2 className="h-4 w-4" />
              Cancelar ruta
            </button>
          </div>
        ) : null}
        {assignable ? (
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <InlineSearchPicker value={route.assignedTo || ""} onChange={(value) => onDriverChange(value || null)} options={drivers} placeholder="Asignar conductor" searchPlaceholder="Buscar conductor" emptyLabel="Sin conductores" ariaLabel="Conductor" className="w-full" minWidthClass="w-full" disabled={busyKey === "driver:" + route.id} leadingIcon={<Truck className="h-4 w-4 text-emerald-300" />} />
            <InlineSearchPicker value={route.vehicleId || ""} onChange={(value) => onVehicleChange(value || null)} options={fleet} placeholder="Asignar vehículo" searchPlaceholder="Buscar vehículo" emptyLabel="Sin vehículos" ariaLabel="Vehículo" className="w-full" minWidthClass="w-full" disabled={busyKey === "vehicle:" + route.id} leadingIcon={<Boxes className="h-4 w-4 text-emerald-300" />} />
          </div>
        ) : null}
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="flex items-center justify-between gap-3 border-b border-black px-4 py-2.5">
          <p className="text-xs font-black uppercase tracking-wide text-slate-400">Paradas</p>
          {googleMapsRoute ? (
            <a
              href={googleMapsRoute.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-black bg-surface-inset px-2.5 text-[11px] font-black text-emerald-200 transition-colors hover:bg-surface-card"
              title={googleMapsRoute.truncated ? "Google Maps abrirá las primeras " + googleMapsRoute.includedStops + " paradas con coordenadas." : "Abrir este recorrido en Google Maps"}
            >
              <Map className="h-3.5 w-3.5" />
              Google Maps
              <ExternalLink className="h-3 w-3" />
            </a>
          ) : null}
        </div>
        {route.stops.length ? (
          <>
            <div className="border-b border-black p-3">
              <LogisticsStopsMap stops={mapStops} />
            </div>
            <ol className="divide-y divide-black" aria-busy={busyKey.startsWith("reorder:")}>
              {route.stops.map((stop, index) => (
                <li key={stop.id} className="flex gap-3 px-4 py-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-emerald-400 text-sm font-black text-slate-950">{index + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-black text-white">
                      {stop.shipmentCode || stop.address.name || "Parada"}{" "}
                      <span className="font-bold text-slate-400">{stop.customerName || stop.address.name}</span>
                    </p>
                    <p className="mt-1 flex gap-1.5 text-xs font-bold text-slate-400">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      {stop.address.formattedAddress || "Dirección incompleta"}
                    </p>
                    <p className="mt-1 text-xs font-bold text-slate-300">
                      {routeTaskLabel(stop.taskType)} · {stop.boxSummary || (stop.boxCount || 0) + " cajas"}
                    </p>
                  </div>
                  {reorderable ? (
                    <div className="flex shrink-0 gap-1">
                      <button type="button" className="h-9 w-9 rounded-md border border-black bg-surface-inset text-slate-300 hover:bg-surface-card disabled:cursor-not-allowed disabled:opacity-30" disabled={index === 0 || busyKey.startsWith("reorder:")} onClick={() => onMoveStop(stop, -1)} aria-label={`Subir parada ${index + 1}`}>
                        <ArrowUp className="mx-auto h-4 w-4" />
                      </button>
                      <button type="button" className="h-9 w-9 rounded-md border border-black bg-surface-inset text-slate-300 hover:bg-surface-card disabled:cursor-not-allowed disabled:opacity-30" disabled={index === route.stops.length - 1 || busyKey.startsWith("reorder:")} onClick={() => onMoveStop(stop, 1)} aria-label={`Bajar parada ${index + 1}`}>
                        <ArrowDown className="mx-auto h-4 w-4" />
                      </button>
                      {editable ? (
                        <button type="button" className="h-9 w-9 rounded-md border border-black bg-surface-inset text-rose-200 hover:bg-surface-card" onClick={() => onRequestRemove(stop)} aria-label={`Quitar parada ${index + 1}`}>
                          <Trash2 className="mx-auto h-4 w-4" />
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </li>
              ))}
            </ol>
          </>
        ) : (
          <EmptyState>Esta ruta todavía no tiene cajas.</EmptyState>
        )}
      </div>
    </div>
  );
}
