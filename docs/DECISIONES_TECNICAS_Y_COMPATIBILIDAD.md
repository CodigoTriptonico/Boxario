# Decisiones técnicas y compatibilidad

### 2026-08-14 - Coordenadas ausentes no representan `0,0`

**Contexto:** El mapa de dirección y coberturas convertía `NULL` a `0` al preparar el pin del cliente. Eso centraba Google Maps en el Golfo de Guinea aunque la cobertura sugerida correspondiera a Santa Clarita.

**Decisión:** Las coordenadas persistidas solo se usan como ubicación cuando latitud y longitud forman un par numérico válido dentro de sus rangos geográficos. Valores nulos, vacíos o inválidos producen ausencia de pin; la cobertura continúa evaluándose por sus datos geográficos configurados y la interfaz explica cuando falta la geolocalización de la dirección.

**Resultado:** El sistema no inventa una ubicación mundial para direcciones sin coordenadas y conserva la diferencia entre cobertura coincidente y pin de dirección disponible.

### 2026-08-14 - Respaldo visual para direcciones sin coordenadas persistidas

**Contexto:** Algunos clientes conservan calle, ciudad, estado y código postal, pero no tienen `lat/lng` guardados. El comparador necesita mostrar su ubicación sin convertir esa ausencia en `0,0` ni bloquear el mapa.

**Decisión:** La acción de rutas selecciona en este orden `exact_entrance_lat/lng`, `lat/lng` de la dirección y, como último respaldo, consulta Google Geocoding con los campos postales guardados. El último resultado es efímero, solo se devuelve para la vista del mapa, se marca como ubicación aproximada y no se escribe en Supabase. La cobertura no se calcula con ese respaldo.

**Resultado:** Una dirección existente puede aparecer en el mapa aunque no tenga entrada exacta ni coordenadas persistidas; el operador recibe una advertencia clara cuando el punto es aproximado.

### 2026-08-14 - Compatibilidad de referencias de invoice sin separadores

**Decisión:** `formatInvoiceReference` genera referencias sin guiones (`COL20010010004`). Los sufijos de caja continúan siendo una extensión separada para no perder la identificación física. No se contempla compatibilidad con referencias antiguas.

**Compatibilidad:** La búsqueda, los QR, el seguimiento y las etiquetas reciben la misma referencia desde la fuente compartida.

### 2026-08-14 - Código público de empresa dentro de la referencia de invoice

**Contexto:** `organization_invoice_counters` asigna correctamente una secuencia común por empresa, pero dos organizaciones pueden producir el mismo código legible cuando coinciden país, vendedor, cajas y consecutivo.

**Decisión:** Mantener `organization_invoice_counters` como fuente autoritativa y atómica del correlativo de todos los clientes de una organización. Agregar a `organizations` un código público numérico con restricción global `unique`, inmutable y no reutilizable, asignado secuencialmente desde `001` y mostrado con un mínimo de tres dígitos. La referencia nueva se compone como `<PAÍS><CAJAS><VENDEDOR><EMPRESA><CONSECUTIVO>`; vendedor se muestra con tres dígitos y el consecutivo con cuatro como mínimo. La cantidad queda junto al país y puede usar uno o más dígitos. En esta fase solo las organizaciones matriz consumen la secuencia; las agencias quedan fuera del alcance.

El código base identifica el invoice y los sufijos `-A`, `-B`, etc. identifican exclusivamente sus cajas. Los UUID y el token público de seguimiento continúan siendo identidades técnicas globales. La migración no reescribe referencias históricas y debe impedir tanto la edición como la reutilización futura de un código empresarial ya asignado.

**Resultado:** La referencia es inequívoca entre empresas sin perder la secuencia comercial independiente de cada organización ni alterar el rastreo seguro existente.

### 2026-08-14 - Identidad de plataforma fuera de las secuencias comerciales de tenants

**Contexto:** `organization_seller_code_counters` ya separa la numeración por `organization_id`, pero `assign_profile_seller_code()` determina elegibilidad por rol o permisos. Así, un usuario registrado en `platform_admins` puede consumir numeración de una empresa cliente si su perfil también tiene rol `administrador` o permiso `all`.

**Decisión:** La pertenencia a `platform_admins` prevalece sobre roles y permisos de tenant para la asignación de `seller_code`: esas identidades deben quedar excluidas del trigger, del backfill y de los contadores comerciales. La corrección de perfiles existentes se realizará mediante una migración auditable que compruebe referencias históricas antes de cambiar códigos; los identificadores de invoices ya persistidos no se reescriben.

**Resultado:** Los privilegios transversales de Boxario no producen identidad comercial dentro de SCGS ni de otra empresa, y cada tenant conserva una secuencia independiente que comienza en `001`.

### 2026-08-13 - Referencia visible compuesta con vendedor estable

**Decisión:** la secuencia autoritativa de `organization_invoice_counters` continúa asignando el consecutivo. Cada perfil autorizado para vender recibe además un `seller_code` único e inmutable dentro de su organización, asignado automáticamente con tres dígitos desde `001`. La capa de aplicación formatea la referencia como `COL20010010001` usando país, cantidad, vendedor, empresa y secuencia; los códigos de caja se derivan de esa referencia.

**Compatibilidad:** El formato anterior con guiones fue reemplazado el 2026-08-14 por `COL20010010001`; no se contempla compatibilidad con referencias antiguas.

**Resultado:** los nuevos códigos son informativos, identifican al vendedor sin confiar en datos del navegador y siguen siendo compatibles con QR, búsqueda, seguimiento y etiquetas sin reescribir ventas existentes.

### 2026-08-12 - Conservar el indicador visual de compilación de Next.js durante desarrollo

**Contexto:** se ocultó temporalmente la cápsula `Compiling…` / `Rendering…`, pero el usuario aclaró que prefiere verla mientras Boxario continúe en etapa de desarrollo para recordar que las recompilaciones pertenecen al entorno de prueba.

**Decisión:** no configurar `devIndicators: false`; conservar el indicador predeterminado de Next.js mientras se use `next dev`. El indicador desaparece naturalmente en la compilación de producción y no forma parte de la interfaz de Boxario.

**Resultado:** durante las pruebas queda visible que la página está compilando o renderizando y no se confunde ese comportamiento con la experiencia final de producción.

### 2026-08-12 - Datos visuales de mapas no equivalen a geocodificación

**Contexto:** `seed-logistics-visual-cases.mjs` generaba direcciones, ZIP y coordenadas mediante secuencias independientes. Una dirección de Soledad Canyon quedó guardada con coordenadas de Pardee/Valencia y se mostró como si estuviera verificada.

**Decisión:** los mapas operativos representan literalmente las coordenadas persistidas y no intentan adivinar una corrección desde el texto. Los generadores visuales no deben marcar como verificadas coordenadas calculadas artificialmente; una prueba que necesite geografía real debe obtenerla del proveedor configurado o declarar la ausencia de coordenadas.

**Resultado:** un error de datos no se oculta dentro del mapa y los casos visuales futuros usan una respuesta completa de Google Geocoding, incluyendo su dirección normalizada, ZIP, `place_id` y coordenadas, o fallan de forma explícita.

### 2026-08-12 - Vista previa de secuencia y refresco entre módulos

**Contexto:** El cliente de Venta iniciaba la secuencia visual en `1` y Seguimiento confiaba por completo en un bootstrap que podía provenir de una navegación precargada.

**Decisión:** `loadVentaBootstrap` consulta `organization_invoice_counters.last_number + 1` únicamente como vista previa; `next_organization_invoice_number` conserva la asignación definitiva y concurrente. `createShipmentAction` revalida `/seguimiento` y `/logistica`, y el cliente de Seguimiento reemplaza su bootstrap con una consulta fresca al montar.

**Resultado:** No cambia la autoridad transaccional del número ni la idempotencia del alta, y las navegaciones precargadas convergen inmediatamente con la base de datos.

### 2026-08-11 - Preselección por rectángulo sobre el mosaico Census

**Contexto:** Hace falta marcar muchas piezas administrativas sin dibujar polígonos libres ni PostGIS.

**Decisión:** En modo área, el cliente dibuja un rectángulo sobre Google Maps y filtra el mosaico ya cargado por **intersección de bounds** (AABB). Cada pieza se resuelve con `resolveCoveragePlaceFromCensusPolygonAction` (tope 40) y entra al pending múltiple. No se inventa un polígono de cobertura ni se cambia el matching por `place_id`.

**Resultado:** Alta en lote reutiliza el mosaico visible y el flujo de confirmación existente.

### 2026-08-11 - Mosaico Census clicable para cobertura

**Contexto:** La cobertura por lugares necesitaba límites reales visibles antes del clic, no un perímetro calculado a partir del punto tocado.

**Decisión:** `loadCensusPlacesCatalogAction` consulta TIGERweb por `esriGeometryEnvelope` (capas Incorporated Places y CDP), con simplificación según el zoom. El cliente pinta esas piezas en una capa Data aparte; `resolveCoveragePlaceFromCensusPolygonAction` vincula la pieza a Google Places y cachea el GeoJSON exacto en `logistics_census_place_geometry_cache`. No se dibujan polígonos a mano ni se introduce PostGIS.

**Resultado:** El operador ve y elige fronteras administrativas reales; el matching y el guardado siguen basados en lugares.

### 2026-08-10 - Fronteras Census para cobertura por ciudad

**Contexto:** Los bounds viewport de Google Places se ven como cuadrados aproximados; el operador pide frontera real de ciudad sin coste de GIS comercial.

**Decisión:** Para lugares en modo `places`, el mapa solicita geometría gratuita a Census TIGERweb (`Places_CouSub_ConCity_SubMCD`: Incorporated Places y CDPs) con consulta espacial por lat/lng del place, simplificada (`maxAllowableOffset≈55m`) para que Google Maps Data Layer pinte un contorno estable. Se cachea en `logistics_census_place_geometry_cache` (migración `207`, vintage `tigerweb-simp-v1`) por `place_id` de Google. Ciudades (`locality`) prueban incorporada y luego CDP; barrios/zonas solo CDP (no se pinta la ciudad entera). Estilo: trazo marcado y relleno muy suave (no mancha opaca). Si Census no encuentra geometría, viewport de Google como respaldo. La lista sigue siendo la fuente de verdad; fallo Census no bloquea guardado.

**Resultado:** Santa Clarita y otras ciudades US muestran contorno oficial sin pagar geometría; el cuadrado de Google solo aparece como degradación.

### 2026-08-10 - Cobertura places con Google Places y bounds

**Contexto:** La UX de cobertura pasa de ZIP/ZCTA a ciudades y zonas jerárquicas, sin PostGIS ni polígonos dibujados a mano en el MVP.

**Decisión:** Autocomplete/Text Search y Place Details usan `GOOGLE_MAPS_API_KEY` en servidor (`searchCoveragePlacesAction`, `listCoveragePlaceChildrenAction`, `resolveCoveragePlaceDetailsAction`, `resolveCoveragePlaceFromCensusPolygonAction`). La búsqueda combina `(cities)`, `(regions)` y `geocode`, con Text Search de respaldo. La selección en mapa usa el mosaico Census clicable (ver entrada 2026-08-11); ya no se inventa cobertura desde reverse geocode de un punto vacío. Se cachean hijas en `logistics_place_children_cache` y bounds viewport en `logistics_route_coverage_places.bounds`. En el mapa, la identidad visual de `places` es el polígono Census; los bounds viewport solo aparecen como degradación de cobertura ya confirmada. ZCTA sigue pintándose lleno solo para `postal_codes` legado. El matching primario es `place_id` + nombres normalizados; bounds refuerzan cuando hay lat/lng. Sin clave o sin geometría, la lista de lugares sigue siendo la fuente de verdad y el guardado no se bloquea.

**Resultado:** Se puede definir “Santa Clarita completa” o un subconjunto de zonas sin depender de ZIP; el legado postal permanece operable.

### 2026-08-10 - Retiro técnico del cutoff y auto-cierre de rutas

**Contexto:** La migración `194` y el panel de reservas acoplaban cutoff global, excepciones de fecha, triggers `ROUTE_ALREADY_CLOSED` y un job `pg_cron`.

**Decisión:** `204_remove_route_booking_cutoff.sql` elimina columnas `route_booking_cutoff_time` / `booking_cutoff_time`, la tabla `logistics_route_date_exceptions`, RPC `save_route_booking_policy`, funciones/triggers de cutoff, el cron `boxario-close-due-logistics-routes` y recrea `activate_logistics_route_weekday` sin parámetro de cutoff. Esta decisión reemplaza la de 2026-08-05 sobre auto-cierre por `194`.

**Resultado:** La base local ya no bloquea ni cierra rutas por hora del día anterior; el tipado generado debe regenerarse tras aplicar la migración.

### 2026-08-10 - Matriz mínima de regresión para celulares

**Contexto:** el viewport de 390 px no detectaba fallos que sí aparecían en teléfonos compactos: mínimos intrínsecos de formularios, calendarios dentro de paneles, etiquetas comprimidas y overlays posicionados con `window.innerWidth` o anchos fijos.

**Decisión:** `tests/e2e/mobile-responsive.test.mjs` recorre las rutas de usuario en 320×568, 360×800, 390×844 y 430×932. La verificación rechaza desbordamiento del documento, elementos fuera del viewport salvo que pertenezcan a un desplazamiento horizontal explícito y texto visible realmente cortado con elipsis. Los overlays compartidos se calculan contra `document.documentElement.clientWidth`, porque representa el ancho útil después de la barra de desplazamiento, y se revisan abiertos en el viewport compacto.

**Resultado:** la compatibilidad móvil deja de depender de una sola captura o de ocultar `overflow-x`; las regresiones de ancho y legibilidad quedan detectables por ruta y por tamaño de teléfono.

Este documento conserva decisiones de infraestructura, red, autenticación y compatibilidad entre dispositivos que no pertenecen al diseño visual.

## Jerarquía de fuentes documentales (2026-07-27)

Cuando dos afirmaciones de la documentación se contradigan, la autoridad se resuelve en este orden:

1. Código confirmado por `docs/MAPA_FUNCIONAL_ACTUAL.md` = comportamiento actual.
2. Regla de negocio más reciente en `REGLAS_NEGOCIO_Y_DEPENDENCIAS.md` = comportamiento deseado.
3. Decisión técnica más reciente en este documento = implementación aprobada.
4. Guía de interacción más reciente en `GUIA_INTERACCION_Y_ACCIONES_CRITICAS.md` = comportamiento de confirmación, riesgo y recuperación.
5. Guía UI más reciente en `GUIA_ESTILO_UI.md` = presentación aprobada.
6. Entradas anteriores = histórico, no fuente vigente.

Una entrada reemplazada no se borra: se marca como histórica indicando la fuente vigente, para que ninguna IA la tome como comportamiento actual.

### 2026-08-01 - Guardado serializado de sugerencias por dia

**Contexto:** al eliminar varias horas seguidas, cada guardado asincrono leia la misma version anterior y las escrituras se pisaban. La interfaz quedaba vacia, pero Ventas podia volver a leer horas antiguas.

**Decision:** las modificaciones de un dia se encolan en el cliente y se persisten en orden. Cada escritura siguiente espera a que termine la anterior.

**Resultado:** borrar una lista completa conserva el estado vacio en la fuente de verdad y Ventas recibe el mismo resultado que muestra Configuracion.

## Registro de decisiones

### 2026-08-10 - RPC atómico para reordenar paradas

**Contexto:** `upsert` no es apropiado para actualizar únicamente `stop_order`: PostgreSQL comprueba las restricciones de la fila candidata antes de resolver `ON CONFLICT`, por lo que una carga parcial podía violar `logistics_route_stops_source_check`.

**Decisión:** `reorder_logistics_route_stops_atomic(uuid, uuid[])` usa una sola transacción `security definer`, deriva actor y organización de la sesión, bloquea la ruta con `FOR UPDATE`, valida permisos, estado, cardinalidad, unicidad y pertenencia de todas las paradas activas, y actualiza mediante `unnest ... with ordinality`. La misma función registra actividad y, cuando corresponde, notifica al conductor. Solo `authenticated` puede ejecutarla.

**Compatibilidad:** El contrato de la acción TypeScript no cambia. La migración no modifica tablas ni datos existentes y admite paradas provenientes tanto de tareas como de visitas de agencia porque nunca reescribe su fuente.

**Resultado:** El orden se guarda completo o no se guarda; los errores internos quedan en el log del servidor y la interfaz recibe mensajes recuperables específicos.

### 2026-08-10 - Recorrido vial de rutas operativas con degradación segura

**Contexto:** El detalle operativo necesita mostrar las paradas sobre un mapa y unirlas siguiendo el orden persistido, sin introducir un segundo motor de ordenamiento.

**Decisión:** El cliente reutiliza `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` y la biblioteca `routes` de Maps JavaScript para solicitar un recorrido `DRIVING` mediante `Route.computeRoutes`, con primera parada como origen, última como destino y hasta 25 puntos intermedios. No se solicita optimización. Si falta la clave, la lista continúa operativa y el enlace universal de Google Maps queda disponible sin clave; si falla el cálculo vial o se supera el límite, los marcadores se unen con una línea directa claramente advertida. El enlace universal se limita a 11 paradas con coordenadas para respetar su capacidad portátil y comunica cuando queda truncado.

**Compatibilidad:** No se añade SDK ni secreto nuevo al navegador. Las coordenadas existentes siguen proviniendo de la validación de direcciones. La integración no inventa origen de almacén, no guarda geometrías viales y no cambia estados ni permisos.

**Resultado:** Boxario ofrece una vista vial actualizable y una salida a Google Maps, manteniendo la lista como fuente operativa incluso ante configuración incompleta, límites del proveedor o fallas de red.

### 2026-08-05 - Comando autoritativo para guardar el plan logistico del envio

**Contexto:** la proteccion de `shipments.logistics_plan` rechazaba el guardado del programador de recogidas porque el action todavia escribia directamente desde una sesion autenticada.

**Decision:** `persistShipmentLogisticsPlanUpdate` conserva la validacion, sincronizacion de tareas y auditoria existentes, pero persiste `logistics_plan` y `delivery_notes` mediante `update_shipment_logistics_plan_atomic`. El RPC es `SECURITY DEFINER`, deriva organizacion e identidad de la sesion y exige `sales.manage`; no se relaja el trigger de columnas autoritativas.

**Resultado:** programar o editar una recogida puede guardar el plan mediante el comando autorizado y las escrituras directas de clientes autenticados continuan bloqueadas.

### 2026-08-03 - AGE-001: idempotencia de solicitud y asignación de agencia

**Contexto:** Las claves de cliente se regeneraban o no viajaban de UI → Action → RPC; assign podía duplicar visita/stop.

**Decisión:** Reutilizar `idempotency_operations` con `request_hash`, claves de cliente obligatorias, pending store de agencia ante timeout, y unicidad `agency_visit_lines(request_line_id)`. Migraciones `179`–`180`.

**Resultado:** Una intención → una solicitud; una asignación → una visita y un stop; replay/conflicto explícitos.

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

### 2026-08-03 - CI remoto: GitHub Actions ejecuta quality:gate

**Contexto:** Los gates existían solo en local; un PR podía romper typecheck/lint/arquitectura/duplicación/test:gate sin detección automática.

**Decisión:**
- Workflow `.github/workflows/quality-gate.yml` corre en `pull_request` y en `push` a `main`.
- Un solo job ejecuta `npm ci` + `npm run quality:gate` (misma composición que local: typecheck, lint, architecture, duplicates, test:gate).
- Node 22 en CI; package manager npm con `package-lock.json` (`npm ci` + caché de setup-node).
- Permisos mínimos: `contents: read`. Sin secretos, sin `pull_request_target`, sin credenciales Supabase.
- Concurrencia por ref cancela runs previos del mismo PR/rama.
- Fuera de este workflow (siguen manuales / requieren infra): `quality:db`, `check:db-types`, `test:eval`, `test:e2e`, `build`, `security:release-check`.

**Resultado:** GitHub puede bloquear un PR que rompa el gate rápido sin exponer secretos ni depender de Docker.

**Activación remota (pendiente de confirmación del usuario):** el workflow vive en el árbol local. No se hace push ni se configura branch protection hasta que la fase local esté estable y el usuario lo ordene. Al publicar:

1. Incluir `.github/workflows/quality-gate.yml` en el commit/PR.
2. En GitHub → Settings → Branches → protect `main`: Require status checks → `quality:gate` (nombre del job), Require a pull request before merging, Do not allow bypassing (según política del equipo).
3. Verificar un PR de prueba que falle el gate a propósito y otro limpio.

### 2026-08-02 - Tipos DB generados (histórico consolidado)

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
> - `Exacta` / `Antes de` / `A partir` / `Entre` → `organization_route_settings.schedule_suggestions` (preferencia del cliente en el flujo de venta; depósito en `Configuración → Ventas → Depósito`; días activos en `Configuración → Ventas → Rutas`).
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

**Compatibilidad:** El rol Logística recibe su permiso automáticamente, Conductores no lo reciben y Administrador conserva acceso completo. La URL anterior `configuracion?view=deliveries` redirige a `configuracion?view=prices&panel=deposito` (2026-08-04). `logistica?view=configuracion` y `configuracion?view=prices&panel=operativos` redirigen a `configuracion?view=prices` (países). El depósito mínimo y los atajos de horario se editan en `Configuración → Ventas`; el cargo logístico adicional lo captura el vendedor en el flujo de venta.

### 2026-08-04 - Sección Ventas (precios, depósito, rutas)

> Histórico — actualizado el 2026-08-04. La decisión vigente permite que Logística abra su propia vista interna de Rutas sin cambiar la fuente de verdad del catálogo.

**Contexto:** El depósito mínimo estaba detrás del engranaje de Seguimiento; “Costos + Horarios” sonaba incoherente; el calendario semanal vivía en Logística y se buscaba en Configuración.

**Decisión:** La sección `view=prices` se presenta como **Ventas** con pestañas `Países`, `Depósito` y `Rutas`. Rutas monta el mismo `LogisticsRouteCatalog` (días, horarios, plantillas). `/logistica?view=rutas`, `/seguimiento?view=configuracion` y `panel=horarios` redirigen a `panel=rutas`. Logística ya no ofrece la vista de edición del catálogo.

**Compatibilidad:** No hay migración de datos. Las actions de rutas y permisos `routes.update_status` se mantienen; solo cambia la ubicación de la UI.

### 2026-08-04 - Acceso de Logística al catálogo semanal de Rutas

> Histórico — actualizado el 2026-08-04. La decisión vigente reemplaza el enlace a Configuración por `/logistica?view=rutas` dentro del módulo de Logística.

**Contexto:** El catálogo semanal vive en Configuración → Ventas → Rutas, pero el operador de Logística necesitaba un acceso directo desde su navegación.

**Decisión:** El permiso `routes.update_status` también permite entrar a `/configuracion` para abrir el panel `view=prices&panel=rutas`. La navegación de Logística enlaza a esa URL; no se duplica la pantalla ni se cambia la fuente de verdad.

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

**Decisión:** las listas de rutas usan `LOGISTICS_ROUTES_PAGE_SIZE = 50` (máx. 200), orden `route_date`/`created_at`/`id` desc, y filtros en Supabase (`routeDate`, `assignedTo`, `zoneKey`, `routeTemplateId`, `weekday` acotado, `statusMode`, `search`). Activas = no cancelled/completed; Historial = completed. En el board de Tareas, Activas muestra invoices sin ruta operativa cargada; Historial muestra invoices que participaron en una ruta terminada (cualquier tarea del envío en `routeByTaskId`). Tras mutaciones se recarga la página actual, no toda la org. Pickers de envíos/agencias piden `statusMode: "active"` con límite 50.

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

### 2026-08-03 - Una sola carpeta local editable de Boxario

**Contexto:** auditoría Git para evitar worktrees, clones paralelos o agentes trabajando en copias distintas del proyecto.

**Decisión:**
- Carpeta canónica: `C:\Users\pablo\OneDrive\Documentos\Codigo\Paginas\Boxario`.
- Un único working tree activo y una única versión local editable.
- GitHub (`origin` = `https://github.com/CodigoTriptonico/Boxario.git`) es el remoto y la copia estable.
- Prohibido crear worktrees o clones salvo orden expresa del usuario.
- Los análisis pueden ejecutarse en paralelo; las modificaciones deben hacerse secuencialmente en el mismo working tree.
- No hacer commits ni pushes salvo orden expresa; actualizar GitHub solo después de validar el proyecto local.

**Resultado:** todos los agentes deben operar en la ruta canónica detectada.

### 2026-08-03 - Scroll vertical del área central del App Shell

**Contexto:** en `/platform` la lista de empresas quedaba recortada sin scrollbar. El shell de escritorio ya define el scroll en el contenedor central (`lg:min-h-0 lg:flex-1 lg:overflow-y-auto`), pero el `Panel` de la página usaba `overflow-hidden` (default de `clipContent`) como hijo flex. Eso permite encoger el panel por debajo de su contenido; el padre ve la misma altura y no genera scroll, mientras el panel recorta la lista.

**Decisión:**
- En escritorio, el único scroll vertical de página es el del área central del App Shell.
- Las pantallas de listado largo deben usar `clipContent={false}` en `Panel` (u otro contenedor sin `overflow-hidden`) para que el contenido crezca y el shell haga scroll.
- No forzar `min-h-[calc(100dvh-…)]` en esas listas: produce altura mínima innecesaria con pocos registros y no arregla el clip.
- Las pantallas con scroll interno propio (inventario, venta, etc.) siguen usando `min-h-0 flex-1 overflow-y-auto` / `overflow-hidden` de forma deliberada dentro del mismo shell.

**Resultado esperado:** listas largas muestran scrollbar en el área central; los últimos registros son alcanzables; no hay doble scrollbar ni clip silencioso.

### 2026-08-04 - Vista interna de Rutas en Logística

**Contexto:** El primer acceso desde la navegación de Logística abría Configuración → Ventas → Rutas, incluyendo el shell de Países y Cobros.

**Decisión:** `/logistica?view=rutas` se resuelve dentro de `LogisticaClient`, con `LogisticsSectionNav active="routes"` y `VentasRutasPanel`. Se elimina la redirección a Configuración y se conserva `LogisticsRouteCatalog` como fuente de verdad reutilizada por el panel. Esta decisión actualiza la entrada anterior que enviaba Rutas de Logística a Configuración.

**Resultado esperado:** Rutas se comporta como una cuarta sección de Logística y no expone las pestañas de Países ni Cobros.

### 2026-08-05 - Validación sin navegador salvo solicitud expresa

**Contexto:** la validación visual mediante navegador interrumpe el flujo y no es necesaria para cada cambio del proyecto.

**Decisión:** no usar ni inspeccionar navegadores para desarrollar, probar o validar Boxario, salvo que el usuario lo solicite expresamente.

**Resultado:** la validación normal se realiza con lectura de código, typecheck, ESLint, pruebas, comprobaciones de base de datos y compilación proporcionales al cambio.

### 2026-08-05 - Hidratación estable con preferencias locales

**Contexto:** en un dispositivo con preferencias de superficie guardadas, el primer render del cliente podía diferir del HTML generado por el servidor. La página seguía visible y los enlaces inferiores navegaban como HTML normal, pero los controles dependientes de React podían quedar sin respuesta.

**Decisión:** los proveedores compartidos deben iniciar con un estado determinista igual en servidor y cliente. Las preferencias de `localStorage` se aplican después del primer render, dentro de un efecto cancelable; no se leen en el inicializador de estado que participa en la hidratación.

**Resultado esperado:** Ventas y el resto del shell se hidratan de forma consistente en celular, aunque ese dispositivo tenga una vista o paleta guardada distinta.

### 2026-08-05 - Limpieza del Service Worker sin bucle de recarga

**Contexto:** al abrir el servidor de desarrollo desde un celular que todavía estaba controlado por un Service Worker anterior, la limpieza podía recargar la ruta continuamente. React ejecuta dos veces los efectos en desarrollo; el segundo montaje eliminaba la marca de recarga mientras el documento aún conservaba el controlador anterior. Los enlaces inferiores parecían funcionar por navegación HTML, pero el resto de la pantalla se reemplazaba antes de procesar el toque.

**Decisión:** después de desregistrar el worker y borrar sus cachés, la marca de recarga única se conserva mientras `navigator.serviceWorker.controller` siga presente. Sólo se elimina cuando el documento ya no está controlado. Además, el HTML de desarrollo comprueba el controlador en `<head>`, antes de los bundles de React; si detecta `/sw.js`, pasa por `/dev-sw-cleanup`, una respuesta sin shell y sin caché que desregistra exclusivamente ese worker, elimina sólo cachés `boxario-static-*` y vuelve a la ruta original. La ruta no existe funcionalmente en producción.

**Resultado esperado:** el desarrollo móvil puede hacer como máximo una recarga de saneamiento y luego permanece estable e interactivo, incluso con el doble montaje de efectos de React.

### 2026-08-05 - Agregación segura y fechas operativas de Estadísticas

**Contexto:** El dashboard anterior agregaba registros en Node, usaba permisos distintos entre ruta y acciones y una consulta legacy leía un ledger global con service role. Además, los límites de día dependían de la zona horaria del runtime.

**Decisión:** Estadísticas usa una única RPC agregada, sin `organization_id` controlado por cliente. La función deriva organización, rol y capacidades de la sesión: administración/auditoría conserva alcance global autorizado; ventas se limita a `sales_owner_id`; logística respeta su capacidad operativa; inventario y finanzas se omiten desde la consulta cuando faltan sus permisos; el conductor continúa bloqueado por el guard de navegación. La RPC fija `search_path`, revoca acceso anónimo y limita rangos a 366 días. Los días de UI son inclusivos y se convierten en servidor a intervalos `[inicio, fin)` con `America/Los_Angeles`; las comparaciones usan un periodo anterior equivalente. La llamada no usa service role ni caché compartida entre sesiones.

**Resultado esperado:** una URL filtrada produce el mismo informe en SSR y al refrescar, no expone datos entre organizaciones y mantiene consistente el corte diario durante cambios DST. Las series y rankings llegan ya agregados y acotados al navegador.

### 2026-08-09 - Contrato v2 de Estadísticas con analítica logística

**Contexto:** La analítica diaria de logística necesita combinar tareas, snapshots de parada, solicitudes, rutas, vehículos y conductores sin descargar registros crudos al navegador ni abrir un segundo alcance de permisos.

**Decisión:** `load_statistics_dashboard_v2` conserva `load_statistics_dashboard` como núcleo comercial y agrega en PostgreSQL `logisticsAnalytics` dentro de la misma llamada. El wrapper vuelve a derivar alcance de organización/tenant y capacidades de la sesión, fija `search_path`, permanece cerrado para `public` y `anon`, y aplica los mismos filtros del informe. Las finalizaciones se consultan por un índice parcial `(organization_id, completed_at)` y los rankings se acotan antes de serializarse.

**Resultado esperado:** SSR, refresco, CSV y ambas pestañas consumen un único contrato agregado; no se usa service role, no se envían tareas de otras organizaciones y el navegador recibe solo series y rankings ya limitados.

### 2026-08-05 - Filtros de Seguimiento persistentes en la pestaña

**Contexto:** el menú lateral abre `/seguimiento` sin query; los filtros vivían solo en estado React y se perdían al cambiar de módulo y volver.

**Decisión:** Seguimiento persiste búsqueda, estado, país, vendedor y readiness en `sessionStorage` (`boxario.seguimiento.filters.v1`) y los sincroniza en la URL (`q`, `status`, `country`, `seller`, `ready`) con `history.replaceState`. Al montar, si la URL no trae claves de filtro se restaura la sesión; si trae alguna, esa clave gana y el resto se fusiona con la sesión. La hidratación arranca en vacío y aplica el restore en un efecto cancelable.

**Resultado esperado:** filtrar, salir a otra pantalla y volver a Seguimiento en la misma pestaña conserva el filtro; refrescar también; cerrar la pestaña lo limpia.

### 2026-08-05 - Cierre automático autoritativo de rutas

**Contexto:** el límite del día anterior se validaba en las entradas de la aplicación, pero el paso de `draft` a `planned` seguía dependiendo exclusivamente del botón manual.

**Decisión:** la migración `194_logistics_route_automatic_close.sql` centraliza el cálculo del cierre efectivo (subruta o día propio; de lo contrario global) en PostgreSQL y usa `America/Los_Angeles` para construir el instante. Un job `pg_cron` por minuto cierra únicamente borradores válidos y registra `logistics.route_auto_closed` con actor `Sistema`. Triggers autoritativos bloquean crear una ruta o insertar una parada después del límite, incluso si el cliente omite la validación. Las funciones automáticas no se exponen a `anon`, `authenticated` ni `service_role`.

**Resultado esperado:** el cierre ocurre sin depender de que un usuario mantenga abierta la página. El botón manual conserva el mismo RPC y puede cerrar antes; los borradores incompletos no se fuerzan ni se envían al conductor.

### 2026-08-06 - Mapa ZIP sin PostGIS

**Contexto:** Se requiere visualizar rutas definidas por ZIP sin introducir edición de polígonos ni dependencia espacial en PostgreSQL.

**Decisión:** Google Maps se carga en cliente con `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (además de `GOOGLE_MAPS_API_KEY` server-side para validate-address). Los límites se consultan en el layer ZCTA del servicio oficial Census TIGERweb, con `ZCTA5`, GeoJSON y WGS84. `logistics_zcta_geometry_cache` guarda globalmente ZIP, vintage Census, GeoJSON, límites y fecha de consulta; no se habilita PostGIS. Los límites ZCTA son una aproximación visual y no una frontera postal exacta. Sin la clave pública, la cobertura ZIP sigue siendo editable; el mapa muestra aviso y no bloquea el guardado.

**Resultado:** La lista es la fuente operativa y el mapa es degradable. La primera versión no incluye ZIP+4, polígonos personalizados, optimización vial ni navegación del conductor. El mapa de cobertura solicita la ubicación del operador para marcar `Tú` y encuadrar ZIP + posición; solo ZCTA de EE. UU. tienen geometría.

### 2026-08-06 - Compatibilidad de interruptores semanales geográficos

**Contexto:** Las migraciones de horarios heredadas volvieron a escribir `pickup_days` y exigían un registro en `logistics_weekday_defaults` antes de habilitar un día, aunque los horarios ahora pertenecen a `logistics_route_schedules`.

**Decisión:** `delivery_days` conserva temporalmente los interruptores maestros lunes–domingo para compatibilidad. `pickup_days` queda como campo legado sin nuevas escrituras y los interruptores no dependen de horarios heredados. La migración `197_geographic_route_master_days.sql` restablece este contrato.

**Resultado:** Un día nuevo puede habilitarse y materializar su ruta general geográfica sin bloquearse por el catálogo anterior; los horarios reales siguen perteneciendo a cada definición de ruta.

### 2026-08-08 - Tokens derivados de contraste sin migración de preferencias

**Decisión:** `ui-surface-color-math.ts` calcula luminancia relativa, ratio WCAG y foregrounds legibles para cada color base y hover. `UiSurfacePalette.listRow` expone foreground principal/secundario, foreground hover y bordes derivados; las variables CSS se aplican al montar el contexto activo.

**Compatibilidad:** se conserva `boxario-ui-surfaces:v2` y el esquema persistido de `byContext`/`customPalettes`. Los fondos y hexadecimales personalizados existentes no se reescriben; los nuevos valores derivados se calculan en runtime. Las clases de color dinámicas de personalización usan tokens CSS para que no dependan de que Tailwind haya generado una clase arbitraria.

**Resultado:** preferencias v2 y fondos personalizados siguen siendo válidos sin migración, mientras filas, tarjetas y hover reciben texto e iconos con contraste AA. La auditoría E2E usa `@axe-core/playwright` sobre las rutas autenticadas y los selectores de vista/paleta.

### 2026-08-08 - Bordes de contenedor oscuros y foregrounds derivados

**Decisión:** los foregrounds de texto, iconos, hover y focus continúan calculándose desde la paleta; los bordes generales de paneles, filas, tablas y navegación conservan el tratamiento oscuro original y no se sustituyen globalmente por grises claros.

**Compatibilidad:** no cambia el formato de `boxario-ui-surfaces:v2` ni las preferencias existentes. Los tokens derivados de borde permanecen disponibles para consumidores que necesiten un borde interactivo específico, mientras las superficies compartidas usan el token oscuro.

### 2026-08-09 - Preferencia global del modo de vista

**Decisión:** `boxario-ui-surfaces:v2` conserva una sola propiedad `viewLayout` (`rows`, `cards` o `excel`) para toda la aplicación. Las funciones que aún reciben `contextId` mantienen su API para no romper consumidores, pero el contexto solo determina si Excel está disponible en esa superficie.

**Compatibilidad:** las preferencias v2 antiguas con `viewLayoutByContext` se leen y se convierten en un modo global determinista; el mapa se conserva únicamente durante la lectura compatible y se limpia al guardar una nueva selección. También se aceptan los almacenamientos legacy `boxario:view-layout` y `boxario:envios:view-layout`. Una superficie sin soporte Excel cae a filas mientras conserva la preferencia global.

### 2026-08-08 - Huella de dirección en confirmaciones de Logística

**Contexto:** las solicitudes demo de `Por confirmar` usaban una huella ficticia y la validación de integridad las rechazaba como si la dirección hubiera cambiado. La confirmación masiva además ocultaba el motivo devuelto por la acción.

**Decisión:** los datos demo calculan `address_fingerprint` con los mismos campos normalizados que la aplicación (`place_id`, dirección, ZIP, país y coordenadas). La confirmación masiva conserva el rechazo de seguridad y muestra el invoice junto con el motivo específico de cada fallo.

**Resultado:** las solicitudes demo válidas pueden confirmarse sin relajar la comprobación de cambios de dirección; cualquier error real queda visible para corregirlo.
### 2026-08-13 - Mapa de entrada en ventana emergente del navegador

**Contexto:** una superficie `position: fixed` o un portal dentro del documento principal continúa confinada a la ventana de Chrome y no puede arrastrarse a un segundo monitor de forma independiente.

**Decisión:** el mapa de entrada usa `window.open` desde el clic de `Abrir mapa` y monta su interfaz mediante un portal React en el documento same-origin de la ventana creada. La ventana copia las hojas de estilo activas, carga su propia instancia de Google Maps y se cierra al desmontarse el formulario. Se conserva una advertencia local cuando el navegador bloquea popups; no se intenta eludir esa política.

**Resultado:** Venta permanece en la pantalla principal mientras el mapa es una ventana nativa, redimensionable y trasladable entre monitores, sin duplicar el estado del formulario ni crear una segunda aplicación.
### 2026-08-14 - Reutilizacion del mapa de entrada exacta en tarjetas

**Contexto:** ya existia un flujo de mapa para crear o editar contactos y duplicarlo en las tarjetas podia producir reglas distintas.

**Decision:** las tarjetas llaman al componente compartido `SaleExactEntranceWindow`; un adaptador persiste el pin mediante las acciones existentes de cliente o destinatario y actualiza el estado local de Venta. Si faltan coordenadas, el mapa usa `/api/validate-address` con la direccion postal guardada.

**Resultado:** se conserva una sola implementacion de arrastre, satelite y Street View, con el mismo control de permisos, auditoria y guardado.
### 2026-08-14 - Solicitud separada para reencuadre de cobertura

**Contexto:** el mapa ya usaba una solicitud para volver al pin del cliente, pero no distinguia ese gesto del cambio de ruta.

**Decision:** `GeographicRouteCoverageMap` recibe `fitCoverageRequest` separado de `focusLocationRequest`. El primero reencuadra la cobertura filtrada y el segundo centra el cliente, evitando que una accion tape a la otra.

**Resultado:** cambiar de ruta vuelve a encuadrar la zona correcta sin perder el boton independiente para volver a la direccion del cliente.
### 2026-08-14 - Pin exacto compartido y bitacora

**Contexto:** el mismo cliente puede ser editado desde Ventas o desde la cobertura de Logistica.

**Decision:** `GeographicRouteCoverageMap` expone un callback de pin arrastrado; el modal conserva el borrador y usa una action protegida por `sales.manage`, `customers.manage` o `routes.update_status`. La action actualiza solo las coordenadas de entrada exacta y escribe metadata JSON con posiciones anterior/nueva, fuente y actor mediante `activity_history`.

**Resultado:** ambos modulos reutilizan la misma fuente de verdad y la auditoria no depende de que el cambio haya comenzado en Ventas o Logistica.
