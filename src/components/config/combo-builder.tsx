"use client";

import { Plus, Trash2 } from "lucide-react";
import { InlineSearchPicker } from "@/components/inline-search-picker";
import { inputClass } from "@/components/ui-blocks";
import {
  describeComboRule,
  type ComboBenefitKind,
} from "@/lib/combo-rules";
import { formatMoneyValue, moneyInputDisplayValue } from "@/lib/logistics-fees";
import {
  AddLineButton,
  compactPickerShellClass,
  helperTextClass,
  iconButtonDangerClass,
  IntentPills,
  productPickerClass,
  productPickerMinWidth,
  productPickerShellClass,
  productRowClass,
  QtyInput,
  RepeatPills,
  RowActions,
  StepSection,
  summaryTextClass,
  targetOptions,
} from "@/components/config/combo-builder/controls";
import { productPickerOptions } from "@/components/config/combo-builder/helpers";
import type { ComboBuilderProps } from "@/components/config/combo-builder/types";
import { useComboBuilder } from "@/components/config/combo-builder/use-combo-builder";

export type { ComboBuilderProduct } from "@/components/config/combo-builder/types";

export function ComboBuilder({ rule, onChange, products }: ComboBuilderProps) {
  const {
    labels,
    intent,
    primaryGetLine,
    singleBuyDiscount,
    fixedPriceNeedsUnitTotalChoice,
    discountStyleOptions,
    buyFromDiscountOptions,
    catalogDiscountOptions,
    discountTargetMode,
    setDiscountTargetMode,
    discountStyle,
    discountHelperText,
    bundleBreakdown,
    discountBreakdown,
    hasBuyLines,
    hasBuyProducts,
    bundleEligible,
    buyGiftShortcuts,
    commit,
    selectIntent,
    addFirstBuyLine,
    updateBuyLine,
    addBuyLine,
    removeBuyLine,
    updateGetLine,
    setDiscountStyle,
    setGiftFromBuy,
    addExtraGiftLine,
    removeGetLine,
  } = useComboBuilder({ rule, onChange, products });

  if (!products.length) {
    return (
      <div className="rounded-xl border border-dashed border-amber-600/40 bg-amber-950/20 px-4 py-3 text-center text-sm font-black text-amber-200">
        Sin productos en este país
      </div>
    );
  }

  return (
    <div className="grid gap-3 lg:grid-cols-2 lg:items-start">
      <div className="grid gap-2">
        <StepSection step={1} label="Elegir">
          {hasBuyLines ? (
            <div className="grid gap-2">
              {rule.buy.map((line, index) => (
                <div key={line.id} className={productRowClass}>
                  <QtyInput
                    value={line.quantity}
                    onChange={(quantity) => updateBuyLine(line.id, { quantity })}
                    ariaLabel={`Cantidad producto ${index + 1}`}
                  />
                  <InlineSearchPicker
                    options={productPickerOptions(
                      products,
                      rule.buy.map((entry) => entry.catalogKey),
                      line.catalogKey,
                    )}
                    value={line.catalogKey}
                    onChange={(value) => updateBuyLine(line.id, { catalogKey: value })}
                    placeholder="Producto"
                    searchPlaceholder="Buscar…"
                    emptyLabel="Sin productos"
                    minWidthClass={productPickerMinWidth}
                    className={productPickerClass}
                    shellClassName={productPickerShellClass}
                    formatSelectedLabel={(option, placeholder) => option?.label || placeholder}
                  />
                  <RowActions>
                    <button
                      type="button"
                      onClick={() => removeBuyLine(line.id)}
                      className={iconButtonDangerClass}
                      aria-label={`Quitar producto ${index + 1}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </RowActions>
                </div>
              ))}
              <AddLineButton onClick={addBuyLine} label="Agregar producto" />

              {intent === "bundle_price" && bundleBreakdown?.lines.length ? (
                <div className="grid gap-2 rounded-lg border border-black bg-surface-card p-2.5">
                  <div className="flex items-center justify-between gap-3 text-sm font-black text-slate-300">
                    <span>Suma normal</span>
                    <span className="tabular-nums text-[#f8fafc]">
                      {formatMoneyValue(bundleBreakdown.normalTotal)}
                    </span>
                  </div>
                  <label className="flex items-center justify-between gap-3 border-t border-black pt-2 text-xs font-black text-slate-300">
                    Precio paquete
                    <span className="flex items-center gap-1">
                      <span className="text-sm font-black text-slate-300">$</span>
                      <input
                        className={`${inputClass} h-10 w-28 px-2 text-center tabular-nums`}
                        inputMode="decimal"
                        value={moneyInputDisplayValue(rule.bundlePrice || "$0")}
                        onChange={(event) =>
                          commit({
                            ...rule,
                            bundlePrice: event.target.value
                              ? `$${event.target.value.replace(/[^\d.]/g, "")}`
                              : "$0",
                          })
                        }
                        aria-label="Precio total del paquete"
                      />
                    </span>
                  </label>
                  {bundleBreakdown.promoTotal > 0 &&
                  bundleBreakdown.normalTotal > 0 &&
                  bundleBreakdown.savings > 0 ? (
                    <div className="flex items-center justify-between gap-3 border-t border-black pt-2 text-sm font-bold text-emerald-300">
                      <span>Ahorro</span>
                      <span className="tabular-nums">
                        {formatMoneyValue(bundleBreakdown.savings)}
                      </span>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : (
            <button
              type="button"
              onClick={addFirstBuyLine}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-emerald-600/40 bg-surface-inset text-sm font-black text-emerald-300 transition hover:border-emerald-500 hover:bg-surface-card-hover"
            >
              <Plus className="h-4 w-4" />
              Agregar producto
            </button>
          )}
        </StepSection>

        <StepSection step={2} label="Acción">
          {hasBuyProducts ? (
            <>
              <IntentPills
                value={intent}
                onChange={selectIntent}
                bundleEligible={bundleEligible}
              />

              {intent === "discount" && primaryGetLine ? (
                <div className="mt-3 grid gap-2.5 border-t border-black pt-3">
                  {!singleBuyDiscount ? (
                    <div className="grid gap-2">
                      {discountTargetMode === "buy" ? (
                        <label className="grid gap-1.5">
                          <span className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                            Descuento en producto de la compra
                          </span>
                          <InlineSearchPicker
                            options={buyFromDiscountOptions}
                            value={primaryGetLine.catalogKey}
                            onChange={(value) =>
                              updateGetLine(primaryGetLine.id, { catalogKey: value })
                            }
                            placeholder="Elige un producto del paso 1"
                            searchPlaceholder="Buscar…"
                            emptyLabel="Sin productos"
                            minWidthClass={productPickerMinWidth}
                            className={productPickerClass}
                            shellClassName={productPickerShellClass}
                            formatSelectedLabel={(option, placeholder) =>
                              option?.label || placeholder
                            }
                          />
                        </label>
                      ) : (
                        <label className="grid gap-1.5">
                          <span className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                            Descuento en otro producto
                          </span>
                          <InlineSearchPicker
                            options={catalogDiscountOptions}
                            value={primaryGetLine.catalogKey}
                            onChange={(value) =>
                              updateGetLine(primaryGetLine.id, { catalogKey: value })
                            }
                            placeholder="Elige del catálogo"
                            searchPlaceholder="Buscar…"
                            emptyLabel="Sin productos"
                            minWidthClass={productPickerMinWidth}
                            className={productPickerClass}
                            shellClassName={productPickerShellClass}
                            formatSelectedLabel={(option, placeholder) =>
                              option?.label || placeholder
                            }
                          />
                        </label>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          const nextMode = discountTargetMode === "buy" ? "other" : "buy";
                          setDiscountTargetMode(nextMode);
                          updateGetLine(primaryGetLine.id, { catalogKey: "" });
                        }}
                        className="text-left text-xs font-black text-emerald-300 transition hover:text-emerald-200"
                      >
                        {discountTargetMode === "buy"
                          ? "Descontar otro producto del catálogo"
                          : "Usar un producto de la compra"}
                      </button>
                    </div>
                  ) : null}

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="inline-flex shrink-0 rounded-lg border border-black bg-surface-inset p-0.5">
                      {discountStyleOptions.map((option) => {
                        const active =
                          option.value === "percent"
                            ? discountStyle === "percent"
                            : fixedPriceNeedsUnitTotalChoice
                              ? discountStyle === option.value
                              : discountStyle === "unit_price" || discountStyle === "set_total";

                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => setDiscountStyle(option.value)}
                            className={`h-9 rounded-md px-2.5 text-xs font-black transition sm:px-3 ${
                              active
                                ? "bg-emerald-400 text-slate-950"
                                : "text-slate-300 hover:text-[#f8fafc]"
                            }`}
                          >
                            {option.label}
                          </button>
                        );
                      })}
                    </div>

                    {discountStyle === "percent" ? (
                      <label className="flex items-center gap-1">
                        <input
                          className={`${inputClass} h-10 w-16 px-2 text-center tabular-nums`}
                          inputMode="decimal"
                          value={primaryGetLine.percent ?? 0}
                          onChange={(event) =>
                            updateGetLine(primaryGetLine.id, {
                              kind: "percent_off" as ComboBenefitKind,
                              percent: Math.min(
                                Math.max(Number(event.target.value) || 0, 0),
                                100,
                              ),
                            })
                          }
                          aria-label="Porcentaje"
                        />
                        <span className="text-sm font-black text-slate-300">%</span>
                      </label>
                    ) : (
                      <label className="flex items-center gap-1">
                        <span className="text-sm font-black text-slate-300">$</span>
                        <input
                          className={`${inputClass} h-10 w-24 px-2 text-center tabular-nums`}
                          inputMode="decimal"
                          placeholder="0"
                          value={moneyInputDisplayValue(primaryGetLine.amount || "$0")}
                          onChange={(event) =>
                            updateGetLine(primaryGetLine.id, {
                              kind:
                                discountStyle === "set_total"
                                  ? "set_total"
                                  : "fixed_unit_price",
                              amount: event.target.value
                                ? `$${event.target.value.replace(/[^\d.]/g, "")}`
                                : "",
                            })
                          }
                          aria-label="Monto"
                        />
                      </label>
                    )}

                    <InlineSearchPicker
                      options={targetOptions}
                      value={primaryGetLine.target}
                      onChange={(value) =>
                        updateGetLine(primaryGetLine.id, {
                          target: value === "next_unit" ? "next_unit" : "same_purchase",
                        })
                      }
                      placeholder="Cuándo"
                      searchPlaceholder="Buscar…"
                      emptyLabel="Sin opciones"
                      minWidthClass="min-w-[9rem]"
                      className="min-w-[9rem] flex-1"
                      shellClassName={`${compactPickerShellClass} min-w-[9rem] flex-1`}
                      formatSelectedLabel={(option, placeholder) => option?.label || placeholder}
                    />
                  </div>

                  {discountHelperText ? (
                    <p className={helperTextClass}>{discountHelperText}</p>
                  ) : null}

                  {discountBreakdown &&
                  (discountBreakdown.kind === "next_unit"
                    ? discountBreakdown.rewardUnitPrice > 0
                    : discountBreakdown.unitPrice > 0) ? (
                    <div className="grid gap-1.5 rounded-lg border border-black bg-surface-inset p-2.5 text-sm">
                      {discountBreakdown.kind === "next_unit" ? (
                        <>
                          {discountBreakdown.buyRows.map((row) => (
                            <div
                              key={row.id}
                              className="flex items-center justify-between gap-3 font-bold text-slate-300"
                            >
                              <span className="min-w-0 truncate">
                                {row.quantity}× {row.label}
                                <span className="ml-1 text-[10px] font-black uppercase tracking-wide text-slate-500">
                                  condición
                                </span>
                              </span>
                              <span className="shrink-0 tabular-nums text-[#f8fafc]">
                                {formatMoneyValue(row.subtotal)}
                              </span>
                            </div>
                          ))}
                          <div className="flex items-center justify-between gap-3 font-bold text-slate-300">
                            <span className="min-w-0 truncate">
                              {discountBreakdown.rewardQty}× {discountBreakdown.rewardLabel}
                              <span className="ml-1 text-[10px] font-black uppercase tracking-wide text-slate-500">
                                siguiente
                              </span>
                            </span>
                            <span className="flex shrink-0 items-center gap-2 tabular-nums">
                              {discountBreakdown.rewardPromo < discountBreakdown.rewardNormal ? (
                                <span className="text-slate-500 line-through">
                                  {formatMoneyValue(discountBreakdown.rewardNormal)}
                                </span>
                              ) : null}
                              <span className="text-[#f8fafc]">
                                {formatMoneyValue(discountBreakdown.rewardPromo)}
                              </span>
                            </span>
                          </div>
                        </>
                      ) : (
                        <div className="flex items-center justify-between gap-3 font-bold text-slate-300">
                          <span className="min-w-0 truncate">
                            {singleBuyDiscount
                              ? "En la compra"
                              : `${discountBreakdown.qty}× ${discountBreakdown.label}`}
                          </span>
                          <span className="shrink-0 tabular-nums text-[#f8fafc]">
                            {formatMoneyValue(discountBreakdown.normalTotal)}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center justify-between gap-3 border-t border-black pt-2 font-black text-[#f8fafc]">
                        <span>Cliente paga</span>
                        <span className="tabular-nums">
                          {formatMoneyValue(discountBreakdown.promoTotal)}
                        </span>
                      </div>
                      {discountBreakdown.savings > 0 && discountStyle === "percent" ? (
                        <div className="flex items-center justify-between gap-3 font-bold text-emerald-300">
                          <span>Descuento</span>
                          <span className="tabular-nums">
                            {formatMoneyValue(discountBreakdown.savings)}
                            <span className="text-slate-400">
                              {" "}
                              ({discountBreakdown.savingsPercent}%)
                            </span>
                          </span>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </>
          ) : (
            <p className={helperTextClass}>Agrega productos arriba</p>
          )}
        </StepSection>

        {hasBuyProducts && intent ? (
          <StepSection label="Por venta">
            <RepeatPills
              value={rule.repeat}
              onChange={(repeat) => commit({ ...rule, repeat })}
            />
          </StepSection>
        ) : null}
      </div>

      <div className="grid gap-2">
        {hasBuyProducts && intent === "free_gift" ? (
          <StepSection step={3} label="Recibe">
            <div className="grid gap-2.5">
              {buyGiftShortcuts.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {buyGiftShortcuts.map((item) => {
                    const active = primaryGetLine?.catalogKey === item.catalogKey;

                    return (
                      <button
                        key={item.catalogKey}
                        type="button"
                        onClick={() => setGiftFromBuy(item.catalogKey)}
                        className={`h-9 rounded-lg border px-3 text-xs font-black transition ${
                          active
                            ? "border-emerald-500/50 bg-emerald-400/15 text-emerald-200"
                            : "border-black bg-surface-inset text-slate-200 hover:bg-surface-card-hover"
                        }`}
                      >
                        {item.label} gratis
                      </button>
                    );
                  })}
                </div>
              ) : null}

              {rule.get.map((line, index) => (
                <div key={line.id} className={productRowClass}>
                  <QtyInput
                    value={line.quantity}
                    onChange={(quantity) => updateGetLine(line.id, { quantity })}
                    ariaLabel={`Cantidad regalo ${index + 1}`}
                  />
                  <InlineSearchPicker
                    options={productPickerOptions(
                      products,
                      rule.get.map((entry) => entry.catalogKey),
                      line.catalogKey,
                      { includeAny: false },
                    )}
                    value={line.catalogKey}
                    onChange={(value) =>
                      updateGetLine(line.id, {
                        catalogKey: value,
                        kind: "percent_off",
                        percent: 100,
                        amount: "",
                      })
                    }
                    placeholder="Elige el regalo"
                    searchPlaceholder="Buscar…"
                    emptyLabel="Sin productos"
                    minWidthClass={productPickerMinWidth}
                    className={productPickerClass}
                    shellClassName={productPickerShellClass}
                    formatSelectedLabel={(option, placeholder) => option?.label || placeholder}
                  />
                  <RowActions>
                    {rule.get.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => removeGetLine(line.id)}
                        className={iconButtonDangerClass}
                        aria-label={`Quitar regalo ${index + 1}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    ) : null}
                  </RowActions>
                </div>
              ))}
              <AddLineButton onClick={addExtraGiftLine} label="Agregar otro regalo" />
            </div>
          </StepSection>
        ) : null}

        {hasBuyProducts && intent ? (
          <p className={summaryTextClass}>{describeComboRule(rule, labels)}</p>
        ) : null}
      </div>
    </div>
  );
}
