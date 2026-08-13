"use client";

import { ChevronRight } from "lucide-react";
import { useCallback, useRef, useState, type ReactNode } from "react";

export type ContextMenuFlyoutSide = "left" | "right";

/** Prefers opening to the right; flips left when the panel would leave the viewport. */
export function resolveContextMenuFlyoutSide(
  anchor: Pick<DOMRect, "left" | "right">,
  panelWidth: number,
  padding = 8,
): ContextMenuFlyoutSide {
  const width = Math.max(0, panelWidth);
  const spaceRight = window.innerWidth - anchor.right - padding;
  const spaceLeft = anchor.left - padding;

  if (spaceRight >= width) {
    return "right";
  }
  if (spaceLeft >= width) {
    return "left";
  }
  return spaceLeft > spaceRight ? "left" : "right";
}

export function contextMenuFlyoutSideClass(side: ContextMenuFlyoutSide) {
  return side === "left"
    ? "right-[calc(100%-1px)] left-auto"
    : "left-[calc(100%-1px)]";
}

type ContextMenuFlyoutProps = {
  title: string;
  icon: ReactNode;
  detail?: string;
  active?: boolean;
  scheduleChanged?: boolean;
  panelClassName?: string;
  onMouseEnter?: () => void;
  children: ReactNode;
};

export function ContextMenuFlyout({
  title,
  icon,
  detail,
  active = false,
  scheduleChanged = false,
  panelClassName = "min-w-[16rem]",
  onMouseEnter,
  children,
}: ContextMenuFlyoutProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [side, setSide] = useState<ContextMenuFlyoutSide>("right");
  const [alignBottom, setAlignBottom] = useState(false);

  const updatePlacement = useCallback(() => {
    const root = rootRef.current;
    const panel = panelRef.current;
    if (!root) {
      return;
    }

    const rect = root.getBoundingClientRect();
    const width = panel?.offsetWidth || 256;
    const height = panel?.offsetHeight || 200;
    const nextSide = resolveContextMenuFlyoutSide(rect, width);
    const fitsBelow = rect.top + height <= window.innerHeight - 8;

    setSide(nextSide);
    setAlignBottom(!fitsBelow);
  }, []);

  return (
    <div
      ref={rootRef}
      className="group relative mt-1"
      onMouseEnter={() => {
        updatePlacement();
        onMouseEnter?.();
      }}
    >
      <button
        type="button"
        className={`flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2 text-left font-black hover:bg-surface-card ${
          active ? "bg-emerald-950/20" : ""
        }`}
      >
        <span className="text-emerald-300">{icon}</span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm text-[#f8fafc]">{title}</span>
          {detail ? (
            <span className="mt-0.5 block text-[11px] font-bold leading-snug text-slate-500">
              {detail}
            </span>
          ) : null}
          {active ? (
            <span className="mt-1 inline-flex rounded border border-emerald-700/50 bg-emerald-950/40 px-1.5 py-0.5 text-[10px] font-black uppercase text-emerald-300">
              Actual
            </span>
          ) : null}
          {scheduleChanged ? (
            <span className="mt-1 inline-flex rounded border border-amber-700/50 bg-amber-950/30 px-1.5 py-0.5 text-[10px] font-black uppercase text-amber-200">
              Fecha modificada
            </span>
          ) : null}
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-slate-500" />
      </button>

      <div
        ref={panelRef}
        data-context-menu-flyout-panel
        data-flyout-side={side}
        className={`invisible absolute z-50 rounded-xl border border-black bg-surface-panel p-2 opacity-0 shadow-2xl delay-300 duration-150 group-hover:visible group-hover:opacity-100 group-hover:delay-0 ${
          alignBottom ? "bottom-0 top-auto" : "top-0"
        } ${contextMenuFlyoutSideClass(side)} ${panelClassName}`}
      >
        {children}
      </div>
    </div>
  );
}
