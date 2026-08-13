# Auditoría de Arquitectura y Mantenibilidad

Fecha: **2026-08-02**  
Alcance: análisis de solo lectura del código fuente real en `C:\Users\pablo\OneDrive\Documentos\Codigo\Paginas\Boxario`.  
Agente: Architecture and Maintainability (Agent 1).

---

## Metodología

1. Lectura de la arquitectura documentada (`docs/ARQUITECTURA.md`, `docs/MAPA_FUNCIONAL_ACTUAL.md`, `01_PROJECT_MAP.md`) y contraste con el código.
2. Ejecución de `npm run check:architecture` (script `scripts/check-architecture.mjs` + `scripts/lib/architecture-health.mjs`): ciclos, inversiones de capa, límite de 800 líneas.
3. Inventario de capas: `src/app` (páginas/API), `src/app/actions`, `src/components`, `src/lib`, `src/hooks`, `supabase/migrations`.
4. Medición de tamaños (líneas reales por `split(/\r?\n/)`, bytes), funciones exportadas grandes, acoplamiento UI→actions (imports de valor y `import type`), acceso a Supabase desde UI.
5. Muestreo de módulos críticos de dominio (`logistics-state-machine`, `invoice-billing`, `warehouse-intake`, `distribution`, auth/permissions) y de pantallas densas (venta, logística, bodega, platform).
6. Separación explícita entre **defectos técnicos** (acoplamiento, límites, mezcla de responsabilidades) y **preferencias** (organización de carpetas, estilo de componentes).

No se modificó lógica de negocio, dependencias ni estructura del producto (salvo la creación de este informe).

---

## Aspectos bien implementados

- **Capas claras y enforceadas.** El flujo documentado UI → server actions → `src/lib` → Supabase/Postgres+RLS coincide con el código. `check:architecture` reporta **707 archivos runtime** sin ciclos, sin `src/lib` → `@/app/actions`/`@/components`, y sin actions → components.
- **Autoridad de negocio fuera de la UI.** Dinero, stock, permisos y estados críticos tienen fuente en RPC/SQL + dominio TS (`invoice-billing.ts`, `logistics-state-machine.ts`, `permissions.ts`, custodia/paquetes). La UI llama actions; no se observó cliente Supabase de escritura en components (solo checks `isSupabaseConfigured`).
- **Patrones de caso de uso reutilizables.** `src/lib/actions/context.ts` (`requireScopedActionContext`) y `src/lib/actions/errors.ts` (`ok`/`fail`) estandarizan sesión, permisos y resultados.
- **Particiones incrementales ya hechas.** `shipments.ts` es barrel de módulos partidos; `logistics-routes*.ts` está fragmentado por verbo; `inventory/` y `customer-route-assignments/` son carpetas de dominio con test de techo (`action-domain-module-size.test.ts`). Eso demuestra que el proyecto ya sabe partir sin reescribir.
- **Contratos de dominio en `src/lib`.** Tipos y reglas de envíos, inventario, distribución (`src/lib/distribution/*`), display y routing viven en lib; varios actions reexportan tipos de lib en lugar de reinventarlos.
- **Documentación operativa útil.** `docs/ARQUITECTURA.md` incluye puntos de extensión, fuentes de verdad SQL↔TS y qué tests correr. Reduce el costo de “dónde tocar” al agregar features.
- **Aislamiento consciente de contabilidad experimental.** Documentado y separado del ledger operativo (`shipment_payments`); evita acoplar un rediseño contable al flujo diario.

---

## Hallazgos

### H1 — Archivos runtime pegados al techo de 800 líneas

| Campo | Valor |
| --- | --- |
| **Severidad** | Alta |
| **Certeza** | Confirmado |
| **Ubicación** | Entre otros: `src/components/logistica/task-schedule/logistics-task-schedule-confirm-panel-view.tsx` (798), `src/app/actions/logistics-fleet.ts` (790), `src/components/logistica/fleet/logistics-fleet-admin-client-view.tsx` (789), `src/components/shipment-progress-steps.tsx` (785), `src/components/platform/platform-console.tsx` (784), `src/app/actions/distribution.ts` (779), `src/components/inventory-movements-panel.tsx` (778), `src/components/inventory/inventory-item-grid.tsx` (774). En total **9 archivos en 750–800** líneas; **32 archivos >600**. |
| **Evidencia** | `npm run check:architecture` pasa hoy; el medidor de líneas del propio gate usa el mismo criterio. Cualquier adición de UI/caso de uso en esos módulos rompe el gate o fuerza un split de emergencia. |
| **Impacto técnico** | Frena features en los módulos más activos (logística, flota, inventario, distribución, platform). El límite deja de ser “higiene” y pasa a ser cuello de botella de entrega. |
| **Corrección propuesta** | Extraer por responsabilidad **antes** de la feature siguiente: vistas/subpaneles en UI; queries vs mutaciones vs mappers en actions. Reutilizar el patrón ya usado en `inventory/` y `logistics-route-*-actions.ts`. No bajar el límite global de golpe; bajar presión en los 9 archivos frontera. |

---

### H2 — Componentes/hooks “dios” con cientos de líneas en una sola función exportada

| Campo | Valor |
| --- | --- |
| **Severidad** | Alta |
| **Certeza** | Confirmado |
| **Ubicación** | `LogisticsFleetAdminClient` (~726 líneas de span), `LogisticsTaskScheduleConfirmPanel` (~726), `RolesPermissionsPanel` (~699), `PlatformConsole` (~693), `EnviosClient` (~659), `useInventoryTreeCrud` (~637), `useVentaInvoices` (~628), `VentaOverlays` (~612), etc. |
| **Evidencia** | Heurística sobre `export function` / `function` en components+actions: decenas de funciones ≥120 líneas; las mayores concentran estado, handlers y JSX en un solo cuerpo. |
| **Impacto técnico** | Diffs grandes, conflictos de merge, tests de UI difíciles, riesgo de regresiones al tocar un detalle visual. Distinto del conteo de archivo: un archivo de 700 líneas con 10 funciones es más manejable que uno con una sola función de 700. |
| **Corrección propuesta** | Partir por superficie visible (lista / detalle / diálogos / filtros) y por hooks de orquestación ya existentes en `sale/venta/*` y `logistica/lib/*`. Extraer helpers puros a `src/lib` solo cuando la lógica no sea de presentación. |

---

### H3 — DTOs de dominio definidos en la capa de actions e importados por la UI

| Campo | Valor |
| --- | --- |
| **Severidad** | Media |
| **Certeza** | Confirmado |
| **Ubicación** | Tipos en actions: `LogisticsRouteCatalog` / `LogisticsWeekdaySchedule` en `src/app/actions/logistics-routes-shared.ts`; `OrgUserRow` en `users.ts`; `WarehouseTruckArrival` en `physical-packages.ts`. **≥26 archivos** de components hacen `import type` desde `@/app/actions/...` (logística, config, envíos, conductor, warehouse). |
| **Evidencia** | `src/components/logistica/types.ts` importa el catálogo desde actions; paneles de flota/schedule/filters repiten el mismo import; warehouse-intake importa `WarehouseTruckArrival` desde `physical-packages`. El gate **no** prohíbe UI→actions (es el flujo esperado para mutaciones), pero acoplar **tipos de dominio** a módulos `"use server"` mezcla contrato con I/O. |
| **Impacto técnico** | Mover o partir un action obliga a tocar UI aunque no cambie el contrato. Dificulta reutilizar el mismo DTO desde lib/tests sin cruzar la frontera del servidor. |
| **Corrección propuesta** | Incremental: mover DTOs estables a `src/lib/...` (como ya hace `src/lib/distribution/types.ts`) y dejar que actions reexporten si hace falta por compatibilidad. Empezar por `LogisticsRouteCatalog` (mayor fan-in: ~26 imports del módulo `logistics-routes`). |

---

### H4 — Actions monolíticas que aún no adoptaron el split de dominio

| Campo | Valor |
| --- | --- |
| **Severidad** | Media |
| **Certeza** | Confirmado |
| **Ubicación** | `src/app/actions/logistics-fleet.ts` (790), `distribution.ts` (779), `inventory/catalog.ts` (735), `shipment-journal.ts` (681), `conductor-truck-actions.ts` (680). Contraste: `logistics-routes.ts` ya es facade; `inventory/` y `customer-route-assignments/` ya están partidos. |
| **Evidencia** | Conteos de líneas; lectura de `logistics-fleet.ts` (sesión, storage, CRUD conductores/vehículos, candidaturas, historial en un solo archivo); `distribution.ts` mezcla partners, ofertas, ledger, ventas y export CSV. |
| **Impacto técnico** | Alto costo de cambio en features de flota/distribución; peor revisión en PR; inconsistencia de estilo con módulos ya refactorizados. |
| **Corrección propuesta** | Aplicar el mismo patrón facade + archivos por verbo/subdominio. Prioridad: `logistics-fleet` y `distribution` (más cerca del techo y con UI dedicada grande). |

---

### H5 — `src/lib` raíz saturada (descubrimiento y ownership)

| Campo | Valor |
| --- | --- |
| **Severidad** | Media |
| **Certeza** | Confirmado |
| **Ubicación** | **144** archivos `.ts` runtime en la raíz de `src/lib` frente a **31** subdirectorios (`auth`, `distribution`, `sale`, `shipment-display`, etc.). |
| **Evidencia** | Listado directo del directorio: decenas de `shipment-*`, `logistics-*`, `inventory-*`, `sale-*`, `ui-surface-*` al mismo nivel. |
| **Impacto técnico** | No es un bug de capas, pero encarece encontrar la fuente de verdad y favorece duplicar helpers “cerca” de la UI. Mezcla dominio operativo con utilidades de UI (`floating-panel-position`, `date-picker`, paletas). |
| **Corrección propuesta** | Preferencia de organización con beneficio técnico: agrupar por prefijo existente (`shipment/`, `logistics/`, `inventory/`, `ui-surface/`) **sin** cambiar APIs públicas de golpe (reexport desde paths viejos o mover en PRs chicos por familia). No es reescritura; es housekeeping alineado a carpetas que ya existen. |

---

### H6 — Raíz de `src/components` inconsistente con subdominios

| Campo | Valor |
| --- | --- |
| **Severidad** | Baja |
| **Certeza** | Confirmado |
| **Ubicación** | **59** archivos en la raíz de `src/components` (`envios-client.tsx`, `inventario-client.tsx`, `inventory-movements-panel.tsx`, `shipment-progress-steps.tsx`, …) mientras existen carpetas `envios/`, `inventory/`, `warehouse/`, `logistica/`, `sale/`. |
| **Evidencia** | Inventario de directorio; pantallas hermanas viven a veces en carpeta y a veces en raíz. |
| **Impacto técnico** | Fricción al localizar dueños; nuevos archivos tienden a “caer” en la raíz y crecer ahí (varios de los >700 LOC están en raíz). |
| **Corrección propuesta** | Al tocar un módulo, mover el entry client a su carpeta de dominio (como ya ocurrió parcialmente con `sale/venta` y `warehouse/`). Preferencia de estructura, no defecto de runtime. |

---

### H7 — Densidad extrema en pantallas operativas (bytes vs líneas)

| Campo | Valor |
| --- | --- |
| **Severidad** | Media |
| **Certeza** | Confirmado |
| **Ubicación** | `src/components/warehouse/warehouse-intake-client.tsx` (~583 líneas / **~49.5 KB**); también paneles densos de venta (`sale/venta/*`, 27 archivos) y distribución (`distribution-workspace.tsx`). |
| **Evidencia** | Tamaño en disco vs líneas; el archivo de ingreso a bodega concentra JSX largo en pocas líneas (clases Tailwind densas, subcomponentes locales). Reglas de negocio de intake sí están en `src/lib/warehouse-intake.ts` (bien). |
| **Impacto técnico** | El gate de líneas no refleja el costo cognitivo: un archivo “bajo 800” puede ser más pesado de mantener que uno de 750 líneas aireadas. Onboarding lento para cambios de bodega/venta. |
| **Corrección propuesta** | Extraer filas/drawers/metric strips a archivos hermanos; reutilizar `CompactInfoDisclosure` del design system en lugar de `IntakeInfoDisclosure` local (también alinea `docs/GUIA_ESTILO_UI.md`). Mantener mutaciones en `warehouse-intake` actions. |

---

### H8 — El gate de arquitectura no cubre tests ni complejidad

| Campo | Valor |
| --- | --- |
| **Severidad** | Baja |
| **Certeza** | Confirmado |
| **Ubicación** | `scripts/lib/architecture-health.mjs` excluye `*.test.*`; tests en `src/lib` importan actions/components (`public-api.contract.test.ts`, `database-types-drift.test.ts`, tests de UI labels). |
| **Evidencia** | Código del analizador (`TEST_FILE_PATTERN`); imports reales en esos tests. |
| **Impacto técnico** | El semáforo verde no garantiza que contratos DB/UI no se acoplen vía tests. Riesgo bajo hoy; puede normalizar atajos. |
| **Corrección propuesta** | Opcional: permitir imports de actions en tests de contrato de forma explícita (allowlist) o mover tipos DB a `src/lib` para que el drift test no dependa de actions. No endurecer el gate de ciclos sobre tests sin diseño previo. |

---

### H9 — Orquestación de Venta muy fragmentada pero aún pesada

| Campo | Valor |
| --- | --- |
| **Severidad** | Baja |
| **Certeza** | Confirmado |
| **Ubicación** | `src/components/sale/venta/` (27 módulos: `use-venta-*`, steps, overlays). Hooks grandes (`use-venta-invoices`, `use-venta-data`, `use-venta-core`) siguen >600 líneas y usan helpers de dinero de lib. |
| **Evidencia** | Listado del directorio; tamaños; imports de actions (`createShipmentAction`, `allocateInvoiceNumberAction`) + `parseMoneyValue` en el hook de facturas. |
| **Impacto técnico** | No es spaghetti clásico (hay límites de módulo), pero el grafo mental de “dónde cambia el flujo de venta” sigue alto. Riesgo de lógica de preview/UI divergente del dominio si se acumulan cálculos en hooks. |
| **Corrección propuesta** | Preferir que cálculos de cotización/depósito vivan solo en `invoice-billing` / actions; dejar hooks como cableado de estado y llamadas. Partir overlays/diálogos cuando se toque esa superficie. **No** reescribir el wizard. |

---

### H10 — Reexport de tipos lib vía actions (doble puerta de import)

| Campo | Valor |
| --- | --- |
| **Severidad** | Informativa |
| **Certeza** | Confirmado |
| **Ubicación** | Al menos 8 actions reexportan tipos desde lib (`distribution.ts`, `logistics-fleet.ts`, `sale-bootstrap.ts`, `customers.ts`, …). UI importa a veces desde actions y a veces desde lib. |
| **Evidencia** | `export type { … } from "@/lib/..."` en esos archivos; `distribution-workspace.tsx` importa tipos de workspace desde el action. |
| **Impacto técnico** | Conveniente a corto plazo; a medio plazo confunde la “casa” del contrato. |
| **Corrección propuesta** | Convención: UI importa tipos de dominio desde `@/lib/...`; actions solo exportan funciones y `ActionResult`. Migrar imports en el PR que toque cada pantalla. |

---

## Métricas útiles

| Métrica | Valor (2026-08-02) |
| --- | --- |
| `npm run check:architecture` | OK — 707 archivos runtime, 0 ciclos, 0 inversiones de capa, 0 archivos >800 (excepto `.generated`) |
| Next.js | 16.2.11 (App Router) |
| Archivos actions (`src/app/actions/**`) | ~79 runtime |
| Actions >500 líneas | 13 |
| Actions >700 líneas | 3 (`logistics-fleet`, `distribution`, `inventory/catalog`) |
| Components ≥550 líneas | 29 |
| Archivos en zona 750–800 | 9 |
| Imports UI/pages → `@/app/actions` | ~134 desde components + ~34 desde páginas app (excl. actions) |
| Archivos components con `import type` desde actions | ≥26 |
| Imports runtime `src/lib` → actions/components | 0 (gate) |
| Acceso Supabase cliente de escritura en components | No observado; solo `isSupabaseConfigured` |
| Archivos en raíz `src/lib` | 144 |
| Archivos en raíz `src/components` | 59 |
| Subdominios actions ya partidos | `inventory/`, `customer-route-assignments/`; facade `shipments.ts`, `logistics-routes.ts` |
| `database.generated.ts` | ~11.7k líneas (excluido del techo por `.generated.`) |

---

## Conclusión del agente

La arquitectura de Boxario es **sólida en capas y gobernanza**: el monolito Next.js está bien acotado, el gate de arquitectura funciona, y las reglas críticas viven donde corresponde (SQL/RPC + `src/lib`). No hay evidencia de ciclos ni de inversión lib→UI en runtime.

El riesgo real de mantenibilidad no es “hay que reescribir el proyecto”, sino **presión acumulada en pantallas y actions frontera (750–800 líneas)** y **contratos DTO todavía anclados a actions**. Las correcciones de mayor retorno son incrementales y ya tienen precedente en el repo: partir flota/distribución/confirmación de agenda como se partió logística de rutas e inventario; mover DTOs estables a `src/lib`; y descomponer funciones dios al tocar esas features.

Prioridad sugerida (sin big-bang):

1. Aliviar los 9 archivos en 750–800 (empezar por confirmación de agenda, flota y `logistics-fleet` / `distribution` actions).  
2. Relocar `LogisticsRouteCatalog` (y tipos hermanos) a lib.  
3. Housekeeping ligero de raíces `lib`/`components` solo por familia cuando se toquen.

Nada de lo anterior requiere cambiar el modelo mental del producto ni relajar RLS/permisos.
