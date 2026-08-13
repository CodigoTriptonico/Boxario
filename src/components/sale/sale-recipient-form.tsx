"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ActionConfirmDialog } from "@/components/action-confirm-dialog";
import { EmailDomainSuggestionsInput } from "@/components/email-domain-suggestions-input";
import { PhoneCountryInput } from "@/components/phone-country-input";
import { InlineSearchPicker } from "@/components/inline-search-picker";
import { countryFlagIcon } from "@/components/country-flag";
import { flowFormStackClass } from "@/components/flow-form-styles";
import { Mail, MapPin, Plus, Trash2, UserPlus } from "lucide-react";
import {
  recipientHasRequiredAddress,
  recipientSaveEnabled,
} from "@/lib/sale-recipient-save";
import { SaleAddressGooglePanel } from "@/components/sale/sale-address-google-panel";
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
  clientFormPickerShellClass,
  noBrowserAutocomplete,
  type Recipient,
} from "@/components/sale/venta-parts";
import { resolveAddressValidationUi, addressCardSubtitle } from "@/lib/sale-address-validation-ui";
import {
  PERSON_NAME_MAX_LENGTH,
  formatPersonNameInput,
} from "@/lib/person-name";
import { configPricesCountryHref } from "@/lib/country-options";
import {
  buildPhoneNumber,
  getPhoneDialCodeForCountryName,
  splitPhoneNumber,
} from "@/lib/phone/countries";

const CREATE_COUNTRY_OPTION_VALUE = "__create_country__";

type SaleRecipientFormProps = {
  form: {
    firstName: string;
    lastName: string;
    phone: string;
    emails: string[];
    country: string;
    street: string;
    house: string;
    neighborhood: string;
    city: string;
    state: string;
    postalCode: string;
    addressReference: string;
    setFirstName: (value: string) => void;
    setLastName: (value: string) => void;
    setPhone: (value: string) => void;
    setCountry: (value: string) => void;
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
  };
  meta: {
    countries: string[];
    duplicateRecipient: Recipient | null;
    initialExactEntrance?: ExactEntranceDraft | null;
  };
  /** En modal de documentos: apila paneles a ancho completo para que no se corte la dirección. */
  layout?: "split" | "stack";
};

function clearRecipientAddress(form: SaleRecipientFormProps["form"]) {
  form.setStreet("");
  form.setHouse("");
  form.setNeighborhood("");
  form.setCity("");
  form.setState("");
  form.setPostalCode("");
  form.setAddressReference("");
}

export function SaleRecipientForm({
  form,
  address,
  actions,
  meta,
  layout = "split",
}: SaleRecipientFormProps) {
  const router = useRouter();
  const contactMenuRef = useRef<HTMLDivElement>(null);
  const [contactMenuOpen, setContactMenuOpen] = useState(false);
  const [addressUnverifiedAccepted, setAddressUnverifiedAccepted] = useState(false);
  const [showUnverifiedConfirm, setShowUnverifiedConfirm] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [mapHostWindow, setMapHostWindow] = useState<Window | null>(null);
  const [mapPopupError, setMapPopupError] = useState("");
  const [exactEntranceDraft, setExactEntranceDraft] = useState<ExactEntranceDraft | null>(
    meta.initialExactEntrance || null,
  );
  const hasCountry = Boolean(form.country.trim());
  const hasRequiredAddress = recipientHasRequiredAddress({
    street: form.street,
    city: form.city,
    state: form.state,
    postalCode: form.postalCode,
  });
  const phoneDefaultDialCode = useMemo(
    () => getPhoneDialCodeForCountryName(form.country),
    [form.country],
  );

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

  useEffect(() => {
    if (!contactMenuOpen) {
      return;
    }

    function closeFromOutside(event: PointerEvent) {
      if (!contactMenuRef.current?.contains(event.target as Node)) {
        setContactMenuOpen(false);
      }
    }

    function closeFromEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setContactMenuOpen(false);
      }
    }

    document.addEventListener("pointerdown", closeFromOutside);
    document.addEventListener("keydown", closeFromEscape);
    return () => {
      document.removeEventListener("pointerdown", closeFromOutside);
      document.removeEventListener("keydown", closeFromEscape);
    };
  }, [contactMenuOpen]);

  function addEmailContact() {
    actions.onAddEmail();
    setContactMenuOpen(false);
  }

  const countryOptions = useMemo(() => {
    if (!meta.countries.length) {
      return [
        {
          value: CREATE_COUNTRY_OPTION_VALUE,
          label: "Crear pais",
          searchText: "crear pais nuevo agregar",
          icon: <Plus className="h-4 w-4" aria-hidden />,
          action: true,
        },
      ];
    }

    return meta.countries.map((country) => ({
      value: country,
      label: country,
      icon: countryFlagIcon(country),
    }));
  }, [meta.countries]);

  function touchAddressField(update: () => void) {
    setAddressUnverifiedAccepted(false);
    setExactEntranceDraft(null);
    address.touchField(update);
  }

  function handleCountryChange(country: string) {
    const previousDial = getPhoneDialCodeForCountryName(form.country);
    const nextDial = getPhoneDialCodeForCountryName(country);

    form.setCountry(country);
    address.setSuggestions([]);
    address.setValidation({ status: "idle", message: "" });
    address.setSearch("");
    setAddressUnverifiedAccepted(false);
    setExactEntranceDraft(null);
    dismissMapWindow();
    clearRecipientAddress(form);

    const { nationalDigits } = splitPhoneNumber(form.phone, previousDial || nextDial || "1");

    if (nextDial) {
      form.setPhone(buildPhoneNumber(nextDial, nationalDigits));
    } else if (!nationalDigits) {
      form.setPhone("");
    }
  }

  useEffect(() => {
    if (address.validation.status === "valid") {
      queueMicrotask(() => {
        setAddressUnverifiedAccepted(false);
      });
    }
  }, [address.validation.status]);

  const saveDisabled = !recipientSaveEnabled({
    firstName: form.firstName,
    lastName: form.lastName,
    phone: form.phone,
    country: form.country,
    duplicateRecipient: Boolean(meta.duplicateRecipient),
    validationStatus: address.validation.status,
    skipVerification: addressUnverifiedAccepted,
    hasRequiredAddress,
  });


  const fullAddress = [
    [form.street, form.house].filter(Boolean).join(" "),
    form.neighborhood,
    [form.city, form.state, form.postalCode].filter(Boolean).join(" "),
    form.country,
  ]
    .filter(Boolean)
    .join(", ");
  const lockedClass = "pointer-events-none saturate-[0.8]";

  const addressUi = resolveAddressValidationUi({
    enabled: hasCountry,
    disabledMessage: "Disponible al elegir pais",
    searching: address.searching,
    validation: address.validation,
    suggestionsCount: address.suggestions.length,
    unverifiedAccepted: addressUnverifiedAccepted,
    hasRequiredAddress,
    fullAddress,
  });

  const addressBadgeClass: Record<string, string> = {
    disabled: "border-black bg-surface-card text-slate-300",
    idle: "border-sky-400/45 bg-[#14262b] text-sky-100",
    searching: "border-sky-300 bg-[#14262b] text-sky-100",
    checking: "border-sky-300 bg-[#14262b] text-sky-100",
    suggestions: "border-sky-400/45 bg-[#14262b] text-sky-100",
    valid: "border-emerald-500/70 bg-[#1a2e28] text-emerald-100",
    invalid: "border-amber-600 bg-amber-400 text-slate-950",
    unverified: "border-amber-600 bg-amber-400 text-slate-950",
  };

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
          {meta.duplicateRecipient
            ? "Usar existente"
            : "Guardar destinatario"}
        </button>
        <span
          className={`rounded-lg border px-2.5 py-1 text-[11px] font-black uppercase ${addressBadgeClass[addressUi.tone]}`}
        >
          {!hasCountry ? "Elige pais" : addressCardSubtitle(addressUi.tone)}
        </span>
      </div>

      <form
        className={
          layout === "stack"
            ? "relative grid overflow-hidden rounded-xl border border-white/10 bg-surface-card"
            : "relative grid overflow-hidden rounded-xl border border-white/10 bg-surface-card lg:grid-cols-2 lg:items-stretch"
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
          <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-emerald-400 text-slate-950">
              <UserPlus className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-black uppercase text-[#f8fafc]">Quién recibe</p>
              <p className="text-xs font-bold text-slate-400">País, identidad y contacto</p>
            </div>
          </div>
          <div className="space-y-3 p-5">
            <div className={`${flowFormStackClass} max-w-none`}>
              <label className="grid gap-1.5">
                <span className={clientFormLabelClass}>Pais</span>
                <InlineSearchPicker
                  compact={false}
                  className="w-full"
                  minWidthClass="w-full min-w-0"
                  shellClassName={clientFormPickerShellClass}
                  value={form.country}
                  onChange={handleCountryChange}
                  onSelectOption={(option) => {
                    if (option.value === CREATE_COUNTRY_OPTION_VALUE || option.action) {
                      router.push(configPricesCountryHref(form.country));
                    }
                  }}
                  options={countryOptions}
                  placeholder={meta.countries.length ? "Elegir pais" : "Sin paises — crear uno"}
                  searchPlaceholder="Buscar pais…"
                  emptyLabel="Sin paises configurados"
                  ariaLabel="Pais del destinatario"
                />
              </label>

              <div className={hasCountry ? undefined : lockedClass} aria-disabled={!hasCountry}>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-1.5">
                    <span className={clientFormLabelClass}>Nombre</span>
                    <input
                      {...noBrowserAutocomplete}
                      name="boxario-recipient-first-name"
                      className={clientFormInputClass}
                      placeholder="Maria"
                      value={form.firstName}
                      maxLength={PERSON_NAME_MAX_LENGTH}
                      inputMode="text"
                      disabled={!hasCountry}
                      tabIndex={hasCountry ? 0 : -1}
                      onChange={(event) =>
                        form.setFirstName(formatPersonNameInput(event.target.value))
                      }
                    />
                  </label>
                  <label className="grid gap-1.5">
                    <span className={clientFormLabelClass}>Apellido</span>
                    <input
                      {...noBrowserAutocomplete}
                      name="boxario-recipient-last-name"
                      className={clientFormInputClass}
                      placeholder="Lopez"
                      value={form.lastName}
                      maxLength={PERSON_NAME_MAX_LENGTH}
                      inputMode="text"
                      disabled={!hasCountry}
                      tabIndex={hasCountry ? 0 : -1}
                      onChange={(event) =>
                        form.setLastName(formatPersonNameInput(event.target.value))
                      }
                    />
                  </label>
                </div>

                <div ref={contactMenuRef} className="relative mt-3 flex w-fit items-center justify-start gap-2">
                  <button
                    type="button"
                    title="Agregar correo"
                    aria-label="Agregar correo"
                    aria-expanded={contactMenuOpen}
                    disabled={!hasCountry}
                    tabIndex={hasCountry ? 0 : -1}
                    onClick={() => setContactMenuOpen((open) => !open)}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-emerald-400 text-slate-950 disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                  <span className={clientFormLabelClass}>Correo</span>
                  {contactMenuOpen ? (
                    <div className="absolute left-0 top-[calc(100%+0.4rem)] z-30 w-40 overflow-hidden rounded-lg border border-black bg-[#101820] shadow-2xl">
                      <button
                        type="button"
                        onClick={addEmailContact}
                        className="flex h-10 w-full items-center gap-2 px-3 text-left text-sm font-black text-[#f8fafc] hover:bg-surface-card-header"
                      >
                        <Mail className="h-4 w-4 text-emerald-300" />
                        Correo
                      </button>
                    </div>
                  ) : null}
                </div>

                <div className="mt-3 space-y-2">
                  {form.emails.map((email, index) => (
                    <div key={`recipient-email-${index}`} className="flex items-start gap-2">
                      <EmailDomainSuggestionsInput
                        {...noBrowserAutocomplete}
                        className="min-w-0 flex-1"
                        name={`boxario-recipient-email-${index}`}
                        inputClassName={`${clientFormInputClass} pl-10`}
                        placeholder="destinatario@correo.com"
                        value={email}
                        disabled={!hasCountry}
                        onChange={(value) => actions.onUpdateEmail(index, value)}
                        icon={<Mail className="h-4 w-4" />}
                      />
                      <button
                        type="button"
                        title="Quitar correo"
                        aria-label="Quitar correo"
                        disabled={!hasCountry || form.emails.length === 1}
                        tabIndex={hasCountry ? 0 : -1}
                        onClick={() => actions.onRemoveEmail(index)}
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-black bg-[#3A1818] text-rose-100 disabled:cursor-not-allowed disabled:opacity-35"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <label className="mt-3 grid gap-1.5">
                  <span className={clientFormLabelClass}>Telefono</span>
                  <PhoneCountryInput
                    className="min-w-0"
                    name="boxario-recipient-phone"
                    value={form.phone}
                    defaultDialCode={phoneDefaultDialCode}
                    disabled={!hasCountry}
                    inputClassName={`${clientFormInputClass} pl-10`}
                    pickerShellClassName={`${clientFormPickerShellClass} min-w-[6.5rem] w-auto`}
                    onChange={form.setPhone}
                  />
                </label>
              </div>

              {meta.duplicateRecipient ? (
                <div className="rounded-lg border border-amber-600 bg-amber-400 px-3 py-2.5 text-slate-950">
                  <p className="text-xs font-black uppercase text-amber-200">Destinatario duplicado</p>
                  <p className="text-sm font-black text-[#f8fafc]">
                    Ese destinatario ya existe para este cliente.
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <section
          className={`flex min-w-0 flex-col border-t border-white/10 lg:border-l lg:border-t-0 ${hasCountry ? "" : lockedClass}`}
        >
          <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-sky-300 text-slate-950">
              <MapPin className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-black uppercase text-[#f8fafc]">Dónde entregar</p>
              <p className="text-xs font-bold text-slate-400">Dirección postal del destinatario</p>
            </div>
            <span className={`ml-auto rounded-full border px-2.5 py-1 text-[10px] font-black uppercase ${address.validation.status === "valid" ? "border-emerald-400/50 bg-emerald-950/40 text-emerald-200" : "border-slate-600 bg-surface-inset text-slate-400"}`}>
              {exactEntranceDraft ? "Entrada marcada" : hasCountry ? addressCardSubtitle(addressUi.tone) : "Elige país"}
            </span>
            <button type="button" disabled={!hasCountry} onClick={openMapWindow} className="ml-1 inline-flex h-9 items-center gap-2 rounded-md border border-sky-400/50 bg-sky-950/30 px-3 text-xs font-black text-sky-100 hover:border-emerald-300 disabled:opacity-40">
              <MapPin className="h-4 w-4" /> Cliente verifica mapa
            </button>
          </div>
          <div className="space-y-3 p-5">
            {mapPopupError ? <p className="text-xs font-bold text-amber-200">{mapPopupError}</p> : null}
            <label className="grid min-w-0 gap-1.5">
              <span className={clientFormAddressLabelClass(form.street, { enabled: hasCountry })}>
                Calle
              </span>
              <input
                {...noBrowserAutocomplete}
                name="boxario-recipient-line-1"
                className={clientFormAddressFieldClass(form.street, { enabled: hasCountry })}
                placeholder="Calle y numero"
                title={form.street || undefined}
                value={form.street}
                disabled={!hasCountry}
                tabIndex={hasCountry ? 0 : -1}
                onChange={(event) => {
                  touchAddressField(() => form.setStreet(event.target.value));
                }}
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid min-w-0 gap-1.5">
                <span
                  className={clientFormAddressLabelClass(form.house, {
                    required: false,
                    enabled: hasCountry,
                  })}
                >
                  Unidad
                </span>
                <input
                  {...noBrowserAutocomplete}
                  name="boxario-recipient-line-2"
                  className={clientFormAddressFieldClass(form.house, {
                    required: false,
                    enabled: hasCountry,
                  })}
                  placeholder="Apto / suite"
                  title={form.house || undefined}
                  value={form.house}
                  disabled={!hasCountry}
                  tabIndex={hasCountry ? 0 : -1}
                  onChange={(event) => {
                    touchAddressField(() => form.setHouse(event.target.value));
                  }}
                />
              </label>
              <label className="grid min-w-0 gap-1.5">
                <span className={clientFormAddressLabelClass(form.postalCode, { enabled: hasCountry })}>
                  CP
                </span>
                <input
                  {...noBrowserAutocomplete}
                  name="boxario-recipient-zip"
                  className={clientFormAddressFieldClass(form.postalCode, { enabled: hasCountry })}
                  placeholder="Codigo postal"
                  title={form.postalCode || undefined}
                  value={form.postalCode}
                  disabled={!hasCountry}
                  tabIndex={hasCountry ? 0 : -1}
                  onChange={(event) => {
                    touchAddressField(() => form.setPostalCode(event.target.value));
                  }}
                />
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-[minmax(0,1.15fr)_minmax(0,1.15fr)_minmax(5rem,7rem)]">
              <label className="grid min-w-0 gap-1.5">
                <span
                  className={clientFormAddressLabelClass(form.neighborhood, {
                    required: false,
                    enabled: hasCountry,
                  })}
                >
                  Colonia
                </span>
                <input
                  {...noBrowserAutocomplete}
                  name="boxario-recipient-zone"
                  className={clientFormAddressFieldClass(form.neighborhood, {
                    required: false,
                    enabled: hasCountry,
                  })}
                  placeholder="Barrio / colonia"
                  title={form.neighborhood || undefined}
                  value={form.neighborhood}
                  disabled={!hasCountry}
                  tabIndex={hasCountry ? 0 : -1}
                  onChange={(event) => {
                    touchAddressField(() => form.setNeighborhood(event.target.value));
                  }}
                />
              </label>
              <label className="grid min-w-0 gap-1.5">
                <span className={clientFormAddressLabelClass(form.city, { enabled: hasCountry })}>
                  Ciudad
                </span>
                <input
                  {...noBrowserAutocomplete}
                  name="boxario-recipient-city"
                  className={clientFormAddressFieldClass(form.city, { enabled: hasCountry })}
                  placeholder="Ciudad"
                  title={form.city || undefined}
                  value={form.city}
                  disabled={!hasCountry}
                  tabIndex={hasCountry ? 0 : -1}
                  onChange={(event) => {
                    touchAddressField(() => form.setCity(event.target.value));
                  }}
                />
              </label>
              <label className="grid min-w-0 gap-1.5">
                <span className={clientFormAddressLabelClass(form.state, { enabled: hasCountry })}>
                  Estado
                </span>
                <input
                  {...noBrowserAutocomplete}
                  name="boxario-recipient-region"
                  className={clientFormAddressFieldClass(form.state, { enabled: hasCountry })}
                  placeholder="Estado"
                  title={form.state || undefined}
                  value={form.state}
                  disabled={!hasCountry}
                  tabIndex={hasCountry ? 0 : -1}
                  onChange={(event) => {
                    touchAddressField(() => form.setState(event.target.value));
                  }}
                />
              </label>
            </div>

            <SaleAddressGooglePanel
              enabled={hasCountry}
              disabledMessage="Elige el pais del destinatario para habilitar telefono y direccion."
              validation={address.validation}
              searching={address.searching}
              suggestions={address.suggestions}
              unverifiedAccepted={addressUnverifiedAccepted}
              hasRequiredAddress={hasRequiredAddress}
              fullAddress={fullAddress}
              listboxId="recipient-address-suggestions-listbox"
              unverifiedButtonLabel="Direccion sin verificar"
              showUnverifiedOption={!meta.duplicateRecipient}
              onSelectSuggestion={(suggestion) => {
                setAddressUnverifiedAccepted(false);
                void address.onSelectSuggestion(suggestion);
              }}
              onUseUnverified={() => setShowUnverifiedConfirm(true)}
            />

            <label className="grid gap-1.5">
              <span className={clientFormLabelClass}>Referencias</span>
              <textarea
                {...noBrowserAutocomplete}
                name="boxario-recipient-address-reference"
                rows={2}
                className={`${clientFormInputClass} min-h-[4.5rem] resize-y py-2.5`}
                placeholder="Ej. segundo piso, casa roja, porton negro, entre calles..."
                value={form.addressReference ?? ""}
                disabled={!hasCountry}
                tabIndex={hasCountry ? 0 : -1}
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
          personLabel="este destinatario"
          country={form.country}
          addressFields={{
            street: form.street,
            houseNumber: form.house,
            neighborhood: form.neighborhood,
            city: form.city,
            state: form.state,
            postalCode: form.postalCode,
            country: form.country,
          }}
          addressLocation={
            typeof address.validation.lat === "number" && typeof address.validation.lng === "number"
              ? { lat: address.validation.lat, lng: address.validation.lng }
              : null
          }
          initialEntrance={exactEntranceDraft}
          onClose={dismissMapWindow}
          onAddressResolved={useMapAddress}
          onConfirm={(draft) => {
            setExactEntranceDraft(draft);
            dismissMapWindow();
          }}
        />
      ) : null}

      <ActionConfirmDialog
        open={showUnverifiedConfirm}
        dialogId="recipient-unverified-address-confirm"
        title="Direccion sin verificar"
        message="La direccion no fue validada en Google. Puede haber errores de entrega o retrasos en la ruta. ¿Guardar igual?"
        confirmLabel="Aceptar sin verificar"
        cancelLabel="Volver"
        tone="warning"
        onCancel={() => setShowUnverifiedConfirm(false)}
        onConfirm={() => {
          setAddressUnverifiedAccepted(true);
          setShowUnverifiedConfirm(false);
        }}
      />
    </>
  );
}
