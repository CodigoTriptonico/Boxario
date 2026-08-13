"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useHydrated } from "@/hooks/use-hydrated";
import {
  resolveFloatingPanelPosition,
  type FloatingPanelAlign,
} from "@/lib/floating-panel-position";

type FloatingPosition = ReturnType<typeof resolveFloatingPanelPosition>;

export function AnchoredMenu({
  ariaLabel,
  trigger,
  children,
  align = "right",
  panelWidth = 208,
  triggerClassName = "",
  panelClassName = "",
}: {
  ariaLabel: string;
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: FloatingPanelAlign;
  panelWidth?: number;
  triggerClassName?: string;
  panelClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const mounted = useHydrated();
  const [position, setPosition] = useState<FloatingPosition | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  const updatePosition = useCallback(() => {
    const anchor = triggerRef.current;
    if (!anchor) return;

    setPosition(
      resolveFloatingPanelPosition({
        trigger: anchor.getBoundingClientRect(),
        panelWidth,
        panelHeight: panelRef.current?.scrollHeight || 160,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        align,
      }),
    );
  }, [align, panelWidth]);

  useLayoutEffect(() => {
    if (!open || !mounted) return;

    updatePosition();
    const frame = window.requestAnimationFrame(updatePosition);
    return () => window.cancelAnimationFrame(frame);
  }, [mounted, open, updatePosition]);

  useEffect(() => {
    if (!open) return;

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    }

    function closeOnOutsidePointer(event: PointerEvent) {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    }

    const attachId = window.setTimeout(() => {
      window.addEventListener("pointerdown", closeOnOutsidePointer);
    }, 0);

    window.addEventListener("keydown", closeOnEscape);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.clearTimeout(attachId);
      window.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("pointerdown", closeOnOutsidePointer);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, updatePosition]);

  const panel =
    open && mounted
      ? createPortal(
          <div
            ref={panelRef}
            id={panelId}
            role="menu"
            aria-label={ariaLabel}
            onClick={(event) => {
              const target = event.target as Element;
              if (target.closest("a[href], button")) setOpen(false);
            }}
            className={`fixed z-[280] grid gap-1 overflow-y-auto rounded-xl border border-black bg-surface-card p-1.5 shadow-[0_16px_36px_rgba(0,0,0,0.45)] ${panelClassName}`.trim()}
            style={{
              top: position?.top ?? 12,
              left: position?.left ?? 12,
              width: position?.width ?? `min(${panelWidth}px, calc(100vw - 1.5rem))`,
              maxHeight: position?.maxHeight ?? "calc(100dvh - 1.5rem)",
              visibility: position ? "visible" : "hidden",
            }}
          >
            {children}
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={triggerClassName}
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen((current) => !current)}
      >
        {trigger}
      </button>
      {panel}
    </>
  );
}
