"use client";

import { Mail, MapPin, Palette } from "lucide-react";
import { type MouseEvent } from "react";
import type { SalePersonCardVariantId } from "@/components/sale/sale-person-card-variants";
import {
  flowPersonCardGridClass,
  flowPersonRowListFrameClass,
  flowPersonRowListInnerClass,
  flowPersonRowListSlotClass,
} from "@/components/flow-form-styles";
import {
  SalePersonCard,
  SalePersonRow,
  salePersonCardEmptyClass,
  salePersonRowEmptyClass,
} from "@/components/sale/sale-person-card";
import { SalePersonExcelTable } from "@/components/sale/sale-person-excel-table";
import {
  personFullName,
  type Recipient,
  recipientIdentityKey,
} from "@/components/sale/venta-parts";
import type { ViewLayout } from "@/lib/view-layout";

type SaleRecipientListProps = {
  recipients: Recipient[];
  viewLayout: ViewLayout;
  suggestedRecipientId?: string;
  searchActive?: boolean;
  getCardClass: (recipient: Recipient) => string;
  onChoose: (recipient: Recipient) => void;
  onAddressClick?: (recipient: Recipient) => void;
  onViewShipmentHistory?: (recipient: Recipient) => void;
  onOpenContextMenu: (event: MouseEvent<HTMLElement>, recipient: Recipient) => void;
  onIconClick?: (event: MouseEvent<HTMLButtonElement>, recipient: Recipient) => void;
};

function recipientContextProps(recipient: Recipient) {
  return {
    "data-sale-context-key": `recipient:${recipientIdentityKey(recipient)}`,
    "data-sale-context-type": "destinatario",
    "data-sale-context-title": personFullName(recipient),
    "data-sale-context-first-name": recipient.firstName,
    "data-sale-context-last-name": recipient.lastName,
    "data-sale-context-phones": recipient.phone,
    "data-sale-context-street": recipient.street,
    "data-sale-context-house": recipient.houseNumber,
    "data-sale-context-neighborhood": recipient.neighborhood,
    "data-sale-context-city": recipient.city,
    "data-sale-context-state": recipient.state,
    "data-sale-context-postal-code": recipient.postalCode,
    "data-sale-context-address-reference": recipient.addressReference,
    "data-sale-context-country": recipient.country,
    "data-sale-context-recipient-id": recipient.id.startsWith("local-r-")
      ? undefined
      : recipient.id,
  };
}

export function SaleRecipientList({
  recipients,
  viewLayout,
  suggestedRecipientId,
  searchActive = false,
  getCardClass,
  onChoose,
  onAddressClick,
  onViewShipmentHistory,
  onOpenContextMenu,
  onIconClick,
}: SaleRecipientListProps) {
  const showSearchEmpty = searchActive && recipients.length === 0;
  const showNoRecipients = !searchActive && recipients.length === 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {viewLayout === "excel" ? (
        <SalePersonExcelTable
          rows={recipients}
          caption="Destinatarios en vista Excel"
          emptyLabel={showSearchEmpty ? "Sin resultados para esa búsqueda" : "Este remitente no tiene destinatarios registrados"}
          getRowKey={recipientIdentityKey}
          getRowLabel={personFullName}
          getRowMeta={(recipient) => ({
            className: getCardClass(recipient),
            contextProps: recipientContextProps(recipient),
            onContextMenu: (event) => onOpenContextMenu(event, recipient),
          })}
          onChoose={onChoose}
          columns={[
            {
              label: "Destinatario",
              className: "min-w-[13rem]",
              render: (recipient) => <span className="font-black text-white">{personFullName(recipient)}</span>,
            },
            {
              label: "Teléfono",
              className: "min-w-[10rem] whitespace-nowrap",
              render: (recipient) => <span className="font-bold text-slate-300">{recipient.phone || "Sin teléfono"}</span>,
            },
            {
              label: "País",
              className: "min-w-[8rem]",
              render: (recipient) => <span className="font-bold text-slate-300">{recipient.country || "Sin país"}</span>,
            },
            {
              label: "Correo",
              className: "min-w-[14rem]",
              render: (recipient) => <span className="inline-flex items-center gap-1.5 font-bold text-slate-300"><Mail className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />{recipient.email || recipient.emails[0] || "Sin correo"}</span>,
            },
            {
              label: "Dirección",
              className: "min-w-[20rem]",
              render: (recipient) => {
                const label = [recipient.street, recipient.houseNumber, recipient.neighborhood, recipient.city, recipient.state, recipient.postalCode].filter(Boolean).join(", ") || "Sin dirección";
                return onAddressClick && label !== "Sin dirección" ? (
                  <button
                    type="button"
                    className="inline-flex items-start gap-1.5 text-left font-bold text-sky-200 underline decoration-dotted underline-offset-2 hover:text-sky-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
                    title="Mostrar dirección en el mapa"
                    onClick={(event) => {
                      event.stopPropagation();
                      onAddressClick(recipient);
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
              label: "Actividad",
              className: "min-w-[9rem]",
              render: (recipient) => {
                const isSuggested = Boolean(suggestedRecipientId) && recipient.id === suggestedRecipientId;
                return isSuggested && onViewShipmentHistory ? (
                  <button
                    type="button"
                    className="font-black text-amber-200 underline decoration-dotted underline-offset-2"
                    title="Ver historial del último envío"
                    onClick={(event) => {
                      event.stopPropagation();
                      onViewShipmentHistory(recipient);
                    }}
                  >
                    Último envío
                  </button>
                ) : <span className="font-bold text-slate-500">—</span>;
              },
            },
          ]}
          actions={(recipient) => onIconClick && !recipient.id.startsWith("local-r-") ? (
            <button
              type="button"
              className="inline-flex h-8 items-center gap-1 rounded-md border border-black bg-surface-inset px-2 text-[11px] font-black text-slate-200 hover:bg-surface-card-hover"
              title="Cambiar estilo de tarjeta"
              aria-label={`Cambiar estilo de tarjeta de ${personFullName(recipient)}`}
              onClick={(event) => onIconClick(event, recipient)}
            >
              <Palette className="h-3.5 w-3.5" aria-hidden />
              Estilo
            </button>
          ) : null}
        />
      ) : viewLayout === "rows" ? (
        <div className={flowPersonRowListSlotClass}>
          <div className={flowPersonRowListFrameClass}>
            {recipients.length ? (
              <div className={flowPersonRowListInnerClass}>
                {recipients.map((recipient) => {
                  const isSuggested =
                    Boolean(suggestedRecipientId) && recipient.id === suggestedRecipientId;

                  return (
                    <SalePersonRow
                      key={recipientIdentityKey(recipient)}
                      name={personFullName(recipient)}
                      phone={recipient.phone}
                      address={{
                        street: recipient.street,
                        houseNumber: recipient.houseNumber,
                        neighborhood: recipient.neighborhood,
                        city: recipient.city,
                        state: recipient.state,
                        postalCode: recipient.postalCode,
                      }}
                      country={recipient.country}
                      cardStyle={recipient.cardStyle as SalePersonCardVariantId}
                      hint={isSuggested ? "Último envío" : undefined}
                      hintHighlighted={isSuggested}
                      onHintClick={
                        isSuggested && onViewShipmentHistory
                          ? () => onViewShipmentHistory(recipient)
                          : undefined
                      }
                      onAddressClick={onAddressClick ? () => onAddressClick(recipient) : undefined}
                      className={getCardClass(recipient)}
                      contextProps={recipientContextProps(recipient)}
                      onClick={() => onChoose(recipient)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          onChoose(recipient);
                        }
                      }}
                      onContextMenu={(event) => onOpenContextMenu(event, recipient)}
                      onIconClick={
                        onIconClick && !recipient.id.startsWith("local-r-")
                          ? (event) => onIconClick(event, recipient)
                          : undefined
                      }
                    />
                  );
                })}
              </div>
            ) : showSearchEmpty ? (
              <div className={`${salePersonRowEmptyClass} flex min-h-0 flex-1 items-center justify-center`}>
                Sin resultados para esa búsqueda
              </div>
            ) : showNoRecipients ? (
              <div className={flowPersonRowListInnerClass}>
                <div className={`${salePersonRowEmptyClass} flex min-h-[8rem] items-center justify-center`}>
                  Este remitente no tiene destinatarios registrados
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        <div className={flowPersonRowListSlotClass}>
          <div className={flowPersonCardGridClass}>
            {recipients.map((recipient) => {
              const isSuggested =
                Boolean(suggestedRecipientId) && recipient.id === suggestedRecipientId;

              return (
                <SalePersonCard
                  key={recipientIdentityKey(recipient)}
                  pageSurfaceTint
                  name={personFullName(recipient)}
                  phone={recipient.phone}
                  address={{
                    street: recipient.street,
                    houseNumber: recipient.houseNumber,
                    neighborhood: recipient.neighborhood,
                    city: recipient.city,
                    state: recipient.state,
                    postalCode: recipient.postalCode,
                  }}
                  country={recipient.country}
                  cardStyle={recipient.cardStyle as SalePersonCardVariantId}
                  hint={isSuggested ? "Último envío" : undefined}
                  hintHighlighted={isSuggested}
                  onHintClick={
                    isSuggested && onViewShipmentHistory
                      ? () => onViewShipmentHistory(recipient)
                      : undefined
                  }
                  onAddressClick={onAddressClick ? () => onAddressClick(recipient) : undefined}
                  className={getCardClass(recipient)}
                  contextProps={recipientContextProps(recipient)}
                  onClick={() => onChoose(recipient)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onChoose(recipient);
                    }
                  }}
                  onContextMenu={(event) => onOpenContextMenu(event, recipient)}
                  onIconClick={
                    onIconClick && !recipient.id.startsWith("local-r-")
                      ? (event) => onIconClick(event, recipient)
                      : undefined
                  }
                />
              );
            })}

            {showSearchEmpty ? (
              <div className={salePersonCardEmptyClass}>Sin resultados para esa búsqueda</div>
            ) : null}

            {showNoRecipients ? (
              <div className={salePersonCardEmptyClass}>
                Este remitente no tiene destinatarios registrados
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
