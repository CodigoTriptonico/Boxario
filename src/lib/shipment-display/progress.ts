import {
  EMPTY_BOX_DRIVER_MODE,
  EMPTY_BOX_OFFICE_MODE,
  FULL_BOX_DRIVER_MODE,
  FULL_BOX_OFFICE_MODE,
  OFFICE_RECEIVED_STATUSES,
  STATUS_RANK,
} from "@/lib/shipment-display/constants";
import {
  driverLegAwaitingOrder,
  legDriverTaskOrdered,
  legPlannedScheduleDetail,
  planLeg,
  scheduleDetail,
  stepMeta,
  taskByType,
  taskIsDone,
  taskIsInProgress,
} from "@/lib/shipment-display/shared";
import {
  EMPTY_BOX_LEG_LABELS,
  FULL_BOX_LEG_LABELS,
} from "@/lib/shipment-leg-labels";
import { legHasScheduleChange } from "@/lib/shipment-schedule-history";
import type {
  ShipmentProgressKind,
  ShipmentProgressStep,
  ShipmentRow,
} from "@/lib/shipment-types";

type RawProgressStep = Omit<
  ShipmentProgressStep,
  "state" | "awaitingOrder"
> & {
  raw: "done" | "active" | "pending" | "awaiting_order";
};

function shipmentStatusRank(status: ShipmentRow["status"]) {
  return STATUS_RANK[status] ?? 0;
}

function transitStepRaw(
  fullBoxDone: boolean,
  rank: number,
  doneAt: number,
  activeAt: number,
) {
  if (!fullBoxDone) {
    return "pending" as const;
  }

  if (rank >= doneAt) {
    return "done" as const;
  }

  if (rank >= activeAt) {
    return "active" as const;
  }

  return "pending" as const;
}

function pickupTransitStep(
  row: ShipmentRow,
  fullBoxDone: boolean,
): RawProgressStep {
  const rank = shipmentStatusRank(row.status);
  const raw = transitStepRaw(fullBoxDone, rank, 2, 1);
  let detail = "Pendiente salida";

  if (rank >= 2) {
    detail = "Salida registrada";
  } else if (rank === 1 || fullBoxDone) {
    detail = "Lista para salida";
  }

  return {
    id: "pickup",
    title: "Salida",
    detail,
    ...stepMeta("pickup", "office", "Oficina"),
    raw,
  };
}

function deliveredTransitStep(
  row: ShipmentRow,
  fullBoxDone: boolean,
): RawProgressStep {
  const rank = shipmentStatusRank(row.status);
  const raw = transitStepRaw(fullBoxDone, rank, 4, 3);
  let detail = "Pendiente entrega final";

  if (rank >= 4) {
    detail = "Entregado al destinatario";
  } else if (rank === 3) {
    detail = "Pendiente entrega en destino";
  }

  return {
    id: "delivered",
    title: "Destino",
    detail,
    ...stepMeta("delivered", "home", "Destino"),
    raw,
  };
}

function postFullBoxSteps(
  row: ShipmentRow,
  fullBoxDone: boolean,
): RawProgressStep[] {
  return [
    pickupTransitStep(row, fullBoxDone),
    deliveredTransitStep(row, fullBoxDone),
  ];
}

function resolveStepStates(
  steps: RawProgressStep[],
): ShipmentProgressStep[] {
  let foundActive = false;

  return steps.map((step) => {
    const { raw, ...rest } = step;

    if (raw === "done") {
      return { ...rest, state: "done" as const };
    }

    if (!foundActive && raw === "active") {
      foundActive = true;
      return { ...rest, state: "active" as const };
    }

    if (!foundActive && raw === "awaiting_order") {
      foundActive = true;
      return {
        ...rest,
        state: "active" as const,
        awaitingOrder: true,
      };
    }

    if (!foundActive && raw === "pending") {
      foundActive = true;
      return { ...rest, state: "active" as const };
    }

    return { ...rest, state: "pending" as const };
  });
}

function emptyBoxStep(
  row: ShipmentRow,
  leg: Record<string, unknown> | null,
): RawProgressStep {
  const mode = String(leg?.mode || "");
  const handingNow = leg?.handingNow === true;
  const task = taskByType(row, "deliver_empty_box");

  if (mode === EMPTY_BOX_OFFICE_MODE) {
    if (handingNow || taskIsDone(task) || Boolean(task?.stockDeductedAt)) {
      return {
        id: "empty",
        title: EMPTY_BOX_LEG_LABELS.short,
        detail: "Entregado en oficina",
        ...stepMeta("empty_box", "office", "Oficina"),
        raw: "done" as const,
      };
    }

    return {
      id: "empty",
      title: EMPTY_BOX_LEG_LABELS.short,
      detail: "Cliente recoge en oficina",
      ...stepMeta("empty_box", "office", "Oficina"),
      raw: "active" as const,
    };
  }

  if (mode === EMPTY_BOX_DRIVER_MODE) {
    if (taskIsDone(task) || Boolean(task?.stockDeductedAt)) {
      return {
        id: "empty",
        title: EMPTY_BOX_LEG_LABELS.short,
        detail: "Entregada a domicilio",
        ...stepMeta("empty_box", "home", "Domicilio"),
        raw: "done" as const,
      };
    }

    if (driverLegAwaitingOrder(row, "deliver_empty_box", mode)) {
      return {
        id: "empty",
        title: EMPTY_BOX_LEG_LABELS.short,
        detail: legPlannedScheduleDetail(
          leg,
          "Orden pendiente en envíos",
        ),
        scheduleChanged: legHasScheduleChange(leg),
        ...stepMeta("empty_box", "home", "Domicilio"),
        raw: "awaiting_order" as const,
      };
    }

    return {
      id: "empty",
      title: EMPTY_BOX_LEG_LABELS.short,
      detail: scheduleDetail(
        task,
        "Pendiente entrega a domicilio",
      ),
      scheduleChanged: legHasScheduleChange(leg),
      ...stepMeta("empty_box", "home", "Domicilio"),
      raw: taskIsInProgress(task)
        ? ("active" as const)
        : ("pending" as const),
    };
  }

  const summaryDetail = row.delivery_notes
    .split(" | ")
    .find((chunk) =>
      chunk.toLowerCase().startsWith("caja vacia:"),
    )
    ?.slice("Caja vacia:".length)
    .trim();

  return {
    id: "empty",
    title: EMPTY_BOX_LEG_LABELS.short,
    detail: summaryDetail || "Pendiente",
    ...stepMeta("empty_box"),
    raw: "pending" as const,
  };
}

function fullBoxStep(
  row: ShipmentRow,
  leg: Record<string, unknown> | null,
  emptyDone: boolean,
): RawProgressStep {
  const mode = String(leg?.mode || "");
  const task = taskByType(row, "pickup_full_box");
  const officeReceived =
    OFFICE_RECEIVED_STATUSES.has(row.status) ||
    row.status === "Entregado";

  if (mode === FULL_BOX_OFFICE_MODE) {
    if (officeReceived || taskIsDone(task)) {
      return {
        id: "full",
        title: FULL_BOX_LEG_LABELS.short,
        detail: "Recibida en oficina",
        ...stepMeta("full_box", "office", "Oficina"),
        raw: "done" as const,
      };
    }

    return {
      id: "full",
      title: FULL_BOX_LEG_LABELS.short,
      detail: emptyDone
        ? "Cliente la trae a oficina"
        : "Esperando caja vacía",
      ...stepMeta("full_box", "office", "Oficina"),
      raw: emptyDone ? ("active" as const) : ("pending" as const),
    };
  }

  if (mode === FULL_BOX_DRIVER_MODE) {
    if (taskIsDone(task) || row.status === "Entregado") {
      return {
        id: "full",
        title: FULL_BOX_LEG_LABELS.short,
        detail: "Recogida en domicilio",
        ...stepMeta("full_box", "home", "Domicilio"),
        raw: "done" as const,
      };
    }

    if (driverLegAwaitingOrder(row, "pickup_full_box", mode)) {
      return {
        id: "full",
        title: FULL_BOX_LEG_LABELS.short,
        detail: legPlannedScheduleDetail(
          leg,
          "Orden pendiente en envíos",
        ),
        scheduleChanged: legHasScheduleChange(leg),
        ...stepMeta("full_box", "home", "Domicilio"),
        raw: emptyDone
          ? ("awaiting_order" as const)
          : ("pending" as const),
      };
    }

    return {
      id: "full",
      title: FULL_BOX_LEG_LABELS.short,
      detail: scheduleDetail(
        task,
        "Pendiente recolección a domicilio",
      ),
      scheduleChanged: legHasScheduleChange(leg),
      ...stepMeta("full_box", "home", "Domicilio"),
      raw: emptyDone
        ? taskIsInProgress(task)
          ? ("active" as const)
          : ("pending" as const)
        : ("pending" as const),
    };
  }

  const summaryDetail = row.delivery_notes
    .split(" | ")
    .find((chunk) =>
      chunk.toLowerCase().startsWith("caja llena:"),
    )
    ?.slice("Caja llena:".length)
    .trim();

  return {
    id: "full",
    title: FULL_BOX_LEG_LABELS.short,
    detail: emptyDone
      ? "Orden pendiente en envíos"
      : summaryDetail || "Esperando caja vacía",
    ...stepMeta("full_box"),
    raw: officeReceived
      ? ("done" as const)
      : emptyDone
        ? ("awaiting_order" as const)
        : ("pending" as const),
  };
}

function withDriverTaskOrdered<
  T extends { kind: ShipmentProgressKind },
>(
  row: ShipmentRow,
  step: T,
): T & { driverTaskOrdered?: boolean } {
  if (step.kind === "empty_box") {
    return {
      ...step,
      driverTaskOrdered: legDriverTaskOrdered(
        row,
        "deliver_empty_box",
      ),
    };
  }

  if (step.kind === "full_box") {
    return {
      ...step,
      driverTaskOrdered: legDriverTaskOrdered(
        row,
        "pickup_full_box",
      ),
    };
  }

  return step;
}

export function shipmentLogisticsSteps(
  row: ShipmentRow,
): ShipmentProgressStep[] {
  const plan = row.logistics_plan || {};
  const emptyLeg = planLeg(plan, "emptyBox");
  const fullLeg = planLeg(plan, "fullBox");
  const empty = emptyBoxStep(row, emptyLeg);
  const emptyDone = empty.raw === "done";
  const full = fullBoxStep(row, fullLeg, emptyDone);
  const fullDone = full.raw === "done";
  const rawSteps: RawProgressStep[] = [
    withDriverTaskOrdered(row, empty),
    withDriverTaskOrdered(row, full),
    ...postFullBoxSteps(row, fullDone).map((step) =>
      withDriverTaskOrdered(row, step),
    ),
  ];

  return resolveStepStates(rawSteps);
}
