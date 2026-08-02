"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  loadWarehouseInventoryCoreAction,
  loadWarehouseInventoryHistoryAction,
  saveWarehouseInventoryAction,
} from "@/app/actions/inventory";
import { listWarehousesAction } from "@/app/actions/warehouses";
import { getCurrentSessionAction } from "@/app/actions/session";
import type { InventoryAssignment, InventoryMovement } from "@/lib/inventory-types";
import type { InventoryStockItem } from "@/lib/inventory-stock";
import { mergeOrphanItemsIntoCategoryConfigs } from "@/lib/inventory-stock";
import {
  INVENTORY_STOCK_PAGE_SIZE,
  type WarehouseInventoryStockQuery,
} from "@/lib/inventory-stock-pagination";
import type { CategoryConfig } from "@/lib/inventory-tree";
import { dispatchOnboardingProgressChanged } from "@/lib/onboarding/refresh";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { sessionHasPermission } from "@/lib/auth/permissions";

export type InventoryBackendInitialData = {
  warehouses: { id: string; name: string; is_active: boolean; is_default: boolean }[];
  warehouseId: string;
  /** @deprecated Ignorado: con 2+ bodegas Inventario siempre permite elegir. */
  multiWarehouse?: boolean;
  canManageWarehouses?: boolean;
  categoryConfigs: CategoryConfig[];
  items: InventoryStockItem[];
  movements: InventoryMovement[];
  assignments: InventoryAssignment[];
  stockPage?: {
    limit: number;
    offset: number;
    hasMore: boolean;
  };
};

const SAVE_DEBOUNCE_MS = 600;

function snapshotInventory(
  warehouseId: string,
  categoryConfigs: CategoryConfig[],
  items: InventoryStockItem[],
) {
  return JSON.stringify({ warehouseId, categoryConfigs, items });
}

export function useInventoryBackend(initialData?: InventoryBackendInitialData) {
  const enabled = isSupabaseConfigured();
  const [warehouses, setWarehouses] = useState<
    { id: string; name: string; is_active: boolean; is_default: boolean }[]
  >(initialData?.warehouses || []);
  const [warehouseId, setWarehouseId] = useState(initialData?.warehouseId || "");
  const [canManageWarehouses, setCanManageWarehouses] = useState(
    Boolean(initialData?.canManageWarehouses),
  );
  const [categoryConfigs, setCategoryConfigs] = useState<CategoryConfig[]>(
    initialData?.categoryConfigs || [],
  );
  const [inventoryItems, setInventoryItems] = useState<InventoryStockItem[]>(
    initialData?.items || [],
  );
  const [movements, setMovements] = useState<InventoryMovement[]>(initialData?.movements || []);
  const [assignments, setAssignments] = useState<InventoryAssignment[]>(
    initialData?.assignments || [],
  );
  const [stockOffset, setStockOffset] = useState(initialData?.stockPage?.offset ?? 0);
  const [stockHasMore, setStockHasMore] = useState(
    Boolean(initialData?.stockPage?.hasMore),
  );
  const [stockLoading, setStockLoading] = useState(false);
  const [stockCategoryName, setStockCategoryName] = useState("");
  const [loaded, setLoaded] = useState(!enabled || Boolean(initialData));
  const [error, setError] = useState("");
  const inventoryHydratedRef = useRef(Boolean(initialData?.warehouseId));
  const categorySaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastLoadedWarehouse = useRef(initialData?.warehouseId || "");
  const initialHistoryLoadedRef = useRef(
    Boolean(initialData?.movements.length || initialData?.assignments.length),
  );
  const lastSavedInventoryRef = useRef(
    initialData
      ? snapshotInventory(
          initialData.warehouseId,
          initialData.categoryConfigs,
          initialData.items,
        )
      : "",
  );
  const categoryConfigsRef = useRef(categoryConfigs);
  const inventoryItemsRef = useRef(inventoryItems);
  const warehouseIdRef = useRef(warehouseId);
  const stockOffsetRef = useRef(stockOffset);
  const stockCategoryNameRef = useRef(stockCategoryName);
  const inflightSaveRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    categoryConfigsRef.current = categoryConfigs;
    inventoryItemsRef.current = inventoryItems;
    warehouseIdRef.current = warehouseId;
    stockOffsetRef.current = stockOffset;
    stockCategoryNameRef.current = stockCategoryName;
  }, [categoryConfigs, inventoryItems, stockCategoryName, stockOffset, warehouseId]);

  const activeWarehouses = useMemo(
    () => warehouses.filter((warehouse) => warehouse.is_active),
    [warehouses],
  );

  const clearSaveTimers = useCallback(() => {
    if (categorySaveTimer.current) {
      clearTimeout(categorySaveTimer.current);
      categorySaveTimer.current = null;
    }
  }, []);

  const persistInventory = useCallback(
    async (
      targetWarehouseId: string,
      configs: CategoryConfig[],
      items: InventoryStockItem[],
    ) => {
      const syncedConfigs = mergeOrphanItemsIntoCategoryConfigs(configs, items);

      if (syncedConfigs !== configs) {
        categoryConfigsRef.current = syncedConfigs;
        setCategoryConfigs(syncedConfigs);
      }

      const snapshot = snapshotInventory(targetWarehouseId, syncedConfigs, items);
      const result = await saveWarehouseInventoryAction({
        warehouseId: targetWarehouseId,
        categoryConfigs: syncedConfigs,
        items,
      });

      if (!result.ok) {
        setError(result.error);
        return false;
      }

      if (warehouseIdRef.current === targetWarehouseId) {
        lastSavedInventoryRef.current = snapshot;
      }

      dispatchOnboardingProgressChanged();
      return true;
    },
    [],
  );

  const flushSaves = useCallback(
    async (stockWarehouseId?: string) => {
      clearSaveTimers();

      const run = async () => {
        const stockTarget = stockWarehouseId ?? warehouseIdRef.current;

        if (!stockTarget) {
          return;
        }

        const inventorySnapshot = snapshotInventory(
          stockTarget,
          categoryConfigsRef.current,
          inventoryItemsRef.current,
        );

        if (inventorySnapshot === lastSavedInventoryRef.current) {
          return;
        }

        await persistInventory(
          stockTarget,
          categoryConfigsRef.current,
          inventoryItemsRef.current,
        );
      };

      const pending = inflightSaveRef.current
        ? inflightSaveRef.current.then(() => run())
        : run();

      inflightSaveRef.current = pending.finally(() => {
        if (inflightSaveRef.current === pending) {
          inflightSaveRef.current = null;
        }
      });

      await pending;
    },
    [clearSaveTimers, persistInventory],
  );

  const persistCategoryConfigs = useCallback(
    async (nextCategoryConfigs: CategoryConfig[]) => {
      categoryConfigsRef.current = nextCategoryConfigs;
      setCategoryConfigs(nextCategoryConfigs);
      await flushSaves();
    },
    [flushSaves],
  );

  const loadRemote = useCallback(
    async (
      targetWarehouseId: string,
      query?: WarehouseInventoryStockQuery & { skipHistory?: boolean },
    ) => {
      const offset = Math.max(query?.offset ?? 0, 0);
      const categoryName = query?.categoryName?.trim() || "";
      setStockLoading(true);

      const coreResult = await loadWarehouseInventoryCoreAction(targetWarehouseId, {
        limit: query?.limit ?? INVENTORY_STOCK_PAGE_SIZE,
        offset,
        search: query?.search,
        categoryId: query?.categoryId,
        categoryName: categoryName || undefined,
        kind: query?.kind,
        debugCounts: query?.debugCounts,
      });

      if (!coreResult.ok) {
        setError(coreResult.error);
        setLoaded(true);
        inventoryHydratedRef.current = false;
        setStockLoading(false);
        return;
      }

      lastSavedInventoryRef.current = snapshotInventory(
        targetWarehouseId,
        coreResult.data.categoryConfigs,
        coreResult.data.items,
      );
      setCategoryConfigs(coreResult.data.categoryConfigs);
      setInventoryItems(coreResult.data.items);
      setStockOffset(coreResult.data.stockPage.offset);
      setStockHasMore(coreResult.data.stockPage.hasMore);
      setStockCategoryName(categoryName);
      lastLoadedWarehouse.current = targetWarehouseId;
      inventoryHydratedRef.current = true;
      setLoaded(true);
      setStockLoading(false);

      if (query?.skipHistory) {
        return;
      }

      void loadWarehouseInventoryHistoryAction(targetWarehouseId).then((historyResult) => {
        if (!historyResult.ok) {
          setError(historyResult.error);
          return;
        }

        setMovements(historyResult.data.movements);
        setAssignments(historyResult.data.assignments);
      });
    },
    [],
  );

  const reloadCurrentStockPage = useCallback(
    async (overrides?: WarehouseInventoryStockQuery) => {
      const targetWarehouseId = warehouseIdRef.current;

      if (!targetWarehouseId) {
        return;
      }

      await loadRemote(targetWarehouseId, {
        offset: overrides?.offset ?? stockOffsetRef.current,
        categoryName:
          overrides?.categoryName !== undefined
            ? overrides.categoryName
            : stockCategoryNameRef.current || undefined,
        categoryId: overrides?.categoryId,
        search: overrides?.search,
        kind: overrides?.kind,
        limit: overrides?.limit,
        debugCounts: overrides?.debugCounts,
        skipHistory: true,
      });
    },
    [loadRemote],
  );

  const goToStockPage = useCallback(
    async (nextOffset: number) => {
      const targetWarehouseId = warehouseIdRef.current;

      if (!targetWarehouseId || stockLoading) {
        return;
      }

      await loadRemote(targetWarehouseId, {
        offset: Math.max(nextOffset, 0),
        categoryName: stockCategoryNameRef.current || undefined,
        skipHistory: true,
      });
    },
    [loadRemote, stockLoading],
  );

  const setStockCategoryFilter = useCallback(
    async (categoryName: string) => {
      const targetWarehouseId = warehouseIdRef.current;
      const nextName = categoryName.trim();

      if (!targetWarehouseId) {
        setStockCategoryName(nextName);
        setStockOffset(0);
        return;
      }

      if (nextName === stockCategoryNameRef.current && stockOffsetRef.current === 0) {
        return;
      }

      await loadRemote(targetWarehouseId, {
        offset: 0,
        categoryName: nextName || undefined,
        skipHistory: true,
      });
    },
    [loadRemote],
  );

  useEffect(() => {
    if (
      !enabled ||
      !warehouseId ||
      initialHistoryLoadedRef.current ||
      !initialData?.warehouseId
    ) {
      return;
    }

    initialHistoryLoadedRef.current = true;

    void loadWarehouseInventoryHistoryAction(warehouseId).then((result) => {
      if (!result.ok) {
        return;
      }

      setMovements(result.data.movements);
      setAssignments(result.data.assignments);
    });
  }, [enabled, initialData?.warehouseId, warehouseId]);

  useEffect(() => {
    if (!enabled || initialData) {
      return;
    }

    async function bootstrap() {
      const [sessionResult, warehousesResult] = await Promise.all([
        getCurrentSessionAction(),
        listWarehousesAction(),
      ]);

      if (!warehousesResult.ok) {
        setError(warehousesResult.error);
        setLoaded(true);
        return;
      }

      const active = warehousesResult.data.filter((warehouse) => warehouse.is_active);
      setWarehouses(active);

      const session = sessionResult.ok ? sessionResult.data : null;

      if (session) {
        setCanManageWarehouses(
          sessionHasPermission(session, "warehouses.manage"),
        );
      }

      const defaultWarehouse =
        (session?.preferredWarehouseId &&
          active.find((warehouse) => warehouse.id === session.preferredWarehouseId)) ||
        active.find((warehouse) => warehouse.is_default) ||
        active[0] ||
        null;

      if (!defaultWarehouse) {
        setLoaded(true);
        return;
      }

      setWarehouseId(defaultWarehouse.id);
      await loadRemote(defaultWarehouse.id, { offset: 0 });
    }

    queueMicrotask(() => {
      void bootstrap();
    });
  }, [enabled, initialData, loadRemote]);

  useEffect(() => {
    if (!enabled || !warehouseId || warehouseId === lastLoadedWarehouse.current) {
      return;
    }

    const previousWarehouse = lastLoadedWarehouse.current;

    queueMicrotask(() => {
      void (async () => {
        if (previousWarehouse) {
          await flushSaves(previousWarehouse);
        }

        setStockOffset(0);
        setStockCategoryName("");
        await loadRemote(warehouseId, { offset: 0 });
      })();
    });
  }, [enabled, flushSaves, loadRemote, warehouseId]);

  useEffect(() => {
    if (!enabled || !loaded || !inventoryHydratedRef.current) {
      return;
    }

    if (inventoryItems.length === 0 && categoryConfigs.length === 0) {
      return;
    }

    if (!warehouseId) {
      return;
    }

    const inventorySnapshot = snapshotInventory(
      warehouseId,
      categoryConfigs,
      inventoryItems,
    );

    if (inventorySnapshot === lastSavedInventoryRef.current) {
      return;
    }

    if (categorySaveTimer.current) {
      clearTimeout(categorySaveTimer.current);
    }

    const targetWarehouseId = warehouseId;

    categorySaveTimer.current = setTimeout(() => {
      categorySaveTimer.current = null;

      if (warehouseIdRef.current !== targetWarehouseId) {
        return;
      }

      void persistInventory(
        targetWarehouseId,
        categoryConfigsRef.current,
        inventoryItemsRef.current,
      );
    }, SAVE_DEBOUNCE_MS);

    return () => {
      if (categorySaveTimer.current) {
        clearTimeout(categorySaveTimer.current);
        categorySaveTimer.current = null;
      }
    };
  }, [categoryConfigs, enabled, inventoryItems, loaded, persistInventory, warehouseId]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    function handleBeforeUnload() {
      void flushSaves();
    }

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      void flushSaves();
    };
  }, [enabled, flushSaves]);

  const stockPage = Math.floor(stockOffset / INVENTORY_STOCK_PAGE_SIZE);

  return {
    enabled,
    loaded,
    error,
    canManageWarehouses,
    warehouses: activeWarehouses,
    setWarehouses,
    warehouseId,
    setWarehouseId,
    categoryConfigs,
    setCategoryConfigs,
    persistCategoryConfigs,
    inventoryItems,
    setInventoryItems,
    movements,
    setMovements,
    assignments,
    setAssignments,
    stockPage,
    stockOffset,
    stockHasMore,
    stockLoading,
    stockCategoryName,
    reloadCurrentStockPage,
    goToStockPage,
    setStockCategoryFilter,
  };
}
