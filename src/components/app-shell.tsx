"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { UserAccountMenu } from "@/components/user-account-menu";
import { SidebarFooterControls, SidebarPageSurfaceControls } from "@/components/ui/sidebar-page-surface-controls";
import { OnboardingCoachSidebarCountdown } from "@/components/onboarding/onboarding-coach-countdown";
import { BoxarioBrandHeader, NotificationsCenter } from "@/components/notifications/notifications-center";
import {
  CompactNavHeader,
  DESKTOP_SIDEBAR_COLLAPSED_KEY,
  hasCompactSidebarContent,
  isNavSectionId,
  MobileBottomNav,
  navGroupsForItems,
  navItemLabel,
  navItems,
  navItemsForSession,
  navSectionIcon,
  ShellNavItem,
  shellBrandTitle,
  sidebarGroupsExpandedStorageKey,
  mobilePrimaryNavItems,
  type NavSectionId,
} from "@/components/app-shell-nav";
import { resolveOrganizationBrandingFromSession } from "@/lib/organizations/branding";
import type { UiSurfaceContextId } from "@/lib/ui-surface-context";
import type { AppSession } from "@/lib/auth/types";

type AppShellProps = {
  active: string;
  title: string;
  headerAction?: React.ReactNode;
  kicker?: string;
  action?: string;
  actionHref?: string;
  secondaryAction?: string;
  secondaryActionHref?: string;
  onActiveClick?: () => void;
  compactContent?: React.ReactNode;
  compactNavLabel?: string;
  compactNavFocusKey?: string | number;
  onCompactNavClick?: () => void;
  hideCompactNavHeader?: boolean;
  compactNavSettingsHref?: string;
  contextNavLabel?: string;
  onContextNavBack?: () => void;
  contextNavTarget?: string;
  contextNavKeepBrand?: boolean;
  reserveContextNav?: boolean;
  contentEdgeToEdge?: boolean;
  surfaceContextId?: UiSurfaceContextId | null;
  children: React.ReactNode;
};

export function AppShell({
  session,
  active,
  children,
  headerAction,
  compactContent,
  compactNavLabel,
  compactNavFocusKey,
  onCompactNavClick,
  hideCompactNavHeader,
  compactNavSettingsHref,
  contextNavLabel,
  onContextNavBack,
  contextNavTarget,
  contextNavKeepBrand = false,
  reserveContextNav = false,
  onActiveClick,
  contentEdgeToEdge = false,
  surfaceContextId = null,
}: AppShellProps & { session: AppSession | null }) {
  const [navCollapsed, setNavCollapsed] = useState(false);
  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(false);
  const [expandedSidebarGroups, setExpandedSidebarGroups] = useState<NavSectionId[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const sidebarNavItems = useMemo(() => navItemsForSession(session), [session]);
  const sidebarNavGroups = useMemo(() => navGroupsForItems(sidebarNavItems), [sidebarNavItems]);
  const collapsibleSidebarGroupIds = useMemo(
    () => sidebarNavGroups.filter((section) => section.items.length > 0).map((section) => section.id),
    [sidebarNavGroups],
  );
  const allSidebarGroupsExpanded = useMemo(
    () =>
      collapsibleSidebarGroupIds.length > 0 &&
      collapsibleSidebarGroupIds.every((sectionId) => expandedSidebarGroups.includes(sectionId)),
    [collapsibleSidebarGroupIds, expandedSidebarGroups],
  );
  const activeItem =
    sidebarNavItems.find((item) => navItemLabel(item, session) === active) ??
    sidebarNavItems[0] ??
    navItems[0];
  const mobileNavItems = useMemo(() => sidebarNavItems, [sidebarNavItems]);
  const mobileMoreNavGroups = useMemo(() => {
    const primaryHrefs = new Set(mobilePrimaryNavItems(session, mobileNavItems).map((item) => item.href));
    return navGroupsForItems(mobileNavItems.filter((item) => !primaryHrefs.has(item.href)));
  }, [mobileNavItems, session]);
  const showCompactSidebar = hasCompactSidebarContent(compactContent);
  const showContextNav = Boolean(contextNavLabel && onContextNavBack);
  const showMobileMainNav = mobileNavItems.length > 0;
  const showDesktopRail = desktopSidebarCollapsed && !(navCollapsed && showCompactSidebar);
  const sidebarGroupsStorageKey = sidebarGroupsExpandedStorageKey(session);

  useEffect(() => {
    const stored = localStorage.getItem(DESKTOP_SIDEBAR_COLLAPSED_KEY);
    if (stored === "true") {
      queueMicrotask(() => setDesktopSidebarCollapsed(true));
    }
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem(sidebarGroupsStorageKey);
    if (!stored) {
      return;
    }

    try {
      const parsed: unknown = JSON.parse(stored);
      if (!Array.isArray(parsed)) {
        return;
      }

      const savedGroups = parsed.filter(isNavSectionId);
      queueMicrotask(() => setExpandedSidebarGroups(savedGroups));
    } catch {
      // An older or malformed browser value should never block navigation.
    }
  }, [sidebarGroupsStorageKey]);

  useEffect(() => {
    if (!mobileMenuOpen) {
      return;
    }

    function closeMobileMenuOnOutsidePointer(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      if (
        target.closest("#mobile-more-navigation") ||
        target.closest('[aria-controls="mobile-more-navigation"]')
      ) {
        return;
      }

      setMobileMenuOpen(false);
    }

    document.addEventListener("pointerdown", closeMobileMenuOnOutsidePointer);
    return () => document.removeEventListener("pointerdown", closeMobileMenuOnOutsidePointer);
  }, [mobileMenuOpen]);

  function toggleDesktopSidebar() {
    setDesktopSidebarCollapsed((current) => {
      const next = !current;
      localStorage.setItem(DESKTOP_SIDEBAR_COLLAPSED_KEY, String(next));
      return next;
    });
  }

  function toggleSidebarGroup(sectionId: NavSectionId) {
    setExpandedSidebarGroups((current) => {
      const next = current.includes(sectionId)
        ? current.filter((id) => id !== sectionId)
        : [...current, sectionId];

      localStorage.setItem(sidebarGroupsStorageKey, JSON.stringify(next));
      return next;
    });
  }

  function toggleAllSidebarGroups() {
    const next = allSidebarGroupsExpanded ? [] : collapsibleSidebarGroupIds;
    setExpandedSidebarGroups(next);
    localStorage.setItem(sidebarGroupsStorageKey, JSON.stringify(next));
  }

  function collapseToCompactNav() {
    setNavCollapsed(true);
    window.sessionStorage.setItem("boxario-nav-collapsed", "1");
  }

  useEffect(() => {
    if (!showCompactSidebar) {
      queueMicrotask(() => {
        setNavCollapsed((current) => {
          if (!current) {
            return current;
          }

          window.sessionStorage.removeItem("boxario-nav-collapsed");
          return false;
        });
      });
      return;
    }

    queueMicrotask(() => {
      setNavCollapsed((current) => {
        if (current) {
          return current;
        }

        window.sessionStorage.setItem("boxario-nav-collapsed", "1");
        return true;
      });
    });
  }, [active, showCompactSidebar, compactNavFocusKey]);

  function expandNav() {
    setNavCollapsed(false);
    window.sessionStorage.removeItem("boxario-nav-collapsed");
  }

  function handleCompactNavClick() {
    if (onCompactNavClick) {
      onCompactNavClick();
      return;
    }

    expandNav();
  }

  const organizationBrandTitle = resolveOrganizationBrandingFromSession({
    organizationName: session?.organizationName ?? "",
    organizationShortName: session?.organizationShortName,
    organizationLogoUrl: session?.organizationLogoUrl,
  }).brandTitle;
  const compactNavTitle = compactNavLabel ?? activeItem.label;
  const compactNavBackTitle = onCompactNavClick ? "Volver" : "Mostrar menu";
  const brandTitle = shellBrandTitle(active, contextNavLabel, organizationBrandTitle);

  function handleNavClick(isActive: boolean, hasSubmenu?: boolean) {
    setMobileMenuOpen(false);

    if (isActive && hasSubmenu && showCompactSidebar) {
      collapseToCompactNav();
    }

    if (isActive) {
      onActiveClick?.();
    }
  }

  return (
    <main className="flex min-h-dvh flex-col bg-surface-shell text-[#f8fafc] lg:h-dvh lg:overflow-hidden">
      <div
        className={`flex min-h-dvh w-full bg-surface-shell lg:h-full lg:min-h-0 ${
          contentEdgeToEdge
            ? "gap-3 py-3 pl-3 pr-0 sm:gap-4 sm:py-4 sm:pl-4"
            : "gap-4 p-3 sm:gap-5 sm:p-5"
        }`}
      >
        <aside
          className={`app-shell-desktop-sidebar hidden shrink-0 overflow-visible rounded-xl border border-app-border-control bg-surface-panel shadow-md transition-[width,transform,opacity] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] lg:sticky lg:top-5 lg:z-[100] lg:flex lg:max-h-[calc(100vh-2.5rem)] lg:min-h-[calc(100vh-2.5rem)] lg:flex-col ${
            showDesktopRail ? "w-16 p-2" : "w-64 p-3"
          }`}
        >
          {navCollapsed && showCompactSidebar ? (
            <div className="flex min-h-0 flex-1 flex-col gap-3">
              {hideCompactNavHeader ? null : (
                <CompactNavHeader
                  compactNavTitle={compactNavTitle}
                  compactNavBackTitle={compactNavBackTitle}
                  onCompactNavClick={handleCompactNavClick}
                  compactNavSettingsHref={compactNavSettingsHref}
                />
              )}
              {compactContent}
            </div>
          ) : (
            <>
              <div className="mb-4">
                {showDesktopRail ? (
                  <div className="flex flex-col items-center gap-1">
                    {headerAction}
                    <NotificationsCenter session={session} variant="brand" />
                  </div>
                ) : (
                  <BoxarioBrandHeader
                    session={session}
                    compact
                    className="w-full min-w-0"
                    onBack={showContextNav ? onContextNavBack : undefined}
                    title={showContextNav ? brandTitle : undefined}
                    backTarget={showContextNav ? contextNavTarget : undefined}
                    keepBrand={contextNavKeepBrand}
                    reserveBackSlot={reserveContextNav}
                    headerAction={headerAction}
                    sidebarGroupsToggle={{
                      allExpanded: allSidebarGroupsExpanded,
                      onToggle: toggleAllSidebarGroups,
                    }}
                  />
                )}
              </div>

              <nav className="min-h-0 flex-1 space-y-2.5 overflow-y-auto pr-1">
                {sidebarNavGroups.map((section) => {
                  const canCollapse = section.items.length > 0;
                  const sectionCollapsed =
                    !showDesktopRail && canCollapse && !expandedSidebarGroups.includes(section.id);
                  const sectionExpanded = !sectionCollapsed;
                  const isWarehouseSection = section.id === "warehouse";
                  const groupPanelId = `sidebar-group-${section.id}`;
                  const SectionIcon = navSectionIcon(section.id);
                  const collapsedGroupHeaderClass =
                    "border-app-border-divider bg-surface-inset/55 hover:border-emerald-300 hover:bg-[#27342f]";

                  return (
                    <div key={section.id} className="space-y-1.5">
                      {!showDesktopRail ? (
                        <button
                          type="button"
                          onClick={canCollapse ? () => toggleSidebarGroup(section.id) : undefined}
                          aria-controls={canCollapse ? groupPanelId : undefined}
                          aria-expanded={canCollapse ? sectionExpanded : undefined}
                          className={`group flex min-h-11 w-full items-center justify-between rounded-lg border px-2.5 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition-[background-color,border-color,box-shadow,transform] duration-200 active:scale-[0.99] ${
                            canCollapse
                              ? `cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70 ${
                                  sectionExpanded ? "sidebar-group-expanded" : collapsedGroupHeaderClass
                                }`
                              : "cursor-default"
                          }`}
                        >
                          <span className="flex min-w-0 items-center gap-2.5">
                            <span
                              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md border ${
                                sectionExpanded
                                  ? "sidebar-group-expanded-icon"
                                  : "border-app-border-divider bg-surface-card text-emerald-200 group-hover:bg-[#34443d] group-hover:text-emerald-100"
                              }`}
                            >
                              <SectionIcon className="h-4 w-4" strokeWidth={2.4} aria-hidden />
                            </span>
                            {isWarehouseSection ? (
                              <span
                                className={`flex min-w-0 flex-col text-[9px] font-black uppercase leading-[0.86rem] tracking-[0.08em] ${
                                  sectionExpanded ? "text-emerald-100" : "text-slate-200"
                                }`}
                              >
                                <span>Flujo</span>
                                <span>de bodega</span>
                              </span>
                            ) : (
                              <span
                                className={`truncate text-[11px] font-black uppercase leading-none tracking-[0.08em] ${
                                  sectionExpanded ? "text-emerald-100" : "text-slate-200"
                                }`}
                              >
                                {section.label}
                              </span>
                            )}
                          </span>
                          {canCollapse ? (
                            <span
                              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md border transition-colors duration-200 ${
                                sectionExpanded
                                  ? "sidebar-group-expanded-chevron"
                                  : "border-app-border-divider bg-black/20 text-emerald-200 group-hover:bg-black/30"
                              }`}
                            >
                              <ChevronDown
                                className={`h-4 w-4 transition-transform duration-200 ${
                                  sectionCollapsed ? "-rotate-90" : "rotate-0"
                                }`}
                                aria-hidden
                              />
                            </span>
                          ) : null}
                        </button>
                      ) : null}
                      <div
                        id={!showDesktopRail && canCollapse ? groupPanelId : undefined}
                        aria-hidden={sectionCollapsed}
                        inert={sectionCollapsed}
                        className={`grid overflow-hidden transition-[grid-template-rows,opacity] duration-200 ease-out ${
                          sectionCollapsed ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr] opacity-100"
                        }`}
                      >
                        <div className="min-h-0">
                          <div className={showDesktopRail ? "grid gap-1" : "ml-3 grid gap-1 border-l border-app-border-divider pl-2"}>
                            {section.items.map((item) => {
                              const label = navItemLabel(item, session);

                              return (
                                <ShellNavItem
                                  key={item.href}
                                  item={item}
                                  label={label}
                                  isActive={label === active}
                                  variant={showDesktopRail ? "rail" : "sidebar"}
                                  onNavigate={handleNavClick}
                                />
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </nav>
            </>
          )}

          <div className="mt-auto hidden pt-4 lg:block">
            <OnboardingCoachSidebarCountdown
              variant={showDesktopRail ? "rail" : "sidebar"}
            />
            <SidebarFooterControls
              contextId={surfaceContextId}
              sidebarCollapsed={showDesktopRail}
              onToggleSidebar={toggleDesktopSidebar}
              variant={showDesktopRail ? "rail" : "sidebar"}
            />
            <UserAccountMenu
              session={session}
              variant={showDesktopRail ? "rail" : "sidebar"}
            />
          </div>
        </aside>

        <section className="flex w-full min-w-0 flex-1 flex-col overflow-visible lg:min-h-0 lg:overflow-hidden">
          <div className="app-shell-mobile-header mb-3 flex w-full items-stretch gap-2 lg:hidden">
            <BoxarioBrandHeader
              session={session}
              compact
              className="min-w-0 flex-1"
              onBack={showContextNav ? onContextNavBack : undefined}
              title={showContextNav ? brandTitle : undefined}
              backTarget={showContextNav ? contextNavTarget : undefined}
              keepBrand={contextNavKeepBrand}
              reserveBackSlot={reserveContextNav}
              headerAction={headerAction}
            />
            <UserAccountMenu session={session} variant="bar" />
            {surfaceContextId ? (
              <SidebarPageSurfaceControls contextId={surfaceContextId} variant="bar" />
            ) : null}
          </div>


          {navCollapsed && showCompactSidebar ? (
            <div className="sticky top-3 z-50 mb-4 grid gap-3 lg:hidden">
              {hideCompactNavHeader ? null : (
                <CompactNavHeader
                  compact
                  compactNavTitle={compactNavTitle}
                  compactNavBackTitle={compactNavBackTitle}
                  onCompactNavClick={handleCompactNavClick}
                  compactNavSettingsHref={compactNavSettingsHref}
                />
              )}
              {compactContent}
            </div>
          ) : null}

          <div className="flex w-full flex-col overflow-x-hidden pb-24 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pb-0">
            {children}
          </div>

          {showMobileMainNav ? (
            <>
              <MobileBottomNav
                session={session}
                items={mobileNavItems}
                active={active}
                moreOpen={mobileMenuOpen}
                onMore={() => setMobileMenuOpen((open) => !open)}
                onNavigate={() => setMobileMenuOpen(false)}
              />

              {mobileMenuOpen ? (
                <div className="pointer-events-none fixed inset-0 z-[130] lg:hidden">
                  <button
                    type="button"
                    aria-label="Cerrar más opciones"
                    className="pointer-events-none absolute inset-0 bg-black/45"
                  />
                  <nav id="mobile-more-navigation" aria-label="Más opciones" className="pointer-events-auto absolute inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] max-h-[72dvh] space-y-3 overflow-y-auto rounded-t-[1.5rem] border border-app-border-control bg-surface-panel p-4 shadow-[0_-18px_44px_rgba(0,0,0,0.55)]">
                    <div className="mx-auto mb-1 h-1.5 w-10 rounded-full bg-slate-600" />
                    {mobileMoreNavGroups.map((section) => {
                      const canCollapse = section.items.length > 0;
                      const sectionCollapsed = canCollapse && !expandedSidebarGroups.includes(section.id);
                      const sectionExpanded = !sectionCollapsed;
                      const groupPanelId = `mobile-more-group-${section.id}`;
                      const SectionIcon = navSectionIcon(section.id);

                      return (
                        <div key={section.id} className="space-y-1.5">
                          <button
                            type="button"
                            onClick={canCollapse ? () => toggleSidebarGroup(section.id) : undefined}
                            aria-controls={canCollapse ? groupPanelId : undefined}
                            aria-expanded={canCollapse ? sectionExpanded : undefined}
                            className="group flex min-h-11 w-full items-center justify-between rounded-xl border border-emerald-400/25 bg-[#263a33] px-2.5 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition-[background-color,border-color,box-shadow,transform] duration-200 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70"
                          >
                            <span className="flex min-w-0 items-center gap-2.5">
                              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-app-border-divider bg-surface-card text-emerald-200">
                                <SectionIcon className="h-4 w-4" strokeWidth={2.4} aria-hidden />
                              </span>
                              <span className="truncate text-[11px] font-black uppercase leading-none tracking-[0.08em] text-slate-200">
                                {section.label}
                              </span>
                            </span>
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-app-border-divider bg-black/20 text-emerald-200">
                              <ChevronDown
                                className={`h-4 w-4 transition-transform duration-200 ${
                                  sectionCollapsed ? "-rotate-90" : "rotate-0"
                                }`}
                                aria-hidden
                              />
                            </span>
                          </button>
                          <div
                            id={canCollapse ? groupPanelId : undefined}
                            aria-hidden={sectionCollapsed}
                            inert={sectionCollapsed}
                            className={sectionCollapsed ? "hidden" : "ml-3 grid gap-1 border-l-2 border-emerald-400/20 pl-2"}
                          >
                            {section.items.map((item) => {
                              const label = navItemLabel(item, session);

                              return (
                                <ShellNavItem
                                  key={item.href}
                                  item={item}
                                  label={label}
                                  isActive={label === active}
                                  variant="mobile"
                                  onNavigate={handleNavClick}
                                />
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </nav>
                </div>
              ) : null}
            </>
          ) : null}
        </section>
      </div>
    </main>
  );
}
