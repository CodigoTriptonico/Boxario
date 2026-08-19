"use client";

import Link from "next/link";
import { CalendarDays, Check, ChevronDown, ClipboardList, PackageCheck, Route, Settings2, Truck, Users } from "lucide-react";
import { AnchoredMenu } from "@/components/anchored-menu";
import { primaryButtonClass } from "@/components/ui-blocks";

export type LogisticsSection = "tasks" | "drivers" | "vehicles" | "routes" | "configuration";
export type LogisticsOperationTab = "confirmations" | "templates" | "operational" | "history";
export type LogisticsOperationCounts = Partial<Record<LogisticsOperationTab, number>>;
type LogisticsSectionNavProps = { active: LogisticsSection; className?: string; extraActions?: React.ReactNode };

const sections = [
  { id: "tasks" as const, label: "Tareas", href: "/logistica", Icon: ClipboardList },
  { id: "routes" as const, label: "Rutas", href: "/logistica?view=rutas", Icon: Route },
];
const configuration = [
  { id: "drivers" as const, label: "Conductores", href: "/logistica/conductores", Icon: Users },
  { id: "vehicles" as const, label: "Vehículos", href: "/logistica/vehiculos", Icon: Truck },
  { id: "configuration" as const, label: "Calendario y rutas", href: "/logistica?view=rutas&panel=configuracion", Icon: Route },
];
const operations = [
  { id: "confirmations" as const, label: "Por confirmar", href: "/logistica?view=rutas&tab=confirmations", Icon: Check },
  { id: "templates" as const, label: "Preparación", href: "/logistica?view=rutas&tab=templates", Icon: PackageCheck },
  { id: "operational" as const, label: "Rutas", href: "/logistica?view=rutas&tab=operational", Icon: Route },
  { id: "history" as const, label: "Historial", href: "/logistica?view=rutas&tab=history", Icon: CalendarDays },
];

function itemClass(active: boolean, hasWork = false) {
  return `inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-xs font-black leading-none transition ${active ? "bg-emerald-400 text-slate-950" : hasWork ? "bg-amber-400/10 text-amber-100 hover:bg-amber-400/20" : "text-slate-300 hover:bg-white/5"}`;
}

export function LogisticsConfigurationMenu({ active, className = "", onConfigurationClick }: { active: LogisticsSection; className?: string; onConfigurationClick?: () => void }) {
  return <span className={`shrink-0 ${className}`.trim()}><AnchoredMenu ariaLabel="Abrir configuración de logística" triggerClassName={`${itemClass(["drivers", "vehicles", "configuration"].includes(active))} h-9 w-9 justify-center px-0`} trigger={<Settings2 className="h-4 w-4" aria-hidden />}><>{configuration.map((entry) => { const Icon = entry.Icon; return <Link role="menuitem" key={entry.id} href={entry.href} onClick={entry.id === "configuration" && onConfigurationClick ? (event) => { event.preventDefault(); onConfigurationClick(); } : undefined} className={`${itemClass(active === entry.id)} w-full justify-start`}><Icon className="h-3.5 w-3.5" />{entry.label}</Link>; })}</></AnchoredMenu></span>;
}

export function LogisticsOperationsNav({ active, counts, className = "" }: { active?: LogisticsOperationTab; counts?: LogisticsOperationCounts; className?: string }) {
  return <nav aria-label="Operación de logística" className={`flex h-9 min-w-0 max-w-full shrink-0 flex-nowrap items-center gap-0.5 overflow-x-auto overflow-y-hidden rounded-lg border border-black bg-surface-inset p-0.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden ${className}`.trim()}>{operations.map((entry) => { const Icon = entry.Icon; const count = counts?.[entry.id] || 0; const selected = active === entry.id; return <Link key={entry.id} href={entry.href} className={itemClass(selected, count > 0)} aria-label={count ? `${entry.label}, ${count} con trabajo` : entry.label} title={count ? `${count} ${entry.id === "operational" ? "rutas activas" : "pendientes"}` : undefined}><Icon className="h-3.5 w-3.5" />{entry.label}{count ? <span className={`inline-flex min-w-4 items-center justify-center rounded-full px-1 py-0.5 text-[9px] font-black leading-none ${selected ? "bg-slate-950/15 text-slate-950" : "bg-amber-400 text-slate-950"}`}>{count > 99 ? "99+" : count}</span> : null}</Link>; })}</nav>;
}

export function LogisticsSectionNav({ active, className = "", extraActions }: LogisticsSectionNavProps) {
  const current = sections.find((entry) => entry.id === active) || sections[0];
  const CurrentIcon = current.Icon;
  return <div className={`flex shrink-0 items-center gap-1 ${className}`.trim()}><span className="lg:hidden"><AnchoredMenu ariaLabel="Abrir secciones de logística" align="left" panelWidth={176} triggerClassName={`${primaryButtonClass} !h-9 gap-1.5 px-2.5 text-xs`} trigger={<><CurrentIcon className="h-3.5 w-3.5" />{current.label}<ChevronDown className="h-3.5 w-3.5" /></>}><>{sections.map((entry) => { const Icon = entry.Icon; return <Link role="menuitem" key={entry.id} href={entry.href} className={`${itemClass(active === entry.id)} w-full justify-start`}><Icon className="h-3.5 w-3.5" />{entry.label}</Link>; })}{extraActions}</></AnchoredMenu></span><nav aria-label="Secciones de logística" className="hidden h-9 shrink-0 items-center gap-0.5 rounded-lg border border-black bg-surface-inset p-0.5 lg:inline-flex">{sections.map((entry) => { const Icon = entry.Icon; return <Link key={entry.id} href={entry.href} className={itemClass(active === entry.id)}><Icon className="h-3.5 w-3.5" />{entry.label}</Link>; })}{extraActions}</nav></div>;
}
