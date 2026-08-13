import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "../components/logistica");
const workspace = readFileSync(join(root, "logistics-routes-workspace.tsx"), "utf8");
const navigation = readFileSync(join(root, "logistics-section-nav.tsx"), "utf8");
const routeList = readFileSync(join(root, "logistics-unified-route-list.tsx"), "utf8");
const routeDetail = readFileSync(join(root, "logistics-routes-workspace-details.tsx"), "utf8");
const preparationGroups = readFileSync(join(root, "logistics-template-booking-groups.tsx"), "utf8");
const taskFilters = readFileSync(join(root, "lib/use-logistics-filters.ts"), "utf8");

describe("logistics route stages UI", () => {
  it("presents preparation as its own operation stage", () => {
    const confirmationIndex = navigation.indexOf('id: "confirmations"');
    const preparationIndex = navigation.indexOf('id: "templates"');
    const routesIndex = navigation.indexOf('id: "operational"');
    const historyIndex = navigation.indexOf('id: "history"');

    assert.ok(confirmationIndex >= 0);
    assert.ok(preparationIndex > confirmationIndex);
    assert.ok(routesIndex > preparationIndex);
    assert.ok(historyIndex > routesIndex);
    assert.equal(navigation.includes('label: "Preparación"'), true);
  });

  it("keeps pending groups and real routes in separate panels", () => {
    assert.equal(workspace.includes('tab === "templates"'), true);
    assert.equal(workspace.includes('tab === "operational"'), true);
    assert.equal(workspace.includes("Grupos listos para confirmar"), true);
    assert.equal(workspace.includes("availableWeekdays={operationalWeekdays}"), true);
    assert.equal(workspace.includes("catalog={routeCatalog}"), false);
    assert.equal(workspace.includes("bookings={bookings}"), false);
  });

  it("shows only concrete active routes in the routes list", () => {
    assert.match(routeList, /route\.status === "draft"\s*\|\|\s*route\.status === "planned"\s*\|\|\s*route\.status === "in_progress"/);
    assert.equal(routeList.includes("No hay rutas creadas para este día."), true);
    assert.match(routeList, /Los grupos aparecen aquí como rutas cerradas después de\s+confirmarlos en Preparación\./);
    assert.equal(routeList.includes("subruta activa"), false);
    assert.equal(routeList.includes("matchesBooking"), false);
  });

  it("starts preparation groups collapsed and moves the operator to routes after creation", () => {
    assert.equal(preparationGroups.includes("useState<Set<string>>(() => new Set())"), true);
    assert.equal(preparationGroups.includes("Esperando confirmación"), true);
    assert.equal(preparationGroups.includes('"Confirmar ruta"'), true);
    assert.equal(preparationGroups.includes("hidden={!data.expanded}"), true);
    assert.equal(workspace.includes('router.push("/logistica?view=rutas&tab=operational")'), true);
  });

  it("allows selecting individual requests or the complete preparation group", () => {
    assert.equal(preparationGroups.includes("const [selectedIds, setSelectedIds]"), true);
    assert.equal(preparationGroups.includes("toggleGroup(group.items)"), true);
    assert.equal(preparationGroups.includes("Seleccionar todas las solicitudes de"), true);
    assert.equal(preparationGroups.includes('role={canManage ? "checkbox" : undefined}'), true);
    assert.equal(preparationGroups.includes("selectedItems"), true);
    assert.equal(preparationGroups.includes('data.publishedRoute ? "Actualizar ruta" : "Confirmar ruta"'), true);
    assert.equal(preparationGroups.includes("onCreateRoute(group.key, data.selectedItems)"), true);
  });

  it("never flashes the route detail while the operator is still in preparation", () => {
    assert.equal(workspace.includes('const showSelectedRoute = Boolean(selectedRoute && (tab === "operational" || tab === "history"))'), true);
    assert.equal(workspace.includes('showSelectedRoute ? <aside className="hidden min-h-0 overflow-hidden lg:block">{detail}</aside> : null'), true);
    assert.equal(workspace.includes('selectedRoute && showSelectedRoute'), true);
  });

  it("only shows preparation day filters that contain pending groups", () => {
    assert.equal(workspace.includes("const preparationWeekdays = useMemo"), true);
    assert.equal(workspace.includes('if (booking.status !== "template_confirmed") continue;'), true);
    assert.equal(workspace.includes("weekdays={preparationWeekdays}"), true);
    assert.equal(workspace.includes("selectedWeekday={activePreparationWeekday}"), true);
    assert.equal(workspace.includes("if (activePreparationWeekday == null) continue;"), true);
    assert.equal(workspace.includes("getLogisticsWeekdayIndex(booking.routeDate) !== activePreparationWeekday"), true);
    assert.equal(workspace.includes("No hay grupos esperando confirmar ruta en esta semana."), true);
  });

  it("only shows route day filters that contain real routes in the visible week", () => {
    assert.equal(workspace.includes("const operationalWeekdays = useMemo"), true);
    assert.equal(workspace.includes('route.status !== "draft" && route.status !== "planned" && route.status !== "in_progress"'), true);
    assert.equal(workspace.includes("availableWeekdays={operationalWeekdays}"), true);
    assert.equal(routeList.includes("No hay rutas creadas en esta semana."), true);
    assert.match(routeList, /normalizeGenericLogisticsRouteName\(\s*route\.name/);
  });

  it("expands a route with the complete operational detail for every stop", () => {
    assert.equal(routeList.includes("expandedRouteId"), true);
    assert.equal(routeList.includes('stop.shipmentCode || "Sin invoice"'), true);
    assert.match(routeList, /stop\.customerName\s*\|\|\s*stop\.address\.name/);
    assert.equal(routeList.includes("stop.address.formattedAddress"), true);
    assert.equal(routeList.includes("stop.address.phone"), true);
    assert.equal(routeList.includes("stop.boxSummary || \"Medidas no registradas\""), true);
    assert.match(routeList, /stop\.taskType === "pickup_full_box"\s*\?\s*"Recoger"\s*:\s*"Dejar"/);
  });

  it("always lets the operator close the selected route detail", () => {
    assert.equal(routeDetail.includes('aria-label="Cerrar detalle de ruta"'), true);
    assert.equal(routeDetail.includes("onClick={onDismiss}"), true);
    assert.equal(workspace.includes('event.key !== "Escape"'), true);
    assert.equal(workspace.includes("dismissSelectedRoute"), true);
    assert.equal(routeList.includes('id={`route-trigger-${route.id}`}'), true);
  });

  it("derives task-board day filters from real content instead of configured days", () => {
    assert.equal(taskFilters.includes("const availableFilterWeekdays = useMemo"), true);
    assert.equal(taskFilters.includes("for (const item of invoiceItems)"), true);
    assert.equal(taskFilters.includes("for (const booking of pendingBookings)"), true);
    assert.equal(taskFilters.includes("for (const route of routes)"), true);
    assert.equal(taskFilters.includes("enabledWeekdayIndexes(routeCatalog"), false);
  });
});
