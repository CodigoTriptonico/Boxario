export function buildExpedienteShipmentDeepLink(shipmentId: string) {
  const id = shipmentId?.trim();
  if (!id) {
    return "/seguimiento";
  }

  return `/seguimiento/${encodeURIComponent(id)}/expediente`;
}
