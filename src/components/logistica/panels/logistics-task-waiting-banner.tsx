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
  // El primer render debe ser idéntico en SSR y cliente. Usar el ancla como
  // reloj inicial conserva la geometría del aviso; el efecto lo actualiza al
  // tiempo real después de hidratar.
  const anchorMs = Date.parse(orderedAt || createdAt || "");
  const initialNowMs = Number.isFinite(anchorMs) ? anchorMs : 0;
  const [nowMs, setNowMs] = useState(initialNowMs);

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
