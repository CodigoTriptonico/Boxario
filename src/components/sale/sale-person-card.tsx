"use client";

import { BookOpen, ChevronLeft, ChevronRight, MapPin, Package, Phone, User } from "lucide-react";
import type { KeyboardEvent, MouseEvent, ReactNode } from "react";
import { listCardShellClass, listRowBaseClass, listRowHoverClass } from "@/components/ui-blocks";
import {
  resolveSalePersonCardVariant,
  type SalePersonCardVariantId,
} from "@/components/sale/sale-person-card-variants";
import {
  Flag,
  type SalePersonAddress,
  salePersonAddressLines,
} from "@/components/sale/venta-parts";

export const salePersonCardEmptyClass =
  "col-span-full flex min-h-[5.25rem] items-center justify-center rounded-xl border border-amber-800/40 bg-[#2f281f] px-4 text-center text-sm font-black text-amber-100";

export const salePersonRowEmptyClass =
  "px-4 py-8 text-center text-sm font-black text-slate-400";

type SalePersonCardProps = {
  name: string;
  phone: string;
  address: SalePersonAddress;
  country: string;
  cardStyle?: SalePersonCardVariantId | string | null;
  pageSurfaceTint?: boolean;
  hint?: string;
  hintHighlighted?: boolean;
  onHintClick?: () => void;
  onAddressClick?: () => void;
  onJournalClick?: () => void;
  onQuickSale?: () => void;
  quickSaleLabel?: string;
  onIconClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  className?: string;
  onClick: () => void;
  onKeyDown?: (event: KeyboardEvent<HTMLElement>) => void;
  onContextMenu?: (event: MouseEvent<HTMLElement>) => void;
  contextProps?: Record<string, string | undefined>;
};

function SalePersonAddressBlock({
  address,
  variant,
  neutral = false,
  onClick,
}: {
  address: SalePersonAddress;
  variant: ReturnType<typeof resolveSalePersonCardVariant>;
  neutral?: boolean;
  onClick?: () => void;
}) {
  const lines = salePersonAddressLines(address);
  const summary = lines.join(", ");

  if (!lines.length) {
    return (
      <div
        className={`w-full rounded-lg px-2.5 py-2 text-xs font-bold ${
          neutral ? "border border-white/5 bg-black/20 text-slate-500" : variant.addressEmpty
        }`}
      >
        <p className="text-current">Sin dirección registrada</p>
      </div>
    );
  }

  const mapButton = onClick ? (
    <button
      type="button"
      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-sky-500/30 bg-sky-950/40 text-sky-300 transition hover:bg-sky-900/60 hover:text-sky-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
      title="Mostrar dirección en el mapa"
      aria-label="Mostrar dirección en el mapa"
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
    >
      <MapPin className="h-3.5 w-3.5" aria-hidden />
    </button>
  ) : (
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-slate-700/40 bg-slate-800/40">
      <MapPin
        className={`h-3.5 w-3.5 shrink-0 ${neutral ? "text-slate-500" : variant.mapPin}`}
        aria-hidden
      />
    </div>
  );

  const content = (
    <div className="min-w-0 flex-1">
      {lines.map((line, index) => (
        <p
          key={`${line}-${index}`}
          className={`break-words text-xs font-bold leading-snug sm:truncate ${
            index === 0
              ? neutral
                ? "text-slate-200"
                : "text-slate-200"
              : neutral
                ? "text-slate-400"
                : variant.addressText
          }`}
        >
          {line}
        </p>
      ))}
    </div>
  );

  return (
    <div
      className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left ${
        neutral ? "border border-white/5 bg-black/25 text-slate-300" : variant.addressBlock
      }`}
      title={summary}
    >
      {mapButton}
      {content}
    </div>
  );
}

export function SalePersonCard({
  name,
  phone,
  address,
  country,
  cardStyle,
  pageSurfaceTint = false,
  hint,
  hintHighlighted = false,
  onHintClick,
  onAddressClick,
  onJournalClick,
  onQuickSale,
  quickSaleLabel = "Venta rápida",
  onIconClick,
  className,
  onClick,
  onKeyDown,
  onContextMenu,
  contextProps,
}: SalePersonCardProps) {
  const variant = resolveSalePersonCardVariant(cardStyle);
  const iconTitle = onIconClick ? "Cambiar estilo de tarjeta" : undefined;
  const shellClass = pageSurfaceTint
    ? `${listCardShellClass} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70`
    : `${variant.focusRing} ${variant.card}`;

  return (
    <div
      role="button"
      tabIndex={0}
      {...contextProps}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.target === event.currentTarget) {
          onKeyDown?.(event);
        }
      }}
      onContextMenu={onContextMenu}
      className={`group flex w-full min-w-0 max-w-sm touch-manipulation cursor-pointer flex-col justify-between rounded-xl p-3.5 text-left focus-visible:outline-none transition hover:scale-[1.01] ${shellClass}${className ? ` ${className}` : ""}`}
    >
      <div className="flex w-full min-w-0 flex-col gap-2.5">
        <div className="flex w-full min-w-0 items-start justify-between gap-2.5">
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            {onIconClick ? (
              <button
                type="button"
                title={iconTitle}
                aria-label={iconTitle}
                onClick={(event) => {
                  event.stopPropagation();
                  onIconClick(event);
                }}
                className={`flex h-10 w-10 touch-manipulation shrink-0 items-center justify-center rounded-lg border transition hover:scale-105 active:scale-95 shadow-sm ${variant.iconWell}`}
              >
                <User className="h-5 w-5" />
              </button>
            ) : (
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border shadow-sm ${variant.iconWell}`}
              >
                <User className="h-5 w-5" />
              </span>
            )}

            <div className="min-w-0 flex-1">
              <p className="flex min-w-0 items-center gap-1.5">
                <Flag country={country} />
                <span
                  className={`truncate text-sm font-black leading-tight ${
                    pageSurfaceTint ? "text-[#f8fafc]" : variant.name
                  }`}
                >
                  {name}
                </span>
              </p>
              <p
                className={`mt-0.5 flex min-w-0 items-center gap-1 text-xs font-bold ${
                  pageSurfaceTint ? "text-slate-400" : variant.phone
                }`}
              >
                <Phone className="h-3 w-3 shrink-0 text-slate-500" />
                <span className="truncate">{phone || "Sin teléfono"}</span>
              </p>
            </div>
          </div>

          {onQuickSale ? (
            <button
              type="button"
              title={quickSaleLabel}
              aria-label={quickSaleLabel}
              onClick={(event) => {
                event.stopPropagation();
                onQuickSale();
              }}
              className={`inline-flex h-7 w-max min-w-max shrink-0 touch-manipulation flex-nowrap items-center justify-center gap-1 whitespace-nowrap rounded-md border px-2 text-[10px] font-black text-slate-950 transition active:scale-[0.98] hover:brightness-110 shadow-sm ${variant.quickSale}`}
            >
              <Package className="h-3 w-3 shrink-0" strokeWidth={2.25} />
              <span>Rápido</span>
            </button>
          ) : null}
        </div>

        <SalePersonAddressBlock
          address={address}
          variant={variant}
          neutral={pageSurfaceTint}
          onClick={onAddressClick}
        />
      </div>

      <div className="mt-2.5 flex w-full flex-wrap items-center justify-between gap-1.5 border-t border-white/5 pt-2">
        <div className="flex items-center gap-1.5">
          {onJournalClick ? (
            <button
              type="button"
              title={`Bitácora de ${name}`}
              aria-label={`Bitácora de ${name}`}
              onClick={(event) => {
                event.stopPropagation();
                onJournalClick();
              }}
              className="inline-flex h-7 items-center gap-1 rounded-md border border-emerald-500/40 bg-emerald-950/40 px-2 text-[11px] font-bold text-emerald-300 hover:border-emerald-500/70 hover:bg-emerald-900/50 hover:text-emerald-200 transition-all active:scale-95 shadow-sm"
            >
              <BookOpen className="h-3 w-3 text-emerald-400" />
            </button>
          ) : null}
        </div>

        {hint ? (
          <SalePersonHintControl
            hint={hint}
            highlighted={hintHighlighted}
            onClick={onHintClick}
            badge
            className={
              hintHighlighted
                ? variant.hintHighlighted
                : variant.hint
            }
          />
        ) : null}
      </div>
    </div>
  );
}

type SalePersonRowProps = {
  name: string;
  phone: string;
  address: SalePersonAddress;
  country: string;
  cardStyle?: SalePersonCardVariantId | string | null;
  hint?: string;
  hintHighlighted?: boolean;
  onHintClick?: () => void;
  onAddressClick?: () => void;
  onJournalClick?: () => void;
  onQuickSale?: () => void;
  quickSaleLabel?: string;
  onIconClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  className?: string;
  onClick: () => void;
  onKeyDown?: (event: KeyboardEvent<HTMLElement>) => void;
  onContextMenu?: (event: MouseEvent<HTMLElement>) => void;
  contextProps?: Record<string, string | undefined>;
};

export function SalePersonRow({
  name,
  phone,
  address,
  country,
  cardStyle,
  hint,
  hintHighlighted = false,
  onHintClick,
  onAddressClick,
  onJournalClick,
  onQuickSale,
  quickSaleLabel = "Venta rápida",
  onIconClick,
  className,
  onClick,
  onKeyDown,
  onContextMenu,
  contextProps,
}: SalePersonRowProps) {
  const variant = resolveSalePersonCardVariant(cardStyle);
  const addressLines = salePersonAddressLines(address);
  const addressSummary = addressLines.join(", ");
  const iconTitle = onIconClick ? "Cambiar estilo de tarjeta" : undefined;

  const streetPart = [address.street?.trim(), address.houseNumber?.trim()].filter(Boolean).join(" ");
  const neighborhoodPart = address.neighborhood?.trim();
  const addressPrimary = [streetPart, neighborhoodPart].filter(Boolean).join(" · ");
  const addressSecondary = [
    address.city?.trim(),
    [address.state?.trim(), address.postalCode?.trim()].filter(Boolean).join(" "),
  ].filter(Boolean).join(", ");

  return (
    <article
      role="button"
      tabIndex={0}
      {...contextProps}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.target === event.currentTarget) {
          onKeyDown?.(event);
        }
      }}
      onContextMenu={onContextMenu}
      className={`${listRowBaseClass} touch-manipulation cursor-pointer px-3 py-2 sm:px-4 sm:py-2.5 ${variant.focusRing} ${listRowHoverClass}${className ? ` ${className}` : ""}`}
      data-sale-person-row
    >
      <div className="grid w-full min-w-0 grid-cols-[2.5rem_minmax(0,1fr)] items-center gap-x-3 sm:grid-cols-[2.5rem_minmax(0,1fr)_auto] sm:gap-x-4">
        <div className="flex min-w-0 shrink-0 items-center justify-center">
            {onIconClick ? (
              <button
                type="button"
                title={iconTitle}
                aria-label={iconTitle}
                onClick={(event) => {
                  event.stopPropagation();
                  onIconClick(event);
                }}
                className={`flex h-9 w-9 touch-manipulation shrink-0 items-center justify-center rounded-lg border transition hover:scale-105 active:scale-95 shadow-sm ${variant.iconWell}`}
              >
                <User className="h-4 w-4" />
              </button>
            ) : (
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border shadow-sm ${variant.iconWell}`}
              >
                <User className="h-4 w-4" />
              </span>
            )}
          </div>

          <div className="grid min-w-0 flex-1 grid-cols-1 items-center gap-2 py-0.5 md:grid-cols-[minmax(12rem,18rem)_minmax(0,1fr)] md:gap-4 lg:grid-cols-[minmax(14rem,20rem)_minmax(0,1fr)]">
            <div className="min-w-0">
              <p className="flex min-w-0 items-center gap-2">
                <Flag country={country} />
                <span className="min-w-0 truncate text-base font-black leading-tight text-[#f8fafc]">
                  {name}
                </span>
              </p>
              <div className="mt-1 flex min-w-0 items-center gap-1.5 text-xs font-bold leading-snug text-slate-400 sm:overflow-hidden">
                <Phone className="h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden />
                <span className="min-w-0 flex-1 text-[11px] [overflow-wrap:anywhere] sm:truncate sm:text-xs">
                  {phone || "Sin teléfono"}
                </span>
              </div>
            </div>

            {addressLines.length ? (
              onAddressClick ? (
                <div
                  className="flex min-w-0 items-center gap-2 text-left md:border-l md:border-white/10 md:pl-4"
                  title={addressSummary}
                >
                  <button
                    type="button"
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-sky-500/30 bg-sky-950/40 text-sky-300 transition hover:border-sky-400/60 hover:bg-sky-900/60 hover:text-sky-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
                    title="Mostrar dirección en el mapa"
                    aria-label="Mostrar dirección en el mapa"
                    onClick={(event) => {
                      event.stopPropagation();
                      onAddressClick();
                    }}
                  >
                    <MapPin className="h-4 w-4" aria-hidden />
                  </button>
                  <div className="min-w-0 flex-1">
                    {addressLines.map((line, index) => (
                      <p
                        key={`${line}-${index}`}
                        className={`break-words sm:truncate text-xs font-bold leading-snug ${
                          index === 0 ? "text-slate-200" : "text-slate-400"
                        }`}
                      >
                        {line}
                      </p>
                    ))}
                  </div>
                </div>
              ) : (
                <div
                  className="flex min-w-0 items-center gap-2 md:border-l md:border-white/10 md:pl-4"
                  title={addressSummary}
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-700/50 bg-slate-800/40">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    {addressLines.map((line, index) => (
                      <p
                        key={`${line}-${index}`}
                        className={`break-words sm:truncate text-xs font-bold leading-snug ${
                          index === 0 ? "text-slate-200" : "text-slate-400"
                        }`}
                      >
                        {line}
                      </p>
                    ))}
                  </div>
                </div>
              )
            ) : (
              <div className="flex min-w-0 items-center gap-2 text-slate-500 md:border-l md:border-white/10 md:pl-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-800 bg-slate-900/40">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden />
                </div>
                <p className="break-words text-xs font-bold leading-snug text-slate-500 sm:truncate">
                  Sin dirección registrada
                </p>
              </div>
            )}
          </div>

        <div className="col-span-2 flex min-w-0 w-full flex-wrap items-center justify-end gap-2 sm:col-span-1 sm:w-auto sm:shrink-0">
          {onJournalClick ? (
            <button
              type="button"
              title={`Bitácora de ${name}`}
              aria-label={`Bitácora de ${name}`}
              onClick={(event) => {
                event.stopPropagation();
                onJournalClick();
              }}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-950/40 px-2.5 text-xs font-bold text-emerald-300 hover:border-emerald-500/70 hover:bg-emerald-900/50 hover:text-emerald-200 transition-all active:scale-95 shadow-sm"
            >
              <BookOpen className="h-3.5 w-3.5 text-emerald-400" />
            </button>
          ) : null}
          {onQuickSale ? (
            <button
              type="button"
              title={quickSaleLabel}
              aria-label={quickSaleLabel}
              onClick={(event) => {
                event.stopPropagation();
                onQuickSale();
              }}
              className={`inline-flex h-8 w-max min-w-max shrink-0 touch-manipulation flex-nowrap items-center justify-center gap-1 whitespace-nowrap rounded-lg border px-2.5 text-xs font-black text-slate-950 transition active:scale-[0.98] hover:brightness-110 shadow-sm ${variant.quickSale}`}
            >
              <Package className="h-3.5 w-3.5 shrink-0" strokeWidth={2.25} />
              <span>Rápido</span>
            </button>
          ) : null}
          {hint ? (
            <SalePersonHintControl
              hint={hint}
              highlighted={hintHighlighted}
              onClick={onHintClick}
              badge
            />
          ) : null}
        </div>
      </div>
    </article>
  );
}

function SalePersonHintControl({
  hint,
  highlighted = false,
  onClick,
  badge = false,
  className = "",
}: {
  hint: string;
  highlighted?: boolean;
  onClick?: () => void;
  badge?: boolean;
  className?: string;
}) {
  if (badge) {
    if (onClick) {
      return (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onClick();
          }}
          className={`inline-flex h-8 touch-manipulation items-center rounded-md border px-2 text-[11px] font-black transition hover:brightness-110 sm:h-9 sm:px-2.5 sm:text-xs ${
            highlighted
              ? "border-amber-600/40 bg-amber-400/15 text-amber-200"
              : "border-amber-950/50 bg-amber-400/10 text-amber-200"
          }`}
          title={`Ver historial: ${hint}`}
          aria-label={`Ver historial: ${hint}`}
        >
          {hint}
        </button>
      );
    }

    return (
      <SalePersonStatBadge highlighted={highlighted}>{hint}</SalePersonStatBadge>
    );
  }

  if (onClick) {
    return (
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onClick();
        }}
        className={`touch-manipulation text-xs font-black uppercase tracking-wide underline decoration-dotted underline-offset-2 transition ${className}`}
        title={`Ver historial: ${hint}`}
        aria-label={`Ver historial: ${hint}`}
      >
        {hint}
      </button>
    );
  }

  return (
    <p className={`text-xs font-black uppercase tracking-wide ${className}`}>{hint}</p>
  );
}

function SalePersonStatBadge({
  children,
  highlighted = false,
}: {
  children: ReactNode;
  highlighted?: boolean;
}) {
  return (
    <span
      className={`inline-flex h-8 items-center rounded-md border px-2 text-[11px] font-black sm:h-9 sm:px-2.5 sm:text-xs ${
        highlighted
          ? "border-amber-600/40 bg-amber-400/15 text-amber-200"
          : "border-amber-950/50 bg-amber-400/10 text-amber-200"
      }`}
    >
      {children}
    </span>
  );
}

type SalePersonPagerProps = {
  page: number;
  pageCount: number;
  onPrev: () => void;
  onNext: () => void;
  prevLabel?: string;
  nextLabel?: string;
};

export function SalePersonPager({
  page,
  pageCount,
  onPrev,
  onNext,
  prevLabel = "Anterior",
  nextLabel = "Siguiente",
}: SalePersonPagerProps) {
  if (pageCount <= 1) {
    return null;
  }

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={onPrev}
        disabled={page === 0}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-black bg-surface-inset text-[#f8fafc] transition hover:bg-surface-card disabled:cursor-not-allowed disabled:opacity-40"
        aria-label={prevLabel}
        title={prevLabel}
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <span className="min-w-[2.75rem] px-1 text-center text-xs font-black text-slate-300">
        {page + 1}/{pageCount}
      </span>
      <button
        type="button"
        onClick={onNext}
        disabled={page >= pageCount - 1}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-black bg-surface-inset text-[#f8fafc] transition hover:bg-surface-card disabled:cursor-not-allowed disabled:opacity-40"
        aria-label={nextLabel}
        title={nextLabel}
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
