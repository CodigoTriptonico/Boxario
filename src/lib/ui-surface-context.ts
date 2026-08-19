/** Contextos donde el usuario puede elegir paleta propia (por página / listado). */
export const UI_SURFACE_CONTEXT_IDS = [
  "logistics.tasks",
  "logistics.confirmations",
  "logistics.preparation",
  "logistics.routes",
  "logistics.history",
  "logistics.routeCatalog",
  "logistics.drivers",
  "logistics.vehicles",
  "shipments.tracking",
  "conductor.tasks",
  "inventory.items",
  "audit.shipments",
  "warehouse.intake",
  "warehouse.inventory",
  "warehouse.pallets",
  "stats.sales",
  "timeclock.admin",
  "sale.senderCard",
  "sale.recipientCard",
  "sale.box",
] as const;

export type UiSurfaceContextId = (typeof UI_SURFACE_CONTEXT_IDS)[number];

export type UiSurfaceContextKind = "listRow" | "personCard";

export type UiSurfaceContextMeta = {
  id: UiSurfaceContextId;
  label: string;
  kind: UiSurfaceContextKind;
  description: string;
  /** Si la página permite alternar filas / tarjetas desde el sidebar. */
  supportsViewLayout?: boolean;
  /** La pagina tambien ofrece una vista tabular tipo Excel. */
  supportsExcelLayout?: boolean;
};

export const UI_SURFACE_CONTEXTS: UiSurfaceContextMeta[] = [
  {
    id: "logistics.tasks",
    label: "Logística",
    kind: "listRow",
    description: "Filas, tarjetas y tabla tipo Excel de tareas e invoices.",
    supportsViewLayout: true,
    supportsExcelLayout: true,
  },
  {
    id: "logistics.confirmations",
    label: "Logística · por confirmar",
    kind: "listRow",
    description: "Filas, tarjetas y tabla de solicitudes por confirmar.",
    supportsViewLayout: true,
    supportsExcelLayout: true,
  },
  {
    id: "logistics.preparation",
    label: "Logística · preparación",
    kind: "listRow",
    description: "Filas, tarjetas y tabla de grupos listos para crear ruta.",
    supportsViewLayout: true,
    supportsExcelLayout: true,
  },
  {
    id: "logistics.routes",
    label: "Logística · rutas",
    kind: "listRow",
    description: "Filas, tarjetas y tabla de rutas reales.",
    supportsViewLayout: true,
    supportsExcelLayout: true,
  },
  {
    id: "logistics.history",
    label: "Logística · historial",
    kind: "listRow",
    description: "Filas, tarjetas y tabla de rutas terminadas o canceladas.",
    supportsViewLayout: true,
    supportsExcelLayout: true,
  },
  {
    id: "logistics.routeCatalog",
    label: "Logística · calendario y rutas",
    kind: "listRow",
    description: "Lista de rutas configuradas en formato lista o tarjetas.",
    supportsViewLayout: true,
  },
  {
    id: "logistics.drivers",
    label: "Logística · conductores",
    kind: "personCard",
    description: "Conductores en formato lista o tarjetas.",
    supportsViewLayout: true,
  },
  {
    id: "logistics.vehicles",
    label: "Logística · vehículos",
    kind: "listRow",
    description: "Vehículos en formato lista o tarjetas.",
    supportsViewLayout: true,
  },
  {
    id: "shipments.tracking",
    label: "Seguimiento",
    kind: "listRow",
    description: "Filas, tarjetas y tabla tipo Excel del listado de envíos.",
    supportsViewLayout: true,
    supportsExcelLayout: true,
  },
  {
    id: "conductor.tasks",
    label: "Conductor",
    kind: "listRow",
    description: "Filas de tareas del conductor.",
    supportsViewLayout: true,
  },
  {
    id: "inventory.items",
    label: "Inventario",
    kind: "listRow",
    description: "Filas y tarjetas de los artículos de inventario.",
    supportsViewLayout: true,
  },
  {
    id: "audit.shipments",
    label: "Auditoría",
    kind: "listRow",
    description: "Filas y tarjetas de los invoices auditados.",
    supportsViewLayout: true,
  },
  {
    id: "warehouse.intake",
    label: "Ingreso a bodega",
    kind: "listRow",
    description: "Filas y tarjetas de las cajas recibidas.",
    supportsViewLayout: true,
  },
  {
    id: "warehouse.inventory",
    label: "Bodega",
    kind: "listRow",
    description: "Filas y tarjetas de las cajas en bodega.",
    supportsViewLayout: true,
  },
  {
    id: "warehouse.pallets",
    label: "Paletas",
    kind: "listRow",
    description: "Filas y tarjetas de cajas para paletizar.",
    supportsViewLayout: true,
  },
  {
    id: "stats.sales",
    label: "Estadísticas ventas",
    kind: "listRow",
    description: "Filas del panel de ventas.",
    supportsViewLayout: true,
  },
  {
    id: "timeclock.admin",
    label: "Control horario",
    kind: "listRow",
    description: "Filas de empleados y registros.",
    supportsViewLayout: false,
  },
  {
    id: "sale.senderCard",
    label: "Venta · remitente",
    kind: "personCard",
    description: "Filas, tarjetas y tabla tipo Excel de remitentes.",
    supportsViewLayout: true,
    supportsExcelLayout: true,
  },
  {
    id: "sale.recipientCard",
    label: "Venta · destinatario",
    kind: "personCard",
    description: "Filas, tarjetas y tabla tipo Excel de destinatarios.",
    supportsViewLayout: true,
    supportsExcelLayout: true,
  },
  {
    id: "sale.box",
    label: "Venta · caja",
    kind: "listRow",
    description: "Filas y tarjetas del catálogo de cajas.",
    supportsViewLayout: true,
  },
];

export function isUiSurfaceContextId(value: string): value is UiSurfaceContextId {
  return (UI_SURFACE_CONTEXT_IDS as readonly string[]).includes(value);
}

export function uiSurfaceContextMeta(id: UiSurfaceContextId) {
  return UI_SURFACE_CONTEXTS.find((entry) => entry.id === id)!;
}

export function surfaceContextSupportsViewLayout(id: UiSurfaceContextId) {
  return uiSurfaceContextMeta(id).supportsViewLayout !== false;
}

export function surfaceContextSupportsExcelLayout(id: UiSurfaceContextId) {
  return uiSurfaceContextMeta(id).supportsExcelLayout === true;
}
