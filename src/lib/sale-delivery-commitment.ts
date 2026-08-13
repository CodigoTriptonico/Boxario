import { EMPTY_BOX_DRIVER_MODE } from "@/lib/sale-logistics-modes";

type DeliveryTaskInput = {
  taskType?: string | null;
  scheduledAt?: string | null;
  requestedRouteDate?: string | null;
};

const REQUIRED_DELIVERY_DATE_MESSAGE =
  "Elige una fecha de entrega para la caja vacía. La ruta puede quedar pendiente.";
const REQUIRED_DELIVERY_TASK_MESSAGE =
  "No se pudo crear la tarea de entrega para la fecha elegida. Vuelve a programarla.";
const DELIVERY_DATE_MISMATCH_MESSAGE =
  "La fecha de la entrega no coincide con la tarea de Logística. Vuelve a programarla.";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function validCalendarDate(value: unknown) {
  const raw = typeof value === "string" ? value.trim() : "";
  const match = /^(\d{4}-\d{2}-\d{2})(?:T|$)/.exec(raw);
  if (!match) {
    return null;
  }

  const datePart = match[1];
  const parsed = new Date(`${datePart}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== datePart
    ? null
    : datePart;
}

/**
 * Validates the operational commitment required when a seller chooses driver delivery.
 * The route and driver may remain unassigned, but the sale must persist a real calendar
 * date in both its logistics plan and the delivery task created for Logística.
 */
export function saleDeliveryCommitmentError(
  logisticsPlan: Record<string, unknown>,
  logisticsTasks: DeliveryTaskInput[],
) {
  const emptyBox = asRecord(logisticsPlan.emptyBox);
  if (String(emptyBox.mode || "") !== EMPTY_BOX_DRIVER_MODE) {
    return null;
  }

  const planDate =
    validCalendarDate(emptyBox.requestedRouteDate) ||
    validCalendarDate(emptyBox.scheduleAt);
  if (!planDate) {
    return REQUIRED_DELIVERY_DATE_MESSAGE;
  }

  const deliveryTask = logisticsTasks.find((task) => task.taskType === "deliver_empty_box");
  if (!deliveryTask) {
    return REQUIRED_DELIVERY_TASK_MESSAGE;
  }

  const requestedTaskDate = validCalendarDate(deliveryTask.requestedRouteDate);
  const scheduledTaskDate = validCalendarDate(deliveryTask.scheduledAt);
  if (!requestedTaskDate && !scheduledTaskDate) {
    return REQUIRED_DELIVERY_DATE_MESSAGE;
  }

  if (requestedTaskDate && requestedTaskDate !== planDate) {
    return DELIVERY_DATE_MISMATCH_MESSAGE;
  }

  return null;
}
