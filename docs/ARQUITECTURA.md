# Arquitectura de Boxario

Guía para ubicar responsabilidades. Refleja la arquitectura **real** tras Fases 1–2, no un rediseño ideal.

## Capas

```text
UI (src/components, src/app/**/page.tsx)
        ↓
Acciones / casos de uso (src/app/actions/*)   ← "use server"
        ↓
Dominio TypeScript (src/lib/*)                ← reglas, mappers, previews
        ↓
Infraestructura (src/lib/supabase/*, src/lib/db/*)
        ↓
PostgreSQL + RLS + RPC (supabase/migrations)
```

**Prohibido (enforceado por `npm run check:architecture`):**

- `src/lib` → `@/app/actions` o `@/components`
- `src/app/actions` → `@/components`
- ciclos de importación
- archivos runtime &gt; 800 líneas (salvo `.generated.`)

La UI nunca es autoridad de dinero, stock, permisos, ni estados críticos.

## Dónde vive cada cosa

| Qué | Dónde |
| --- | --- |
| Pantallas / formularios | `src/components/**`, páginas en `src/app/**/page.tsx` |
| Casos de uso (leer/escribir) | `src/app/actions/**` |
| Reglas de dominio TS | `src/lib/**` (p. ej. `logistics-state-machine`, `invoice-billing`, `inventory-*`) |
| Sesión y permisos app | `src/lib/auth/**` |
| Clientes Supabase | `src/lib/supabase/**` (scoped / admin / server) |
| Tipos DB generados | `src/lib/db/database.generated.ts`, aliases en `src/lib/db/index.ts` |
| Contratos de dominio (filas UI) | `src/lib/shipment-types.ts`, `src/lib/logistics-routing.ts`, `src/lib/inventory-types.ts`, … |
| Esquema, RLS, RPC, triggers | `supabase/migrations/*.sql` |
| Documentación de reglas | `docs/REGLAS_NEGOCIO_Y_DEPENDENCIAS.md` |
| UI / mensajes | `docs/GUIA_ESTILO_UI.md` |
| Infra / compatibilidad | `docs/DECISIONES_TECNICAS_Y_COMPATIBILIDAD.md` |
| Mapa funcional | `docs/MAPA_FUNCIONAL_ACTUAL.md` |

## Fuentes de verdad (resumen)

| Regla | Autoridad final | Preview / anticipación TS | Nota |
| --- | --- | --- | --- |
| Pagos / saldo | RPC `collect_shipment_invoice_payment` + columnas `shipments` / `shipment_payments` | `conductor-driver-payment.ts` | Cliente no manda montos autoritativos |
| Total cotizado | Persistido en `logistics_plan` vía `create_shipment_sale_atomic`; guard `166` | `invoice-billing.ts` al crear | FIN-004: el pago no lo sube |
| Estado de ruta | RPCs publish/start (+ tabla); RLS conductor | `logistics-state-machine.ts` | Cancel aún UPDATE directo + assert TS |
| Estado de tarea | `update_logistics_task_atomic` / complete/load RPCs | mismo state-machine | Paridad SQL↔TS por diseño |
| Estado de envío | Escritura TS/domain (`shipment-display/status`, actions) | display buckets ≠ DB | No usar buckets UI como estado persistido |
| Disponible inventario | RPC movimiento + `stock - reserved` en SQL | helpers TS + UI | SQL decide en mutación |
| Reservas | Tabla/RPCs `inventory_sale_reservations` | flags de plan son señales | |
| Custodia física | `package_custody_*` + triggers | `package-custody.ts` | Distinto de rollup inventario |
| Días operativos | `delivery_days` vía RPCs `164` | UI calendario / Ventas | LOG-007: no escribir desde Costos |
| Permisos | Matriz SQL + `user_has_permission` | `sessionHasPermission` | UI oculta; SQL deniega |
| Identidad / org | `auth.uid()` / `current_organization_id()` | sesión app | Nunca confiar org/actor del body |
| Notificaciones ruta | `notify_logistics_route_change` + RLS recipient | list/mark-read TS | |
| Auditoría operativa | `record_activity_history` | wrapper `activity-history.ts` | INSERT directo denegado |
| Auditoría compliance | `immutable_audit_events` | — | Inmutable |
| Zona horaria operativa | Cierre/reloj: `America/Los_Angeles` explícito | `schedule-date` usa Date local | Documentar al tocar fechas |

## Dependencias entre dominios

```text
Ventas → consume Logística (días/rutas) e Inventario (stock)
Envíos → coordina ventas + logística + pagos
Logística → rutas/tareas; notifica conductor
Inventario SKU ⟂ Paquetes físicos   (sistemas distintos; no inventar vínculo)
Pagos → shipment_payments (vivo) ⟂ Contabilidad 071 (experimental, no conectar)
Distribución / Agencias → contratos propios; no mezclar ledgers
```

Flujos cross-dominio: preferir **RPC atómico** o **caso de uso coordinador** en `actions`. No escribir tablas ajenas “a mano” desde otro dominio.

## Puntos de extensión (cambio normal)

| Quiero… | Empieza aquí | También suele tocar |
| --- | --- | --- |
| Nueva regla de negocio | `docs/REGLAS_…` + dominio `src/lib` y/o migración RPC | actions + tests DB |
| Nueva pantalla | `src/app/.../page.tsx` + `src/components/...` | permisos path + nav |
| Nueva consulta listada | action en `src/app/actions` con limit/offset/orden | índices si volumen |
| Nuevo RPC | migración nueva (siguiente número) | action caller + integrity test |
| Nuevo permiso | catálogo SQL + `role_permissions` + `permissions.ts` | RLS/RPC si protege dato |
| Nueva transición de estado | SQL + `logistics-state-machine.ts` (paridad) | tests de transición |
| Nueva notificación de ruta | RPC `notify_logistics_route_change` / tabla | panel conductor |

## Simulación de extensión

Mapa rápido de archivos que suelen cambiar al extender el producto (sin alterar reglas de negocio existentes). Preferir paridad SQL↔TS y documentar en `REGLAS_…` cuando la semántica sea nueva.

| Extensión | Archivos típicos |
| --- | --- |
| Nuevo tipo de tarea logística | `logistics-routing.ts` (`LogisticsTaskType`), `logistics-state-machine.ts`, enum/check SQL + RPC de tareas, `shipment-types.ts`, UI conductor/logística (`conductor-tasks`, paneles de ruta) |
| Nuevo estado de paquete físico | `physical-packages.ts`, `logistics-state-machine.ts` (transiciones), triggers/`package_custody_*` SQL, labels UI bodega, `package-custody.ts` si hay evento nuevo |
| Nuevo método de pago | `payment-methods.ts`, validación en cobro (`conductor-driver-payment`, RPC `collect_shipment_invoice_payment` / check SQL si aplica), UI Ventas/Conductor |
| Nuevo filtro de rutas | UI logística (`src/components/logistica/**`), helpers de vista en `logistics-view.ts` / filtros del board; sin tocar máquina de estados |
| Nueva categoría de inventario | tabla `inventory_categories` + seed/migración, `inventory-tree` / `inventory-leaf-state`, pantallas de inventario y enlaces de catálogo (`pricing_country_boxes.catalog_key`) |
| Nueva notificación | RPC/`notify_logistics_route_change` o tabla de notificaciones, actions list/mark-read, panel conductor; RLS por destinatario |
| Nuevo permiso | catálogo SQL `permissions` + `role_permissions`, `src/lib/auth/permissions.ts` (`PATH_PERMISSIONS` / keys), gates en actions y UI |

## Qué pruebas ejecutar

| Cambio | Mínimo |
| --- | --- |
| Solo UI | `npm run typecheck` · `npm run lint` · tests eval del módulo |
| Dominio / actions | + `npm run test:gate` · `npm run check:architecture` |
| Schema / RPC / RLS | + `npm run quality:db` (requiere Supabase local) |
| Tipos DB | `npm run codegen:db-types` · `npm run check:db-types` |
| Antes de PR | `npm run quality:gate` (+ `quality:db` si tocó datos) |

## Contabilidad

Motor 071 + `business-commands.ts` están **aislados / experimentales**. La UI de `/contabilidad` no escribe al GL. El dinero operativo vive en `shipment_payments`. No unificar ledgers en esta fase.
