"use client";

import { Package } from "lucide-react";
import { useEffect, useRef, type MouseEvent } from "react";
import {
  flowPersonRowListFrameClass,
  flowPersonRowListInnerClass,
} from "@/components/flow-form-styles";
import { listRowBaseClass, listRowHoverClass } from "@/components/ui-blocks";
import { SaleBoxCartQtyBadge } from "@/components/sale/venta-parts";
import { StockBadge } from "@/components/stock-badge";
import {
  lookupSaleBoxStock,
  saleBoxStockLevel,
  saleBoxStockTitle,
  type SaleBoxStockSnapshot,
} from "@/lib/sale/box-stock";
import type { ViewLayout } from "@/lib/view-layout";

const saleBoxCardGridClass =
  "grid w-full gap-3 grid-cols-[repeat(auto-fit,minmax(min(100%,18rem),1fr))]";

type SaleBoxPickerProps = {
  boxes: string[][];
  viewLayout: ViewLayout;
  boxStockByKey?: Record<string, SaleBoxStockSnapshot>;
  getCartQuantity: (box: string[]) => number | null;
  getPromoCount: (box: string[]) => number;
  getCardClass: (box: string[], selected: boolean) => string;
  onChoose: (box: string[]) => void;
  onRemove: (box: string[]) => void;
  firstBoxCoachTarget?: string;
};

function boxStockSnapshot(
  box: string[],
  boxStockByKey?: Record<string, SaleBoxStockSnapshot>,
) {
  return lookupSaleBoxStock(box[0] || "", boxStockByKey);
}

function boxInteractionProps(
  box: string[],
  stock: SaleBoxStockSnapshot,
  onChoose: (box: string[]) => void,
  onRemove: (box: string[]) => void,
) {
  const stockHint = saleBoxStockTitle(stock);

  return {
    type: "button" as const,
    disabled: stock.available <= 0,
    "aria-disabled": stock.available <= 0,
    onClick: () => onChoose(box),
    onMouseDown: (event: MouseEvent<HTMLElement>) => {
      // Evita que el clic deje el foco (y el caret parpadeante) en la fila.
      // El teclado sigue pudiendo enfocar con Tab.
      if (event.button === 0) {
        event.preventDefault();
      }
    },
    onContextMenu: (event: MouseEvent<HTMLElement>) => {
      event.preventDefault();
      event.stopPropagation();
      onRemove(box);
    },
    onMouseUp: (event: MouseEvent<HTMLElement>) => {
      if (event.button === 2) {
        event.preventDefault();
        event.stopPropagation();
      }
    },
    title: `${box[0]}: ${stockHint}. Clic izquierdo agrega, clic derecho quita`,
  };
}

function boxAvailabilityClass(stock: SaleBoxStockSnapshot) {
  return stock.available <= 0
    ? "cursor-not-allowed opacity-55 grayscale hover:translate-y-0 hover:bg-[#3f4b46]"
    : "";
}

function SaleBoxStockBadge({ stock }: { stock: SaleBoxStockSnapshot }) {
  if (stock.available <= 0) {
    return null;
  }

  return (
    <StockBadge
      value={stock.available}
      level={saleBoxStockLevel(stock)}
      title={saleBoxStockTitle(stock)}
    />
  );
}

function SaleBoxNoStockLabel({ stock }: { stock: SaleBoxStockSnapshot }) {
  if (stock.available > 0) {
    return null;
  }

  return (
    <span
      className="shrink-0 text-[10px] font-black uppercase tracking-[0.04em] text-rose-300"
      title={saleBoxStockTitle(stock)}
      aria-label={saleBoxStockTitle(stock)}
    >
      Sin stock
    </span>
  );
}

function SaleBoxCard({
  box,
  stock,
  cartQuantity,
  promoCount,
  className,
  coachTarget,
  onChoose,
  onRemove,
}: {
  box: string[];
  stock: SaleBoxStockSnapshot;
  cartQuantity: number | null;
  promoCount: number;
  className: string;
  coachTarget?: string;
  onChoose: (box: string[]) => void;
  onRemove: (box: string[]) => void;
}) {
  return (
    <button
      {...boxInteractionProps(box, stock, onChoose, onRemove)}
      data-onboarding-target={coachTarget}
      className={`group flex w-full select-none flex-col gap-3 rounded-xl border border-black bg-[#3f4b46] p-4 text-center shadow-[0_8px_18px_rgba(0,0,0,0.26)] transition hover:-translate-y-0.5 hover:bg-[#46544e] ${boxAvailabilityClass(stock)} ${className}`}
    >
      <div className="flex min-w-0 flex-col items-center gap-2">
        <div className="relative">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-400 text-slate-950 shadow-[0_8px_14px_rgba(16,185,129,0.2)]">
            <Package className="h-5 w-5" />
          </div>
          <span className="absolute -right-2 -top-2">
            <SaleBoxStockBadge stock={stock} />
          </span>
        </div>
        <SaleBoxNoStockLabel stock={stock} />
        <p className="text-lg font-black leading-tight text-[#f8fafc]">{box[0]}</p>
      </div>

      <div className="w-full border-y border-white/10 py-2 text-xs font-black text-slate-300">
        <span className="block truncate rounded-md bg-[#202926] px-2 py-1.5">
          {box[4] || "Tiempo de entrega —"}
        </span>
      </div>

      <div className="w-full rounded-lg border border-black/70 bg-[#202926] px-3 py-2">
        <p className="text-[10px] font-black uppercase text-slate-400">Cobra</p>
        <p className="text-lg font-black">{box[1]}</p>
        {promoCount > 0 ? (
          <p className="mt-1 text-[10px] font-black uppercase text-emerald-300">
            {promoCount} promo
          </p>
        ) : null}
        <div className="mt-1 flex h-8 items-center justify-center">
          {cartQuantity ? <SaleBoxCartQtyBadge quantity={cartQuantity} /> : null}
        </div>
      </div>
    </button>
  );
}

function SaleBoxRow({
  box,
  stock,
  cartQuantity,
  promoCount,
  className,
  coachTarget,
  onChoose,
  onRemove,
}: {
  box: string[];
  stock: SaleBoxStockSnapshot;
  cartQuantity: number | null;
  promoCount: number;
  className: string;
  coachTarget?: string;
  onChoose: (box: string[]) => void;
  onRemove: (box: string[]) => void;
}) {
  return (
    <button
      {...boxInteractionProps(box, stock, onChoose, onRemove)}
      data-onboarding-target={coachTarget}
      className={`${listRowBaseClass} group relative flex w-full items-center gap-x-3 overflow-hidden px-3 py-3 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.035),0_3px_10px_rgba(0,0,0,0.12)] outline-none select-none hover:border-emerald-950 focus-visible:ring-2 focus-visible:ring-emerald-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#202926] sm:px-4 ${listRowHoverClass} ${boxAvailabilityClass(stock)}${className ? ` ${className}` : ""}`}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-emerald-300/40 bg-emerald-400 text-slate-950 shadow-[0_5px_12px_rgba(16,185,129,0.18)] transition-transform motion-safe:group-hover:scale-105">
        <Package className="h-4 w-4" aria-hidden />
      </span>
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <p className="truncate text-sm font-black leading-tight tracking-[-0.01em] text-[#f8fafc]">
            {box[0]}
          </p>
          <p className="shrink-0 whitespace-nowrap text-sm font-black tabular-nums text-emerald-200">
            {box[1]}
          </p>
          <SaleBoxStockBadge stock={stock} />
          {cartQuantity ? <SaleBoxCartQtyBadge quantity={cartQuantity} /> : null}
        </div>
        <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[11px] font-bold leading-none">
          <span className="truncate text-slate-400">
            {box[4] || "Tiempo de entrega —"}
          </span>
          <SaleBoxNoStockLabel stock={stock} />
          {promoCount > 0 ? (
            <span className="shrink-0 rounded-full bg-emerald-400/10 px-1.5 py-0.5 font-black uppercase text-emerald-300">
              {promoCount} promo
            </span>
          ) : null}
        </div>
      </div>
    </button>
  );
}

export function SaleBoxPicker({
  boxes,
  viewLayout,
  boxStockByKey,
  getCartQuantity,
  getPromoCount,
  getCardClass,
  onChoose,
  onRemove,
  firstBoxCoachTarget,
}: SaleBoxPickerProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const active = document.activeElement;
    if (
      root &&
      active instanceof HTMLElement &&
      root.contains(active) &&
      active.matches("button")
    ) {
      active.blur();
    }
  }, []);

  if (viewLayout === "rows") {
    return (
      <div ref={rootRef} className={flowPersonRowListFrameClass}>
        <div className={flowPersonRowListInnerClass}>
          {boxes.map((box, boxIndex) => {
            const stock = boxStockSnapshot(box, boxStockByKey);

            return (
              <SaleBoxRow
                key={box[0]}
                box={box}
                stock={stock}
                cartQuantity={getCartQuantity(box)}
                promoCount={getPromoCount(box)}
                className={getCardClass(box, Boolean(getCartQuantity(box)))}
                coachTarget={boxIndex === 0 ? firstBoxCoachTarget : undefined}
                onChoose={onChoose}
                onRemove={onRemove}
              />
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div ref={rootRef} className={`${saleBoxCardGridClass} items-start`}>
      {boxes.map((box, boxIndex) => {
        const stock = boxStockSnapshot(box, boxStockByKey);

        return (
          <SaleBoxCard
            key={box[0]}
            box={box}
            stock={stock}
            cartQuantity={getCartQuantity(box)}
            promoCount={getPromoCount(box)}
            className={getCardClass(box, Boolean(getCartQuantity(box)))}
            coachTarget={boxIndex === 0 ? firstBoxCoachTarget : undefined}
            onChoose={onChoose}
            onRemove={onRemove}
          />
        );
      })}
    </div>
  );
}
