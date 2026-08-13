import { formatMoneyValue, parseMoneyValue } from "@/lib/logistics-fees";

export type SaleDepositChargeMode = "deposit" | "full";

export function minimumDepositForBoxCount(input: {
  minimumDeposit: string | number;
  boxCount?: number;
  quotedTotal: string | number;
}): number {
  const quotedTotal = Math.max(parseMoneyValue(String(input.quotedTotal)), 0);
  const boxCount = Math.max(Math.floor(Number(input.boxCount) || 1), 1);
  const configuredPerBox = Math.max(parseMoneyValue(String(input.minimumDeposit)), 0);

  return Math.min(configuredPerBox * boxCount, quotedTotal);
}

export function resolveSaleDepositChargeAmount(input: {
  mode: SaleDepositChargeMode;
  depositDraft: string;
  minimumDeposit: string | number;
  boxCount?: number;
  quotedTotal: string | number;
}): number {
  const quotedTotal = Math.max(parseMoneyValue(String(input.quotedTotal)), 0);
  if (quotedTotal <= 0) {
    return 0;
  }

  if (input.mode === "full") {
    return quotedTotal;
  }

  const minimumDeposit = minimumDepositForBoxCount(input);
  const draft = input.depositDraft.trim();
  if (!draft) {
    return minimumDeposit;
  }

  return Math.min(Math.max(parseMoneyValue(draft), 0), quotedTotal);
}

export function saleDepositChargeAmountDigits(input: {
  mode: SaleDepositChargeMode;
  depositDraft: string;
  minimumDeposit: string | number;
  boxCount?: number;
  quotedTotal: string | number;
}): string {
  const amount = resolveSaleDepositChargeAmount(input);
  return formatMoneyValue(amount).replace(/^\$/, "");
}

export function defaultSaleDepositDraft(
  minimumDeposit: string | number,
  quotedTotal: string | number,
  boxCount = 1,
): string {
  const minimum = minimumDepositForBoxCount({ minimumDeposit, quotedTotal, boxCount });
  return formatMoneyValue(minimum).replace(/^\$/, "");
}
