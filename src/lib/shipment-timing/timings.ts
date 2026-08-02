import {
  DAY_MS,
  formatActiveElapsed,
  formatGapSummary,
  formatShipmentDuration,
  formatShipmentRelative,
  formatWaitingHeadline,
  formatWaitingSince,
  gapBetween,
  parseIso,
  resolveStepCompletedAt,
  stepShortName,
  type ShipmentStepGap,
  type ShipmentTimings,
} from "@/lib/shipment-timing/core";
import {
  shouldTrackEmptyBoxInProgressWait,
  shouldTrackFullBoxInProgressWait,
} from "@/lib/shipment-timing/milestones";
import type {
  ShipmentProgressKind,
  ShipmentProgressStep,
  ShipmentRow,
} from "@/lib/shipment-types";

export function buildShipmentTimings(
  row: ShipmentRow,
  steps: ShipmentProgressStep[],
  nowMs = Date.now(),
): ShipmentTimings {
  const completedAtByKind: Partial<Record<ShipmentProgressKind, string>> = {};

  for (const step of steps) {
    if (step.state === "pending") {
      continue;
    }

    const completedAt = resolveStepCompletedAt(row, step.kind);
    if (completedAt) {
      completedAtByKind[step.kind] = completedAt;
    }
  }

  const saleIso = row.created_at || null;
  const saleAgeMs = saleIso
    ? Math.max(0, nowMs - (parseIso(saleIso) || nowMs))
    : 0;
  const gaps: ShipmentStepGap[] = [];
  const timingSteps: ShipmentProgressStep[] = saleIso
    ? [
        {
          id: "sale",
          title: "Venta",
          detail: "",
          state: "done",
          kind: "sale",
          channel: "neutral",
        },
        ...steps,
      ]
    : steps;

  if (saleIso) {
    completedAtByKind.sale = saleIso;
  }

  for (let index = 1; index < timingSteps.length; index += 1) {
    const previous = timingSteps[index - 1];
    const current = timingSteps[index];

    if (!previous || !current || current.state === "pending") {
      continue;
    }

    const fromIso =
      previous.state === "done"
        ? completedAtByKind[previous.kind] || null
        : null;
    const toIso =
      current.state === "done"
        ? completedAtByKind[current.kind] || null
        : null;

    if (!fromIso || !toIso) {
      continue;
    }

    const gap = gapBetween(previous.kind, current.kind, fromIso, toIso);
    if (gap) {
      gaps.push(gap);
    }
  }

  const activeStep = steps.find((step) => step.state === "active");
  const activeIndex = activeStep
    ? steps.findIndex((step) => step.id === activeStep.id)
    : -1;
  let activeElapsedMs: number | null = null;
  let activeElapsedLabel: string | null = null;
  let activeElapsedDetail: string | null = null;
  let waitingHeadline: string | null = null;
  let waitingSinceLabel: string | null = null;
  let waitingText: string | null = null;
  let activeStepShortName: string | null = null;
  let anchorKind: ShipmentProgressKind | null = null;

  if (activeStep) {
    activeStepShortName = stepShortName(activeStep.kind);
    const canTrackActiveWait =
      activeStep.kind === "empty_box"
        ? shouldTrackEmptyBoxInProgressWait(
            row,
            activeStep,
            resolveStepCompletedAt(row, "empty_box"),
          )
        : activeStep.kind === "full_box"
          ? shouldTrackFullBoxInProgressWait(
              row,
              activeStep,
              resolveStepCompletedAt(row, "full_box"),
              resolveStepCompletedAt(row, "empty_box"),
            )
          : true;

    if (canTrackActiveWait) {
      const previousStep = activeIndex > 0 ? steps[activeIndex - 1] : null;

      if (previousStep?.state === "done") {
        anchorKind = previousStep.kind;
      } else {
        anchorKind = "sale";
      }

      const anchorIso =
        (anchorKind !== "sale" &&
          anchorKind &&
          completedAtByKind[anchorKind]) ||
        saleIso ||
        null;
      const anchorMs = parseIso(anchorIso);

      if (anchorMs !== null) {
        activeElapsedMs = Math.max(0, nowMs - anchorMs);
        const durationLabel = formatShipmentDuration(activeElapsedMs);
        activeElapsedDetail = formatActiveElapsed(durationLabel, anchorKind);
        activeElapsedLabel = activeElapsedDetail;
        waitingHeadline = formatWaitingHeadline(durationLabel);
        waitingSinceLabel = formatWaitingSince(anchorKind);
        waitingText =
          [waitingHeadline, waitingSinceLabel].filter(Boolean).join(" ") ||
          null;
      }
    }
  }

  const gapSummaries = gaps.map((gap) => formatGapSummary(gap));
  const completedGapsLine = gapSummaries.length
    ? gapSummaries.join(" · ")
    : null;
  const lastCompletedGap = gapSummaries.length
    ? gapSummaries[gapSummaries.length - 1] || null
    : null;
  const progressStepLabel =
    activeIndex >= 0
      ? `Paso ${activeIndex + 1} de ${steps.length}`
      : `Paso ${steps.length} de ${steps.length}`;
  const isLongWait = activeElapsedMs !== null && activeElapsedMs >= DAY_MS;
  const saleRelative = saleIso
    ? formatShipmentRelative(saleIso, nowMs)
    : "";

  return {
    saleAgeMs,
    saleAgeLabel: saleRelative ? `Venta ${saleRelative}` : "",
    completedAtByKind,
    gaps,
    gapSummaries,
    completedGapsLine,
    lastCompletedGap,
    progressStepLabel,
    activeElapsedMs,
    activeElapsedLabel,
    activeElapsedDetail,
    waitingHeadline,
    waitingSinceLabel,
    waitingText,
    activeStepShortName,
    isLongWait,
  };
}
