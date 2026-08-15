"use client";

import { Mail, MapPin, Package, Palette, Search, UserPlus } from "lucide-react";
import { type MouseEvent, useMemo } from "react";
import type { SalePersonCardVariantId } from "@/components/sale/sale-person-card-variants";
import { InlineSearchCombobox } from "@/components/inline-search-picker";
import {
  flowPersonCardGridClass,
  flowPersonListSectionClass,
  flowPersonRowListFrameClass,
  flowPersonRowListInnerClass,
  flowPersonRowListSlotClass,
  flowPersonToolbarSearchShellClass,
} from "@/components/flow-form-styles";
import {
  SalePersonCard,
  SalePersonRow,
  salePersonCardEmptyClass,
  salePersonRowEmptyClass,
} from "@/components/sale/sale-person-card";
import { SalePersonListSortControl } from "@/components/sale/sale-person-list-sort-control";
import { SalePersonListToolbar } from "@/components/sale/sale-person-list-toolbar";
import { SalePersonExcelTable } from "@/components/sale/sale-person-excel-table";
import {
  personFullName,
  type Sender,
  senderPhoneKey,
  senderPhonesLabel,
} from "@/components/sale/venta-parts";
import type { ViewLayout } from "@/lib/view-layout";
import { ONBOARDING_TARGETS } from "@/lib/onboarding/coach-targets";
import {
  SALE_SENDER_SORT_OPTIONS,
  type SalePersonSortMode,
} from "@/lib/sale-person-list-sort";

type SaleSenderListProps = {
  query: string;
  matchingSenders: Sender[];
  senders: Sender[];
  totalCount?: number;
  searchActive?: boolean;
  viewLayout: ViewLayout;
  sortMode: SalePersonSortMode;
  onSortModeChange: (mode: SalePersonSortMode) => void;
  onQueryChange: (value: string) => void;
  onNewClient: () => void;
  onChoose: (sender: Sender) => void;
  onAddressClick?: (sender: Sender) => void;
  onQuickEmptyBox: (sender: Sender) => void;
  getCardClass: (sender: Sender) => string;
  onOpenContextMenu: (event: MouseEvent<HTMLElement>, sender: Sender) => void;
  onIconClick?: (event: MouseEvent<HTMLButtonElement>, sender: Sender) => void;
};

function senderContextProps(sender: Sender) {
  return {
    "data-sale-context-key": `sender:${senderPhoneKey(sender)}`,
    "data-sale-context-type": "remitente",
    "data-sale-context-title": personFullName(sender),
    "data-sale-context-first-name": sender.firstName,
    "data-sale-context-last-name": sender.lastName,
    "data-sale-context-phones": sender.phones.join("|"),
    "data-sale-context-street": sender.street,
    "data-sale-context-house": sender.houseNumber,
    "data-sale-context-neighborhood": sender.neighborhood,
    "data-sale-context-city": sender.city,
    "data-sale-context-state": sender.state,
    "data-sale-context-postal-code": sender.postalCode,
    "data-sale-context-address-reference": sender.addressReference,
    "data-sale-context-country": "USA",
    "data-sale-context-customer-id": sender.id.startsWith("local-") ? undefined : sender.id,
  };
}

export function SaleSenderList({
  query,
  matchingSenders,
  senders,
  viewLayout,
  sortMode,
  onSortModeChange,
  onQueryChange,
  onNewClient,
  onChoose,
  onAddressClick,
  onQuickEmptyBox,
  getCardClass,
  onOpenContextMenu,
  onIconClick,
}: SaleSenderListProps) {
  const senderSearchOptions = useMemo(
    () =>
      matchingSenders.map((sender) => ({
        value: senderPhoneKey(sender),
        label: personFullName(sender),
        searchText: [
          personFullName(sender),
          sender.firstName,
          sender.lastName,
          ...sender.emails,
          ...sender.phones,
          sender.street,
          sender.city,
        ]
          .filter(Boolean)
          .join(" "),
      })),
    [matchingSenders],
  );

  return (
    <div className={flowPersonListSectionClass}>
      <SalePersonListToolbar
        onCreate={onNewClient}
        createIcon={<UserPlus className="h-4 w-4" />}
        createLabel="Nuevo remitente"
        createShortLabel="Nuevo"
        createOnboardingTarget={ONBOARDING_TARGETS.VENTA_NEW_SENDER}
        sortControl={
          <SalePersonListSortControl
            value={sortMode === "country" ? "recent" : sortMode}
            options={SALE_SENDER_SORT_OPTIONS}
            onChange={onSortModeChange}
            ariaLabel="Ordenar remitentes"
          />
        }
        search={
          <InlineSearchCombobox
            value={query}
            onChange={onQueryChange}
            options={senderSearchOptions}
            placeholder="Buscar"
            emptyLabel="Sin remitentes"
            ariaLabel="Buscar remitentes"
            leadingIcon={<Search className="h-4 w-4" aria-hidden />}
            className="w-full"
            minWidthClass="min-w-0 w-full"
            persistent
            shellClassName={flowPersonToolbarSearchShellClass}
            onSelectOption={(option) => {
              const sender = matchingSenders.find(
                (entry) => senderPhoneKey(entry) === option.value,
              );
              if (sender) {
                onQueryChange(personFullName(sender));
                onChoose(sender);
              }
            }}
          />
        }
      />

      {viewLayout === "excel" ? (
        <SalePersonExcelTable
          rows={senders}
          caption="Remitentes en vista Excel"
          emptyLabel={senders.length === 0 ? "Sin remitentes" : "Sin resultados"}
          getRowKey={(sender) => sender.id}
          getRowLabel={(sender) => personFullName(sender)}
          getRowMeta={(sender) => ({
            className: getCardClass(sender),
            contextProps: senderContextProps(sender),
            onContextMenu: (event) => onOpenContextMenu(event, sender),
          })}
          onChoose={onChoose}
          columns={[
            {
              label: "Remitente",
              className: "min-w-[13rem]",
              render: (sender) => <span className="font-black text-white">{personFullName(sender)}</span>,
            },
            {
              label: "Teléfono",
              className: "min-w-[10rem]",
              render: (sender) => <span className="font-bold text-slate-300">{senderPhonesLabel(sender) || "Sin teléfono"}</span>,
            },
            {
              label: "Correo",
              className: "min-w-[14rem]",
              render: (sender) => <span className="inline-flex items-center gap-1.5 font-bold text-slate-300"><Mail className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />{sender.email || sender.emails[0] || "Sin correo"}</span>,
            },
            {
              label: "Dirección",
              className: "min-w-[20rem]",
              render: (sender) => {
                const label = [sender.street, sender.houseNumber, sender.neighborhood, sender.city, sender.state, sender.postalCode].filter(Boolean).join(", ") || "Sin dirección";
                return onAddressClick && label !== "Sin dirección" ? (
                  <button
                    type="button"
                    className="inline-flex items-start gap-1.5 text-left font-bold text-sky-200 underline decoration-dotted underline-offset-2 hover:text-sky-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
                    title="Mostrar dirección en el mapa"
                    onClick={(event) => {
                      event.stopPropagation();
                      onAddressClick(sender);
                    }}
                  >
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                    <span>{label}</span>
                  </button>
                ) : (
                  <span className="inline-flex items-start gap-1.5 font-bold text-slate-300"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden /><span>{label}</span></span>
                );
              },
            },
            {
              label: "Destinatarios",
              className: "min-w-[8rem] whitespace-nowrap",
              render: (sender) => <span className="font-black text-slate-200">{sender.recipients.length}</span>,
            },
          ]}
          actions={(sender) => (
            <>
              {onIconClick && !sender.id.startsWith("local-") ? (
                <button
                  type="button"
                  className="inline-flex h-8 items-center gap-1 rounded-md border border-black bg-surface-inset px-2 text-[11px] font-black text-slate-200 hover:bg-surface-card-hover"
                  title="Cambiar estilo de tarjeta"
                  aria-label={`Cambiar estilo de tarjeta de ${personFullName(sender)}`}
                  onClick={(event) => onIconClick(event, sender)}
                >
                  <Palette className="h-3.5 w-3.5" aria-hidden />
                  Estilo
                </button>
              ) : null}
              <button
                type="button"
                className="inline-flex h-8 w-max min-w-max shrink-0 flex-nowrap items-center gap-0.5 whitespace-nowrap rounded-md border border-emerald-500/70 bg-emerald-400 px-1.5 text-[10px] font-black text-slate-950 hover:brightness-110"
                title={`Venta rápida: ${personFullName(sender)}`}
                aria-label={`Venta rápida: ${personFullName(sender)}`}
                onClick={() => onQuickEmptyBox(sender)}
              >
                <Package className="h-3 w-3" aria-hidden />
                Rápido
              </button>
            </>
          )}
        />
      ) : viewLayout === "rows" ? (
        <div className={flowPersonRowListSlotClass}>
          <div className={flowPersonRowListFrameClass}>
            {senders.length ? (
              <div className={flowPersonRowListInnerClass}>
                {senders.map((sender) => {
                  return (
                    <SalePersonRow
                      key={sender.id}
                      name={personFullName(sender)}
                      phone={senderPhonesLabel(sender)}
                      address={{
                        street: sender.street,
                        houseNumber: sender.houseNumber,
                        neighborhood: sender.neighborhood,
                        city: sender.city,
                        state: sender.state,
                        postalCode: sender.postalCode,
                      }}
                      country="USA"
                      cardStyle={sender.cardStyle as SalePersonCardVariantId}
                      hint={sender.recipients.length === 0 ? "Sin dest." : undefined}
                      className={getCardClass(sender)}
                      contextProps={senderContextProps(sender)}
                      onClick={() => onChoose(sender)}
                      onAddressClick={onAddressClick ? () => onAddressClick(sender) : undefined}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          onChoose(sender);
                        }
                      }}
                      onContextMenu={(event) => onOpenContextMenu(event, sender)}
                      onIconClick={
                        onIconClick && !sender.id.startsWith("local-")
                          ? (event) => onIconClick(event, sender)
                          : undefined
                      }
                      onQuickSale={() => onQuickEmptyBox(sender)}
                      quickSaleLabel={`Venta rápida: ${personFullName(sender)}`}
                    />
                  );
                })}
              </div>
            ) : (
              <div className={`${salePersonRowEmptyClass} flex min-h-0 flex-1 items-center justify-center`}>
                {senders.length === 0 ? "Sin remitentes" : "Sin resultados"}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className={flowPersonRowListSlotClass}>
          <div className={flowPersonCardGridClass}>
            {senders.length ? (
              senders.map((sender) => {
                return (
                  <SalePersonCard
                    key={sender.id}
                    pageSurfaceTint
                    name={personFullName(sender)}
                    phone={senderPhonesLabel(sender)}
                    address={{
                      street: sender.street,
                      houseNumber: sender.houseNumber,
                      neighborhood: sender.neighborhood,
                      city: sender.city,
                      state: sender.state,
                      postalCode: sender.postalCode,
                    }}
                    country="USA"
                    cardStyle={sender.cardStyle as SalePersonCardVariantId}
                    hint={sender.recipients.length === 0 ? "Sin dest." : undefined}
                    className={getCardClass(sender)}
                    contextProps={senderContextProps(sender)}
                    onClick={() => onChoose(sender)}
                    onAddressClick={onAddressClick ? () => onAddressClick(sender) : undefined}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onChoose(sender);
                      }
                    }}
                    onContextMenu={(event) => onOpenContextMenu(event, sender)}
                    onIconClick={
                      onIconClick && !sender.id.startsWith("local-")
                        ? (event) => onIconClick(event, sender)
                        : undefined
                    }
                    onQuickSale={() => onQuickEmptyBox(sender)}
                    quickSaleLabel={`Venta rápida: ${personFullName(sender)}`}
                  />
                );
              })
            ) : (
              <div className={salePersonCardEmptyClass}>
                {senders.length === 0 ? "Sin remitentes" : "Sin resultados"}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
