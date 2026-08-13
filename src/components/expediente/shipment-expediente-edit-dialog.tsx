"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Loader2, Save, X } from "lucide-react";
import { updateShipmentExpedienteAction } from "@/app/actions/shipment-expediente-edit";
import { inputClass, primaryButtonClass, secondaryButtonClass } from "@/components/ui-blocks";
import { useNotify } from "@/hooks/use-notify";
import type { ShipmentExpedienteEditData, ShipmentExpedienteEditParty } from "@/lib/shipment-expediente";

type Props = {
  shipmentId: string;
  data: ShipmentExpedienteEditData;
  onClose: () => void;
  onSaved: () => void;
};

function listText(values: string[]) {
  return values.join(", ");
}

function splitList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function PartyFields({
  title,
  party,
  onChange,
  recipient = false,
}: {
  title: string;
  party: ShipmentExpedienteEditParty;
  onChange: (patch: Partial<ShipmentExpedienteEditParty>) => void;
  recipient?: boolean;
}) {
  return (
    <section className="border-t border-black/70 pt-4 first:border-t-0 first:pt-0">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-black text-slate-100">{title}</h3>
        <span className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
          Contacto
        </span>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1.5">
          <span className="text-[11px] font-black uppercase text-slate-500">Nombre</span>
          <input className={inputClass} value={party.firstName} onChange={(event) => onChange({ firstName: event.target.value })} />
        </label>
        <label className="grid gap-1.5">
          <span className="text-[11px] font-black uppercase text-slate-500">Apellido</span>
          <input className={inputClass} value={party.lastName} onChange={(event) => onChange({ lastName: event.target.value })} />
        </label>
        <label className="grid gap-1.5">
          <span className="text-[11px] font-black uppercase text-slate-500">{recipient ? "Teléfono" : "Teléfonos"}</span>
          <input className={inputClass} value={recipient ? party.phone : listText(party.phones)} onChange={(event) => onChange(recipient ? { phone: event.target.value } : { phones: splitList(event.target.value) })} placeholder={recipient ? "Teléfono" : "Separados por coma"} />
        </label>
        <label className="grid gap-1.5">
          <span className="text-[11px] font-black uppercase text-slate-500">Correos</span>
          <input className={inputClass} value={listText(party.emails)} onChange={(event) => onChange({ emails: splitList(event.target.value) })} placeholder="Separados por coma" />
        </label>
        <label className="grid gap-1.5 sm:col-span-2">
          <span className="text-[11px] font-black uppercase text-slate-500">Calle</span>
          <input className={inputClass} value={party.street} onChange={(event) => onChange({ street: event.target.value })} />
        </label>
        <label className="grid gap-1.5">
          <span className="text-[11px] font-black uppercase text-slate-500">Número</span>
          <input className={inputClass} value={party.houseNumber} onChange={(event) => onChange({ houseNumber: event.target.value })} />
        </label>
        <label className="grid gap-1.5">
          <span className="text-[11px] font-black uppercase text-slate-500">Colonia / zona</span>
          <input className={inputClass} value={party.neighborhood} onChange={(event) => onChange({ neighborhood: event.target.value })} />
        </label>
        <label className="grid gap-1.5">
          <span className="text-[11px] font-black uppercase text-slate-500">Ciudad</span>
          <input className={inputClass} value={party.city} onChange={(event) => onChange({ city: event.target.value })} />
        </label>
        <label className="grid gap-1.5">
          <span className="text-[11px] font-black uppercase text-slate-500">Estado</span>
          <input className={inputClass} value={party.state} onChange={(event) => onChange({ state: event.target.value })} />
        </label>
        <label className="grid gap-1.5">
          <span className="text-[11px] font-black uppercase text-slate-500">ZIP / código postal</span>
          <input className={inputClass} value={party.postalCode} onChange={(event) => onChange({ postalCode: event.target.value })} />
        </label>
        <label className="grid gap-1.5 sm:col-span-2">
          <span className="text-[11px] font-black uppercase text-slate-500">Referencias</span>
          <input className={inputClass} value={party.addressReference} onChange={(event) => onChange({ addressReference: event.target.value })} />
        </label>
      </div>
    </section>
  );
}

export function ShipmentExpedienteEditDialog({ shipmentId, data, onClose, onSaved }: Props) {
  const notify = useNotify();
  const [sender, setSender] = useState(data.sender);
  const [recipient, setRecipient] = useState(data.recipient);
  const [country, setCountry] = useState(data.country);
  const [carrier, setCarrier] = useState(data.carrier);
  const [deliveryNotes, setDeliveryNotes] = useState(data.deliveryNotes);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !saving) onClose();
    }
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onClose, saving]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      const result = await updateShipmentExpedienteAction({
        shipmentId,
        sender,
        recipient,
        country,
        carrier,
        deliveryNotes,
      });
      if (!result.ok) {
        notify.error(result.error);
        return;
      }
      notify.success("Envío actualizado");
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="app-modal-overlay fixed inset-0 z-[145] flex justify-center bg-black/75 p-3 sm:p-5" onPointerDown={(event) => { if (event.target === event.currentTarget && !saving) onClose(); }}>
      <div className="app-modal-content flex max-h-[min(94vh,980px)] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-black bg-surface-panel shadow-[0_24px_80px_rgba(0,0,0,0.55)]" role="dialog" aria-modal="true" aria-labelledby="shipment-edit-title" onPointerDown={(event) => event.stopPropagation()}>
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-black px-4 py-3 sm:px-5">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-300">Editar envío</p>
            <h2 id="shipment-edit-title" className="mt-1 text-lg font-black text-slate-50">Información comercial y operativa</h2>
            <p className="mt-1 text-xs font-bold text-slate-400">Los cambios de dirección devuelven una solicitud pendiente a evaluación de Logística.</p>
          </div>
          <button type="button" className={secondaryButtonClass} onClick={onClose} disabled={saving} aria-label="Cerrar edición"><X className="h-4 w-4" /></button>
        </header>
        <form className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5" onSubmit={submit}>
          <div className="grid gap-5">
            <PartyFields title="Remitente" party={sender} onChange={(patch) => setSender((current) => ({ ...current, ...patch }))} />
            {recipient ? <PartyFields title="Destinatario" party={recipient} recipient onChange={(patch) => setRecipient((current) => current ? { ...current, ...patch } : current)} /> : null}
            <section className="border-t border-black/70 pt-4">
              <h3 className="text-sm font-black text-slate-100">Datos del envío</h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1.5"><span className="text-[11px] font-black uppercase text-slate-500">País destino</span><input className={inputClass} value={country} onChange={(event) => setCountry(event.target.value)} /></label>
                <label className="grid gap-1.5"><span className="text-[11px] font-black uppercase text-slate-500">Carrier / tipo de caja</span><input className={inputClass} value={carrier} onChange={(event) => setCarrier(event.target.value)} /></label>
                <label className="grid gap-1.5 sm:col-span-2"><span className="text-[11px] font-black uppercase text-slate-500">Notas de entrega</span><textarea className={`${inputClass} min-h-24 py-2`} value={deliveryNotes} onChange={(event) => setDeliveryNotes(event.target.value)} /></label>
              </div>
            </section>
          </div>
          <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-black/70 pt-4">
            <button type="button" className={secondaryButtonClass} onClick={onClose} disabled={saving}>Cancelar</button>
            <button type="submit" className={primaryButtonClass} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Guardar cambios</button>
          </div>
        </form>
      </div>
    </div>
  );
}
