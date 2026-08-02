"use client";

import { useEffect, useState } from "react";
import {
  countConductorRouteUnreadNotificationsAction,
  listConductorRouteNotificationsAction,
  markConductorRouteNotificationReadAction,
  type LogisticsRouteNotification,
} from "@/app/actions/conductor-tasks";
import { CONDUCTOR_ROUTE_NOTIFICATIONS_PAGE_SIZE } from "@/lib/conductor-route-notifications";
import { labelMutedClass, textMutedClass } from "@/components/ui-blocks";

function mergeById(
  existing: LogisticsRouteNotification[],
  incoming: LogisticsRouteNotification[],
): LogisticsRouteNotification[] {
  if (!incoming.length) return existing;
  const seen = new Set(existing.map((row) => row.id));
  const appended = incoming.filter((row) => !seen.has(row.id));
  return appended.length ? [...existing, ...appended] : existing;
}

export function ConductorRouteNotificationsPanel() {
  const [items, setItems] = useState<LogisticsRouteNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [listResult, countResult] = await Promise.all([
        listConductorRouteNotificationsAction({
          limit: CONDUCTOR_ROUTE_NOTIFICATIONS_PAGE_SIZE,
          offset: 0,
        }),
        countConductorRouteUnreadNotificationsAction(),
      ]);
      if (cancelled) return;
      if (listResult.ok) {
        setItems(listResult.data);
        setOffset(listResult.data.length);
        setHasMore(listResult.data.length === CONDUCTOR_ROUTE_NOTIFICATIONS_PAGE_SIZE);
      }
      if (countResult.ok) {
        setUnreadCount(countResult.data);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function loadMore() {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const result = await listConductorRouteNotificationsAction({
      limit: CONDUCTOR_ROUTE_NOTIFICATIONS_PAGE_SIZE,
      offset,
    });
    if (result.ok) {
      setItems((rows) => mergeById(rows, result.data));
      setOffset((current) => current + result.data.length);
      setHasMore(result.data.length === CONDUCTOR_ROUTE_NOTIFICATIONS_PAGE_SIZE);
    }
    setLoadingMore(false);
  }

  async function markRead(id: string) {
    const target = items.find((row) => row.id === id);
    if (!target || target.readAt) return;

    const result = await markConductorRouteNotificationReadAction(id);
    if (!result.ok) return;

    setItems((rows) =>
      rows.map((row) =>
        row.id === id ? { ...row, readAt: new Date().toISOString() } : row,
      ),
    );
    setUnreadCount((count) => Math.max(0, count - 1));
  }

  if (loading || !items.length) {
    return null;
  }

  return (
    <section className="mb-4 rounded-xl border border-amber-800/50 bg-amber-950/20 px-4 py-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className={labelMutedClass}>Cambios en tu ruta</p>
        {unreadCount > 0 ? (
          <span className="rounded-md border border-amber-700/60 bg-amber-950/40 px-2 py-0.5 text-[10px] font-black text-amber-200">
            {unreadCount} sin leer
          </span>
        ) : null}
      </div>
      <ul className="grid gap-2">
        {items.map((item) => (
          <li
            key={item.id}
            className={`rounded-lg border px-3 py-2 ${
              item.readAt
                ? "border-black/60 bg-surface-inset/40"
                : "border-amber-700/50 bg-amber-950/30"
            }`}
          >
            <p className="text-sm font-black text-slate-100">{item.summary}</p>
            <p className={`mt-1 text-xs font-bold ${textMutedClass}`}>
              {item.actorName || "Logística"} · {new Date(item.createdAt).toLocaleString()}
            </p>
            {!item.readAt ? (
              <button
                type="button"
                className="mt-2 text-[11px] font-black text-amber-200 underline"
                onClick={() => void markRead(item.id)}
              >
                Marcar como leído
              </button>
            ) : null}
          </li>
        ))}
      </ul>
      {hasMore ? (
        <button
          type="button"
          className="mt-3 text-[11px] font-black text-amber-200 underline disabled:opacity-60"
          disabled={loadingMore}
          onClick={() => void loadMore()}
        >
          {loadingMore ? "Cargando…" : "Cargar más"}
        </button>
      ) : null}
    </section>
  );
}
