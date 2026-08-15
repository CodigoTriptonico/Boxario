"use client";

import { type ReactNode, useEffect, useId, useRef } from "react";
import { secondaryButtonClass } from "@/components/ui-blocks";

export type ActionConfirmTone = "warning" | "danger";

export function actionConfirmButtonClass(tone: ActionConfirmTone = "warning") {
  if (tone === "danger") {
    return "h-11 rounded-lg border border-rose-700/60 bg-rose-950/50 text-sm font-black text-rose-100 hover:bg-rose-900/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-300 disabled:cursor-not-allowed disabled:opacity-40";
  }

  return "h-11 rounded-lg border border-amber-700/60 bg-amber-950/50 text-sm font-black text-amber-100 hover:bg-amber-900/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 disabled:cursor-not-allowed disabled:opacity-40";
}

type ActionConfirmDialogProps = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ActionConfirmTone;
  confirming?: boolean;
  confirmingLabel?: string;
  dialogId?: string;
  overlayClassName?: string;
  details?: ReactNode;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ActionConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  tone = "warning",
  confirming = false,
  confirmingLabel = "Guardando...",
  dialogId,
  overlayClassName = "z-[140]",
  details,
  onCancel,
  onConfirm,
}: ActionConfirmDialogProps) {
  const autoId = useId();
  const resolvedDialogId = dialogId || `action-confirm-${autoId}`;
  const panelRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const focusTimer = window.setTimeout(() => {
      // preventScroll: focusing the dialog must not scroll the page under the map.
      // Enter acepta: foco inicial en confirmar.
      confirmRef.current?.focus({ preventScroll: true });
    }, 0);

    function onKeyDown(event: KeyboardEvent) {
      if (confirming) return;

      if (event.key === "Escape") {
        event.preventDefault();
        onCancel();
        return;
      }

      // Enter confirma salvo que el foco esté en Cancelar.
      if (event.key === "Enter") {
        const active = document.activeElement;
        if (
          active instanceof HTMLElement &&
          active.dataset.actionConfirm === "cancel"
        ) {
          return;
        }
        event.preventDefault();
        onConfirm();
        return;
      }

      if (event.key !== "Tab" || !panelRef.current) {
        return;
      }

      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );

      if (focusable.length === 0) {
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus({ preventScroll: true });
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus({ preventScroll: true });
      }
    }

    document.addEventListener("keydown", onKeyDown);

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", onKeyDown);
      previousFocusRef.current?.focus?.({ preventScroll: true });
    };
  }, [open, confirming, onCancel, onConfirm]);

  if (!open) {
    return null;
  }

  return (
    <div
      className={`app-modal-overlay fixed inset-0 flex justify-center bg-black/70 p-3 sm:p-4 ${overlayClassName}`}
    >
      <button
        type="button"
        aria-label="Cerrar confirmación"
        className="absolute inset-0"
        onClick={onCancel}
        disabled={confirming}
      />
      <div
        ref={panelRef}
        id={resolvedDialogId}
        className="app-modal-content relative w-full max-w-sm rounded-xl border border-black bg-surface-panel p-5 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${resolvedDialogId}-title`}
        aria-describedby={`${resolvedDialogId}-message`}
      >
        <p id={`${resolvedDialogId}-title`} className="text-xl font-black text-[#f8fafc]">
          {title}
        </p>
        <p
          id={`${resolvedDialogId}-message`}
          className="mt-2 break-words text-sm font-bold leading-snug text-slate-400"
        >
          {message}
        </p>
        {details ? <div className="mt-3">{details}</div> : null}

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            disabled={confirming}
            data-action-confirm="cancel"
            className={`${secondaryButtonClass} h-11 text-sm font-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-300 disabled:opacity-40`}
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            disabled={confirming}
            data-action-confirm="confirm"
            aria-busy={confirming || undefined}
            className={actionConfirmButtonClass(tone)}
          >
            {confirming ? confirmingLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
