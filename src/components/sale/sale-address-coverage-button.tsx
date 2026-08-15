"use client";

import { useState } from "react";
import { MapPinned } from "lucide-react";
import {
  resolveAddressGeographicRoutesAction,
  type CustomerMapLocation,
  type CompatibleGeographicRoute,
} from "@/app/actions/logistics-routes";
import {
  LogisticsRouteCoveragePreviewDialog,
} from "@/components/logistica/task-schedule/logistics-route-coverage-preview-dialog";
import type { ExactEntranceDraft } from "@/components/sale/sale-exact-entrance-step";
import { secondaryButtonClass } from "@/components/ui-blocks";
import type { LogisticsWeekdayKey } from "@/lib/logistics-route-catalog";
import type { RouteCoverageAddress } from "@/lib/logistics-route-coverage";

type SaleAddressCoverageButtonProps = {
  address: RouteCoverageAddress;
  exactEntrance?: ExactEntranceDraft | null;
  addressReference: string;
  exactEntranceNote: string;
  customerId?: string | null;
  disabled?: boolean;
  onAddressReferenceChange: (value: string) => void;
  onExactEntranceNoteChange: (value: string) => void;
  exactEntranceNoteEditable?: boolean;
  onCustomerLocationSaved: (location: CustomerMapLocation) => void;
};

type CoveragePreview = {
  routes: CompatibleGeographicRoute[];
  customerLocation: CustomerMapLocation | null;
  enabledDays: LogisticsWeekdayKey[];
};

export function SaleAddressCoverageButton({
  address,
  exactEntrance,
  addressReference,
  exactEntranceNote,
  customerId,
  disabled = false,
  onAddressReferenceChange,
  onExactEntranceNoteChange,
  exactEntranceNoteEditable = true,
  onCustomerLocationSaved,
}: SaleAddressCoverageButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<CoveragePreview | null>(null);
  const [open, setOpen] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);

  async function openCoveragePreview() {
    if (loading || disabled) return;
    setLoading(true);
    setError("");
    try {
      const result = await resolveAddressGeographicRoutesAction({
        address,
        exactEntrance: exactEntrance
          ? { lat: exactEntrance.lat, lng: exactEntrance.lng }
          : null,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setPreview(result.data);
      setPreviewKey((current) => current + 1);
      setOpen(true);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "No se pudieron consultar las rutas.");
    } finally {
      setLoading(false);
    }
  }

  function handleCustomerLocationSaved(location: CustomerMapLocation) {
    setPreview((current) => current ? { ...current, customerLocation: location } : current);
    onCustomerLocationSaved(location);
  }

  const selectedRouteId = preview?.routes.find((route) => route.coverageMatches)?.routeScheduleId
    || preview?.routes[0]?.routeScheduleId
    || "";

  return (
    <>
      <button
        type="button"
        disabled={disabled || loading}
        onClick={() => void openCoveragePreview()}
        className={`${secondaryButtonClass} ml-1 inline-flex h-9 items-center gap-2 px-3 text-xs disabled:cursor-not-allowed disabled:opacity-40`}
        title={disabled ? "Completa la dirección para consultar las rutas" : "Ver rutas, coberturas y días de recolección"}
        aria-label="Ver rutas, coberturas y días de recolección"
      >
        <MapPinned className="h-4 w-4" aria-hidden />
        {loading ? "Consultando rutas…" : "Ver rutas y coberturas"}
      </button>
      {error ? (
        <p className="basis-full text-xs font-bold text-amber-200" role="alert">
          {error}
        </p>
      ) : null}
      {preview ? (
        <LogisticsRouteCoveragePreviewDialog
          key={previewKey}
          open={open}
          onClose={() => setOpen(false)}
          routes={preview.routes}
          enabledWeekdays={preview.enabledDays}
          selectedRouteId={selectedRouteId}
          customerLocation={preview.customerLocation}
          customerId={customerId}
          addressReference={addressReference}
          exactEntranceNote={exactEntranceNote}
          onAddressReferenceChange={onAddressReferenceChange}
          onExactEntranceNoteChange={onExactEntranceNoteChange}
          exactEntranceNoteEditable={exactEntranceNoteEditable}
          onCustomerLocationSaved={handleCustomerLocationSaved}
        />
      ) : null}
    </>
  );
}
