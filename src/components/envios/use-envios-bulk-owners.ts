"use client";

import { useState } from "react";
import { updateShipmentLogisticsPlanAction, updateShipmentSalesOwnerAction } from "@/app/actions/shipments";
import type { ShipmentRow } from "@/lib/shipment-types";
import { useNotify } from "@/hooks/use-notify";
import {
  canApplyEnviosBulkReadiness,
  resolveEnviosBulkReadinessPatch,
  type EnviosBulkReadinessAction,
} from "@/lib/envios-bulk-readiness";
import {
  editorStateToUpdateInput,
  shipmentLogisticsEditorState,
} from "@/lib/shipment-logistics-edit";

type UseEnviosBulkOwnersOptions = {
  canManageShipmentOwners: boolean;
  selectionEnabled: boolean;
  selectedShipments: ShipmentRow[];
  setShipments: React.Dispatch<React.SetStateAction<ShipmentRow[]>>;
};

export function useEnviosBulkOwners({
  canManageShipmentOwners,
  selectionEnabled,
  selectedShipments,
  setShipments,
}: UseEnviosBulkOwnersOptions) {
  const notify = useNotify();
  const [bulkBusy, setBulkBusy] = useState(false);
  const [ownerBusyId, setOwnerBusyId] = useState<string | null>(null);

  async function applyBulkReadiness(action: EnviosBulkReadinessAction) {
    if (!selectionEnabled || bulkBusy) {
      return;
    }

    const targets = selectedShipments.filter((row) =>
      canApplyEnviosBulkReadiness(row, action),
    );

    if (!targets.length) {
      notify.error(
        action === "mark"
          ? "Ningún envío seleccionado se puede marcar como listo"
          : "Ningún envío seleccionado se puede desmarcar",
      );
      return;
    }

    setBulkBusy(true);

    let updatedCount = 0;
    let failedCount = 0;

    try {
      for (const row of targets) {
        const patch = resolveEnviosBulkReadinessPatch(row, action);

        if (!patch) {
          continue;
        }

        const nextState = {
          ...shipmentLogisticsEditorState(row),
          ...patch,
        };
        const result = await updateShipmentLogisticsPlanAction({
          shipmentId: row.id,
          ...editorStateToUpdateInput(nextState),
          audit: {
            interaction: "bulk_action",
            source: "envios.bulk",
            stepTitle: action === "mark" ? "Marcar listos" : "Desmarcar listos",
          },
        });

        if (!result.ok) {
          failedCount += 1;
          notify.error(`${row.code}: ${result.error}`);
          continue;
        }

        updatedCount += 1;
        setShipments((current) =>
          current.map((entry) => (entry.id === row.id ? result.data : entry)),
        );
      }

      if (updatedCount > 0) {
        notify.success(
          action === "mark"
            ? `${updatedCount} envío${updatedCount === 1 ? "" : "s"} marcado${updatedCount === 1 ? "" : "s"} como listo${updatedCount === 1 ? "" : "s"}`
            : `${updatedCount} envío${updatedCount === 1 ? "" : "s"} desmarcado${updatedCount === 1 ? "" : "s"}`,
        );
      }

      if (failedCount > 0 && updatedCount === 0) {
        notify.error("No se pudo actualizar la selección");
      }
    } finally {
      setBulkBusy(false);
    }
  }

  async function updateSalesOwner(row: ShipmentRow, salesOwnerId: string) {
    if (!canManageShipmentOwners) {
      return;
    }

    if (!salesOwnerId || salesOwnerId === row.salesOwnerId) {
      return;
    }

    setOwnerBusyId(row.id);

    try {
      const result = await updateShipmentSalesOwnerAction({
        shipmentId: row.id,
        salesOwnerId,
      });

      if (!result.ok) {
        notify.error(result.error);
        return;
      }

      setShipments((current) =>
        current.map((entry) => (entry.id === row.id ? result.data : entry)),
      );
      notify.success("Vendedor actualizado");
    } finally {
      setOwnerBusyId(null);
    }
  }

  return {
    bulkBusy,
    ownerBusyId,
    applyBulkReadiness,
    updateSalesOwner,
  };
}
