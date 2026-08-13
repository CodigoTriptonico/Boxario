"use client";

import { CalendarDays, Route } from "lucide-react";
import type { LogisticsVehicleRow } from "@/lib/logistics-fleet";
import type { LogisticsRouteRow } from "@/lib/logistics-routing";
import { getLogisticsWeekdayIndex } from "@/lib/logistics-route-week";
import { normalizeGenericLogisticsRouteName } from "@/lib/logistics-day-route";
import type { RouteMemberRow } from "@/lib/shipment-types";
import type { ViewLayout } from "@/lib/view-layout";
import {
  countLabel,
  formatRouteDate,
  routeBoxCountForTask,
  routeStatusChip,
} from "@/components/logistica/logistics-routes-workspace-details";

export function LogisticsHistoryRouteList({
  routes,
  routeMembers,
  vehicles,
  selectedRouteId,
  viewLayout,
  onOpenRoute,
}: {
  routes: LogisticsRouteRow[];
  routeMembers: RouteMemberRow[];
  vehicles: LogisticsVehicleRow[];
  selectedRouteId: string;
  viewLayout: ViewLayout;
  onOpenRoute: (route: LogisticsRouteRow) => void;
}) {
  const memberById = new Map(routeMembers.map((member) => [member.id, member.label]));
  const vehicleById = new Map(vehicles.map((vehicle) => [vehicle.id, vehicle]));

  function summary(route: LogisticsRouteRow) {
    const vehicle = route.vehicleId ? vehicleById.get(route.vehicleId) : null;
    return {
      name: normalizeGenericLogisticsRouteName(route.name, getLogisticsWeekdayIndex(route.routeDate)),
      driver: route.assignedTo ? memberById.get(route.assignedTo) || "Conductor" : "Sin conductor",
      vehicle: vehicle ? vehicle.plate || vehicle.name : "Sin vehículo",
      deliveryBoxes: routeBoxCountForTask(route, "deliver_empty_box"),
      pickupBoxes: routeBoxCountForTask(route, "pickup_full_box"),
    };
  }

  if (viewLayout === "excel") {
    return (
      <div className="overflow-x-auto rounded-xl border border-black bg-surface-panel">
        <table className="w-full min-w-[920px] border-collapse text-left text-xs">
          <caption className="sr-only">Historial de rutas en vista tabla</caption>
          <thead className="sticky top-0 z-10 bg-surface-card-header text-[10px] font-black uppercase tracking-wide text-slate-400"><tr><th className="border-b border-black px-3 py-2">Ruta</th><th className="border-b border-black px-3 py-2">Fecha</th><th className="border-b border-black px-3 py-2">Estado</th><th className="border-b border-black px-3 py-2">Paradas</th><th className="border-b border-black px-3 py-2">Cajas</th><th className="border-b border-black px-3 py-2">Conductor</th><th className="border-b border-black px-3 py-2">Vehículo</th></tr></thead>
          <tbody>{routes.map((route) => { const data = summary(route); return <tr key={route.id} tabIndex={0} onClick={() => onOpenRoute(route)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onOpenRoute(route); } }} className={`cursor-pointer text-slate-200 hover:bg-surface-inset focus-visible:bg-surface-inset focus-visible:outline-none ${route.id === selectedRouteId ? "bg-emerald-400/[0.07]" : ""}`}><td className="border-b border-black/70 px-3 py-2 font-black text-white">{data.name}</td><td className="border-b border-black/70 px-3 py-2 font-bold">{formatRouteDate(route.routeDate)}</td><td className="border-b border-black/70 px-3 py-2">{routeStatusChip(route.status)}</td><td className="border-b border-black/70 px-3 py-2 font-black">{route.stops.length}</td><td className="border-b border-black/70 px-3 py-2 font-bold">{countLabel(data.deliveryBoxes, "caja para entregar", "cajas para entregar")}{data.pickupBoxes ? ` · ${countLabel(data.pickupBoxes, "caja para recoger", "cajas para recoger")}` : ""}</td><td className="border-b border-black/70 px-3 py-2 font-bold">{data.driver}</td><td className="border-b border-black/70 px-3 py-2 font-bold">{data.vehicle}</td></tr>; })}</tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
      {routes.map((route) => {
        const data = summary(route);
        return <button type="button" key={route.id} className={`flex min-h-40 w-full items-start gap-3 rounded-xl border border-black bg-surface-card p-4 text-left shadow-sm transition hover:bg-surface-inset focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400 ${route.id === selectedRouteId ? "bg-emerald-400/[0.07]" : ""}`} onClick={() => onOpenRoute(route)}><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-black bg-surface-inset text-emerald-300"><Route className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-2"><span className="text-sm font-black text-white">{data.name}</span>{routeStatusChip(route.status)}</span><span className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs font-bold text-slate-400"><span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{formatRouteDate(route.routeDate)}</span><span>{route.stops.length} paradas</span><span>{countLabel(data.deliveryBoxes, "caja para entregar", "cajas para entregar")}</span>{data.pickupBoxes ? <span>{countLabel(data.pickupBoxes, "caja para recoger", "cajas para recoger")}</span> : null}<span>{data.driver}</span><span>{data.vehicle}</span></span></span></button>;
      })}
    </div>
  );
}
