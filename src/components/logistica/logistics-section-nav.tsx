"use client";

import Link from "next/link";
import { ChevronDown, ClipboardList, Route, Truck, Users } from "lucide-react";
import { primaryButtonClass, secondaryButtonClass } from "@/components/ui-blocks";

export type LogisticsSection = "tasks" | "routes" | "drivers" | "vehicles";

type LogisticsSectionNavProps = {
  active: LogisticsSection;
  className?: string;
  routesOnClick?: () => void;
  routesHref?: string;
  extraActions?: React.ReactNode;
};

function sectionButtonClass(active: LogisticsSection, section: LogisticsSection) {
  return `${active === section ? primaryButtonClass : secondaryButtonClass} !h-9 shrink-0 items-center justify-center gap-2 px-2.5 text-xs`;
}

const sectionDetails = {
  tasks: { label: "Tareas", Icon: ClipboardList },
  drivers: { label: "Conductores", Icon: Users },
  vehicles: { label: "Vehiculos", Icon: Truck },
  routes: { label: "Rutas", Icon: Route },
} satisfies Record<LogisticsSection, { label: string; Icon: typeof ClipboardList }>;

export function LogisticsSectionNav({
  active,
  className = "",
  routesOnClick,
  routesHref = "/logistica?view=rutas",
  extraActions,
}: LogisticsSectionNavProps) {
  const activeSection = sectionDetails[active];
  const ActiveIcon = activeSection.Icon;

  return (
    <div className={`min-w-0 lg:w-auto ${className}`.trim()}>
      <details className="group relative lg:hidden">
        <summary
          className={`${primaryButtonClass} !h-9 cursor-pointer list-none gap-1.5 px-2.5 text-xs [&::-webkit-details-marker]:hidden`}
          aria-label="Cambiar seccion de logistica"
        >
          <ActiveIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {activeSection.label}
          <ChevronDown
            className="h-3.5 w-3.5 shrink-0 transition-transform group-open:rotate-180"
            aria-hidden
          />
        </summary>
        <div className="absolute right-0 top-full z-[125] mt-2 grid w-44 gap-1 rounded-xl border border-black bg-surface-card p-1.5 shadow-[0_16px_36px_rgba(0,0,0,0.45)]">
          <Link href="/logistica" className={sectionButtonClass(active, "tasks")}>
            <ClipboardList className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Tareas
          </Link>
          <Link href="/logistica/conductores" className={sectionButtonClass(active, "drivers")}>
            <Users className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Conductores
          </Link>
          <Link href="/logistica/vehiculos" className={sectionButtonClass(active, "vehicles")}>
            <Truck className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Vehiculos
          </Link>
          {active === "routes" && routesOnClick ? (
            <button type="button" className={sectionButtonClass(active, "routes")} onClick={routesOnClick}>
              <Route className="h-4 w-4 shrink-0" aria-hidden />
              Rutas
            </button>
          ) : (
            <Link href={routesHref} className={sectionButtonClass(active, "routes")}>
              <Route className="h-4 w-4 shrink-0" aria-hidden />
              Rutas
            </Link>
          )}
          {extraActions}
        </div>
      </details>

      <div className="hidden min-w-0 flex-wrap items-center gap-1.5 lg:flex">
        <Link href="/logistica" className={sectionButtonClass(active, "tasks")}>
          <ClipboardList className="h-3.5 w-3.5 shrink-0" aria-hidden />
          Tareas
        </Link>
        <Link href="/logistica/conductores" className={sectionButtonClass(active, "drivers")}>
          <Users className="h-3.5 w-3.5 shrink-0" aria-hidden />
          Conductores
        </Link>
        <Link href="/logistica/vehiculos" className={sectionButtonClass(active, "vehicles")}>
          <Truck className="h-3.5 w-3.5 shrink-0" aria-hidden />
          Vehiculos
        </Link>
        {active === "routes" && routesOnClick ? (
          <button type="button" className={sectionButtonClass(active, "routes")} onClick={routesOnClick}>
            <Route className="h-4 w-4 shrink-0" aria-hidden />
            Rutas
          </button>
        ) : (
          <Link href={routesHref} className={sectionButtonClass(active, "routes")}>
            <Route className="h-4 w-4 shrink-0" aria-hidden />
            Rutas
          </Link>
        )}
        {extraActions}
      </div>
    </div>
  );
}
