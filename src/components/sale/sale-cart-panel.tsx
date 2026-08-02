"use client";

import { ShoppingCart, Trash2, X } from "lucide-react";
import { useLayoutEffect, useState } from "react";
import { PromotionSelector } from "@/components/sale/promotion-selector";
import { inputClass } from "@/components/ui-blocks";
import type { InvoiceBillingSnapshot } from "@/lib/invoice-billing";
import { formatMoneyValue, parseMoneyValue } from "@/lib/logistics-fees";

const CART_PANEL_MAX_WIDTH = 384;

function resolveCartPanelPosition(anchor: DOMRect | null) {
  const width = Math.min(CART_PANEL_MAX_WIDTH, Math.max(240, window.innerWidth - 16));
  const maxLeft = Math.max(8, window.innerWidth - width - 8);

  if (!anchor) {
    return { top: 76, left: maxLeft, width };
  }

  return {
    // Abre justo debajo del botón, alineado a su borde derecho.
    top: Math.min(anchor.bottom + 6, Math.max(8, window.innerHeight - 160)),
    left: Math.min(Math.max(8, anchor.right - width), maxLeft),
    width,
  };
}

type SaleCartLine = {
  id: string;
  label: string;
  unitPrice: string;
  quantity: number;
};

type SaleCartContentsProps = {
  lines: SaleCartLine[];
  billing: InvoiceBillingSnapshot | null;
  selectedPromotionId: string;
  onPromotionChange: (promotionId: string) => void;
  onAdjustQuantity: (lineId: string, delta: number) => void;
  onUpdateQuantity: (lineId: string, rawValue: string) => void;
  onRemoveLine: (lineId: string) => void;
  emptyHint?: string;
};

function lineSubtotal(line: SaleCartLine) {
  return formatMoneyValue(parseMoneyValue(line.unitPrice) * line.quantity);
}

function cartShowsSubtotalBreakdown(billing: InvoiceBillingSnapshot) {
  return (
    parseMoneyValue(billing.promotionDiscount) > 0 ||
    parseMoneyValue(billing.logisticsSubtotal) > 0
  );
}

function CartContents({
  lines,
  billing,
  selectedPromotionId,
  onPromotionChange,
  onAdjustQuantity,
  onUpdateQuantity,
  onRemoveLine,
  emptyHint = "Toca una caja para agregarla al carrito.",
}: SaleCartContentsProps) {
  const itemCount = lines.reduce((sum, line) => sum + line.quantity, 0);

  if (!lines.length) {
    return (
      <div className="rounded-lg border border-dashed border-black/80 bg-surface-inset px-4 py-8 text-center">
        <ShoppingCart className="mx-auto h-8 w-8 text-slate-500" aria-hidden />
        <p className="mt-3 text-sm font-black text-slate-400">Sin productos</p>
        <p className="mt-1 text-xs font-bold text-slate-500">{emptyHint}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      <div className="grid gap-2">
        {lines.map((line) => (
          <div
            key={line.id}
            className="grid gap-2 rounded-lg border border-black bg-surface-panel p-2.5"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-[#f8fafc]">{line.label}</p>
                <p className="text-xs font-bold text-slate-400">{line.unitPrice} c/u</p>
              </div>
              <p className="shrink-0 text-sm font-black tabular-nums text-emerald-300">
                {lineSubtotal(line)}
              </p>
            </div>
            <div className="grid grid-cols-[2.5rem_4rem_2.5rem_2.5rem] items-center gap-1">
              <button
                type="button"
                onClick={() => onAdjustQuantity(line.id, -1)}
                className="flex h-9 items-center justify-center rounded-lg border border-black bg-surface-inset text-lg font-black text-slate-300"
                aria-label={`Restar ${line.label}`}
              >
                -
              </button>
              <input
                className={`${inputClass} h-9 px-1 text-center text-base font-black`}
                value={line.quantity}
                onChange={(event) => onUpdateQuantity(line.id, event.target.value)}
                inputMode="numeric"
                aria-label={`Cantidad ${line.label}`}
              />
              <button
                type="button"
                onClick={() => onAdjustQuantity(line.id, 1)}
                className="flex h-9 items-center justify-center rounded-lg border border-black bg-surface-inset text-lg font-black text-slate-300"
                aria-label={`Agregar ${line.label}`}
              >
                +
              </button>
              <button
                type="button"
                onClick={() => onRemoveLine(line.id)}
                className="flex h-9 items-center justify-center rounded-lg border border-black bg-surface-inset text-slate-400 hover:text-rose-300"
                aria-label={`Quitar ${line.label}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {billing ? (
        <div className="grid gap-2 border-t border-black pt-3 text-sm">
          {cartShowsSubtotalBreakdown(billing) ? (
            <div className="flex items-center justify-between gap-3 font-bold text-slate-300">
              <span>Subtotal ({itemCount})</span>
              <span className="tabular-nums text-[#f8fafc]">
                {billing.boxSubtotalBeforeDiscount}
              </span>
            </div>
          ) : null}
          <PromotionSelector
            candidates={billing.promotionCandidates}
            selectedPromotionId={selectedPromotionId}
            onChange={onPromotionChange}
          />
          {parseMoneyValue(billing.promotionDiscount) > 0 ? (
            <div className="flex items-center justify-between gap-3 font-bold text-emerald-300">
              <span>{billing.promotion?.name || "Promoción"}</span>
              <span className="tabular-nums">-{billing.promotionDiscount}</span>
            </div>
          ) : null}
          {parseMoneyValue(billing.logisticsSubtotal) > 0 ? (
            <div className="flex items-center justify-between gap-3 font-bold text-slate-300">
              <span>Logística</span>
              <span className="tabular-nums text-[#f8fafc]">{billing.logisticsSubtotal}</span>
            </div>
          ) : null}
          <div
            className={`flex items-center justify-between gap-3 font-black text-[#f8fafc] ${
              cartShowsSubtotalBreakdown(billing) ? "border-t border-black/70 pt-2" : ""
            }`}
          >
            <span>{cartShowsSubtotalBreakdown(billing) ? "Total" : `Total (${itemCount})`}</span>
            <span className="tabular-nums">{billing.quotedTotal}</span>
          </div>
        </div>
      ) : null}

    </div>
  );
}

type SaleHeaderCartTriggerProps = {
  itemCount: number;
  total: string | null;
  open: boolean;
  onClick: () => void;
};

export function SaleHeaderCartTrigger({
  itemCount,
  total,
  open,
  onClick,
}: SaleHeaderCartTriggerProps) {
  const label = itemCount
    ? `Carrito, ${itemCount} producto${itemCount === 1 ? "" : "s"}${total ? `, ${total}` : ""}`
    : "Abrir carrito";
  const hasItems = itemCount > 0;

  return (
    <button
      type="button"
      onClick={onClick}
      data-sale-header-cart=""
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-label={label}
      title={label}
      className={`group relative inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60 ${
        open
          ? "border-amber-300 bg-amber-300 text-slate-950 shadow-[0_6px_16px_rgba(251,191,36,0.35)]"
          : hasItems
            ? "border-amber-500/90 bg-gradient-to-b from-amber-300 via-amber-400 to-orange-500 text-slate-950 shadow-[0_6px_18px_rgba(251,146,60,0.45)] ring-1 ring-inset ring-amber-100/40 hover:brightness-110"
            : "border-black bg-surface-inset text-slate-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] hover:bg-surface-card hover:text-slate-200"
      }`}
    >
      <ShoppingCart className="h-4 w-4" strokeWidth={hasItems || open ? 2.5 : 2} aria-hidden />
      {hasItems ? (
        <span className="absolute -right-1.5 -top-1.5 flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full border border-black bg-slate-950 px-1 text-[10px] font-black tabular-nums leading-none text-amber-300 shadow-[0_2px_8px_rgba(0,0,0,0.45)]">
          {itemCount}
        </span>
      ) : null}
    </button>
  );
}

type SaleHeaderCartPanelProps = SaleCartContentsProps & {
  onClose: () => void;
};

export function SaleHeaderCartPanel({
  lines,
  billing,
  selectedPromotionId,
  onPromotionChange,
  onAdjustQuantity,
  onUpdateQuantity,
  onRemoveLine,
  onClose,
  emptyHint,
}: SaleHeaderCartPanelProps) {
  const itemCount = lines.reduce((sum, line) => sum + line.quantity, 0);
  const [position, setPosition] = useState<{ top: number; left: number; width: number } | null>(
    null,
  );

  useLayoutEffect(() => {
    function updatePosition() {
      const anchor = document.querySelector<HTMLElement>("[data-sale-header-cart]");
      setPosition(resolveCartPanelPosition(anchor?.getBoundingClientRect() ?? null));
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[145]" data-sale-header-cart-panel="">
      <button
        type="button"
        className="absolute inset-0 h-full w-full bg-black/45"
        aria-label="Cerrar carrito"
        onClick={onClose}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Carrito de la venta"
        className={`absolute flex max-h-[min(32rem,calc(100dvh-5rem))] flex-col overflow-hidden rounded-xl border border-black bg-[#1a221f] shadow-[0_18px_48px_rgba(0,0,0,0.5)] ring-1 ring-white/[0.04] ${
          position ? "" : "invisible"
        }`}
        style={
          position
            ? { top: position.top, left: position.left, width: position.width }
            : undefined
        }
      >
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-black bg-surface-card-header px-3 py-2.5">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-emerald-800/60 bg-emerald-400/15 text-emerald-300">
              <ShoppingCart className="h-4 w-4" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-black text-slate-100">Carrito</p>
              <p className="text-[10px] font-bold text-slate-400">
                {itemCount
                  ? `${itemCount} producto${itemCount === 1 ? "" : "s"}`
                  : "Vacío"}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {billing && itemCount ? (
              <span className="text-sm font-black tabular-nums text-emerald-300">
                {billing.quotedTotal}
              </span>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-black bg-surface-inset text-slate-300 hover:bg-surface-card"
              aria-label="Cerrar carrito"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          <CartContents
            lines={lines}
            billing={billing}
            selectedPromotionId={selectedPromotionId}
            onPromotionChange={onPromotionChange}
            onAdjustQuantity={onAdjustQuantity}
            onUpdateQuantity={onUpdateQuantity}
            onRemoveLine={onRemoveLine}
            emptyHint={emptyHint}
          />
        </div>
      </section>
    </div>
  );
}
