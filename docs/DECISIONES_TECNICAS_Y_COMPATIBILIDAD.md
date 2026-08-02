# Decisiones técnicas y compatibilidad

Este documento conserva decisiones de infraestructura, red, autenticación y compatibilidad entre dispositivos que no pertenecen al diseño visual.

## Jerarquía de fuentes documentales (2026-07-27)

Cuando dos afirmaciones de la documentación se contradigan, la autoridad se resuelve en este orden:

1. Código confirmado por `docs/MAPA_FUNCIONAL_ACTUAL.md` = comportamiento actual.
2. Regla de negocio más reciente en `REGLAS_NEGOCIO_Y_DEPENDENCIAS.md` = comportamiento deseado.
3. Decisión técnica más reciente en este documento = implementación aprobada.
4. Guía UI más reciente en `GUIA_ESTILO_UI.md` = presentación aprobada.
5. Entradas anteriores = histórico, no fuente vigente.

Una entrada reemplazada no se borra: se marca como histórica indicando la fuente vigente, para que ninguna IA la tome como comportamiento actual.

### 2026-08-01 - Guardado serializado de sugerencias por dia

**Contexto:** al eliminar varias horas seguidas, cada guardado asincrono leia la misma version anterior y las escrituras se pisaban. La interfaz quedaba vacia, pero Ventas podia volver a leer horas antiguas.

**Decision:** las modificaciones de un dia se encolan en el cliente y se persisten en orden. Cada escritura siguiente espera a que termine la anterior.

**Resultado:** borrar una lista completa conserva el estado vacio en la fuente de verdad y Ventas recibe el mismo resultado que muestra Configuracion.

## Registro de decisiones

### 2026-08-02 - Fase 3A: arquitectura documentada y quality gates

**Contexto:** Tras Fases 1–2, faltaba un mapa onboarding-friendly y gates agregados sin mezclar Knip residual con el gate rápido.

**Decisión:**
- `docs/ARQUITECTURA.md` describe capas reales, fuentes de verdad y puntos de extensión.
- `docs/GUIA_DESARROLLO.md` fija el checklist de contribución.
- `docs/FASE3_LINEA_BASE.md` confirma qué está verde y qué son huecos de claridad/escala.
- `npm run quality:gate` = typecheck + lint + architecture + duplicates + test:gate (sin Docker, sin Knip).
- `npm run quality:db` = integrity + logistics + phase1 + overpayment + check:db-types (requiere Supabase local).
- Knip sigue en `check:code` / ejecución manual; residuals documentados no se ocultan con `|| true`.

**Resultado:** un desarrollador nuevo tiene ruta clara; CI local distingue gate rápido vs DB.


**Contexto:** Tipos `*DbRow` manuales desalineados con PostgreSQL; Fase 2D pide generación controlada sin migrar todo de golpe.

**Decisión:**
- `npm run codegen:db-types` (`scripts/codegen-db-types.mjs`) genera `src/lib/db/database.generated.ts` desde Supabase local.
- `npm run check:db-types` (`scripts/check-db-types.mjs`) regenera en memoria/temporal y falla si difiere del archivo versionado.
- Requisitos: Docker Desktop + `npm run supabase:start`.
- Adaptadores en `src/lib/db/index.ts` (`DbShipment`, `DbShipmentPayment`, `DbLogisticsRouteStop`, `DbInventoryMovement`, `DbLogisticsRouteNotification`, `DbWarehouse`, `DbActivityHistory`, etc.). La UI sigue usando tipos de dominio; migración gradual de módulos de alto riesgo.
- Si `check:db-types` falla: ejecutar `npm run codegen:db-types`, revisar el diff de `database.generated.ts` y commitear junto con el cambio de esquema.

**Resultado:** Generación y verificación de drift reproducibles sin proyecto remoto.

### 2026-08-02 - Contabilidad: motor 071 aislado (no conectar aún)

**Contexto:** Fase 2D. Existe motor SQL desde migración `071_agency_finance_accounting.sql` (GL, periodos, journal entries, sales/agency charges, driver settlements) y wrappers en `business-commands.ts`, pero `/contabilidad` solo muestra métricas de `load_business_workspace` y no invoca las acciones de escritura. El dinero operativo vive en `shipment_payments` + columnas de factura en `shipments`.

**Decisión:** **Aislar / experimental.** No conectar la UI al motor 071 sin un diseño explícito de dual-write o migración de saldos. No unificar con ledger de envíos ni con ledger de agencias operativas. No deprecar ni borrar tablas/RPC mientras el esquema y tests de agency-finance los cubran.

**Resultado:** Bloqueo de producto documentado; pendiente de decisión de negocio para conectar, marcar experimental en UI, o planificar deprecación en fase posterior.

### 2026-08-02 - Fase 2A: capas, Knip CLI y duplicaciones peligrosas

**Contexto:** Dominio/acciones importaban `@/components/sale/venta-parts`; Knip marcaba scripts CLI de Fase 1; `planLeg` y generadores de contraseña temporal divergían en silencio.

**Decisión:**
- Helpers puros de logística de venta viven en `src/lib/sale-logistics-summary.ts`; modos en `sale-logistics-modes`; `parts-logistics` reexporta sin duplicar.
- `planLeg` tiene autoridad única en `src/lib/shipment-display/shared.ts` (acepta plan nullish); timing, edit, logistics-view y `planLegRecord` la consumen.
- Contraseñas: `generateTemporaryPassword` (auth, 10 chars sin símbolos) ≠ `generateOrganizationAdminTemporaryPassword` (orgs/captadores, con símbolo). No unificar.
- Knip `entry` incluye scripts CLI de integridad/cierre Fase 1 y exploratorios. Wrapper TS `inventory-sale-reservation.ts` eliminado (RPC solo vía SQL). Hooks abandonados de logística se resuelven en 2B (conectar o borrar; no ignorar en Knip).

**Resultado:** violaciones de capa conocidas = 0; lint 0 errores/0 warnings; CLI legítimos dejan de contar como muertos.

### 2026-08-02 - Endurecimiento P0/P1 seguridad, pagos y atomicidad

**Contexto:** Auditoría integral detectó RPC `SECURITY DEFINER` sin auth suficiente, sobrepago contradictorio en conductor, saldo calculado en TypeScript, auditoría falsificable, inicio de ruta no atómico e overloads de inventario ambiguos.

**Decisión:**
- Migraciones `158`–`164` endurecen `complete_conductor_task_atomic`, `notify_logistics_route_change`, `collect_shipment_invoice_payment` (SQL recalcula saldo/estados; FIN-004), `record_activity_history` (sin INSERT directo), `start_logistics_route_atomic`, `mark_logistics_task_loaded_with_stock_atomic`, firma canónica de inventario, partners de distribución atómicos y días operativos solo en `delivery_days`.
- Migración `165`: `update_logistics_task_atomic` es la autoridad end-to-end de `updateLogisticsTaskAction` (multi-línea, idempotencia `client_operation_id`, liberación de paradas, auditoría vía `record_activity_history`). Sin rollback compensatorio en TypeScript. `mark_logistics_task_loaded_with_stock_atomic` permanece como RPC especializado de un solo ítem; el flujo de oficina multi-línea usa solo el RPC general. Helpers internos de stock no se otorgan a `authenticated`.
- Migración `166`: alinea `guard_authoritative_shipment_writes` con el patrón de inventario (`postgres`/`supabase_admin` pueden escribir columnas autoritativas desde RPC `SECURITY DEFINER`; el cliente autenticado directo sigue bloqueado).
- Autoridad de pagos: SQL. TypeScript solo previsualiza y rechaza sobrepago (`settleConductorPayment`).
- Autoridad de transiciones de ruta: SQL + validación anticipada TS (`assertLogisticsRouteTransition` en inicio/cancelación; publish ya usaba RPC). No documentar TS como autoridad única.
- `activity_history` = bitácora operativa vía RPC; `immutable_audit_events` = ledger de cumplimiento.
- Bodegas: default-deny ya vigente desde `016`; se confirma y se prueba.
- Validación DB: `npm run test:db-integrity`.

**Resultado:** Los callers de conductor usan cliente JWT scoped para RPC críticos; los parámetros de actor/org/montos dejaron de ser autoridad. La actualización de tareas logísticas de oficina confirma o revierte stock/tarea/envío/auditoría en una sola transacción SQL.

### 2026-08-02 - Cierre formal Fase 1 (seguridad, integridad, finanzas, atomicidad)

**Contexto:** Migraciones `150`–`166` aplicadas y verificadas en PostgreSQL local; faltaba el paquete de cierre para integración controlada.

**Decisión:** La Fase 1 exige evidencia obligatoria sobre base limpia (`npm run db:local:reset` → `001`–`166` + `db:apply`), `test:db-integrity` con aislamiento cross-tenant **sin SKIP** (fixture `scripts/lib/phase1-two-tenant-fixture.mjs`), `test:gate`, `scripts/test-logistics-route-integrity.mjs`, `scripts/phase1-closeout-verify.mjs`, `scripts/report-overpayment-adjustments.mjs`, typecheck/build/lint y plan de staging/rollback. Deuda P2 (módulos grandes, Knip, capas, lint histórico residual) queda fuera de alcance y no bloquea la integración de esta fase.

**Resultado local (2026-08-02):** reset limpio OK; firma canónica única de inventario; cross-tenant 16/16 PASS; gates críticos PASS. Remoto Supabase no vinculado (`SUPABASE_ACCESS_TOKEN` ausente, sin `project-ref`, `.env.local` solo `127.0.0.1`). Git no encontrado en PATH ni rutas habituales de Windows → commit/PR pendientes de herramienta externa.

### 2026-08-02 - Integridad logística en SQL + máquina de estados TS

**Contexto:** publicación de rutas, RLS de conductores, cobro atómico y custodia física requerían garantías fuera de la UI.

**Decisión:** migracion `150_logistics_route_integrity.sql` concentra RPC/triggers/RLS base; follow-ups `151`–`157` añaden excepción administrativa, enlaces históricos de inventario, aislamiento SELECT (sin `FOR ALL` en lectura), ocultar `draft` al conductor y correcciones de overload/backfill. `src/lib/logistics-state-machine.ts` es la fuente TS de **validación anticipada** de transiciones (no autoridad única: SQL protege integridad). El inicio de ruta exige GPS del conductor y no inventa bodega. Validación real: `scripts/test-logistics-route-integrity.mjs` y `scripts/test-db-integrity.mjs` contra Postgres local.

**Resultado:** las invariantes críticas viven en servidor/base de datos además de las acciones Next.js; 150 no se reescribió tras aplicarse.

### 2026-08-01 - Preferencia de verificación sin navegador

**Contexto:** las comprobaciones en el navegador interrumpen el flujo de trabajo cuando sólo se solicitó implementar un cambio de código.

**Decisión:** no usar ni inspeccionar el navegador para validar cambios salvo que el usuario lo pida expresamente.

**Resultado:** la verificación normal se realiza con el código, typecheck, ESLint, pruebas y compilación proporcionales al cambio.

### 2026-07-26 - Sugerencias horarias persistidas por empresa

> **Histórico — reemplazada parcialmente el 2026-07-27.** La parte de `Entre` quedó obsoleta: los rangos de servicio globales de `organization_route_settings` ya no alimentan las sugerencias. Fuente vigente:
>
> - `Exacta` / `Antes de` / `A partir` / `Entre` → `organization_route_settings.schedule_suggestions` (se administra en `Seguimiento → Configuración de ventas`).
> - Los rangos de `Entre` de Rutas siguen disponibles como referencia operativa de `logistics_weekday_defaults` o `logistics_route_templates` (LOG-006 y LOG-008).

**Contexto:** Las sugerencias visibles en Ventas no deben quedar fijas en el componente ni confundirse con el horario operativo de cada ruta.

**Decisión (original):** Las horas sugeridas para `Exacta`, `Antes de` y `A partir` se persisten en `organization_route_settings.schedule_suggestions`; los rangos de `Entre` se administran en la configuración de ventas y se combinan con el horario operativo del catálogo de rutas. El catálogo de rutas conserva la autoridad sobre `start_time` y `estimated_end_time`.

**Compatibilidad:** La migración agrega un JSONB opcional con respaldo vacío, por lo que las empresas existentes conservan sus rutas y reciben valores predeterminados hasta personalizarlos.

### 2026-07-31 - Sugerencias horarias con alcance de día

**Contexto:** El calendario de Rutas activa días individualmente, pero `organization_route_settings.schedule_suggestions` sólo tenía listas globales para `Exacta`, `Antes de` y `A partir`.

**Decisión:** Se conserva la columna JSONB existente y se agrega el objeto opcional `byWeekday`, con claves numéricas `0` a `6` y una configuración independiente de `delivery` y `pickup` para cada día. La normalización mantiene las listas globales como respaldo de compatibilidad; el programador resuelve primero la configuración del día elegido.

**Compatibilidad:** No se requiere migrar datos históricos ni crear una tabla paralela. La lectura de `organization_route_settings` se habilita también para consumidores con `routes.view`; la escritura continúa protegida por `save_sales_axis_settings` y `sales.settings.manage`/`settings.manage`. El ajuste `149_weekday_schedule_suggestions.sql` actualiza únicamente esa política de lectura.

### 2026-07-31 - Modalidades horarias activables por día

**Contexto:** La configuración por día ya separaba las horas de cada servicio, pero todavía obligaba a mostrar `Exacta`, `Antes de` y `A partir` aunque una ruta sólo utilizara una de ellas.

**Decisión:** Cada configuración de servicio dentro de `byWeekday` puede incluir `enabledModes` y `ranges`. La ausencia de `enabledModes` significa que las cuatro modalidades están habilitadas para mantener compatibilidad con datos anteriores. `ranges` conserva los rangos de `Entre`; una lista vacía explícita se conserva vacía y sólo una propiedad ausente hereda los valores globales. Desactivar una modalidad sólo cambia su disponibilidad; sus listas de horas o rangos se conservan para restaurarla después.

**Compatibilidad:** El campo vive dentro del JSONB existente y no requiere una migración adicional. Los rangos de Rutas continúan disponibles como fuente operativa adicional y `Entre` sí forma parte de `enabledModes`.

### 2026-08-01 - Sugerencias compartidas entre entrega y recolección

**Contexto:** Entrega y recolección usan la misma ruta operativa, pero la pantalla permitía administrar dos listas independientes de sugerencias.

**Decisión:** La interfaz administra una sola configuración por día y la escritura sincroniza esa configuración en los bloques históricos `delivery` y `pickup` del JSONB existente. Los consumidores mantienen sus claves actuales para compatibilidad, pero reciben las mismas modalidades, horas y rangos después de cada cambio.

**Compatibilidad:** No se requiere migración adicional; los datos anteriores se leen usando `delivery` como configuración visible inicial y quedan sincronizados al guardar cualquier cambio desde el editor compartido.

### 2026-07-26 - Horario de ruta administrado por Logística

**Contexto:** Ventas necesita mostrar una expectativa operativa, pero no debe convertirse en otra fuente de horarios ni poder modificarla.

**Decisión:** El catálogo semanal persiste `start_time` y `estimated_end_time` mediante una migración compatible con rutas existentes. Las acciones de escritura sólo aceptan esos campos con el permiso `routes.update_status`; Ventas únicamente los consulta.

**Resultado esperado:** Las rutas antiguas pueden continuar sin horario hasta que Logística lo configure, y una advertencia de Ventas no altera ni bloquea el flujo de venta.

### 2026-07-25 — JavaScript de desarrollo accesible desde celular

**Contexto:** Al abrir `next dev` desde un celular mediante la IP local de la computadora, el HTML podía mostrarse mientras Next.js rechazaba los recursos internos de desarrollo por no reconocer ese origen. La pantalla quedaba visible, pero botones como remitentes, notificaciones y perfil no se hidrataban ni respondían.

**Decisión:** `allowedDevOrigins` debe incluir automáticamente las direcciones IPv4 activas y no internas de la computadora, además de `localhost` y los túneles explícitos ya permitidos. No se permiten rangos completos ni direcciones públicas arbitrarias.

**Resultado esperado:** Un celular conectado a la misma red puede abrir la IP local exacta de la computadora, cargar el JavaScript de Next.js y utilizar todos los controles. Si cambia la IP local, basta reiniciar el servidor de desarrollo para recalcularla.

### 2026-07-25 — Cierre de sesión sin Service Worker

**Contexto:** En desarrollo o en navegadores donde el Service Worker aún no está registrado, el menú de cuenta necesita limpiar la caché local antes de cerrar sesión.

**Decisión:** La limpieza debe consultar un registro existente con `getRegistration()` y continuar sin bloquear cuando no haya Service Worker activo.

**Resultado esperado:** `Cerrar sesión` siempre puede completar la limpieza local y redirigir a `/login`, incluso si la PWA está deshabilitada, en desarrollo o el registro del worker falla.

### 2026-07-25 — Inicio de sesión desde celular o IP local

**Contexto:** Un usuario puede abrir el servidor de desarrollo desde otro dispositivo usando la IP de la computadora. La configuración local usa `APP_ORIGIN=http://localhost:3000`.

**Decisión:** Los envíos tradicionales del formulario de inicio de sesión y sus redirecciones deben conservar el origen con el que se abrió la aplicación cuando la solicitud llega directamente desde otra IP o dispositivo.

**Resultado esperado:** Después de iniciar sesión desde el celular, el usuario permanece en la IP accesible desde el celular y nunca es enviado a `localhost`.

**Compatibilidad:** El formulario conserva un respaldo HTML si el JavaScript no carga; los errores de conexión o credenciales deben seguir siendo visibles. Las redirecciones de ese respaldo usan rutas relativas para conservar el origen del navegador y no depender de `localhost`.

### 2026-07-26 - Configuración separada por permisos y RPC

**Contexto:** El guardado general de países y precios incluía también `organization_route_settings`, por lo que una pantalla podía sobrescribir opciones que ahora pertenecen a Ventas o Logística.

**Decisión:** Se agregan `sales.settings.manage` y `logistics.settings.manage`, junto con RPC independientes que sólo actualizan las columnas de su eje. La pantalla general conserva la última configuración operativa al usar el RPC heredado de precios.

**Compatibilidad:** El rol Logística recibe su permiso automáticamente, Conductores no lo reciben y Administrador conserva acceso completo. La URL anterior `configuracion?view=deliveries` redirige a la configuración de Ventas en Seguimiento. Los cargos de conductor se editan en `configuracion?view=prices&panel=operativos`; `logistica?view=configuracion` redirige ahí.

### 2026-07-27 - Escritura logística sin días ni horarios operativos

**Contexto:** Los primeros RPC separados de Logística todavía recibían días y rangos globales, aunque el catálogo semanal de Rutas ya contiene los campos `start_time` y `estimated_end_time` por plantilla.

**Decisión:** La interfaz usa `save_logistics_axis_settings_v3`, que sólo actualiza anticipación y cargos. Los RPC anteriores pierden ejecución para usuarios autenticados. Las ventanas sugeridas en Ventas se derivan en memoria de las plantillas del día seleccionado.

**Compatibilidad:** Los días y rangos globales existentes se conservan para lectura histórica, pero las versiones nuevas no los administran ni los usan para sugerencias.

**Precisión (2026-07-27):** la frase original "los horarios vigentes viven en `logistics_route_templates`" era demasiado absoluta. Conforme a LOG-008, el horario general de un día activado se guarda en `logistics_weekday_defaults`; `logistics_route_templates` guarda únicamente el horario de las subrutas nombradas cuando el día se divide.

### 2026-07-26 - Estado actual y auditoría de la Bitácora

**Contexto:** Las notas y recordatorios necesitan edición operativa, mientras que las revisiones y eventos del sistema deben permanecer inmutables.

**Decisión:** `shipment_journal_entries` conserva el estado actual, asignación, recordatorio y borrado lógico. `activity_history` conserva eventos automáticos y cada revisión con antes/después, actor, fecha y razón de eliminación.

**Compatibilidad:** Los contactos existentes se migran conservando autor y fechas; la tabla anterior queda como respaldo sin nuevas escrituras. Los resultados offline del conductor continúan usando su operación idempotente y la Bitácora filtra eventos auxiliares para mostrar una sola entrada por resultado.

### 2026-07-28 - Guard de inventario: bypass para RPC security definer

**Contexto:** Al guardar Entrada/Salida/Ajuste, `record_inventory_movement_atomic` fallaba con `INVENTORY_MOVEMENT_COMMAND_REQUIRED`. El trigger de migración 132 bloquea cambios de `inventory_stock` cuando `auth.role() = 'authenticated'`, pero los RPC `security definer` conservan ese JWT aunque ejecuten como `postgres`.

**Decisión:** Actualizar `guard_inventory_stock_direct_write` para permitir `current_user in ('postgres', 'supabase_admin')` además de sesiones no autenticadas, igual que `guard_profile_authorization_fields` (migración 134). Las escrituras directas desde el cliente autenticado siguen bloqueadas.

**Resultado esperado:** Entrada, salida, ajuste, asignaciones y reservas usan el RPC sin error; el cliente no puede mutar balances directamente.

### 2026-07-28 - box-sizing global directo, sin `inherit`

**Contexto:** Los campos dentro de `<details>` (Datos de compra, Motivo y detalle del modal de Entrada) se desbordaban por la derecha. `globals.css` usaba el patrón `html { box-sizing: border-box }` + `* { box-sizing: inherit }`.

**Decisión:** El selector universal aplica `box-sizing: border-box` directamente. El patrón `inherit` tiene dos fallas: (1) al ser CSS sin capa, le gana a la utilidad `box-border` de Tailwind (las reglas fuera de `@layer` tienen prioridad sobre las capas), y (2) dentro de `<details>` la herencia pasa por el árbol interno del navegador (`::details-content`, que es `content-box`), así que todo el contenido del bloque quedaba en `content-box` y los campos con `w-full` sumaban padding y bordes por fuera del 100 %.

**Resultado esperado:** Cualquier control con `w-full` dentro de `<details>` respeta el contenedor con padding. No usar `box-sizing: inherit` de nuevo; si un elemento necesita `content-box` debe declararlo explícitamente.

### 2026-07-27 - Residuos del rename paqueteria-saas → Boxario

**Contexto:** El proyecto local y el repositorio ya usan `Boxario`, pero el despliegue en Vercel sigue publicado como `paqueteria-saas.vercel.app`.

**Decisión:** En código y copy se usa `empresa` / `Boxario`. Los scripts locales de backup usan carpeta y tarea `Boxario`. Las URLs de `scripts/publish-gui.ps1` conservan el proyecto Vercel actual (`paqueteria-saas`) hasta renombrarlo allí.

**Resultado esperado:** No quedan textos ni recursos Docker locales del nombre anterior; el único pendiente externo es renombrar el proyecto en Vercel si se quiere el dominio `boxario.vercel.app`.
# 2026-07-29 — Shell móvil resistente al zoom del navegador

**Contexto:** al alejar el zoom en Chrome Android, el viewport CSS puede superar el breakpoint `lg` aunque el dispositivo siga siendo un teléfono, activando por error la barra lateral de escritorio.

**Decisión:** los dispositivos con `hover: none` y `pointer: coarse` fuerzan el shell móvil (encabezado y navegación inferior) y ocultan la barra lateral de escritorio, independientemente del ancho CSS inducido por el zoom.

**Resultado:** la interfaz conserva el ancho completo y la navegación táctil al cambiar el zoom del navegador.

### 2026-07-30 - Reset de org: idempotencia de ventas bloquea el borrado de envíos

**Contexto:** `scripts/reset-scgs-demo-data.mjs` fallaba al borrar `shipments` en una org que ya había registrado una venta. La migración 132 creó `shipment_sale_operations` con `shipment_id ... on delete restrict` y un trigger `shipment_sale_operations_immutable` que rechaza cualquier `delete`.

**Decisión:** El reset borra `shipment_sale_operations` antes de `shipments`, deshabilitando temporalmente su trigger igual que con `package_custody_events` y `package_custody_handoffs`. Al agregar tablas nuevas que referencien `shipments` con `restrict`, hay que sumarlas al reset o este vuelve a romperse.

**Alcance conservado:** El reset sigue sin tocar `auth.users`, `profiles`, `organization_memberships`, `roles`, `warehouses` ni `security_audit_events`. La contraseña del usuario no se altera; volver a empezar "desde 0" significa vaciar datos operativos y catálogo, no recrear la cuenta.

**Compatibilidad:** El ID por defecto `2029bf0c-…` de los scripts SCGS ya no existe en la base local. `reset-scgs-demo-data.mjs` resuelve la org por `slug = 'scgs'` cuando no encuentra ese ID; `reset-scgs-catalog.mjs` y `reset-onboarding.mjs` aún no tienen ese respaldo, así que requieren `SCGS_ORG_ID` explícito.
### 2026-08-01 - Programador de ventas usa la configuracion fresca de Logistica

**Contexto:** el modal de programacion de una venta seguia mostrando las horas por defecto despues de desactivarlas por dia en Logistica.

> **Vigencia:** esta decisión queda reemplazada por la fuente histórica definida el 2026-08-01. El catálogo fresco de Logística sigue siendo necesario para días, rutas y horarios operativos, pero ya no es la fuente de sugerencias horarias personalizadas de Ventas.

**Decision:** al abrir el programador, las sugerencias por dia se toman del catalogo de rutas que acaba de cargar `listLogisticsRouteCatalogAction`. El bootstrap inicial de `/venta` queda unicamente como respaldo si esa respuesta no incluye la configuracion.

**Resultado:** los cambios de horas y modalidades de Logistica se reflejan inmediatamente en el dia seleccionado del modal, sin depender de que se recargue toda la pagina.

### 2026-08-01 - Fuente de sugerencias horarias basada en historial del cliente

**Contexto:** la configuración `organization_route_settings.schedule_suggestions` hacía que Logística administrara horas que Ventas mostraba a todos los clientes. La nueva regla separa el horario operativo de la ruta de la preferencia particular del cliente.

**Decisión:**

- `logistics_weekday_schedules` y los horarios de las plantillas de ruta siguen siendo la fuente del horario operativo de Logística.
- Las nuevas sugerencias de Ventas se derivan del historial de tareas confirmadas o completadas, unido al cliente del envío y filtrado por tipo de operación.
- `organization_route_settings.schedule_suggestions` deja de ser la fuente vigente de sugerencias para Ventas. Sus datos se conservan temporalmente para compatibilidad histórica, pero no deben recibir nuevas escrituras ni alimentar la captura nueva.
- El modelo debe conservar por separado la preferencia solicitada por Ventas y el horario confirmado por Logística. `requested_schedule_at` y `schedule_confirmation_status` son la base existente; las modalidades `Antes de` y `Entre` no deben perder sus límites ni reutilizar silenciosamente los campos de la ventana confirmada.

**Compatibilidad:** durante la transición, los registros antiguos continúan mostrándose con sus datos guardados. Los nuevos flujos no deben presentar una sugerencia histórica como disponibilidad de ruta ni usarla para organizar el trabajo del conductor hasta que Logística la confirme.

### 2026-08-02 - Paginación server-side de logistics_routes

**Contexto:** `listLogisticsRoutesAction` cargaba todas las rutas de la organización; el board filtraba en cliente (fecha, chofer, zona, plantilla, historial).

**Decisión:** las listas de rutas usan `LOGISTICS_ROUTES_PAGE_SIZE = 50` (máx. 200), orden `route_date`/`created_at`/`id` desc, y filtros en Supabase (`routeDate`, `assignedTo`, `zoneKey`, `routeTemplateId`, `weekday` acotado, `statusMode`, `search`). Activas = no cancelled/completed; Historial = completed. Tras mutaciones se recarga la página actual, no toda la org. Pickers de envíos/agencias piden `statusMode: "active"` con límite 50.

**Resultado:** el board de Logística pagina con Anterior/Siguiente; no se relajan RLS ni visibilidad de conductor.

### 2026-08-02 - Paginación server-side de movimientos de inventario

**Contexto:** el historial de `inventory_movements` cargaba una ventana fija de 100 filas sin offset ni orden estable por `id`.

**Decisión:** `INVENTORY_MOVEMENTS_PAGE_SIZE = 50` (`src/lib/inventory-movements-pagination.ts`). `listInventoryMovementsAction` ordena por `created_at` desc + `id` desc, limita 1–200 (default 50) y acepta filtros existentes más `referenceId` vía `reference_id`. La carga inicial de bodega y el panel usan esa ventana; el drawer pagina con Anterior/Siguiente. El filtro de movimientos de agencia sigue en JS cuando el módulo está apagado (páginas pueden quedar ligeramente cortas).

**Resultado esperado:** historial navegable sin pretender carga completa; orden estable entre páginas.

### 2026-08-02 - Paginación server-side de stock de inventario por bodega

**Contexto:** `loadWarehouseInventoryCore` cargaba todas las filas de `inventory_stock` de la bodega y firmaba URLs de foto para todos los ítems, lo que no escala.

**Decisión:**
- `INVENTORY_STOCK_PAGE_SIZE = 100` (`src/lib/inventory-stock-pagination.ts`): mayor que envíos (50) porque el árbol de categorías sigue completo en cliente y solo se pagina el overlay de stock (conteos + fotos firmadas).
- `loadWarehouseInventoryCoreAction(warehouseId, options?)` pagina por defecto (limit 100, offset 0), orden estable `inventory_items.name` asc + `inventory_stock.id` asc, filtros opcionales `search` / `categoryId|categoryName` / `kind`, y `debugCounts` opcional.
- Fotos firmadas solo de la página actual. El árbol (`categoryConfigs`) no se pagina. No se hace `mergeTreeIntoInventoryItems` en el loader (evitar re-inflar el payload).
- Al guardar catálogo, no se interpreta un ítem ausente/virtual de una página parcial como `stock = 0` (protege `disponible = stock - reserved` y reserved/assigned/unavailable).
- UI: Anterior/Siguiente; reset de página al cambiar bodega o categoría; recargas post-mutación usan la página actual de la bodega.

**Resultado esperado:** listados de stock acotados; árbol editable completo; balances no se anulan por paginación.
