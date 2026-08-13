import { Check } from "lucide-react";
import { Fragment } from "react";
import { flowStepBarPaddingClass, flowStepBarShellClass } from "@/components/flow-form-styles";
import type { SaleLogisticsDetailRow, SaleStep } from "@/components/sale/venta/parts-types";
import { Flag } from "@/components/sale/venta/parts-person";

export const saleSteps: { id: SaleStep; label: string; compactLabel: string; }[] = [
  { id: "client", label: "Remitente", compactLabel: "Remite" },
  { id: "recipient", label: "Destinatario", compactLabel: "Destino" },
  { id: "box", label: "Caja", compactLabel: "Caja" },
  { id: "delivery", label: "Logística", compactLabel: "Logística" },
  { id: "finish", label: "Final", compactLabel: "Final" },
];

export function saleStepCompactLabel(stepId: SaleStep) {
  return saleSteps.find((step) => step.id === stepId)?.compactLabel ?? stepId;
}

export type SaleStepBarItem = {
  id: SaleStep;
  label: string;
  compactLabel: string;
  value: string;
  subtitle?: string;
  detail?: string;
  detailRows?: SaleLogisticsDetailRow[];
  country?: string;
  isActive: boolean;
  isDone: boolean;
  isUnlocked: boolean;
  index: number;
};

function saleStepBarButtonClass(item: SaleStepBarItem) {
  if (item.isActive) {
    return "border-2 border-emerald-600 bg-emerald-600/35 text-emerald-50 shadow-[0_10px_24px_rgba(16,185,129,0.22)] ring-1 ring-emerald-400/45 max-sm:border-x-0 max-sm:border-t-0 max-sm:border-b-2 max-sm:border-b-emerald-400 max-sm:bg-transparent max-sm:shadow-none max-sm:ring-0";
  }

  if (item.isDone) {
    return "border-emerald-800/80 bg-[#1c2822] text-[#f8fafc] hover:border-emerald-700 hover:bg-[#223028] max-sm:border-0 max-sm:bg-transparent max-sm:shadow-none";
  }

  if (item.isUnlocked) {
    return "border-black bg-surface-card text-slate-300 hover:border-black hover:bg-surface-card-hover max-sm:border-0 max-sm:bg-transparent max-sm:shadow-none";
  }

  return "cursor-not-allowed border-black/80 bg-surface-inset text-slate-600 max-sm:border-0 max-sm:bg-transparent max-sm:shadow-none";
}

function saleStepBarBadgeClass(item: SaleStepBarItem) {
  if (item.isActive || item.isDone) {
    return "border-emerald-300 bg-emerald-400 text-slate-950";
  }

  if (item.isUnlocked) {
    return "border-sky-700/80 bg-sky-300 text-slate-950";
  }

  return "border-black bg-surface-card text-slate-500";
}

function saleStepTileInner(step: SaleStepBarItem, options?: { hideDetail?: boolean; }) {
  const hasVisibleDetail = Boolean(
    (step.detail || step.detailRows?.length) && (step.isActive || step.isDone),
  );

  return (
    <div
      className={`flex flex-col items-center justify-center gap-0.5 lg:gap-1 ${options?.hideDetail
          ? "min-h-[2.75rem] sm:min-h-[4.5rem] lg:min-h-[4.75rem]"
          : "min-h-[2.75rem] sm:min-h-[5.35rem] lg:min-h-[5.6rem]"
        }`}
    >
      <div className="flex min-h-[1.5rem] min-w-0 flex-col items-center justify-center gap-0.5 sm:min-h-[2rem] sm:flex-row sm:gap-1.5 lg:min-h-[2.125rem]">
        <span
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 text-[9px] font-black sm:h-7 sm:w-7 sm:text-[11px] lg:h-8 lg:w-8 lg:text-xs ${saleStepBarBadgeClass(
            step,
          )}`}
        >
          {step.isDone ? (
            <Check className="h-3 w-3 sm:h-3.5 sm:w-3.5 lg:h-4 lg:w-4" />
          ) : (
            step.index + 1
          )}
        </span>
        <span
          className={`w-full min-w-0 max-w-full break-words text-center text-[10px] font-black uppercase leading-snug tracking-normal sm:truncate sm:text-[11px] sm:tracking-wide lg:text-xs ${step.isActive ? "text-emerald-200" : ""
            }`}
        >
          <span className="sm:hidden">{step.compactLabel}</span>
          <span className="hidden sm:inline">{step.label}</span>
        </span>
      </div>
      <span
        className={`max-sm:hidden hidden min-h-[1rem] w-full min-w-0 max-w-full items-center justify-center sm:min-h-[1.25rem] lg:flex ${step.isActive ? "text-emerald-100" : "text-slate-400"
          }`}
      >
        <span
          className={`w-full min-w-0 max-w-full break-words text-center leading-snug sm:truncate ${step.id === "box"
              ? "text-[11px] font-black sm:text-xs"
              : "text-[11px] font-black sm:text-[11px] lg:text-xs"
            }`}
        >
          {step.value}
        </span>
      </span>
      <span
        className={`hidden min-h-[1rem] w-full min-w-0 max-w-full items-center justify-center gap-1.5 sm:min-h-[1.25rem] lg:flex ${step.country || step.subtitle
            ? step.isActive
              ? "text-emerald-100"
              : "text-slate-400"
            : "invisible"
          }`}
        aria-hidden={!step.country && !step.subtitle}
      >
        {step.country ? (
          <span className="hidden sm:contents">
            <Flag country={step.country} />
          </span>
        ) : null}
        <span className="min-w-0 max-w-full break-words text-center text-[11px] font-black leading-snug sm:truncate sm:text-[11px] lg:text-xs">
          {step.country || step.subtitle || "\u00a0"}
        </span>
      </span>
      {options?.hideDetail ? null : (
        <span
          className={`hidden min-h-[1.25rem] w-full min-w-0 max-w-full items-center justify-center overflow-hidden px-1 text-center leading-tight sm:min-h-[1.25rem] lg:flex ${hasVisibleDetail
              ? step.id === "box"
                ? step.isActive
                  ? "text-sm font-black text-emerald-300 sm:text-base"
                  : "text-sm font-black text-emerald-400"
                : step.isActive
                  ? "text-[11px] font-black tracking-tight text-emerald-100"
                  : "text-[11px] font-black tracking-tight text-slate-200"
              : "invisible"
            }`}
          aria-hidden={!hasVisibleDetail}
        >
          {step.detailRows?.length ? (
            <span className="grid w-full gap-0.5">
              {step.detailRows.map((row) => (
                <span
                  key={row.label}
                  className="grid min-w-0 grid-cols-[3.9rem_minmax(0,1fr)] items-start gap-1 border-t border-black/35 pt-0.5 text-left first:border-t-0 first:pt-0"
                >
                  <span className="truncate text-[8px] font-black uppercase tracking-wide text-emerald-300">
                    {row.label}
                  </span>
                  <span className="line-clamp-2 min-w-0 break-words text-[10px] font-bold leading-[1.1] text-slate-100">
                    {row.value}
                  </span>
                </span>
              ))}
            </span>
          ) : (
            <span className="line-clamp-2 max-w-full break-words">{step.detail || "\u00a0"}</span>
          )}
        </span>
      )}
    </div>
  );
}

function saleStepArrow() {
  return (
    <div className="hidden h-3 items-start justify-center lg:flex" aria-hidden>
      <span className="flex flex-col items-center">
        <span className="h-0 w-0 border-x-[7px] border-t-[8px] border-x-transparent border-t-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.65)]" />
        <span className="mt-0.5 h-0.5 w-10 rounded-full bg-emerald-400/90" />
      </span>
    </div>
  );
}

export type SaleStepPopoverSlot = {
  open: boolean;
  trigger: React.ReactNode;
  content: React.ReactNode;
};

export function SaleStepBar({
  steps,
  onOpenStep,
  trailingSlot,
  stepPopovers,
}: {
  steps: SaleStepBarItem[];
  onOpenStep: (step: SaleStep) => void;
  trailingSlot?: React.ReactNode;
  stepPopovers?: Partial<Record<SaleStep, SaleStepPopoverSlot>>;
}) {
  const hasOpenStepPopover = steps.some(
    (step) => step.isActive && stepPopovers?.[step.id]?.open,
  );

  return (
    <nav aria-label="Pasos de venta" className="w-full">
      <div
        className={`${flowStepBarShellClass} ${flowStepBarPaddingClass} ${hasOpenStepPopover
            ? "overflow-visible pb-1 lg:pb-[min(40vh,17rem)]"
            : "pb-1"
          }`}
      >
        <div className="flex items-start gap-2">
          <div
            className={`min-w-0 flex-1 ${hasOpenStepPopover
                ? "overflow-visible"
                : "overflow-x-hidden lg:snap-x lg:snap-mandatory lg:overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              }`}
          >
            <ol className="grid w-full grid-cols-5 items-start gap-0 lg:flex lg:min-w-0">
              {steps.map((step, index) => {
                const connectorDone =
                  index > 0 && (steps[index - 1]?.isDone || steps[index - 1]?.isActive);

                return (
                  <Fragment key={step.id}>
                    {index > 0 ? (
                      <div
                        aria-hidden
                        className="hidden lg:mt-[2.125rem] lg:flex lg:w-2 lg:shrink-0 lg:items-center"
                      >
                        <span
                          className={`block h-0.5 w-full rounded-full ${connectorDone ? "bg-emerald-500/75" : "bg-black/80"
                            }`}
                        />
                      </div>
                    ) : null}
                    <li
                      className={`relative flex min-w-0 flex-col lg:w-auto lg:snap-start ${step.detailRows?.length
                          ? "lg:flex-[1.45]"
                          : "lg:flex-1"
                        }`}
                    >
                      {step.isActive && stepPopovers?.[step.id] ? (
                        <div
                          className={`min-w-0 w-full overflow-hidden rounded-md border text-center transition sm:rounded-lg ${saleStepBarButtonClass(
                            step,
                          )}`}
                        >
                          <button
                            type="button"
                            disabled={!step.isUnlocked}
                            onClick={() => onOpenStep(step.id)}
                            title={`${step.label}: ${step.value}`}
                            aria-current="step"
                            className="w-full px-0 py-0 text-center sm:px-2 sm:py-2"
                          >
                            {saleStepTileInner(step, { hideDetail: true })}
                          </button>
                          <div className="hidden border-t border-black/45 bg-black/15 px-1.5 pb-1.5 pt-1 sm:px-2 sm:pb-2 sm:pt-1.5 lg:block">
                            {stepPopovers[step.id]?.trigger}
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={!step.isUnlocked}
                          onClick={() => onOpenStep(step.id)}
                          title={`${step.label}: ${step.value}`}
                          aria-current={step.isActive ? "step" : undefined}
                          className={`min-w-0 w-full rounded-md border px-0 py-0 text-center transition sm:px-2 sm:py-2 lg:rounded-lg lg:px-2.5 lg:py-2 ${saleStepBarButtonClass(
                            step,
                          )}`}
                        >
                          {saleStepTileInner(step)}
                        </button>
                      )}

                      {step.isActive && stepPopovers?.[step.id]?.open ? (
                        <>
                          {saleStepArrow()}
                          <div className="absolute left-1/2 top-full z-30 mt-1 hidden w-[min(calc(100vw-1.25rem),22rem)] -translate-x-1/2 sm:w-[min(calc(100vw-2rem),24rem)] lg:block">
                            {stepPopovers[step.id]?.content}
                          </div>
                        </>
                      ) : (
                        <div
                          className="flex h-3 items-start justify-center"
                          aria-hidden={!step.isActive}
                        >
                          {step.isActive ? saleStepArrow() : null}
                        </div>
                      )}
                    </li>
                  </Fragment>
                );
              })}
            </ol>
          </div>
          {trailingSlot ? (
            <div className="mt-1.5 shrink-0 self-start sm:mt-2 lg:mt-[0.625rem]">
              {trailingSlot}
            </div>
          ) : null}
        </div>
      </div>
    </nav>
  );
}
