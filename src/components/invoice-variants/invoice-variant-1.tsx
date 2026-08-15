const demoInvoice = {
  number: "COL20010010001",
  issueDate: "14 de agosto de 2026",
  dueDate: "21 de agosto de 2026",
  currency: "USD",
  seller: {
    name: "Boxario Logistics Inc.",
    legalName: "BOXARIO LOGISTICS INC.",
    address: "1200 Brickell Avenue, Suite 800",
    city: "Miami, FL 33131 · Estados Unidos",
    taxId: "EIN 84-7263910",
    email: "billing@boxario.com",
  },
  customer: {
    name: "María Fernanda Gómez",
    company: "Gómez & Asociados S.A.S.",
    address: "Carrera 11 # 93-07, Oficina 504",
    city: "Bogotá, Cundinamarca · Colombia",
    taxId: "NIT 901.442.781-6",
    email: "compras@gomezyasociados.co",
  },
  items: [
    {
      description: "Servicio de envío internacional",
      detail: "Miami → Bogotá · Ruta estándar con seguimiento",
      quantity: "1",
      unitPrice: "185.00",
      total: "185.00",
    },
    {
      description: "Caja Boxario XL",
      detail: "Caja reforzada · 60 × 40 × 40 cm",
      quantity: "2",
      unitPrice: "24.00",
      total: "48.00",
    },
    {
      description: "Protección adicional de contenido",
      detail: "Cobertura declarada hasta USD 1,000.00",
      quantity: "1",
      unitPrice: "18.50",
      total: "18.50",
    },
  ],
  subtotal: "251.50",
  discount: "0.00",
  tax: "0.00",
  total: "251.50",
  paid: "125.75",
  balance: "125.75",
};

function Money({ value }: { value: string }) {
  return <span>{demoInvoice.currency} {value}</span>;
}

export function InvoiceVariant1() {
  return (
    <article className="invoice-variant-1">
      <style>{`
        .invoice-variant-1 {
          --invoice-ink: #15243b;
          --invoice-muted: #607089;
          --invoice-line: #d8e0ea;
          --invoice-blue: #1559a6;
          --invoice-pale: #f2f6fa;
          box-sizing: border-box;
          width: min(100%, 210mm);
          min-height: 297mm;
          margin: 0 auto;
          padding: 18mm 17mm 15mm;
          color: var(--invoice-ink);
          background: #fff;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 10pt;
          line-height: 1.45;
        }
        .invoice-variant-1 *,
        .invoice-variant-1 *::before,
        .invoice-variant-1 *::after { box-sizing: border-box; }
        .invoice-variant-1__masthead {
          display: flex;
          justify-content: space-between;
          gap: 32px;
          padding-bottom: 24px;
          border-bottom: 3px solid var(--invoice-blue);
        }
        .invoice-variant-1__brand { display: flex; gap: 12px; align-items: center; }
        .invoice-variant-1__mark {
          display: grid;
          width: 42px;
          height: 42px;
          place-items: center;
          color: #fff;
          background: var(--invoice-blue);
          font-size: 19px;
          font-weight: 800;
          letter-spacing: -1px;
        }
        .invoice-variant-1__brand-name {
          margin: 0;
          color: var(--invoice-ink);
          font-size: 20px;
          font-weight: 800;
          letter-spacing: .08em;
        }
        .invoice-variant-1__brand-subtitle {
          margin: 2px 0 0;
          color: var(--invoice-muted);
          font-size: 8px;
          font-weight: 700;
          letter-spacing: .16em;
          text-transform: uppercase;
        }
        .invoice-variant-1__title-block { text-align: right; }
        .invoice-variant-1__title {
          margin: 0;
          color: var(--invoice-blue);
          font-size: 27px;
          font-weight: 800;
          letter-spacing: .06em;
          line-height: 1;
          text-transform: uppercase;
        }
        .invoice-variant-1__reference {
          margin: 7px 0 0;
          color: var(--invoice-ink);
          font-family: "Courier New", monospace;
          font-size: 11px;
          font-weight: 700;
        }
        .invoice-variant-1__meta {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px 26px;
          margin: 22px 0 25px;
          padding: 14px 16px;
          background: var(--invoice-pale);
        }
        .invoice-variant-1__meta-item { display: flex; justify-content: space-between; gap: 12px; }
        .invoice-variant-1__label {
          color: var(--invoice-muted);
          font-size: 8px;
          font-weight: 800;
          letter-spacing: .09em;
          text-transform: uppercase;
        }
        .invoice-variant-1__meta-value { font-weight: 700; text-align: right; }
        .invoice-variant-1__parties {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 38px;
          margin-bottom: 26px;
        }
        .invoice-variant-1__party { min-width: 0; }
        .invoice-variant-1__party-heading {
          margin: 0 0 9px;
          padding-bottom: 7px;
          border-bottom: 1px solid var(--invoice-line);
          color: var(--invoice-blue);
          font-size: 9px;
          font-weight: 800;
          letter-spacing: .1em;
          text-transform: uppercase;
        }
        .invoice-variant-1__party strong { display: block; margin-bottom: 3px; font-size: 12px; }
        .invoice-variant-1__party p { margin: 2px 0; color: var(--invoice-muted); font-size: 9px; }
        .invoice-variant-1__table { width: 100%; border-collapse: collapse; }
        .invoice-variant-1__table th {
          padding: 10px 8px;
          color: #fff;
          background: var(--invoice-blue);
          font-size: 8px;
          font-weight: 800;
          letter-spacing: .08em;
          text-align: left;
          text-transform: uppercase;
        }
        .invoice-variant-1__table th:first-child,
        .invoice-variant-1__table td:first-child { padding-left: 12px; }
        .invoice-variant-1__table th:not(:first-child),
        .invoice-variant-1__table td:not(:first-child) { text-align: right; }
        .invoice-variant-1__table td { padding: 13px 8px; border-bottom: 1px solid var(--invoice-line); vertical-align: top; }
        .invoice-variant-1__table tbody tr:nth-child(even) { background: #f8fafc; }
        .invoice-variant-1__item-name { display: block; font-weight: 700; }
        .invoice-variant-1__item-detail { display: block; margin-top: 2px; color: var(--invoice-muted); font-size: 9px; }
        .invoice-variant-1__totals-wrap { display: flex; justify-content: flex-end; margin-top: 17px; }
        .invoice-variant-1__totals { width: 245px; }
        .invoice-variant-1__total-row { display: flex; justify-content: space-between; gap: 20px; padding: 5px 0; color: var(--invoice-muted); }
        .invoice-variant-1__total-row strong { color: var(--invoice-ink); }
        .invoice-variant-1__total-row--grand {
          margin-top: 7px;
          padding: 12px 0;
          border-top: 2px solid var(--invoice-ink);
          color: var(--invoice-ink);
          font-size: 14px;
          font-weight: 800;
        }
        .invoice-variant-1__payment {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 22px;
          align-items: center;
          margin-top: 24px;
          padding: 13px 16px;
          border-left: 4px solid #2e8b68;
          background: #f0f8f4;
        }
        .invoice-variant-1__payment p { margin: 0; color: #2b5d4a; font-size: 9px; }
        .invoice-variant-1__payment strong { display: block; color: #1c5b43; font-size: 11px; }
        .invoice-variant-1__payment-amount { color: #1c5b43; font-size: 15px; font-weight: 800; text-align: right; }
        .invoice-variant-1__footer {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 35px;
          margin-top: 34px;
          padding-top: 15px;
          border-top: 1px solid var(--invoice-line);
          color: var(--invoice-muted);
          font-size: 8px;
        }
        .invoice-variant-1__footer p { margin: 3px 0; }
        .invoice-variant-1__footer strong { color: var(--invoice-ink); }
        @media (max-width: 640px) {
          .invoice-variant-1 { min-height: auto; padding: 24px 18px; }
          .invoice-variant-1__masthead, .invoice-variant-1__parties { grid-template-columns: 1fr; display: grid; gap: 20px; }
          .invoice-variant-1__title-block { text-align: left; }
          .invoice-variant-1__meta, .invoice-variant-1__footer { grid-template-columns: 1fr; }
          .invoice-variant-1__table { font-size: 9px; }
          .invoice-variant-1__table th, .invoice-variant-1__table td { padding-right: 4px; padding-left: 4px; }
        }
        @media print {
          .invoice-variant-1 { width: 210mm; min-height: 297mm; margin: 0; padding: 0; }
          .invoice-variant-1__masthead { padding-top: 1mm; }
          .invoice-variant-1__table tbody tr:nth-child(even) { background: #f8fafc !important; }
        }
      `}</style>

      <header className="invoice-variant-1__masthead">
        <div className="invoice-variant-1__brand">
          <div className="invoice-variant-1__mark" aria-hidden="true">B</div>
          <div>
            <p className="invoice-variant-1__brand-name">BOXARIO</p>
            <p className="invoice-variant-1__brand-subtitle">Logistics &amp; commerce</p>
          </div>
        </div>
        <div className="invoice-variant-1__title-block">
          <h1 className="invoice-variant-1__title">Factura</h1>
          <p className="invoice-variant-1__reference">{demoInvoice.number}</p>
        </div>
      </header>

      <section className="invoice-variant-1__meta" aria-label="Información de factura">
        <div className="invoice-variant-1__meta-item"><span className="invoice-variant-1__label">Fecha de emisión</span><span className="invoice-variant-1__meta-value">{demoInvoice.issueDate}</span></div>
        <div className="invoice-variant-1__meta-item"><span className="invoice-variant-1__label">Vencimiento</span><span className="invoice-variant-1__meta-value">{demoInvoice.dueDate}</span></div>
        <div className="invoice-variant-1__meta-item"><span className="invoice-variant-1__label">Moneda</span><span className="invoice-variant-1__meta-value">{demoInvoice.currency}</span></div>
        <div className="invoice-variant-1__meta-item"><span className="invoice-variant-1__label">Estado</span><span className="invoice-variant-1__meta-value">Abono recibido</span></div>
      </section>

      <section className="invoice-variant-1__parties">
        <div className="invoice-variant-1__party">
          <h2 className="invoice-variant-1__party-heading">Emisor</h2>
          <strong>{demoInvoice.seller.legalName}</strong>
          <p>{demoInvoice.seller.address}</p><p>{demoInvoice.seller.city}</p>
          <p>{demoInvoice.seller.taxId} · {demoInvoice.seller.email}</p>
        </div>
        <div className="invoice-variant-1__party">
          <h2 className="invoice-variant-1__party-heading">Facturar a</h2>
          <strong>{demoInvoice.customer.name}</strong>
          <p>{demoInvoice.customer.company} · {demoInvoice.customer.taxId}</p>
          <p>{demoInvoice.customer.address}</p><p>{demoInvoice.customer.city}</p>
          <p>{demoInvoice.customer.email}</p>
        </div>
      </section>

      <table className="invoice-variant-1__table">
        <thead><tr><th>Descripción</th><th>Cant.</th><th>Precio unitario</th><th>Importe</th></tr></thead>
        <tbody>{demoInvoice.items.map((item) => <tr key={item.description}><td><span className="invoice-variant-1__item-name">{item.description}</span><span className="invoice-variant-1__item-detail">{item.detail}</span></td><td>{item.quantity}</td><td><Money value={item.unitPrice} /></td><td><strong><Money value={item.total} /></strong></td></tr>)}</tbody>
      </table>

      <div className="invoice-variant-1__totals-wrap"><div className="invoice-variant-1__totals">
        <div className="invoice-variant-1__total-row"><span>Subtotal</span><strong><Money value={demoInvoice.subtotal} /></strong></div>
        <div className="invoice-variant-1__total-row"><span>Descuento</span><strong><Money value={demoInvoice.discount} /></strong></div>
        <div className="invoice-variant-1__total-row"><span>Impuestos</span><strong><Money value={demoInvoice.tax} /></strong></div>
        <div className="invoice-variant-1__total-row invoice-variant-1__total-row--grand"><span>Total</span><strong><Money value={demoInvoice.total} /></strong></div>
      </div></div>

      <section className="invoice-variant-1__payment" aria-label="Resumen de pago">
        <div><strong>Abono registrado</strong><p>Pago inicial aplicado a la factura · Método: transferencia bancaria</p></div>
        <div className="invoice-variant-1__payment-amount"><Money value={demoInvoice.paid} /><small> abonado</small></div>
      </section>

      <footer className="invoice-variant-1__footer">
        <div><strong>Condiciones de pago</strong><p>Saldo pendiente: <Money value={demoInvoice.balance} /> · Vence el {demoInvoice.dueDate}.</p><p>Gracias por confiar en Boxario para sus envíos.</p></div>
        <div><strong>Contacto de facturación</strong><p>{demoInvoice.seller.email}</p><p>Este documento es una representación demo para revisión visual e impresión.</p></div>
      </footer>
    </article>
  );
}

export default InvoiceVariant1;
