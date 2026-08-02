"use client";

import { useEffect, useState } from "react";
import type { LogisticsTaskType } from "@/lib/shipment-types";
import {
  logisticsTaskWaitingParts,
  logisticsWaitingToneClass,
} from "@/lib/logistics-view";

export function LogisticsTaskWaitingBanner({
  taskType,
  orderedAt,
  createdAt,
}: {
  taskType: LogisticsTaskType | null | undefined;
  orderedAt: string | null | undefined;
  createdAt: string | null | undefined;
}) {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const intervalId = window.setInterval(() => setNowMs(Date.now()), 60_000);
    return () => window.clearInterval(intervalId);
  }, []);

  const waiting = logisticsTaskWaitingParts(taskType, orderedAt, createdAt, nowMs);
  if (!waiting) {
    return null;
  }

  return (
    <div
      className={`rounded-md border px-2.5 py-2 ${logisticsWaitingToneClass(waiting.elapsedMs)}`}
    >
      <p className="text-base font-black tabular-nums leading-tight">{waiting.waitingText}</p>
    </div>
  );
}
