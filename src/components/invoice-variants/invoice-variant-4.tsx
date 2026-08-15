import {
  ArrowRight,
  Check,
  CheckCircle2,
  ClipboardList,
  Clock3,
  MapPin,
  Package,
  Phone,
  Truck,
} from "lucide-react";

/**
 * Variante 4 de factura Boxario: vista operativa orientada al cliente.
 *
 * Esta variante es autocontenida y usa datos demo deliberadamente locales.
 * Su jerarquía prioriza el código de seguimiento, el estado actual del envío,
 * la trazabilidad individual de cada caja y los próximos pasos esperados.
 * No ejecuta acciones ni representa estados conectados a una fuente de datos.
 */

type ShipmentStep = {
  label: string;
  detail: string;
  completed?: boolean;
  current?: boolean;
};

type PackageStatus = "En tránsito" | "Entregada";

const shipmentSteps: ShipmentStep[] = [
  { label: "Pedido confirmado", detail: "12 ago, 09:42", completed: true },
  { label: "Recibido en oficina", detail: "12 ago, 14:18", completed: true },
  { label: "En tránsito", detail: "Ahora · Ruta a Bogotá", current: true },
  { label: "Entrega estimada", detail: "15 ago · antes de 18:00" },
];

const packages: Array<{
  code: string;
  size: string;
  destination: string;
  status: PackageStatus;
  note: string;
}> = [
  {
    code: "COL20010010001-A",
    size: "Caja mediana · 20 kg",
    destination: "Bogotá, Colombia",
    status: "En tránsito",
    note: "Último escaneo: Centro de distribución norte",
  },
  {
    code: "COL20010010001-B",
    size: "Caja mediana · 20 kg",
    destination: "Bogotá, Colombia",
    status: "Entregada",
    note: "Recibida por Laura M. · 13 ago, 16:07",
  },
];

function StatusBadge({ status }: { status: PackageStatus }) {
  const delivered = status === "Entregada";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-black ${
        delivered
          ? "border-emerald-500/40 bg-emerald-400/10 text-emerald-200"
          : "border-sky-500/40 bg-sky-400/10 text-sky-200"
      }`}
    >
      {delivered ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Truck className="h-3.5 w-3.5" />}
      {status}
    </span>
  );
}

export default function InvoiceVariant4() {
  return (
    <main className="mx-auto w-full max-w-5xl bg-[#111815] p-3 text-slate-100 sm:p-6">
      <article className="overflow-hidden rounded-2xl border border-black bg-surface-panel shadow-[0_18px_50px_rgba(0,0,0,0.28)]">
        <header className="border-b border-black bg-[#1d2b26] p-5 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <div className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-emerald-300">
                <Package className="h-4 w-4" /> Boxario · seguimiento operativo
              </div>
              <p className="text-sm font-bold text-slate-400">Factura / envío</p>
              <h1 className="mt-1 font-mono text-2xl font-black tracking-tight text-white sm:text-3xl">
                COL20010010001
              </h1>
            </div>
            <div className="min-w-[13rem] rounded-xl border border-sky-400/30 bg-sky-400/10 p-3 text-left sm:text-right">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-sky-200">Estado actual</p>
              <p className="mt-1 flex items-center gap-2 text-lg font-black text-sky-100 sm:justify-end">
                <Truck className="h-5 w-5" /> En tránsito
              </p>
              <p className="mt-1 text-xs font-bold text-sky-200/75">1 de 2 cajas en ruta</p>
            </div>
          </div>

          <div className="mt-6 grid gap-3 text-sm sm:grid-cols-3">
            <div className="border-t border-emerald-300/20 pt-3">
              <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">Remitente</p>
              <p className="mt-1 font-black text-slate-100">Mariana Torres</p>
              <p className="text-xs font-bold text-slate-400">Los Ángeles, CA</p>
            </div>
            <div className="border-t border-emerald-300/20 pt-3">
              <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">Destinatario</p>
              <p className="mt-1 font-black text-slate-100">Carlos Torres</p>
              <p className="text-xs font-bold text-slate-400">Bogotá, Colombia</p>
            </div>
            <div className="border-t border-emerald-300/20 pt-3">
              <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">Entrega estimada</p>
              <p className="mt-1 font-black text-slate-100">Viernes 15 de agosto</p>
              <p className="text-xs font-bold text-slate-400">Antes de las 18:00</p>
            </div>
          </div>
        </header>

        <div className="divide-y divide-black">
          <section className="p-5 sm:p-7" aria-labelledby="tracking-title">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-300">Tracking</p>
                <h2 id="tracking-title" className="mt-1 text-xl font-black text-white">Dónde está tu envío</h2>
              </div>
              <p className="font-mono text-xs font-black text-slate-400">Actualizado hace 18 min</p>
            </div>

            <div className="mt-6 grid gap-0 sm:grid-cols-4">
              {shipmentSteps.map((step, index) => (
                <div key={step.label} className="relative flex gap-3 pb-5 sm:block sm:pb-0 sm:pr-4">
                  {index < shipmentSteps.length - 1 ? (
                    <span className="absolute left-[11px] top-6 h-full w-px bg-slate-700 sm:left-6 sm:top-3 sm:h-px sm:w-[calc(100%-1rem)]" aria-hidden />
                  ) : null}
                  <span
                    className={`relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                      step.current
                        ? "border-sky-300 bg-sky-400 text-slate-950 shadow-[0_0_0_5px_rgba(56,189,248,0.12)]"
                        : step.completed
                          ? "border-emerald-300 bg-emerald-400 text-slate-950"
                          : "border-slate-600 bg-surface-inset text-transparent"
                    }`}
                  >
                    {step.completed ? <Check className="h-3.5 w-3.5" /> : step.current ? <span className="h-2 w-2 rounded-full bg-slate-950" /> : null}
                  </span>
                  <div className="min-w-0 sm:mt-4">
                    <p className={`text-sm font-black ${step.current ? "text-sky-200" : step.completed ? "text-emerald-200" : "text-slate-400"}`}>{step.label}</p>
                    <p className="mt-1 text-xs font-bold text-slate-500">{step.detail}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-2 flex items-start gap-3 rounded-xl border border-sky-800/60 bg-sky-950/25 p-3.5">
              <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-sky-300" />
              <div>
                <p className="text-sm font-black text-sky-100">Tu envío avanza hacia Bogotá</p>
                <p className="mt-1 text-xs font-bold leading-relaxed text-sky-200/70">La caja A salió del centro de distribución norte. El siguiente escaneo aparecerá cuando llegue a la estación local.</p>
              </div>
            </div>
          </section>

          <section className="p-5 sm:p-7" aria-labelledby="packages-title">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-300">Trazabilidad física</p>
                <h2 id="packages-title" className="mt-1 text-xl font-black text-white">Tus cajas <span className="text-slate-500">(2)</span></h2>
              </div>
              <ClipboardList className="h-5 w-5 text-slate-500" />
            </div>

            <div className="mt-4 grid gap-3">
              {packages.map((item, index) => (
                <article key={item.code} className="grid gap-3 rounded-xl border border-black bg-surface-list-row p-4 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center">
                  <span className="flex h-11 w-11 items-center justify-center rounded-lg border border-black bg-surface-inset text-emerald-300"><Package className="h-5 w-5" /></span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-mono text-sm font-black text-slate-100">Caja {index === 0 ? "A" : "B"}</p>
                      <StatusBadge status={item.status} />
                    </div>
                    <p className="mt-1 truncate font-mono text-xs font-bold text-slate-400">{item.code}</p>
                    <p className="mt-1 text-xs font-bold text-slate-500">{item.size} · {item.destination}</p>
                  </div>
                  <p className="text-xs font-bold text-slate-500 sm:max-w-44 sm:text-right">{item.note}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="grid gap-4 p-5 sm:grid-cols-[minmax(0,1fr)_18rem] sm:p-7" aria-labelledby="next-steps-title">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-300">Próximos pasos</p>
              <h2 id="next-steps-title" className="mt-1 text-xl font-black text-white">Qué puedes esperar</h2>
              <div className="mt-4 grid gap-2 text-sm">
                <div className="flex gap-3 rounded-lg border border-black bg-surface-inset p-3"><Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" /><p className="font-bold text-slate-300">Revisa el tracking después del siguiente escaneo en la estación local.</p></div>
                <div className="flex gap-3 rounded-lg border border-black bg-surface-inset p-3"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" /><p className="font-bold text-slate-300">Confirma que el destinatario pueda recibir la caja pendiente el viernes.</p></div>
                <div className="flex gap-3 rounded-lg border border-black bg-surface-inset p-3"><Phone className="mt-0.5 h-4 w-4 shrink-0 text-sky-300" /><p className="font-bold text-slate-300">Si cambia la dirección, contacta a Boxario antes de la entrega.</p></div>
              </div>
            </div>
            <aside className="rounded-xl border border-emerald-500/30 bg-emerald-400/10 p-4">
              <p className="text-xs font-black uppercase tracking-wide text-emerald-200">Ayuda con tu envío</p>
              <p className="mt-2 text-sm font-bold leading-relaxed text-slate-200">Ten a la mano tu referencia para que podamos ubicar cada caja rápidamente.</p>
              <button type="button" className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-emerald-300/40 bg-emerald-300 px-3 text-sm font-black text-slate-950">
                Contactar a Boxario <ArrowRight className="h-4 w-4" />
              </button>
            </aside>
          </section>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-black bg-[#18231f] px-5 py-4 text-xs font-bold text-slate-500 sm:px-7">
          <span>Emitida el 12 de agosto de 2026</span>
          <span className="font-mono text-slate-400">Referencia: COL20010010001</span>
        </footer>
      </article>
    </main>
  );
}
