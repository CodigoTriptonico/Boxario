import { CountryFlag } from "@/components/country-flag";
import { RotateCcw, X } from "lucide-react";
import {
  formatInvoiceVariant3Amount,
  InvoiceVariant3Layout,
  type InvoiceVariant3Item,
} from "@/components/invoice-variants/invoice-variant-3";
import { DataQrCode } from "@/components/sale/data-qr-code";
import { InvoiceQrCode } from "@/components/sale/invoice-qr-code";
import type { InvoiceBillingSnapshot } from "@/lib/invoice-billing";
import { invoiceBoxCode } from "@/lib/invoice-child-codes";
import type { LogisticsTaskType } from "@/lib/logistics-routing";
import { formatMoneyValue, parseMoneyValue } from "@/lib/logistics-fees";
import type { OrganizationBranding } from "@/lib/organizations/branding";
import { organizationBrandInitials, PLATFORM_BRAND_TITLE } from "@/lib/organizations/branding";
import { resolveCountryCodeFromString } from "@/lib/country-options";
import { recipientExcelQrValue } from "@/lib/recipient-qr";
import {
  saleInvoiceBoxDescription,
  saleInvoiceEtaLabel,
  saleInvoiceServiceLabel,
  saleInvoiceShowsDeliveryEta,
  saleInvoiceSituationNote,
  type SaleInvoiceSituation,
} from "@/lib/sale-invoice-service";
import { personFullName, salePersonAddressLines, senderSaleContextProps, recipientSaleContextProps } from "@/components/sale/venta/parts-logistics";
import type { Recipient, Sender } from "@/components/sale/venta/parts-types";
import { senderPhonesLabel } from "@/components/sale/venta/parts-person";

export type SaleInvoicePaperProps = {
  branding?: OrganizationBranding | null;
  invoiceNumber: string;
  trackingToken?: string;
  parentInvoiceNumber?: string;
  boxPosition?: number;
  boxCount?: number;
  sender: Sender;
  recipient?: Recipient | null;
  box: string[];
  serviceOperation: LogisticsTaskType;
  serviceSituation?: SaleInvoiceSituation;
  className?: string;
  lineAmount?: string;
  totalLabel?: string;
  totalAmount?: string;
  billing?: InvoiceBillingSnapshot | null;
  emptyBoxDeliveredAt?: string | null;
  payNowDraft?: string;
  payNowDraftTouched?: boolean;
  onPayNowDraftChange?: (value: string) => void;
  onInitialPaymentWaivedChange?: (waived: boolean) => void;
};

function invoiceBoxTitle(label: string) {
  return label.replace(/^Caja\s+/i, "").trim() || label;
}

function customerInvoiceBoxChargeLines(
  billing: InvoiceBillingSnapshot,
  invoiceNumber: string,
  fallbackBoxTitle: string,
) {
  let position = 0;
  const configuredLines = billing.cartLines.flatMap((line) =>
    Array.from({ length: Math.max(1, Math.floor(line.quantity) || 1) }, () => {
      const boxPosition = position;
      position += 1;
      return {
        key: `box:${boxPosition}`,
        label: saleInvoiceBoxDescription(line.label, fallbackBoxTitle),
        invoiceNumber: invoiceBoxCode(invoiceNumber, boxPosition),
        amount: formatMoneyValue(parseMoneyValue(line.unitPrice)),
      };
    }),
  );

  if (configuredLines.length) {
    return configuredLines;
  }

  const boxCount = Math.max(1, Math.floor(billing.boxCount) || 1);
  const unitAmount = parseMoneyValue(billing.boxSubtotalBeforeDiscount) / boxCount;
  return Array.from({ length: boxCount }, (_, boxPosition) => ({
    key: `box:${boxPosition}`,
    label: saleInvoiceBoxDescription(undefined, fallbackBoxTitle),
    invoiceNumber: invoiceBoxCode(invoiceNumber, boxPosition),
    amount: formatMoneyValue(unitAmount),
  }));
}

function paymentTools({
  billing,
  paymentEditable,
  onPayNowDraftChange,
  onInitialPaymentWaivedChange,
}: {
  billing: InvoiceBillingSnapshot;
  paymentEditable: boolean;
  onPayNowDraftChange?: (value: string) => void;
  onInitialPaymentWaivedChange?: (waived: boolean) => void;
}) {
  if (!paymentEditable) {
    return null;
  }

  return (
    <span className="invoice-variant-3__payment-tools print:hidden">
      <button
        type="button"
        onClick={() =>
          onPayNowDraftChange?.(
            String(
              Math.min(
                parseMoneyValue(billing.minimumDeposit),
                parseMoneyValue(billing.quotedTotal),
              ),
            ),
          )
        }
        title="Restaurar depósito calculado"
        aria-label="Restaurar depósito calculado"
      >
        <RotateCcw className="h-3 w-3" aria-hidden="true" />
      </button>
      {onInitialPaymentWaivedChange ? (
        <button
          type="button"
          onClick={() => onInitialPaymentWaivedChange(true)}
          title="Poner abono en cero"
          aria-label="Poner abono en cero"
        >
          <X className="h-3 w-3" aria-hidden="true" />
        </button>
      ) : null}
    </span>
  );
}

export function SaleInvoicePaper({
  branding,
  invoiceNumber,
  trackingToken,
  parentInvoiceNumber,
  boxCount,
  sender,
  recipient,
  box,
  serviceOperation,
  serviceSituation = "standard",
  className,
  lineAmount,
  totalAmount,
  billing,
  emptyBoxDeliveredAt,
  payNowDraft,
  payNowDraftTouched = false,
  onPayNowDraftChange,
  onInitialPaymentWaivedChange,
}: SaleInvoicePaperProps) {
  const companyName = branding?.name?.trim() || PLATFORM_BRAND_TITLE;
  const companyBadgeLabel = organizationBrandInitials(
    branding?.shortName?.trim() || branding?.brandTitle || companyName,
  );
  const brandNote = "Cajas y envíos internacionales";
  const issuedAt = new Date().toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const emptyBoxDeliveredDate = emptyBoxDeliveredAt
    ? new Date(emptyBoxDeliveredAt).toLocaleDateString("es-MX", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    })
    : "";
  const boxTitle = invoiceBoxTitle(box[0] || "Paquete");
  const isBoxInvoice = Boolean(parentInvoiceNumber);
  const deliveryEta = box[4]?.trim();
  const documentBoxCount = billing?.boxCount || boxCount || 1;
  const situationNote = saleInvoiceSituationNote(serviceSituation, documentBoxCount);
  const amountLabel = lineAmount || box[1];
  const isPendingAmount = amountLabel?.toLowerCase() === "pendiente" && !billing;
  const paymentEditable = Boolean(billing && onPayNowDraftChange);
  const payNowInputValue = payNowDraftTouched
    ? payNowDraft ?? ""
    : payNowDraft || billing?.payNow.replace(/^\$/, "") || "";
  const initialPaymentWaived =
    paymentEditable && payNowDraftTouched && parseMoneyValue(payNowInputValue) === 0;
  const currency = "USD";
  const shipmentLabel = billing
    ? billing.cartLines.length === 1
      ? `${billing.cartLines[0]?.label || boxTitle}${billing.boxCount > 1 ? ` × ${billing.boxCount}` : ""}`
      : `${billing.boxCount} productos`
    : `Caja ${boxTitle}`;
  const itemChargeLines = billing
    ? [
      ...customerInvoiceBoxChargeLines(billing, invoiceNumber, boxTitle),
      ...(parseMoneyValue(billing.emptyBoxDelivery) > 0
        ? [{ key: "delivery", label: "Entrega a domicilio", amount: billing.emptyBoxDelivery }]
        : []),
      ...(parseMoneyValue(billing.fullBoxPickup) > 0
        ? [{ key: "pickup", label: "Recolección a domicilio", amount: billing.fullBoxPickup }]
        : []),
      ...(parseMoneyValue(billing.latePickupFee) > 0
        ? [{ key: "late-pickup", label: "Recolección fuera de plazo", amount: billing.latePickupFee }]
        : []),
    ]
    : [];
  const invoiceItems: InvoiceVariant3Item[] = billing
    ? itemChargeLines.map((line) => ({
      code: "invoiceNumber" in line ? line.invoiceNumber : line.key.toUpperCase(),
      label: line.label,
      detail: line.key.startsWith("box:") ? "Unidad física" : "Cargo logístico",
      quantity: 1,
      amount: line.amount,
    }))
    : [{
      code: invoiceNumber,
      label: shipmentLabel,
      detail: isPendingAmount ? "Se define al completar el envío" : undefined,
      quantity: 1,
      amount: amountLabel || "$0",
    }];
  const grossSubtotal = billing
    ? formatMoneyValue(
      parseMoneyValue(billing.boxSubtotalBeforeDiscount) +
      parseMoneyValue(billing.emptyBoxDelivery) +
      parseMoneyValue(billing.fullBoxPickup) +
      parseMoneyValue(billing.latePickupFee),
    )
    : undefined;
  const adjustments = billing && parseMoneyValue(billing.promotionDiscount) > 0
    ? [{ label: billing.promotion?.name || "Promoción", value: `-${billing.promotionDiscount}` }]
    : [];
  const totalValue = billing?.quotedTotal || totalAmount || amountLabel || "$0";
  const paymentStatus = billing && parseMoneyValue(billing.payNow) > 0
    ? "Abono registrado"
    : "Pago pendiente";
  const paymentAmount = billing
    ? paymentEditable && !initialPaymentWaived
      ? (
        <>
          <label className="invoice-variant-3__payment-input print:hidden">
            <span>{currency}</span>
            <input
              style={{ width: `${Math.max(payNowInputValue.length, 1)}ch` }}
              value={payNowInputValue}
              onChange={(event) =>
                onPayNowDraftChange?.(event.target.value.replace(/[^\d]/g, ""))
              }
              inputMode="numeric"
              aria-label="Abono"
            />
          </label>
          <span className="hidden print:inline">
            {formatInvoiceVariant3Amount(currency, billing.payNow)}
          </span>
        </>
      )
      : (
        <span>{formatInvoiceVariant3Amount(currency, initialPaymentWaived ? "$0" : billing.payNow)}</span>
      )
    : null;
  const originCity = sender.city?.trim() || "Origen";
  const destinationCity = recipient?.city?.trim()
    || (serviceSituation === "empty_box_handed_off" ? "Oficina" : "Destino");
  const serviceLabel = saleInvoiceServiceLabel(serviceOperation, serviceSituation, documentBoxCount);
  const service = billing
    ? `${serviceLabel} · ${documentBoxCount} ${documentBoxCount === 1 ? "caja" : "cajas"}`
    : serviceLabel;
  const senderEta = !recipient && saleInvoiceShowsDeliveryEta(serviceSituation)
    ? saleInvoiceEtaLabel(deliveryEta)
    : "";
  const recipientEta = recipient && saleInvoiceShowsDeliveryEta(serviceSituation)
    ? saleInvoiceEtaLabel(deliveryEta)
    : "";
  const showStatus = Boolean(billing) && serviceSituation !== "empty_box_handed_off";

  return (
    <InvoiceVariant3Layout
      className={`sale-invoice-paper ${className ?? ""}`}
      brand={{
        name: companyName,
        note: brandNote,
        mark: companyBadgeLabel,
        logoUrl: branding?.logoUrl || undefined,
      }}
      reference={invoiceNumber}
      issuedAt={issuedAt}
      status={showStatus ? paymentStatus : undefined}
      currency={currency}
      parties={[
        {
          label: isBoxInvoice ? "Remitente" : "Facturado a",
          name: personFullName(sender),
          detail: [senderPhonesLabel(sender), senderEta].filter(Boolean).join(" · "),
          lines: salePersonAddressLines(sender),
          contextProps: senderSaleContextProps(sender),
        },
        ...(recipient
          ? [{
            label: "Destinatario",
            name: personFullName(recipient),
            detail: [recipient.phone.trim(), recipient.country.trim(), recipientEta]
              .filter(Boolean)
              .join(" · "),
            lines: salePersonAddressLines(recipient),
            contextProps: recipientSaleContextProps(recipient),
          }]
          : []),
      ]}
      route={`${originCity} → ${recipient ? destinationCity : serviceSituation === "empty_box_handed_off" ? "Oficina" : destinationCity}`}
      service={service}
      items={invoiceItems}
      subtotal={billing ? grossSubtotal : undefined}
      adjustments={adjustments}
      total={totalValue}
      issuer={{
        name: companyName,
        lines: [brandNote, `Referencia: ${invoiceNumber}`],
      }}
      payment={billing ? {
        label: (
          <>
            {paymentTools({
              billing,
              paymentEditable,
              onPayNowDraftChange,
              onInitialPaymentWaivedChange,
            })}
            <span>{paymentStatus}</span>
          </>
        ),
        copy: <>Saldo pendiente: <strong>{formatInvoiceVariant3Amount(currency, billing.balanceDue)}</strong></>,
        amount: paymentAmount,
      } : undefined}
      notes={(
        <>
          {situationNote ? <p>{situationNote}</p> : null}
          <p>Conserva esta factura para rastreo, cobros y movimientos logísticos.</p>
          {billing && billing.pickupIncludedDays > 0 ? (
            <p>
              {emptyBoxDeliveredDate
                ? `Recolección incluida por ${billing.pickupIncludedDays} días desde el ${emptyBoxDeliveredDate}, fecha de entrega de la caja vacía.`
                : `Recolección incluida por ${billing.pickupIncludedDays} días. La fecha de entrega de la caja vacía está pendiente de registro.`}
              {parseMoneyValue(billing.latePickupFeeConfigured) > 0
                ? ` Después se cobra ${billing.latePickupFeeConfigured}.`
                : ""}
            </p>
          ) : null}
        </>
      )}
      footer={{ name: companyName, detail: `Documento comercial · Moneda: ${currency}` }}
      qr={
        <InvoiceQrCode
          invoiceNumber={invoiceNumber}
          trackingToken={trackingToken}
          size={56}
          className="flex h-16 w-16 items-center justify-center rounded-sm border border-zinc-400 bg-white p-1"
        />
      }
    />
  );
}

export function SaleBoxLabel({
  branding,
  invoiceNumber,
  parentInvoiceNumber,
  position,
  boxCount,
  sender,
  recipient,
  box,
  className,
}: {
  branding?: OrganizationBranding | null;
  invoiceNumber: string;
  parentInvoiceNumber: string;
  position: number;
  boxCount: number;
  sender: Sender;
  recipient?: Recipient;
  box: string[];
  className?: string;
}) {
  const companyName = branding?.name?.trim() || PLATFORM_BRAND_TITLE;
  const boxTitle = invoiceBoxTitle(box[0] || "Paquete");
  const recipientQrValue = recipient ? recipientExcelQrValue(recipient) : "";
  const countryName = recipient?.country.trim() || "";
  const countryCode = countryName ? resolveCountryCodeFromString(countryName) : "";

  return (
    <article
      className={`sale-box-label mx-auto flex min-h-[150mm] w-full max-w-[100mm] flex-col bg-white p-5 text-zinc-950 shadow-[0_18px_40px_rgba(0,0,0,0.2)] ${className ?? ""}`}
    >
      <header className="border-b-4 border-zinc-950 pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600">Etiqueta de caja</p>
            <p className="mt-1 truncate text-sm font-black">{companyName}</p>
          </div>
          <p className="shrink-0 text-[10px] font-black uppercase tracking-wide">{position} / {boxCount}</p>
        </div>
        <p className="mt-4 break-all font-mono text-[1.65rem] font-black leading-none tracking-[-0.06em]">{invoiceNumber}</p>
        <p className="mt-2 text-xs font-black uppercase tracking-[0.12em]">Caja {boxTitle}</p>
      </header>

      <section className={`grid border-b-2 border-zinc-950 ${recipient ? "grid-cols-2" : "grid-cols-1"}`}>
        <div className="grid grid-cols-[6.5rem_1fr] border-b border-zinc-300 py-3" {...senderSaleContextProps(sender)}>
          <span className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">Remitente</span>
          <strong className="text-sm font-black leading-tight">{personFullName(sender)}</strong>
        </div>
        {recipient ? (
          <div className="grid grid-cols-[6.5rem_1fr] border-b border-zinc-300 py-3" {...recipientSaleContextProps(recipient)}>
            <span className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">Destinatario</span>
            <strong className="text-sm font-black leading-tight">{personFullName(recipient)}</strong>
          </div>
        ) : null}
        {recipient && countryName ? (
          <div className="grid grid-cols-[6.5rem_1fr] py-3" {...recipientSaleContextProps(recipient)}>
            <span className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">País</span>
            <span className="inline-flex min-w-0 items-center gap-2">
              <CountryFlag name={countryName} code={countryCode} size="sm" mono />
              <strong className="min-w-0 truncate text-sm font-black leading-tight">
                {countryName}
                {countryCode ? <span className="ml-1.5 font-mono text-[10px] font-black text-zinc-600">{countryCode}</span> : null}
              </strong>
            </span>
          </div>
        ) : null}
      </section>

      <section className={`grid flex-1 items-start gap-4 py-5 ${recipient ? "grid-cols-2" : "grid-cols-1"}`}>
        <div className="mx-auto text-center">
          <DataQrCode value={invoiceNumber} label={`QR con invoice ${invoiceNumber}`} size={132} className="mx-auto flex aspect-square items-center justify-center border-2 border-zinc-950 bg-white p-2" />
          <p className="mt-2 text-[9px] font-black uppercase tracking-[0.16em]">Invoice</p>
          <p className="mt-1 break-all font-mono text-[9px] font-bold">{invoiceNumber}</p>
        </div>
        {recipient ? (
          <div className="text-center">
            <DataQrCode value={recipientQrValue} label={`QR con datos del destinatario ${personFullName(recipient)}`} size={132} className="mx-auto flex aspect-square items-center justify-center border-2 border-zinc-950 bg-white p-2" />
            <p className="mt-2 text-[9px] font-black uppercase tracking-[0.16em]">Datos para Excel</p>
            <p className="mt-1 text-[8px] font-bold leading-tight text-zinc-600">Columnas separadas por tabulaciones</p>
          </div>
        ) : null}
      </section>

      <footer className="border-t border-zinc-400 pt-3 text-[9px] font-bold text-zinc-600">
        Factura del cliente: <strong className="font-mono text-zinc-950">{parentInvoiceNumber}</strong>
      </footer>
    </article>
  );
}
