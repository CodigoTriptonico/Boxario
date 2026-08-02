import { secondaryButtonClass } from "@/components/ui-blocks";

type LogisticsTaskSchedulePendingActionsProps = {
  showPendingRoute: boolean;
  showPendingDay: boolean;
  saving: boolean;
  canLeavePendingRoute: boolean;
  pendingDayRouteMode: boolean;
  pendingRouteLabel: string;
  pendingDayLabel: string;
  onPendingRoute: () => void;
  onPendingDay: () => void;
};

export function LogisticsTaskSchedulePendingRouteAction({
  showPendingRoute,
  saving,
  canLeavePendingRoute,
  pendingRouteLabel,
  onPendingRoute,
}: Pick<
  LogisticsTaskSchedulePendingActionsProps,
  "showPendingRoute" | "saving" | "canLeavePendingRoute" | "pendingRouteLabel" | "onPendingRoute"
>) {
  if (!showPendingRoute) {
    return null;
  }

  return (
    <button
      type="button"
      disabled={saving || !canLeavePendingRoute}
      onClick={onPendingRoute}
      className={`${secondaryButtonClass} h-11 w-full text-sm font-black disabled:opacity-40`}
    >
      {pendingRouteLabel}
    </button>
  );
}

export function LogisticsTaskSchedulePendingDayAction({
  showPendingDay,
  saving,
  pendingDayLabel,
  onPendingDay,
}: Pick<
  LogisticsTaskSchedulePendingActionsProps,
  "showPendingDay" | "saving" | "pendingDayLabel" | "onPendingDay"
>) {
  if (!showPendingDay) {
    return null;
  }

  return (
    <button
      type="button"
      disabled={saving}
      onClick={onPendingDay}
      className={`${secondaryButtonClass} h-11 w-full text-sm font-black disabled:opacity-40`}
    >
      {pendingDayLabel}
    </button>
  );
}
