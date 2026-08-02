# Reglas de negocio y dependencias de Boxario

## Propósito

Este documento registra la lógica que conecta los módulos de Boxario. Su objetivo es convertirse gradualmente en el mapa funcional completo de la empresa y del sistema.

Una regla de negocio debe indicar:

- Quién es la fuente de verdad.
- Qué módulos consumen el dato.
- Qué condición nunca debe romperse.
- Qué debe ocurrir cuando el dato no existe o no puede cargarse.

## Principio central

**Un módulo consumidor no puede inventar datos que pertenecen a otro módulo.**

Si Ventas necesita información administrada por Logística, debe consumir la configuración de Logística. Si esa información no existe, Ventas debe mostrar que no está disponible y orientar al usuario; nunca debe crear disponibilidad ficticia.

### 2026-08-01 - Sugerencias vacias no generan horarios

**Contexto:** Ventas seguia mostrando horarios predeterminados cuando las sugerencias del dia estaban vacias.

**Decision:** `organization_route_settings.schedule_suggestions` es la fuente de verdad. Una lista vacia significa que no hay atajos para esa modalidad; Ventas no puede reemplazarla con valores globales. `Entre` puede abrirse sin rangos guardados para permitir una captura manual.

**Resultado:** el modal de venta muestra solo la disponibilidad configurada por Logistica y nunca inventa horas cuando el catalogo esta vacio o no pudo cargarse.

## Mapa inicial de dependencias

| Fuente de verdad | Dato | Consumidores | Regla |
|---|---|---|---|
| Logística → Rutas | Días disponibles | Ventas, programación de entregas y recolecciones | Ventas sólo ofrece los días activados en Logística. |
| Logística → Rutas | Rutas semanales | Ventas, tareas logísticas | Las rutas ofrecidas en una venta provienen del catálogo de Logística. |
| Inventario | Stock por bodega | Ventas, bodega, asignaciones | Ningún módulo puede confirmar disponibilidad física, reservar ni descontar más unidades de las existentes. La venta puede registrarse sin stock cuando queda identificada como pendiente de inventario (ver INV-002, venta sin stock). |
| Inventario → ubicaciones (bins) | Ubicaciones y cantidades por estante (`warehouse_bins` + `inventory_bin_stock`) | Tarjetas y filas de `/inventario` | La ubicación visible proviene de los bins del stock agregado; la suma ubicada no supera el stock de esa bodega. El módulo `/bodega` no es la fuente de estas ubicaciones: administra cajas llenas individuales (`shipment_packages`). |
| Inventario | Movimientos | Historial, costos y auditoría | Toda entrada, salida o ajuste genera una traza auditable. |
| Configuración comercial | Países y precios | Ventas, catálogo | Ventas consume países y precios configurados; no crea precios implícitos. |

### 2026-07-27 — LOG-007: días administrados únicamente en Rutas

**Contexto:** La configuración logística volvió a mostrar selectores de días para entregar y recoger, aunque esos días ya se administran en el catálogo semanal de Rutas.

**Decisión:** `Logística → Rutas` es la única fuente de verdad para activar o desactivar días operativos. `Configuración → Costos → Operativos` sólo administra anticipación y cargos sugeridos, y ningún guardado desde esa pantalla puede modificar días ni horarios.

**Resultado:** Se elimina la selección duplicada y el calendario semanal no puede sobrescribirse accidentalmente al guardar otras preferencias logísticas.

### 2026-07-27 — LOG-008: horario operativo por ruta semanal

**Contexto:** Los rangos globales de entrega y recolección seguían aparentando ser el horario de las rutas, aunque una empresa puede operar todo el lunes con un horario general o dividirlo en varias rutas con horarios diferentes.

**Decisión:** Activar un día crea una ruta general implícita, sin insertar una plantilla `Ruta del {día}`. Su hora de inicio y fin se guarda en la configuración semanal del propio día. `logistics_route_templates` queda reservado para subrutas nombradas; si existen, cada una administra su horario. Ventas deriva los rangos sugeridos del día general cuando no hay subrutas y de las subrutas cuando el día fue dividido.

**Resultado:** El día activado funciona inmediatamente como ruta, la lista inferior permanece vacía hasta que se creen subrutas y Ventas no ofrece rangos inventados.

## Reglas confirmadas

### LOG-001 — Disponibilidad de días

**Fuente:** Logística → Rutas → Calendario de rutas.

**Consumidor:** Ventas → Entrega de caja vacía y recolección de caja llena.

**Reglas:**

- Un día activado en Logística puede ofrecerse en Ventas.
- Un día desactivado no puede seleccionarse en Ventas.
- Si no hay ningún día activado, Ventas muestra cero días disponibles.
- Ventas no puede usar los siete días como respaldo.
- El calendario se vuelve a consultar al abrir el programador para evitar datos obsoletos.

### LOG-002 — Ruta opcional y fecha requerida

**Fuente:** Logística → Rutas.

**Consumidor:** Ventas → `Chofer entrega`.

**Reglas:**

- Para entregar una caja vacía mediante chofer se requiere un día o fecha válida.
- La ruta específica puede quedar pendiente.
- No cargar el catálogo de rutas no debe cerrar el flujo ni producir disponibilidad falsa.
- Si el catálogo falla, el modal puede abrir, pero sólo con la disponibilidad real conocida.
- Una ruta pendiente conserva la fecha elegida para que Logística complete la asignación.

### LOG-003 — Creación de tareas logísticas desde Ventas

**Fuente inicial:** decisión tomada en Ventas.

**Destino:** tareas de Logística.

**Reglas:**

- Elegir `Chofer entrega` implica que se necesitará una tarea de entrega de caja vacía.
- Una decisión con ruta seleccionada crea una tarea programada.
- Una decisión sin ruta específica crea una tarea pendiente vinculada a la fecha solicitada.
- La tarea debe conservar la referencia a la venta o envío que la originó.

### 2026-07-29 — LOG-009: dependencia entre entrega y recolección de cajas

**Contexto:** El resumen de un envío podía mostrar la recolección de caja llena como una etapa activa aunque la caja vacía seguía pendiente de entrega.

**Decisión:** La recolección de caja llena depende de que la entrega de caja vacía esté completada. Mientras la entrega esté pendiente, el resumen conserva el segundo paso solo como referencia bloqueada y no muestra su programación como si fuera ejecutable.

**Resultado:** La secuencia visible refleja el orden operativo real sin ocultar el siguiente hito.

### 2026-07-30 — LOG-010: edición de una programación logística existente

**Contexto:** Seguimiento ofrecía `Programar entrega` aunque la tarea ya estaba asignada a una ruta y tenía fecha y hora.

**Decisión:** La acción del paso logístico se deriva de la tarea y de su asignación de ruta actuales. Si ya existe ruta o fecha programada, la interfaz ofrece editar la entrega o recolección y muestra la programación vigente. `Programar` se reserva para una tarea que todavía no tiene programación. Abrir el editor no borra ni sustituye la asignación actual; el cambio sólo se aplica cuando el usuario confirma.

**Resultado:** Seguimiento no contradice a Logística ni hace parecer que una ruta persistida está pendiente.

### 2026-07-29 — SEG-002: detalle operativo y financiero en la libreta de envíos

**Contexto:** El resumen de la libreta necesitaba mostrar ruta, conductor, fecha y depósito sin inventar datos ni replicar el expediente completo.

**Decisión:** La libreta consulta el payload autorizado del expediente para los datos operativos y financieros de un envío. Ruta, conductor, horario, depósito, abonos y saldo sólo se muestran cuando la tarea o la facturación existen y los permisos de la sección lo permiten. La recolección sigue bloqueada hasta completar la entrega de caja vacía.

**Resultado:** Ventas obtiene el contexto necesario desde el resumen; el expediente conserva documentos, auditoría y el detalle documental completo.

### 2026-07-29 — FIN-004: abonos desde la libreta de envíos

**Contexto:** Ventas necesita cobrar depósitos pendientes o registrar abonos posteriores sin abandonar el envío consultado.

**Decisión:** La libreta usa el mismo comando atómico `collect_shipment_invoice_payment` que el cobro de Envios. Todo importe recibido es un único pago aplicado al saldo: el depósito requerido es un umbral dentro de ese pago, no un cobro separado. El saldo real siempre se calcula como `total cotizado − pagos registrados`; nunca se reutiliza el saldo inicial de la cotización, porque ya incluye el supuesto de un depósito previo. El importe debe ser mayor a cero y no puede superar el saldo real; el sistema recalcula saldo, estado de depósito, estado de factura y auditoría. Un excedente no se convierte automáticamente en crédito: se bloquea hasta que exista un flujo independiente y auditable de saldo a favor. El historial visible proviene de `shipment_payments`.

**Resultado:** Los cobros hechos desde la libreta y Envios tienen una sola fuente de verdad y no se crean abonos duplicados ni sobrepagos.

### 2026-08-02 — FIN-004: misma regla de sobrepago en oficina y conductor

**Contexto:** El cobro de conductor elevaba silenciosamente `quotedTotal` con `Math.max(quotedTotal, paid)`, contradiciendo FIN-004.

**Decisión:** Oficina, conductor y `collect_shipment_invoice_payment` rechazan cualquier monto mayor al saldo (`quotedTotal − paid`). El total cotizado no se modifica al cobrar. Ajuste de precio requiere flujo independiente con permiso, motivo y auditoría. SQL es la autoridad final del saldo y de los estados de factura.

**Resultado:** `settleConductorPayment` lanza error ante sobrepago; el RPC recalcula `paid`, saldo y estados con `FOR UPDATE`.

### 2026-07-30 — FIN-004: resumen financiero centrado en abonos

**Contexto:** El resumen de la libreta mostraba `Depósito pendiente` como un dato separado, aunque el importe recibido se registra y audita como un abono aplicado al saldo.

**Decisión:** La libreta muestra `Total del envío`, `Abono` y `Saldo pendiente` como un desglose vertical, además del historial de abonos. El abono usa el importe requerido persistido; no se presenta como un depósito ni como un cobro separado.

**Resultado:** La interfaz no duplica conceptos financieros y conserva el mismo saldo, pagos y auditoría autorizados.

### LOG-004 — Ventanas horarias de entrega y recolección

**Fuente:** usuario que programa la operación en Ventas, Envíos o Logística.

**Consumidores:** tareas logísticas, rutas, seguimiento e historial.

**Reglas:**

- Una programación puede indicar hora exacta, antes de una hora, a partir de una hora o entre dos horas.
- Los límites seleccionados deben conservarse en la tarea; un rango no puede reducirse silenciosamente a su primera hora.
- Cuando las dos horas de un rango se ingresan en orden inverso, el sistema las ordena de menor a mayor.
- La fecha y la modalidad horaria deben mostrarse con lenguaje operativo en los resúmenes e historial.

### INV-001 — Registro de movimientos

**Fuente:** Inventario.

**Consumidores:** stock, historial y auditoría.

**Reglas:**

- Toda entrada, salida o ajuste modifica stock mediante el flujo atómico autorizado.
- Cada operación crea un movimiento de inventario.
- El movimiento conserva cantidad, motivo, detalle, usuario y fecha.
- Una entrada puede conservar proveedor, costo por pieza y costo total del lote.
- Los costos capturados deben mostrarse posteriormente en el historial.
- El motivo manual se elige según el tipo de movimiento:
  - **Entrada:** compra o recepción u otro caso excepcional.
  - **Salida:** salida manual, daño, pérdida, consumo interno u otro.
  - **Ajuste:** conteo físico u otro. Las correcciones por inventario físico no usan Entrada ni Salida.
- No se muestran motivos de un tipo distinto al movimiento que se está registrando.

### INV-002 — Costos de entrada

**Fuente:** entrada de inventario.

**Reglas:**

- El usuario captura costo por lote o costo por pieza.
- El sistema calcula automáticamente el valor complementario.
- Ambos valores representan la misma compra y no son entradas independientes.
- Los costos de compra se capturan y muestran en dólares estadounidenses (USD).
- Los costos no aplican a salidas o ajustes salvo que una regla futura lo establezca expresamente.

### INV-003 — Proveedor de una entrada

**Fuente:** usuario que registra la entrada.

**Destino:** evidencia estructurada del movimiento.

**Reglas:**

- El proveedor pertenece al movimiento de entrada, no al stock acumulado.
- Entradas distintas del mismo artículo pueden tener proveedores diferentes.
- El proveedor debe aparecer en el historial del movimiento.
- Los proveedores usados en entradas anteriores se conservan como tags reutilizables a nivel organización.
- El usuario puede elegir un tag guardado o escribir uno nuevo; al guardar la entrada el tag queda disponible para futuras entradas.

### BOD-001 — Ubicación física del stock agregado

**Fuente:** ubicaciones de bodega administradas desde el módulo Inventario (`warehouse_bins` + `inventory_bin_stock`).

**Consumidor:** tarjetas y filas de `/inventario`.

**Reglas:**

- La ubicación es información operativa visible, no una opción escondida.
- Una tarjeta puede resumir varias ubicaciones.
- Si existen más ubicaciones de las que caben, se muestran las principales y un contador adicional.
- Cambiar o transferir una ubicación actualiza el resumen visible.
- La suma ubicada no puede superar el stock disponible en la bodega.
- Esta regla aplica al stock agregado por SKU. La pantalla `/bodega` pertenece al flujo de cajas llenas (`shipment_packages`) y no es fuente de estas ubicaciones ni de `inventory_stock`.

### 2026-07-27 — BOD-002: dos significados de "Bodega"

**Contexto:** El mapa inicial decía que "Bodega" era la fuente de las ubicaciones de Inventario. Eso mezclaba dos conceptos y podía llevar a conectar `shipment_packages` con `inventory_stock`, que son sistemas separados sin relación en base de datos.

**Decisión:** "Bodega" tiene dos significados que no deben confundirse:

- **Bodega como lugar físico** (`warehouses`): contenedor de stock agregado. Sus ubicaciones internas son `warehouse_bins` + `inventory_bin_stock`, administradas desde `/inventario`.
- **Módulo `/bodega`**: pantalla del flujo de cajas llenas de clientes (`shipment_packages` en estados `warehouse_intake` → `in_warehouse`), junto a `/ingreso-bodega` y `/paletas`.

Una entrada de inventario no crea una recepción de bodega, y una recepción de bodega no aumenta el inventario. No existe clave foránea entre `inventory_items` y `shipment_packages`.

**Resultado:** Las reglas y pantallas deben nombrar la tabla concreta (`inventory_bin_stock` o `shipment_packages`) en lugar de la palabra "Bodega" cuando exista riesgo de ambigüedad.

### COM-001 — Países y precios

**Fuente:** Configuración comercial.

**Consumidores:** Ventas e Inventario.

**Reglas:**

- Los países disponibles en Ventas provienen de la configuración.
- Los precios usados por Ventas provienen del catálogo comercial aplicable.
- Inventario puede relacionar productos con países y precios, pero no debe crear silenciosamente una configuración comercial faltante.

## Comportamiento ante fallos

### Fallo de una dependencia obligatoria

- Se bloquea únicamente la acción que depende de ella.
- Se explica qué configuración falta y dónde resolverla.
- No se sustituye con datos inventados.

### Fallo de una dependencia opcional

- La operación principal puede continuar.
- El dato queda marcado como pendiente.
- Se conserva suficiente contexto para que el módulo responsable complete la operación después.

### Datos obsoletos

- Las configuraciones operativas se consultan al abrir el flujo que las consume.
- Después de una modificación relevante se actualizan los consumidores visibles.
- Un respaldo local nunca debe tener más autoridad que la fuente real.

## Formato para documentar reglas nuevas

Usar el siguiente bloque:

```md
### MOD-000 — Nombre de la regla

**Fuente:** módulo y pantalla responsables.

**Consumidores:** módulos que usan el dato.

**Disparador:** acción que inicia el proceso.

**Reglas:**

- Invariante principal.
- Validaciones.
- Estados permitidos.

**Si falta el dato:**

- Comportamiento esperado.

**Resultado:**

- Datos creados o actualizados.

**Auditoría:**

- Qué historial o evidencia debe conservarse.
```

## Estado del mapa completo (actualizado 2026-07-27)

El mapa funcional detallado vive en `docs/MAPA_FUNCIONAL_ACTUAL.md`. Estado por área:

**Ya documentados en el mapa funcional:**

- Ciclo completo de una venta (flujo A, `create_shipment_sale_atomic`).
- Relación entre venta, factura, pagos y saldo (`shipments` + `shipment_payments`).
- Reserva y descuento de inventario (`inventory_sale_reservations`, `record_inventory_movement_atomic`).
- Entrega y recolección de cajas (tareas, rutas, conductor, intake).
- Creación, asignación y cierre de tareas logísticas.
- Transferencias entre bodegas.
- Inventario asignado a empleados y conductores.
- Reglas de permisos por rol (matriz en la sección 13 del mapa).

**Parcialmente confirmados (con huecos señalados en el mapa):**

- Custodia física de paquetes (`package_custody_events`; auto-eventos desde conductor NO CONFIRMADOS).
- Cancelaciones, reversos y conservación de auditoría (reversos financieros sin UI).
- Precios por país, grupo y entidad (overrides comerciales del módulo agencia sin auditar a fondo).

**Todavía pendientes:**

- Flujo financiero completo entre Boxario, vendedores, agencias y matriz (el motor de partida doble existe en SQL pero no está conectado a la operación diaria).

### 2026-08-02 — LOG-015: publicación explícita de rutas y integridad operativa

**Contexto:** Las rutas se creaban en `draft` sin transición a `planned`, el conductor no podía iniciarlas, se exigía bodega obligatoria, se podían completar tareas sin ruta activa y el cobro no era atómico con el cierre de la tarea.

**Decisión:**

- Logística prepara rutas en `draft` y las publica explícitamente a `planned` (`publish_logistics_route` + `publishLogisticsRouteAction`), con `published_at`/`published_by` y auditoría.
- El conductor no ve rutas `draft`; solo `planned`/`in_progress`/`completed`/`cancelled` asignadas a él.
- `warehouse_id` es opcional; si existe se valida, si no la ruta inicia con GPS del conductor.
- Tarea y ruta deben compartir fecha operativa; un cambio de fecha libera paradas pendientes y deja la tarea sin ruta.
- Completar entrega/recolección requiere ruta `in_progress` (servidor + trigger SQL).
- Excepción administrativa controlada: `admin_complete_logistics_task_exception` con motivo, acuse de riesgo y auditoría inmutable (`logistics_task_admin_exceptions`). No es el flujo normal.
- Modificaciones en ruta activa solo sobre paradas pendientes, con motivo (modal, no `window.prompt`), auditoría y notificación persistente al conductor.
- Máquina de estados central en `logistics-state-machine.ts`, reforzada en SQL.
- RLS de conductor aísla rutas/paradas/tareas/notificaciones; las políticas `FOR ALL` de escritura no participan en SELECT.
- Rollback de inventario por `shipment_id`/`movement_key` o enlace histórico inequívoco (`inventory_shipment_ref_links`); nunca por `ILIKE`/nota parcial.
- Movimientos históricos sin referencia exacta: reporte + backfill solo con código de envío inequívoco; ambiguos quedan en revisión manual.
- Cobro + cierre de tarea atómicos vía `complete_conductor_task_atomic` (idempotente por `client_operation_id`).
- Aceptar custodia actualiza estado físico (p. ej. `handed_to_carrier`); existe cierre de paleta.

**Resultado verificado en DB local (2026-08-02):** `draft → publicar → planned → iniciar (GPS) → in_progress → completar paradas/pagos → completar ruta`, con RLS de dos conductores, RPC atómico, custodia, inventario histórico y notificaciones. Script: `scripts/test-logistics-route-integrity.mjs`.

### 2026-07-26 — LOG-005: horario operativo de la ruta

**Fuente:** Logística → catálogo de rutas semanales.

**Consumidor:** Ventas → programador de entrega o recolección.

**Disparador:** Crear o editar una ruta semanal.

**Reglas:**

- Logística es la única responsable de capturar y actualizar la hora de inicio y la hora de fin estimada de una ruta.
- Ventas consume esas horas como información de solo lectura al seleccionar la ruta.
- La disponibilidad del cliente se conserva como un dato separado y no se reemplaza con el horario operativo de la ruta.
- Si ambos horarios no coinciden, Ventas muestra una advertencia, pero no bloquea la creación de la venta.

**Si falta el dato:**

- Ventas indica que el horario de la ruta está pendiente de configurar por Logística y no inventa un rango.

**Resultado:**

- La expectativa operativa de la ruta queda visible para el vendedor antes de confirmar.
- La solicitud del cliente conserva su modalidad y límites originales para que Logística los revise.

### 2026-07-26 — LOG-006: sugerencias horarias y ventanas de ruta

**Fuente:** Seguimiento → Configuración de ventas para `Exacta`, `Antes de`, `A partir` y `Entre`; Logística → Rutas para validar el horario operativo.

**Consumidores:** Ventas → programador de entrega o recolección.

**Reglas:**

- Las sugerencias de `Exacta`, `Antes de` y `A partir` se configuran por cada día activado en `Logística → Rutas`; los valores anteriores de empresa sólo sirven como respaldo para días que todavía no tienen una personalización.
- Las sugerencias de `Entre` pueden configurarse como rangos por día y servicio; los rangos operativos de las rutas también pueden sumarse como atajos, pero no se reemplaza la autoridad de Rutas sobre el horario real.
- Si el día tiene varias rutas, Ventas puede ofrecer una ventana por cada ruta configurada.
- El horario general se guarda en la configuración semanal del día activado; no crea, cuenta ni lista una plantilla `Ruta del {día}`.
- Cuando el día no tiene subrutas, el propio día es la ruta operativa. Cuando se divide, las plantillas representan exclusivamente sus subrutas.
- Las sugerencias son atajos de captura; no reemplazan el horario operativo de una ruta ni confirman una cita.
- Al elegir una ruta, Ventas muestra si el horario solicitado es compatible, requiere revisión o está pendiente de configurar.

**Si falta el dato:**

- Se usan los valores predeterminados únicamente como atajos iniciales; no se inventa el horario operativo de una ruta.

## Registro de aclaraciones y decisiones

### 2026-07-25 — INV-002: venta permitida sin stock

**Contexto:** En Ventas puede intentarse crear una venta de una caja sin existencia disponible.

**Decisión:** La venta se puede registrar aunque no haya stock suficiente o registrado.

**Reglas:**

- No se reserva ni se descuenta inventario inexistente.
- La venta queda pendiente de inventario o de entrega física.
- El sistema avisa en el centro de Notificaciones (recordatorio `inventory_pending` en bitácora) y con un toast informativo; no fija un banner de stock en el paso Final de la factura.
- Cuando exista stock, la operación posterior de inventario conserva sus controles y auditoría.

### 2026-07-31 — INV-002: aviso de stock en Notificaciones

**Contexto:** El banner ámbar fijo bajo “Invoice creado” competía con el estado de éxito y desaparecía al salir de la venta.

**Decisión:** El faltante de stock se publica como recordatorio pendiente en Notificaciones (campanita), asignado al vendedor, con enlace a Seguimiento. El paso Final solo muestra el invoice listo; los fallos de ruta con Reintentar siguen en esa pantalla.

**Resultado:** El operador ve el pendiente en la campanita hasta atenderlo, sin confundirlo con un error que deshaga la venta.

### 2026-07-26 — LOG-002: programación de fecha primero en dos pasos

**Contexto:** El programador de entregas que comienza por la fecha separaba día, ruta y hora en tres etapas.

**Decisión:** La programación se presenta en dos pasos: `Día y hora`, que reúne día de la semana, fecha y hora, seguido de `Ruta`.

**Reglas:**

- La fecha y hora válidas siguen siendo obligatorias para confirmar una programación.
- La disponibilidad de días y rutas continúa proviniendo del catálogo de Logística.
- La ruta puede conservarse como pendiente cuando el flujo lo permita.
- El cambio de presentación no altera los datos guardados ni la creación de la tarea logística.

### 2026-07-26 — LOG-004: horarios flexibles dentro de Día y hora

**Contexto:** Una entrega o recolección no siempre tiene una hora puntual; el cliente puede indicar un límite o una ventana de disponibilidad.

**Decisión:** El primer paso permite elegir `Exacta`, `Antes de`, `A partir` o `Entre`, y la modalidad elegida se conserva al crear o confirmar la tarea.

**Resultado:** Logística recibe los límites completos de la disponibilidad y puede ordenarlos en la ruta sin asumir una cita exacta.

### 2026-07-26 — SEG-001: Bitácora compartida por envío

**Contexto:** Ventas, Logística, Conductores y Contabilidad generaban información relacionada con el mismo envío en lugares separados.

**Decisión:** Seguimiento es el punto común del envío y presenta una sola Bitácora que combina entradas manuales con eventos automáticos.

**Reglas:**

- Las categorías iniciales son Cliente, Venta, Logística, Cobro y Nota general.
- Una entrada manual requiere texto o recordatorio; ambos pueden coexistir.
- El autor puede editar o eliminar su entrada. El encargado del eje puede intervenir las entradas de su área.
- Editar conserva antes, después, actor y fecha en `activity_history`.
- Eliminar exige una razón, usa borrado lógico y cancela el recordatorio pendiente.
- Los resultados del conductor y demás eventos automáticos son inmutables.
- Una falla del conductor genera un solo evento con motivo, nota, evidencia y el próximo paso `Reprogramar con Logística`.
- Ese evento se registra en `activity_history` (`shipment.logistics_task_failed`) y la Bitácora lo muestra como entrada de sistema; no se escriben fallas ni seguimientos nuevos en `shipment_contact_logs` (tabla legacy de solo lectura).
- Conductores sólo ven la información operativa de sus tareas y sus propios resultados; las notas comerciales y financieras siguen siendo internas.

### 2026-07-26 — FIN-003: cargos logísticos adicionales opcionales

**Contexto:** Entregar o recoger normalmente forma parte del envío, pero algunas operaciones necesitan un cargo excepcional.

**Decisión:** La empresa mantiene importes sugeridos independientes para entrega y recolección. El cargo comienza desactivado y Ventas decide si aplica cada cargo cuando participa un conductor. (Hoy esos importes se administran en `Configuración → Costos → Operativos`; la regla no depende de esa ubicación de interfaz.)

**Reglas:**

- El cargo se aplica una vez por servicio y nunca por caja ni por país.
- Si Ventas usa la sugerencia no necesita explicación.
- Si modifica el importe, la razón es obligatoria.
- El servidor vuelve a cargar la sugerencia, valida la razón y recalcula total, depósito y saldo.
- Se conservan sugerencia, importe aplicado, razón, vendedor y fecha.
- La venta normal y la venta rápida usan la misma validación.
- El envío muestra `Cargo logístico adicional` y `Tarifa ajustada` cuando corresponde.

### 2026-07-27 — INV-002: costos de entrada en USD

**Contexto:** En la entrada de inventario el campo de costo no indicaba la moneda y podía confundirse.

**Decisión:** Los costos de compra de una entrada se capturan y presentan en dólares estadounidenses (USD).

**Resultado:** La UI muestra `Costo (USD)` con prefijo `$`; el historial ya formatea esos montos como USD.

### 2026-07-27 — INV-003: proveedores como tags reutilizables

**Contexto:** En entradas de inventario el proveedor se escribía cada vez desde cero.

**Decisión:** Los proveedores usados en entradas previas se muestran como tags clicables; el usuario puede elegir uno o escribir uno nuevo.

**Resultado:** La colección se arma con los proveedores guardados en entradas anteriores de la organización y se reutiliza en nuevas entradas.

### 2026-07-27 — INV-001: motivos manuales por tipo de movimiento

**Contexto:** El formulario de entrada mostraba motivos de salida y ajuste, lo que confundía al usuario.

**Decisión:** Cada movimiento manual solo ofrece motivos válidos para su caso de uso.

**Resultado:** Entrada, salida y ajuste tienen listas distintas; el servidor normaliza motivos inválidos al valor por defecto del tipo.

### 2026-07-27 — INV-001: conteo físico solo en ajuste

**Contexto:** "Conteo físico" aparecía como motivo de Entrada, pero corregir stock tras inventario físico es un ajuste, no una compra.

**Decisión:** El conteo físico vive únicamente en Ajuste. Entrada queda para compra, recepción u otro caso excepcional.

**Resultado:** Si el usuario encontró más o menos piezas de las registradas, debe usar Ajuste con motivo Conteo físico.

### 2026-07-28 — INV-004: disponibles, archivo y precisión de formularios

**Contexto:** Las tarjetas de inventario mostraban la unidad (`piezas`) en lugar del estado operativo (`disponibles`), y Borrar un artículo con historial rompía la expectativa de auditoría.

**Decisión:**

- La tarjeta y el menú contextual muestran `disponibles` y, si aplica, desglose de reservadas/asignadas.
- Artículos con historial se archivan en el árbol (`archived: true`); sin historial se eliminan del catálogo.
- Ajuste captura cantidad real contada (no delta) y el botón dice `Guardar ajuste`.
- Salida se deshabilita sin stock y muestra vista previa antes de guardar.
- `Precios de venta` solo aparece en artículos comerciales o vinculados al catálogo de precios.

**Resultado:** La interfaz refleja stock operativo, conserva trazabilidad y separa operaciones frecuentes de administración.

### 2026-07-29 — EXP-001: Expediente del envío

**Fuente:** `shipments` y sus entidades relacionadas (`shipment_packages`, `shipment_payments`, `shipment_logistics_tasks`, `activity_history`, `logistics_route_stops`).

**Consumidores:** Ventas (libreta `Último envío`), Seguimiento (acceso `Ver expediente`), consulta documental e impresión.

**Reglas:**

- El expediente es una superficie documental y de consulta; no sustituye Seguimiento ni crea otra fuente de estados operativos.
- Los documentos históricos del invoice usan la instantánea persistida en `shipments.logistics_plan.billing` y los datos capturados en la venta. Los precios o promociones comerciales actuales no reescriben invoices anteriores.
- Cada documento de caja corresponde a un registro real de `shipment_packages`; no se generan etiquetas para cajas inexistentes.
- El remitente conserva `customer_name` de la venta; no existe instantánea histórica completa del remitente. Si solo hay referencia al contacto actual (`customers`), el expediente lo documenta sin reconstruir datos ausentes.
- El destinatario prioriza `recipient_snapshot`; si no existe, puede mostrar el contacto actual vinculado y debe indicarlo explícitamente.
- `shipment_packages` (cajas llenas del envío) y `inventory_stock` (stock agregado de cajas vacías) son sistemas distintos y no deben mezclarse en el expediente.
- La Bitácora (`shipment_journal_entries`) permanece en Seguimiento. La auditoría (`activity_history`) vive en el expediente y no debe copiar indiscriminadamente entradas de bitácora.
- Los permisos de cada sección (finanzas, logística, cajas, auditoría) se resuelven en el servidor; ocultar una sección en la interfaz no basta si el payload sigue enviando datos no autorizados.
- El acceso al expediente respeta `shipmentVisibilityScope` y `organization_id`; un envío de otra organización o fuera del alcance del usuario no puede abrirse.

**Si falta el dato:**

- Mostrar el texto operativo ya usado en el proyecto (`Pendiente de asignar`, `Conductor no asignado`, `Sin horario configurado`) o una nota explícita de dato no persistido; no inventar códigos, tracking, QR ni instantáneas.

**Resultado:**

- `/seguimiento/[shipmentId]/expediente` concentra contexto, documentos, cajas, finanzas consultivas, logística y auditoría del envío seleccionado.

**Auditoría:**

- La sección Auditoría del expediente lee `activity_history` filtrado por `entity_type = 'shipment'` y `entity_id = shipmentId`, en orden cronológico de consulta.

### 2026-07-29 — EXP-002: estado del abono en el expediente

**Fuente:** `shipments.paid` y la instantánea histórica `shipments.logistics_plan.billing`.

**Consumidor:** encabezado y sección Finanzas del Expediente del envío.

**Reglas:**

- El abono requerido proviene de `billing.depositRequired` cuando esa instantánea existe.
- El estado del abono se calcula contra el importe efectivamente pagado persistido en el envío; `Cubierto` sólo aparece cuando el pago acumulado alcanza el abono requerido.
- Si no existe instantánea histórica de facturación, el expediente muestra que no puede confirmar el estado del abono y no infiere un importe.
- Los enlaces de mapa se construyen únicamente a partir de los campos de dirección ya autorizados y visibles; abrirlos no altera el envío ni crea ubicación nueva.

### 2026-07-30 — LOG-011: el día es la ruta cuando no hay subrutas

**Contexto:** El programador pedía confirmar una ruta después de elegir domingo aunque ese día no tenía subrutas configuradas.

**Decisión:** Un día habilitado sin plantillas de subruta es por sí mismo la ruta operativa. La fecha elegida determina el día y no queda una segunda decisión de ruta pendiente.

**Resultado:** El flujo confirma día, fecha y hora usando la ruta implícita del día. El paso de ruta y la opción para dejarla pendiente sólo existen cuando el día tiene subrutas con nombre entre las cuales elegir.

### 2026-07-30 — FIN-004: venta sin abono inicial

**Contexto:** La factura permitía capturar un abono, pero el modal final volvía a preguntar si el depósito había sido pagado.

**Decisión:** La factura es la fuente de verdad del abono inicial. Ventas puede marcar `Sin abono inicial`; en ese caso se persiste pago `$0`, no se registra método de pago y el saldo pendiente equivale al total completo.

**Resultado:** Si el abono es mayor que cero, el cierre sólo solicita el método con el que se recibió. Si es cero, el cierre no pregunta por depósito ni método y crea el invoice abierto por el total.

### 2026-07-30 — DEMO-001: forma del catálogo demo SCGS

**Contexto:** Tras vaciar la org SCGS hacía falta un conjunto de datos reproducible para volver a operar. Los seeds estaban desalineados entre sí: cada uno declaraba sus propias medidas de caja y apuntaban a un ID de organización que ya no existe.

**Fuente única:** `scripts/lib/scgs-demo-recipients.mjs` define países, medidas de caja con precio y costo base, y las plantillas de destinatarios. `resolveScgsOrgId` localiza la org por `SCGS_ORG_ID`, por el ID histórico o por el slug `scgs`.

**Forma del conjunto:** 10 medidas de caja en la categoría `cajas`, 5 países, precio y costo por caja en cada país, 5 remitentes y un destinatario por país para cada remitente (25 en total). `npm run db:seed:scgs-demo` produce exactamente eso y es idempotente: repetirlo no duplica filas.

**Precio por país:** cada país tiene un `priceFactor` que multiplica el precio y el costo base de la caja, para que los destinos lejanos no queden con la misma tarifa que México.

**Dependencias que hay que respetar:**

- `customer_recipients.country_id` es obligatorio (`customer_recipients_country_required`). Todo destinatario nuevo debe resolver el país contra `pricing_countries` de la misma org; el nombre de país en texto no basta.
- `pricing_country_boxes.catalog_key` debe coincidir con `categoría|kind|subcategoría` normalizado del ítem de inventario, o el producto no se enlaza con el catálogo en Configuración.
- Sembrar un país sin precios deja destinatarios sin producto vendible; los países del catálogo demo y los de las plantillas de destinatarios se mantienen en la misma lista.

**Stock:** los seeds crean las filas de `inventory_stock` en cero. El stock inicial se captura desde Inventario, no se inventa en el seed.

### 2026-07-31 — LOG-012: elegir un día en venta no exige geo del remitente

**Contexto:** Al confirmar una venta con día/ruta (p. ej. Jueves), el invoice se creaba pero fallaba el envío a Logística con un aviso genérico. Los remitentes demo no tenían lat/lng, y el request bloqueaba toda asignación sin geo.

**Decisión:**

- Si el día es la ruta (`dayAsRoute`), Ventas asigna la ruta operativa aunque el remitente no tenga coordenadas.
- Si hay subruta con nombre y el remitente no está verificado (o no tiene geo), la solicitud queda `pending_approval` en Logística; no se tumba la venta.
- La geo sigue siendo obligatoria para autoaceptar por zona verificada y para aprobar/cambiar ruta en Logística.
- Confirmar programación desde Ventas no filtra por el “paso logístico actual”, para poder preasignar entrega y recolección.

**Resultado:** Elegir Jueves (u otro día habilitado) deja la factura y la ruta en Logística sin exigir coordenadas al momento de vender.

### 2026-07-31 — LOG-013: sugerencias horarias por día de ruta

> **Vigencia:** esta regla queda reemplazada para las sugerencias que ve Ventas por LOG-014 (2026-08-01). La configuración de Rutas conserva únicamente la autoridad sobre el horario operativo de cada ruta.

**Contexto:** `Exacta`, `Antes de` y `A partir` se administraban como una lista global, aunque el calendario operativo y las rutas se activan por día.

**Decisión:** Las sugerencias se guardan con alcance de día dentro de `organization_route_settings.schedule_suggestions.byWeekday`, usando los mismos índices semanales de Rutas (`lunes = 0` … `domingo = 6`). Ventas sólo permite editar los días activos en `Logística → Rutas` y usa la configuración del día seleccionado. Desactivar un día lo quita de la edición y de la disponibilidad, pero conserva sus sugerencias para si se vuelve a activar.

**Reglas:**

- La activación de días sigue siendo exclusiva de `Logística → Rutas`; Ventas no crea ni modifica días.
- Si un día activo todavía no tiene una personalización, se muestran los valores heredados de la configuración anterior o los predeterminados hasta que se guarden los del día.
- Cada día tiene una sola configuración de sugerencias compartida por entrega y recolección; puede activar sólo las modalidades que realmente acepta (`Exacta`, `Antes de`, `A partir` y/o `Entre`).
- Desactivar una modalidad la oculta de la captura, pero conserva sus horas guardadas para poder activarla otra vez sin reconfigurarlas.
- Una lista de horas vacía guardada de forma explícita significa “sin atajos” para esa modalidad; no se rellena otra vez con valores predeterminados y el resto del flujo continúa disponible.
- `Entre` se administra con rangos configurables; los rangos de Rutas continúan disponibles como referencia operativa del día.

**Resultado:** Lunes, martes y los demás días pueden ofrecer atajos distintos sin duplicar el calendario de rutas ni confundir la sugerencia del cliente con el horario operativo.

### 2026-08-01 — LOG-014: horario de ruta separado de preferencia del cliente

**Contexto:** Logística estaba administrando listas de horas que después aparecían en Ventas como si fueran horarios sugeridos para todos los clientes. Eso mezcla la operación de una ruta con el hábito particular de cada cliente.

**Decisión:**

- `Logística → Rutas` es responsable únicamente del horario operativo de cada ruta: hora de inicio y fin estimado de la ruta o subruta.
- Logística no administra un catálogo global de horas para que Ventas lo ofrezca a los clientes.
- Ventas puede capturar una preferencia opcional del cliente/remitente, como `Exacta`, `Antes de`, `A partir` o `Entre`. Esa preferencia no confirma una cita, no cambia el horario de la ruta y no debe enviarse al conductor como hora asignada.
- Las sugerencias de Ventas se obtienen del historial confirmado o completado del mismo cliente y del mismo tipo de operación. Si el cliente ya tuvo una recolección a las 10:00 AM, esa hora puede volver a aparecer como primera sugerencia en una recolección posterior.
- Si no existe historial válido, Ventas no inventa horas ni muestra las antiguas sugerencias globales como disponibilidad.
- Logística conserva la autoridad para definir posteriormente el horario confirmado, que es el único que organiza la ruta y llega al conductor.

**Si falta el dato:**

- Sin historial del cliente, la preferencia queda vacía y el vendedor puede continuar sin hora solicitada.
- Sin horario operativo de la ruta, Ventas muestra que está pendiente de configurar por Logística; no presenta la preferencia del cliente como horario confirmado.

**Resultado:** Ventas aprende hábitos reales por cliente sin convertirlos en reglas generales, mientras Logística conserva el control exclusivo de la operación de las rutas.

### 2026-07-31 — SEG-003: depuración limpia de envíos/inbounds en seguimiento

**Contexto:** Se solicitó eliminar todos los envíos / inbounds en seguimiento (`/seguimiento`) sin borrar los catálogos de remitentes (`customers`) ni destinatarios (`customer_recipients`).

**Decisión:** Se creó y ejecutó la rutina de depuración atómica `scripts/delete-tracking-shipments.mjs`. Esta rutina elimina en orden de dependencia todas las operaciones de venta, registros de tareas logísticas, custodias, paquetes físicos, cobros y los envíos en seguimiento (`public.shipments`), deshabilitando temporalmente triggers inmutables para el wipe operativo.

**Resultado:** El total de envíos en seguimiento pasó a 0, mientras que los 5 remitentes y 25 destinatarios permanecieron 100% intactos en la base de datos.
