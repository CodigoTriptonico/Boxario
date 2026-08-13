import type { LogisticsWeekdaySchedule } from "@/app/actions/logistics-routes";
import type {
  Driver,
  RouteTemplate,
  SelectionOrder,
} from "@/components/logistica/task-schedule/shared";
import type { LogisticsWeekdayKey } from "@/lib/logistics-route-catalog";
import type { ScheduleTimeSuggestions } from "@/lib/sale/schedule-suggestions";

export type LogisticsTaskScheduleConfirmPanelProps = {
  open: boolean;
  shipmentCode: string;
  customerName: string;
  taskTypeLabel: string;
  scheduledAt: string | null;
  initialRouteTemplateId?: string | null;
  templates: RouteTemplate[];
  customerPostalCode?: string | null;
  customerId?: string | null;
  requestedBoxes?: number;
  scheduleSuggestionsByWeekday?: Array<ScheduleTimeSuggestions | null>;
  enabledDays?: LogisticsWeekdayKey[];
  defaultDriverByWeekday: Array<string | null>;
  weekdayScheduleByWeekday?: Array<LogisticsWeekdaySchedule | null>;
  routeMembers: Driver[];
  saving?: boolean;
  title?: string;
  confirmLabel?: string;
  selectionOrder?: SelectionOrder;
  showDriverPicker?: boolean;
  allowPendingDay?: boolean;
  pendingDayLabel?: string;
  allowPendingRoute?: boolean;
  pendingRouteLabel?: string;
  pendingRouteDate?: string | null;
  requireExplicitRouteSelection?: boolean;
  onCancel: () => void;
  onConfirm: (input: {
    scheduledAt: string;
    driverId: string;
    routeTemplateId: string;
  }) => void | Promise<void>;
  onConfirmPendingDay?: () => void | Promise<void>;
  onConfirmPendingRoute?: (input: { routeDate: string }) => void | Promise<void>;
  onConfirmPreferredRoute?: (input: { routeTemplateId: string }) => void | Promise<void>;
};
