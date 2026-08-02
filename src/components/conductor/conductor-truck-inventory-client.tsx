"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Loader2,
  PackagePlus,
  Truck,
} from "lucide-react";
import {
  getConductorTruckInventoryAction,
  loadConductorTruckExtraAction,
  loadConductorTruckLineAction,
  returnConductorTruckLineAction,
  startConductorRouteAction,
  type ConductorTruckInventoryView,
} from "@/app/actions/conductor-tasks";
import { InlineSearchPicker } from "@/components/inline-search-picker";
import {
  RouteDeliverySection,
  TruckOnTruckSection,
} from "@/components/conductor/conductor-truck-sections";
import { ConductorTruckUnloadDialog } from "@/components/conductor/conductor-truck-unload-dialog";
import {
  Panel,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/components/ui-blocks";
import { useNotify } from "@/hooks/use-notify";
import {
  buildConductorPreviewPickerOptions,
  type ConductorDriverOption,
} from "@/lib/conductor-tareas-view";
import {
  buildExtraBoxesOnTruck,
  buildRouteDeliveryBoard,
  CONDUCTOR_TRUCK_RETURN_REASONS,
  isConductorTruckVehicleChangeReason,
  sumOnTruckLines,
  type ConductorTruckOnTruckLine,
} from "@/lib/conductor-truck-inventory";

type ConductorTruckInventoryClientProps = {
  canPreview?: boolean;
  drivers?: ConductorDriverOption[];
  previewDriverId?: string | null;
  effectiveDriverId?: string | null;
  effectiveDriverLabel?: string;
  initialView?: ConductorTruckInventoryView | null;
  initialError?: string;
};

type LocalTruckResult = {
  driverId: string | null;
  view: ConductorTruckInventoryView | null;
  error: string;
};

type UnloadDialogState = {
  line: ConductorTruckOnTruckLine;
} | null;

export function ConductorTruckInventoryClient({
  canPreview = false,
  drivers = [],
  previewDriverId = null,
  effectiveDriverId = null,
  effectiveDriverLabel = "Conductor",
  initialView = null,
  initialError = "",
}: ConductorTruckInventoryClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const notify = useNotify();
  const previewOptions = buildConductorPreviewPickerOptions(drivers);
  const [localResult, setLocalResult] = useState<LocalTruckResult | null>(null);
  const [busyKey, setBusyKey] = useState("");
  const [extraStockKey, setExtraStockKey] = useState("");
  const [extraQty, setExtraQty] = useState("1");
  const [loadQuantities, setLoadQuantities] = useState<Record<string, string>>({});
  const [unloadDialog, setUnloadDialog] = useState<UnloadDialogState>(null);
  const [unloadQty, setUnloadQty] = useState("1");
  const [unloadReason, setUnloadReason] = useState<string>(CONDUCTOR_TRUCK_RETURN_REASONS[0]);
  const [unloadNote, setUnloadNote] = useState("");
  const [unloadTargetVehicleId, setUnloadTargetVehicleId] = useState("");
  const localResultMatches = localResult?.driverId === effectiveDriverId;
  const view = localResultMatches ? localResult.view : initialView;
  const error = localResultMatches ? localResult.error : initialError;

  const handlePreviewDriverChange = useCallback(
    (nextDriverId: string) => {
      const params = new URLSearchParams(searchParams.toString());

      if (nextDriverId) {
        params.set("conductor", nextDriverId);
      } else {
        params.delete("conductor");
      }

      const query = params.toString();
      router.replace(query ? `/conductor/inventario-camion?${query}` : "/conductor/inventario-camion", {
        scroll: false,
      });
    },
    [router, searchParams],
  );

  async function refreshTruck() {
    if (!effectiveDriverId) {
      return;
    }

    const result = await getConductorTruckInventoryAction(effectiveDriverId);
    if (result.ok) {
      setLocalResult({ driverId: result.data.driverId, view: result.data, error: "" });
    }
  }

  async function loadLine(lineKey: string, qty: number) {
    setBusyKey(`load:${lineKey}`);

    try {
      const result = await loadConductorTruckLineAction({
        driverId: canPreview ? effectiveDriverId : null,
        lineKey,
        qty,
      });

      if (!result.ok) {
        notify.error(result.error);
        return;
      }

      setLocalResult({ driverId: result.data.driverId, view: result.data, error: "" });
      const updatedLine = result.data.summary.lines.find((line) => line.key === lineKey);
      if (updatedLine) {
        setLoadQuantities((current) => ({
          ...current,
          [lineKey]: String(Math.min(updatedLine.shortageQty, updatedLine.stockQty)),
        }));
      }
      notify.success("Caja cargada");
    } finally {
      setBusyKey("");
    }
  }

  async function loadExtra() {
    const selected = view?.stock.find(
      (item) => `${item.warehouseId}:${item.itemId}` === extraStockKey,
    );

    if (!selected || !view) {
      notify.error("Selecciona una caja");
      return;
    }

    setBusyKey("extra");

    try {
      const result = await loadConductorTruckExtraAction({
        driverId: canPreview ? effectiveDriverId : null,
        routeId: view.selectedRouteId,
        itemId: selected.itemId,
        warehouseId: selected.warehouseId,
        qty: Number(extraQty),
      });

      if (!result.ok) {
        notify.error(result.error);
        return;
      }

      setLocalResult({ driverId: result.data.driverId, view: result.data, error: "" });
      notify.success("Caja extra cargada");
    } finally {
      setBusyKey("");
    }
  }

  async function returnLine(
    line: ConductorTruckOnTruckLine,
    qty: number,
    reason: string,
    note: string,
    targetVehicleId: string,
  ) {
    setBusyKey(`return:${line.lineKey}`);

    try {
      const result = await returnConductorTruckLineAction({
        driverId: canPreview ? effectiveDriverId : null,
        lineKey: line.lineKey,
        qty,
        reason,
        note,
        origin: line.origin,
        targetVehicleId: isConductorTruckVehicleChangeReason(reason) ? targetVehicleId : null,
      });

      if (!result.ok) {
        notify.error(result.error);
        return;
      }

      setLocalResult({ driverId: result.data.driverId, view: result.data, error: "" });
      setUnloadDialog(null);
      setUnloadNote("");
      setUnloadTargetVehicleId("");
      notify.success("Caja bajada a bodega");
    } finally {
      setBusyKey("");
    }
  }

  async function startRoute() {
    if (!view?.selectedRouteId) {
      notify.error("Selecciona una ruta");
      return;
    }

    setBusyKey("start");

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error("GPS no disponible en este dispositivo"));
          return;
        }
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        });
      }).catch((error: unknown) => {
        throw new Error(
          error instanceof Error ? error.message : "No se pudo obtener la ubicacion GPS",
        );
      });

      const result = await startConductorRouteAction({
        routeId: view.selectedRouteId,
        driverId: canPreview ? effectiveDriverId : null,
        startedLat: position.coords.latitude,
        startedLng: position.coords.longitude,
      });

      if (!result.ok) {
        notify.error(result.error);
        await refreshTruck();
        return;
      }

      setLocalResult({ driverId: result.data.driverId, view: result.data, error: "" });
      notify.success("Ruta iniciada");
      router.push("/conductor/tareas");
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "No se pudo iniciar la ruta");
    } finally {
      setBusyKey("");
    }
  }

  const summary = view?.summary;
  const lines = summary?.lines ?? [];
  const ready = Boolean(summary?.ready);
  const hasRequiredBoxes = Boolean(summary && summary.requiredTotal > 0);
  const pendingLoadLines = lines.filter(
    (line) => line.requiredQty > 0 && line.shortageQty > 0,
  );
  const routeDeliveryBoard = buildRouteDeliveryBoard(lines);
  const extraBoxLines = buildExtraBoxesOnTruck(lines);
  const extraBoxTotal = sumOnTruckLines(extraBoxLines);
  const fullBoxLines = new Map<string, { label: string; quantity: number }>();

  for (const cargoLine of view?.cargo.lines || []) {
    if (cargoLine.pendingQty <= 0) {
      continue;
    }

    const current = fullBoxLines.get(cargoLine.label) || {
      label: cargoLine.label,
      quantity: 0,
    };
    current.quantity += cargoLine.pendingQty;
    fullBoxLines.set(cargoLine.label, current);
  }

  const fullBoxInventory = [...fullBoxLines.values()].sort((left, right) =>
    left.label.localeCompare(right.label, "es"),
  );
  const fullBoxTotal = view?.cargo.pendingTotal ?? 0;
  const transferVehicles = view?.transferVehicles ?? [];
  const extraStock = (view?.stock || [])
    .filter((item) => item.stock > 0)
    .sort((left, right) => left.itemName.localeCompare(right.itemName, "es"));

  function openUnloadDialog(line: ConductorTruckOnTruckLine) {
    setUnloadQty(String(line.maxReturnQty));
    setUnloadReason(CONDUCTOR_TRUCK_RETURN_REASONS[0]);
    setUnloadNote("");
    setUnloadTargetVehicleId("");
    setUnloadDialog({ line });
  }

  function handleUnloadReasonChange(reason: string) {
    setUnloadReason(reason);
    if (!isConductorTruckVehicleChangeReason(reason)) {
      setUnloadTargetVehicleId("");
    }
  }

  const unloadNeedsVehicle = isConductorTruckVehicleChangeReason(unloadReason);
  const unloadVehicleReady = !unloadNeedsVehicle || Boolean(unloadTargetVehicleId);

  function handleLoadQuantityChange(lineKey: string, value: string) {
    setLoadQuantities((current) => ({
      ...current,
      [lineKey]: value,
    }));
  }

  const routeBoardRef = useRef(false);

  useEffect(() => {
    if (routeBoardRef.current) {
      return;
    }

    if (searchParams.get("subir") !== "1") {
      return;
    }

    if (!pendingLoadLines.length) {
      return;
    }

    routeBoardRef.current = true;
    document.getElementById("route-delivery-board")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, [searchParams, pendingLoadLines.length]);

  return (
    <div className="flex min-h-0 flex-col lg:flex-1 lg:overflow-hidden">
      <Panel
        title="Inventario camion"
        hideHeader
        contentClassName="flex min-h-0 flex-1 flex-col p-3 sm:p-4"
      >
        {canPreview ? (
          <div className="mb-3 flex flex-col gap-3 rounded-lg border border-sky-700/50 bg-sky-950/30 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase text-sky-300">Vista previa admin</p>
              <p className="text-sm font-bold text-sky-100">Carga de {effectiveDriverLabel}. Tus acciones quedan en historial como admin.</p>
            </div>
            <InlineSearchPicker
              value={previewDriverId || ""}
              onChange={handlePreviewDriverChange}
              options={previewOptions}
              placeholder="Elegir conductor"
              searchPlaceholder="Buscar conductor"
              emptyLabel="Sin conductores"
              ariaLabel="Conductor a previsualizar"
              minWidthClass="min-w-[12rem] sm:min-w-[16rem]"
              disabled={!previewOptions.length}
            />
          </div>
        ) : null}

        {error ? (
          <div className="mb-4 rounded-xl border border-rose-900/70 bg-rose-950/35 px-4 py-3 text-sm font-black text-rose-100">
            {error}
          </div>
        ) : null}

        {summary && ready && hasRequiredBoxes ? (
          <div className="mb-3 flex items-center gap-2 px-1 text-xs font-black text-emerald-200">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
            Carga lista
          </div>
        ) : null}

        <details className="group mb-3 w-fit max-w-full rounded-lg border border-black bg-surface-card">
          <summary className="flex h-10 w-fit max-w-full cursor-pointer list-none items-center gap-2 px-3 text-xs font-black text-slate-300 marker:content-none">
            <PackagePlus className="h-4 w-4 text-sky-300" />
            <span>Cajas extra</span>
          </summary>
          <div className="border-t border-black px-3 py-3">
            <p className="mb-2 text-[11px] font-bold text-slate-400">
              Llevar cajas de bodega sin asignarlas a una entrega.
            </p>
            <div className="grid gap-2 sm:grid-cols-[minmax(14rem,1fr)_5rem_auto]">
              <select
                value={extraStockKey}
                onChange={(event) => setExtraStockKey(event.target.value)}
                className="h-11 min-w-0 rounded-lg border border-black bg-surface-inset px-3 text-sm font-black text-[#f8fafc] outline-none focus:border-sky-400"
                aria-label="Caja extra desde bodega"
                disabled={!extraStock.length || Boolean(busyKey)}
              >
                <option value="">Elegir caja de bodega</option>
                {extraStock.map((item) => (
                  <option key={`${item.warehouseId}:${item.itemId}`} value={`${item.warehouseId}:${item.itemId}`}>
                    {item.itemName} · {item.stock} disponibles
                  </option>
                ))}
              </select>
              <input
                type="number"
                min="1"
                step="1"
                value={extraQty}
                onChange={(event) => setExtraQty(event.target.value)}
                className="h-11 rounded-lg border border-black bg-surface-inset px-3 text-sm font-black tabular-nums text-[#f8fafc] outline-none focus:border-sky-400"
                aria-label="Cantidad de cajas extra"
                disabled={Boolean(busyKey)}
              />
              <button
                type="button"
                className={`${secondaryButtonClass} h-11 px-3 text-xs disabled:cursor-not-allowed disabled:opacity-40`}
                disabled={!extraStock.length || !extraStockKey || Boolean(busyKey)}
                onClick={() => void loadExtra()}
              >
                {busyKey === "extra" ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackagePlus className="h-4 w-4" />}
                Llevar extra
              </button>
            </div>
          </div>
        </details>

        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <div className="grid items-start gap-4 xl:grid-cols-2">
            <div className="grid gap-4">
              <RouteDeliverySection
                boardLines={routeDeliveryBoard}
                loadQuantities={loadQuantities}
                onQuantityChange={handleLoadQuantityChange}
                busyKey={busyKey}
                onLoad={(lineKey, qty) => void loadLine(lineKey, qty)}
                onUnload={openUnloadDialog}
              />
              <TruckOnTruckSection
                title="Cajas extra en camión"
                total={extraBoxTotal}
                tone="sky"
                emptyText="Sin cajas extra en el camión."
                lines={extraBoxLines}
                busyKey={busyKey}
                onUnload={openUnloadDialog}
              />
            </div>

            <section className="overflow-hidden rounded-xl border border-black bg-surface-card">
              <header className="flex items-center justify-between gap-3 border-b border-black bg-surface-card-header px-4 py-3">
                <p className="text-sm font-black text-[#f8fafc]">Cajas recogidas</p>
                <span className="rounded-md border border-amber-700/60 bg-amber-950/30 px-2 py-1 text-xs font-black tabular-nums text-amber-200">
                  {fullBoxTotal}
                </span>
              </header>
              {fullBoxInventory.length ? (
                <div
                  className={`grid gap-2 p-3 ${
                    fullBoxInventory.length > 1 ? "sm:grid-cols-2" : "grid-cols-1"
                  }`}
                >
                  {fullBoxInventory.map((line) => (
                    <article
                      key={line.label}
                      className="flex items-center justify-between gap-3 rounded-lg border border-black bg-surface-inset px-4 py-3"
                    >
                      <p className="min-w-0 truncate text-base font-black text-[#f8fafc]">{line.label}</p>
                      <p className="shrink-0 text-right">
                        <span className="text-2xl font-black tabular-nums text-amber-300">{line.quantity}</span>
                        <span className="ml-1 text-xs font-bold text-slate-400">cajas</span>
                      </p>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="px-4 py-6 text-sm font-bold text-slate-400">Sin cajas llenas en el camión.</p>
              )}
            </section>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-black pt-3">
          <button
            type="button"
            className={`${primaryButtonClass} h-11 px-4 text-sm disabled:cursor-not-allowed disabled:opacity-40`}
            disabled={!ready || !hasRequiredBoxes || !view?.selectedRouteId || Boolean(busyKey)}
            onClick={() => void startRoute()}
          >
            {busyKey === "start" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Truck className="h-4 w-4" />}
            Iniciar ruta
          </button>
          <p className="text-xs font-bold text-slate-300">
            {ready
              ? view?.selectedRouteId
                ? "Carga lista. Puedes salir a ruta."
                : "Carga lista. Asigna una ruta para salir."
              : "Primero sube las cajas indicadas."}
          </p>
        </div>
      </Panel>

      {unloadDialog ? (
        <ConductorTruckUnloadDialog
          unloadDialog={unloadDialog}
          busyKey={busyKey}
          unloadQty={unloadQty}
          unloadReason={unloadReason}
          unloadNote={unloadNote}
          unloadTargetVehicleId={unloadTargetVehicleId}
          unloadVehicleReady={unloadVehicleReady}
          transferVehicles={transferVehicles}
          onClose={() => setUnloadDialog(null)}
          onUnloadQtyChange={setUnloadQty}
          onUnloadReasonChange={handleUnloadReasonChange}
          onUnloadNoteChange={setUnloadNote}
          onUnloadTargetVehicleIdChange={setUnloadTargetVehicleId}
          onConfirm={() =>
            void returnLine(
              unloadDialog.line,
              Math.floor(Number(unloadQty) || 0),
              unloadReason,
              unloadNote.trim(),
              unloadTargetVehicleId,
            )
          }
        />
      ) : null}
    </div>
  );
}
