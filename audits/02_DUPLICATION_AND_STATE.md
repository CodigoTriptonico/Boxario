# Auditoría de Duplicaciones, Variables y Estado

**Agente:** 2 — Duplicación, Variables y Estado  
**Fecha:** 2026-08-02  
**Alcance:** `src/` (código de aplicación); contraste con `docs/ARQUITECTURA.md`, `docs/FASE3_LINEA_BASE.md` y SQL de permisos  
**Modo:** solo lectura de fuentes; informe escrito en `audits/02_DUPLICATION_AND_STATE.md`

---

## Metodología

1. Ejecutar `npm run check:duplicates` (jscpd, umbral 3 %, `min-lines 5`, `min-tokens 50`, sin tests).
2. Generar informe JSON adicional (`.jscpd-report/jscpd-report.json`) para clasificar clones; separar `database.generated.ts` del resto.
3. Contrastar clones y patrones con la matriz de **fuentes de verdad** documentada (SQL autoridad + preview TS).
4. Revisar permisos (`sessionHasPermission` vs `user_has_permission` / `role_permissions`).
5. Buscar estado mutable a nivel de módulo, caches globales, eventos custom y stores compartidos.
6. No inventar problemas: omitir constantes inmutables de módulo justificadas (p. ej. tablas de transición) y dualidades de autoridad documentadas.

### Resultado jscpd (evidencia cuantitativa)

| Métrica | Valor |
| --- | --- |
| Clones exactos | 245 |
| Líneas duplicadas | 3 515 / 138 791 (**2,53 %**) |
| Umbral del gate | 3 % |
| `npm run check:duplicates` | **PASS** (exit 0) |
| Clones en `database.generated.ts` | ~27 (ruido de tipos generados; no son deuda de dominio) |
| Clones no generados | ~218 |

El gate de duplicación está **dentro de umbral**. El residual (≈2,5 %) concentra UI gemela (listas/grids, pickers, formularios de venta) y boilerplate de actions, no reglas de dinero ni estados críticos duplicados por accidente.

---

## Aspectos bien implementados

1. **Dualidad SQL autoridad + preview TS, documentada y acotada.** `docs/ARQUITECTURA.md` define claramente pagos (`collect_shipment_invoice_payment` vs `conductor-driver-payment.ts`), máquina de estados logística (`logistics-state-machine.ts`), inventario, custodia y permisos. No se trata de “código copiado sin dueño”.

2. **Constantes de transición inmutables, no estado mutable.** En `src/lib/logistics-state-machine.ts`, `ROUTE_TRANSITIONS`, `TASK_TRANSITIONS`, `PACKAGE_TRANSITIONS`, etc. son mapas `const` de paridad con SQL. Correcto no marcarlas como problema de estado compartido.

3. **Permisos en dos capas con roles claros.** Sesión carga claves desde `role_permissions` (`src/lib/auth/session.ts`); la UI/actions usan `sessionHasPermission`; RLS/RPC usan `user_has_permission`. La UI oculta; SQL deniega. Patrón intencional, no doble verdad de autorización.

4. **Preview financiero de conductor sin autoridad de saldo.** `conductor-driver-payment.ts` documenta FIN-004 (no subir `quotedTotal` por sobrepago); la autoridad queda en el RPC SQL. Tests unitarios refuerzan el contrato.

5. **Constantes de configuración centralizadas donde importa.** Ejemplos: `LOGISTICS_LIVE_REFRESH_MS`, `VIEW_LAYOUT_STORAGE_KEY`, `UI_SURFACE_PREFERENCES_STORAGE_KEY`, `PICKER_PANEL_SELECTOR` en `src/lib/date-picker.ts`, `WIDE_LAYOUT_MEDIA_QUERY`.

6. **Hooks compartidos ya extraídos en parte.** `useFloatingPickerLifecycle` reduce lifecycle de paneles flotantes en `inline-search-picker`; `getAppSession` usa `cache()` de React para una sola resolución por request.

7. **Sin store global de dominio.** No hay Redux/Zustand/Jotai. Contextos (`NotificationContext`, `UiSurfacePreferences`, onboarding coach, shell) son de presentación. El dinero, stock y estados críticos no viven en globals de cliente.

8. **Custodia dual nombrada a propósito.** `package-custody.ts` vs `inventory-custody.ts` se distinguen en comentarios (cajas físicas vs agregados de stock). No es duplicación accidental del mismo modelo.

9. **Gate de arquitectura** (`check:architecture`) refuerza capas y evita que `lib` importe actions/UI, lo que reduce “estado oculto” por imports cruzados.

10. **Contabilidad experimental aislada** (motor 071) documentada como no unificable con `shipment_payments` sin diseño dual-write: evita una segunda fuente de verdad operativa accidental.

---

## Hallazgos

### H1 — Lifecycle de date/time picker duplicado pese a hook existente

| Campo | Valor |
| --- | --- |
| **Severidad** | Baja |
| **Certeza** | Alta |
| **Ubicación** | `src/components/date-input.tsx` (~L65–151) · `src/components/time-picker-input.tsx` (~L66–142) · contraste: `src/hooks/use-floating-picker-lifecycle.ts` |
| **Evidencia** | jscpd: ~68 líneas acumuladas entre el par (`39L` + `21L`). Ambos implementan `updatePanelPosition`, cierre por `pointerdown`/`resize`/`scroll` y selector `PICKER_PANEL_SELECTOR`. El hook compartido ya existe y se usa en `inline-search-picker.tsx`. |
| **Impacto** | Drift de UX (Escape, foco, outside-click) si se arregla un picker y no el otro. No afecta dinero ni permisos. |
| **Corrección** | Incremental: adaptar `useFloatingPickerLifecycle` (o un helper hermano sin `searchRef` obligatorio) y migrar date/time. No fusionar los paneles de calendario y reloj. |

### H2 — Vistas gemelas de Envíos (cards vs filas)

| Campo | Valor |
| --- | --- |
| **Severidad** | Baja |
| **Certeza** | Alta |
| **Ubicación** | `src/components/envios/envios-shipment-cards-grid.tsx` · `src/components/envios/envios-shipment-rows-list.tsx` |
| **Evidencia** | jscpd: ~60 líneas / 4 clones. Ambos llaman `balanceDueFromShipment(row, quote)` y repiten mapeo de filas/acciones. |
| **Impacto** | Riesgo de divergencia visual/comportamental entre layouts; el cálculo de saldo ya sale de un helper compartido (bien). |
| **Corrección** | Extraer un mapper/presenter de fila (`toEnviosShipmentRowModel`) usado por ambas vistas; dejar el markup separado. |

### H3 — Formularios cliente/destinatario con bloques clonados

| Campo | Valor |
| --- | --- |
| **Severidad** | Baja |
| **Certeza** | Alta |
| **Ubicación** | `src/components/sale/sale-client-form.tsx` · `src/components/sale/sale-recipient-form.tsx` |
| **Evidencia** | jscpd: ~57 líneas / 2 clones (bloques de campos y validación visual similares). |
| **Impacto** | Cambios de accesibilidad o labels pueden quedar a medias. Dominio de personas ya compartido vía tipos/parts. |
| **Corrección** | Solo si se toca el área: extraer subcomponentes de campos comunes (teléfono, dirección) sin unificar reglas distintas de cliente vs destinatario. |

### H4 — Bootstrap de partner de distribución duplicado en dos actions

| Campo | Valor |
| --- | --- |
| **Severidad** | Baja |
| **Certeza** | Alta |
| **Ubicación** | `src/app/actions/distribution.ts` (~L317–385 y ~L407–…) |
| **Evidencia** | jscpd: ~30 líneas (y pares adicionales en el mismo archivo). `createUser` → `bootstrap_organization` → rol `distribuidor` → permiso `distribution.sell` → cleanup en catch. |
| **Impacto** | Si cambia el bootstrap, un flujo (vendedor vs captador) puede quedar desalineado. |
| **Corrección** | Extraer helper interno `bootstrapDistributorOrg({ admin, name, email, … })` usado por ambas actions; conservar validaciones y permisos de entrada distintos. |

### H5 — `CONFIG_SECTIONS` / `parseConfigSection` repetidos en onboarding

| Campo | Valor |
| --- | --- |
| **Severidad** | Baja |
| **Certeza** | Alta |
| **Ubicación** | `src/lib/onboarding/coach-targets.ts` (~L37–50) · `src/lib/onboarding/micro-steps.ts` (~L31–44) |
| **Evidencia** | jscpd: ~19 líneas idénticas (`Set` de secciones + parser de `view`). |
| **Impacto** | Al añadir una sección de Configuración, un coach/micro-step puede no reconocerla. |
| **Corrección** | Mover a `src/lib/onboarding/config-sections.ts` (o similar) e importar en ambos. |

### H6 — Caché de módulo en progreso de onboarding

| Campo | Valor |
| --- | --- |
| **Severidad** | Baja |
| **Certeza** | Media |
| **Ubicación** | `src/hooks/use-onboarding-progress.ts` (`cachedProgress`, `cacheTimestamp`, `inflightRequest`, `pendingOptimisticStart`) |
| **Evidencia** | Estado mutable a nivel de módulo del bundle cliente, TTL 60 s, compartido entre montajes del hook. También `notifications-panel.ts` (`notificationsPanelOpen` + listeners) y `activeSaleScrollFrame` en `venta/shared.tsx`. |
| **Impacto** | Onboarding: posible progreso obsoleto entre orgs en el mismo tab si no se fuerza refresh al cambiar `organizationId` (mitigado en parte por listeners/focus). Scroll/panel: estado UI efímero, bajo riesgo. **No** es fuente de verdad de negocio. |
| **Corrección** | Clave de caché por `organizationId` (o invalidar al cambiar org); documentar que el panel de notificaciones es pub/sub de UI. No migrar a store global. |

### H7 — Evento custom de inventario sin constante exportada

| Campo | Valor |
| --- | --- |
| **Severidad** | Informativa |
| **Certeza** | Alta |
| **Ubicación** | `inventory-bin-placement-drawer.tsx` (dispatch) · `inventory-item-grid.tsx` (listen) — string `"inventory-bin-placements-changed"` |
| **Evidencia** | Literal repetido; patrón similar ya centralizado en onboarding (`ONBOARDING_PROGRESS_CHANGED`) y conductor offline. |
| **Impacto** | Typo silencioso rompería el refresh de ubicaciones en UI. |
| **Corrección** | `export const INVENTORY_BIN_PLACEMENTS_CHANGED = "…"` en un módulo lib/inventory y usarlo en ambos extremos. |

### H8 — Boilerplate repetido en actions (fleet, route assignments, bins, transfers)

| Campo | Valor |
| --- | --- |
| **Severidad** | Informativa |
| **Certeza** | Alta |
| **Ubicación** | Pares jscpd en `logistics-fleet.ts`, `customer-route-assignments/review.ts`, `inventory-bins.ts`, `inventory-transfers.ts`, `warehouse-intake.ts`, etc. |
| **Evidencia** | Decenas de clones cortos (≈18–23 líneas): `requireAppSession` + `sessionHasPermission` + `createScopedSupabase` + `fail`/`ok`. |
| **Impacto** | Ruido de mantenimiento; ya existen helpers parciales (`src/lib/actions/context.ts`, `shipments-context.ts`). No indica doble escritura de dominio. |
| **Corrección** | Solo al tocar el archivo: reutilizar helpers de contexto existentes; no hacer un mega-refactor de actions. |

### H9 — Catálogo TS de roles vs seeds SQL (riesgo de drift, no bug actual)

| Campo | Valor |
| --- | --- |
| **Severidad** | Baja (riesgo) |
| **Certeza** | Media |
| **Ubicación** | `src/lib/auth/role-catalog.ts` · migraciones `004_organization_kind.sql`, `067_…`, bootstrap SQL |
| **Evidencia** | El catálogo TS lista permisos sugeridos al crear roles en UI; la sesión y RLS leen `role_permissions` en DB. Son capas distintas por diseño. |
| **Impacto** | Si alguien actualiza solo el catálogo TS, roles *nuevos* sugeridos pueden diferir del bootstrap histórico. Roles ya persistidos no se reescriben solos. |
| **Corrección** | Mantener nota en docs/auth: “catálogo = plantilla UI; DB = autoridad”. Opcional: test eval que compare slugs base y permisos mínimos con una fixture SQL. **No** unificar eliminando una capa. |

### No hallazgos (explícitamente descartados)

| Tema | Motivo de descarte |
| --- | --- |
| `sessionHasPermission` vs `user_has_permission` | Dualidad intencional UI preview / SQL enforcement (`ARQUITECTURA.md`). |
| `logistics-state-machine` vs RPC SQL | Paridad documentada; constantes inmutables. |
| Preview de pagos conductor vs `collect_shipment_invoice_payment` | Autoridad SQL; TS solo anticipa FIN-004. |
| Buckets de display Envíos vs status DB | Documentado: no usar buckets UI como estado persistido. |
| Cancel de ruta UPDATE + `assertLogisticsRouteTransition` | Deuda conocida (`FASE3_LINEA_BASE`); no es clon accidental de lógica de negocio. |
| Dual ledger `activity_history` vs `immutable_audit_events` | Contratos distintos (ops vs compliance). |
| Clones en `database.generated.ts` | Artefacto de codegen. |
| Helpers `money()` de formato en UI comercial | Formateo de presentación, no recálculo de saldo. |

---

## Fuentes de verdad

Resumen operativo alineado con `docs/ARQUITECTURA.md` (verificado en código de esta auditoría):

| Dominio | Autoridad final | Anticipación / mirror TS | ¿Duplicación accidental? |
| --- | --- | --- | --- |
| Pagos / saldo | RPC `collect_shipment_invoice_payment` + columnas de envío | `conductor-driver-payment.ts`, `balanceDueFromShipment` | No — preview |
| Total cotizado | Persistido vía `create_shipment_sale_atomic` / plan | `invoice-billing.ts` | No |
| Transiciones ruta/tarea/paquete | RPC SQL (+ RLS) | `logistics-state-machine.ts` | No — paridad |
| Cancel ruta | UPDATE + assert TS (hoy) | misma máquina | Deuda conocida, no clon |
| Inventario disponible | RPC + `stock - reserved` | helpers TS/UI | No |
| Custodia física | `package_custody_*` | `package-custody.ts` | No (distinto de custody de stock) |
| Custodia / ubicación stock vacío | agregados bins | `inventory-custody.ts` | No |
| Permisos efectivos | Matriz SQL + `user_has_permission` | `sessionHasPermission` sobre `session.permissions` cargados de DB | No |
| Plantilla de roles al crear | — | `role-catalog.ts` | Plantilla UI; DB manda después |
| Días operativos | `delivery_days` / RPCs | UI Logística | No |
| Preferencias UI / layout | localStorage claves versionadas | módulos `view-layout`, `ui-surface-preferences` | N/A (cliente) |
| Progreso onboarding | action/servidor | caché módulo + localStorage “started” | Caché UI (H6) |
| Contabilidad GL 071 | Aislada / experimental | UI métricas sin write | Intencional — no unificar |

### Estado mutable observado (cliente)

| Símbolo | Tipo | Riesgo |
| --- | --- | --- |
| `cachedProgress` / `inflightRequest` | Caché módulo | Bajo–medio (H6) |
| `notificationsPanelOpen` + `Set` listeners | Pub/sub UI | Bajo |
| `activeSaleScrollFrame` | rAF de scroll | Bajo |
| Contextos React (notify, surfaces, coach, shell) | Árbol UI | Bajo |
| Eventos `window` (onboarding, bins, offline) | Coordinación UI | Bajo (H7 literal) |

No se observaron mutaciones globales de dominio (saldos, stock, permisos) fuera de actions/RPC.

---

## Conclusión del agente

Boxario mantiene la duplicación **bajo control de gate** (jscpd **2,53 %** &lt; 3 %) y separa bien **autoridad SQL** de **preview TS** en pagos, logística y permisos. Las constantes de máquina de estados y los helpers financieros de anticipación son diseños correctos, no deuda.

La deuda real de duplicación es **incremental y mayormente de UI/actions**: pickers date/time, vistas gemelas de Envíos, bootstrap de distribución, parser de secciones de onboarding, y un poco de estado de módulo en onboarding. Ningún hallazgo de esta pasada justifica un refactor masivo ni tocar FIN-004, RLS o fuentes de verdad de dinero.

**Prioridad sugerida (pequeños pasos):** H5 → H7 → H1 → H4 → H2; H6 solo si se ve stale cross-org; H8/H9 como higiene al tocar esas zonas.

---

*Fin del informe del Agente 2.*
