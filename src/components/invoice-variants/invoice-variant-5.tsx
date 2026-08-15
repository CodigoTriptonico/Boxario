import type { ReactNode } from "react";

/**
 * Variante 5 de factura Boxario — internacional / logística.
 *
 * Propósito: ejemplo visual autocontenido para comparar una factura orientada
 * a operaciones transfronterizas. Los datos son ficticios y no representan
 * una fuente autoritativa ni escriben en el dominio de ventas.
 *
 * Decisiones de diseño documentadas:
 * - La ruta origen → destino y el conteo de cajas aparecen antes del cobro.
 * - Cada bulto conserva tamaño, cantidad y código físico individual.
 * - El resumen financiero separa total, abono y saldo pendiente.
 * - No se agregan acciones de guardado, cobro o navegación para mantener el
 *   componente seguro como muestra aislada.
 */

type PackageLine = {
  code: string;
  size: string;
  quantity: number;
  weight: string;
  contents: string;
};

const invoice = {
  code: "COL20010010001",
  status: "En tránsito",
  issuedAt: "14 ago 2026 · 09:42",
  seller: "SCGS · Vendedor 001",
  carrier: "Boxario International",
  incoterm: "DAP",
  currency: "USD",
  origin: {
    label: "Origen",
    country: "Colombia",
    city: "Bogotá, Cundinamarca",
    contact: "María Fernanda Ruiz",
    address: "Carrera 11 # 93-07 · Bodega 4",
  },
  destination: {
    label: "Destino",
    country: "México",
    city: "Ciudad de México, CDMX",
    contact: "Julián Ortega",
    address: "Av. Revolución 1267 · Piso 3",
  },
  packages: [
    {
      code: "COL20010010001-A",
      size: "M · 60 × 40 × 40 cm",
      quantity: 1,
      weight: "8.5 kg",
      contents: "Muestras comerciales",
    },
    {
      code: "COL20010010001-B",
      size: "L · 80 × 60 × 60 cm",
      quantity: 1,
      weight: "14.0 kg",
      contents: "Material promocional",
    },
  ] satisfies PackageLine[],
  charges: [
    ["Transporte internacional", "$ 118.00"],
    ["Manejo y consolidación", "$ 24.00"],
    ["Seguro de carga", "$ 12.50"],
  ],
  total: "$ 154.50",
  deposit: "$ 50.00",
  balance: "$ 104.50",
};

function SectionLabel({ children }: { children: ReactNode }) {
  return <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{children}</p>;
}

function DataRow({ label, value, emphasis = false }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-black/10 py-2.5 last:border-b-0">
      <dt className="text-xs font-bold text-slate-500">{label}</dt>
      <dd className={`min-w-0 text-right text-xs ${emphasis ? "font-black text-slate-950" : "font-semibold text-slate-700"}`}>
        {value}
      </dd>
    </div>
  );
}

export function InvoiceVariant5() {
  const totalPackages = invoice.packages.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <article className="mx-auto w-full max-w-5xl overflow-hidden rounded-2xl border border-black bg-[#f4f1e8] font-sans text-slate-950 shadow-2xl">
      <header className="border-b border-black bg-[#17231f] px-5 py-5 text-[#f8fafc] sm:px-8 sm:py-7">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-[#a7f3d0]">Boxario · International waybill</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Factura logística</h1>
            <p className="mt-2 text-sm font-semibold text-slate-300">Documento demo · servicio internacional</p>
          </div>
          <div className="min-w-[190px] border-l-2 border-[#a7f3d0] pl-4 text-left sm:text-right">
            <SectionLabel>Invoice / referencia</SectionLabel>
            <p className="mt-1 font-mono text-lg font-black tracking-tight text-white">{invoice.code}</p>
            <p className="mt-2 inline-flex rounded-full border border-[#a7f3d0]/60 bg-[#a7f3d0]/10 px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-[#a7f3d0]">
              {invoice.status}
            </p>
          </div>
        </div>
        <div className="mt-6 grid gap-3 border-t border-white/15 pt-4 text-xs sm:grid-cols-3">
          <div><SectionLabel>Emisión</SectionLabel><p className="mt-1 font-bold text-slate-200">{invoice.issuedAt}</p></div>
          <div><SectionLabel>Vendedor</SectionLabel><p className="mt-1 font-bold text-slate-200">{invoice.seller}</p></div>
          <div><SectionLabel>Transportista</SectionLabel><p className="mt-1 font-bold text-slate-200">{invoice.carrier}</p></div>
        </div>
      </header>

      <div className="px-5 py-5 sm:px-8 sm:py-7">
        <section aria-labelledby="route-heading">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div><SectionLabel>Lane / ruta internacional</SectionLabel><h2 id="route-heading" className="mt-1 text-xl font-black">Origen y destino</h2></div>
            <p className="font-mono text-xs font-black uppercase tracking-wide text-slate-500">{invoice.incoterm} · {invoice.currency}</p>
          </div>
          <div className="mt-4 grid gap-0 border-y-2 border-black/80 md:grid-cols-[1fr_auto_1fr]">
            <div className="py-5 md:pr-6">
              <SectionLabel>{invoice.origin.label}</SectionLabel>
              <p className="mt-2 text-lg font-black">{invoice.origin.city}</p>
              <p className="mt-1 text-sm font-bold text-slate-700">{invoice.origin.country}</p>
              <p className="mt-4 text-xs font-bold text-slate-600">{invoice.origin.contact}</p>
              <p className="mt-1 text-xs text-slate-600">{invoice.origin.address}</p>
            </div>
            <div className="flex items-center border-y border-black/10 py-3 md:border-x md:border-y-0 md:px-6">
              <div className="flex items-center gap-2 text-[#087f5b]" aria-label="Ruta de origen a destino">
                <span className="h-2.5 w-2.5 rounded-full bg-[#087f5b]" />
                <span className="h-px w-14 bg-[#087f5b] sm:w-24" />
                <span className="text-lg">→</span>
                <span className="h-2.5 w-2.5 rounded-full border-2 border-[#087f5b] bg-[#f4f1e8]" />
              </div>
            </div>
            <div className="py-5 md:pl-6 md:text-right">
              <SectionLabel>{invoice.destination.label}</SectionLabel>
              <p className="mt-2 text-lg font-black">{invoice.destination.city}</p>
              <p className="mt-1 text-sm font-bold text-slate-700">{invoice.destination.country}</p>
              <p className="mt-4 text-xs font-bold text-slate-600">{invoice.destination.contact}</p>
              <p className="mt-1 text-xs text-slate-600">{invoice.destination.address}</p>
            </div>
          </div>
        </section>

        <section className="mt-8" aria-labelledby="packages-heading">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div><SectionLabel>Physical custody / trazabilidad</SectionLabel><h2 id="packages-heading" className="mt-1 text-xl font-black">Bultos y códigos de caja</h2></div>
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">{totalPackages} cajas · {invoice.packages.reduce((sum, item) => sum + Number(item.weight.replace(" kg", "")), 0).toFixed(1)} kg</p>
          </div>
          <div className="mt-4 overflow-x-auto border-y-2 border-black/80">
            <table className="w-full min-w-[650px] text-left text-xs">
              <thead className="border-b border-black/20 text-[10px] uppercase tracking-[0.16em] text-slate-500">
                <tr><th className="py-3 pr-4">Código físico</th><th className="px-4 py-3">Caja / medida</th><th className="px-4 py-3">Contenido</th><th className="px-4 py-3 text-right">Peso</th><th className="py-3 pl-4 text-right">Cant.</th></tr>
              </thead>
              <tbody>
                {invoice.packages.map((item) => (
                  <tr key={item.code} className="border-b border-black/10 last:border-b-0">
                    <td className="py-4 pr-4 font-mono font-black text-[#087f5b]">{item.code}</td>
                    <td className="px-4 py-4 font-bold text-slate-800">{item.size}</td>
                    <td className="px-4 py-4 font-semibold text-slate-600">{item.contents}</td>
                    <td className="px-4 py-4 text-right font-bold tabular-nums text-slate-800">{item.weight}</td>
                    <td className="py-4 pl-4 text-right font-black tabular-nums">{item.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]" aria-labelledby="billing-heading">
          <div>
            <SectionLabel>Billing notes / condiciones</SectionLabel>
            <h2 id="billing-heading" className="mt-1 text-xl font-black">Resumen de cobro</h2>
            <dl className="mt-4 border-y border-black/20">
              <DataRow label="Moneda de cobro" value={invoice.currency} />
              <DataRow label="Término comercial" value="DAP · entrega en destino" />
              <DataRow label="Responsable de entrega" value="Boxario International" />
            </dl>
          </div>
          <div className="bg-[#17231f] p-5 text-white sm:p-6">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#a7f3d0]">Estado financiero</p>
            <dl className="mt-4 divide-y divide-white/15">
              {invoice.charges.map(([label, value]) => <DataRow key={label} label={label} value={value} />)}
              <div className="flex items-center justify-between gap-4 py-3"><dt className="text-sm font-black">Total</dt><dd className="text-lg font-black tabular-nums">{invoice.total}</dd></div>
              <div className="flex items-center justify-between gap-4 py-3"><dt className="text-xs font-bold text-slate-300">Abono registrado</dt><dd className="text-sm font-bold tabular-nums text-[#a7f3d0]">− {invoice.deposit}</dd></div>
              <div className="flex items-center justify-between gap-4 pt-4"><dt className="text-sm font-black">Saldo pendiente</dt><dd className="text-xl font-black tabular-nums text-[#fbbf24]">{invoice.balance}</dd></div>
            </dl>
          </div>
        </section>
      </div>
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-black/20 bg-[#e8e3d7] px-5 py-4 text-[11px] font-bold text-slate-600 sm:px-8">
        <span>Documento demo · referencia operativa no editable</span>
        <span className="font-mono">BOXARIO / {invoice.code}</span>
      </footer>
    </article>
  );
}

export default InvoiceVariant5;
