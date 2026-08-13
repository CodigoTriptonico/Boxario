"use client";

import { Check, ChevronDown, ChevronRight, Loader2, MapPin, RefreshCw } from "lucide-react";
import { useState } from "react";
import type { CustomerRouteAssignmentRequestRow } from "@/lib/customer-route-assignment-types";
import { primaryButtonClass } from "@/components/ui-blocks";
import type { LogisticsRouteRow } from "@/lib/logistics-routing";
import { routeMatchesBookingIdentity } from "@/lib/logistics-route-booking-groups";
import { normalizeGenericLogisticsRouteName } from "@/lib/logistics-day-route";
import type { ViewLayout } from "@/lib/view-layout";
import {
  bookingBoxCountForTask,
  countLabel,
  formatRouteDate,
  routeTaskLabel,
} from "@/components/logistica/logistics-routes-workspace-details";

type BookingGroup = {
  key: string;
  items: CustomerRouteAssignmentRequestRow[];
  first: CustomerRouteAssignmentRequestRow;
};

function scheduledTime(value: string | null) {
  return value?.match(/T(\d{2}:\d{2})/)?.[1] || "Sin horario";
}

function itemBoxCount(item: CustomerRouteAssignmentRequestRow) {
  return item.boxLines.reduce((total, line) => total + line.quantity, 0) || 1;
}

export function LogisticsTemplateBookingGroups({
  groups,
  routes,
  busyKey,
  canManage,
  viewLayout,
  onCreateRoute,
  onUpdateRoute,
}: {
  groups: BookingGroup[];
  routes: LogisticsRouteRow[];
  busyKey: string;
  canManage: boolean;
  viewLayout: ViewLayout;
  onCreateRoute: (key: string, items: CustomerRouteAssignmentRequestRow[]) => void | Promise<void>;
  onUpdateRoute: (key: string, route: LogisticsRouteRow, items: CustomerRouteAssignmentRequestRow[]) => void | Promise<void>;
}) {
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(() => new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());

  if (!groups.length) return null;

  function toggle(key: string) {
    setExpandedKeys((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleItem(itemId: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  }

  function toggleGroup(items: CustomerRouteAssignmentRequestRow[]) {
    setSelectedIds((current) => {
      const next = new Set(current);
      const allSelected = items.every((item) => next.has(item.id));
      for (const item of items) {
        if (allSelected) next.delete(item.id);
        else next.add(item.id);
      }
      return next;
    });
  }

  function groupData(group: BookingGroup) {
    const draftRoute = routes.find(
      (route) => route.status === "draft" && routeMatchesBookingIdentity(route, group.first),
    );
    const publishedRoute = routes.find(
      (route) => route.status === "planned" && routeMatchesBookingIdentity(route, group.first),
    );
    const selectedItems = group.items.filter((item) => selectedIds.has(item.id));
    return {
      draftRoute,
      publishedRoute,
      selectedItems,
      allSelected: selectedItems.length === group.items.length,
      someSelected: selectedItems.length > 0 && selectedItems.length < group.items.length,
      expanded: expandedKeys.has(group.key),
      busy: busyKey === `create:${group.key}` || busyKey === `update:${group.key}`,
      routeName: normalizeGenericLogisticsRouteName(group.first.routeTemplateName, group.first.routeWeekday),
      deliveryBoxes: bookingBoxCountForTask(group.items, "deliver_empty_box"),
      pickupBoxes: bookingBoxCountForTask(group.items, "pickup_full_box"),
    };
  }

  function renderAction(group: BookingGroup, data: ReturnType<typeof groupData>) {
    if (!canManage) return null;
    const actionLabel = data.publishedRoute ? "Actualizar ruta" : "Confirmar ruta";
    return (
      <button
        type="button"
        className={`${primaryButtonClass} h-9 shrink-0 px-3 text-xs`}
        disabled={Boolean(busyKey) || !data.selectedItems.length}
        onClick={() => {
          if (data.publishedRoute) void onUpdateRoute(group.key, data.publishedRoute, data.selectedItems);
          else void onCreateRoute(group.key, data.selectedItems);
        }}
        aria-label={`${actionLabel} con ${data.selectedItems.length} solicitudes seleccionadas`}
      >
        {data.busy ? <Loader2 className="h-4 w-4 animate-spin" /> : data.publishedRoute ? <RefreshCw className="h-4 w-4" /> : <Check className="h-4 w-4" />}
        {actionLabel}{data.selectedItems.length ? ` (${data.selectedItems.length})` : ""}
      </button>
    );
  }

  if (viewLayout === "excel") {
    return (
      <div className="overflow-x-auto bg-surface-panel">
        <table className="w-full min-w-[1050px] border-collapse text-left text-xs">
          <caption className="sr-only">Grupos de preparación en vista tabla</caption>
          <thead className="sticky top-0 z-10 bg-surface-card-header text-[10px] font-black uppercase tracking-wide text-slate-400">
            <tr>
              {canManage ? <th className="w-12 border-b border-black px-3 py-2">Sel.</th> : null}
              <th className="border-b border-black px-3 py-2">Ruta / invoice</th>
              <th className="border-b border-black px-3 py-2">Fecha / dirección</th>
              <th className="border-b border-black px-3 py-2">Estado / operación</th>
              <th className="border-b border-black px-3 py-2">Solicitudes / cajas</th>
              <th className="border-b border-black px-3 py-2">Acción</th>
            </tr>
          </thead>
          {groups.map((group) => {
            const data = groupData(group);
            return (
              <tbody key={group.key} className="border-b border-black">
                <tr className="bg-surface-card text-slate-200 hover:bg-surface-inset">
                  {canManage ? (
                    <td className="px-3 py-3 text-center">
                      <input type="checkbox" checked={data.allSelected} ref={(node) => { if (node) node.indeterminate = data.someSelected; }} onChange={() => toggleGroup(group.items)} disabled={Boolean(busyKey)} aria-label={`Seleccionar todas las solicitudes de ${data.routeName}`} className="h-4 w-4 accent-emerald-400" />
                    </td>
                  ) : null}
                  <td className="min-w-[15rem] px-3 py-3">
                    <button type="button" className="flex items-center gap-2 text-left font-black text-white" onClick={() => toggle(group.key)} aria-expanded={data.expanded}>
                      {data.expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}{data.routeName}
                    </button>
                  </td>
                  <td className="px-3 py-3 font-bold">{formatRouteDate(group.first.routeDate)}</td>
                  <td className="px-3 py-3 font-bold">{data.publishedRoute ? "Cambios pendientes" : data.draftRoute ? "Ruta pendiente de confirmar" : "Esperando confirmación"}</td>
                  <td className="px-3 py-3 font-bold">{group.items.length} solicitudes · {countLabel(data.deliveryBoxes, "caja para entregar", "cajas para entregar")}{data.pickupBoxes ? ` · ${countLabel(data.pickupBoxes, "caja para recoger", "cajas para recoger")}` : ""}</td>
                  <td className="px-3 py-2">{renderAction(group, data)}</td>
                </tr>
                {data.expanded ? group.items.map((item) => {
                  const selected = selectedIds.has(item.id);
                  const boxes = itemBoxCount(item);
                  return (
                    <tr key={item.id} className={selected ? "bg-emerald-400/10 text-slate-200" : "text-slate-300 hover:bg-white/[0.035]"}>
                      {canManage ? <td className="border-t border-black/70 px-3 py-2 text-center"><input type="checkbox" checked={selected} onChange={() => toggleItem(item.id)} disabled={Boolean(busyKey)} aria-label={`Seleccionar ${item.shipmentCode}`} className="h-4 w-4 accent-emerald-400" /></td> : null}
                      <td className="border-t border-black/70 px-3 py-2"><p className="font-black text-white">{item.shipmentCode}</p><p className="mt-1 font-bold text-slate-400">{item.customerName}</p></td>
                      <td className="min-w-[18rem] border-t border-black/70 px-3 py-2"><p className="flex gap-1.5 font-bold"><MapPin className="h-3.5 w-3.5 shrink-0" />{item.formattedAddress || "Dirección incompleta"}</p></td>
                      <td className="border-t border-black/70 px-3 py-2 font-bold">{routeTaskLabel(item.taskType)} · {scheduledTime(item.scheduledAt)}</td>
                      <td className="border-t border-black/70 px-3 py-2 font-black">{boxes} {boxes === 1 ? "caja" : "cajas"}</td>
                      <td className="border-t border-black/70 px-3 py-2 text-slate-500">Incluida en este grupo</td>
                    </tr>
                  );
                }) : null}
              </tbody>
            );
          })}
        </table>
      </div>
    );
  }

  return (
    <div className={viewLayout === "cards" ? "grid gap-3 p-3 lg:grid-cols-2" : "divide-y divide-black"}>
      {groups.map((group) => {
        const data = groupData(group);
        const detailsId = `logistics-template-booking-group-${group.key.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
        return (
          <section key={group.key} className={viewLayout === "cards" ? "overflow-hidden rounded-xl border border-black bg-surface-card p-3 shadow-sm" : "px-3 py-3 sm:px-4"}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 flex-1 items-start gap-2.5">
                {canManage ? <label className="mt-0.5 flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md px-1 py-1 text-[11px] font-black text-slate-300 hover:bg-white/[0.05]"><input type="checkbox" checked={data.allSelected} ref={(node) => { if (node) node.indeterminate = data.someSelected; }} onChange={() => toggleGroup(group.items)} disabled={Boolean(busyKey)} aria-label={`Seleccionar todas las solicitudes de ${data.routeName}`} className="h-4 w-4 accent-emerald-400" />Todas</label> : null}
                <button type="button" className="flex min-w-0 flex-1 items-start gap-2.5 rounded-md text-left transition hover:bg-white/[0.035] focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400" onClick={() => toggle(group.key)} aria-expanded={data.expanded} aria-controls={detailsId} aria-label={`${data.expanded ? "Contraer" : "Expandir"} ${data.routeName}`}>
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-black bg-surface-inset text-slate-400">{data.expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</span>
                  <span className="min-w-0"><span className="flex flex-wrap items-center gap-x-2 gap-y-1"><span className="text-sm font-black text-white">{data.routeName}</span><span className="rounded-md border border-black bg-amber-400/10 px-2 py-0.5 text-[10px] font-black text-amber-100">{data.publishedRoute ? "Cambios pendientes" : data.draftRoute ? "Ruta pendiente de confirmar" : "Esperando confirmación"}</span><span className="text-xs font-bold text-slate-400">{formatRouteDate(group.first.routeDate)}</span></span><span className="mt-1 block text-xs font-bold text-slate-400">{group.items.length} solicitudes · {countLabel(data.deliveryBoxes, "caja para entregar", "cajas para entregar")}{data.pickupBoxes ? ` · ${countLabel(data.pickupBoxes, "caja para recoger", "cajas para recoger")}` : ""}{data.selectedItems.length ? ` · ${data.selectedItems.length} seleccionadas` : ""}</span></span>
                </button>
              </div>
              {renderAction(group, data)}
            </div>
            <div id={detailsId} hidden={!data.expanded}>
              <div className="mt-3 divide-y divide-black border-t border-black bg-surface-inset/40">
                {group.items.map((item) => {
                  const selected = selectedIds.has(item.id);
                  const boxes = itemBoxCount(item);
                  return <article key={item.id} role={canManage ? "checkbox" : undefined} aria-checked={canManage ? selected : undefined} tabIndex={canManage ? 0 : undefined} onClick={() => { if (canManage && !busyKey) toggleItem(item.id); }} onKeyDown={(event) => { if (!canManage || busyKey || (event.key !== "Enter" && event.key !== " ")) return; event.preventDefault(); toggleItem(item.id); }} className={`grid gap-1.5 border-l-4 px-3 py-2.5 transition-colors sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center ${canManage ? "cursor-pointer select-none" : ""} ${selected ? "border-l-emerald-400 bg-emerald-400/10" : "border-l-transparent hover:bg-white/[0.035]"}`}>
                    {canManage ? <input type="checkbox" checked={selected} onChange={() => toggleItem(item.id)} onClick={(event) => event.stopPropagation()} disabled={Boolean(busyKey)} aria-label={`Seleccionar ${item.shipmentCode}`} className="h-4 w-4 accent-emerald-400" /> : null}<div className="min-w-0"><p className="truncate text-sm font-black text-slate-100">{item.shipmentCode} · {item.customerName}</p><p className="mt-1 flex gap-1.5 text-xs font-bold text-slate-400"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />{item.formattedAddress || "Dirección incompleta"}</p></div><p className="text-xs font-bold text-slate-300">{routeTaskLabel(item.taskType)} · {scheduledTime(item.scheduledAt)} · {boxes} {boxes === 1 ? "caja" : "cajas"}</p>
                  </article>;
                })}
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
