import { cardHoverClass } from "@/components/ui-blocks";
import {
  EMPTY_BOX_DRIVER_MODE,
  EMPTY_BOX_OFFICE_MODE,
  FULL_BOX_DEFERRED_SUMMARY,
  FULL_BOX_DRIVER_MODE,
  FULL_BOX_OFFICE_MODE,
} from "@/lib/sale-logistics-modes";
import {
  deliverySummary,
  emptyBoxOfficeSummary,
  fullBoxSummaryLine,
  logisticsDriverTaskCount,
  logisticsLegComplete,
  logisticsSummary,
  saleLogisticsContinueHint,
  saleLogisticsPlanReady,
} from "@/lib/sale-logistics-summary";
import { formatScheduleAtDisplay } from "@/lib/sale/schedule-time";
import { senderPhoneKey } from "@/components/sale/venta/parts-person";
import type {
  PersonName,
  Recipient,
  SaleLogisticsDetailRow,
  SalePersonAddress,
  Sender,
} from "@/components/sale/venta/parts-types";

export function SaleBoxCartQtyBadge({ quantity }: { quantity: number; }) {
  return (
    <span
      className="inline-flex h-8 min-w-[2.75rem] items-center justify-center rounded-lg border border-amber-500/90 bg-gradient-to-b from-amber-300 via-amber-400 to-orange-500 px-2.5 text-lg font-black leading-none tabular-nums tracking-tight text-slate-950 shadow-[0_6px_18px_rgba(251,146,60,0.42)] ring-1 ring-inset ring-amber-100/50"
      aria-label={`${quantity} en carrito`}
    >
      ×{quantity}
    </span>
  );
}

export { unselectedDimClass } from "@/components/ui-blocks";
export type { AddressValidation } from "@/lib/sale-address-validation";
export {
  EMPTY_BOX_DRIVER_MODE,
  EMPTY_BOX_OFFICE_MODE,
  FULL_BOX_DEFERRED_SUMMARY,
  FULL_BOX_DRIVER_MODE,
  FULL_BOX_OFFICE_MODE,
} from "@/lib/sale-logistics-modes";
export {
  deliverySummary,
  emptyBoxOfficeSummary,
  fullBoxSummaryLine,
  logisticsDriverTaskCount,
  logisticsLegComplete,
  logisticsSummary,
  saleLogisticsContinueHint,
  saleLogisticsPlanReady,
};
export function deliveryModeCardClass(selected: boolean) {
  if (selected) {
    return "relative overflow-hidden border-2 border-emerald-700 bg-emerald-600/40 shadow-[0_8px_24px_rgba(16,185,129,0.22)] ring-1 ring-emerald-500/50";
  }

  return `${cardHoverClass} border-2 border-black bg-[#3a4842] hover:bg-[#425048]`;
}

export function deliveryModeIconClass(selected: boolean) {
  return selected
    ? "border-emerald-800 bg-emerald-500 text-slate-950"
    : "border-black bg-[#2e3834] text-emerald-300";
}

export function logisticsStepDetailRows({
  emptyBoxMode,
  emptyBoxScheduleMode,
  emptyBoxScheduleAt,
  emptyBoxRouteSummary = "",
  fullBoxMode,
  fullBoxScheduleMode,
  fullBoxScheduleAt,
  fullBoxRouteSummary = "",
}: {
  emptyBoxMode: string;
  emptyBoxScheduleMode: string;
  emptyBoxScheduleAt: string;
  emptyBoxRouteSummary?: string;
  fullBoxMode: string;
  fullBoxScheduleMode: string;
  fullBoxScheduleAt: string;
  fullBoxRouteSummary?: string;
}): SaleLogisticsDetailRow[] {
  const emptyRoute = emptyBoxRouteSummary.trim();
  const fullRoute = fullBoxRouteSummary.trim();
  const emptyValue =
    emptyRoute ||
    (emptyBoxMode === EMPTY_BOX_OFFICE_MODE
      ? "Entregada en mostrador"
      : emptyBoxMode === EMPTY_BOX_DRIVER_MODE
        ? emptyBoxScheduleMode === "pending"
          ? "Entrega pendiente"
          : emptyBoxScheduleMode === "scheduled" && emptyBoxScheduleAt
            ? `Entrega · ${formatScheduleAtDisplay(emptyBoxScheduleAt)}`
            : "Falta programar entrega"
        : "Pendiente");
  const fullValue =
    fullRoute ||
    (!fullBoxMode
      ? FULL_BOX_DEFERRED_SUMMARY
      : fullBoxMode === FULL_BOX_OFFICE_MODE
        ? "Cliente entrega en oficina"
        : fullBoxMode === FULL_BOX_DRIVER_MODE
          ? fullBoxScheduleMode === "pending"
            ? FULL_BOX_DEFERRED_SUMMARY
            : fullBoxScheduleMode === "scheduled" && fullBoxScheduleAt
              ? `Recolección · ${formatScheduleAtDisplay(fullBoxScheduleAt)}`
              : "Falta programar recolección"
          : fullBoxSummaryLine(fullBoxMode, fullBoxScheduleMode, fullBoxScheduleAt));

  return [
    { label: "Caja vacía", value: emptyValue },
    { label: "Caja llena", value: fullValue },
  ];
}

export function personFullName(person: PersonName) {
  return [person.firstName, person.lastName].filter(Boolean).join(" ").trim();
}

export function salePersonAddressLines(address: SalePersonAddress) {
  const streetLine = [address.street?.trim(), address.houseNumber?.trim()].filter(Boolean).join(" ");
  const cityLine = [
    address.city?.trim(),
    [address.state?.trim(), address.postalCode?.trim()].filter(Boolean).join(" "),
  ]
    .filter(Boolean)
    .join(", ");

  return [
    streetLine || undefined,
    address.neighborhood?.trim() || undefined,
    cityLine || undefined,
  ].filter((line): line is string => Boolean(line));
}

export function salePersonAddressSummary(address: SalePersonAddress) {
  return salePersonAddressLines(address).join(", ");
}

export function samePersonName(a: PersonName, b: PersonName) {
  return (
    a.firstName.trim().toLowerCase() === b.firstName.trim().toLowerCase() &&
    a.lastName.trim().toLowerCase() === b.lastName.trim().toLowerCase()
  );
}

export function recipientIdentityKey(recipient: Recipient) {
  if (recipient.id) {
    return recipient.id;
  }

  return `${recipient.firstName}|${recipient.lastName}|${recipient.country}`.toLowerCase();
}

export function senderSaleContextProps(sender: Sender) {
  return {
    "data-sale-context-key": `sender:${senderPhoneKey(sender)}`,
    "data-sale-context-type": "remitente" as const,
    "data-sale-context-title": personFullName(sender),
    "data-sale-context-first-name": sender.firstName,
    "data-sale-context-last-name": sender.lastName,
    "data-sale-context-phones": sender.phones.join("|"),
    "data-sale-context-street": sender.street,
    "data-sale-context-house": sender.houseNumber,
    "data-sale-context-neighborhood": sender.neighborhood,
    "data-sale-context-city": sender.city,
    "data-sale-context-state": sender.state,
    "data-sale-context-postal-code": sender.postalCode,
    "data-sale-context-address-reference": sender.addressReference,
    "data-sale-context-country": "USA",
    "data-sale-context-customer-id": sender.id.startsWith("local-") ? undefined : sender.id,
  };
}

export function recipientSaleContextProps(recipient: Recipient) {
  return {
    "data-sale-context-key": `recipient:${recipientIdentityKey(recipient)}`,
    "data-sale-context-type": "destinatario" as const,
    "data-sale-context-title": personFullName(recipient),
    "data-sale-context-first-name": recipient.firstName,
    "data-sale-context-last-name": recipient.lastName,
    "data-sale-context-phones": recipient.phone,
    "data-sale-context-street": recipient.street,
    "data-sale-context-house": recipient.houseNumber,
    "data-sale-context-neighborhood": recipient.neighborhood,
    "data-sale-context-city": recipient.city,
    "data-sale-context-state": recipient.state,
    "data-sale-context-postal-code": recipient.postalCode,
    "data-sale-context-address-reference": recipient.addressReference,
    "data-sale-context-country": recipient.country,
    "data-sale-context-recipient-id": recipient.id.startsWith("local-r-")
      ? undefined
      : recipient.id,
  };
}

export function recipientShipmentSnapshot(recipient: Recipient): Record<string, unknown> {
  return {
    firstName: recipient.firstName,
    lastName: recipient.lastName,
    phone: recipient.phone,
    email: recipient.email,
    emails: recipient.emails,
    country: recipient.country,
    street: recipient.street,
    houseNumber: recipient.houseNumber,
    neighborhood: recipient.neighborhood,
    city: recipient.city,
    state: recipient.state,
    postalCode: recipient.postalCode,
    addressReference: recipient.addressReference,
    formattedAddress: recipient.formattedAddress,
    placeId: recipient.placeId,
    lat: recipient.lat,
    lng: recipient.lng,
    exactEntranceLat: recipient.exactEntranceLat,
    exactEntranceLng: recipient.exactEntranceLng,
    exactEntranceConfirmedAt: recipient.exactEntranceConfirmedAt,
    exactEntranceNote: recipient.exactEntranceNote,
    exactEntrancePanoId: recipient.exactEntrancePanoId,
    exactEntranceHeading: recipient.exactEntranceHeading,
    exactEntrancePitch: recipient.exactEntrancePitch,
  };
}

export function historyDateLabel(value: string) {
  return new Date(value).toLocaleString("es-MX", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
