"use client";

import type { ShipmentRow } from "@/lib/shipment-types";
import {
  latestShipmentContactLog,
  shipmentContactLogPreview,
  shipmentContactReminderLabel,
  shipmentContactReminderStatus,
} from "@/lib/shipment-contact-log";

export function ShipmentContactLogLine({ shipment }: { shipment: ShipmentRow }) {
  const latest = latestShipmentContactLog(shipment.contactLogs);

  if (!latest) {
    return null;
  }

  const reminderStatus = shipmentContactReminderStatus(latest);
  const reminderLabel = shipmentContactReminderLabel(reminderStatus);

  return (
    <p className="mt-1.5 flex min-w-0 items-center gap-1.5 rounded-md border border-black bg-surface-inset px-2 py-1 text-[10px] font-black text-slate-300">
      <span className="min-w-0 flex-1 truncate">
        Seguimiento: {shipmentContactLogPreview(latest)}
        {latest.followUpAt ? ` · ${formatContactDate(latest.followUpAt)}` : ""}
      </span>
      {reminderLabel ? (
        <span
          className={`shrink-0 rounded-md border border-black px-1.5 py-0.5 text-[9px] font-black ${
            reminderStatus === "overdue"
              ? "bg-rose-400/15 text-rose-200"
              : "bg-amber-400/15 text-amber-200"
          }`}
        >
          {reminderLabel}
        </span>
      ) : null}
    </p>
  );
}

function formatContactDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
