"use client";

import { createPortal } from "react-dom";
import { useHydrated } from "@/hooks/use-hydrated";

type PickerPanelPortalProps = {
  open: boolean;
  position: { top: number; left: number } | null;
  children: React.ReactNode;
};

export function PickerPanelPortal({ open, position, children }: PickerPanelPortalProps) {
  const mounted = useHydrated();

  if (!open || !position || !mounted) {
    return null;
  }

  return createPortal(
    <div
      className="fixed z-[270]"
      style={{
        top: position.top,
        left: position.left,
      }}
    >
      {children}
    </div>,
    document.body,
  );
}
