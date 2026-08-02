"use client";

import { Printer, Share2 } from "lucide-react";
import {
  billingWithRecordedPayment,
  type InvoiceBillingCartLine,
  type InvoiceBillingSnapshot,
} from "@/lib/invoice-billing";
import { promotionMatchesCartCatalog } from "@/lib/combo-rules";
import { printableBoxInvoiceCodes } from "@/lib/invoice-child-codes";
import { formatMoneyValue, parseMoneyValue } from "@/lib/logistics-fees";
import type { PricingPromotionConfig } from "@/lib/pricing-promotions";
import { formatBoxQuantityLabel } from "@/lib/shipment-display";
import type { SalePaymentSelection } from "@/lib/sale-payment-choice";
import {
  type Recipient,
  type Sender,
} from "@/components/sale/venta-parts";

let activeSaleScrollFrame: number | null = null;

function cancelSaleScroll() {
  if (activeSaleScrollFrame !== null) {
    cancelAnimationFrame(activeSaleScrollFrame);
    activeSaleScrollFrame = null;
  }
}

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

function smoothScrollToY(targetY: number) {
  cancelSaleScroll();

  const startY = window.scrollY;
  const distance = targetY - startY;

  if (Math.abs(distance) < 2) {
    return;
  }

  const duration = Math.min(640, Math.max(420, Math.abs(distance) * 0.5));
  const startTime = performance.now();

  function tick(now: number) {
    const progress = Math.min((now - startTime) / duration, 1);

    window.scrollTo(0, startY + distance * easeInOutCubic(progress));

    if (progress < 1) {
      activeSaleScrollFrame = requestAnimationFrame(tick);
    } else {
      activeSaleScrollFrame = null;
    }
  }

  activeSaleScrollFrame = requestAnimationFrame(tick);
}

function afterLayoutPaint(callback: () => void) {
  requestAnimationFrame(() => {
    requestAnimationFrame(callback);
  });
}

function saleScrollTopOffset() {
  return window.matchMedia("(min-width: 768px)").matches ? 132 : 96;
}

type CreatedInvoiceSnapshot = {
  shipmentId: string;
  invoiceNumber: string;
  trackingToken?: string;
  sender: Sender;
  recipient: Recipient;
  box: string[];
  boxInvoices: Array<{
    invoiceNumber: string;
    box: string[];
    position: number;
  }>;
  serviceOperation: "deliver_empty_box";
  billing: InvoiceBillingSnapshot;
};

type SaleDriverLeg = "emptyBox" | "fullBox" | "quickEmptyBox";

type RouteAssignmentRetry = {
  shipmentId: string;
  taskId: string;
  routeTemplateId: string;
  scheduledAt: string;
  label: string;
  error?: string;
};

function billingForPaymentChoice(
  billing: InvoiceBillingSnapshot | null,
  choice: SalePaymentSelection,
) {
  if (!billing) {
    return null;
  }

  return billingWithRecordedPayment(billing, choice === "pending" ? "$0" : billing.payNow);
}

function buildAddressSuggestQuery(parts: string[]) {
  const cleanParts = parts.map((part) => part.trim()).filter(Boolean);

  if (!cleanParts.length) {
    return "";
  }

  return cleanParts.join(" ");
}

function formatValidatedAddress(
  address: {
    street?: string;
    houseNumber?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
    formattedAddress?: string;
  },
  typedUnit: string,
) {
  const unit = typedUnit.trim() || address.houseNumber?.trim() || "";

  if (!unit) {
    return (
      address.formattedAddress ||
      [
        address.street,
        [address.city, address.state, address.postalCode].filter(Boolean).join(" "),
        address.country,
      ]
        .filter(Boolean)
        .join(", ")
    );
  }

  const streetLine = [address.street, unit].filter(Boolean).join(" ");
  const cityLine = [address.city, address.state, address.postalCode].filter(Boolean).join(" ");
  return [streetLine, cityLine, address.country].filter(Boolean).join(", ");
}

function normalizeCountryKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

function resolveCountryBoxes(
  countryBoxes: Record<string, string[][]>,
  country: string,
) {
  const direct = countryBoxes[country];

  if (direct?.length) {
    return direct;
  }

  const match = Object.entries(countryBoxes).find(
    ([name]) => normalizeCountryKey(name) === normalizeCountryKey(country),
  );

  return match?.[1] || [];
}

function saleBoxCatalogKey(box: string[] | null) {
  return box?.[5] || box?.[0] || "";
}

type SaleBoxCartLine = {
  id: string;
  box: string[];
  quantity: number;
};

function saleCartLineId(box: string[]) {
  return saleBoxCatalogKey(box) || box[0] || `box-${Date.now()}`;
}

function saleCartLineLabel(line: SaleBoxCartLine) {
  return formatBoxQuantityLabel(line.box[0] || "", line.quantity);
}

function saleCartSummary(lines: SaleBoxCartLine[]) {
  return lines.length ? lines.map(saleCartLineLabel).join(" + ") : "";
}

function saleCartToBillingLines(lines: SaleBoxCartLine[]): InvoiceBillingCartLine[] {
  return lines.map((line) => ({
    label: line.box[0] || "Caja",
    catalogKey: saleBoxCatalogKey(line.box),
    quantity: line.quantity,
    unitPrice: line.box[1] || "$0",
    unitCost: line.box[2] || "$0",
    carrier: line.box[3] || "",
    time: line.box[4] || "",
  }));
}

function boxInvoicesForSale(invoiceNumber: string, lines: SaleBoxCartLine[]) {
  const boxes = lines.flatMap((line) =>
    Array.from({ length: Math.max(1, Math.floor(line.quantity) || 1) }, () => line.box),
  );
  const boxCount = boxes.length;

  // Every physical box receives one printable label under the parent customer invoice.
  return printableBoxInvoiceCodes(invoiceNumber, boxCount).map((childInvoiceNumber, index) => ({
    invoiceNumber: childInvoiceNumber,
    box: boxes[index] || [],
    position: index + 1,
  }));
}

function salePrintTargetId(invoiceNumber: string) {
  return `sale-document-${invoiceNumber.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}

function printSaleDocument(targetIds: string | string[]) {
  const ids = Array.isArray(targetIds) ? targetIds : [targetIds];
  const targets = ids
    .map((id) => document.getElementById(id))
    .filter((node): node is HTMLElement => Boolean(node));
  if (!targets.length) {
    return;
  }

  const root = document.documentElement;
  const cleanup = () => {
    root.classList.remove("sale-print-single");
    for (const target of targets) {
      target.classList.remove("sale-document-print-selected");
    }
  };

  root.classList.add("sale-print-single");
  for (const target of targets) {
    target.classList.add("sale-document-print-selected");
  }
  window.addEventListener("afterprint", cleanup, { once: true });
  window.print();
}

type FinishDocTab = "invoice" | "labels";

function SaleFinishDocToolbar({
  value,
  onChange,
  labelCount,
  printTargetId,
  printLabel,
  printActionLabel,
  onShare,
}: {
  value: FinishDocTab;
  onChange: (next: FinishDocTab) => void;
  labelCount: number;
  printTargetId: string | string[];
  printLabel: string;
  printActionLabel: string;
  onShare: () => void;
}) {
  const tabClass = (active: boolean) =>
    `inline-flex h-8 items-center rounded-md px-2.5 text-[11px] font-black tracking-wide transition ${active
      ? "bg-emerald-400 text-slate-950"
      : "text-slate-400 hover:bg-white/5 hover:text-slate-100"
    }`;

  return (
    <div className="no-print sticky top-0 z-10 mx-auto flex w-full max-w-[210mm] items-center gap-2 rounded-lg border border-black/80 bg-surface-inset/95 px-1.5 py-1.5 shadow-sm backdrop-blur-md">
      <div
        className="flex min-w-0 flex-1 items-center gap-0.5"
        role="tablist"
        aria-label="Documentos de la venta"
      >
        <button
          type="button"
          role="tab"
          aria-selected={value === "invoice"}
          onClick={() => onChange("invoice")}
          className={tabClass(value === "invoice")}
        >
          Factura
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={value === "labels"}
          onClick={() => onChange("labels")}
          className={tabClass(value === "labels")}
        >
          Etiqueta{labelCount > 1 ? `s · ${labelCount}` : ""}
        </button>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={onShare}
          aria-label={`Compartir ${printLabel}`}
          title="Próximamente por mensaje o WhatsApp"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition hover:bg-white/5 hover:text-slate-100"
        >
          <Share2 className="h-3.5 w-3.5" aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => printSaleDocument(printTargetId)}
          aria-label={`Imprimir ${printLabel}`}
          className="inline-flex h-8 items-center gap-1.5 rounded-md bg-emerald-400 px-3 text-[11px] font-black text-slate-950 transition hover:bg-emerald-300"
        >
          <Printer className="h-3.5 w-3.5" aria-hidden />
          {printActionLabel}
        </button>
      </div>
    </div>
  );
}

function saleCartTotalCost(lines: SaleBoxCartLine[]) {
  return formatMoneyValue(
    lines.reduce(
      (sum, line) => sum + parseMoneyValue(line.box[2] || "$0") * line.quantity,
      0,
    ),
  );
}

function resolveCountryPromotions(
  promotions: PricingPromotionConfig[],
  country: string,
  box?: string[] | null,
) {
  return resolveCountryPromotionsForCatalogKeys(
    promotions,
    country,
    box ? [saleBoxCatalogKey(box)] : [],
  );
}

function resolveCountryPromotionsForCatalogKeys(
  promotions: PricingPromotionConfig[],
  country: string,
  catalogKeys: string[],
) {
  const countryKey = normalizeCountryKey(country);
  const keys = catalogKeys.map((key) => key.trim()).filter(Boolean);

  return promotions.filter((promotion) => {
    if (normalizeCountryKey(promotion.countryName) !== countryKey) {
      return false;
    }

    if (!keys.length) {
      return true;
    }

    return promotionMatchesCartCatalog(promotion, keys);
  }).sort((left, right) => left.sortOrder - right.sortOrder);
}


export {
  SaleFinishDocToolbar,
  afterLayoutPaint,
  billingForPaymentChoice,
  boxInvoicesForSale,
  buildAddressSuggestQuery,
  formatValidatedAddress,
  resolveCountryBoxes,
  resolveCountryPromotions,
  resolveCountryPromotionsForCatalogKeys,
  saleBoxCatalogKey,
  saleCartLineId,
  saleCartSummary,
  saleCartToBillingLines,
  saleCartTotalCost,
  salePrintTargetId,
  saleScrollTopOffset,
  smoothScrollToY,
};
export type {
  CreatedInvoiceSnapshot,
  FinishDocTab,
  RouteAssignmentRetry,
  SaleBoxCartLine,
  SaleDriverLeg,
};
