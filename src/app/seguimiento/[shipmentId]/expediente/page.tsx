import { notFound } from "next/navigation";
import { loadShipmentExpedienteAction } from "@/app/actions/shipment-expediente";
import { ShipmentExpedienteClient } from "@/components/expediente/shipment-expediente-client";

export default async function ShipmentExpedientePage({
  params,
}: {
  params: Promise<{ shipmentId: string }>;
}) {
  const { shipmentId } = await params;
  const result = await loadShipmentExpedienteAction(shipmentId);

  if (!result.ok) {
    if (result.error === "NOT_FOUND") {
      notFound();
    }

    throw new Error(result.error);
  }

  return <ShipmentExpedienteClient data={result.data} />;
}
