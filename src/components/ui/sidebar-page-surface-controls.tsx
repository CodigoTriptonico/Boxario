"use client";

import { Palette, SlidersHorizontal } from "lucide-react";
import { useRef, useState, type ReactNode } from "react";
import { SidebarCollapseButton } from "@/components/notifications/notifications-center";
import { ViewLayoutToggle } from "@/components/view-layout-toggle";
import { SurfacePalettePicker } from "@/components/ui/surface-palette-picker";
import {
  usePageViewLayout,
  usePageListRowPalette,
  useUiSurfacePreferences,
} from "@/components/ui/ui-surface-preferences-provider";
import {
  surfaceContextSupportsExcelLayout,
  surfaceContextSupportsViewLayout,
  uiSurfaceContextMeta,
  type UiSurfaceContextId,
} from "@/lib/ui-surface-context";

type SidebarControlsVariant = "sidebar" | "rail" | "bar";

const iconButtonClass = {
  sidebar:
    "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-app-border-control bg-surface-card text-app-text-secondary transition hover:bg-[#2f3834] hover:text-app-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-focus-ring active:scale-[0.98]",
  rail: "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-app-border-control bg-surface-card text-app-text-secondary transition hover:bg-[#2f3834] hover:text-app-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-focus-ring active:scale-[0.98]",
  bar: "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-app-border-control bg-surface-card text-app-text-secondary transition hover:bg-[#2f3834] hover:text-app-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-focus-ring active:scale-[0.98]",
};

function footerRowClass(variant: SidebarControlsVariant) {
  const isRail = variant === "rail";
  const isBar = variant === "bar";

  if (isRail) {
    return "mb-2 flex w-full flex-col items-center gap-1";
  }

  if (isBar) {
    return "flex shrink-0 gap-1";
  }

  return "mb-2 flex w-full gap-1";
}

function CollapsibleControlsRow({
  variant,
  children,
}: {
  variant: SidebarControlsVariant;
  children: ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  const expandLabel = "Mostrar opciones de vista y apariencia";
  const collapseLabel = "Ocultar opciones de vista y apariencia";

  return (
    <div className={footerRowClass(variant)}>
      <button
        type="button"
        className={`${iconButtonClass[variant]}${expanded ? " bg-emerald-400 text-slate-950 hover:bg-emerald-300 hover:text-slate-950" : ""}`}
        aria-expanded={expanded}
        aria-label={expanded ? collapseLabel : expandLabel}
        title={expanded ? collapseLabel : expandLabel}
        onClick={() => setExpanded((value) => !value)}
      >
        <SlidersHorizontal className="h-4 w-4 shrink-0" strokeWidth={2.25} aria-hidden />
      </button>
      {expanded ? children : null}
    </div>
  );
}

function SidebarPageSurfaceControlsContent({
  contextId,
  variant,
}: {
  contextId: UiSurfaceContextId;
  variant: SidebarControlsVariant;
}) {
  const meta = uiSurfaceContextMeta(contextId);
  const { paletteIdForContext, setContextPalette } = useUiSurfacePreferences();
  const { layout, setViewLayout } = usePageViewLayout(contextId);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const paletteTriggerRef = useRef<HTMLButtonElement>(null);
  const currentId = paletteIdForContext(contextId);
  const supportsLayout = surfaceContextSupportsViewLayout(contextId);
  const supportsExcel = surfaceContextSupportsExcelLayout(contextId);

  usePageListRowPalette(contextId);

  const isBar = variant === "bar";

  const pickerPositionClass = isBar
    ? "right-0 top-full z-[200] mt-2"
    : "left-full bottom-0 z-[200] ml-2 max-h-[min(32rem,calc(100dvh-1.5rem))] overflow-y-auto";

  return (
    <>
      {supportsLayout ? (
        <ViewLayoutToggle
          layout={layout}
          onChange={setViewLayout}
          supportsExcel={supportsExcel}
          variant={variant === "bar" ? "sidebar" : variant}
        />
      ) : null}
      <div className={`relative ${supportsLayout ? "" : "w-full"}`}>
        <button
          ref={paletteTriggerRef}
          type="button"
          className={`${iconButtonClass[variant]}${supportsLayout ? "" : " w-full"}`}
          aria-expanded={paletteOpen}
          aria-label={`Color de ${meta.label}`}
          title={`Color de ${meta.label}`}
          onClick={() => setPaletteOpen((value) => !value)}
        >
          <Palette className="h-4 w-4 shrink-0" strokeWidth={2.25} aria-hidden />
        </button>
        {paletteOpen ? (
          <div className={`absolute ${pickerPositionClass} w-[21.25rem] max-w-[calc(100vw-1.5rem)]`}>
            <SurfacePalettePicker
              mode={meta.kind}
              currentId={currentId}
              contextId={contextId}
              title={meta.label}
              inline
              anchorRef={paletteTriggerRef}
              dismissOnOutsideClick
              onSelect={(paletteId) => setContextPalette(contextId, paletteId)}
              onClose={() => setPaletteOpen(false)}
            />
          </div>
        ) : null}
      </div>
    </>
  );
}

type SidebarPageSurfaceControlsProps = {
  contextId: UiSurfaceContextId;
  variant?: SidebarControlsVariant;
};

/** Controles de paleta y vista para la barra móvil superior. */
export function SidebarPageSurfaceControls({
  contextId,
  variant = "sidebar",
}: SidebarPageSurfaceControlsProps) {
  return (
    <CollapsibleControlsRow variant={variant}>
      <SidebarPageSurfaceControlsContent contextId={contextId} variant={variant} />
    </CollapsibleControlsRow>
  );
}

type SidebarFooterControlsProps = {
  contextId?: UiSurfaceContextId | null;
  variant?: "sidebar" | "rail";
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
};

/** Footer del sidebar: vista, paleta y ocultar panel en una sola fila de iconos. */
export function SidebarFooterControls({
  contextId,
  variant = "sidebar",
  sidebarCollapsed,
  onToggleSidebar,
}: SidebarFooterControlsProps) {
  return (
    <CollapsibleControlsRow variant={variant}>
      {contextId ? (
        <SidebarPageSurfaceControlsContent contextId={contextId} variant={variant} />
      ) : null}
      <SidebarCollapseButton
        collapsed={sidebarCollapsed}
        onToggle={onToggleSidebar}
      />
    </CollapsibleControlsRow>
  );
}
