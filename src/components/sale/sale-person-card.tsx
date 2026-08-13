"use client";

import { ChevronLeft, ChevronRight, MapPin, Package, Phone, User } from "lucide-react";
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
}: {
  address: SalePersonAddress;
  variant: ReturnType<typeof resolveSalePersonCardVariant>;
  neutral?: boolean;
}) {
  const lines = salePersonAddressLines(address);
  const summary = lines.join(", ");

  if (!lines.length) {
    return (
      <div
        className={`w-full px-3 py-3 ${
          neutral ? "text-slate-600" : variant.addressEmpty
        }`}
      >
        <p className="text-sm font-bold text-current">Sin dirección registrada</p>
      </div>
    );
  }

  return (
    <div
      className={`w-full flex-1 px-3 py-3 ${
        neutral ? "text-slate-400" : variant.addressBlock
      }`}
      title={summary}
    >
      <div className="flex h-full flex-col items-center justify-center gap-1.5">
        <MapPin
          className={`h-4 w-4 shrink-0 ${neutral ? "text-slate-500" : variant.mapPin}`}
          aria-hidden
        />
        {lines.map((line, index) => (
          <p
            key={`${line}-${index}`}
            className={`line-clamp-2 w-full text-sm font-bold leading-snug ${
              neutral ? "text-slate-400" : variant.addressText
            }`}
          >
            {line}
          </p>
        ))}
      </div>
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
      className={`group flex h-full min-h-[12.5rem] w-full min-w-0 touch-manipulation cursor-pointer flex-col items-center p-4 text-center focus-visible:outline-none ${shellClass}${className ? ` ${className}` : ""}`}
    >
      <div className="flex min-h-0 w-full flex-1 flex-col items-center gap-2.5">
        {onIconClick ? (
          <button
            type="button"
            title={iconTitle}
            aria-label={iconTitle}
            onClick={(event) => {
              event.stopPropagation();
              onIconClick(event);
            }}
            className={`flex h-11 w-11 touch-manipulation shrink-0 items-center justify-center text-slate-950 transition hover:scale-105 active:scale-95 ${variant.iconWell}`}
          >
            <User className="h-5 w-5" />
          </button>
        ) : (
          <span
            className={`flex h-11 w-11 shrink-0 items-center justify-center text-slate-950 ${variant.iconWell}`}
          >
            <User className="h-5 w-5" />
          </span>
        )}
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs font-black leading-none ${
            pageSurfaceTint ? "rounded-md bg-black/25 text-slate-300" : variant.countryBadge
          }`}
        >
          <Flag country={country} />
          {country}
        </span>
        <p
          className={`line-clamp-2 w-full text-lg font-black leading-snug ${
            pageSurfaceTint ? "text-[#f8fafc]" : variant.name
          }`}
        >
          {name}
        </p>
        <p
          className={`flex w-full items-center justify-center gap-1.5 text-sm font-bold ${
            pageSurfaceTint ? "text-slate-400" : variant.phone
          }`}
        >
          <Phone className="h-4 w-4 shrink-0" />
          <span className="min-w-0 break-words sm:truncate">{phone}</span>
        </p>

        <SalePersonAddressBlock
          address={address}
          variant={variant}
          neutral={pageSurfaceTint}
        />

        <div className="flex min-h-[1.125rem] w-full items-center justify-center">
          {hint ? (
            <span>
              <SalePersonHintControl
                hint={hint}
                highlighted={hintHighlighted}
                onClick={onHintClick}
                className={
                  hintHighlighted
                    ? variant.hintHighlighted
                    : variant.hint
                }
              />
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-2.5 flex min-h-7 w-full shrink-0 items-center justify-center">
        {onQuickSale ? (
          <button
            type="button"
            title={quickSaleLabel}
            aria-label={quickSaleLabel}
            onClick={(event) => {
              event.stopPropagation();
              onQuickSale();
            }}
            className={`inline-flex h-7 touch-manipulation items-center justify-center gap-1 rounded-md px-2.5 text-[11px] font-black text-slate-950 transition active:scale-[0.98] ${variant.quickSale}`}
          >
            <Package className="h-3.5 w-3.5 shrink-0" strokeWidth={2.25} />
            Venta rápida
          </button>
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
      className={`${listRowBaseClass} touch-manipulation cursor-pointer px-3 py-2.5 sm:px-4 sm:py-3 ${variant.focusRing} ${listRowHoverClass}${className ? ` ${className}` : ""}`}
      data-sale-person-row
    >
      <div className="grid w-full min-w-0 grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-x-2.5 overflow-hidden sm:gap-x-3">
        {onIconClick ? (
          <button
            type="button"
            title={iconTitle}
            aria-label={iconTitle}
            onClick={(event) => {
              event.stopPropagation();
              onIconClick(event);
            }}
            className={`flex h-9 w-9 touch-manipulation shrink-0 items-center justify-center text-slate-950 transition hover:scale-105 active:scale-95 ${variant.iconWell}`}
          >
            <User className="h-4 w-4" />
          </button>
        ) : (
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center text-slate-950 ${variant.iconWell}`}
          >
            <User className="h-4 w-4" />
          </span>
        )}

        <div className="min-w-0 py-0.5">
          <p className="flex min-w-0 items-center gap-2">
            <Flag country={country} />
            <span className="min-w-0 break-words text-base font-black leading-tight text-[#f8fafc] sm:truncate">
              {name}
            </span>
          </p>
          <div className="mt-1 flex min-w-0 items-start gap-1.5 text-xs font-bold leading-snug text-slate-500 sm:overflow-hidden">
            <Phone className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="min-w-0 flex-1 break-words text-[11px] sm:truncate sm:text-xs">{phone}</span>
          </div>
          {addressLines.length ? (
            <div
              className="mt-1 flex min-w-0 items-start gap-1.5"
              title={addressSummary}
            >
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden />
              <div className="min-w-0">
                {addressLines.map((line, index) => (
                  <p
                    key={`${line}-${index}`}
                    className={`break-words text-xs font-bold leading-snug sm:truncate ${
                      index === 0 ? "text-slate-300" : "text-slate-500"
                    }`}
                  >
                    {line}
                  </p>
                ))}
              </div>
            </div>
          ) : (
            <p className="mt-1 break-words text-xs font-bold leading-snug text-slate-600 sm:truncate">
              Sin dirección
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2">
          {hint ? (
            <SalePersonHintControl
              hint={hint}
              highlighted={hintHighlighted}
              onClick={onHintClick}
              badge
            />
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
              className={`inline-flex h-9 touch-manipulation items-center justify-center gap-1.5 rounded-lg border px-3 text-xs font-black text-slate-950 transition active:scale-[0.98] sm:h-10 sm:px-3.5 sm:text-sm ${variant.quickSale}`}
            >
              <Package className="h-4 w-4 shrink-0" strokeWidth={2.25} />
              <span>Rápido</span>
            </button>
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
