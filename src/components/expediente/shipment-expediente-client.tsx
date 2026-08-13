"use client";

import Link from "next/link";
import {
  Boxes,
  CircleDollarSign,
  ExternalLink,
  FileText,
  MapPin,
  MapPinned,
  PackageCheck,
  Pencil,
  Printer,
  UserRound,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useSetShellConfig } from "@/components/app-frame";
import type { ShipmentExpedientePayload } from "@/lib/shipment-expediente";
import { AuditHistoryEntry } from "@/components/audit-history-entry";
import { CountryName } from "@/components/country-flag";
import {
  ExpedienteSectionNav,
  type ExpedienteSectionId,
} from "@/components/expediente/expediente-section-nav";
import {
  expedientePrintTargetId,
  printExpedienteDocuments,
} from "@/components/expediente/expediente-print";
import { SaleBoxLabel, SaleInvoicePaper } from "@/components/sale/venta-parts";
import { buildSeguimientoShipmentDeepLink } from "@/lib/seguimiento-deep-link";
import { physicalPackageStatusLabel } from "@/lib/physical-packages";
import { ShipmentExpedienteEditDialog } from "@/components/expediente/shipment-expediente-edit-dialog";
import { ShipmentProgressSteps } from "@/components/shipment-progress-steps";
import { formatMoneyValue } from "@/lib/logistics-fees";
import { shipmentStatusDisplayLabel } from "@/lib/shipment-display";
import type { ShipmentStatus } from "@/lib/shipment-types";

type ShipmentExpedienteClientProps = { data: ShipmentExpedientePayload };

function expedienteDateLabel(value: string | null) {
  if (!value) return "Sin fecha";
  return new Date(value).toLocaleString("es-MX", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function SectionTitle({
  icon: Icon,
  eyebrow,
  title,
  action,
}: {
  icon: typeof FileText;
  eyebrow: string;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 border-b border-black/70 pb-3">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-emerald-800/50 bg-emerald-950/35 text-emerald-300">
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">{eyebrow}</p>
          <h2 className="text-base font-black tracking-tight text-slate-50">{title}</h2>
        </div>
      </div>
      {action}
    </div>
  );
}

function Detail({ label, children, tone = "default" }: { label: string; children: ReactNode; tone?: "default" | "positive" | "warning" }) {
  const toneClass = tone === "positive" ? "text-emerald-200" : tone === "warning" ? "text-amber-200" : "text-slate-100";
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-black uppercase tracking-[0.11em] text-slate-500">{label}</dt>
      <dd className={`mt-1 break-words text-sm font-bold ${toneClass}`}>{children}</dd>
    </div>
  );
}

function mapSearchHref(query: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function ExpedientePartySection({ title, party }: { title: string; party: ShipmentExpedientePayload["sender"] | NonNullable<ShipmentExpedientePayload["recipient"]> }) {
  const mapHref = party.mapQuery ? mapSearchHref(party.mapQuery) : null;
  return (
    <section className="min-w-0 py-1">
      <div className="flex min-w-0 items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-black bg-surface-inset text-emerald-300">
          <UserRound className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.13em] text-emerald-300">{title}</p>
          <p className="mt-0.5 truncate text-base font-black text-slate-50">{party.name || "Sin nombre"}</p>
          <p className="mt-0.5 text-[11px] font-bold leading-relaxed text-slate-500">{party.sourceNote}</p>
        </div>
      </div>
      {party.fields.length ? (
        <dl className="mt-4 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
          {party.fields.map((field) => <Detail key={`${title}-${field.label}`} label={field.label}>{field.label === "Dirección" && mapHref ? <a href={mapHref} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-emerald-200 hover:text-emerald-100"><MapPin className="h-3.5 w-3.5 shrink-0" /><span>{field.value}</span><ExternalLink className="h-3 w-3 shrink-0 text-slate-500" /></a> : field.value}</Detail>)}
        </dl>
      ) : <p className="mt-3 text-sm font-bold text-slate-500">No hay más datos disponibles.</p>}
    </section>
  );
}

const secondaryButtonClass = "inline-flex h-9 items-center gap-1.5 rounded-lg border border-black bg-surface-inset px-3 text-xs font-black text-slate-200 transition hover:bg-surface-card-hover";

export function ShipmentExpedienteClient({ data }: ShipmentExpedienteClientProps) {
  const setShellConfig = useSetShellConfig();
  const visibleSections = useMemo(() => {
    const sections: ExpedienteSectionId[] = ["resumen", "documentos"];
    if (data.packages?.length || data.financial || data.logistics || data.audit) sections.push("registro");
    return sections;
  }, [data.audit, data.financial, data.logistics, data.packages]);

  const [activeSection, setActiveSection] = useState<ExpedienteSectionId>("resumen");
  const [editOpen, setEditOpen] = useState(false);
  const seguimientoHref = buildSeguimientoShipmentDeepLink({ code: data.code, shipmentId: data.shipmentId, status: data.status });
  const labelTargetIds = data.documents.packages.map((pkg) => expedientePrintTargetId(pkg.invoiceCode));

  useEffect(() => {
    setShellConfig({ contentEdgeToEdge: true });
    return () => setShellConfig({ contentEdgeToEdge: undefined });
  }, [setShellConfig]);

  return (
    <main className="w-full min-w-0 py-3 sm:py-4">
      <div className="bg-[#1a221f]">
        <div className="no-print border-b border-black bg-[#1c2622] px-3 py-2 sm:px-5"><ExpedienteSectionNav active={activeSection} onChange={setActiveSection} visibleSections={visibleSections} /></div>
        {activeSection === "resumen" ? <header className="no-print border-b border-black bg-[linear-gradient(115deg,rgba(15,62,46,0.42),rgba(28,38,34,0.88)_48%,rgba(26,34,31,1))] px-4 py-4 sm:px-6">
          <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-700/50 bg-emerald-950/40 text-emerald-300">
                <PackageCheck className="h-5 w-5" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-300">Seguimiento</p>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
                  <h1 className="break-words text-xl font-black tracking-tight text-slate-50 sm:text-2xl">{data.code}</h1>
                <span className="rounded-md border border-emerald-700/50 bg-emerald-950/45 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-100">{shipmentStatusDisplayLabel(data.status as ShipmentStatus)}</span>
                {data.financial?.depositStatus ? <span className={`rounded-md border px-2 py-1 text-[10px] font-black uppercase tracking-wide ${data.financial.depositStatus === "paid" ? "border-emerald-700/50 bg-emerald-950/45 text-emerald-200" : "border-amber-700/60 bg-amber-950/30 text-amber-100"}`}>{data.financial.depositStatus === "paid" ? "Abono cubierto" : "Abono pendiente"}</span> : null}
                </div>
                <p className="mt-1 text-xs font-bold text-slate-400">{expedienteDateLabel(data.createdAt)} <span className="mx-1.5 text-slate-600">·</span> {data.organizationName}</p>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
              {data.edit.canEdit ? (
                <button type="button" onClick={() => setEditOpen(true)} className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-emerald-400 px-3 text-xs font-black text-slate-950 transition hover:bg-emerald-300">
                  <Pencil className="h-4 w-4" /> Editar envío
                </button>
              ) : (
                <span className="inline-flex h-10 items-center rounded-lg border border-amber-800/60 bg-amber-950/20 px-3 text-xs font-black text-amber-100" title={data.edit.blockedReason}>
                  Edición bloqueada
                </span>
              )}
              <Link href={seguimientoHref} className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-emerald-700/50 bg-emerald-950/35 px-3 text-xs font-black text-emerald-100 transition hover:bg-emerald-900/45">
                <ExternalLink className="h-4 w-4" /> Abrir en Seguimiento
              </Link>
            </div>
          </div>
          <div className="mt-4 border-y border-black/70 py-3">
            <ShipmentProgressSteps steps={data.timeline.steps} timings={data.timeline.timings} compact singleLine />
          </div>
        </header> : null}

        <div className="min-w-0 px-4 py-4 sm:px-6 sm:py-5">
          {activeSection === "resumen" ? <>
            <section className="grid gap-5 border-b border-black/70 pb-5 lg:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)] lg:divide-x lg:divide-black/70">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-300">Operación</p>
                <dl className="mt-3 grid grid-cols-2 gap-x-5 gap-y-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                  <Detail label="Responsable">{data.salesOwnerName || "Sin asignar"}</Detail>
                  <Detail label="Destino"><CountryName name={data.country} size="xs" labelClassName="text-slate-100" /></Detail>
                  <Detail label="Cajas">{data.boxCount}</Detail>
                </dl>
              </div>
              <div className="border-t border-black/70 pt-5 lg:border-t-0 lg:pl-5 lg:pt-0">
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-300">Estado de cuenta</p>
                {data.financial ? <dl className="mt-3 grid grid-cols-2 gap-x-5 gap-y-3 sm:grid-cols-5"><Detail label="Factura">{data.financial.invoiceStatusLabel}</Detail><Detail label="Total">{data.financial.quotedTotal}</Detail><Detail label="Abono requerido">{data.financial.depositRequired || "No registrado"}</Detail><Detail label="Abonado" tone="positive">{formatMoneyValue(data.financial.paid)}</Detail><Detail label="Saldo" tone="warning">{data.financial.balanceDue}</Detail></dl> : <p className="mt-3 text-sm font-bold text-slate-500">Sin información financiera disponible.</p>}
                {data.financial && !data.financial.depositStatus ? <p className="mt-3 border-l-2 border-slate-600 pl-3 text-xs font-bold text-slate-400">No hay una instantánea histórica del abono para confirmar su estado.</p> : null}
              </div>
            </section>
            <section className="pt-5">
              <div className="mb-4 flex items-center gap-2.5"><MapPinned className="h-4 w-4 text-emerald-300" aria-hidden /><h2 className="text-sm font-black text-slate-50">Contactos y direcciones</h2></div>
              <div className="grid gap-5 divide-y divide-black/70 lg:grid-cols-2 lg:divide-x lg:divide-y-0"><ExpedientePartySection title="Remitente" party={data.sender} /><div className="pt-5 lg:pl-6 lg:pt-0">{data.recipient ? <ExpedientePartySection title="Destinatario" party={data.recipient} /> : <p className="text-sm font-bold text-slate-400">Este envío no tiene destinatario registrado.</p>}</div></div>
            </section>
          </> : null}

          {activeSection === "documentos" ? <section className="space-y-5"><SectionTitle icon={FileText} eyebrow="Documentación" title="Factura y etiquetas" action={<div className="flex flex-wrap gap-2"><button type="button" onClick={() => printExpedienteDocuments(expedientePrintTargetId(data.code))} className={secondaryButtonClass}><Printer className="h-4 w-4" /> Factura</button>{labelTargetIds.length ? <button type="button" onClick={() => printExpedienteDocuments(labelTargetIds)} className={secondaryButtonClass}><Printer className="h-4 w-4" /> Todas las cajas</button> : null}</div>} />
            {!data.documents.billing ? <p className="rounded-lg border border-amber-800/60 bg-amber-950/20 px-3 py-2 text-sm font-bold text-amber-100">Este envío no conserva la instantánea de facturación persistida en la venta. El documento muestra únicamente los datos comerciales disponibles en el envío.</p> : null}
            <div id="expediente-print-documents" className="grid gap-4"><div id={expedientePrintTargetId(data.code)} data-sale-print-document={data.code} className="sale-document-shell"><SaleInvoicePaper branding={data.organizationBranding} invoiceNumber={data.code} sender={data.documents.sender} recipient={data.documents.recipient} box={data.documents.boxLines.length ? [data.documents.boxLines.map((line) => line.label).join(" + ")] : [data.carrier || "Paquete"]} serviceOperation={data.documents.serviceOperation} billing={data.documents.billing} /></div>{data.documents.packages.map((pkg) => data.documents.recipient ? <div key={pkg.packageId} id={expedientePrintTargetId(pkg.invoiceCode)} data-sale-print-document={pkg.invoiceCode} data-sale-print-group="labels" className="sale-document-shell"><SaleBoxLabel branding={data.organizationBranding} invoiceNumber={pkg.invoiceCode} parentInvoiceNumber={data.code} position={pkg.position} boxCount={pkg.boxCount} sender={data.documents.sender} recipient={data.documents.recipient} box={pkg.box} /></div> : null)}</div>
          </section> : null}

          {activeSection === "registro" && data.packages ? <section className="space-y-5"><SectionTitle icon={Boxes} eyebrow="Paquetes físicos" title={`${data.packages.length} caja${data.packages.length === 1 ? "" : "s"} registrada${data.packages.length === 1 ? "" : "s"}`} />{data.sectionErrors.packages ? <p className="rounded-lg border border-rose-700 bg-rose-950/40 px-3 py-2 text-sm font-bold text-rose-200">{data.sectionErrors.packages}</p> : null}<div className="divide-y divide-black/70">{data.packages.map((pkg) => <article key={pkg.id} className="py-4 first:pt-0 last:pb-0"><div className="flex min-w-0 flex-wrap items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="text-base font-black text-slate-50">{pkg.invoiceCode}</p><span className="rounded-md border border-black bg-surface-inset px-2 py-0.5 text-[10px] font-black uppercase text-slate-300">Caja {pkg.position} de {pkg.boxCount}</span></div><p className="mt-1 break-all text-xs font-bold text-slate-500">ID físico: {pkg.code}</p></div><button type="button" onClick={() => printExpedienteDocuments(expedientePrintTargetId(pkg.invoiceCode))} className={secondaryButtonClass}><Printer className="h-4 w-4" /> Imprimir</button></div><dl className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-4"><Detail label="Presentación">{pkg.boxLabel}</Detail><Detail label="Estado">{physicalPackageStatusLabel[pkg.status]}</Detail>{pkg.collectionWeightKg !== null ? <Detail label="Peso recolectado">{pkg.collectionWeightKg} kg</Detail> : null}{pkg.intakeWeightKg !== null ? <Detail label="Peso en bodega">{pkg.intakeWeightKg} kg</Detail> : null}{pkg.providerTrackingNumber ? <Detail label="Rastreo">{pkg.providerTrackingNumber}</Detail> : null}{pkg.hasIncident && pkg.invoiceIncidentReason ? <Detail label="Excepción" tone="warning">{pkg.invoiceIncidentReason}</Detail> : null}</dl></article>)}</div></section> : null}

          {activeSection === "registro" && data.financial ? <section className="space-y-5 border-t border-black/70 pt-6"><SectionTitle icon={CircleDollarSign} eyebrow="Consulta financiera" title="Factura y pagos" /><dl className="grid gap-3 border-y border-black/70 py-4 sm:grid-cols-2 lg:grid-cols-4"><Detail label="Total original">{data.financial.quotedTotal}</Detail><Detail label="Abono requerido">{data.financial.depositRequired || "No registrado"}</Detail><Detail label="Abonado" tone="positive">{formatMoneyValue(data.financial.paid)}</Detail><Detail label="Saldo" tone="warning">{data.financial.balanceDue}</Detail><Detail label="Estado de factura">{data.financial.invoiceStatusLabel}</Detail>{data.financial.depositStatus ? <Detail label="Estado del abono" tone={data.financial.depositStatus === "paid" ? "positive" : "warning"}>{data.financial.depositStatus === "paid" ? "Cubierto" : `Pendiente${data.financial.depositRemaining ? ` · Faltan ${data.financial.depositRemaining}` : ""}`}</Detail> : null}{data.financial.logisticsCharge ? <Detail label="Cargo logístico" tone="warning">{data.financial.logisticsCharge}{data.financial.logisticsChargeAdjusted ? " · Tarifa ajustada" : ""}</Detail> : null}{data.financial.promotionDiscount ? <Detail label={data.financial.promotionName || "Promoción"} tone="positive">-{data.financial.promotionDiscount}</Detail> : null}{data.financial.logisticsChargeReason ? <Detail label="Motivo del ajuste">{data.financial.logisticsChargeReason}</Detail> : null}</dl><div><p className="text-[10px] font-black uppercase tracking-[0.13em] text-slate-500">Pagos registrados</p>{!data.financial.payments.length ? <p className="mt-3 text-sm font-bold text-slate-400">Sin pagos registrados</p> : <div className="mt-3 divide-y divide-black/70 border-y border-black/70">{data.financial.payments.map((payment) => <div key={payment.id} className="grid gap-1 py-3 text-sm sm:grid-cols-[minmax(0,1fr)_auto]"><p className="font-black text-emerald-200">{formatMoneyValue(payment.amount)} <span className="font-bold text-slate-400">· {payment.method}</span></p><p className="text-xs font-bold text-slate-500 sm:text-right">{expedienteDateLabel(payment.createdAt)}</p>{payment.note ? <p className="text-xs font-bold text-slate-300 sm:col-span-2">{payment.note}</p> : null}</div>)}</div>}</div></section> : null}

          {activeSection === "registro" && data.logistics ? <section className="space-y-5 border-t border-black/70 pt-6"><SectionTitle icon={MapPinned} eyebrow="Operación" title="Plan logístico" />{data.sectionErrors.routes ? <p className="rounded-lg border border-amber-800/60 bg-amber-950/20 px-3 py-2 text-sm font-bold text-amber-100">{data.sectionErrors.routes}</p> : null}<dl className="grid gap-3 border-y border-black/70 py-4 sm:grid-cols-2"><Detail label="Entrega caja vacía">{data.logistics.emptyBoxMode}</Detail><Detail label="Recolección caja llena">{data.logistics.fullBoxMode}</Detail></dl><div className="divide-y divide-black/70">{data.logistics.tasks.map((task) => <article key={task.id} className="relative py-4 pl-5 first:pt-0 last:pb-0"><span className="absolute left-0 top-5 h-2.5 w-2.5 rounded-full border border-emerald-700/60 bg-emerald-400/70 first:top-1" /><div className="flex flex-wrap items-start justify-between gap-2"><p className="font-black text-slate-50">{task.taskLabel}</p><span className="rounded-md border border-black bg-surface-inset px-2 py-0.5 text-[10px] font-black uppercase text-slate-300">{task.status}</span></div><p className="mt-1 text-sm font-bold text-slate-200">{task.scheduleLabel}</p><p className="mt-1 text-sm font-bold text-slate-400">{task.routeLabel} <span className="mx-1 text-slate-600">·</span> {task.driverLabel}</p>{task.notes ? <p className="mt-2 text-xs font-bold leading-relaxed text-slate-400">{task.notes}</p> : null}</article>)}</div></section> : null}

          {activeSection === "registro" && data.audit ? <section className="space-y-5 border-t border-black/70 pt-6"><SectionTitle icon={PackageCheck} eyebrow="Trazabilidad" title="Auditoría" />{data.sectionErrors.audit ? <p className="rounded-lg border border-rose-700 bg-rose-950/40 px-3 py-2 text-sm font-bold text-rose-200">{data.sectionErrors.audit}</p> : null}{!data.audit.length ? <p className="text-sm font-bold text-slate-400">Sin movimientos registrados</p> : <div className="space-y-2">{data.audit.map((entry) => <AuditHistoryEntry key={entry.id} entry={entry} />)}</div>}</section> : null}
        </div>
      </div>
      {editOpen ? (
        <ShipmentExpedienteEditDialog
          shipmentId={data.shipmentId}
          data={data.edit}
          onClose={() => setEditOpen(false)}
          onSaved={() => window.location.reload()}
        />
      ) : null}
    </main>
  );
}
