"use client";

import Link from "next/link";
import {
  ArrowLeft,
  BarChart3,
  Building2,
  Box,
  Boxes,
  ClipboardList,
  CreditCard,
  House,
  ListTodo,
  LucideIcon,
  MoreHorizontal,
  PackageCheck,
  Settings,
  Shield,
  Truck,
  Users,
  Layers3,
  Landmark,
} from "lucide-react";
import { canAccessPath, isPlatformOnlySession } from "@/lib/auth/permissions";
import { conductorTasksNavLabel } from "@/lib/conductor-tareas-view";
import { ONBOARDING_TARGETS } from "@/lib/onboarding/coach-targets";
import type { AppSession } from "@/lib/auth/types";

export type NavSectionId =
  | "main"
  | "shipments"
  | "agencies"
  | "stock"
  | "warehouse"
  | "operations"
  | "finance"
  | "reports"
  | "admin";

const navSections: { id: NavSectionId; label: string }[] = [
  { id: "main", label: "Trabajo" },
  { id: "shipments", label: "Envíos" },
  { id: "agencies", label: "Agencias" },
  { id: "stock", label: "Stock" },
  { id: "warehouse", label: "Flujo de bodega" },
  { id: "operations", label: "Operación" },
  { id: "finance", label: "Dinero" },
  { id: "reports", label: "Reportes" },
  { id: "admin", label: "Admin" },
];

export const navItems: {
  label: string;
  href: string;
  icon: LucideIcon;
  section: NavSectionId;
  hasSubmenu?: boolean;
  platformOnly?: boolean;
}[] = [
  { label: "Nueva venta", href: "/venta", icon: CreditCard, section: "shipments", hasSubmenu: true },
  { label: "Mi agencia", href: "/agencia", icon: Building2, section: "agencies" },
  { label: "Solicitudes", href: "/solicitudes", icon: ClipboardList, section: "agencies" },
  { label: "Vendedores y agencias", href: "/agencias", icon: Building2, section: "agencies" },
  { label: "Agencias a mi cargo", href: "/captacion", icon: Users, section: "agencies" },
  { label: "Seguimiento y envíos", href: "/seguimiento", icon: ClipboardList, section: "shipments" },
  { label: "Inventario", href: "/inventario", icon: Boxes, section: "stock", hasSubmenu: true },
  { label: "Ingreso a bodega", href: "/ingreso-bodega", icon: Box, section: "warehouse" },
  { label: "Bodega", href: "/bodega", icon: PackageCheck, section: "warehouse" },
  { label: "Paletas", href: "/paletas", icon: Layers3, section: "warehouse" },
  { label: "Logistica", href: "/logistica", icon: Truck, section: "operations" },
  { label: "Tareas conductor", href: "/conductor/tareas", icon: ListTodo, section: "operations" },
  { label: "Inventario camion", href: "/conductor/inventario-camion", icon: Boxes, section: "operations" },
  { label: "Contabilidad", href: "/contabilidad", icon: Landmark, section: "finance" },
  { label: "Estadisticas", href: "/estadisticas", icon: BarChart3, section: "reports" },
  { label: "Configuracion", href: "/configuracion", icon: Settings, section: "admin" },
  { label: "Plataforma", href: "/platform", icon: Shield, section: "admin", platformOnly: true },
];

export const DESKTOP_SIDEBAR_COLLAPSED_KEY = "boxario:desktop-sidebar-collapsed";
const SIDEBAR_GROUPS_EXPANDED_KEY_PREFIX = "boxario:sidebar-expanded-groups";

export function hasCompactSidebarContent(content: React.ReactNode) {
  return content !== null && content !== undefined && content !== false;
}

export function shellBrandTitle(active: string, contextNavLabel: string | undefined, brandTitle: string) {
  if (!contextNavLabel) {
    return brandTitle;
  }

  return contextNavLabel === active ? brandTitle : contextNavLabel;
}

type CompactNavHeaderProps = {
  compact?: boolean;
  compactNavTitle: string;
  compactNavBackTitle: string;
  onCompactNavClick: () => void;
  compactNavSettingsHref?: string;
};

export function CompactNavHeader({
  compact,
  compactNavTitle,
  compactNavBackTitle,
  onCompactNavClick,
  compactNavSettingsHref,
}: CompactNavHeaderProps) {
  const buttonClass = compact
    ? "flex h-11 min-w-0 flex-1 items-center gap-2 rounded-lg border border-black bg-surface-card px-3 text-sm font-black text-slate-200 transition-all duration-200 active:scale-[0.98] hover:bg-[#2f3834]"
    : "flex h-14 min-w-0 flex-1 items-center gap-3 rounded-lg border border-black bg-surface-card px-4 text-left text-lg font-black text-slate-200 transition-all duration-200 hover:-translate-x-0.5 hover:bg-[#2f3834]";
  const settingsClass = compact
    ? "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-black bg-surface-card text-slate-300 transition-all duration-200 active:scale-[0.98] hover:bg-[#2f3834] hover:text-slate-100"
    : "flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-black bg-surface-card text-slate-300 transition-all duration-200 hover:bg-[#2f3834] hover:text-slate-100";

  return (
    <div className="flex gap-2">
      <button
        onClick={onCompactNavClick}
        className={buttonClass}
        title={compactNavBackTitle}
      >
        <ArrowLeft className={compact ? "h-5 w-5 shrink-0" : "h-6 w-6 shrink-0"} />
        <span className="min-w-0 flex-1 truncate text-left">{compactNavTitle}</span>
      </button>
      {compactNavSettingsHref ? (
        <Link
          href={compactNavSettingsHref}
          className={settingsClass}
          title="Configuracion"
          aria-label="Configuracion"
        >
          <Settings className={compact ? "h-4 w-4" : "h-5 w-5"} />
        </Link>
      ) : null}
    </div>
  );
}

export type NavItemDef = (typeof navItems)[number];

export function navItemLabel(item: NavItemDef, session: AppSession | null) {
  if (item.href === "/conductor/tareas" && session) {
    return conductorTasksNavLabel(session.roleSlug);
  }

  return item.label;
}

export function navItemsForSession(session: AppSession | null) {
  if (!session) {
    return [];
  }

  const isPlatformOnly = isPlatformOnlySession(session);

  return navItems.filter((item) => {
    if (isPlatformOnly) {
      return Boolean(item.platformOnly);
    }
    if (item.platformOnly) {
      return false;
    }
    return canAccessPath(session, item.href);
  });
}

function navSectionIdForItem(item: NavItemDef): NavSectionId {
  if (item.section) {
    return item.section;
  }

  if (item.href.startsWith("/seguimiento")) {
    return "shipments";
  }

  return "main";
}

export function navGroupsForItems(items: NavItemDef[]) {
  return navSections
    .map((section) => ({
      ...section,
      items: items.filter((item) => navSectionIdForItem(item) === section.id),
    }))
    .filter((section) => section.items.length > 0);
}

export function mobilePrimaryNavItems(session: AppSession | null, items: NavItemDef[]) {
  const byHref = new Map(items.map((item) => [item.href, item]));
  const preferred =
    session?.roleSlug === "conductor"
      ? ["/conductor/tareas", "/conductor/inventario-camion"]
      : session?.roleSlug === "distribuidor"
        ? ["/agencia", "/solicitudes"]
        : ["administrador_agencia", "vendedor_agencia", "caja_agencia", "operador_agencia"].includes(session?.roleSlug || "")
          ? ["/agencia", "/solicitudes"]
          : ["captador_distribuidores", "captador_agencias", "supervisor_agencias"].includes(session?.roleSlug || "")
            ? ["/captacion", "/agencias"]
            : session?.roleSlug === "finanzas"
              ? ["/contabilidad", "/agencias"]
              : ["/venta", "/seguimiento"];

  return preferred.map((href) => byHref.get(href)).filter((item): item is NavItemDef => Boolean(item));
}

function isMobileHomeActive(active: string) {
  return active === "Inicio";
}

export function isNavSectionId(value: unknown): value is NavSectionId {
  return typeof value === "string" && navSections.some((section) => section.id === value);
}

export function navSectionIcon(sectionId: NavSectionId): LucideIcon {
  switch (sectionId) {
    case "main":
      return House;
    case "shipments":
      return ClipboardList;
    case "agencies":
      return Building2;
    case "stock":
      return Boxes;
    case "warehouse":
      return PackageCheck;
    case "operations":
      return Truck;
    case "finance":
      return Landmark;
    case "reports":
      return BarChart3;
    case "admin":
      return Settings;
  }
}

export function sidebarGroupsExpandedStorageKey(session: AppSession | null) {
  return `${SIDEBAR_GROUPS_EXPANDED_KEY_PREFIX}:${session?.userId ?? "anonymous"}`;
}

function navOnboardingTarget(href: string) {
  if (href === "/configuracion") {
    return ONBOARDING_TARGETS.NAV_CONFIGURACION;
  }

  if (href === "/inventario") {
    return ONBOARDING_TARGETS.NAV_INVENTARIO;
  }

  if (href === "/venta") {
    return ONBOARDING_TARGETS.NAV_VENTA;
  }

  return undefined;
}

type ShellNavItemProps = {
  item: NavItemDef;
  label: string;
  session?: AppSession | null;
  isActive: boolean;
  variant: "sidebar" | "mobile" | "rail";
  onNavigate?: (isActive: boolean, hasSubmenu?: boolean) => void;
};

export function ShellNavItem({ item, label, isActive, variant, onNavigate }: ShellNavItemProps) {
  const Icon = item.icon;
  const onboardingTarget = navOnboardingTarget(item.href);

  if (variant === "rail") {
    return (
      <Link
        key={item.href}
        href={item.href}
        prefetch
        title={label}
        aria-label={label}
        data-onboarding-target={onboardingTarget}
        onClick={() => onNavigate?.(isActive, item.hasSubmenu)}
        className={`relative flex h-11 w-full items-center justify-center rounded-lg border transition-colors duration-200 ${
          isActive
            ? "border-black bg-[#33413c] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
            : "border-transparent text-slate-300 hover:border-black hover:bg-surface-card hover:text-white"
        }`}
      >
        <Icon className={`h-5 w-5 shrink-0 ${isActive ? "text-emerald-200" : "text-slate-400"}`} />
      </Link>
    );
  }

  if (variant === "sidebar") {
    return (
      <Link
        key={item.href}
        href={item.href}
        prefetch
        data-onboarding-target={onboardingTarget}
        aria-current={isActive ? "page" : undefined}
        onClick={() => onNavigate?.(isActive, item.hasSubmenu)}
        className={`group relative flex min-h-11 min-w-0 items-center gap-2.5 overflow-hidden rounded-lg border px-2.5 py-1.5 text-left text-sm font-black transition-[background-color,border-color,box-shadow,color] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70 ${
          isActive
            ? "sidebar-nav-item-active border-black/90 bg-[#243a32] text-white"
            : "border-transparent text-slate-300 hover:border-black/90 hover:bg-surface-card hover:text-white"
        }`}
      >
        {isActive ? <span className="sidebar-nav-active-dot h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-300" aria-hidden /> : null}
        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md border transition-colors duration-200 ${isActive ? "border-emerald-300/30 bg-emerald-400/15 text-emerald-200" : "border-transparent bg-black/10 text-slate-400 group-hover:text-slate-200"}`}>
          <Icon className="h-[17px] w-[17px]" strokeWidth={2.25} aria-hidden />
        </span>
        <span className="min-w-0 flex-1 whitespace-normal leading-[1.05rem]">{label}</span>
      </Link>
    );
  }

  return (
    <Link
      key={item.href}
      href={item.href}
      prefetch
      data-onboarding-target={onboardingTarget}
      onClick={() => onNavigate?.(isActive, item.hasSubmenu)}
      className={`flex h-12 min-w-0 items-center gap-3 rounded-lg border px-3 text-sm font-black transition-all duration-200 active:scale-[0.98] ${
        isActive ? "border-black bg-emerald-400 text-slate-950" : "border-black bg-surface-card text-slate-300"
      }`}
    >
      <Icon className="h-5 w-5 shrink-0" />
      <span className="min-w-0 flex-1 truncate text-left">{label}</span>
    </Link>
  );
}

export function MobileBottomNav({
  session,
  items,
  active,
  moreOpen,
  onMore,
}: {
  session: AppSession | null;
  items: NavItemDef[];
  active: string;
  moreOpen: boolean;
  onMore: () => void;
}) {
  const primary = mobilePrimaryNavItems(session, items);
  const activeInPrimary = primary.some((item) => navItemLabel(item, session) === active);
  const moreActive = !isMobileHomeActive(active) && !activeInPrimary;

  return (
    <nav aria-label="Navegación principal" className="app-shell-mobile-nav fixed inset-x-0 bottom-0 z-[120] border-t border-black bg-[#17201d]/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-12px_30px_rgba(0,0,0,0.32)] backdrop-blur lg:hidden">
      <div className="grid w-full grid-cols-4 gap-1">
        <Link href="/" className={`mobile-tab ${isMobileHomeActive(active) ? "mobile-tab-active" : ""}`} aria-current={isMobileHomeActive(active) ? "page" : undefined}><House className="h-5 w-5" /><span>Inicio</span></Link>
        {primary.map((item) => {
          const Icon = item.icon;
          const selected = navItemLabel(item, session) === active;
          return <Link key={item.href} href={item.href} className={`mobile-tab ${selected ? "mobile-tab-active" : ""}`} aria-current={selected ? "page" : undefined}><Icon className="h-5 w-5" /><span>{navItemLabel(item, session)}</span></Link>;
        })}
        {primary.length < 2 ? <span className="mobile-tab pointer-events-none opacity-0" aria-hidden /> : null}
        <button type="button" onClick={onMore} className={`mobile-tab ${moreOpen || moreActive ? "mobile-tab-active" : ""}`} aria-expanded={moreOpen} aria-label={moreOpen ? "Cerrar más opciones" : "Abrir más opciones"}><MoreHorizontal className="h-5 w-5" /><span>Más</span></button>
      </div>
    </nav>
  );
}
