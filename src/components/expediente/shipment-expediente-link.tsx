"use client";

import Link from "next/link";
import { FileText } from "lucide-react";
import { buildExpedienteShipmentDeepLink } from "@/lib/expediente-deep-link";

type ShipmentExpedienteLinkProps = {
  shipmentId: string;
  shipmentCode: string;
  className?: string;
  onNavigate?: () => void;
  showLabel?: boolean;
};

export function ShipmentExpedienteLink({
  shipmentId,
  shipmentCode,
  className = "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-black bg-surface-inset text-slate-300 hover:bg-surface-card",
  onNavigate,
  showLabel = false,
}: ShipmentExpedienteLinkProps) {
  return (
    <Link
      href={buildExpedienteShipmentDeepLink(shipmentId)}
      className={className}
      title="Ver expediente"
      aria-label={`Ver expediente de ${shipmentCode}`}
      onClick={(event) => {
        event.stopPropagation();
        onNavigate?.();
      }}
    >
      <FileText className="h-4 w-4" aria-hidden />
      {showLabel ? <span>Expediente</span> : null}
    </Link>
  );
}
