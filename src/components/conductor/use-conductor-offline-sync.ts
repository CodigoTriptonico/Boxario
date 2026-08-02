"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CONDUCTOR_OFFLINE_CHANGED_EVENT,
  cacheConductorOfflineShell,
  flushConductorTaskResults,
  pruneSyncedConductorOperations,
  readConductorOfflineSnapshot,
  removeConductorOperationsForTask,
  requestConductorBackgroundSync,
  requestPersistentConductorStorage,
  retryConductorOfflineOperation,
} from "@/lib/conductor-offline/queue";
import {
  conductorOfflineGlobalLabel,
  summarizeConductorOfflineOperations,
} from "@/lib/conductor-offline/queue-core";
import type { ConductorOfflineScope } from "@/lib/conductor-offline/types";
import type { ConductorDriverTask } from "@/lib/conductor-tasks";

type UseConductorOfflineSyncOptions = {
  organizationId: string;
  userId: string;
  effectiveDriverId: string | null;
  initialCompletedTasks: ConductorDriverTask[];
};

export function useConductorOfflineSync({
  organizationId,
  userId,
  effectiveDriverId,
  initialCompletedTasks,
}: UseConductorOfflineSyncOptions) {
  const router = useRouter();
  const [online, setOnline] = useState(true);
  const [offlineSnapshot, setOfflineSnapshot] = useState(() => summarizeConductorOfflineOperations([]));
  const refreshAfterSyncRef = useRef(false);

  const offlineScope = useMemo<ConductorOfflineScope | null>(() => {
    if (!organizationId || !userId || !effectiveDriverId) return null;
    return { organizationId, userId, driverId: effectiveDriverId };
  }, [effectiveDriverId, organizationId, userId]);

  const offlineOperationByTaskId = useMemo(
    () => new Map(offlineSnapshot.operations.map((operation) => [operation.taskId, operation])),
    [offlineSnapshot.operations],
  );

  const offlineGlobalLabel = conductorOfflineGlobalLabel(offlineSnapshot, online);
  const hasSyncActivity = offlineSnapshot.pendingCount + offlineSnapshot.syncingCount > 0;

  const reloadOfflineSnapshot = useCallback(async () => {
    if (!offlineScope) {
      setOfflineSnapshot(summarizeConductorOfflineOperations([]));
      return summarizeConductorOfflineOperations([]);
    }
    const snapshot = await readConductorOfflineSnapshot(offlineScope);
    setOfflineSnapshot(snapshot);
    return snapshot;
  }, [offlineScope]);

  const syncOfflineResults = useCallback(async () => {
    if (!offlineScope || !navigator.onLine) return;
    const before = await readConductorOfflineSnapshot(offlineScope);
    const after = await flushConductorTaskResults(offlineScope);
    setOfflineSnapshot(after);
    if (after.syncedCount > before.syncedCount && !refreshAfterSyncRef.current) {
      refreshAfterSyncRef.current = true;
      router.refresh();
      window.setTimeout(() => {
        refreshAfterSyncRef.current = false;
      }, 2_000);
    }
  }, [offlineScope, router]);

  useEffect(() => {
    queueMicrotask(() => {
      setOnline(navigator.onLine);
    });
    void requestPersistentConductorStorage();
    if (offlineScope && navigator.onLine) {
      void cacheConductorOfflineShell(offlineScope);
    }
    queueMicrotask(() => {
      void reloadOfflineSnapshot().then(() => syncOfflineResults());
    });

    const handleOnline = () => {
      setOnline(true);
      void syncOfflineResults();
    };
    const handleOffline = () => setOnline(false);
    const handleChanged = () => void reloadOfflineSnapshot();
    const handleVisibility = () => {
      if (document.visibilityState === "visible") void syncOfflineResults();
    };
    const handleWorkerMessage = (event: MessageEvent) => {
      if (event.data?.type === "BOXARIO_CONDUCTOR_QUEUE_CHANGED") handleChanged();
    };
    const channel = typeof BroadcastChannel !== "undefined"
      ? new BroadcastChannel(CONDUCTOR_OFFLINE_CHANGED_EVENT)
      : null;
    if (channel) channel.onmessage = handleChanged;

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener(CONDUCTOR_OFFLINE_CHANGED_EVENT, handleChanged);
    document.addEventListener("visibilitychange", handleVisibility);
    navigator.serviceWorker?.addEventListener("message", handleWorkerMessage);
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void syncOfflineResults();
    }, 15_000);

    return () => {
      window.clearInterval(interval);
      channel?.close();
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener(CONDUCTOR_OFFLINE_CHANGED_EVENT, handleChanged);
      document.removeEventListener("visibilitychange", handleVisibility);
      navigator.serviceWorker?.removeEventListener("message", handleWorkerMessage);
    };
  }, [offlineScope, reloadOfflineSnapshot, syncOfflineResults]);

  useEffect(() => {
    if (!offlineScope) return;
    const completedIds = new Set(initialCompletedTasks.map((task) => task.id));
    void pruneSyncedConductorOperations(offlineScope, completedIds).then(reloadOfflineSnapshot);
  }, [initialCompletedTasks, offlineScope, reloadOfflineSnapshot]);

  async function handleRetrySync(operationId: string) {
    await retryConductorOfflineOperation(operationId);
    await reloadOfflineSnapshot();
    void requestConductorBackgroundSync();
    void syncOfflineResults();
  }

  async function handleRetryAllSync() {
    const operations = offlineSnapshot.operations.filter(
      (operation) => operation.status === "needs_attention",
    );
    await Promise.all(operations.map((operation) => retryConductorOfflineOperation(operation.id)));
    await reloadOfflineSnapshot();
    void requestConductorBackgroundSync();
    void syncOfflineResults();
  }

  async function removeOperationsForTask(taskId: string) {
    if (!offlineScope) return;
    await removeConductorOperationsForTask(offlineScope, taskId);
    await reloadOfflineSnapshot();
  }

  return {
    online,
    offlineSnapshot,
    offlineScope,
    offlineOperationByTaskId,
    offlineGlobalLabel,
    hasSyncActivity,
    reloadOfflineSnapshot,
    syncOfflineResults,
    handleRetrySync,
    handleRetryAllSync,
    removeOperationsForTask,
  };
}
