"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Plus, Search, X } from "lucide-react";
import {
  listCoveragePlaceChildrenAction,
  resolveCoveragePlaceDetailsAction,
  searchCoveragePlacesAction,
} from "@/app/actions/logistics-routes";
import { ActionConfirmDialog } from "@/components/action-confirm-dialog";
import { secondaryButtonClass } from "@/components/ui-blocks";
import { useNotify } from "@/hooks/use-notify";
import type { RouteCoveragePlace } from "@/lib/logistics-route-coverage";
import { nextCoveragePlaceColor, normalizeCoveragePlaceColor } from "@/lib/logistics-route-coverage";

type PlaceSuggestion = {
  placeId: string;
  displayName: string;
  secondaryText: string;
  kind: "locality" | "neighborhood" | "sublocality";
};

function rootsFromPlaces(places: RouteCoveragePlace[]) {
  return places.filter((place) => place.selectionRole === "root_whole" || place.selectionRole === "root_partial");
}

function childrenForRoot(places: RouteCoveragePlace[], rootPlaceId: string) {
  return places.filter(
    (place) => place.selectionRole === "child_included" && place.parentPlaceId === rootPlaceId,
  );
}

export function GeographicRoutePlacesEditor({
  places,
  onChange,
  canManage,
  defaultColor = "#10b981",
  highlightedPlaceId = null,
  onHighlightPlaceId,
  onProposePlace,
  compact = false,
  rootOnly = false,
}: {
  places: RouteCoveragePlace[];
  onChange: (next: RouteCoveragePlace[] | ((current: RouteCoveragePlace[]) => RouteCoveragePlace[])) => void;
  canManage: boolean;
  defaultColor?: string;
  highlightedPlaceId?: string | null;
  onHighlightPlaceId?: (placeId: string | null) => void;
  /** When set, choosing a suggestion previews the perimeter instead of adding immediately. */
  onProposePlace?: (place: RouteCoveragePlace) => void;
  /** Denser chrome for nested panels (e.g. expanded subroute). */
  compact?: boolean;
  /** Show only the root city in compact coverage summaries, without child chips or counts. */
  rootOnly?: boolean;
}) {
  const notify = useNotify();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [searchBusy, setSearchBusy] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [expandedRootId, setExpandedRootId] = useState<string | null>(null);
  const [childBusyRootId, setChildBusyRootId] = useState("");
  const [availableChildren, setAvailableChildren] = useState<Record<string, PlaceSuggestion[]>>({});
  const [childQuery, setChildQuery] = useState("");
  const [pendingRemoveRoot, setPendingRemoveRoot] = useState<{
    placeId: string;
    displayName: string;
  } | null>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const colorUpdateTimerRef = useRef<number | null>(null);
  const roots = useMemo(() => rootsFromPlaces(places), [places]);
  const normalizedDefaultColor = useMemo(
    () => normalizeCoveragePlaceColor(defaultColor),
    [defaultColor],
  );

  const updatePlaceColor = useCallback((placeId: string, nextColor: string) => {
    const color = normalizeCoveragePlaceColor(nextColor, normalizedDefaultColor);
    onChange((currentPlaces) => {
      const current = currentPlaces.find((place) => place.placeId === placeId);
      if (current && normalizeCoveragePlaceColor(current.color, normalizedDefaultColor) === color) {
        return currentPlaces;
      }
      return currentPlaces.map((place) => (place.placeId === placeId ? { ...place, color } : place));
    });
  }, [normalizedDefaultColor, onChange]);

  const schedulePlaceColorUpdate = useCallback((placeId: string, nextColor: string) => {
    if (colorUpdateTimerRef.current != null) {
      window.clearTimeout(colorUpdateTimerRef.current);
    }
    colorUpdateTimerRef.current = window.setTimeout(() => {
      colorUpdateTimerRef.current = null;
      updatePlaceColor(placeId, nextColor);
    }, 120);
  }, [updatePlaceColor]);

  useEffect(() => () => {
    if (colorUpdateTimerRef.current != null) {
      window.clearTimeout(colorUpdateTimerRef.current);
    }
  }, []);

  function placeColor(place: RouteCoveragePlace) {
    return normalizeCoveragePlaceColor(place.color, normalizedDefaultColor);
  }

  function isRootHighlighted(root: RouteCoveragePlace) {
    if (!highlightedPlaceId) return false;
    if (root.placeId === highlightedPlaceId) return true;
    return childrenForRoot(places, root.placeId).some((child) => child.placeId === highlightedPlaceId);
  }

  function togglePlaceHighlight(placeId: string) {
    onHighlightPlaceId?.(highlightedPlaceId === placeId ? null : placeId);
  }

  useEffect(() => {
    if (!highlightedPlaceId) return;
    const targetRoot =
      roots.find((root) => root.placeId === highlightedPlaceId) ||
      roots.find((root) =>
        childrenForRoot(places, root.placeId).some((child) => child.placeId === highlightedPlaceId),
      );
    if (!targetRoot) return;
    const node = cardRefs.current[targetRoot.placeId];
    if (!node) return;
    const scrollParent = node.closest(".overflow-y-auto");
    if (scrollParent) {
      const parentRect = scrollParent.getBoundingClientRect();
      const nodeRect = node.getBoundingClientRect();
      if (nodeRect.top < parentRect.top || nodeRect.bottom > parentRect.bottom) {
        scrollParent.scrollTop += (nodeRect.top - parentRect.top) - 10;
      }
    }
  }, [highlightedPlaceId, places, roots]);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      setSearchBusy(true);
      setSearchError("");
      void (async () => {
        const result = await searchCoveragePlacesAction({ query: trimmed, countryCode: "us" });
        if (cancelled) return;
        setSearchBusy(false);
        if (!result.ok) {
          setSuggestions([]);
          setSearchError(result.error);
          return;
        }
        setSuggestions(result.data.suggestions);
        if (!result.data.suggestions.length) {
          setSearchError("Sin coincidencias. Prueba otro nombre en el buscador.");
        }
      })();
    }, 220);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query]);

  async function addRoot(suggestion: PlaceSuggestion) {
    if (places.some((place) => place.placeId === suggestion.placeId)) {
      setQuery("");
      setSuggestions([]);
      onHighlightPlaceId?.(suggestion.placeId);
      notify.success(`${suggestion.displayName} ya está en la cobertura`);
      return;
    }
    setSearchBusy(true);
    try {
      const result = await resolveCoveragePlaceDetailsAction({ placeId: suggestion.placeId });
      if (!result.ok) {
        notify.error(result.error);
        return;
      }
      const candidate: RouteCoveragePlace = {
        ...result.data,
        kind: result.data.kind === "locality" ? "locality" : result.data.kind,
        selectionRole: "root_whole",
        parentPlaceId: null,
        color: nextCoveragePlaceColor(places, normalizedDefaultColor),
      };
      if (onProposePlace) {
        onProposePlace(candidate);
        setQuery("");
        setSuggestions([]);
        setSearchOpen(false);
        return;
      }
      onChange([
        ...places.filter((place) => place.placeId !== suggestion.placeId),
        candidate,
      ]);
      setQuery("");
      setSuggestions([]);
    } finally {
      setSearchBusy(false);
    }
  }

  function removeRoot(rootPlaceId: string) {
    onChange(
      places.filter(
        (place) => place.placeId !== rootPlaceId && place.parentPlaceId !== rootPlaceId,
      ),
    );
    if (expandedRootId === rootPlaceId) setExpandedRootId(null);
    if (highlightedPlaceId === rootPlaceId) onHighlightPlaceId?.(null);
  }

  function requestRemoveRoot(root: RouteCoveragePlace) {
    setPendingRemoveRoot({ placeId: root.placeId, displayName: root.displayName });
  }

  async function expandRoot(root: RouteCoveragePlace) {
    const nextExpanded = expandedRootId === root.placeId ? null : root.placeId;
    setExpandedRootId(nextExpanded);
    setChildQuery("");
    if (!nextExpanded || availableChildren[root.placeId]?.length) return;
    setChildBusyRootId(root.placeId);
    try {
      const result = await listCoveragePlaceChildrenAction({
        parentPlaceId: root.placeId,
        parentDisplayName: root.displayName,
        lat: root.lat,
        lng: root.lng,
      });
      if (!result.ok) {
        notify.error(result.error);
        setAvailableChildren((current) => ({ ...current, [root.placeId]: [] }));
        return;
      }
      setAvailableChildren((current) => ({ ...current, [root.placeId]: result.data.children }));
    } finally {
      setChildBusyRootId("");
    }
  }

  async function toggleChild(root: RouteCoveragePlace, child: PlaceSuggestion, checked: boolean) {
    const options = availableChildren[root.placeId] || [];
    const existingChildren = childrenForRoot(places, root.placeId);
    const withoutThisChild = places.filter((place) => place.placeId !== child.placeId);
    const rootColor = placeColor(root);

    function childFromSuggestion(option: PlaceSuggestion): RouteCoveragePlace {
      return {
        placeId: option.placeId,
        displayName: option.displayName,
        kind: option.kind === "locality" ? "neighborhood" : option.kind,
        parentPlaceId: root.placeId,
        selectionRole: "child_included",
        color: rootColor,
      };
    }

    // Ciudad completa: visualmente todas las zonas están incluidas. Al apagar una,
    // pasamos a desglose parcial con el resto materializado.
    if (root.selectionRole === "root_whole") {
      if (checked) return;
      const keep = options.filter((option) => option.placeId !== child.placeId);
      if (!keep.length) {
        // Sin otras zonas listadas: el desglose vacío volvería a ciudad completa;
        // no hay forma útil de “apagar solo esta” sin lista de hermanas.
        notify.error("No hay más zonas listadas para desglosar. Quita la ciudad si no la quieres.");
        return;
      }
      onChange([
        ...places.filter(
          (place) => place.placeId !== root.placeId && place.parentPlaceId !== root.placeId,
        ),
        { ...root, selectionRole: "root_partial" },
        ...keep.map(childFromSuggestion),
      ]);
      return;
    }

    if (!checked) {
      const remainingChildren = childrenForRoot(withoutThisChild, root.placeId);
      onChange(
        withoutThisChild.map((place) =>
          place.placeId === root.placeId
            ? {
                ...place,
                selectionRole: remainingChildren.length ? "root_partial" : "root_whole",
              }
            : place,
        ),
      );
      return;
    }

    if (existingChildren.some((item) => item.placeId === child.placeId)) return;

    setChildBusyRootId(root.placeId);
    try {
      const details = await resolveCoveragePlaceDetailsAction({ placeId: child.placeId });
      if (!details.ok) {
        notify.error(details.error);
        return;
      }
      const nextChild: RouteCoveragePlace = {
        ...details.data,
        kind: details.data.kind === "locality" ? "neighborhood" : details.data.kind,
        parentPlaceId: root.placeId,
        selectionRole: "child_included",
        color: nextCoveragePlaceColor(places, rootColor),
      };
      const nextChildren = [...existingChildren, nextChild];
      const allOptionsSelected =
        options.length > 0 &&
        options.every((option) => nextChildren.some((item) => item.placeId === option.placeId));

      if (allOptionsSelected) {
        onChange([
          ...places.filter(
            (place) => place.placeId !== root.placeId && place.parentPlaceId !== root.placeId,
          ),
          { ...root, selectionRole: "root_whole" },
        ]);
        return;
      }

      onChange([
        ...withoutThisChild.map((place) =>
          place.placeId === root.placeId ? { ...place, selectionRole: "root_partial" as const } : place,
        ),
        nextChild,
      ]);
    } finally {
      setChildBusyRootId("");
    }
  }

  async function addChildBySearch(root: RouteCoveragePlace) {
    const trimmed = childQuery.trim();
    if (trimmed.length < 2) return;
    setChildBusyRootId(root.placeId);
    try {
      const result = await searchCoveragePlacesAction({
        query: `${trimmed} ${root.displayName}`,
        countryCode: "us",
      });
      if (!result.ok) {
        notify.error(result.error);
        return;
      }
      const suggestion = result.data.suggestions[0];
      if (!suggestion) {
        notify.error("No se encontró esa zona");
        return;
      }
      await toggleChild(root, suggestion, true);
      setChildQuery("");
    } finally {
      setChildBusyRootId("");
    }
  }

  return (
    <div className="grid gap-2">
      {canManage ? (
        <div className="grid gap-1">
          {compact ? null : (
            <>
              <label className="text-xs font-black text-slate-400">Buscar como alternativa</label>
              <p className="text-[11px] font-bold text-slate-500">
                Si ya conoces el nombre, escribe al menos 2 letras. También puedes previsualizar una pieza del mapa.
              </p>
            </>
          )}
          <div className={compact ? "relative max-w-2xl" : "relative"}>
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
            <input
              value={query}
              onChange={(event) => {
                const nextQuery = event.target.value;
                setQuery(nextQuery);
                if (nextQuery.trim().length < 2) {
                  setSuggestions([]);
                  setSearchError("");
                  setSearchBusy(false);
                }
                setSearchOpen(true);
              }}
              onFocus={() => setSearchOpen(true)}
              onBlur={() => {
                window.setTimeout(() => setSearchOpen(false), 150);
              }}
              placeholder={compact ? "Buscar ciudad o zona…" : "Ej. Santa Clarita, Valencia, Newhall…"}
              aria-label="Buscar ciudad o zona"
              autoComplete="off"
              className="h-9 w-full rounded-lg border border-black bg-surface-card pl-8 pr-3 text-sm font-bold text-white"
            />
            {searchBusy ? (
              <Loader2 className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-slate-400" />
            ) : null}
          </div>
          {searchOpen && query.trim().length >= 2 && (suggestions.length || searchError || searchBusy) ? (
            <div className="overflow-hidden rounded-lg border border-black bg-surface-card shadow-lg">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion.placeId}
                  type="button"
                  className="flex w-full flex-col gap-0.5 border-b border-black px-3 py-2 text-left last:border-b-0 hover:bg-surface-inset"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => void addRoot(suggestion)}
                >
                  <span className="text-xs font-black text-white">{suggestion.displayName}</span>
                  <span className="text-[11px] font-bold text-slate-500">{suggestion.secondaryText}</span>
                </button>
              ))}
              {!suggestions.length && !searchBusy && searchError ? (
                <p className="px-3 py-2 text-[11px] font-bold text-amber-100">{searchError}</p>
              ) : null}
              {searchBusy && !suggestions.length ? (
                <p className="inline-flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold text-slate-400">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Buscando…
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : (
        <p className="text-xs font-black text-slate-400">
          {roots.length
            ? `${roots.length} ciudad${roots.length === 1 ? "" : "es"} / zona${roots.length === 1 ? "" : "s"}`
            : "Sin lugares configurados"}
        </p>
      )}

      <div className={compact ? "divide-y divide-black/60 border-t border-black/60" : "grid gap-1.5"}>
        {roots.map((root) => {
          const children = childrenForRoot(places, root.placeId);
          const expanded = !rootOnly && expandedRootId === root.placeId;
          const options = availableChildren[root.placeId] || [];
          const highlighted = isRootHighlighted(root);
          const rootColor = placeColor(root);
          return (
            <div
              key={root.placeId}
              ref={(node) => {
                cardRefs.current[root.placeId] = node;
              }}
                className={
                compact
                  ? `w-full max-w-full bg-transparent transition ${highlighted ? "ring-1 ring-inset" : ""}`
                  : `rounded-lg border bg-surface-card transition ${
                      highlighted ? "ring-2" : "border-black"
                    }`
              }
              style={
                highlighted
                  ? { borderColor: rootColor, boxShadow: compact ? undefined : `0 0 0 1px ${rootColor}55` }
                  : undefined
              }
            >
              <div className={`${compact ? "flex w-full max-w-full" : "flex"} min-w-0 items-center gap-1 px-2 py-1.5`}>
                {canManage ? (
                  <button
                    type="button"
                    className={`min-w-0 flex-1 rounded-md px-1.5 py-1 text-left transition hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 ${
                      highlightedPlaceId === root.placeId ? "bg-emerald-400/10" : ""
                    }`}
                    aria-expanded={rootOnly ? undefined : expanded}
                    aria-label={
                      rootOnly
                        ? `Señalar ${root.displayName} en el mapa`
                        : expanded
                          ? `Ocultar zonas de ${root.displayName}`
                          : `Desglosar ${root.displayName}`
                    }
                    onClick={() => {
                      if (rootOnly) {
                        togglePlaceHighlight(root.placeId);
                        return;
                      }
                      const willExpand = expandedRootId !== root.placeId;
                      void expandRoot(root);
                      if (willExpand) onHighlightPlaceId?.(root.placeId);
                    }}
                  >
                    <span
                      className={`block break-words text-xs font-black ${
                        highlightedPlaceId === root.placeId ? "text-emerald-200" : "text-white"
                      }`}
                    >
                      {root.displayName}
                    </span>
                    {rootOnly ? null : (
                      <span className="block break-words text-[10px] font-bold text-slate-500">
                        {root.selectionRole === "root_partial"
                          ? `${children.length} zona${children.length === 1 ? "" : "s"}`
                          : "Ciudad completa · todas las zonas"}
                        {highlightedPlaceId === root.placeId ? " · señalada en el mapa" : ""}
                      </span>
                    )}
                  </button>
                ) : (
                  <div className="min-w-0 flex-1 overflow-hidden px-1">
                    <button
                      type="button"
                      className={`w-full min-w-0 rounded-md py-0.5 text-left transition ${
                        highlightedPlaceId === root.placeId ? "bg-emerald-400/10" : "hover:bg-white/5"
                      }`}
                      onClick={() => togglePlaceHighlight(root.placeId)}
                    >
                      <span
                        className={`block break-words text-xs font-black ${
                          highlightedPlaceId === root.placeId ? "text-emerald-200" : "text-white"
                        }`}
                      >
                        {root.displayName}
                      </span>
                      {rootOnly ? null : (
                        <span className="block break-words text-[10px] font-bold text-slate-500">
                          {root.selectionRole === "root_partial"
                            ? `${children.length} zona${children.length === 1 ? "" : "s"}`
                            : "Ciudad completa · todas las zonas"}
                          {highlightedPlaceId === root.placeId ? " · señalada en el mapa" : ""}
                        </span>
                      )}
                    </button>
                  </div>
                )}
                {canManage ? (
                  <label
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-black bg-surface-inset"
                    aria-label={`Color de ${root.displayName}`}
                    onClick={(event) => event.stopPropagation()}
                    onMouseDown={(event) => event.stopPropagation()}
                  >
                    <input
                      type="color"
                      value={rootColor}
                      onChange={(event) => schedulePlaceColorUpdate(root.placeId, event.target.value)}
                      className="h-5 w-5 cursor-pointer border-0 bg-transparent p-0"
                    />
                  </label>
                ) : (
                  <span
                    className="h-3.5 w-3.5 shrink-0 rounded-full border border-black"
                    style={{ backgroundColor: rootColor }}
                    aria-hidden
                  />
                )}
                {canManage ? (
                  <button
                    type="button"
                    aria-label={`Quitar ${root.displayName}`}
                    onClick={() => requestRemoveRoot(root)}
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-rose-300 hover:bg-surface-inset"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </div>
              {!rootOnly && expanded && canManage ? (
                <div className="border-t border-black px-2 py-2">
                  {childBusyRootId === root.placeId ? (
                    <p className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-400">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Cargando zonas…
                    </p>
                  ) : null}
                  <div className="grid gap-1">
                    {options.map((option) => {
                      const includedByWhole = root.selectionRole === "root_whole";
                      const checked =
                        includedByWhole || children.some((child) => child.placeId === option.placeId);
                      const childColor = children.find((child) => child.placeId === option.placeId)?.color;
                      const optionColor = normalizeCoveragePlaceColor(childColor, rootColor);
                      return (
                        <label
                          key={option.placeId}
                          className={`flex min-w-0 items-start gap-2 rounded-md px-1.5 py-1 text-left ${
                            highlightedPlaceId === option.placeId ? "ring-1" : ""
                          }`}
                          style={
                            highlightedPlaceId === option.placeId
                              ? { backgroundColor: `${optionColor}22`, boxShadow: `inset 0 0 0 1px ${optionColor}88` }
                              : undefined
                          }
                        >
                          <input
                            type="checkbox"
                            className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-emerald-400"
                            checked={checked}
                            disabled={childBusyRootId === root.placeId}
                            onChange={(event) => void toggleChild(root, option, event.target.checked)}
                          />
                          {checked && !includedByWhole ? (
                            <input
                              type="color"
                              value={optionColor}
                              onChange={(event) => schedulePlaceColorUpdate(option.placeId, event.target.value)}
                              onClick={(event) => event.stopPropagation()}
                              className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer border-0 bg-transparent p-0"
                              aria-label={`Color de ${option.displayName}`}
                            />
                          ) : null}
                          <span className="min-w-0 flex-1 overflow-hidden">
                            <button
                              type="button"
                              className={`block w-full break-words text-left text-[11px] font-black ${
                                highlightedPlaceId === option.placeId
                                  ? "text-emerald-200"
                                  : "text-slate-100 hover:text-emerald-100"
                              }`}
                              onClick={() => togglePlaceHighlight(option.placeId)}
                            >
                              {option.displayName}
                            </button>
                            <span className="block break-words text-[10px] font-bold text-slate-500">{option.secondaryText}</span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                  {!options.length && childBusyRootId !== root.placeId ? (
                    <p className="mt-1 text-[11px] font-bold text-slate-500">
                      No se listaron zonas automáticas. Busca una zona abajo.
                    </p>
                  ) : null}
                  <div className="mt-2 flex flex-wrap gap-2">
                    <input
                      value={childQuery}
                      onChange={(event) => setChildQuery(event.target.value)}
                      placeholder={`Zona en ${root.displayName}`}
                      className="h-9 min-w-0 flex-1 basis-[10rem] rounded-md border border-black bg-surface-inset px-2 text-xs font-bold text-white"
                    />
                    <button
                      type="button"
                      className={`${secondaryButtonClass} h-9 shrink-0 px-2 text-[11px]`}
                      disabled={childBusyRootId === root.placeId || childQuery.trim().length < 2}
                      onClick={() => void addChildBySearch(root)}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Agregar zona
                    </button>
                  </div>
                </div>
              ) : null}
              {!rootOnly && !expanded && children.length ? (
                <div className="flex max-w-full flex-wrap gap-1 border-t border-black px-2 py-1.5">
                  {children.map((child) => {
                    const childColor = placeColor(child);
                    return (
                    <span
                      key={child.placeId}
                      className={`inline-flex max-w-full items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-black transition ${
                        highlightedPlaceId === child.placeId
                          ? "text-white"
                          : "border-black bg-surface-inset text-slate-200"
                      }`}
                      style={
                        highlightedPlaceId === child.placeId
                          ? { borderColor: childColor, backgroundColor: `${childColor}33`, color: "#f8fafc" }
                          : undefined
                      }
                    >
                      <span
                        className="h-2 w-2 shrink-0 rounded-full border border-black/40"
                        style={{ backgroundColor: childColor }}
                        aria-hidden
                      />
                      <button
                        type="button"
                        className="min-w-0 truncate hover:text-emerald-100"
                        onClick={() => togglePlaceHighlight(child.placeId)}
                      >
                        {child.displayName}
                      </button>
                      {canManage ? (
                        <input
                          type="color"
                          value={childColor}
                          onChange={(event) => schedulePlaceColorUpdate(child.placeId, event.target.value)}
                          onClick={(event) => event.stopPropagation()}
                          className="h-3.5 w-3.5 shrink-0 cursor-pointer border-0 bg-transparent p-0"
                          aria-label={`Color de ${child.displayName}`}
                        />
                      ) : null}
                    </span>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <ActionConfirmDialog
        open={Boolean(pendingRemoveRoot)}
        title={pendingRemoveRoot ? `Quitar ${pendingRemoveRoot.displayName}` : "Quitar zona"}
        message={
          pendingRemoveRoot
            ? `Se quitará ${pendingRemoveRoot.displayName} de esta cobertura. Los cambios solo se guardan al pulsar Guardar.`
            : ""
        }
        confirmLabel="Quitar zona"
        tone="danger"
        onCancel={() => setPendingRemoveRoot(null)}
        onConfirm={() => {
          if (!pendingRemoveRoot) return;
          removeRoot(pendingRemoveRoot.placeId);
          setPendingRemoveRoot(null);
        }}
      />
    </div>
  );
}
