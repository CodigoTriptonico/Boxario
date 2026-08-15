import { Fragment, type ReactNode } from "react";

export type InvoiceVariant3Item = {
  code: string;
  label: string;
  detail?: string;
  quantity: number;
  amount: string;
};

export type InvoiceVariant3Party = {
  label: string;
  name: string;
  detail?: string;
  lines?: string[];
  contextProps?: Record<string, string | undefined>;
};

export type InvoiceVariant3LayoutProps = {
  brand: {
    name: string;
    note: string;
    mark: string;
    logoUrl?: string;
  };
  reference: string;
  issuedAt: string;
  status?: string;
  currency: string;
  parties: InvoiceVariant3Party[];
  route: string;
  service: string;
  items: InvoiceVariant3Item[];
  subtotal?: string;
  adjustments?: Array<{ label: string; value: string }>;
  total: string;
  issuer: {
    name: string;
    lines: string[];
  };
  payment?: {
    label: ReactNode;
    copy: ReactNode;
    amount: ReactNode;
  };
  notes?: ReactNode;
  footer?: {
    name: string;
    detail: string;
  };
  qr?: ReactNode;
  className?: string;
};

export function formatInvoiceVariant3Amount(currency: string, value: string) {
  const trimmed = value.trim();
  if (!trimmed || /pendiente/i.test(trimmed)) {
    return trimmed;
  }

  return `${currency} ${trimmed.replace("$", "")}`;
}

function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="invoice-variant-3__eyebrow">{children}</p>;
}

export function InvoiceVariant3Layout({
  brand,
  reference,
  issuedAt,
  status,
  currency,
  parties,
  route,
  service,
  items,
  subtotal,
  adjustments = [],
  total,
  issuer,
  payment,
  notes,
  footer,
  qr,
  className,
}: InvoiceVariant3LayoutProps) {
  const itemsHeadingId = `invoice-variant-3-items-${reference.replace(/[^a-z0-9]/gi, "-")}`;

  return (
    <article className={`invoice-variant-3 ${className ?? ""}`}>
      <style>{`
        .invoice-variant-3 {
          --ink: #18221f;
          --muted: #66716d;
          --line: #d8ddd8;
          --paper: #f7f5ef;
          --sage: #dfe9df;
          --green: #1f614e;
          box-sizing: border-box;
          width: min(100%, 210mm);
          min-height: 297mm;
          margin: 0 auto;
          padding: 15mm 16mm 13mm;
          overflow: hidden;
          color: var(--ink);
          background: var(--paper);
          font-family: Georgia, 'Times New Roman', serif;
          font-size: 10pt;
          line-height: 1.45;
        }
        .invoice-variant-3 *, .invoice-variant-3 *::before, .invoice-variant-3 *::after { box-sizing: border-box; }
        .invoice-variant-3__topline { display: flex; justify-content: space-between; gap: 24px; border-top: 1px solid var(--ink); padding-top: 8px; color: var(--muted); font-family: Arial, sans-serif; font-size: 8px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; }
        .invoice-variant-3__masthead { display: grid; grid-template-columns: 1fr auto; gap: 28px; align-items: end; padding: 25px 0 22px; border-bottom: 1px solid var(--ink); }
        .invoice-variant-3__brand { display: flex; align-items: center; gap: 12px; }
        .invoice-variant-3__mark { display: grid; width: 44px; height: 44px; place-items: center; overflow: hidden; color: var(--paper); background: var(--green); font-family: Arial, sans-serif; font-size: 21px; font-weight: 900; letter-spacing: -.08em; }
        .invoice-variant-3__mark img { width: 100%; height: 100%; object-fit: cover; }
        .invoice-variant-3__brand-name { margin: 0; font-family: Arial, sans-serif; font-size: 20px; font-weight: 900; letter-spacing: .16em; }
        .invoice-variant-3__brand-note { margin: 3px 0 0; color: var(--muted); font-family: Arial, sans-serif; font-size: 8px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; }
        .invoice-variant-3__title { margin: 0; color: var(--green); font-size: clamp(34px, 6vw, 58px); font-weight: 400; letter-spacing: -.06em; line-height: .85; }
        .invoice-variant-3__reference { margin: 10px 0 0; overflow-wrap: anywhere; font-family: 'Courier New', monospace; font-size: 11px; font-weight: 700; text-align: right; }
        .invoice-variant-3__status { display: inline-block; margin-top: 8px; padding: 4px 8px; color: var(--green); background: var(--sage); font-family: Arial, sans-serif; font-size: 8px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; }
        .invoice-variant-3__intro { display: grid; grid-template-columns: 1fr 1fr; gap: 28px; padding: 21px 0 24px; }
        .invoice-variant-3__parties { display: grid; gap: 18px; }
        .invoice-variant-3__eyebrow { margin: 0 0 7px; color: var(--green); font-family: Arial, sans-serif; font-size: 8px; font-weight: 800; letter-spacing: .15em; text-transform: uppercase; }
        .invoice-variant-3__party-name { margin: 0; font-size: 17px; font-weight: 700; }
        .invoice-variant-3__copy { margin: 3px 0 0; color: var(--muted); font-family: Arial, sans-serif; font-size: 9px; }
        .invoice-variant-3__route { margin: 0; overflow-wrap: anywhere; font-size: 25px; font-weight: 400; letter-spacing: -.04em; }
        .invoice-variant-3__service { margin: 5px 0 0; color: var(--muted); font-family: Arial, sans-serif; font-size: 9px; font-weight: 700; }
        .invoice-variant-3__section-heading { display: flex; justify-content: space-between; gap: 18px; align-items: baseline; margin: 0; padding: 11px 0 9px; border-top: 2px solid var(--ink); font-size: 17px; font-weight: 700; }
        .invoice-variant-3__section-heading span { color: var(--muted); font-family: Arial, sans-serif; font-size: 8px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; }
        .invoice-variant-3__table { width: 100%; border-collapse: collapse; font-family: Arial, sans-serif; }
        .invoice-variant-3__table th { padding: 8px 5px; border-bottom: 1px solid var(--line); color: var(--muted); font-size: 8px; letter-spacing: .1em; text-align: left; text-transform: uppercase; }
        .invoice-variant-3__table td { padding: 13px 5px; border-bottom: 1px solid var(--line); vertical-align: top; font-size: 10px; }
        .invoice-variant-3__table th:nth-child(2), .invoice-variant-3__table td:nth-child(2) { text-align: center; }
        .invoice-variant-3__table th:last-child, .invoice-variant-3__table td:last-child { text-align: right; }
        .invoice-variant-3__item-code { display: block; color: var(--green); font-family: 'Courier New', monospace; font-size: 8px; font-weight: 700; overflow-wrap: anywhere; }
        .invoice-variant-3__item-name { display: block; margin-top: 3px; font-weight: 800; }
        .invoice-variant-3__item-detail { display: block; margin-top: 3px; color: var(--muted); font-size: 9px; }
        .invoice-variant-3__amount { font-weight: 800; white-space: nowrap; }
        .invoice-variant-3__bottom { display: grid; grid-template-columns: 1fr 230px; gap: 38px; margin-top: 25px; }
        .invoice-variant-3__note { padding: 14px 16px; background: var(--sage); }
        .invoice-variant-3__note p { margin: 0; color: #345447; font-family: Arial, sans-serif; font-size: 9px; line-height: 1.55; }
        .invoice-variant-3__note strong { color: var(--ink); }
        .invoice-variant-3__totals { margin: 0; font-family: Arial, sans-serif; }
        .invoice-variant-3__total-row { display: flex; justify-content: space-between; gap: 15px; padding: 5px 0; color: var(--muted); font-size: 10px; }
        .invoice-variant-3__total-row dd { margin: 0; text-align: right; }
        .invoice-variant-3__total-row strong { color: var(--ink); }
        .invoice-variant-3__total-row--grand { margin-top: 6px; padding: 12px 0; border-top: 2px solid var(--ink); color: var(--ink); font-size: 15px; font-weight: 900; }
        .invoice-variant-3__payment { display: grid; grid-template-columns: 1fr auto; gap: 20px; align-items: center; margin-top: 25px; padding: 14px 16px; border: 1px solid var(--green); background: var(--green); color: var(--paper); font-family: Arial, sans-serif; }
        .invoice-variant-3__payment-label { display: flex; flex-wrap: wrap; align-items: center; gap: 5px; margin: 0; font-size: 8px; font-weight: 800; letter-spacing: .13em; text-transform: uppercase; }
        .invoice-variant-3__payment-copy { margin: 3px 0 0; color: #dce9df; font-size: 9px; }
        .invoice-variant-3__payment-copy strong { color: var(--paper); }
        .invoice-variant-3__payment-amount { font-size: 18px; font-weight: 900; text-align: right; white-space: nowrap; }
        .invoice-variant-3__payment-input { display: inline-flex; align-items: baseline; gap: 3px; }
        .invoice-variant-3__payment-input input { width: 5ch; max-width: 8ch; padding: 0; border: 0; outline: 0; color: var(--paper); background: transparent; font: inherit; text-align: right; }
        .invoice-variant-3__payment-input input:focus-visible { outline: 1px solid var(--paper); outline-offset: 3px; }
        .invoice-variant-3__payment-tools { display: inline-flex; align-items: center; gap: 3px; }
        .invoice-variant-3__payment-tools button { display: inline-grid; width: 18px; height: 18px; place-items: center; border: 1px solid rgba(247,245,239,.55); color: var(--paper); background: transparent; }
        .invoice-variant-3__payment-tools button:hover { background: rgba(247,245,239,.14); }
        .invoice-variant-3__footer { margin-top: 34px; padding-top: 13px; color: var(--muted); font-family: Arial, sans-serif; font-size: 8px; }
        .invoice-variant-3__footer-content { display: flex; justify-content: space-between; gap: 24px; }
        .invoice-variant-3__footer-topline { margin-top: 13px; }
        .invoice-variant-3__footer p { margin: 2px 0; }
        .invoice-variant-3__footer strong { color: var(--ink); }
        @media (max-width: 640px) { .invoice-variant-3 { min-height: auto; padding: 24px 18px; } .invoice-variant-3__masthead, .invoice-variant-3__intro, .invoice-variant-3__bottom { grid-template-columns: 1fr; gap: 18px; } .invoice-variant-3__reference { text-align: left; } .invoice-variant-3__bottom { gap: 22px; } .invoice-variant-3__footer-content { display: grid; gap: 10px; } .invoice-variant-3__footer-topline { gap: 12px; flex-wrap: wrap; } .invoice-variant-3__table { font-size: 9px; } }
        @media print { .invoice-variant-3 { width: 210mm; min-height: 297mm; margin: 0; padding: 0; } }
      `}</style>

      <header className="invoice-variant-3__masthead">
        <div className="invoice-variant-3__brand">
          <div className="invoice-variant-3__mark" aria-hidden="true">
            {brand.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={brand.logoUrl} alt="" />
            ) : brand.mark}
          </div>
          <div>
            <p className="invoice-variant-3__brand-name">{brand.name}</p>
            <p className="invoice-variant-3__brand-note">{brand.note}</p>
          </div>
        </div>
        <div>
          <h1 className="invoice-variant-3__title">Factura</h1>
          <p className="invoice-variant-3__reference">{reference}</p>
          {status ? <span className="invoice-variant-3__status">{status}</span> : null}
        </div>
      </header>

      <section className="invoice-variant-3__intro" aria-label="Resumen del documento">
        <div className="invoice-variant-3__parties">
          {parties.map((party) => (
            <div key={`${party.label}:${party.name}`} {...party.contextProps}>
              <Eyebrow>{party.label}</Eyebrow>
              <p className="invoice-variant-3__party-name">{party.name}</p>
              {party.detail ? <p className="invoice-variant-3__copy">{party.detail}</p> : null}
              {party.lines?.map((line) => (
                <p key={line} className="invoice-variant-3__copy">{line}</p>
              ))}
            </div>
          ))}
        </div>
        <div>
          <Eyebrow>Trayecto contratado</Eyebrow>
          <p className="invoice-variant-3__route">{route}</p>
          <p className="invoice-variant-3__service">{service}</p>
        </div>
      </section>

      <section aria-labelledby={itemsHeadingId}>
        <h2 id={itemsHeadingId} className="invoice-variant-3__section-heading">
          <span>Detalle</span>
          Servicios y cajas
          <span>{currency}</span>
        </h2>
        <table className="invoice-variant-3__table">
          <thead>
            <tr>
              <th>Concepto / trazabilidad</th>
              <th>Cant.</th>
              <th>Importe</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.code}>
                <td>
                  <span className="invoice-variant-3__item-code">{item.code}</span>
                  <span className="invoice-variant-3__item-name">{item.label}</span>
                  {item.detail ? <span className="invoice-variant-3__item-detail">{item.detail}</span> : null}
                </td>
                <td>{item.quantity}</td>
                <td className="invoice-variant-3__amount">
                  {formatInvoiceVariant3Amount(currency, item.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="invoice-variant-3__bottom" aria-label="Totales y condiciones">
        <div className="invoice-variant-3__note">
          <Eyebrow>Emisor</Eyebrow>
          <p>
            <strong>{issuer.name}</strong>
            {issuer.lines.map((line) => <Fragment key={line}><br />{line}</Fragment>)}
          </p>
        </div>
        <dl className="invoice-variant-3__totals">
          {subtotal ? (
            <div className="invoice-variant-3__total-row">
              <dt>Subtotal</dt>
              <dd><strong>{formatInvoiceVariant3Amount(currency, subtotal)}</strong></dd>
            </div>
          ) : null}
          {adjustments.map((adjustment) => (
            <div key={adjustment.label} className="invoice-variant-3__total-row">
              <dt>{adjustment.label}</dt>
              <dd><strong>{formatInvoiceVariant3Amount(currency, adjustment.value)}</strong></dd>
            </div>
          ))}
          <div className="invoice-variant-3__total-row invoice-variant-3__total-row--grand">
            <dt>Total</dt>
            <dd>{formatInvoiceVariant3Amount(currency, total)}</dd>
          </div>
        </dl>
      </section>

      {payment ? (
        <section className="invoice-variant-3__payment" aria-label="Estado de pago">
          <div>
            <p className="invoice-variant-3__payment-label">{payment.label}</p>
            <p className="invoice-variant-3__payment-copy">{payment.copy}</p>
          </div>
          <div className="invoice-variant-3__payment-amount">{payment.amount}</div>
        </section>
      ) : null}

      <footer className="invoice-variant-3__footer">
        <div className="invoice-variant-3__footer-content">
          <div>
            {notes ? <div>{notes}</div> : null}
          </div>
          {qr ? <div>{qr}</div> : null}
          {footer ? <div><strong>{footer.name}</strong><p>{footer.detail}</p></div> : null}
        </div>
        <div className="invoice-variant-3__topline invoice-variant-3__footer-topline">
          <span>{brand.name} / Documento comercial</span>
          <span>{issuedAt}</span>
        </div>
      </footer>
    </article>
  );
}

type DemoInvoiceItem = InvoiceVariant3Item;

const demoInvoice = {
  reference: "COL001BOG20010001",
  issuedAt: "14 agosto 2026",
  status: "Abono recibido",
  currency: "USD",
  seller: {
    name: "Boxario Logistics Inc.",
    detail: "Miami, Florida · Estados Unidos",
    taxId: "EIN 84-7263910",
  },
  customer: {
    name: "Gómez & Asociados S.A.S.",
    contact: "María Fernanda Gómez",
    detail: "Bogotá, Cundinamarca · Colombia",
  },
  route: "Miami → Bogotá",
  service: "Envío internacional · ruta estándar",
  items: [
    {
      code: "COL001BOG20010001-A",
      label: "Caja Boxario XL",
      detail: "60 × 40 × 40 cm · protección reforzada",
      quantity: 1,
      amount: "24.00",
    },
    {
      code: "COL001BOG20010001-B",
      label: "Caja Boxario XL",
      detail: "60 × 40 × 40 cm · protección reforzada",
      quantity: 1,
      amount: "24.00",
    },
    {
      code: "SERVICIO",
      label: "Transporte internacional",
      detail: "Seguimiento incluido · entrega en destino",
      quantity: 1,
      amount: "185.00",
    },
  ] satisfies DemoInvoiceItem[],
  subtotal: "233.00",
  protection: "18.50",
  total: "251.50",
  paid: "125.75",
  balance: "125.75",
};

function DemoAmount({ value }: { value: string }) {
  return <span>{formatInvoiceVariant3Amount(demoInvoice.currency, value)}</span>;
}

export function InvoiceVariant3() {
  return (
    <InvoiceVariant3Layout
      brand={{ name: "BOXARIO", note: "Logistics & commerce", mark: "B/" }}
      reference={demoInvoice.reference}
      issuedAt={demoInvoice.issuedAt}
      status={demoInvoice.status}
      currency={demoInvoice.currency}
      parties={[{
        label: "Facturado a",
        name: demoInvoice.customer.name,
        detail: `${demoInvoice.customer.contact} · ${demoInvoice.customer.detail}`,
      }]}
      route={demoInvoice.route}
      service={demoInvoice.service}
      items={demoInvoice.items}
      subtotal={demoInvoice.subtotal}
      adjustments={[{ label: "Protección adicional", value: demoInvoice.protection }]}
      total={demoInvoice.total}
      issuer={{
        name: demoInvoice.seller.name,
        lines: [demoInvoice.seller.detail, demoInvoice.seller.taxId, `Referencia: ${demoInvoice.reference}`],
      }}
      payment={{
        label: "Abono registrado · transferencia bancaria",
        copy: <>Saldo pendiente: <strong><DemoAmount value={demoInvoice.balance} /></strong></>,
        amount: <DemoAmount value={demoInvoice.paid} />,
      }}
      notes={<><strong>Condiciones</strong><p>Documento demo para revisión visual. No modifica facturación ni logística.</p></>}
      footer={{ name: "Boxario Logistics Inc.", detail: "billing@boxario.com · Moneda: USD" }}
    />
  );
}

export default InvoiceVariant3;
