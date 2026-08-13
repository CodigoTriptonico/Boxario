# Auditoría de Errores de Lógica y Confiabilidad

**Agente:** 3 — Logic Errors and Reliability  
**Fecha:** 2026-08-02  
**Workspace:** `C:\Users\pablo\OneDrive\Documentos\Codigo\Paginas\Boxario`  
**Modo:** solo lectura de código fuente; este archivo es el único artefacto escrito.  
**Referencia de negocio:** `docs/REGLAS_NEGOCIO_Y_DEPENDENCIAS.md` (FIN-004, LOG-015, INV-001/002, SEG-001, custodia).

## Metodología

1. Revisar reglas de negocio documentadas (pagos, inventario, rutas/tareas, custodia, permisos).
2. Seguir flujos críticos de escritura: server actions, rutas API, RPCs Supabase (`SECURITY DEFINER`), colas offline y transiciones de estado.
3. Contrastar autoridad declarada (SQL para dinero/stock; TS como preview) con el orden real de escrituras.
4. Buscar condiciones incorrectas, estados imposibles, carreras, actualizaciones parciales, excepciones silenciadas y desalineación FE/BE/DB.
5. Registrar solo evidencia con ruta y líneas; destacar también lo bien implementado.
6. Proponer correcciones incrementales (sin refactor amplio).

## Aspectos bien implementados

| Área | Evidencia | Por qué importa |
|---|---|---|
| Cobro con autoridad SQL + `FOR UPDATE` | `supabase/migrations/158_harden_security_definer_rpcs.sql` L10–184 | FIN-004: recalcula `paid`/saldo/estados; rechaza sobrepago; ignora `next_*` del cliente (`perform next_paid...`). |
| Preview TS alineado a no elevar total | `src/lib/conductor-driver-payment.ts` L69–102 | `settleConductorPayment` lanza si el monto supera el saldo; no ajusta `quotedTotal`. |
| Guard de stock directo | `supabase/migrations/148_inventory_stock_command_guard.sql` L6–43 | Bloquea escrituras autenticadas a balances de `inventory_stock` fuera del comando atómico. |
| Movimientos de inventario vía RPC | `src/lib/security/inventory-movement.ts` L46–81 | UI de inventario llama `record_inventory_movement_atomic`, coherente con INV-001. |
| Máquina de estados logística | `src/lib/logistics-state-machine.ts` L8–127 | Transiciones explícitas de ruta/tarea/paquete; `routeAllowsOperationalTaskCompletion` exige `in_progress`. |
| Completar tarea exige ruta activa (SQL) | `158_harden_security_definer_rpcs.sql` L344–367 | LOG-015: `TASK_ROUTE_REQUIRED` / `TASK_REQUIRES_ROUTE_IN_PROGRESS` / asignación al conductor. |
| Idempotencia de operación offline (índice) | `supabase/migrations/069_conductor_offline_task_results.sql` L6–8 | Unique parcial `(organization_id, client_operation_id)`. |
| Flush offline serializado por scope | `src/lib/conductor-offline/queue.ts` L212–253, L343–352 | Claim con lease de `syncing`; `flushPromises` evita flushes concurrentes del mismo scope. |
| Custodia con evidencia e idempotencia | `supabase/migrations/150_logistics_route_integrity.sql` L652–742 | `FOR UPDATE`, receptor distinto, evidencia obligatoria, replay si ya `accepted`, actualiza estado físico. |
| Distribución atómica de partner | `supabase/migrations/163_distribution_partner_atomic.sql` L3–78 | Activa/desactiva partner + org + perfiles en un solo RPC con `FOR UPDATE`. |
| Venta atómica | `src/app/actions/shipments-create.ts` (~L201) + migraciones de `create_shipment_sale_atomic` | Evita venta/reserva/factura a medias en el alta. |

## Hallazgos

### H1 — Completar tarea de conductor: `recordTaskAttempt` anula el RPC atómico

- **Severidad:** Crítica  
- **Certeza:** Alta  
- **Ubicación:**
  - `src/app/actions/conductor-task-results.ts` L268–325
  - `src/app/actions/conductor-task-result-support.ts` L64–128 (insert del attempt)
  - `src/app/actions/conductor-task-result-support.ts` L389–419 (`complete_conductor_task_atomic`)
  - `supabase/migrations/158_harden_security_definer_rpcs.sql` L302–310
- **Evidencia:** En el flujo `completed`, el action inserta primero en `shipment_logistics_task_attempts` con el mismo `client_operation_id` y después llama al RPC. El RPC, al encontrar ese `client_operation_id`, retorna `{ replayed: true }` **sin** actualizar tarea, cobro, parada ni milestones. El caller TS no inspecciona `replayed` y trata la respuesta como éxito.
- **Impacto:** La UI/API puede responder `ok` mientras la tarea sigue ejecutable, el cobro no se registra y el stop no cierra. Un reintento con el mismo `operationId` (cola offline) vuelve a hacer early-return: el fallo es sticky. Contradice LOG-015 (“cobro + cierre atómicos e idempotentes”).
- **Corrección incremental:**
  1. Eliminar el insert previo en el path `completed` (dejar que solo el RPC escriba el attempt), **o**
  2. Mover `recordTaskAttempt` a después de un RPC exitoso con `replayed: false`, **y**
  3. Si `data.replayed === true`, verificar en DB que la tarea quedó `completed` (o reconsultar estado) antes de devolver `ok`.
  4. Añadir test de integración: submit online → tarea `completed` + fila de pago si aplica.

### H2 — Efectos colaterales fuera de la transacción antes del cierre atómico

- **Severidad:** Alta  
- **Certeza:** Alta  
- **Ubicación:** `src/app/actions/conductor-task-results.ts` L167–266 (evidencia, invoice evidence, eventos de camión) antes de `completeTask` L312–325
- **Evidencia:** `uploadEvidence`, `recordInvoiceEvidence`, `insertTruckEvent` / `insertFullBoxCollectionEvent` se ejecutan **antes** del RPC atómico. Los eventos de camión se saltan en reintento si ya existen (`hasDeliverEventForTaskLine`), lo que es bueno para idempotencia parcial, pero deja inventario de camión/evidencia de factura avanzados aunque el cierre falle o (por H1) nunca ocurra.
- **Impacto:** Desfase camión ↔ tarea ↔ factura; reintentos pueden “confirmar” en UI sin alinear estado canónico.
- **Corrección incremental:** Tras corregir H1, envolver o reordenar: (a) RPC primero para estado canónico, (b) side-effects idempotentes después; o mover deliver/collect de camión dentro del mismo RPC/transacción. Mientras tanto, si el RPC no completa, no marcar la operación offline como `synced`.

### H3 — `logistics_plan` del cliente puede sobrescribir el billing recalculado por SQL

- **Severidad:** Alta  
- **Certeza:** Alta  
- **Ubicación:** `supabase/migrations/158_harden_security_definer_rpcs.sql` L369–393 (cobro) luego L428–450 (`p_shipment_patch.logistics_plan`)
- **Evidencia:** Tras `collect_shipment_invoice_payment` (que escribe `billing` autoritativo), el mismo RPC aplica `logistics_plan = p_shipment_patch -> 'logistics_plan'` si el patch lo trae. TS siempre envía `paymentPlan` / `noCollectionPlan` en el patch (`conductor-task-result-support.ts` L382–387, L345–379).
- **Impacto:** `shipments.paid` puede ser correcto mientras el snapshot `logistics_plan.billing` (saldo, `depositStatus`, `lastDriverCollection`) refleja el preview TS o datos obsoletos. Pantallas que leen billing del plan (libreta/expediente) pueden mentir respecto a FIN-004.
- **Corrección incremental:** En el RPC, tras cobrar, **no** reemplazar `logistics_plan` completo desde el cliente; mergear solo claves no financieras, o re-leer el plan post-cobro y fusionar `lastDriverCollection` de forma controlada. En TS, dejar de meter `billing` en `p_shipment_patch` cuando `p_collect_payment`.

### H4 — Fallos de negocio del conductor se clasifican como 503 reintentables

- **Severidad:** Media–Alta  
- **Certeza:** Alta  
- **Ubicación:**
  - `src/app/api/conductor/task-results/route.ts` L16–31, L59–63
  - `src/lib/actions/errors.ts` L33–41, L59–71
- **Evidencia:** `responseStatus` solo mapea un subconjunto a 4xx; el resto cae en **503**. `retryable = status >= 500 || …`. Además `publicActionErrorMessage` convierte mensajes SQL con patrones (`constraint`, `duplicate key`, `rpc`, etc.) en `"No se pudo completar la operacion"`, que también termina en 503. La cola offline (`queue.ts` L314–325) reintenta hasta 8 intentos.
- **Impacto:** Errores permanentes (saldo insuficiente, tarea no ejecutable, cancelada mal mapeada, etc.) saturan reintentos y acaban en `needs_attention` con mensaje genérico; ocultan la causa real.
- **Corrección incremental:** Mapear códigos/mensajes conocidos (`El monto no puede superar…`, `TASK_*`, `FORBIDDEN`, `CONFLICT`) a 409/422 con `retryable: false`. Exponer `ActionError.code` en el action result hacia la API.

### H5 — Path `failed` no es atómico (tarea / attempt / stop / auditoría)

- **Severidad:** Media  
- **Certeza:** Alta  
- **Ubicación:**
  - `conductor-task-results.ts` L268–310
  - `conductor-task-result-support.ts` L473–521 (`failTask` update directo)
- **Evidencia:** Fallo: insert attempt → update tarea a `cancelled` → update stop `outcome=failed` en llamadas separadas. El RPC atómico sí cancela + marca stop `failed` en una transacción, pero el path TS de fallo **no lo usa**.
- **Impacto:** Estados parciales (attempt sin tarea cancelada, o tarea cancelada sin stop). SEG-001 espera un evento de falla coherente; la bitácora puede divergir del stop.
- **Corrección incremental:** Reusar `complete_conductor_task_atomic` con `p_result='failed'` (y sin cobro) también para fallos; eliminar el update fragmentado. Asegurar que el attempt no se inserte dos veces (ligado a H1).

### H6 — Cola offline: re-enqueue de la misma tarea descarta el nuevo payload en silencio

- **Severidad:** Media  
- **Certeza:** Alta  
- **Ubicación:** `src/lib/conductor-offline/queue.ts` L132–182
- **Evidencia:** Si ya existe operación por `task-key`, hace `transaction.abort()` y **devuelve la existente** sin fusionar `result` / monto / evidencia nuevos.
- **Impacto:** El conductor cree haber guardado un cobro/resultado distinto; se sincroniza el primero. Combinado con H1/H4, agrava inconsistencias percibidas.
- **Corrección incremental:** Si status ∈ `pending|needs_attention`, actualizar campos mutables o rechazar con error visible; nunca devolver éxito silencioso con payload distinto. Documentar la regla en UI.

### H7 — Validación temprana de cobro conductor omite `balanceDue`

- **Severidad:** Baja–Media  
- **Certeza:** Alta  
- **Ubicación:** `src/app/actions/conductor-task-results.ts` L127–137 vs `src/lib/conductor-driver-payment.ts` L43–48
- **Evidencia:** `conductorPaymentChoiceError` se llama sin `balanceDue`; el check de sobrepago solo aplica si se pasa. La defensa real queda en `settleConductorPayment` / SQL (bien), pero el fail rápido del action no cubre el caso.
- **Impacto:** Mensajes más tardíos/genéricos; más superficie para H4 (reintento).
- **Corrección incremental:** Pasar `balanceDue: task.balanceDue` (o saldo fresco del shipment) al validador.

### H8 — Auditoría de abono en oficina usa preview TS tras autoridad SQL

- **Severidad:** Baja  
- **Certeza:** Media  
- **Ubicación:** `src/app/actions/shipments-commercial.ts` L283–372
- **Evidencia:** Tras `collect_shipment_invoice_payment`, `recordActivityHistory` usa `paid`, `nextBalanceDue`, `nextInvoiceStatus` calculados en TS **antes** del RPC. SQL puede redondear/depositStatus distinto.
- **Impacto:** Metadata de bitácora puede no coincidir con `shipments`/`shipment_payments` (FIN-004: el historial visible debe venir de pagos reales).
- **Corrección incremental:** Tras RPC ok, releer shipment (+ último payment) y auditar con esos valores; o hacer que el RPC retorne el snapshot autoritativo.

### H9 — `stock_deducted_at` en cierre de entrega puede marcarse sin cumplir reserva en ese RPC

- **Severidad:** Baja–Media  
- **Certeza:** Media  
- **Ubicación:** `158_harden_security_definer_rpcs.sql` L410–412; fulfill real en `165_update_logistics_task_atomic.sql` / inicio de ruta `160_start_logistics_route_atomic.sql`
- **Evidencia:** `complete_conductor_task_atomic` pone `stock_deducted_at` en entregas completadas aunque ese RPC no llama `fulfill_inventory_sale_stock`. El descuento puede haber ocurrido al cargar/iniciar ruta (diseño LOG-015), pero el timestamp en complete sugiere “recién descontado” si el load falló o se omitió.
- **Impacto:** Consultas/reportes que usan `stock_deducted_at` como prueba de fulfill pueden mentir para ventas sin stock (INV-002) o rutas sin fulfill.
- **Corrección incremental:** Solo setear `stock_deducted_at` si ya existía o si fulfill corrió en la misma transacción; no inventar el hito en complete.

### H10 — Hueco documentado: auto-eventos de custodia desde conductor

- **Severidad:** Informativa / Media potencial  
- **Certeza:** Documentada (mapa) + código parcial  
- **Ubicación:** `docs/REGLAS_NEGOCIO_Y_DEPENDENCIAS.md` L311–315; handoff manual en `150_logistics_route_integrity.sql` L652+
- **Evidencia:** El mapa marca “auto-eventos desde conductor NO CONFIRMADOS”. El RPC de aceptación sí actualiza `handed_to_carrier` / `in_warehouse`, pero el cierre de pickup en conductor no se verificó como escritor de `package_custody_events`.
- **Impacto:** Timeline de custodia incompleto respecto al flujo físico real.
- **Corrección incremental:** Confirmar en código/tests si pickup/complete escribe custody; si no, añadir evento idempotente (`event_key`) al RPC de complete para `pickup_full_box`.

## Flujos críticos revisados

| Flujo | Resultado |
|---|---|
| Cobro oficina `finalizeShipmentInvoiceAction` → `collect_shipment_invoice_payment` | Preview + gate TS; autoridad SQL con `FOR UPDATE`. Riesgo menor H8 en auditoría. |
| Cobro + complete conductor | **Roto / en riesgo alto** por H1–H3; defensa FIN-004 en SQL/TS existe pero puede no aplicarse si el RPC hace replay vacío. |
| Cola offline IndexedDB → `/api/conductor/task-results` | Flush/claim razonables; H4/H6 degradan confiabilidad operativa. |
| Alta venta `create_shipment_sale_atomic` | Patrón atómico correcto (reserva/venta). |
| Movimientos inventario UI | RPC + guard de stock: sólido (INV-001). |
| Fulfill reservas en carga/ruta | Presente en `165` / start route; desacoplado del complete (H9). |
| Publicar / iniciar ruta / complete con ruta `in_progress` | Alineado a LOG-015 en SQL + state machine. |
| Custodia `accept_package_custody_handoff` | Bien endurecido; auto-eventos conductor pendientes (H10). |
| Distribución partner activate/deactivate | RPC atómico (163): buen patrón. |
| Permisos cobro | SQL exige `sales.manage` \| `routes.update_status` \| rol `conductor` — coherente con cobro en ruta. |

## Conclusión del agente

La autoridad financiera e inventarial en SQL está **bien diseñada** (`FOR UPDATE`, rechazo de sobrepago, guards de stock, ventas atómicas). El mayor riesgo de confiabilidad no es la fórmula del saldo, sino la **orquestación TypeScript alrededor de `complete_conductor_task_atomic`**: insertar el attempt antes del RPC (H1) puede hacer que el sistema declare éxito sin cerrar tarea ni cobrar; los side-effects previos (H2) y el overwrite de `logistics_plan` (H3) amplifican el daño. La cola offline y el mapeo 503 (H4/H6) convierten fallos permanentes en ruido reintentable.

**Prioridad de remediación sugerida:** H1 → H3 → H2 → H4/H5 → H6 → resto.

**No se modificó código de aplicación**; único entregable: este archivo.
