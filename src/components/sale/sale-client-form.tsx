"use client";

import { useEffect, useState } from "react";
import { Mail, MapPin, Plus, Trash2, UserPlus } from "lucide-react";
import { ActionConfirmDialog } from "@/components/action-confirm-dialog";
import { EmailDomainSuggestionsInput } from "@/components/email-domain-suggestions-input";
import { PhoneCountryInput } from "@/components/phone-country-input";
import { flowFormStackClass } from "@/components/flow-form-styles";
import { SaleAddressGooglePanel } from "@/components/sale/sale-address-google-panel";
import { SaleAddressCoverageButton } from "@/components/sale/sale-address-coverage-button";
import {
  openExactEntranceBrowserWindow,
  SaleExactEntranceWindow,
  type ExactEntranceDraft,
  type MapResolvedAddress,
} from "@/components/sale/sale-exact-entrance-step";
import {
  type AddressSuggestion,
  type AddressValidation,
  clientFormInputClass,
  clientFormAddressFieldClass,
  clientFormAddressLabelClass,
  clientFormLabelClass,
  noBrowserAutocomplete,
  personFullName,
  type Sender,
} from "@/components/sale/venta-parts";
import {
  PERSON_NAME_MAX_LENGTH,
  formatPersonNameInput,
} from "@/lib/person-name";

type SaleClientFormProps = {
  form: {
    firstName: string;
    lastName: string;
    phones: string[];
    phoneList: string[];
    emails: string[];
    street: string;
    house: string;
    neighborhood: string;
    city: string;
    state: string;
    postalCode: string;
    addressReference: string;
    setFirstName: (value: string) => void;
    setLastName: (value: string) => void;
    setStreet: (value: string) => void;
    setHouse: (value: string) => void;
    setNeighborhood: (value: string) => void;
    setCity: (value: string) => void;
    setState: (value: string) => void;
    setPostalCode: (value: string) => void;
    setAddressReference: (value: string) => void;
  };
  address: {
    search: string;
    suggestions: AddressSuggestion[];
    searching?: boolean;
    validation: AddressValidation;
    setSearch: (value: string) => void;
    setSuggestions: (suggestions: AddressSuggestion[]) => void;
    setValidation: (validation: AddressValidation) => void;
    onSelectSuggestion: (suggestion: AddressSuggestion) => void | Promise<void>;
    touchField: (update: () => void) => void;
  };
  actions: {
    onCancel: () => void;
    onSubmit: (options?: {
      skipAddressVerification?: boolean;
      exactEntrance?: ExactEntranceDraft | null;
    }) => void | Promise<void>;
    onAddEmail: () => void;
    onUpdateEmail: (index: number, value: string) => void;
    onRemoveEmail: (index: number) => void;
    onAddPhone: () => void;
    onUpdatePhone: (index: number, value: string) => void;
    onRemovePhone: (index: number) => void;
  };
  meta: {
    editingCustomerId: string | null;
    duplicateClient: Sender | null;
    initialExactEntrance?: ExactEntranceDraft | null;
  };
  /** En modal de documentos: apila paneles a ancho completo para que no se corte la dirección. */
  layout?: "split" | "stack";
};

export function SaleClientForm({
  form,
  address,
  actions,
  meta,
  layout = "split",
}: SaleClientFormProps) {
  const [addressUnverifiedAccepted, setAddressUnverifiedAccepted] = useState(false);
  const [showUnverifiedConfirm, setShowUnverifiedConfirm] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [mapHostWindow, setMapHostWindow] = useState<Window | null>(null);
  const [mapPopupError, setMapPopupError] = useState("");
  const [exactEntranceDraft, setExactEntranceDraft] = useState<ExactEntranceDraft | null>(
    meta.initialExactEntrance || null,
  );
  const hasRequiredAddress =
    form.street.trim() && form.city.trim() && form.state.trim() && form.postalCode.trim();
  const addressReady = address.validation.status === "valid" || addressUnverifiedAccepted;
  const saveDisabled =
    !form.phoneList.length ||
    (!meta.duplicateClient &&
      (!form.firstName.trim() ||
        !form.lastName.trim() ||
        !hasRequiredAddress ||
        !addressReady));
  const fullAddress = [
    [form.street, form.house].filter(Boolean).join(" "),
    form.neighborhood,
    [form.city, form.state, form.postalCode].filter(Boolean).join(" "),
    "USA",
  ]
    .filter(Boolean)
    .join(", ");
  function openMapWindow() {
    const popup = openExactEntranceBrowserWindow();
    if (!popup) {
      setMapPopupError("Chrome bloqueó la ventana del mapa. Permite ventanas emergentes para Boxario.");
      return;
    }
    setMapPopupError("");
    setMapHostWindow(popup);
    setMapOpen(true);
  }

  function dismissMapWindow() {
    setMapOpen(false);
    setMapHostWindow(null);
  }

  useEffect(() => () => {
    if (mapHostWindow && !mapHostWindow.closed) mapHostWindow.close();
  }, [mapHostWindow]);

  function touchAddressField(update: () => void) {
    setAddressUnverifiedAccepted(false);
    setExactEntranceDraft(null);
    address.touchField(update);
  }

  function selectSuggestedAddress(suggestion: AddressSuggestion) {
    setAddressUnverifiedAccepted(false);
    void address.onSelectSuggestion(suggestion);
  }

  function useAddressWithoutGoogle() {
    setAddressUnverifiedAccepted(true);
    setShowUnverifiedConfirm(false);
    address.setSuggestions([]);
    address.setValidation({
      status: "idle",
      message: "Direccion sin verificar",
    });
  }

  function submitDetails() {
    void actions.onSubmit({
      ...(addressUnverifiedAccepted ? { skipAddressVerification: true } : {}),
      exactEntrance: exactEntranceDraft,
    });
  }

  function useMapAddress(resolved: MapResolvedAddress) {
    form.setStreet(resolved.street);
    form.setHouse(resolved.houseNumber);
    form.setNeighborhood(resolved.neighborhood);
    form.setCity(resolved.city);
    form.setState(resolved.state);
    form.setPostalCode(resolved.postalCode);
    form.setAddressReference(resolved.addressReference ?? form.addressReference);
    address.setSearch(resolved.formattedAddress);
    address.setSuggestions([]);
    address.setValidation({
      status: "valid",
      message: "Dirección elegida en el mapa",
      formattedAddress: resolved.formattedAddress,
      placeId: resolved.placeId,
      lat: resolved.lat,
      lng: resolved.lng,
    });
    setAddressUnverifiedAccepted(false);
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-start gap-2 border-b border-white/10 pb-4">
          <button
            type="button"
            onClick={actions.onCancel}
            className="h-10 rounded-md border border-slate-600/60 bg-surface-inset px-4 text-sm font-black text-[#f8fafc]"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={submitDetails}
            disabled={saveDisabled}
            className="h-10 rounded-md bg-emerald-400 px-5 text-sm font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {meta.duplicateClient
              ? "Usar existente"
              : meta.editingCustomerId ? "Guardar remitente" : "Crear remitente"}
          </button>
      </div>

      <form
        className={
          layout === "stack"
            ? "relative grid overflow-hidden rounded-xl border border-white/10 bg-surface-card"
            : "relative grid overflow-hidden rounded-xl border border-white/10 bg-surface-card lg:grid-cols-[minmax(22rem,0.82fr)_minmax(0,1.18fr)] lg:items-start"
        }
        autoComplete="off"
        onSubmit={(event) => event.preventDefault()}
      >
        <div
          className="pointer-events-none absolute -left-[9999px] h-0 w-0 overflow-hidden opacity-0"
          aria-hidden
        >
          <input tabIndex={-1} name="fake-street" autoComplete="street-address" readOnly />
          <input tabIndex={-1} name="fake-city" autoComplete="address-level2" readOnly />
        </div>
        <section className="flex min-w-0 flex-col overflow-visible">
          <div className="flex flex-wrap items-center gap-3 border-b border-white/10 px-5 py-4">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-emerald-400 text-slate-950">
              <UserPlus className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-black uppercase text-[#f8fafc]">Quién envía</p>
              <p className="text-xs font-bold text-slate-400">Identidad y formas de contacto</p>
            </div>
          </div>
          <div className="space-y-3 p-5">
            <div className={`${flowFormStackClass} max-w-none`}>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1.5">
                  <span className={clientFormLabelClass}>Nombre</span>
                  <input
                    {...noBrowserAutocomplete}
                    name="boxario-client-first-name"
                    className={clientFormInputClass}
                    placeholder="Carlos"
                    value={form.firstName}
                    maxLength={PERSON_NAME_MAX_LENGTH}
                    inputMode="text"
                    onChange={(event) =>
                      form.setFirstName(formatPersonNameInput(event.target.value))
                    }
                  />
                </label>
                <label className="grid gap-1.5">
                  <span className={clientFormLabelClass}>Apellido</span>
                  <input
                    {...noBrowserAutocomplete}
                    name="boxario-client-last-name"
                    className={clientFormInputClass}
                    placeholder="Diaz"
                    value={form.lastName}
                    maxLength={PERSON_NAME_MAX_LENGTH}
                    inputMode="text"
                    onChange={(event) =>
                      form.setLastName(formatPersonNameInput(event.target.value))
                    }
                  />
                </label>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className={clientFormLabelClass}>Correos</span>
                  <button type="button" title="Agregar correo" aria-label="Agregar correo" onClick={actions.onAddEmail} className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-emerald-400/40 bg-emerald-400/10 text-emerald-200 transition hover:border-emerald-300 hover:bg-emerald-400/20">
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                {form.emails.map((email, index) => (
                  <div key={`client-email-${index}`} className="flex items-start gap-2">
                    <EmailDomainSuggestionsInput
                      {...noBrowserAutocomplete}
                      className="min-w-0 flex-1"
                      name={`boxario-client-email-${index}`}
                      inputClassName={`${clientFormInputClass} pl-10`}
                      placeholder="cliente@correo.com"
                      value={email}
                      onChange={(value) => actions.onUpdateEmail(index, value)}
                      icon={<Mail className="h-4 w-4" />}
                    />
                    <button
                      type="button"
                      title="Quitar correo"
                      aria-label="Quitar correo"
                      disabled={form.emails.length === 1}
                      onClick={() => actions.onRemoveEmail(index)}
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-black bg-[#3A1818] text-rose-100 disabled:cursor-not-allowed disabled:opacity-35"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className={clientFormLabelClass}>Telefonos</span>
                  <button type="button" title="Agregar teléfono" aria-label="Agregar teléfono" onClick={actions.onAddPhone} className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-emerald-400/40 bg-emerald-400/10 text-emerald-200 transition hover:border-emerald-300 hover:bg-emerald-400/20">
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                {form.phones.map((phone, index) => (
                  <div key={`client-phone-${index}`} className="flex flex-wrap items-start gap-2">
                    <PhoneCountryInput
                      className="min-w-0 flex-1"
                      name={`boxario-client-phone-${index}`}
                      value={phone}
                      onChange={(value) => actions.onUpdatePhone(index, value)}
                    />
                    <button
                      type="button"
                      title="Quitar telefono"
                      aria-label="Quitar telefono"
                      disabled={form.phones.length === 1}
                      onClick={() => actions.onRemovePhone(index)}
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-black bg-[#3A1818] text-rose-100 disabled:cursor-not-allowed disabled:opacity-35"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>

              {meta.duplicateClient ? (
                <div className="rounded-lg border border-amber-600 bg-amber-400 px-3 py-2.5 text-slate-950">
                  <p className="text-xs font-black uppercase text-amber-200">Telefono ya registrado</p>
                  <p className="truncate text-sm font-black text-[#f8fafc]">
                    {personFullName(meta.duplicateClient)}
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <section className="flex min-w-0 flex-col border-t border-white/10 lg:border-l lg:border-t-0">
          <div className="flex flex-wrap items-center gap-3 border-b border-white/10 px-5 py-4">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-sky-300 text-slate-950">
              <MapPin className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-black uppercase text-[#f8fafc]">Dirección del cliente</p>
              <p className="text-xs font-bold text-slate-400">Dirección postal · USA</p>
            </div>
            <button type="button" onClick={openMapWindow} className="ml-auto inline-flex h-9 items-center gap-2 rounded-lg border border-sky-400/40 bg-sky-950/20 px-3 text-xs font-black text-sky-100 hover:border-sky-300 hover:bg-sky-950/40">
              <MapPin className="h-4 w-4" /> Cliente verifica mapa
            </button>
            <SaleAddressCoverageButton
              address={{
                street: form.street,
                houseNumber: form.house,
                neighborhood: form.neighborhood,
                city: form.city,
                state: form.state,
                postalCode: form.postalCode,
                country: "USA",
                formattedAddress: address.validation.formattedAddress || fullAddress,
                placeId: address.validation.placeId || "",
                lat: address.validation.lat,
                lng: address.validation.lng,
              }}
              exactEntrance={exactEntranceDraft}
              addressReference={form.addressReference}
              exactEntranceNote={exactEntranceDraft?.note || ""}
              customerId={meta.editingCustomerId}
              disabled={!hasRequiredAddress}
              onAddressReferenceChange={form.setAddressReference}
              onExactEntranceNoteChange={(value) => {
                setExactEntranceDraft((current) => current ? { ...current, note: value } : current);
              }}
              exactEntranceNoteEditable={Boolean(exactEntranceDraft)}
              onCustomerLocationSaved={(location) => {
                setExactEntranceDraft((current) => ({
                  lat: location.lat,
                  lng: location.lng,
                  note: current?.note || "",
                  panoId: current?.panoId,
                  heading: current?.heading,
                  pitch: current?.pitch,
                }));
              }}
            />
          </div>
          <div className="space-y-3 p-5">
            {mapPopupError ? <p className="text-xs font-bold text-amber-200">{mapPopupError}</p> : null}
            <label className="grid min-w-0 gap-1.5">
              <span className={clientFormAddressLabelClass(form.street)}>Calle</span>
              <input
                {...noBrowserAutocomplete}
                name="boxario-client-line-1"
                className={clientFormAddressFieldClass(form.street)}
                placeholder="Calle y numero"
                title={form.street || undefined}
                value={form.street}
                onChange={(event) => {
                  touchAddressField(() => form.setStreet(event.target.value));
                }}
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid min-w-0 gap-1.5">
                <span className={clientFormAddressLabelClass(form.house, { required: false })}>
                  Número de unidad
                </span>
                <input
                  {...noBrowserAutocomplete}
                  name="boxario-client-line-2"
                  className={clientFormAddressFieldClass(form.house, { required: false })}
                  placeholder="Apto / suite"
                  title={form.house || undefined}
                  value={form.house}
                  onChange={(event) => {
                    touchAddressField(() => form.setHouse(event.target.value));
                  }}
                />
              </label>
              <label className="grid min-w-0 gap-1.5">
                <span className={clientFormAddressLabelClass(form.postalCode)}>CP</span>
                <input
                  {...noBrowserAutocomplete}
                  name="boxario-client-zip"
                  className={clientFormAddressFieldClass(form.postalCode)}
                  placeholder="Codigo postal"
                  title={form.postalCode || undefined}
                  value={form.postalCode}
                  onChange={(event) => {
                    touchAddressField(() => form.setPostalCode(event.target.value));
                  }}
                />
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-[minmax(0,1.15fr)_minmax(0,1.15fr)_minmax(5rem,7rem)]">
              <label className="grid min-w-0 gap-1.5">
                <span className={clientFormAddressLabelClass(form.neighborhood, { required: false })}>
                  Colonia
                </span>
                <input
                  {...noBrowserAutocomplete}
                  name="boxario-client-zone"
                  className={clientFormAddressFieldClass(form.neighborhood, { required: false })}
                  placeholder="Barrio / colonia"
                  title={form.neighborhood || undefined}
                  value={form.neighborhood}
                  onChange={(event) => {
                    touchAddressField(() => form.setNeighborhood(event.target.value));
                  }}
                />
              </label>
              <label className="grid min-w-0 gap-1.5">
                <span className={clientFormAddressLabelClass(form.city)}>Ciudad</span>
                <input
                  {...noBrowserAutocomplete}
                  name="boxario-client-city"
                  className={clientFormAddressFieldClass(form.city)}
                  placeholder="Ciudad"
                  title={form.city || undefined}
                  value={form.city}
                  onChange={(event) => {
                    touchAddressField(() => form.setCity(event.target.value));
                  }}
                />
              </label>
              <label className="grid min-w-0 gap-1.5">
                <span className={clientFormAddressLabelClass(form.state)}>Estado</span>
                <input
                  {...noBrowserAutocomplete}
                  name="boxario-client-region"
                  className={clientFormAddressFieldClass(form.state)}
                  placeholder="Estado"
                  title={form.state || undefined}
                  value={form.state}
                  onChange={(event) => {
                    touchAddressField(() => form.setState(event.target.value));
                  }}
                />
              </label>
            </div>

            <SaleAddressGooglePanel
              validation={address.validation}
              searching={address.searching}
              suggestions={address.suggestions}
              unverifiedAccepted={addressUnverifiedAccepted}
              hasRequiredAddress={Boolean(hasRequiredAddress)}
              fullAddress={fullAddress}
              unitNumber={form.house}
              listboxId="client-address-suggestions-listbox"
              onSelectSuggestion={selectSuggestedAddress}
              onUseUnverified={() => setShowUnverifiedConfirm(true)}
            />

            <label className="grid gap-1.5">
              <span className={clientFormLabelClass}>Referencias</span>
              <textarea
                {...noBrowserAutocomplete}
                name="boxario-client-address-reference"
                rows={2}
                className={`${clientFormInputClass} min-h-[4.5rem] resize-y py-2.5`}
                placeholder="Ej. segundo piso, casa roja, porton negro, entre calles..."
                value={form.addressReference ?? ""}
                onChange={(event) => form.setAddressReference(event.target.value)}
              />
              <span className="text-[11px] font-bold leading-snug text-slate-500">
                Indicaciones extra para encontrar el domicilio. No afectan la verificacion en Google.
              </span>
            </label>
          </div>
        </section>
      </form>

      {mapOpen && mapHostWindow ? (
        <SaleExactEntranceWindow
          open
          hostWindow={mapHostWindow}
          personLabel="este remitente"
          country="USA"
          addressFields={{
            street: form.street,
            houseNumber: form.house,
            neighborhood: form.neighborhood,
            city: form.city,
            state: form.state,
            postalCode: form.postalCode,
            country: "USA",
            addressReference: form.addressReference,
          }}
          addressLocation={
            typeof address.validation.lat === "number" && typeof address.validation.lng === "number"
              ? { lat: address.validation.lat, lng: address.validation.lng }
              : null
          }
          initialEntrance={exactEntranceDraft}
          onClose={dismissMapWindow}
          onAddressResolved={useMapAddress}
          showOperationalNotes={true}
          onConfirm={(draft) => {
            setExactEntranceDraft(draft);
            dismissMapWindow();
          }}
        />
      ) : null}

      <ActionConfirmDialog
        open={showUnverifiedConfirm}
        dialogId="client-unverified-address-confirm"
        title="Direccion sin verificar"
        message="Estas seguro de que quieres agregar esta direccion sin verificarla en Google? Puede tener errores y afectar la entrega."
        confirmLabel="Agregar sin verificar"
        cancelLabel="Volver"
        tone="warning"
        onCancel={() => setShowUnverifiedConfirm(false)}
        onConfirm={useAddressWithoutGoogle}
      />
    </>
  );
}
