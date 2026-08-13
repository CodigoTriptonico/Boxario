import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { readLogisticaClientSource } from "@/test-utils/logistica-client-source";

const componentSource = readLogisticaClientSource();
const routesWorkspaceSource = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "../components/logistica/logistics-routes-workspace.tsx"),
  "utf8",
);
const routePanelSource = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "../components/config/ventas-rutas-panel.tsx"),
  "utf8",
);

const fleetAdminSource = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "../components/logistica/fleet/logistics-fleet-admin-client-view.tsx"),
  "utf8",
);

function invoiceCardSource() {
  const cardStart = componentSource.indexOf("export function LogisticsInvoiceCard");
  assert.notEqual(cardStart, -1);
  const cardEnd = componentSource.indexOf("export function", cardStart + 1);
  assert.notEqual(cardEnd, -1);
  return componentSource.slice(cardStart, cardEnd);
}

function logisticsToolbarSource() {
  const toolbarStart = componentSource.lastIndexOf("<div className={`${panelToolbarClass}");
  const listStart = componentSource.indexOf(
    'className={`${panelListScrollClass}',
    toolbarStart,
  );
  assert.notEqual(toolbarStart, -1);
  assert.notEqual(listStart, -1);
  return componentSource.slice(toolbarStart, listStart);
}

function invoiceCardHeaderBounds(card: string) {
  const headerStart = card.indexOf("relative border-b border-black px-3 py-2.5");
  const bodyStart = card.indexOf('<div className="grid gap-3 p-3">');
  assert.notEqual(headerStart, -1);
  assert.notEqual(bodyStart, -1);
  return {
    header: card.slice(headerStart, bodyStart),
    body: card.slice(bodyStart),
  };
}

describe("logistica single-action invoice card eval", () => {
  it("does not bring back the delivery/pickup progress rail in the main card", () => {
    const bannedCardCopy = [
      'renderStepToken("1 Entrega"',
      'renderStepToken("2 Recoleccion"',
      "Despues: recoger caja llena",
      "Entregar caja vacia",
      "Recoger caja llena",
    ];

    for (const copy of bannedCardCopy) {
      assert.equal(componentSource.includes(copy), false, copy);
    }
  });

  it("uses Pablo's two logistics action words", () => {
    assert.equal(componentSource.includes('deliver_empty_box: "Dejar"'), true);
    assert.equal(componentSource.includes('pickup_full_box: "Recoger"'), true);
  });

  it("keeps invoice identity centered without duplicate action badges in the header", () => {
    const card = invoiceCardSource();
    const { header } = invoiceCardHeaderBounds(card);

    assert.equal(header.includes("text-center"), true);
    assert.equal(header.includes("invoiceActionLabel(item.step.stepType"), false);
    assert.equal(header.includes('"Con chofer" : "Sin chofer"'), false);
    assert.equal(header.includes("inline-flex max-w-full flex-wrap"), false);
    assert.equal(header.includes("formatLogisticsTaskStatusLabel"), false);
  });

  it("shows sender phone in the invoice card header", () => {
    const card = invoiceCardSource();
    const { header } = invoiceCardHeaderBounds(card);

    assert.equal(header.includes("item.shipment.customerPhone"), true);
    assert.equal(header.includes("<Phone"), true);
  });

  it("moves action and driver into the bottom field grid without a date field", () => {
    const card = invoiceCardSource();
    const { header, body } = invoiceCardHeaderBounds(card);
    const actionIndex = body.indexOf("invoiceActionLabel(item.step.stepType");
    const driverIndex = body.indexOf("Chofer");
    const dateIndex = body.indexOf(">Fecha<");

    assert.equal(componentSource.includes("function invoiceActionLabel"), true);
    assert.equal(componentSource.includes("return taskActionVerb[taskType];"), true);
    assert.equal(componentSource.includes("taskActionVerb"), true);
    assert.equal(componentSource.includes("Pendiente por"), false);
    assert.equal(componentSource.includes("Con fecha para"), false);
    assert.equal(componentSource.includes("Asignado para"), false);
    assert.equal(componentSource.includes("En ruta para"), false);
    assert.equal(body.includes("sm:grid-cols-2"), true);
    assert.equal(body.includes("sm:grid-cols-3"), false);
    assert.equal(body.includes("Accion"), true);
    assert.equal(body.includes("Estado"), false);
    assert.equal(componentSource.includes("function invoiceActionFieldClass"), true);
    assert.equal(componentSource.includes("function invoiceDriverFieldClass"), true);
    assert.equal(componentSource.includes("function invoiceDateFieldClass"), false);
    assert.equal(componentSource.includes("logistics-unassigned-alert"), true);
    assert.equal(componentSource.includes("from-red-500/40 via-orange-500/35"), false);
    assert.equal(componentSource.includes("border-indigo-500 bg-indigo-400/28"), false);
    assert.equal(componentSource.includes("border-red-500 bg-red-500/24"), false);
    assert.equal(componentSource.includes("border-emerald-500 bg-emerald-400/28"), false);
    assert.equal(componentSource.includes("LOGISTICS_FIELD_BASE"), true);
    assert.equal(componentSource.includes("logisticsActionIconWellClass"), true);
    assert.equal(body.includes("taskTypeIcon(item.step.stepType, \"h-5 w-5\")"), true);
    assert.equal(body.includes("invoiceActionFieldClass()"), true);
    assert.equal(body.includes("invoiceDriverFieldClass(effectiveDriverId, Boolean(task))"), true);
    assert.equal(dateIndex, -1);
    assert.ok(actionIndex >= 0);
    assert.ok(driverIndex > actionIndex);
    assert.equal(body.includes('placeholder="Sin chofer"'), true);
    assert.equal(body.includes("<InlineSearchPicker"), true);
    assert.equal(body.includes('searchPlaceholder="Buscar chofer…"'), true);
    assert.equal(body.includes("task && routeInfo"), true);
    assert.equal(body.includes("Asignar (barra superior)"), true);
    assert.equal(componentSource.includes("canChangeLogisticsTaskDriver"), true);
    assert.equal(componentSource.includes("resolveLogisticsToolbarRoute"), true);
    assert.equal(componentSource.includes("requestToolbarRouteDriverChange"), true);
    assert.equal(componentSource.includes("if (routeInfo) {\n      return false;\n    }"), false);
    assert.equal(body.includes('ariaLabel={`Chofer de ${item.shipment.code}`}'), true);
    assert.equal(header.includes("taskTypeLabel[item.step.stepType]"), false);
    assert.equal(header.includes("Bloqueado"), false);
  });

  it("uses quiet bottom fields instead of loud floating buttons", () => {
    const card = invoiceCardSource();
    const { header, body } = invoiceCardHeaderBounds(card);
    const bottomFieldsStart = body.indexOf('<div className="grid gap-2 sm:grid-cols-2">');
    const bottomFieldsEnd = body.indexOf("</article>", bottomFieldsStart);
    const bottomFields = body.slice(bottomFieldsStart, bottomFieldsEnd);

    assert.equal(bottomFields.includes("rounded-md border border-black bg-[#26312c] px-2 py-2"), false);
    assert.equal(bottomFields.includes("relative flex items-center gap-2.5 rounded-md border px-2 py-2"), true);
    assert.equal(bottomFields.includes("relative grid gap-1 rounded-md border px-2 py-2"), true);
    assert.equal(header.includes('bg-[#1f2925] p-1'), false);
    assert.equal(header.includes("bg-amber-400 text-slate-950"), false);
    assert.equal(header.includes("bg-amber-300"), false);
    assert.equal(card.includes("logisticsPriorityCardClass"), true);
    assert.equal(card.includes("priorityHeaderClass"), true);
  });

  it("does not show warehouse in the invoice card footer", () => {
    const card = invoiceCardSource();
    const footerStart = card.indexOf('className="flex flex-wrap items-center justify-end gap-2 border-t border-black pt-2"');

    assert.equal(footerStart, -1);
    assert.equal(card.includes("ShipmentBoxLinesTrigger"), true);
    assert.equal(card.includes("readShipmentBoxLines(item.shipment)"), true);
    assert.equal(card.includes("<Warehouse"), false);
    assert.equal(card.includes("warehouseLabel"), false);
  });

  it("shows all invoices in one friendly list without tabs or split sections", () => {
    const main = logisticsToolbarSource();

    assert.equal(componentSource.includes('type InvoiceAssignmentTab = "unassigned" | "assigned"'), false);
    assert.equal(main.includes('role="tablist"'), false);
    assert.equal(main.includes('role="tabpanel"'), false);
    assert.equal(componentSource.includes("activeInvoiceItems.map((item) => renderInvoiceCard(item))"), false);
    assert.equal(componentSource.includes("unassignedInvoiceItems.map((item) => renderInvoiceCard(item))"), false);
    assert.equal(componentSource.includes("assignedInvoiceItems.map((item) => renderInvoiceCard(item))"), false);
    assert.equal(componentSource.includes("visibleInvoiceItems.map((item) => ("), true);
    assert.equal(componentSource.includes("<LogisticsInvoiceCard"), true);
    assert.equal(componentSource.includes("LOGISTICS_INVOICE_CARD_GRID_CLASS"), true);
    assert.equal(componentSource.includes("panelListScrollClass"), true);
    assert.equal(componentSource.includes("panelListStackClass"), true);
    assert.equal(componentSource.includes("listRowBaseClass"), true);
    assert.equal(componentSource.includes("divide-y divide-black/70"), false);
    assert.equal(main.includes("Pendientes de asignar"), false);
    assert.equal(main.includes("Ya asignados"), false);
    assert.equal(main.includes("unassignedCount"), false);
    assert.equal(main.includes("assignedCount"), false);
  });

  it("keeps invoice cards without inline date fields", () => {
    assert.equal(componentSource.includes("function invoiceDateFieldClass"), false);
    assert.equal(componentSource.includes("LogisticsScheduleText"), false);
  });

  it("shows task waiting time since delivery or pickup was requested on logistics cards", () => {
    assert.equal(componentSource.includes("function LogisticsTaskWaitingBanner"), true);
    assert.equal(componentSource.includes("logisticsTaskWaitingParts"), true);
    assert.equal(componentSource.includes("task?.orderedAt"), true);
    assert.equal(componentSource.includes("timings.waitingText"), false);
    assert.equal(componentSource.includes("desde la venta"), false);
    assert.equal(componentSource.includes("Último tramo:"), false);
    assert.match(
      componentSource,
      /LogisticsTaskWaitingBanner[\s\S]*?logisticsWaitingToneClass\(waiting\.elapsedMs\)/,
    );
  });

  it("does not show the schedule proximity legend bar", () => {
    const main = logisticsToolbarSource();

    assert.equal(main.includes("Vencida/hoy"), false);
    assert.equal(main.includes("2-3 dias"), false);
    assert.equal(main.includes("4+ dias"), false);
  });

  it("keeps mobile compact and combines desktop scheduling into the toolbar row", () => {
    const toolbar = logisticsToolbarSource();

    assert.equal(toolbar.includes("panelToolbarClass"), true);
    assert.equal(toolbar.includes("flex min-w-0 flex-wrap items-center gap-1.5 xl:flex-nowrap"), true);
    assert.equal(toolbar.includes("order-2 min-w-0 flex-[1_1_calc(100%-3.5rem)]"), true);
    assert.equal(toolbar.includes("order-3 !hidden w-full min-w-0 flex-wrap"), true);
    assert.equal(toolbar.includes("xl:flex-1 xl:flex-nowrap xl:border-l"), true);
    assert.equal(toolbar.includes("Programación"), true);
    assert.equal(toolbar.includes("order-1 !hidden lg:order-none lg:!inline-flex"), true);
    assert.equal(toolbar.includes('className="w-[11rem] shrink-0'), true);
    assert.equal(toolbar.includes("lg:!hidden"), true);
    assert.equal(toolbar.includes("lg:grid-cols-[auto_minmax(18rem,1.4fr)"), false);
    assert.equal(toolbar.includes('className="grid gap-3"'), false);
    assert.equal(
      toolbar.includes("inline-flex h-11 items-center gap-2 rounded-md border border-black bg-surface-inset px-2"),
      false
    );
    assert.ok(toolbar.indexOf("<LogisticsSectionNav") < toolbar.indexOf("<InlineSearchCombobox"));
  });

  it("keeps desktop filters readable in the compact row", () => {
    const toolbar = logisticsToolbarSource();

    assert.equal(toolbar.includes('className="min-w-[11rem] flex-[1_1_15rem]"'), true);
    assert.equal(toolbar.includes("Todos los días"), true);
    assert.equal(toolbar.includes("lg:w-[30rem]"), true);
    assert.equal(toolbar.includes("xl:flex-nowrap"), true);
    assert.ok(
      toolbar.indexOf('ariaLabel="Filtrar por fecha"') <
        toolbar.indexOf('ariaLabel="Filtrar por ruta del día"'),
    );
  });

  it("keeps section nav first and aligned to the left on every logistics page", () => {
    assert.equal(routesWorkspaceSource.includes('<LogisticsSectionNav active="routes"'), true);
    assert.equal(routesWorkspaceSource.includes("<VentasRutasPanel canManage={canManage} onCatalogChange={onCatalogChange} />"), true);
    assert.equal(routesWorkspaceSource.includes("flex min-w-0 flex-wrap items-center gap-2"), true);
    assert.equal(routesWorkspaceSource.includes("ml-auto flex shrink-0 items-center gap-2"), false);
    assert.equal(routesWorkspaceSource.includes("Selecciona una ruta para ver sus cajas"), false);
    assert.equal(componentSource.includes("LogisticsRoutesView"), false);
    assert.equal(fleetAdminSource.includes("<LogisticsSectionNav"), true);
    assert.equal(fleetAdminSource.includes('className="ml-auto"'), true);
    assert.equal(fleetAdminSource.includes('href="/logistica/conductores"'), false);
    assert.equal(fleetAdminSource.includes("Logistica"), false);
  });

  it("refreshes the shared route catalog after calendar changes", () => {
    assert.match(routesWorkspaceSource, /onCatalogChange\?: \(\) => void \| Promise<void>/);
    assert.match(routesWorkspaceSource, /<VentasRutasPanel canManage=\{canManage\} onCatalogChange=\{onCatalogChange\} \/>/);
    assert.match(routePanelSource, /void onCatalogChange\?\.\(\)/);
    assert.match(componentSource, /reloadRouteCatalog,\n  \} = useLogisticsData/);
    assert.match(componentSource, /onCatalogChange=\{reloadRouteCatalog\}/);
  });

  it("filters confirmation requests with the shared weekly navigator", () => {
    assert.match(routesWorkspaceSource, /<LogisticsWeekNavigator/);
    assert.match(routesWorkspaceSource, /confirmationWeekOffset/);
    assert.match(routesWorkspaceSource, /booking\.status !== "pending_approval"/);
    assert.match(routesWorkspaceSource, /booking\.routeDate/);
  });

  it("searches confirmation requests by invoice, customer, address, or route", () => {
    assert.match(routesWorkspaceSource, /confirmationQuery/);
    assert.match(routesWorkspaceSource, /Buscar invoice, cliente o ruta/);
    assert.match(routesWorkspaceSource, /booking\.shipmentCode/);
    assert.match(routesWorkspaceSource, /booking\.formattedAddress/);
    assert.match(routesWorkspaceSource, /booking\.routeTemplateName/);
  });

  it("shows operational days as compact tabs", () => {
    const unifiedListSource = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "../components/logistica/logistics-unified-route-list.tsx"),
      "utf8",
    );
    assert.match(unifiedListSource, /role="tablist"/);
    assert.match(unifiedListSource, /aria-label="Días de operación"/);
    assert.match(unifiedListSource, /selectedWeekday/);
    assert.match(unifiedListSource, /schedule\.weekday === activeWeekday/);
  });

  it("shares the selected week and weekday with prepared booking groups", () => {
    assert.match(routesWorkspaceSource, /const \[routeWeekOffset, setRouteWeekOffset\]/);
    assert.match(routesWorkspaceSource, /const \[routeWeekday, setRouteWeekday\]/);
    assert.match(routesWorkspaceSource, /getLogisticsWeekdayIndex\(booking\.routeDate\) !== activeRouteWeekday/);
    assert.match(routesWorkspaceSource, /onWeekdayChange=\{\(weekday\) =>/);
    assert.match(routesWorkspaceSource, /selectedWeekday=\{activeRouteWeekday\}/);
    assert.match(routesWorkspaceSource, /weekOffset=\{routeWeekOffset\}/);
  });

  it("starts prepared booking groups collapsed and keeps their action independent", () => {
    const bookingGroupsSource = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "../components/logistica/logistics-template-booking-groups.tsx"),
      "utf8",
    );
    assert.match(bookingGroupsSource, /const \[expandedKeys, setExpandedKeys\] = useState<Set<string>>\(\(\) => new Set\(\)\)/);
    assert.match(bookingGroupsSource, /aria-expanded=\{expanded\}/);
    assert.match(bookingGroupsSource, /aria-controls=\{detailsId\}/);
    assert.match(bookingGroupsSource, /hidden=\{!expanded\}/);
    assert.match(bookingGroupsSource, /onUpdateRoute\(group\.key, publishedRoute, group\.items\)/);
  });

  it("labels configured routes without bookings explicitly", () => {
    const unifiedListSource = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "../components/logistica/logistics-unified-route-list.tsx"),
      "utf8",
    );
    assert.match(unifiedListSource, /Sin cajas asignadas aún/);
  });

  it("shows pending confirmation days as compact tabs", () => {
    assert.match(routesWorkspaceSource, /<LogisticsWeekdayTabs/);
    assert.match(routesWorkspaceSource, /confirmationWeekdays/);
    assert.match(routesWorkspaceSource, /activeConfirmationWeekday/);
    assert.match(routesWorkspaceSource, /bookingRouteWeekday\(booking\)/);
    assert.match(routesWorkspaceSource, /panelId="logistics-confirmation-day-panel"/);
    assert.match(routesWorkspaceSource, /weekStart=\{weekStartForOffset\(confirmationWeekOffset\)\}/);
    assert.match(routesWorkspaceSource, /compact/);
  });

  it("shows the concrete date in every operational day tab", () => {
    const unifiedListSource = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "../components/logistica/logistics-unified-route-list.tsx"),
      "utf8",
    );
    assert.match(unifiedListSource, /function formatWeekdayTabDate/);
    assert.match(unifiedListSource, /resolveRouteDateForWeekday/);
    assert.match(unifiedListSource, /weekdayTabFullDateFormatter/);
    assert.match(unifiedListSource, /<time dateTime=\{dateLabel\.date\}/);
    assert.match(unifiedListSource, /aria-label=\{accessibleLabel\}/);
    assert.match(unifiedListSource, /weekStart=\{weekStart\}/);
  });

  it("keeps the weekly context and day controls in one horizontal bar", () => {
    const unifiedListSource = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "../components/logistica/logistics-unified-route-list.tsx"),
      "utf8",
    );
    assert.match(unifiedListSource, /children\?: ReactNode/);
    assert.match(unifiedListSource, /overflow-x-auto/);
    assert.match(routesWorkspaceSource, /<LogisticsWeekNavigator[\s\S]*<LogisticsWeekdayTabs[\s\S]*<\/LogisticsWeekNavigator>/);
    assert.equal(routesWorkspaceSource.includes("flex-[2_1_28rem]"), false);
  });

  it("keeps the logistics search beside the shared operation navigation", () => {
    const unifiedListSource = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "../components/logistica/logistics-unified-route-list.tsx"),
      "utf8",
    );
    assert.match(routesWorkspaceSource, /<LogisticsOperationsNav[\s\S]*headerSearchValue/);
    assert.match(routesWorkspaceSource, /const \[routeQuery, setRouteQuery\]/);
    assert.match(routesWorkspaceSource, /query=\{routeQuery\}/);
    assert.match(routesWorkspaceSource, /routeMatchesSearch/);
    assert.match(unifiedListSource, /query\?: string/);
    assert.match(unifiedListSource, /No encontramos rutas con esa búsqueda/);
  });

  it("hides empty pending confirmation days and resets stale selection", () => {
    const unifiedListSource = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "../components/logistica/logistics-unified-route-list.tsx"),
      "utf8",
    );
    assert.match(unifiedListSource, /const visibleWeekdays = counts/);
    assert.match(unifiedListSource, /weekdays\.filter\(\(weekday\) => \(counts\[weekday\] \?\? 0\) > 0\)/);
    assert.match(routesWorkspaceSource, /confirmationWeekday != null && confirmationWeekdays\.includes\(confirmationWeekday\)/);
  });

  it("supports selecting pending confirmations in bulk", () => {
    assert.match(routesWorkspaceSource, /selectedConfirmationIds/);
    assert.match(routesWorkspaceSource, /Seleccionar todas las solicitudes visibles/);
    assert.match(routesWorkspaceSource, /approveSelectedRequests/);
    assert.match(routesWorkspaceSource, /Confirmar seleccionadas/);
  });

  it("makes pending confirmation cards selectable with a visible selected state", () => {
    assert.match(routesWorkspaceSource, /role=\{canManage \? "checkbox" : undefined\}/);
    assert.match(routesWorkspaceSource, /cursor-pointer select-none/);
    assert.match(routesWorkspaceSource, /bg-emerald-400\/10/);
    assert.match(routesWorkspaceSource, /onKeyDown=\{\(event\) =>/);
  });

  it("keeps pending confirmation actions touch-friendly", () => {
    assert.match(routesWorkspaceSource, /min-h-11/);
    assert.match(routesWorkspaceSource, />Confirmar<\/button>/);
    assert.match(routesWorkspaceSource, />Rechazar<\/button>/);
    assert.match(routesWorkspaceSource, /gap-2/);
    assert.match(routesWorkspaceSource, /shrink-0 items-center gap-2/);
  });

  it("gives pending confirmation cards their own aligned composition", () => {
    assert.match(routesWorkspaceSource, /flex min-h-56 min-w-0 flex-col/);
    assert.match(routesWorkspaceSource, /mt-4 grid grid-cols-2/);
    assert.match(routesWorkspaceSource, /mt-auto grid grid-cols-2/);
  });

  it("supports per-context list row palettes via surface preferences", () => {
    assert.equal(componentSource.includes("rowColorPreview"), false);
    assert.equal(componentSource.includes("listRowColorSwatchForIndex"), false);
    assert.equal(componentSource.includes("SurfaceContextColorTrigger"), false);
    assert.equal(componentSource.includes("usePageListRowPalette"), false);
    assert.equal(componentSource.includes("listRowBaseClass"), true);
  });

  it("filters the toolbar by weekday, route and calendar date", () => {
    const toolbar = logisticsToolbarSource();

    assert.equal(toolbar.includes('ariaLabel="Fecha"'), false);
    assert.equal(toolbar.includes("<LogisticsWeekdayFilterSelect"), true);
    assert.equal(toolbar.includes('ariaLabel="Filtrar por día"'), true);
    assert.equal(toolbar.includes("weekdayFilterOptions"), true);
    assert.equal(toolbar.includes("tones={weekdayTones}"), true);
    assert.equal(toolbar.includes("Programación"), true);
    assert.equal(toolbar.includes('role="group"'), false);
    assert.equal(toolbar.includes("logisticsWeekdayFullLabels"), false);
    assert.equal(toolbar.includes('ariaLabel="Filtrar por ruta del día"'), true);
    assert.equal(toolbar.includes("Asignar"), true);
    assert.equal(toolbar.includes("requestToolbarRouteDriverChange"), true);
    assert.equal(toolbar.includes("toolbarRoute"), true);
    assert.equal(toolbar.includes("Chofer de la ruta"), false);
    assert.equal(toolbar.includes('ariaLabel="Filtrar por chofer"'), true);
    assert.ok(
      toolbar.indexOf('ariaLabel="Filtrar por ruta del día"') <
        toolbar.indexOf("requestToolbarRouteDriverChange"),
    );
    assert.ok(
      toolbar.indexOf("requestToolbarRouteDriverChange") >
        toolbar.indexOf('aria-label="Filtrar tareas por acción"'),
    );
    assert.equal(toolbar.includes('ariaLabel="Filtrar por fecha"'), true);
    assert.equal(toolbar.includes("<DateInput"), true);
    assert.equal(toolbar.includes("dayTones={calendarDayTones}"), true);
    assert.equal(toolbar.includes("showToneLegend"), true);
    assert.equal(componentSource.includes("buildLogisticsCalendarDayTones"), true);
    assert.equal(componentSource.includes("buildLogisticsWeekdayTones"), true);
    assert.equal(toolbar.includes("Todos los días"), true);
    assert.equal(componentSource.includes("logisticsEnabledWeekdayFilterOptions"), true);
    assert.equal(componentSource.includes("enabledWeekdayIndexes"), true);
    assert.equal(componentSource.includes("matchesLogisticsDateFilter"), true);
    assert.equal(toolbar.includes("filterRoutePickerOptions"), true);
    assert.equal(componentSource.includes("buildLogisticsDayRouteFilterOptions"), true);
    assert.equal(componentSource.includes("matchesLogisticsWeekdayFilter"), true);
    assert.equal(toolbar.includes("selectWeekdayFilter(getLogisticsWeekdayIndex(nextDate), nextDate)"), true);
    assert.equal(componentSource.includes("function selectWeekdayFilter(next: number | null, selectedDate?: string)"), true);
    assert.equal(componentSource.includes("selectedDate || selectWeekdayDate(next, todayDate)"), true);
  });

  it("shows when each invoice entered logistics separately from its service date", () => {
    assert.equal(componentSource.includes("formatLogisticsEntryDate"), true);
    assert.equal(componentSource.includes("Agregada a Logística"), true);
    assert.equal(componentSource.includes("displayTask.orderedAt || displayTask.createdAt"), true);
    assert.equal(componentSource.includes("task?.scheduledAt || task?.requestedScheduleAt"), true);
  });

  it("marks the filters trigger active while its panel is open", () => {
    const toolbar = logisticsToolbarSource();

    assert.equal(
      toolbar.includes(
        'className={`${filtersOpen || hasFilters ? primaryButtonClass : secondaryButtonClass} !h-8 shrink-0 px-2 text-xs`}',
      ),
      true,
    );
    assert.equal(toolbar.includes('aria-expanded={filtersOpen}'), true);
  });
});
