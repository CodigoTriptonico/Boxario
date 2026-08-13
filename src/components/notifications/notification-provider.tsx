"use client";

import { CheckCircle2, Info, X, XCircle } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export type NotificationTone = "success" | "error" | "info";

export type NotifyOptions = {
  /** Acción de Deshacer; alarga la duración del toast. */
  undo?: {
    label?: string;
    onUndo: () => void | Promise<void>;
  };
  durationMs?: number;
};

type NotificationItem = {
  id: string;
  message: string;
  tone: NotificationTone;
  undoLabel?: string;
  onUndo?: () => void | Promise<void>;
};

type NotifyInput = {
  success: (message: string, options?: NotifyOptions) => void;
  error: (message: string, options?: NotifyOptions) => void;
  info: (message: string, options?: NotifyOptions) => void;
};

const NotificationContext = createContext<NotifyInput | null>(null);

const AUTO_DISMISS_MS = 4500;
const UNDO_DISMISS_MS = 8000;
const MAX_VISIBLE = 5;

const toneStyles: Record<
  NotificationTone,
  { box: string; icon: typeof CheckCircle2 }
> = {
  success: {
    box: "border-emerald-700/70 bg-[#142820] text-emerald-100",
    icon: CheckCircle2,
  },
  error: {
    box: "border-rose-700/70 bg-[#281418] text-rose-100",
    icon: XCircle,
  },
  info: {
    box: "border-sky-700/70 bg-[#142028] text-sky-100",
    icon: Info,
  },
};

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    const timers = timersRef.current;

    return () => {
      for (const timer of timers.values()) {
        clearTimeout(timer);
      }
      timers.clear();
    };
  }, []);

  const dismiss = useCallback((id: string) => {
    const timer = timersRef.current.get(id);

    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }

    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const push = useCallback(
    (message: string, tone: NotificationTone, options?: NotifyOptions) => {
      const trimmed = message.trim();

      if (!trimmed) {
        return;
      }

      const id =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      const item: NotificationItem = {
        id,
        message: trimmed,
        tone,
        undoLabel: options?.undo ? options.undo.label || "Deshacer" : undefined,
        onUndo: options?.undo?.onUndo,
      };

      setItems((current) => {
        const next = [...current, item];
        return next.length > MAX_VISIBLE ? next.slice(-MAX_VISIBLE) : next;
      });

      const duration =
        options?.durationMs ??
        (options?.undo ? UNDO_DISMISS_MS : AUTO_DISMISS_MS);
      const timer = setTimeout(() => dismiss(id), duration);
      timersRef.current.set(id, timer);
    },
    [dismiss],
  );

  const notify = useMemo<NotifyInput>(
    () => ({
      success: (message, options) => push(message, "success", options),
      error: (message, options) => push(message, "error", options),
      info: (message, options) => push(message, "info", options),
    }),
    [push],
  );

  async function handleUndo(item: NotificationItem) {
    if (!item.onUndo) {
      return;
    }

    dismiss(item.id);

    try {
      await item.onUndo();
    } catch {
      push("No se pudo deshacer la acción. Inténtalo nuevamente.", "error");
    }
  }

  return (
    <NotificationContext.Provider value={notify}>
      {children}
      <div
        aria-live="polite"
        aria-relevant="additions"
        className="pointer-events-none fixed inset-x-3 bottom-3 z-[500] flex flex-col items-stretch gap-2 sm:inset-x-auto sm:bottom-5 sm:right-5 sm:w-[min(100vw-2rem,22rem)]"
      >
        {items.map((item) => {
          const tone = toneStyles[item.tone];
          const Icon = tone.icon;

          return (
            <div
              key={item.id}
              className={`pointer-events-auto flex items-start gap-3 rounded-xl border px-3 py-3 shadow-[0_14px_40px_rgba(0,0,0,0.45)] ${tone.box}`}
              role="status"
            >
              <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold leading-snug">{item.message}</p>
                {item.onUndo && item.undoLabel ? (
                  <button
                    type="button"
                    onClick={() => void handleUndo(item)}
                    className="mt-2 rounded-md border border-current/30 bg-white/5 px-2.5 py-1 text-xs font-black underline-offset-2 transition hover:bg-white/10 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
                  >
                    {item.undoLabel}
                  </button>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => dismiss(item.id)}
                className="shrink-0 rounded-md p-1 text-current transition hover:bg-white/10 hover:text-current focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
                aria-label="Cerrar notificación"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </NotificationContext.Provider>
  );
}

export function useNotify() {
  const notify = useContext(NotificationContext);

  if (!notify) {
    throw new Error("useNotify must be used inside NotificationProvider");
  }

  return notify;
}
