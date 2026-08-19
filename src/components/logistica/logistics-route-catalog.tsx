"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Loader2, Pencil, PlusCircle, Route, Trash2, X } from "lucide-react";
import {
  activateLogisticsRouteWeekdayAction,
  createLogisticsRouteTemplateAction,
  deleteLogisticsRouteTemplateAction,
  setLogisticsRouteTemplateDefaultDriverAction,
  setLogisticsWeekdayDefaultDriverAction,
  setLogisticsWeekdayCapacityAction,
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
  const [draftWithoutEnd, setDraftWithoutEnd] = useState(false);
  const [draftLimitsCapacity, setDraftLimitsCapacity] = useState(false);
  const [draftMaxStops, setDraftMaxStops] = useState("");
  const [draftMaxBoxes, setDraftMaxBoxes] = useState("");
  const [draftZoneKey, setDraftZoneKey] = useState("");
  const [draftPostalCodes, setDraftPostalCodes] = useState("");
  const [editingDaySchedule, setEditingDaySchedule] = useState<number | null>(null);
  const [activatingDay, setActivatingDay] = useState<number | null>(null);
  const [dayScheduleStart, setDayScheduleStart] = useState("");
  const [dayScheduleEnd, setDayScheduleEnd] = useState("");
  const [dayWithoutEnd, setDayWithoutEnd] = useState(false);
  const [dayLimitsCapacity, setDayLimitsCapacity] = useState(false);
  const [dayMaxStops, setDayMaxStops] = useState("");
  const [dayMaxBoxes, setDayMaxBoxes] = useState("");
  const [editingTemplate, setEditingTemplate] = useState<LogisticsRouteTemplateRow | null>(null);
  const [editingTemplateWithoutEnd, setEditingTemplateWithoutEnd] = useState(false);
  const [editingTemplateLimitsCapacity, setEditingTemplateLimitsCapacity] = useState(false);
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

  async function setTemplateDefaultDriver(
    template: LogisticsRouteTemplateRow,
    driverId: string | null,
  ) {
    if (!canManage) return;

    setBusy(`template-driver:${template.id}`);
    const result = await setLogisticsRouteTemplateDefaultDriverAction({
      templateId: template.id,
      driverId,
    });
    setBusy(null);
    if (!result.ok) {
      notify.error(result.error);
      return;
    }

    setTemplates((current) =>
      current.map((entry) => (entry.id === result.data.id ? result.data : entry)),
    );
    notify.success(
      result.data.defaultDriverId
        ? "Conductor de ruta actualizado"
        : "Conductor de ruta eliminado",
    );
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
    if (activatingDay === day) {
      setActivatingDay(null);
      setEditingDaySchedule(null);
      return;
    }

    const enabled = !enabledDays.includes(key);
    if (enabled) {
      setSelectedDay(day);
      setDayScheduleStart("");
      setDayScheduleEnd("");
      setDayWithoutEnd(false);
      setDayLimitsCapacity(false);
      setDayMaxStops("");
      setDayMaxBoxes("");
      setActivatingDay(day);
      setEditingDaySchedule(day);
      return;
    }
    setBusy(`day:${day}`);
    const result = await setLogisticsRouteWeekdayEnabledAction({ day: key, enabled });
    setBusy(null);

    if (!result.ok) {
      notify.error(result.error);
      return;
    }

    setEnabledDays(result.data);
    setSelectedDay(day);
    setActivatingDay(null);
    setEditingDaySchedule(null);
    notify.success(enabled ? `${weekdayNames[day]} disponible` : `${weekdayNames[day]} no disponible`);
    onCatalogChange?.();
  }

  function openDaySchedule(day: number) {
    const existing = weekdayScheduleByWeekday[day];
    setSelectedDay(day);
    setDayScheduleStart(existing?.startTime || "");
    setDayScheduleEnd(existing?.estimatedEndTime || "");
    setDayWithoutEnd(!existing?.estimatedEndTime);
    setDayLimitsCapacity(Boolean(existing?.maxStops || existing?.maxBoxes));
    setDayMaxStops(existing?.maxStops ? String(existing.maxStops) : "");
    setDayMaxBoxes(existing?.maxBoxes ? String(existing.maxBoxes) : "");
    setActivatingDay(null);
    setEditingDaySchedule(day);
  }

  async function saveDaySchedule(day: number) {
    if (!dayScheduleStart) {
      notify.error("La hora de inicio es obligatoria");
      return;
    }
    if (!dayWithoutEnd && (!dayScheduleEnd || dayScheduleStart >= dayScheduleEnd)) {
      notify.error("La hora de fin debe ser posterior a la hora de inicio");
      return;
    }

    const maxStops = dayLimitsCapacity ? dayMaxStops : null;
    const maxBoxes = dayLimitsCapacity ? dayMaxBoxes : null;

    setBusy(`schedule:${day}`);
    if (activatingDay === day) {
      const activationResult = await activateLogisticsRouteWeekdayAction({
        weekday: day,
        startTime: dayScheduleStart,
        estimatedEndTime: dayWithoutEnd ? null : dayScheduleEnd,
        maxStops,
        maxBoxes,
      });
      setBusy(null);
      if (!activationResult.ok) {
        notify.error(activationResult.error);
        return;
      }
      setEnabledDays(activationResult.data.enabledDays);
      setWeekdayScheduleByWeekday((current) =>
        current.map((schedule, index) => (index === day ? activationResult.data.schedule : schedule)),
      );
      setActivatingDay(null);
      setEditingDaySchedule(null);
      notify.success(`Ruta del ${weekdayNames[day]} activada`);
      onCatalogChange?.();
      return;
    }
    const [result, capacityResult] = await Promise.all([
      setLogisticsWeekdayScheduleAction({ weekday: day, startTime: dayScheduleStart, estimatedEndTime: dayWithoutEnd ? null : dayScheduleEnd }),
      setLogisticsWeekdayCapacityAction({ weekday: day, maxStops, maxBoxes }),
    ]);
    setBusy(null);

    if (!result.ok) {
      notify.error(result.error);
      return;
    }
    if (!capacityResult.ok) {
      notify.error(capacityResult.error);
      return;
    }
    setWeekdayScheduleByWeekday((current) =>
      current.map((schedule, index) => (index === day ? {
        ...result.data,
        ...capacityResult.data,
      } : schedule)),
    );
    setEditingDaySchedule(null);
    notify.success(`Horario general de ${weekdayNames[day]} guardado`);
    onCatalogChange?.();
  }

  async function createRoute(name: string, startTime = draftStartTime, estimatedEndTime = draftEstimatedEndTime) {
    const trimmed = name.trim();
    if (!trimmed || !startTime || (!draftWithoutEnd && !estimatedEndTime)) {
      notify.error("Completa el nombre y la hora de inicio de la ruta");
      return;
    }

    setBusy("create");
    const result = await createLogisticsRouteTemplateAction({
      weekday: selectedDay,
      name: trimmed,
      startTime,
      estimatedEndTime: draftWithoutEnd ? null : estimatedEndTime,
      maxStops: draftLimitsCapacity ? draftMaxStops : null,
      maxBoxes: draftLimitsCapacity ? draftMaxBoxes : null,
      zoneKey: draftZoneKey,
      coveredPostalCodes: draftPostalCodes,
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
    setDraftWithoutEnd(false);
    setDraftLimitsCapacity(false);
    setDraftMaxStops("");
    setDraftMaxBoxes("");
    setDraftZoneKey("");
    setDraftPostalCodes("");
    setCreating(false);
    notify.success("Ruta semanal creada");
    onCatalogChange?.();
  }

  async function saveRename() {
    if (!editingTemplate) {
      return;
    }

    const name = editingTemplate.name.trim();
    if (!name || !editingTemplate.startTime || (!editingTemplateWithoutEnd && !editingTemplate.estimatedEndTime)) {
      notify.error("Completa el nombre y la hora de inicio de la ruta");
      return;
    }

    setBusy(`edit:${editingTemplate.id}`);
    const result = await updateLogisticsRouteTemplateAction({
      templateId: editingTemplate.id,
      name,
      startTime: editingTemplate.startTime,
      estimatedEndTime: editingTemplateWithoutEnd ? null : editingTemplate.estimatedEndTime,
      maxStops: editingTemplateLimitsCapacity ? editingTemplate.maxStops : null,
      maxBoxes: editingTemplateLimitsCapacity ? editingTemplate.maxBoxes : null,
      zoneKey: editingTemplate.zoneKey,
      coveredPostalCodes: editingTemplate.coveredPostalCodes,
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
    setEditingTemplateWithoutEnd(false);
    setEditingTemplateLimitsCapacity(false);
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
        <div className="grid items-start gap-2 p-3 sm:grid-cols-2 xl:grid-cols-7">
          {logisticsWeekdayKeys.map((day, index) => {
            const enabled = enabledDays.includes(day);
            const selected = selectedDay === index;
            const weekdaySchedule = weekdayScheduleByWeekday[index];
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
                      {enabled ? "Disponible" : activatingDay === index ? "Completa el horario" : "No disponible"}
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
                {enabled || editingSchedule ? (
                  <div className="grid gap-1.5 border-t border-black/60 pt-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-black uppercase text-slate-500">
                        {activatingDay === index ? "Horario obligatorio" : "Horario general"}
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
                              disabled={dayWithoutEnd || busy === `schedule:${index}`}
                              shellClassName="!px-1.5"
                            />
                          </label>
                        </div>
                        <label className="flex items-center gap-2 rounded-md border border-black bg-surface-inset px-2 py-1.5 text-[10px] font-black text-slate-300">
                          <input
                            type="checkbox"
                            checked={dayWithoutEnd}
                            onChange={(event) => {
                              setDayWithoutEnd(event.target.checked);
                              if (event.target.checked) setDayScheduleEnd("");
                            }}
                            className="h-3.5 w-3.5 accent-emerald-400"
                          />
                          Sin hora de fin · hasta terminar la ruta
                        </label>
                        <label className="flex items-center gap-2 rounded-md border border-black bg-surface-inset px-2 py-1.5 text-[10px] font-black text-slate-300">
                          <input
                            type="checkbox"
                            checked={dayLimitsCapacity}
                            onChange={(event) => {
                              setDayLimitsCapacity(event.target.checked);
                              if (!event.target.checked) {
                                setDayMaxStops("");
                                setDayMaxBoxes("");
                              }
                            }}
                            className="h-3.5 w-3.5 accent-emerald-400"
                          />
                          Limitar paradas y cajas
                        </label>
                        {dayLimitsCapacity ? (
                          <div className="grid grid-cols-2 gap-1.5">
                            <label className="grid min-w-0 gap-1"><span className="text-[9px] font-black uppercase text-slate-500">Max. paradas</span><input type="number" min="1" value={dayMaxStops} onChange={(event) => setDayMaxStops(event.target.value)} className="h-8 w-full min-w-0 max-w-full rounded-md border border-black bg-surface-inset px-2 text-xs font-bold text-white" /></label>
                            <label className="grid min-w-0 gap-1"><span className="text-[9px] font-black uppercase text-slate-500">Max. cajas</span><input type="number" min="1" value={dayMaxBoxes} onChange={(event) => setDayMaxBoxes(event.target.value)} className="h-8 w-full min-w-0 max-w-full rounded-md border border-black bg-surface-inset px-2 text-xs font-bold text-white" /></label>
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <>
                        <button
                          type="button"
                          disabled={!canManage}
                          onClick={() => openDaySchedule(index)}
                          className="min-h-8 rounded-md border border-black bg-surface-inset px-2 text-left text-[11px] font-black text-slate-200 disabled:cursor-default"
                        >
                          {weekdaySchedule?.startTime
                            ? weekdaySchedule.estimatedEndTime
                              ? `${formatTime12Hour(weekdaySchedule.startTime)}–${formatTime12Hour(weekdaySchedule.estimatedEndTime)}`
                              : `${formatTime12Hour(weekdaySchedule.startTime)} · hasta terminar`
                            : "Sin configurar"}
                        </button>
                      </>
                    )}
                  </div>
                ) : null}
                {editingSchedule ? (
                  <div className="grid grid-cols-2 gap-1.5 border-t border-black/60 pt-2">
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
                      {activatingDay === index ? "Activar" : "Guardar"}
                    </button>
                    <button
                      type="button"
                      className={`${secondaryButtonClass} !h-8 px-2 text-[10px]`}
                      disabled={busy === `schedule:${index}`}
                      onClick={() => {
                        setEditingDaySchedule(null);
                        setActivatingDay(null);
                      }}
                    >
                      <X className="h-3.5 w-3.5" />
                      Cancelar
                    </button>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-black bg-surface-panel">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-black bg-surface-card-header px-4 py-3">
          <div>
            <p className="text-base font-black text-[#f8fafc]">Rutas del {weekdayNames[selectedDay]}</p>
            <p className="mt-0.5 text-xs font-bold text-slate-500">
              {selectedDayEnabled
                ? "El horario general se configura en la tarjeta del día. Aquí administra las rutas con nombre."
                : "Aquí puedes administrar sus rutas; no se usarán hasta activar el día."}
            </p>
          </div>
          {canManage ? (
            <button
              type="button"
              className={`${primaryButtonClass} h-9 px-3 text-xs`}
              onClick={() => {
                setDraftName("");
                setDraftStartTime("");
                setDraftEstimatedEndTime("");
                setDraftWithoutEnd(false);
                setDraftLimitsCapacity(false);
                setDraftMaxStops("");
                setDraftMaxBoxes("");
                setDraftZoneKey("");
                setDraftPostalCodes("");
                setCreating((current) => !current);
              }}
            >
              <PlusCircle className="h-4 w-4" />
              Nueva ruta
            </button>
          ) : null}
        </div>

        {selectedTemplates.length === 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black bg-surface-inset px-4 py-3">
            <div className="min-w-0">
              <p className="text-xs font-black text-slate-200">Conductor de la ruta general</p>
              <p className="mt-0.5 text-[11px] font-bold text-slate-500">
                Se usa únicamente mientras este día no tenga rutas específicas.
              </p>
            </div>
            <InlineSearchPicker
              value={defaultDriverByWeekday[selectedDay] || ""}
              onChange={(driverId) => void setDefaultDriver(selectedDay, driverId || null)}
              options={driverOptions}
              placeholder="Sin conductor"
              searchPlaceholder="Buscar conductor..."
              emptyLabel="Sin conductores"
              ariaLabel={`Conductor de la ruta general del ${weekdayNames[selectedDay]}`}
              disabled={!canManage || busy === `driver:${selectedDay}`}
              className="w-full sm:w-72"
              minWidthClass="w-full sm:w-72"
            />
          </div>
        ) : null}

        {creating ? (
          <form
            className="grid gap-2 border-b border-black bg-surface-inset p-3 sm:grid-cols-2 xl:grid-cols-4 xl:items-end"
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
            <label className="grid gap-1"><span className="text-[10px] font-black uppercase text-slate-500">Zona</span><input value={draftZoneKey} onChange={(event) => setDraftZoneKey(event.target.value)} className="h-9 rounded-lg border border-black bg-surface-card px-3 text-sm font-bold text-white" placeholder="Ej. Riverside" /></label>
            <label className="grid gap-1 xl:col-span-2"><span className="text-[10px] font-black uppercase text-slate-500">Codigos postales</span><input value={draftPostalCodes} onChange={(event) => setDraftPostalCodes(event.target.value)} className="h-9 rounded-lg border border-black bg-surface-card px-3 text-sm font-bold text-white" placeholder="92501, 92503, 92507" /></label>
            <label className="grid gap-1">
              <span className="text-[10px] font-black uppercase text-slate-500">Fin estimado</span>
              <TimePickerInput
                value={draftEstimatedEndTime}
                ariaLabel="Fin estimado de la ruta"
                onChange={setDraftEstimatedEndTime}
                disabled={draftWithoutEnd}
              />
            </label>
            <label className="flex h-9 items-center gap-2 rounded-lg border border-black bg-surface-card px-3 text-xs font-black text-slate-300">
              <input
                type="checkbox"
                checked={draftWithoutEnd}
                onChange={(event) => {
                  setDraftWithoutEnd(event.target.checked);
                  if (event.target.checked) setDraftEstimatedEndTime("");
                }}
                className="h-4 w-4 accent-emerald-400"
              />
              Sin hora de fin
            </label>
            <label className="flex h-9 items-center gap-2 rounded-lg border border-black bg-surface-card px-3 text-xs font-black text-slate-300 xl:col-span-2">
              <input
                type="checkbox"
                checked={draftLimitsCapacity}
                onChange={(event) => {
                  setDraftLimitsCapacity(event.target.checked);
                  if (!event.target.checked) {
                    setDraftMaxStops("");
                    setDraftMaxBoxes("");
                  }
                }}
                className="h-4 w-4 accent-emerald-400"
              />
              Limitar paradas y cajas
            </label>
            {draftLimitsCapacity ? (
              <div className="grid gap-2 sm:grid-cols-2 xl:col-span-2">
                <label className="grid min-w-0 gap-1"><span className="text-[10px] font-black uppercase text-slate-500">Max. paradas</span><input type="number" min="1" value={draftMaxStops} onChange={(event) => setDraftMaxStops(event.target.value)} className="h-9 w-full min-w-0 max-w-full rounded-lg border border-black bg-surface-card px-3 text-sm font-bold text-white" /></label>
                <label className="grid min-w-0 gap-1"><span className="text-[10px] font-black uppercase text-slate-500">Max. cajas</span><input type="number" min="1" value={draftMaxBoxes} onChange={(event) => setDraftMaxBoxes(event.target.value)} className="h-9 w-full min-w-0 max-w-full rounded-lg border border-black bg-surface-card px-3 text-sm font-bold text-white" /></label>
              </div>
            ) : null}
            <button type="submit" className={`${primaryButtonClass} h-9 px-3 text-xs`} disabled={busy === "create" || !draftName.trim() || !draftStartTime || (!draftWithoutEnd && !draftEstimatedEndTime)}>
              Crear ruta
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
              const routeDetails = [
                template.zoneKey ? `Zona ${template.zoneKey}` : "",
                template.maxStops ? `${template.maxStops} paradas` : "",
                template.maxBoxes ? `${template.maxBoxes} cajas` : "",
                template.coveredPostalCodes?.length ? `CP ${template.coveredPostalCodes.join(", ")}` : "",
              ].filter(Boolean).join(" · ");
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
                              disabled={editingTemplateWithoutEnd}
                            />
                          </label>
                        </div>
                        <label className="flex items-center gap-2 rounded-md border border-black bg-surface-inset px-2 py-1.5 text-[10px] font-black text-slate-300">
                          <input
                            type="checkbox"
                            checked={editingTemplateWithoutEnd}
                            onChange={(event) => {
                              setEditingTemplateWithoutEnd(event.target.checked);
                              if (event.target.checked) {
                                setEditingTemplate((current) => current ? { ...current, estimatedEndTime: "" } : current);
                              }
                            }}
                            className="h-3.5 w-3.5 accent-emerald-400"
                          />
                          Sin hora de fin · hasta terminar
                        </label>
                        <label className="flex items-center gap-2 rounded-md border border-black bg-surface-inset px-2 py-1.5 text-[10px] font-black text-slate-300">
                          <input
                            type="checkbox"
                            checked={editingTemplateLimitsCapacity}
                            onChange={(event) => {
                              setEditingTemplateLimitsCapacity(event.target.checked);
                              if (!event.target.checked) {
                                setEditingTemplate((current) => current ? { ...current, maxStops: null, maxBoxes: null } : current);
                              }
                            }}
                            className="h-3.5 w-3.5 accent-emerald-400"
                          />
                          Limitar paradas y cajas
                        </label>
                        {editingTemplateLimitsCapacity ? (
                          <div className="grid grid-cols-2 gap-2">
                            <label className="grid min-w-0 gap-1"><span className="text-[10px] font-black uppercase text-slate-500">Max. paradas</span><input type="number" min="1" value={editingTemplate.maxStops || ""} onChange={(event) => setEditingTemplate((current) => current ? { ...current, maxStops: event.target.value ? Number(event.target.value) : null } : current)} className="h-8 w-full min-w-0 max-w-full rounded-md border border-black bg-surface-inset px-2 text-xs font-bold text-white" /></label>
                            <label className="grid min-w-0 gap-1"><span className="text-[10px] font-black uppercase text-slate-500">Max. cajas</span><input type="number" min="1" value={editingTemplate.maxBoxes || ""} onChange={(event) => setEditingTemplate((current) => current ? { ...current, maxBoxes: event.target.value ? Number(event.target.value) : null } : current)} className="h-8 w-full min-w-0 max-w-full rounded-md border border-black bg-surface-inset px-2 text-xs font-bold text-white" /></label>
                          </div>
                        ) : null}
                        <input value={editingTemplate.zoneKey || ""} onChange={(event) => setEditingTemplate((current) => current ? { ...current, zoneKey: event.target.value } : current)} placeholder="Zona" className="h-8 rounded-md border border-black bg-surface-inset px-2 text-xs font-bold text-white" />
                        <input value={(editingTemplate.coveredPostalCodes || []).join(", ")} onChange={(event) => setEditingTemplate((current) => current ? { ...current, coveredPostalCodes: event.target.value.split(/[\s,;]+/).filter(Boolean) } : current)} placeholder="Codigos postales" className="h-8 rounded-md border border-black bg-surface-inset px-2 text-xs font-bold text-white" />
                      </div>
                    ) : (
                      <>
                        <p className="truncate text-sm font-black text-[#f8fafc]">{template.name}</p>
                        <p className="mt-1 text-xs font-bold text-slate-300">
                          {template.startTime
                            ? template.estimatedEndTime
                              ? `Horario: ${formatTime12Hour(template.startTime)} · fin estimado ${formatTime12Hour(template.estimatedEndTime)}`
                              : `Inicio ${formatTime12Hour(template.startTime)} · hasta terminar la ruta`
                            : "Horario operativo pendiente de configurar"}
                        </p>
                        {routeDetails ? <p className="mt-0.5 truncate text-xs font-bold text-slate-500">{routeDetails}</p> : null}
                      </>
                    )}
                    <p className="mt-0.5 text-xs font-bold text-slate-500">Ruta semanal</p>
                    <div className="mt-2 grid gap-1 border-t border-black/60 pt-2">
                      <span className="text-[10px] font-black uppercase text-slate-500">
                        Conductor por defecto
                      </span>
                      <InlineSearchPicker
                        value={template.defaultDriverId || ""}
                        onChange={(driverId) =>
                          void setTemplateDefaultDriver(template, driverId || null)
                        }
                        options={driverOptions}
                        placeholder="Sin conductor"
                        searchPlaceholder="Buscar conductor..."
                        emptyLabel="Sin conductores"
                        ariaLabel={`Conductor predeterminado de ${template.name}`}
                        disabled={!canManage || busy === `template-driver:${template.id}`}
                        className="w-full min-w-0"
                        minWidthClass="w-full min-w-0"
                      />
                    </div>
                  </div>
                  {canManage ? (
                    <div className="flex shrink-0 gap-1">
                      {editing ? (
                        <button type="button" className={`${secondaryButtonClass} h-8 w-8 p-0`} aria-label="Guardar ruta" onClick={() => void saveRename()}>
                          <Check className="h-4 w-4" />
                        </button>
                      ) : (
                        <button type="button" className={`${secondaryButtonClass} h-8 w-8 p-0`} aria-label={`Editar ${template.name}`} onClick={() => {
                          setEditingTemplate(template);
                          setEditingTemplateWithoutEnd(!template.estimatedEndTime);
                          setEditingTemplateLimitsCapacity(Boolean(template.maxStops || template.maxBoxes));
                        }}>
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
                <p className="mt-2 text-sm font-black text-slate-300">Sin rutas para este día</p>
                <p className="mt-1 text-xs font-bold text-slate-500">
                  {selectedDayEnabled
                    ? "El día funciona como ruta general. Crea rutas sólo si necesitas dividirlo."
                    : "Crea una ruta aquí; quedará guardada hasta que actives el día."}
                </p>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
