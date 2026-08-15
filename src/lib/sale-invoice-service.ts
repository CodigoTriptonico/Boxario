import type { LogisticsTaskType } from "@/lib/logistics-routing";

export type SaleInvoiceSituation =
  | "standard"
  | "empty_box_handed_off";

function normalizedInvoiceBoxCount(boxCount: number | undefined) {
  return Math.max(1, Math.floor(boxCount || 1));
}

export function saleInvoiceBoxDescription(
  label: string | undefined,
  fallbackLabel: string,
) {
  const cleanLabel = label?.trim() || "";
  const selectedLabel =
    !cleanLabel || /^(caja|paquete)$/i.test(cleanLabel)
      ? fallbackLabel.trim()
      : cleanLabel;
  const size = selectedLabel.replace(/^caja\s+/i, "").trim();

  return size ? `Caja ${size}` : "Caja";
}

export function saleInvoiceServiceLabel(
  operation: LogisticsTaskType,
  situation: SaleInvoiceSituation = "standard",
  boxCount?: number,
) {
  if (situation === "empty_box_handed_off") {
    return normalizedInvoiceBoxCount(boxCount) === 1
      ? "Caja entregada · Recolección pendiente"
      : "Cajas entregadas · Recolección pendiente";
  }

  return operation === "deliver_empty_box"
    ? "Servicio de entrega"
    : "Servicio de recoleccion";
}

export function saleInvoiceSituationNote(
  situation: SaleInvoiceSituation,
  boxCount?: number,
) {
  if (situation !== "empty_box_handed_off") {
    return "";
  }

  return normalizedInvoiceBoxCount(boxCount) === 1
    ? "Caja vacía entregada en oficina. La recolección de la caja llena queda pendiente de coordinar."
    : "Cajas vacías entregadas en oficina. La recolección de las cajas llenas queda pendiente de coordinar.";
}

export function saleInvoiceShowsDeliveryEta(situation: SaleInvoiceSituation) {
  return situation !== "empty_box_handed_off";
}

export function saleInvoiceEtaLabel(value: string | undefined) {
  const eta = value?.trim();
  return eta ? `Entrega est. ${eta}` : "";
}
