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
    <div className="flex items-center justify-center pt-1">
      <button
        type="button"
        disabled={saving || !canLeavePendingRoute}
        onClick={onPendingRoute}
        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 transition hover:text-emerald-300 hover:underline disabled:opacity-40"
      >
        <span>¿Aún no decides la ruta?</span>
        <span className="font-black text-emerald-400">{pendingRouteLabel || "Continuar sin ruta"}</span>
      </button>
    </div>
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
    <div className="pt-1">
      <button
        type="button"
        disabled={saving}
        onClick={onPendingDay}
        className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-slate-700 bg-[#16201b] p-3 text-xs font-black text-slate-300 hover:border-emerald-500/60 hover:bg-[#1c2923] hover:text-white transition disabled:opacity-40 shadow-sm"
      >
        {pendingDayLabel || "No sé el día"}
      </button>
    </div>
  );
}

