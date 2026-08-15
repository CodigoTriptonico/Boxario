import type { SaleDepositChargeMode } from "@/lib/sale-deposit-charge";
import type { SaleRouteDecision } from "@/lib/sale-route-decision";
import type { Sender } from "@/components/sale/venta-parts";
import type { SaleBoxCartLine } from "@/components/sale/venta/shared";

export type QuickEmptyBoxDraft = {
  sender: Sender;
  country: string;
  box: string[];
  boxLines: SaleBoxCartLine[];
  boxCount: number;
  depositPaid: boolean;
  paymentMode: SaleDepositChargeMode;
  payNowAmount: string;
  emptyBoxMode: string;
  emptyBoxScheduleMode: string;
  emptyBoxScheduleAt: string;
  deliverySummary: string;
  routeDecision: SaleRouteDecision | null;
};
