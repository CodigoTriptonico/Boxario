import { CountryFlag } from "@/components/country-flag";
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
import { saleInvoiceEtaLabel, saleInvoiceServiceLabel } from "@/lib/sale-invoice-service";
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
  className?: string;
  lineAmount?: string;
  totalLabel?: string;
  totalAmount?: string;
  billing?: InvoiceBillingSnapshot | null;
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
        label: line.label || fallbackBoxTitle,
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
    label: fallbackBoxTitle,
    invoiceNumber: invoiceBoxCode(invoiceNumber, boxPosition),
    amount: formatMoneyValue(unitAmount),
  }));
}

function InvoicePartyCard({
  label,
  name,
  phone,
  addressLines,
  country,
  eta,
  contextProps,
}: {
  label: string;
  name: string;
  phone?: string;
  addressLines: string[];
  country?: string;
  eta?: string;
  contextProps?: Record<string, string | undefined>;
}) {
  const etaLabel = saleInvoiceEtaLabel(eta);

  return (
    <div
      className="relative overflow-hidden rounded-sm border border-zinc-300 bg-white px-4 py-3"
      {...contextProps}
    >
      <p className="text-[8px] font-black uppercase tracking-[0.22em] text-zinc-500">{label}</p>
      <p className="mt-1.5 text-[15px] font-black leading-snug text-zinc-950">{name}</p>
      {phone ? <p className="mt-1 text-[11px] font-bold leading-snug text-zinc-700">{phone}</p> : null}
      {addressLines.map((line) => (
        <p key={line} className="mt-0.5 text-[11px] leading-snug text-zinc-600">
          {line}
        </p>
      ))}
      {country || etaLabel ? (
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] leading-snug">
          {country ? <span className="font-black text-zinc-950">{country}</span> : null}
          {country && etaLabel ? <span className="text-zinc-400">·</span> : null}
          {etaLabel ? <span className="font-bold text-zinc-600">{etaLabel}</span> : null}
        </div>
      ) : null}
    </div>
  );
}

export function SaleInvoicePaper({
  branding,
  invoiceNumber,
  trackingToken,
  parentInvoiceNumber,
  boxPosition,
  boxCount,
  sender,
  recipient,
  box,
  serviceOperation,
  className,
  lineAmount,
  totalLabel,
  totalAmount,
  billing,
  payNowDraft,
  payNowDraftTouched = false,
  onPayNowDraftChange,
  onInitialPaymentWaivedChange,
}: SaleInvoicePaperProps) {
  const companyName = branding?.name?.trim() || PLATFORM_BRAND_TITLE;
  const companyBadgeLabel = organizationBrandInitials(
    branding?.shortName?.trim() || branding?.brandTitle || companyName,
  );
  const issuedAt = new Date().toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const boxTitle = invoiceBoxTitle(box[0] || "Paquete");
  const isBoxInvoice = Boolean(parentInvoiceNumber);
  const deliveryEta = box[4]?.trim();
  const amountLabel = lineAmount || box[1];
  const isPendingAmount = amountLabel?.toLowerCase() === "pendiente" && !billing;
  const paymentEditable = Boolean(billing && onPayNowDraftChange);
  const payNowInputValue = payNowDraftTouched
    ? payNowDraft ?? ""
    : payNowDraft || billing?.payNow.replace(/^\$/, "") || "";
  const initialPaymentWaived =
    paymentEditable && payNowDraftTouched && parseMoneyValue(payNowInputValue) === 0;
  const showInitialPaymentRow = Boolean(
    billing && parseMoneyValue(billing.payNow) > 0,
  );
  const invoiceAmountCellClass =
    "min-w-[6rem] shrink-0 text-right font-serif text-xl font-black tabular-nums leading-none text-zinc-950";
  const invoiceAmountInputClass =
    "min-w-[1ch] max-w-[7rem] bg-transparent p-0 text-right font-serif text-xl font-black tabular-nums leading-none text-zinc-950 outline-none";
  const chargeLines = billing
    ? [
      ...customerInvoiceBoxChargeLines(billing, invoiceNumber, boxTitle),
      ...(parseMoneyValue(billing.promotionDiscount) > 0
        ? [
          {
            key: "promotion",
            label: billing.promotion?.name || "Promoción",
            amount: `-${billing.promotionDiscount}`,
          },
        ]
        : []),
      ...(parseMoneyValue(billing.emptyBoxDelivery) > 0
        ? [{ key: "delivery", label: "Entrega a domicilio", amount: billing.emptyBoxDelivery }]
        : []),
      ...(parseMoneyValue(billing.fullBoxPickup) > 0
        ? [{ key: "pickup", label: "Recolección a domicilio", amount: billing.fullBoxPickup }]
        : []),
    ]
    : [];
  // Con abono y una sola línea, la línea ya es el total: no repetir Total.
  // Sin abono, siempre se declara "Debe" para no dejar el importe sin estado de pago.
  const showQuotedTotalRow =
    Boolean(billing) && showInitialPaymentRow && chargeLines.length !== 1;
  const showBalanceDueRow = Boolean(billing) && !showInitialPaymentRow;
  const hideSoleChargeAmount = showBalanceDueRow && chargeLines.length === 1;
  const showTotalsDivider = showInitialPaymentRow || showBalanceDueRow;
  const shipmentLabel = billing
    ? billing.cartLines.length === 1
      ? `${billing.cartLines[0]?.label || boxTitle}${billing.boxCount > 1 ? ` × ${billing.boxCount}` : ""
      }`
      : `${billing.boxCount} productos`
    : `Caja ${boxTitle}`;

  return (
    <article
      className={`sale-invoice-paper relative mx-auto flex w-full max-w-[210mm] min-h-[297mm] flex-col overflow-hidden rounded-sm bg-white text-zinc-950 shadow-[0_1px_0_rgba(255,255,255,0.25),0_18px_40px_rgba(0,0,0,0.18),0_44px_70px_rgba(0,0,0,0.12)] ${className ?? ""}`}
    >
      <div className="flex flex-1 flex-col px-8 py-7 sm:px-10 sm:py-9">
        <div className="mb-5 grid grid-cols-[auto_1fr_auto] items-center gap-3 border-b-2 border-zinc-950 pb-3">
          <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-sm border-2 border-zinc-950 bg-white text-[14px] font-black tracking-[-0.04em] shadow-[3px_3px_0_#d4d4d8]">
            {branding?.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={branding.logoUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              companyBadgeLabel
            )}
          </div>
          <div className="min-w-0">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-700">
              Cajas y envíos internacionales
            </p>
            <div className="mt-1 h-px bg-zinc-300" />
          </div>
          <div className="text-right text-[8px] font-black uppercase tracking-[0.18em] text-zinc-600">
            <span>USA</span>
            <span className="mx-1.5">/</span>
            <span>MX</span>
          </div>
        </div>
        <header className="relative overflow-hidden border-b-2 border-zinc-950 pb-6">
          <div className="absolute right-0 top-0 h-20 w-20 rounded-full border border-zinc-200" />
          <div className="absolute right-8 top-8 h-24 w-24 rounded-full border border-zinc-200" />
          <div className="relative flex items-start justify-between gap-6">
            <div className="min-w-0">
              <p className="font-serif text-[1.55rem] font-black leading-none tracking-tight text-zinc-950">
                {companyName}
              </p>
              <p className="mt-2 max-w-[15rem] text-[10px] font-bold uppercase leading-snug tracking-[0.08em] text-zinc-600">
                Cajas y envíos internacionales
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-[9px] font-black uppercase tracking-[0.28em] text-zinc-600">
                {isBoxInvoice ? "Factura de caja" : "Factura"}
              </p>
              <p className="mt-1 font-serif text-[1.65rem] font-black tabular-nums leading-tight text-zinc-950">
                {invoiceNumber}
              </p>
              <p className="mt-1 text-[10px] font-bold text-zinc-600">{issuedAt}</p>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-[8px] font-black uppercase tracking-[0.2em] text-zinc-600">
            <span className="h-px bg-zinc-400" />
            <span>{saleInvoiceServiceLabel(serviceOperation)}</span>
            <span className="h-px bg-zinc-400" />
          </div>
        </header>

        <section className={`mt-5 grid gap-3 ${recipient ? "grid-cols-2" : "grid-cols-1"}`}>
          <InvoicePartyCard
            label="Remitente"
            name={personFullName(sender)}
            phone={senderPhonesLabel(sender)}
            addressLines={salePersonAddressLines(sender)}
            eta={!recipient ? deliveryEta : undefined}
            contextProps={senderSaleContextProps(sender)}
          />
          {recipient ? (
            <InvoicePartyCard
              label="Destinatario"
              name={personFullName(recipient)}
              phone={recipient.phone.trim() || undefined}
              addressLines={salePersonAddressLines(recipient)}
              country={recipient.country.trim() || undefined}
              eta={deliveryEta}
              contextProps={recipientSaleContextProps(recipient)}
            />
          ) : null}
        </section>

        <section className="mt-6 flex-1">
          <div className="rounded-sm border border-zinc-300 bg-white px-4 py-4">
            {isBoxInvoice ? (
              <div className="grid gap-3">
                <div className="flex items-end justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[9px] font-black uppercase tracking-[0.18em] text-zinc-600">
                      Caja identificada
                    </p>
                    <p className="mt-1 font-serif text-xl font-black leading-tight text-zinc-950">
                      Caja {boxTitle}
                    </p>
                  </div>
                  {boxPosition && boxCount ? (
                    <span className="shrink-0 rounded-sm border border-zinc-400 bg-zinc-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-zinc-900">
                      Caja {boxPosition} de {boxCount}
                    </span>
                  ) : null}
                </div>
                <p className="border-t border-zinc-300 pt-3 text-[10px] font-bold leading-snug text-zinc-600">
                  Factura principal: {parentInvoiceNumber}. Esta hoja identifica esta caja; el cobro total permanece en la factura principal.
                </p>
              </div>
            ) : billing ? (
              <div className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2">
                {chargeLines.map((line) => (
                  <div key={line.key} className="contents">
                    <span className="flex min-w-0 items-baseline gap-2 text-[12px] font-bold text-zinc-900">
                      {"invoiceNumber" in line ? (
                        <strong className="shrink-0 font-mono text-[10px] font-black tabular-nums text-zinc-950">
                          {line.invoiceNumber}
                        </strong>
                      ) : null}
                      <span className="truncate">{line.label}</span>
                    </span>
                    {hideSoleChargeAmount ? (
                      <span className="min-w-[6rem] shrink-0" aria-hidden />
                    ) : (
                      <span className={invoiceAmountCellClass}>{line.amount}</span>
                    )}
                  </div>
                ))}
                {showTotalsDivider ? (
                  <div className="col-span-2 my-1 border-t border-zinc-300" />
                ) : null}
                {showInitialPaymentRow ? (
                  <>
                    {showQuotedTotalRow ? (
                      <>
                        <p className="text-[11px] font-black text-zinc-900">Total</p>
                        <span className={invoiceAmountCellClass}>{billing.quotedTotal}</span>
                      </>
                    ) : null}
                    <p className="text-[11px] font-black text-zinc-900">Abono</p>
                    <div className={invoiceAmountCellClass}>
                      {paymentEditable && !initialPaymentWaived ? (
                        <>
                          <label className="print:hidden inline-flex items-baseline justify-end gap-0.5 whitespace-nowrap">
                            −$<input
                              className={invoiceAmountInputClass}
                              style={{ width: `${Math.max(payNowInputValue.length, 1)}ch` }}
                              value={payNowInputValue}
                              onChange={(event) =>
                                onPayNowDraftChange?.(event.target.value.replace(/[^\d]/g, ""))
                              }
                              inputMode="numeric"
                              aria-label="Abono"
                            />
                          </label>
                          <span className="hidden print:inline">−{billing.payNow}</span>
                        </>
                      ) : (
                        <>−{billing.payNow}</>
                      )}
                    </div>
                    <p className="text-[11px] font-black text-zinc-900">Saldo pendiente</p>
                    <span className={invoiceAmountCellClass}>{billing.balanceDue}</span>
                  </>
                ) : showBalanceDueRow ? (
                  <>
                    <p className="text-[11px] font-black text-zinc-900">Debe</p>
                    <span className={invoiceAmountCellClass}>{billing.balanceDue}</span>
                  </>
                ) : null}
                {paymentEditable && onInitialPaymentWaivedChange ? (
                  <label className="print:hidden col-span-2 mt-1 flex cursor-pointer items-start gap-2 border-t border-zinc-200 pt-2">
                    <input
                      type="checkbox"
                      checked={initialPaymentWaived}
                      onChange={(event) =>
                        onInitialPaymentWaivedChange(event.target.checked)
                      }
                      className="mt-0.5 h-4 w-4 shrink-0 accent-zinc-950"
                    />
                    <span className="min-w-0">
                      <span className="block text-[11px] font-black text-zinc-900">
                        Sin abono inicial
                      </span>
                      <span className="block text-[10px] font-bold leading-snug text-zinc-600">
                        El depósito no se cobra ahora; el total queda pendiente.
                      </span>
                    </span>
                  </label>
                ) : null}
              </div>
            ) : (
              <div className="flex items-end justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[9px] font-black uppercase tracking-[0.18em] text-zinc-600">Tu envío</p>
                  <p className="mt-1 font-serif text-xl font-black leading-tight text-zinc-950">
                    {shipmentLabel}
                  </p>
                  {isPendingAmount ? (
                    <p className="mt-1 text-[11px] font-bold leading-snug text-zinc-600">
                      Se define al completar el envío
                    </p>
                  ) : null}
                </div>
                {isPendingAmount ? (
                  <span className="shrink-0 rounded-sm border border-zinc-500 bg-zinc-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-zinc-900">
                    Abierto
                  </span>
                ) : (
                  <div className="shrink-0 text-right">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-600">
                      {totalLabel || "Total"}
                    </p>
                    <span className="font-serif text-[1.65rem] font-black leading-none tabular-nums text-zinc-950">
                      {totalAmount || box[1]}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
        <footer className="mt-6 grid grid-cols-[1fr_auto] items-end gap-5 border-t border-zinc-300 pt-4">
          <p className="max-w-[23rem] text-[9px] font-bold uppercase leading-relaxed tracking-[0.12em] text-zinc-600">
            Conserva esta factura para rastreo, cobros y movimientos logisticos.
          </p>
          <InvoiceQrCode
            invoiceNumber={invoiceNumber}
            trackingToken={trackingToken}
            size={56}
            className="flex h-16 w-16 items-center justify-center rounded-sm border border-zinc-400 bg-white p-1"
          />
        </footer>
      </div>
    </article>
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
  recipient: Recipient;
  box: string[];
  className?: string;
}) {
  const companyName = branding?.name?.trim() || PLATFORM_BRAND_TITLE;
  const boxTitle = invoiceBoxTitle(box[0] || "Paquete");
  const recipientQrValue = recipientExcelQrValue(recipient);
  const countryName = recipient.country.trim();
  const countryCode = countryName ? resolveCountryCodeFromString(countryName) : "";

  return (
    <article
      className={`sale-box-label mx-auto flex min-h-[150mm] w-full max-w-[100mm] flex-col bg-white p-5 text-zinc-950 shadow-[0_18px_40px_rgba(0,0,0,0.2)] ${className ?? ""}`}
    >
      <header className="border-b-4 border-zinc-950 pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600">
              Etiqueta de caja
            </p>
            <p className="mt-1 truncate text-sm font-black">{companyName}</p>
          </div>
          <p className="shrink-0 text-[10px] font-black uppercase tracking-wide">
            {position} / {boxCount}
          </p>
        </div>
        <p className="mt-4 break-all font-mono text-[1.65rem] font-black leading-none tracking-[-0.06em]">
          {invoiceNumber}
        </p>
        <p className="mt-2 text-xs font-black uppercase tracking-[0.12em]">
          Caja {boxTitle}
        </p>
      </header>

      <section className="grid border-b-2 border-zinc-950">
        <div
          className="grid grid-cols-[6.5rem_1fr] border-b border-zinc-300 py-3"
          {...senderSaleContextProps(sender)}
        >
          <span className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">
            Remitente
          </span>
          <strong className="text-sm font-black leading-tight">{personFullName(sender)}</strong>
        </div>
        <div
          className="grid grid-cols-[6.5rem_1fr] border-b border-zinc-300 py-3"
          {...recipientSaleContextProps(recipient)}
        >
          <span className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">
            Destinatario
          </span>
          <strong className="text-sm font-black leading-tight">{personFullName(recipient)}</strong>
        </div>
        {countryName ? (
          <div
            className="grid grid-cols-[6.5rem_1fr] py-3"
            {...recipientSaleContextProps(recipient)}
          >
            <span className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">
              País
            </span>
            <span className="inline-flex min-w-0 items-center gap-2">
              <CountryFlag name={countryName} code={countryCode} size="sm" mono />
              <strong className="min-w-0 truncate text-sm font-black leading-tight">
                {countryName}
                {countryCode ? (
                  <span className="ml-1.5 font-mono text-[10px] font-black text-zinc-600">
                    {countryCode}
                  </span>
                ) : null}
              </strong>
            </span>
          </div>
        ) : null}
      </section>

      <section className="grid flex-1 grid-cols-2 items-start gap-4 py-5">
        <div className="text-center">
          <DataQrCode
            value={invoiceNumber}
            label={`QR con invoice ${invoiceNumber}`}
            size={132}
            className="mx-auto flex aspect-square items-center justify-center border-2 border-zinc-950 bg-white p-2"
          />
          <p className="mt-2 text-[9px] font-black uppercase tracking-[0.16em]">Invoice</p>
          <p className="mt-1 break-all font-mono text-[9px] font-bold">{invoiceNumber}</p>
        </div>
        <div className="text-center">
          <DataQrCode
            value={recipientQrValue}
            label={`QR con datos del destinatario ${personFullName(recipient)}`}
            size={132}
            className="mx-auto flex aspect-square items-center justify-center border-2 border-zinc-950 bg-white p-2"
          />
          <p className="mt-2 text-[9px] font-black uppercase tracking-[0.16em]">
            Datos para Excel
          </p>
          <p className="mt-1 text-[8px] font-bold leading-tight text-zinc-600">
            Columnas separadas por tabulaciones
          </p>
        </div>
      </section>

      <footer className="border-t border-zinc-400 pt-3 text-[9px] font-bold text-zinc-600">
        Factura del cliente:{" "}
        <strong className="font-mono text-zinc-950">{parentInvoiceNumber}</strong>
      </footer>
    </article>
  );
}
