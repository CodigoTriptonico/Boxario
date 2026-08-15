/**
 * Invoice Variant 2 — factura demo minimalista y compacta.
 *
 * Propósito: explorar una lectura móvil de alta densidad para Boxario sin
 * depender de datos, acciones o estilos compartidos de la factura productiva.
 * La referencia, los importes, las partes y las cajas son deliberadamente
 * demo; este archivo es una pieza visual autocontenida y no persiste cambios.
 */

type DemoLine = {
  code: string;
  label: string;
  amount: string;
};

const demoInvoice = {
  number: "COL20010010042",
  date: "14 AGO 2026",
  status: "PAGADA",
  sender: {
    name: "Mariana López",
    detail: "Los Ángeles, CA · +1 213 555 0184",
  },
  recipient: {
    name: "Carlos Méndez",
    detail: "Bogotá, Colombia · +57 310 555 0142",
  },
  lines: [
    { code: "…-A", label: "Caja mediana", amount: "$48.00" },
    { code: "…-B", label: "Caja grande", amount: "$62.00" },
  ] satisfies DemoLine[],
  subtotal: "$110.00",
  pickup: "$8.00",
  total: "$118.00",
};

const qrPattern = [
  "1111010011111",
  "1001011010001",
  "1011010010101",
  "1001011110101",
  "1111010101111",
  "0010110010000",
  "1101101110110",
  "1010010101001",
  "0111111011100",
  "1111010010111",
  "1001011110101",
  "1011010001101",
  "1001011010001",
  "1111010011111",
];

function DemoQr() {
  return (
    <div
      aria-label="Código QR demo de la factura"
      className="grid size-[4.5rem] shrink-0 grid-cols-[repeat(13,minmax(0,1fr))] gap-px bg-white p-1 ring-1 ring-slate-200"
      role="img"
    >
      {qrPattern.flatMap((row, rowIndex) =>
        [...row].map((cell, columnIndex) => (
          <span
            aria-hidden="true"
            className={cell === "1" ? "bg-slate-950" : "bg-white"}
            key={`${rowIndex}-${columnIndex}`}
          />
        )),
      )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-baseline justify-between gap-3 border-b border-slate-100 py-2 last:border-0">
      <dt className="shrink-0 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
        {label}
      </dt>
      <dd className="min-w-0 text-right text-xs font-semibold text-slate-700">{value}</dd>
    </div>
  );
}

/** Renderiza la variante visual 2 con información fija para revisión de diseño. */
export function InvoiceVariant2() {
  return (
    <main className="min-h-screen bg-slate-100 p-3 text-slate-950 sm:p-6">
      <article className="mx-auto w-full max-w-[27rem] overflow-hidden rounded-2xl bg-white shadow-[0_14px_40px_rgba(15,23,42,0.12)] ring-1 ring-slate-200">
        <header className="border-b border-slate-200 px-4 pb-4 pt-4 sm:px-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Boxario</p>
              <h1 className="mt-1 truncate text-xl font-black tracking-tight">Factura de envío</h1>
            </div>
            <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-700">
              {demoInvoice.status}
            </span>
          </div>
          <div className="mt-4 flex flex-wrap items-end justify-between gap-x-3 gap-y-2">
            <p className="break-all font-mono text-sm font-black tracking-tight text-slate-900">{demoInvoice.number}</p>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">{demoInvoice.date}</p>
          </div>
        </header>

        <section className="grid grid-cols-1 divide-y divide-slate-200 border-b border-slate-200 sm:grid-cols-2 sm:divide-x sm:divide-y-0" aria-label="Partes del envío">
          <div className="min-w-0 px-4 py-3 sm:px-5">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Remitente</p>
            <p className="mt-1 truncate text-sm font-black">{demoInvoice.sender.name}</p>
            <p className="mt-0.5 text-[11px] leading-4 text-slate-500">{demoInvoice.sender.detail}</p>
          </div>
          <div className="min-w-0 px-4 py-3 sm:px-5">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Destinatario</p>
            <p className="mt-1 truncate text-sm font-black">{demoInvoice.recipient.name}</p>
            <p className="mt-0.5 text-[11px] leading-4 text-slate-500">{demoInvoice.recipient.detail}</p>
          </div>
        </section>

        <section className="px-4 py-3 sm:px-5" aria-labelledby="invoice-lines-title">
          <div className="mb-1 flex items-center justify-between gap-3">
            <h2 id="invoice-lines-title" className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Cajas · 2 unidades</h2>
            <span className="text-[10px] font-bold text-slate-400">USD</span>
          </div>
          <div className="divide-y divide-slate-100">
            {demoInvoice.lines.map((line) => (
              <div className="flex items-center justify-between gap-3 py-3" key={line.code}>
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="shrink-0 rounded-md bg-slate-100 px-1.5 py-1 font-mono text-[10px] font-black text-slate-600">{line.code}</span>
                  <span className="truncate text-sm font-bold text-slate-800">{line.label}</span>
                </div>
                <span className="shrink-0 text-sm font-black tabular-nums">{line.amount}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="border-t border-slate-200 px-4 py-3 sm:px-5" aria-label="Resumen de cobro">
          <dl>
            <DetailRow label="Subtotal" value={demoInvoice.subtotal} />
            <DetailRow label="Recolección" value={demoInvoice.pickup} />
            <div className="mt-2 flex items-baseline justify-between gap-3 border-t-2 border-slate-950 pt-3">
              <dt className="text-xs font-black uppercase tracking-[0.14em]">Total</dt>
              <dd className="text-2xl font-black tabular-nums tracking-tight">{demoInvoice.total}</dd>
            </div>
          </dl>
        </section>

        <footer className="flex items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Escanea para rastrear</p>
            <p className="mt-1 truncate font-mono text-[10px] font-bold text-slate-600">boxario.com/t/{demoInvoice.number}</p>
          </div>
          <DemoQr />
        </footer>
      </article>
    </main>
  );
}

export default InvoiceVariant2;
