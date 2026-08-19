"use client";

import { useState } from "react";
import { listConductorDriverTaskPageAction } from "@/app/actions/conductor-tasks";
import { secondaryButtonClass } from "@/components/ui-blocks";
import type { ConductorDriverTask } from "@/lib/conductor-tasks";

type Cursor = { sortAt: string; id: string } | null;

export function useConductorTaskPages(input: {
  driverId: string | null;
  scopeDate: string;
  initialTasks: ConductorDriverTask[];
  initialCompletedTasks: ConductorDriverTask[];
  initialTasksCursor: Cursor;
  initialCompletedCursor: Cursor;
}) {
  const [tasks, setTasks] = useState(input.initialTasks);
  const [completedTasks, setCompletedTasks] = useState(input.initialCompletedTasks);
  const [tasksCursor, setTasksCursor] = useState(input.initialTasksCursor);
  const [completedCursor, setCompletedCursor] = useState(input.initialCompletedCursor);
  const [pageLoading, setPageLoading] = useState(false);
  const [pageError, setPageError] = useState("");
  const loadNext = async (visibility: "open" | "closed") => {
    const cursor = visibility === "closed" ? completedCursor : tasksCursor;
    if (!input.driverId || !cursor || pageLoading) return;
    setPageLoading(true); setPageError("");
    const result = await listConductorDriverTaskPageAction({ driverId: input.driverId, scopeDate: input.scopeDate, visibility, cursor });
    setPageLoading(false);
    if (!result.ok) { setPageError(result.error); return; }
    const append = (current: ConductorDriverTask[]) => Array.from(new Map([...current, ...result.data.items].map((task) => [task.id, task])).values());
    if (visibility === "closed") { setCompletedTasks(append); setCompletedCursor(result.data.nextCursor); }
    else { setTasks(append); setTasksCursor(result.data.nextCursor); }
  };
  return { tasks, completedTasks, setCompletedTasks, cursor: (visibility: "open" | "closed") => visibility === "closed" ? completedCursor : tasksCursor, pageLoading, pageError, loadNext };
}

export function ConductorTaskPageControl({ cursor, loading, error, onLoad }: { cursor: Cursor; loading: boolean; error: string; onLoad: () => void }) {
  if (!cursor) return null;
  return <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
    {error ? <p role="alert" className="text-xs font-bold text-rose-200">No se pudo cargar más tareas: {error}</p> : null}
    <button type="button" className={`${secondaryButtonClass} h-9 px-3 text-xs font-black`} disabled={loading} onClick={onLoad}>{loading ? "Cargando…" : "Cargar más tareas"}</button>
  </div>;
}
