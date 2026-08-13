import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const componentSource = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "../components/logistica/geographic-route-catalog.tsx"),
  "utf8",
);
const geographicActions = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "../app/actions/logistics-geographic-route-actions.ts"),
  "utf8",
);
const catalogActions = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "../app/actions/logistics-route-catalog-actions.ts"),
  "utf8",
);
const catalogRead = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "../app/actions/logistics-route-catalog-read.ts"),
  "utf8",
);

describe("selección independiente de días maestros", () => {
  it("separa seleccionar el día de activar o desactivar su disponibilidad", () => {
    const daysSectionStart = componentSource.indexOf("Días maestros");
    const subroutesSectionStart = componentSource.indexOf(">Subrutas<", daysSectionStart);
    assert.ok(daysSectionStart >= 0);
    assert.ok(subroutesSectionStart > daysSectionStart);

    const daysSection = componentSource.slice(daysSectionStart, subroutesSectionStart);
    assert.match(daysSection, /setSelectedWeekday\(weekday\)/);
    assert.match(daysSection, /role="switch"/);
    assert.match(daysSection, /void toggleDay\(weekday\)/);
    assert.match(daysSection, /selected \? "text-white" : "text-slate-300"/);
    assert.match(daysSection, /hidden 2xl:inline.*enabled \? "Activo" : "Inactivo"/);
    assert.doesNotMatch(daysSection, /bg-emerald-400 text-slate-950/);
    assert.doesNotMatch(daysSection, /translate-x-4/);
    assert.doesNotMatch(daysSection, /border-t border-black\/70/);
  });

  it("persiste la activación al pulsar el switch y oculta el horario con subrutas", () => {
    assert.match(componentSource, /activateLogisticsRouteWeekdayAction/);
    assert.match(componentSource, /setLogisticsWeekdayScheduleAction/);
    assert.match(componentSource, /Sin hora de fin · hasta terminar/);
    assert.match(componentSource, /dayIsRoute = selectedDayEnabled && selectedDayRoutes\.length === 0/);
    assert.match(componentSource, /startTime: existing\?\.startTime \|\| "10:00"/);
    assert.match(componentSource, /max-w-sm/);
    assert.doesNotMatch(componentSource, /activatingDay/);
    assert.doesNotMatch(componentSource, /El \$\{selectedWeekdayLabel\} es la ruta/);
    assert.match(componentSource, /ya no es la ruta: cada subruta usa su propio horario/);
    assert.match(componentSource, /CompactInfoDisclosure/);
    assert.match(componentSource, /Cómo funcionan las subrutas/);
    assert.doesNotMatch(componentSource, /<p className="mb-2 text-xs font-bold text-slate-500">\s*Con subrutas/);
    assert.match(componentSource, /busy\.startsWith\("day:"\)/);
  });

  it("debajo del día lista subrutas; cobertura de lugares/mapa del día-ruta junto al horario", () => {
    assert.match(componentSource, />Subrutas</);
    assert.match(componentSource, /toggleSubrouteEditor/);
    assert.match(componentSource, /aria-expanded=\{expanded\}/);
    assert.match(componentSource, /draftEditor|subrouteSchedulesOpen/);
    assert.match(componentSource, /compact/);
    assert.doesNotMatch(componentSource, /aria-label=\{`Editar \$\{route\.name\}`\}/);
    assert.doesNotMatch(componentSource, /<Pencil /);
    assert.doesNotMatch(componentSource, /Rutas geográficas|Buscar cobertura por ZIP ·|Mapa automático por ZCTA/);
    assert.match(componentSource, /GeographicRouteCoverageMap/);
    assert.match(componentSource, /GeographicRoutePlacesEditor/);
    assert.match(componentSource, /canPickPlaces/);
    assert.match(componentSource, /upsertCoverageRootPlace/);
    assert.match(componentSource, /saveSystemDayRouteCoverageAction/);
    assert.match(componentSource, /Cobertura de \$\{selectedWeekdayLabel\}/);
    assert.match(componentSource, /dayIsRoute \? \(/);
    assert.match(componentSource, /dayPlaces\.length > 0|placesSnapshot\.length > 0/);
    assert.match(componentSource, /"places"/);
    assert.doesNotMatch(componentSource, /Cobertura de \$\{selectedWeekdayLabel\}[\s\S]{0,800}?Modo/);
    assert.match(geographicActions, /export async function saveSystemDayRouteCoverageAction/);
    assert.match(geographicActions, /logistics_route_coverage_places/);
    assert.match(geographicActions, /resolveCoveragePlaceFromCensusPolygonAction|resolveCoveragePlaceAtMapClickAction/);
    const mapSource = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "../components/logistica/geographic-route-coverage-map.tsx"),
      "utf8",
    );
    assert.match(mapSource, /NEXT_PUBLIC_GOOGLE_MAPS_API_KEY/);
    assert.match(mapSource, /addGeoJson/);
    assert.match(mapSource, /togglePlaceHighlight|highlightedPlaceId/);
    assert.match(mapSource, /loadCensusPlaceGeometryAction/);
    assert.match(mapSource, /loadCensusPlacesCatalogAction/);
    assert.match(mapSource, /Frontera Census|Vista previa/);
    assert.match(mapSource, /previewPlaces/);
    assert.match(mapSource, /navigator\.geolocation/);
    assert.match(mapSource, /Mi ubicación/);
    assert.match(mapSource, /Seleccionar área|Cancelar área/);
    assert.match(mapSource, /BoxSelect|resolveAreaSelection|onAreaOverlayPointerDown/);
    assert.match(mapSource, /areaResolveProgress|Preparando zonas/);
    assert.match(mapSource, /progressive:\s*true|Las piezas aparecen/);
    assert.match(mapSource, /Mantén pulsado y arrastra/);
    assert.match(componentSource, /progressive/);
    assert.match(mapSource, /Cambiar altura del mapa|MAP_HEIGHT_STORAGE_KEY|beginMapSizeDrag/);
    assert.match(mapSource, /Cambiar ancho del mapa|MAP_WIDTH_STORAGE_KEY|mapWidth/);
    assert.match(mapSource, /cursor-ns-resize|cursor-ew-resize|cursor-nwse-resize/);
    assert.match(mapSource, /clickableIcons: false/);
    assert.match(mapSource, /catalogLayer|styleForCatalogFeature/);
    assert.match(mapSource, /resolveCoveragePlaceFromCensusPolygonAction/);
    assert.match(mapSource, /selectCatalogPlace/);
    assert.match(mapSource, /onSelectPlaces/);
    assert.match(mapSource, /onSelectPlaceRef/);
    assert.match(mapSource, /canUseViewportFallback = !isPreview && hasViewport/);
    assert.match(mapSource, /no inventa límites/);
    assert.match(mapSource, /Camera framing lives in a separate effect|fittedCoverageKeyRef/);
    assert.match(mapSource, /COVERAGE_FIT_MAX_ZOOM|extendCoverageOutlineBounds|never fit on center alone/);
    assert.doesNotMatch(mapSource, /fittedHighlightIdRef/);
    assert.match(mapSource, /fitPreview &&/);
    assert.match(mapSource, /source !== "preview"/);    assert.match(componentSource, /onSelectPlace=\{\(place\) => selectCoveragePlaceFromMap\("day", place\)\}/);
    assert.match(componentSource, /onSelectPlaces=\{\(places, options\) => selectCoveragePlacesFromMap\("day", places, options\)\}/);
    assert.match(componentSource, /onProposePlace=\{\(place\) => proposeCoveragePlace\("day", place, \{ fitPreview: true \}\)\}/);
    assert.match(mapSource, /grid-cols-\[minmax\(0,1fr\)\]/);
    assert.match(mapSource, /width: mapWidth/);
    assert.match(mapSource, /mapWidthFromHost|mapWidthFill|ResizeObserver/);
    assert.match(mapSource, /min-w-0 flex-1|flex-1/);
    assert.doesNotMatch(mapSource, /MAP_WIDTH_MAX = 1400/);
    assert.doesNotMatch(mapSource, /maxWidth: "100%"/);
    assert.doesNotMatch(mapSource, /w-max max-w-none/);
    assert.match(mapSource, /never wider than the panel host|Math\.min\(viewportMax, Math\.floor\(availableWidth\)\)/);
    assert.match(componentSource, /w-full min-w-0 overflow-x-hidden/);
    assert.doesNotMatch(componentSource, /w-full min-w-0 overflow-x-auto/);
    assert.match(geographicActions, /export async function loadCensusPlaceGeometryAction/);
    assert.match(geographicActions, /export async function loadCensusPlacesCatalogAction/);
    assert.match(geographicActions, /logistics_census_place_geometry_cache/);
    assert.match(geographicActions, /fetchCensusPlaceGeometryAtPoint|fetchCensusPlacesInBounds/);
    assert.match(mapSource, /source === "preview"|fillOpacity: preview/);
    assert.match(mapSource, /Confirmed Census and pending preview|0\.26/);
    assert.match(componentSource, /colored\.length === 1 \? colored\[0\]/);
    assert.match(componentSource, /batchColor|setPendingBatchColor|Color de las zonas a agregar/);
    assert.match(componentSource, /removePendingCoveragePlace/);
    assert.match(componentSource, /pendingCoveragePlaces\.places\.some|Se añadió|añadir o quitar/);
    assert.match(componentSource, /PendingCoverageAction/);
    assert.match(componentSource, /Agregar zona/);
    assert.match(componentSource, /CoverageSurfaceTabs/);
    assert.match(componentSource, /draftCoverageTab|dayCoverageTab/);
    assert.match(componentSource, /subrouteCoverageOpen/);
    assert.match(componentSource, /inline-flex max-w-full items-center gap-4/);
    assert.match(componentSource, /aria-controls="subroute-coverage-content"/);
    assert.match(componentSource, /onClick=\{\(\) => setSubrouteCoverageOpen\(\(current\) => !current\)\}/);
    assert.match(componentSource, /if \(coverageMode === "places"\) setSubrouteCoverageOpen\(true\)/);
    assert.match(componentSource, /subrouteCoverageOpen \? \([\s\S]*?<GeographicRoutePlacesEditor/);
    assert.match(componentSource, /"zones".*"map"|Zonas/);
    assert.match(componentSource, /Selecciona al menos una zona para poder guardar los cambios/);
    assert.match(componentSource, /draftPlacesMissing/);
    assert.match(componentSource, /draftHasPendingPlaces/);
    assert.match(componentSource, /applyPendingPlacesToCoverage/);
    assert.doesNotMatch(componentSource, /disabled=\{busy === "save" \|\| draftPlacesMissing\}/);
    assert.doesNotMatch(componentSource, /ActionConfirmDialog/);
    assert.match(componentSource, /Configuración de la subruta/);
    assert.match(componentSource, /Identidad, cobertura y horario en una sola vista/);
    assert.match(componentSource, /ariaLabel=\{`Información para configurar \$\{route\.name\}`\}/);
    assert.doesNotMatch(componentSource, /<p className="text-xs font-black uppercase tracking-wide text-slate-300">Configuración de la subruta<\/p>/);
    assert.match(componentSource, /coverageSummary/);
    assert.match(componentSource, /expanded \? "Editando" : "Abrir"/);
    assert.match(componentSource, /grid gap-2 sm:grid-cols-2 xl:grid-cols-11/);
    assert.doesNotMatch(componentSource, /Por ZIP \(legado\)/);
    assert.doesNotMatch(componentSource, /postal_codes|Cobertura heredada|ZIP legado/);
    assert.match(componentSource, /Ciudades y zonas atendidas por esta subruta/);
    assert.match(componentSource, /bg-black\/10 px-3 py-3/);
    assert.doesNotMatch(componentSource, /divide-y divide-black overflow-hidden rounded-lg/);
    assert.match(componentSource, /function changeSubrouteColor/);
    assert.match(componentSource, /aria-label=\{`Cambiar color de \$\{route\.name\}`\}/);
    assert.match(componentSource, /onChange=\{\(event\) => changeSubrouteColor\(route, event\.target\.value\)\}/);
    assert.match(componentSource, /style=\{\{ backgroundColor: expanded \? draft\.color : route\.color \}\}/);
    const placesEditor = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "../components/logistica/geographic-route-places-editor.tsx"),
      "utf8",
    );
    assert.match(placesEditor, /break-words/);
    assert.match(placesEditor, /w-fit max-w-full bg-transparent transition/);
    assert.match(placesEditor, /compact \? "inline-flex max-w-full" : "flex"/);
    assert.match(placesEditor, /min-w-0 flex-1 overflow-hidden/);
    assert.match(placesEditor, /aria-expanded=\{expanded\}/);
    assert.match(placesEditor, /willExpand|Desglosar \$\{root\.displayName\}/);
    assert.doesNotMatch(placesEditor, /ChevronDown|ChevronRight/);
    assert.match(placesEditor, /ActionConfirmDialog/);
    assert.match(placesEditor, /Quitar zona/);
    assert.match(placesEditor, /requestRemoveRoot|pendingRemoveRoot/);
    assert.match(placesEditor, /onProposePlace/);
    assert.match(placesEditor, /searchCoveragePlacesAction/);
    assert.match(placesEditor, /Si ya conoces el nombre, escribe al menos 2 letras/);
    assert.match(placesEditor, /pieza del mapa|previsualizar/);
    assert.match(placesEditor, /includedByWhole|root_whole/);
    assert.match(placesEditor, /todas las zonas/);
    assert.match(placesEditor, /selectionRole: "root_partial"/);
  });

  it("desactiva el horario del día al crear subrutas y lo reactiva al quedar sin ellas", () => {
    assert.match(geographicActions, /reconcileSystemDaySchedulesForWeekdays/);
    assert.match(geographicActions, /hasNamed/);
    assert.match(catalogActions, /syncSystemGeneralDaySchedule/);
    assert.match(catalogActions, /activate && !hasNamed/);
  });

  it("alineapickup_days con delivery_days y no revive días al vaciar delivery_days", () => {
    assert.match(catalogRead, /pickup_days: enabledDays/);
    assert.doesNotMatch(catalogRead, /delivery_days: healed/);
    assert.match(catalogActions, /pickup_days: enabledDays/);
  });
});
