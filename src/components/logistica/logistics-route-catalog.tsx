"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Loader2, Pencil, PlusCircle, Route, Trash2, X } from "lucide-react";
import {
  createLogisticsRouteTemplateAction,
  deleteLogisticsRouteTemplateAction,
  setLogisticsWeekdayDefaultDriverAction,
  setLogisticsWeekdayScheduleAction,
  setLogisticsRouteWeekdayEnabledAction,
  updateLogisticsRouteTemplateAction,
  type LogisticsRouteCatalog,
  type LogisticsRouteTemplateRow,
  type LogisticsWeekdaySchedule,
} from "@/app/actions/logistics-routes";
import { InlineSearchPicker } from "@/components/inline-search-picker";
import { TimePickerInput } from "@/components/time-picker-input";
import { primaryButtonClass, secondaryButtonClass } from "@/components/ui-blocks";
import { useNotify } from "@/hooks/use-notify";
import { logisticsWeekdayKeys, type LogisticsWeekdayKey } from "@/lib/logistics-route-catalog";
import { formatTime12Hour } from "@/lib/sale/schedule-time";

const weekdayNames = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"];

export function LogisticsRouteCatalog({
  initialCatalog,
  canManage,
  routeMembers = [],
  onCatalogChange,
}: {
  initialCatalog?: LogisticsRouteCatalog;
  canManage: boolean;
  routeMembers?: Array<{ id: string; label: string; roleSlug: string }>;
  onCatalogChange?: () => void;
}) {
  const notify = useNotify();
  const [enabledDays, setEnabledDays] = useState<LogisticsWeekdayKey[]>(
    initialCatalog?.enabledDays || [],
  );
  const [templates, setTemplates] = useState<LogisticsRouteTemplateRow[]>(
    initialCatalog?.templates || [],
  );
  const [defaultDriverByWeekday, setDefaultDriverByWeekday] = useState<Array<string | null>>(
    initialCatalog?.defaultDriverByWeekday || Array<string | null>(7).fill(null),
  );
  const [weekdayScheduleByWeekday, setWeekdayScheduleByWeekday] = useState<
    Array<LogisticsWeekdaySchedule | null>
  >(initialCatalog?.weekdayScheduleByWeekday || Array<LogisticsWeekdaySchedule | null>(7).fill(null));
  const [selectedDay, setSelectedDay] = useState(0);
  const [creating, setCreating] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [draftStartTime, setDraftStartTime] = useState("");
  const [draftEstimatedEndTime, setDraftEstimatedEndTime] = useState("");
  const [editingDaySchedule, setEditingDaySchedule] = useState<number | null>(null);
  const [dayScheduleStart, setDayScheduleStart] = useState("");
  const [dayScheduleEnd, setDayScheduleEnd] = useState("");
  const [editingTemplate, setEditingTemplate] = useState<LogisticsRouteTemplateRow | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!initialCatalog) {
      return;
    }

    const enabledDays = initialCatalog.enabledDays || [];
    const templates = initialCatalog.templates || [];
    const defaultDriverByWeekday =
      initialCatalog.defaultDriverByWeekday || Array<string | null>(7).fill(null);
    const weekdayScheduleByWeekday =
      initialCatalog.weekdayScheduleByWeekday ||
      Array<LogisticsWeekdaySchedule | null>(7).fill(null);
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      setEnabledDays(enabledDays);
      setTemplates(templates);
      setDefaultDriverByWeekday(defaultDriverByWeekday);
      setWeekdayScheduleByWeekday(weekdayScheduleByWeekday);
    });
    return () => {
      active = false;
    };
  }, [initialCatalog]);

  const selectedDayKey = logisticsWeekdayKeys[selectedDay] || "Lun";
  const selectedDayEnabled = enabledDays.includes(selectedDayKey);
  const selectedDayTemplates = useMemo(
    () => templates.filter((template) => template.weekday === selectedDay),
    [selectedDay, templates],
  );
  const selectedTemplates = selectedDayTemplates;
  const driverOptions = useMemo(
    () =>
      routeMembers
        .filter((member) => member.roleSlug === "conductor")
        .map((member) => ({ value: member.id, label: member.label, searchText: member.label })),
    [routeMembers],
  );

  async function setDefaultDriver(day: number, driverId: string | null) {
    if (!canManage) return;

    setBusy(`driver:${day}`);
    const result = await setLogisticsWeekdayDefaultDriverAction({ weekday: day, driverId });
    setBusy(null);
    if (!result.ok) {
      notify.error(result.error);
      return;
    }

    setDefaultDriverByWeekday((current) =>
      current.map((value, index) => (index === day ? result.data : value)),
    );
    notify.success(result.data ? "Conductor predeterminado actualizado" : "Conductor predeterminado eliminado");
    onCatalogChange?.();
  }

  async function toggleDay(day: number) {
    if (!canManage) {
      return;
    }

    const key = logisticsWeekdayKeys[day];
    if (!key) {
      return;
    }

    const enabled = !enabledDays.includes(key);
    setBusy(`day:${day}`);
    const result = await setLogisticsRouteWeekdayEnabledAction({ day: key, enabled });
    setBusy(null);

    if (!result.ok) {
      notify.error(result.error);
      return;
    }

    setEnabledDays(result.data);
    setSelectedDay(day);
    if (enabled && !weekdayScheduleByWeekday[day]) {
      setDayScheduleStart("");
      setDayScheduleEnd("");
      setEditingDaySchedule(day);
    }
    notify.success(enabled ? `${weekdayNames[day]} disponible` : `${weekdayNames[day]} no disponible`);
    onCatalogChange?.();
  }

  function openDaySchedule(day: number) {
    const existing = weekdayScheduleByWeekday[day];
    setSelectedDay(day);
    setDayScheduleStart(existing?.startTime || "");
    setDayScheduleEnd(existing?.estimatedEndTime || "");
    setEditingDaySchedule(day);
  }

  async function saveDaySchedule(day: number) {
    if (!dayScheduleStart || !dayScheduleEnd || dayScheduleStart >= dayScheduleEnd) {
      notify.error("La hora de fin debe ser posterior a la hora de inicio");
      return;
    }

    setBusy(`schedule:${day}`);
    const result = await setLogisticsWeekdayScheduleAction({
      weekday: day,
      startTime: dayScheduleStart,
      estimatedEndTime: dayScheduleEnd,
    });
    setBusy(null);

    if (!result.ok) {
      notify.error(result.error);
      return;
    }

    setWeekdayScheduleByWeekday((current) =>
      current.map((schedule, index) => (index === day ? result.data : schedule)),
    );
    setEditingDaySchedule(null);
    notify.success(`Horario general de ${weekdayNames[day]} guardado`);
    onCatalogChange?.();
  }

  async function createRoute(name: string, startTime = draftStartTime, estimatedEndTime = draftEstimatedEndTime) {
    const trimmed = name.trim();
    if (!trimmed || !startTime || !estimatedEndTime) {
      notify.error("Completa el nombre y el horario operativo de la ruta");
      return;
    }

    setBusy("create");
    const result = await createLogisticsRouteTemplateAction({
      weekday: selectedDay,
      name: trimmed,
      startTime,
      estimatedEndTime,
    });
    setBusy(null);

    if (!result.ok) {
      notify.error(result.error);
      return;
    }

    setTemplates((current) => [...current, result.data]);
    setDraftName("");
    setDraftStartTime("");
    setDraftEstimatedEndTime("");
    setCreating(false);
    notify.success("Ruta semanal creada");
    onCatalogChange?.();
  }

  async function saveRename() {
    if (!editingTemplate) {
      return;
    }

    const name = editingTemplate.name.trim();
    if (!name || !editingTemplate.startTime || !editingTemplate.estimatedEndTime) {
      notify.error("Completa el nombre y el horario operativo de la ruta");
      return;
    }

    setBusy(`edit:${editingTemplate.id}`);
    const result = await updateLogisticsRouteTemplateAction({
      templateId: editingTemplate.id,
      name,
      startTime: editingTemplate.startTime,
      estimatedEndTime: editingTemplate.estimatedEndTime,
    });
    setBusy(null);

    if (!result.ok) {
      notify.error(result.error);
      return;
    }

    setTemplates((current) =>
      current.map((template) => (template.id === result.data.id ? result.data : template)),
    );
    setEditingTemplate(null);
    notify.success("Ruta semanal actualizada");
    onCatalogChange?.();
  }

  async function removeRoute(template: LogisticsRouteTemplateRow) {
    if (!window.confirm(`Eliminar “${template.name}”?`)) {
      return;
    }

    setBusy(`delete:${template.id}`);
    const result = await deleteLogisticsRouteTemplateAction({ templateId: template.id });
    setBusy(null);

    if (!result.ok) {
      notify.error(result.error);
      return;
    }

    setTemplates((current) => current.filter((entry) => entry.id !== template.id));
    notify.success("Ruta semanal eliminada");
    onCatalogChange?.();
  }

  return (
    <div className="grid gap-4">
      <section className="overflow-hidden rounded-xl border border-black bg-surface-panel">
        <div className="border-b border-black bg-surface-card-header px-4 py-3">
          <p className="text-base font-black text-[#f8fafc]">Calendario de rutas</p>
          <p className="mt-0.5 text-xs font-bold text-slate-500">
            Verde significa disponible para dejar y recoger cajas.
          </p>
        </div>
        <div className="grid gap-2 p-3 sm:grid-cols-2 xl:grid-cols-7">
          {logisticsWeekdayKeys.map((day, index) => {
            const enabled = enabledDays.includes(day);
            const selected = selectedDay === index;
            const weekdaySchedule = weekdayScheduleByWeekday[index];
            const routeCount = templates.filter(
              (template) => template.weekday === index,
            ).length;
            const editingSchedule = editingDaySchedule === index;

            return (
              <article
                key={day}
                className={`grid min-h-32 gap-3 rounded-lg border p-3 transition ${
                  enabled
                    ? "border-emerald-600 bg-emerald-950/35"
                    : "border-black bg-surface-inset"
                } ${selected ? "ring-2 ring-sky-400/60" : ""}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedDay(index)}
                    className="min-w-0 text-left"
                    aria-pressed={selected}
                  >
                    <span className="block text-sm font-black text-[#f8fafc]">{day}</span>
                    <span className={`mt-0.5 block text-[11px] font-bold ${enabled ? "text-emerald-200" : "text-slate-500"}`}>
                      {enabled ? "Disponible" : "No disponible"}
                    </span>
                  </button>
                  {canManage ? (
                    <button
                      type="button"
                      role="switch"
                      aria-checked={enabled}
                      aria-label={`${enabled ? "Desactivar" : "Activar"} ${weekdayNames[index]}`}
                      disabled={busy === `day:${index}`}
                      onClick={() => void toggleDay(index)}
                      className={`inline-flex h-6 w-10 shrink-0 items-center rounded-full border p-0.5 transition disabled:opacity-50 ${
                        enabled ? "border-emerald-300 bg-emerald-400" : "border-black bg-surface-card"
                      }`}
                    >
                      <span className={`h-4 w-4 rounded-full bg-slate-950 transition ${enabled ? "translate-x-4" : ""}`} />
                    </button>
                  ) : null}
                </div>
                {enabled ? (
                  <div className="grid gap-1.5 border-t border-black/60 pt-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-black uppercase text-slate-500">
                        Horario general
                      </span>
                      {!editingSchedule && canManage ? (
                        <button
                          type="button"
                          className="text-[10px] font-black text-emerald-300 hover:text-emerald-200"
                          onClick={() => openDaySchedule(index)}
                        >
                          {weekdaySchedule?.startTime ? "Editar" : "Configurar"}
                        </button>
                      ) : null}
                    </div>
                    {editingSchedule ? (
                      <div className="grid gap-1.5">
                        <div className="grid grid-cols-2 gap-1.5">
                          <label className="grid min-w-0 gap-1">
                            <span className="text-[9px] font-black uppercase text-slate-500">
                              Inicio
                            </span>
                            <TimePickerInput
                              value={dayScheduleStart}
                              ariaLabel={`Inicio del horario general de ${weekdayNames[index]}`}
                              onChange={setDayScheduleStart}
                              disabled={busy === `schedule:${index}`}
                              shellClassName="!px-1.5"
                            />
                          </label>
                          <label className="grid min-w-0 gap-1">
                            <span className="text-[9px] font-black uppercase text-slate-500">
                              Fin
                            </span>
                            <TimePickerInput
                              value={dayScheduleEnd}
                              ariaLabel={`Fin del horario general de ${weekdayNames[index]}`}
                              onChange={setDayScheduleEnd}
                              disabled={busy === `schedule:${index}`}
                              shellClassName="!px-1.5"
                            />
                          </label>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            type="button"
                            className={`${primaryButtonClass} !h-8 px-2 text-[10px]`}
                            disabled={busy === `schedule:${index}`}
                            onClick={() => void saveDaySchedule(index)}
                          >
                            {busy === `schedule:${index}` ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Check className="h-3.5 w-3.5" />
                            )}
                            Guardar
                          </button>
                          <button
                            type="button"
                            className={`${secondaryButtonClass} !h-8 px-2 text-[10px]`}
                            disabled={busy === `schedule:${index}`}
                            onClick={() => setEditingDaySchedule(null)}
                          >
                            <X className="h-3.5 w-3.5" />
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={!canManage}
                        onClick={() => openDaySchedule(index)}
                        className="min-h-8 rounded-md border border-black bg-surface-inset px-2 text-left text-[11px] font-black text-slate-200 disabled:cursor-default"
                      >
                        {weekdaySchedule?.startTime && weekdaySchedule.estimatedEndTime
                          ? `${formatTime12Hour(weekdaySchedule.startTime)}–${formatTime12Hour(weekdaySchedule.estimatedEndTime)}`
                          : "Sin configurar"}
                      </button>
                    )}
                  </div>
                ) : null}
                <button
                  type="button"
                  onClick={() => setSelectedDay(index)}
                  className="mt-auto flex items-center justify-between border-t border-black/60 pt-2 text-left text-[11px] font-black text-slate-400"
                >
                  {routeCount} {routeCount === 1 ? "ruta" : "rutas"}
                  <span className="text-slate-200">Gestionar</span>
                </button>
                <div className="grid gap-1 border-t border-black/60 pt-2">
                  <span className="text-[10px] font-black uppercase text-slate-500">Conductor por defecto</span>
                  <InlineSearchPicker
                    value={defaultDriverByWeekday[index] || ""}
                    onChange={(driverId) => void setDefaultDriver(index, driverId || null)}
                    options={driverOptions}
                    placeholder="Sin conductor"
                    searchPlaceholder="Buscar conductor..."
                    emptyLabel="Sin conductores"
                    ariaLabel={`Conductor predeterminado de ${weekdayNames[index]}`}
                    disabled={!canManage || busy === `driver:${index}`}
                    className="w-full min-w-0"
                    minWidthClass="w-full min-w-0"
                  />
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-black bg-surface-panel">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-black bg-surface-card-header px-4 py-3">
          <div>
            <p className="text-base font-black text-[#f8fafc]">Subrutas del {weekdayNames[selectedDay]}</p>
            <p className="mt-0.5 text-xs font-bold text-slate-500">
              {selectedDayEnabled
                ? "El horario general se configura en la tarjeta del día. Aquí administra las rutas con nombre."
                : "Estas rutas quedan guardadas, pero el dia no esta disponible."}
            </p>
          </div>
          {canManage && selectedDayEnabled ? (
            <button
              type="button"
              className={`${primaryButtonClass} h-9 px-3 text-xs`}
              onClick={() => {
                setDraftName("");
                setDraftStartTime("");
                setDraftEstimatedEndTime("");
                setCreating((current) => !current);
              }}
            >
              <PlusCircle className="h-4 w-4" />
              Nueva subruta
            </button>
          ) : null}
        </div>

        {creating ? (
          <form
            className="grid gap-2 border-b border-black bg-surface-inset p-3 sm:grid-cols-[minmax(12rem,1fr)_9rem_9rem_auto_auto] sm:items-end"
            onSubmit={(event) => {
              event.preventDefault();
              void createRoute(draftName);
            }}
          >
            <label className="grid min-w-[14rem] flex-1 gap-1">
              <span className="text-[10px] font-black uppercase text-slate-500">Nombre de la ruta</span>
              <input
                autoFocus
                className="h-9 rounded-lg border border-black bg-surface-card px-3 text-sm font-bold text-[#f8fafc] outline-none"
                placeholder="Ej. Riverside"
                value={draftName}
                onChange={(event) => setDraftName(event.target.value)}
              />
            </label>
            <label className="grid gap-1">
              <span className="text-[10px] font-black uppercase text-slate-500">Hora de inicio</span>
              <TimePickerInput
                value={draftStartTime}
                ariaLabel="Hora de inicio de la ruta"
                onChange={setDraftStartTime}
              />
            </label>
            <label className="grid gap-1">
              <span className="text-[10px] font-black uppercase text-slate-500">Fin estimado</span>
              <TimePickerInput
                value={draftEstimatedEndTime}
                ariaLabel="Fin estimado de la ruta"
                onChange={setDraftEstimatedEndTime}
              />
            </label>
            <button type="submit" className={`${primaryButtonClass} h-9 px-3 text-xs`} disabled={busy === "create" || !draftName.trim()}>
              Crear subruta
            </button>
            <button
              type="button"
              className={`${secondaryButtonClass} h-9 px-3 text-xs`}
              onClick={() => setCreating(false)}
            >
              Cancelar
            </button>
          </form>
        ) : null}

        <div className="grid gap-2 p-3 md:grid-cols-2 xl:grid-cols-3">
          {selectedTemplates.length ? (
            selectedTemplates.map((template) => {
              const editing = editingTemplate?.id === template.id;
              return (
                <article key={template.id} className="flex min-h-20 items-center gap-3 rounded-lg border border-black bg-surface-card px-3 py-2.5">
                  <Route className="h-5 w-5 shrink-0 text-emerald-300" aria-hidden />
                  <div className="min-w-0 flex-1">
                    {editing ? (
                      <div className="grid gap-2">
                        <input
                          className="h-8 w-full rounded-md border border-sky-500 bg-surface-inset px-2 text-sm font-black text-[#f8fafc] outline-none"
                          value={editingTemplate.name}
                          onChange={(event) =>
                            setEditingTemplate((current) =>
                              current ? { ...current, name: event.target.value } : current,
                            )
                          }
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <label className="grid gap-1">
                            <span className="text-[10px] font-black uppercase text-slate-500">Inicio</span>
                            <TimePickerInput
                              value={editingTemplate.startTime}
                              ariaLabel={`Hora de inicio de ${editingTemplate.name}`}
                              onChange={(event) =>
                                setEditingTemplate((current) =>
                                  current ? { ...current, startTime: event } : current,
                                )
                              }
                            />
                          </label>
                          <label className="grid gap-1">
                            <span className="text-[10px] font-black uppercase text-slate-500">Fin estimado</span>
                            <TimePickerInput
                              value={editingTemplate.estimatedEndTime}
                              ariaLabel={`Fin estimado de ${editingTemplate.name}`}
                              onChange={(event) =>
                                setEditingTemplate((current) =>
                                  current ? { ...current, estimatedEndTime: event } : current,
                                )
                              }
                            />
                          </label>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="truncate text-sm font-black text-[#f8fafc]">{template.name}</p>
                        <p className="mt-1 text-xs font-bold text-slate-300">
                          {template.startTime && template.estimatedEndTime
                            ? `Horario: ${formatTime12Hour(template.startTime)} · fin estimado ${formatTime12Hour(template.estimatedEndTime)}`
                            : "Horario operativo pendiente de configurar"}
                        </p>
                      </>
                    )}
                    <p className="mt-0.5 text-xs font-bold text-slate-500">Ruta semanal</p>
                  </div>
                  {canManage ? (
                    <div className="flex shrink-0 gap-1">
                      {editing ? (
                        <button type="button" className={`${secondaryButtonClass} h-8 w-8 p-0`} aria-label="Guardar ruta" onClick={() => void saveRename()}>
                          <Check className="h-4 w-4" />
                        </button>
                      ) : (
                        <button type="button" className={`${secondaryButtonClass} h-8 w-8 p-0`} aria-label={`Renombrar ${template.name}`} onClick={() => setEditingTemplate(template)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button type="button" className={`${secondaryButtonClass} h-8 w-8 p-0 text-rose-200 disabled:opacity-50`} aria-label={`Eliminar ${template.name}`} disabled={busy === `delete:${template.id}`} onClick={() => void removeRoute(template)}>
                        {busy === `delete:${template.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  ) : null}
                </article>
              );
            })
          ) : (
            <div className="flex min-h-32 items-center justify-center rounded-lg border border-dashed border-black bg-surface-inset px-4 text-center md:col-span-2 xl:col-span-3">
              <div>
                <Route className="mx-auto h-7 w-7 text-slate-600" />
                <p className="mt-2 text-sm font-black text-slate-300">Sin subrutas para este día</p>
                <p className="mt-1 text-xs font-bold text-slate-500">
                  {selectedDayEnabled ? "El día funciona como ruta general. Crea subrutas sólo si necesitas dividirlo." : "Activa el día para crear subrutas."}
                </p>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
