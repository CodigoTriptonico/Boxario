"use client";

import { useEffect, type ReactNode } from "react";

type SaleDocumentPartyEditDialogProps = {
  open: boolean;
  title: string;
  subtitle?: string;
  children: ReactNode;
  onClose: () => void;
};

export function SaleDocumentPartyEditDialog({
  open,
  title,
  subtitle,
  children,
  onClose,
}: SaleDocumentPartyEditDialogProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="app-modal-overlay fixed inset-0 z-[145] flex justify-center bg-black/75 p-3 sm:p-4"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="app-modal-content flex max-h-[min(94vh,980px)] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-black bg-surface-panel shadow-[0_24px_80px_rgba(0,0,0,0.55)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sale-document-party-edit-title"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <header className="shrink-0 border-b border-black px-4 py-3 sm:px-5">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
            Corregir en documento
          </p>
          <p
            id="sale-document-party-edit-title"
            className="mt-1 text-lg font-black text-[#f8fafc] sm:text-xl"
          >
            {title}
          </p>
          {subtitle ? (
            <p className="mt-0.5 truncate text-sm font-bold text-slate-400">{subtitle}</p>
          ) : null}
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">{children}</div>
      </div>
    </div>
  );
}
