"use client";

import { useState } from "react";
import InvoiceVariant1 from "@/components/invoice-variants/invoice-variant-1";
import InvoiceVariant2 from "@/components/invoice-variants/invoice-variant-2";
import InvoiceVariant3 from "@/components/invoice-variants/invoice-variant-3";
import InvoiceVariant4 from "@/components/invoice-variants/invoice-variant-4";
import InvoiceVariant5 from "@/components/invoice-variants/invoice-variant-5";

const variants = [
  { number: 1, name: "Corporativa / impresión", Component: InvoiceVariant1 },
  { number: 2, name: "Minimalista / móvil", Component: InvoiceVariant2 },
  { number: 3, name: "Premium / editorial", Component: InvoiceVariant3 },
  { number: 4, name: "Operativa / tracking", Component: InvoiceVariant4 },
  { number: 5, name: "Internacional / logística", Component: InvoiceVariant5 },
];

export default function FacturasDemoPage() {
  const [activeVariant, setActiveVariant] = useState(1);
  const selectedVariant = variants.find(({ number }) => number === activeVariant) ?? variants[0];
  const SelectedComponent = selectedVariant.Component;

  return (
    <div className="min-h-full overflow-y-auto bg-[#29312d] px-3 py-5 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 border-b border-white/15 pb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">Galería de propuestas</p>
          <h1 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">Cinco versiones de factura</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">Ejemplos visuales con los mismos datos demo. Esta página no reemplaza la factura productiva ni guarda información.</p>
        </div>

        <div className="pb-10">
          <div className="mb-4 overflow-x-auto border-b border-white/15" role="tablist" aria-label="Variantes de factura">
            <div className="flex min-w-max gap-1">
              {variants.map(({ number, name }) => {
                const isActive = number === activeVariant;
                return (
                  <button
                    key={number}
                    id={`invoice-tab-${number}`}
                    aria-controls={`invoice-panel-${number}`}
                    aria-selected={isActive}
                    className={`border-b-2 px-3 py-3 text-left text-sm transition-colors sm:px-4 ${isActive ? "border-emerald-300 text-white" : "border-transparent text-slate-400 hover:text-white"}`}
                    onClick={() => setActiveVariant(number)}
                    role="tab"
                    type="button"
                  >
                    <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-300/80">Variante {number}</span>
                    <span className="mt-1 block">{name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <section id={`invoice-panel-${selectedVariant.number}`} aria-labelledby={`invoice-tab-${selectedVariant.number}`} role="tabpanel">
            <SelectedComponent />
          </section>
        </div>
      </div>
    </div>
  );
}
