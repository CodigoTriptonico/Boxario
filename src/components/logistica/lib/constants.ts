import type { LogisticsTaskType } from "@/lib/shipment-types";
import type { LogisticsRouteStatus } from "@/lib/logistics-routing";

export const LOGISTICS_CARD_PICKER_SHELL =
  "inset-shell box-border inline-flex h-7 w-full min-w-0 items-center gap-1.5 rounded-md border-0 bg-transparent px-0";

export const LOGISTICS_INVOICE_CARD_GRID_CLASS =
  "grid auto-rows-max gap-3 xl:grid-cols-2 2xl:grid-cols-3";

export const WIDE_LAYOUT_MEDIA_QUERY = "(min-width: 1536px)";

export const LOGISTICS_FIELD_BASE = "border-black bg-surface-inset";

export const taskTypeLabel: Record<LogisticsTaskType, string> = {
  deliver_empty_box: "Dejar",
  pickup_full_box: "Recoger",
};

export const taskTypeShortLabel: Record<LogisticsTaskType, string> = {
  deliver_empty_box: "Dejar",
  pickup_full_box: "Recoger",
};

export const taskActionVerb: Record<LogisticsTaskType, string> = {
  deliver_empty_box: "Entregar",
  pickup_full_box: "Recoger",
};

export const routeStatusLabel: Record<LogisticsRouteStatus, string> = {
  draft: "Draft",
  planned: "Planeada",
  in_progress: "En curso",
  cancelled: "Cancelada",
  completed: "Completada",
};
