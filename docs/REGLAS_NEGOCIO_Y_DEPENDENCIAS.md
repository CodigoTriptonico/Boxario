# Reglas de negocio y dependencias de Boxario

### 2026-08-13 - LOG-065: cobertura única por ciudad/zona y propuestas fuera de cobertura

**Contexto:** Ventas podía interpretar una única ruta operativamente disponible como coincidencia geográfica y el catálogo todavía conservaba una modalidad separada por ZIP. Además, cuando ninguna ruta cubría la dirección, el vendedor solo podía dejar la ruta vacía.

**Decisión:** La única cobertura geográfica vigente de una ruta es la configurada por ciudad/zona (`places`). Las definiciones que aún guardaban `postal_codes` pasan a `day_only` y deben configurar sus zonas; no existe una categoría visible de rutas nuevas, antiguas o heredadas. Una ruta se sugiere automáticamente únicamente cuando la dirección coincide con su cobertura de ciudad/zona y esa es la única coincidencia geográfica disponible. Día, horario y capacidad determinan qué rutas son seleccionables, pero nunca prueban cobertura por sí solos.

Si ninguna cobertura coincide, Ventas puede elegir manualmente cualquier ruta activa y disponible de ese día. La solicitud conserva `coverage_status = outside`, siempre queda `pending_approval` y Logística ve una advertencia explícita antes de confirmarla. Confirmar esa solicitud constituye la verificación humana de la excepción para la dirección exacta; no crea todavía el recorrido operativo.

**Resultado:** El sistema no autoselecciona por mera disponibilidad, no presenta rutas por ZIP y permite proponer excepciones sin ocultar a Logística que el invoice queda fuera de la cobertura configurada.

### 2026-08-13 - VEN-COB-004: ninguna venta se registra sin stock suficiente

**Contexto:** La regla anterior `INV-002` permitía crear el invoice aunque no hubiera existencia y dejarlo pendiente de inventario. Se decidió eliminar por completo esa excepción.

**Decisión:** Venta solo puede confirmar un invoice cuando existe stock disponible suficiente para todas las cajas y cantidades solicitadas. La validación final se ejecuta en el servidor y el RPC vuelve a comprobarla de forma atómica al reservar o descontar, para cubrir cambios concurrentes de inventario.

**Reglas:**

- Una caja sin fila de stock, con disponibilidad cero o con disponibilidad menor que la cantidad solicitada bloquea la venta completa.
- No se crea invoice, tarea logística, reserva de ruta, pago ni recordatorio `inventory_pending` cuando falla esta validación.
- El formulario conserva los datos y muestra un error recuperable para corregir cantidades o esperar una entrada de inventario.
- Esta decisión reemplaza `INV-002: venta permitida sin stock` del 2026-07-25 y su aviso en Notificaciones del 2026-07-31. Los recordatorios históricos ya existentes se conservan como auditoría, pero no se generan nuevos.

**Resultado:** No existen ventas nuevas pendientes de inventario; toda venta confirmada tiene su stock reservado o descontado dentro de la misma operación atómica.

### 2026-08-13 - VEN-COB-003: el selector de Venta muestra cajas agotadas bloqueadas

**Contexto:** El catálogo de Venta mostraba cajas con disponibilidad cero y las marcaba como `SIN STOCK`, pero ocultarlas impedía al vendedor conocer todas las medidas configuradas.

**Decisión:** El selector de cajas muestra todo el catálogo configurado, usando la disponibilidad agregada de `inventory_stock` menos reservas. Las cajas con disponibilidad cero, o sin una fila de stock asociada, aparecen atenuadas y bloqueadas: no aceptan clic, clic derecho ni selección de teclado.

**Regla:** La UI solo presenta una vista del stock; la autoridad y las validaciones finales de inventario continúan en el servidor/RPC. Esta decisión no convierte el catálogo de precios en stock ni permite inventar disponibilidad.

**Resultado:** Venta conserva visible el catálogo completo, distingue las cajas agotadas y solo permite seleccionar cajas con existencia disponible.

### 2026-08-12 - VEN-EDIT-001: el expediente edita envíos solo antes de la confirmación logística

**Contexto:** El expediente del envío mostraba datos comerciales y operativos, pero no ofrecía una forma controlada de corregirlos. Una corrección de dirección antes de la aprobación podía dejar una solicitud de ruta con una instantánea obsoleta.

**Decisión:** Ventas puede editar desde el expediente los datos de contacto, dirección, país, carrier y notas mientras el envío no haya sido confirmado por Logística. La edición no permite alterar directamente pagos, cajas físicas ni una ruta ya confirmada. Si cambia la dirección con una solicitud todavía pendiente, esa solicitud vuelve a `deferred`, la tarea queda pendiente y Logística debe volver a evaluar la ruta.

**Reglas:**

- Un envío con tarea confirmada, solicitud `template_confirmed`/`routed`, parada operativa o avance físico queda bloqueado para edición comercial.
- La escritura actualiza el contacto vinculado y la instantánea del destinatario del envío, conserva auditoría y limpia la validación geográfica cuando se captura una nueva dirección manual.
- La edición no cambia silenciosamente una ruta operativa ni un pago ya registrado.

**Resultado:** El vendedor puede corregir el envío desde su expediente antes de la confirmación, y cualquier cambio de dirección pendiente vuelve explícitamente al circuito de evaluación logística.

### 2026-08-12 — GEO-001: dirección geocodificada y entrada exacta son datos distintos

**Contexto:** Al registrar un remitente o destinatario, el operador necesita mostrar el mapa al cliente y señalar la casa, portón o entrada exacta para que Logística y el conductor no dependan únicamente del punto aproximado devuelto por la dirección.

**Decisión:** Conservar dos ubicaciones independientes:

- **Ubicación de la dirección:** `place_id`, dirección formateada y coordenadas obtenidas al validar la dirección con Google. Prueba dónde ubica Google el domicilio escrito, pero no afirma cuál es la entrada correcta.
- **Entrada exacta confirmada:** segundo par `lat/lng`, colocado manualmente en el mapa y confirmado de forma explícita por el operador con el cliente. Es opcional, registra su estado/fecha de confirmación y nunca sustituye ni reescribe la dirección postal.

Cuando existe una entrada exacta confirmada, las nuevas tareas y paradas logísticas la usan como destino de navegación y conservan también la coordenada de la dirección como referencia. Sin confirmación, se usa la coordenada geocodificada actual. Una ruta ya creada conserva su instantánea; editar después el contacto no cambia silenciosamente una ruta operativa existente.

**Resultado:** Boxario distingue precisión postal de precisión operativa, evita presentar una geocodificación aproximada como casa confirmada y entrega al conductor una referencia estable y auditable.

### 2026-08-12 — LOG-064: nuevas coberturas sin selección por ZIP

**Contexto:** El editor de subrutas todavía ofrecía `Por ZIP (legado)` junto a la cobertura vigente por ciudad o zona.

**Decisión:** Las subrutas configuradas desde la interfaz solo pueden elegir `Por día y aprobación` o `Por ciudad / zona`. El modo `postal_codes` se conserva internamente para leer y migrar registros antiguos, pero no puede seleccionarse nuevamente; una ruta antigua lo identifica como `Cobertura heredada` hasta que se cambie a un modo vigente.

**Resultado:** El selector deja de promover una modalidad obsoleta sin invalidar ni ocultar datos históricos existentes.

### 2026-08-12 — LOG-063: Ventas propone; Logística confirma

**Contexto:** Una venta cuya dirección coincidía con la cobertura de una ruta pasaba directamente a `Preparación`, omitiendo `Por confirmar`.

**Decisión:** Toda solicitud originada en Ventas se crea como `pending_approval` y aparece en `Por confirmar`, incluso cuando ya superó cobertura, horario y capacidad. Esas validaciones autorizan a proponer la ruta, pero no sustituyen la confirmación operativa. Solo una acción ejecutada por Logística con `confirmImmediately` crea `template_confirmed` y la envía directamente a `Preparación`.

**Resultado:** El flujo queda `Venta → Por confirmar → Preparación → Ruta`; una coincidencia geográfica nunca salta la aprobación humana de Logística.

### 2026-08-12 — LOG-062: “solicitada” exige una solicitud logística real

**Contexto:** Seguimiento mostraba `Entrega solicitada para el lunes` con solo encontrar una tarea programada, aunque el alta en `customer_route_assignment_requests` hubiera fallado y Logística no tuviera nada que mostrar.

**Decisión:** Una etapa se llama `solicitada` únicamente cuando la tarea tiene una solicitud activa en Plantillas o ya pertenece a una ruta operativa. Una tarea sin esos vínculos se muestra como `Entrega pendiente` o `Recolección pendiente`, aunque conserve fecha para poder reintentarse sin perder el compromiso.

**Resultado:** Seguimiento y Logística ya no se contradicen; el texto solicitado prueba que existe el puente persistido hacia Logística.

### 2026-08-12 — VEN-COB-002: número autoritativo y fallo parcial de ruta

**Contexto:** Una venta nueva podía previsualizar `INV-000001` aunque ese invoice ya existiera. Al confirmar, el servidor asignaba correctamente `INV-000002`, pero un fallo posterior de la solicitud logística hacía parecer que también había fallado la creación.

**Decisión:** `organization_invoice_counters` es la fuente de verdad de la secuencia. La venta precarga como vista previa el siguiente valor del contador y el número definitivo sigue asignándose atómicamente al confirmar. Una vez creado el shipment, un fallo de ruta es un pendiente recuperable separado: nunca revierte ni duplica el invoice y se completa con el reintento de esa tarea.

**Resultado:** La previsualización ya no empieza otra vez en `000001`; el usuario distingue invoice guardado de ruta pendiente y el reintento actúa sobre el mismo shipment.

### 2026-08-11 — LOG-061b: ciudad completa muestra zonas hijas prendidas

**Contexto:** Al abrir el desglose de Santa Clarita en `root_whole`, los checkboxes salían apagados y parecía que no había cobertura.

**Decisión:** Con `root_whole`, la UI marca **todas** las zonas listadas como prendidas (la ciudad completa las incluye). Al apagar una, se pasa a `root_partial` materializando el resto. Si el operador vuelve a marcar todas las listadas, se colapsa otra vez a `root_whole`.

**Resultado:** Abrir una ciudad completa ya no muestra un listado vacío de selección; el desglose refleja la cobertura real.

### 2026-08-10 — LOG-061: cobertura jerárquica ciudad → zonas

**Contexto:** Marcar rutas solo con ZIP/ZCTA era impreciso para operar (una ciudad mezcla barrios; un barrio cruza varios ZIP). El operador piensa en Santa Clarita y, si hace falta, en Valencia/Saugus/etc.

**Decisión:** `coverage_mode` admite `day_only | postal_codes | places`. En `places`, cada ruta guarda raíces (ciudad) como `root_whole` o, al desglosar, `root_partial` con hijos `child_included`. Ciudad sin desglose = toda la ciudad; con desglose = solo las zonas marcadas. El matching usa `place_id`, ciudad/barrio normalizados y, si hay, bounds cacheados. El mapa puede mostrar frontera Census TIGER de la ciudad (visual); eso no cambia el matching ni sustituye la lista. `postal_codes` permanece como legado. Vacío de lugares en el día-ruta equivale a `day_only`. Migración `205_route_coverage_places.sql` (+ `207` cache de geometría Census).

**Resultado:** Programar desde LogÃ­stica valida cobertura por lugares y puede confirmar directamente. Una propuesta originada en Ventas siempre queda `pending_approval`, tanto con `places` como con ZIP legado, según LOG-063.

### 2026-08-10 — LOG-060: el día es la ruta hasta que existan subrutas

**Contexto:** Activar un día debe quedar guardado de inmediato. Mientras no haya divisiones nombradas, ese día es la ruta. Al crear subrutas (p. ej. norte y sur), el horario del día deja de aplicar y cada subruta usa el suyo. La cobertura geográfica (lugares o ZIP legado) también aplica a esa ruta del día.

**Decisión:** El switch maestro llama `activate_logistics_route_weekday` al encender (horario por defecto `10:00` / fin abierto, o el ya guardado) y `set_logistics_route_weekday_enabled(false)` al apagar. El horario se edita después en la pastilla. Se persiste en `logistics_weekday_defaults` y en el horario de la definición `is_system_general`. Si el día tiene al menos una subruta activa ese weekday, el horario system-general queda `is_active = false`. Al archivar la última subruta del día, se reactiva. La UI oculta el horario general cuando hay subrutas. Mientras el día sea la ruta, su cobertura se edita con ciudades/zonas (modo `places`); sin lugares queda `day_only`. Los ZIP solo aparecen como legado. `delivery_days` es la fuente de verdad; `pickup_days` solo se sincroniza para igualarla. Nunca se rehidratan días desde `pickup_days` cuando `delivery_days` queda vacío (eso reactivaba lunes/jueves al apagar el domingo).

**Resultado:** Un jueves activado sobrevive al recargar; con tres subrutas, solo cuentan los tres horarios/coberturas nombrados. `pickup_days` se alinea con `delivery_days` y nunca se usa para reactivar días ya apagados.

### 2026-08-10 — LOG-059: retiro del cierre global y fechas especiales

**Contexto:** El panel `Reservas y fechas especiales` y el cierre del día anterior (global o por ruta) complicaban el calendario y ya no reflejan cómo quiere operar Logística.

**Decisión:** Eliminar por completo el cierre de reservas del día anterior, las fechas especiales, la herencia de cutoff, el cierre automático por cron y los triggers `ROUTE_ALREADY_CLOSED`. Agregar cajas a una ruta sigue sujeto a capacidad, cobertura postal, día habilitado y horario operativo. El cierre de una ruta preparada queda solo como acción manual del operador (`Confirmar ruta` / `Cerrar ruta`).

**Compatibilidad:** Esta decisión reemplaza las reglas temporales de LOG-016 (parte de reservas/excepciones), LOG-018, LOG-020, LOG-021 y la parte automática de LOG-031. LOG-019 conserva el fin abierto; ya no menciona cutoff. Migración `204_remove_route_booking_cutoff.sql`.

**Resultado:** El calendario de rutas muestra solo días, horarios, capacidad y cobertura. No existe “Sin cierre global” ni bloqueo por hora del día anterior.

### 2026-08-10 — LOG-058: reordenamiento actualiza únicamente la secuencia

**Contexto:** Reordenar una ruta cerrada fallaba porque la escritura reutilizaba un `upsert` parcial de las paradas. La tabla valida que cada parada provenga de una tarea o visita de agencia, y esa validación de inserción ocurría aunque el registro ya existiera.

**Decisión:** Cambiar el orden ejecuta una operación atómica dedicada que bloquea la ruta, vuelve a validar organización, permiso, estado `draft` o `planned` y que la lista recibida sea exactamente el conjunto de paradas activas. La operación modifica solamente `stop_order` y `updated_at`; no reinserta paradas ni altera su fuente, dirección, tarea, visita, resultado o estado. La bitácora y la notificación al conductor asignado se escriben en la misma transacción.

**Resultado:** Mover una parada antes de iniciar ya no activa validaciones de alta ni puede dejar una secuencia parcial. Si otra operación cambió la ruta, toda la transacción se revierte y el usuario recibe una indicación para recargar.

### 2026-08-10 — LOG-057: mapa del recorrido respeta el orden operativo

**Contexto:** Logística necesita comprobar visualmente cómo quedan las paradas de una ruta y abrir el recorrido en Google Maps, especialmente después de cambiar su secuencia.

**Decisión:** El mapa de una ruta usa como origen la primera parada con coordenadas, como destino la última y como puntos intermedios las demás, conservando exactamente el `stop_order` vigente. El mapa nunca optimiza ni persiste un orden distinto por sí mismo. Cambiar el orden desde la lista actualiza los números, marcadores y trazado. Las paradas sin coordenadas siguen visibles en la lista y se identifican como ausentes del mapa; no se inventan ubicaciones.

**Alcance:** Mientras no exista una base operativa configurada, el recorrido representa únicamente el trayecto entre paradas. No supone salida desde almacén ni regreso a él. La lista y `logistics_route_stops.stop_order` siguen siendo la fuente de verdad; el mapa y el enlace externo son visualizaciones degradables.

**Resultado:** El operador puede comparar lista y recorrido, reordenar antes de salir y abrir en Google Maps las paradas con geolocalización válida sin que un proveedor externo modifique la ruta guardada.

### 2026-08-10 — LOG-056: reordenar paradas después de cerrar y antes de salir

**Contexto:** Confirmar la preparación crea la ruta directamente como `planned` (`Cerrada`), pero esa transición ocultaba los controles de orden y obligaba a aceptar la secuencia inicial aunque el recorrido todavía no hubiera comenzado.

**Decisión:** Una ruta `draft` o `planned` permite cambiar el orden de todas sus paradas activas. En `planned` el cambio solo modifica `stop_order`: no reabre la ruta, no permite agregar ni quitar cajas y no altera conductor, vehículo, fecha ni estado. `in_progress` conserva el flujo excepcional con motivo para paradas pendientes; `completed` y `cancelled` permanecen inmutables.

**Resultado:** Logística puede corregir la secuencia después de confirmar la ruta y antes de iniciar el recorrido. El servidor vuelve a validar que la lista contenga exactamente las paradas activas y registra el orden anterior y el nuevo en la actividad; si ya hay conductor, también genera la notificación de cambio. Esta decisión reemplaza únicamente la prohibición de reordenar en `planned` de LOG-032 y LOG-025; las altas y bajas continúan bloqueadas.

### 2026-08-09 — LOG-055: confirmar Preparación deja la ruta operativa

**Contexto:** Después de revisar un grupo en `Preparación`, la acción lo enviaba a `Rutas` como una instancia `draft` y volvía a mostrar `En preparación`. Esto repetía una etapa que el operador ya había confirmado y exigía un segundo cierre manual.

**Decisión:** Confirmar un grupo en `Preparación` crea la instancia fechada y la cierra como `planned` dentro de una sola transacción. Si falla cualquier validación de cierre —al menos una parada, ubicación válida o fecha confirmada y coincidente— no se crea ni se publica una ruta parcial; el grupo permanece en `Preparación` con el error correspondiente. Los reintentos con la misma clave son idempotentes y devuelven la misma ruta cerrada.

**Compatibilidad:** Las rutas `draft` ya creadas por el flujo anterior se pasan a `planned` únicamente cuando cumplen todas las validaciones, incluso si un dato histórico o de demostración ya no conserva la reserva que las originó. Los borradores incompletos permanecen visibles para corrección y cierre seguro.

**Resultado:** Al pasar de `Preparación` a `Rutas`, el recorrido aparece cerrado/operativo y nunca vuelve a comunicar `En preparación`. Esta decisión reemplaza el segundo cierre manual y el estado `draft` descritos en LOG-032, LOG-049, LOG-025, LOG-053 y LOG-054 para rutas creadas desde grupos confirmados. Si queda una selección parcial, las solicitudes restantes permanecen en `Preparación` y se incorporan mediante `Actualizar ruta`, conservando `planned` antes y después de la actualización. Los borradores excepcionales conservan el cierre manual.

### 2026-08-09 — INV-005: clases de inventario y mercancía de clientes

**Contexto:** Inventario necesita distinguir material consumible, productos vendidos, bienes reutilizables y activos sin mezclar la mercancía que Boxario transporta para sus clientes.

**Decisión:** `inventory_items.inventory_class` clasifica el inventario propio como `consumable`, `sellable`, `reusable` o `asset`. `is_commercial` continúa indicando si el artículo participa en el catálogo de venta y no reemplaza su clase. Los paquetes de clientes permanecen en `shipment_packages` y sus flujos de custodia; nunca se convierten en existencias propias de `inventory_stock`.

**Reglas:**

- El stock mínimo y máximo pertenecen a la combinación artículo/bodega.
- SKU, código de barras, descripción y proveedor habitual describen el artículo; el proveedor capturado en una entrada conserva además la evidencia histórica de esa compra.
- Marcar que un artículo requiere serie, lote o vencimiento declara su política de trazabilidad; no autoriza inventar identificadores ni considerar completa una recepción que requiera esos datos.
- Cambiar cantidad o ubicación debe conservar responsable y trazabilidad. Los traslados entre estantes se ejecutan en una sola transacción para no dejar el stock dividido a medias.

**Resultado:** la ficha comunica qué administra la empresa y qué controles necesita, mientras la mercancía de clientes sigue separada y la autoridad de cantidades permanece en movimientos/RPC.

## Propósito

Este documento registra la lógica que conecta los módulos de Boxario. Su objetivo es convertirse gradualmente en el mapa funcional completo de la empresa y del sistema.

Una regla de negocio debe indicar:

- Quién es la fuente de verdad.
- Qué módulos consumen el dato.
- Qué condición nunca debe romperse.
- Qué debe ocurrir cuando el dato no existe o no puede cargarse.

### 2026-08-07 — LOG-048: la fecha de la solicitud debe coincidir con el día operativo

**Contexto:** Una solicitud de entrega mostraba sábado 8 de agosto, pero estaba asociada a una ruta general de domingo. La causa fue tratar el índice de día operativo como si comenzara en domingo al calcular la fecha de prueba.

**Decisión:** El calendario de Logística usa índices de lunes a domingo (`0` a `6`). Toda solicitud debe guardar `route_date` cuya fecha real produzca el mismo índice mediante `getLogisticsWeekdayIndex`; la etiqueta de la subruta y la fecha visible deben coincidir.

**Resultado:** Una ruta de domingo siempre se muestra con una fecha de domingo, sin depender de la numeración distinta del calendario nativo de JavaScript.

### 2026-08-07 — LOG-047: la configuración de días no puede ocultar invoices

**Contexto:** Activar o desactivar un día maestro podía cambiar el filtro inicial de Logística y hacer que los invoices de otros días dejaran de aparecer, aunque siguieran abiertos y registrados.

**Decisión:** La configuración semanal solo controla la disponibilidad para programar nuevas operaciones. Nunca elimina, mueve ni oculta invoices abiertos. `Tareas` inicia mostrando todos los días y conserva visibles los invoices cuyo día quedó desactivado; esos casos se marcan como no operativos hasta reactivar el día o reprogramarlos.

**Resultado:** Un cambio de calendario no puede hacer que un invoice parezca perdido. Los filtros manuales siguen siendo filtros de consulta, mientras que la configuración del calendario no altera la visibilidad de la cola.

### 2026-08-05 - LOG-016: nomenclatura de la configuración de rutas

**Contexto:** La vista interna de `Logística → Rutas` se llamaba `Plantillas`, aunque su función visible es activar o desactivar días, definir el horario general y crear subrutas.

**Decisión:** El botón se llama `Configuración`. `Operativas` representa las rutas concretas de una fecha; `Configuración` representa el calendario de rutas disponibles y sus subrutas. Los nombres técnicos `logistics_route_templates` y `template` pueden mantenerse internamente para compatibilidad de datos, pero no deben aparecer como concepto principal en esta navegación.

**Resultado:** La interfaz comunica que esa pantalla configura las rutas de la empresa y no que el usuario deba administrar una biblioteca separada de plantillas.

### 2026-08-06 — LOG-038: Configuración agrupa recursos de Logística

**Contexto:** La navegación principal de Logística mostraba `Tareas`, `Conductores`, `Vehículos` y `Rutas` al mismo nivel. Eso mezclaba la operación diaria con la administración de recursos y ocupaba espacio innecesario.

**Decisión:** La navegación principal queda en `Tareas`, `Rutas` y `Configuración`. La sección `Configuración` agrupa `Conductores`, `Vehículos` y `Calendario y subrutas`. Las URLs y permisos existentes de Conductores y Vehículos se conservan; solo cambia su ubicación visible en la navegación.

**Regla:** La asignación rápida de conductor o vehículo desde una ruta sigue disponible en el flujo operativo y no depende de abrir Configuración.

**Resultado:** La barra principal comunica operación frente a administración sin quitar accesos ni cambiar la fuente de verdad de conductores, vehículos o rutas.

### 2026-08-06 — LOG-039: Configuración usa un acceso compacto

**Contexto:** Aunque Configuración ya agrupaba los recursos, un botón textual adicional seguía ocupando espacio junto a Tareas y Rutas.

**Decisión:** Tareas y Rutas permanecen como botones principales. Configuración se abre desde un botón de engranaje ubicado al extremo derecho de la barra completa, separado del grupo de navegación. El menú conserva Conductores, Vehículos y Calendario/subrutas.

**Resultado:** La navegación prioriza la operación diaria y mantiene la administración disponible con un acceso compacto y reconocible. Dentro de Rutas sólo se muestran `Plantillas` y `Operativas`; el engranaje es el único acceso visible a la configuración semanal.

### 2026-08-05 - LOG-032: plantilla de ruta antes del cierre

**Contexto:** La vista `Operativas` mezclaba la reserva pendiente y la ruta concreta que el equipo de Logística estaba preparando con las rutas que ya podían ejecutarse.

**Decisión:** En la interfaz, una `Plantilla` es una ruta concreta con fecha y estado técnico `draft`. En esa etapa Logística convierte las reservas en ruta y revisa, agrega, quita o reordena sus invoices/paradas. `Configuración` queda reservada para el calendario semanal, los horarios generales y las subrutas disponibles.

**Reglas:**

- Las reservas agrupadas por ruta semanal y fecha aparecen en `Rutas → Plantillas` hasta convertirse en una ruta concreta.
- Crear la ruta genera una `logistics_route` en preparación (`draft`); esa ruta es el bloque de trabajo que se revisa antes del cierre.
- Cerrar una ruta `draft` la pasa a `planned` (`Cerrada`). A partir de ese momento no se permiten normalmente agregar, quitar ni reordenar cajas.
- Una ruta cerrada aparece en `Rutas → Operativas` y puede recibir las asignaciones operativas posteriores, incluido conductor y vehículo.
- `Operativas` muestra únicamente rutas cerradas, en curso, terminadas o canceladas; las rutas `draft` no se mezclan allí.

**Resultado:** La navegación refleja el flujo real: `Configuración` prepara la disponibilidad semanal, `Plantillas` prepara una ruta fechada y `Operativas` contiene el bloque ya cerrado para ejecución.

**Nota técnica:** `logistics_route_templates` puede seguir siendo el nombre interno de las definiciones semanales de subrutas por compatibilidad; no equivale al concepto visible `Plantillas` de esta decisión.

### 2026-08-05 - LOG-033: revisión de reservas antes de crear la ruta

**Contexto:** `Rutas → Plantillas` mostraba las reservas pendientes solo como un total de paradas y cajas, sin permitir revisar su contenido antes de crear la ruta concreta.

**Decisión:** una reserva pendiente debe poder expandirse para consultar cada parada antes de convertirla en ruta.

**Datos mínimos visibles:** invoice, cliente, tipo de tarea (`Dejar caja vacía` o `Recoger caja llena`), dirección, referencia de dirección cuando exista, horario solicitado y desglose de cajas.

**Resultado:** Logística puede validar qué va a entrar en la ruta y detectar una parada incorrecta antes de pulsar `Crear ruta`. La creación sigue siendo el paso que convierte el grupo revisado en una ruta `draft`.

### 2026-08-05 - LOG-034: mover, devolver o rechazar una solicitud de ruta

**Contexto:** Una parada puede estar en el día equivocado, necesitar corrección antes de entrar a la ruta o no ser aceptable para la operación. Quitarla sin motivo perdería la trazabilidad y no le explicaría la decisión al vendedor.

**Decisión:** Cada solicitud/parada en preparación puede:

- `Mover a otra ruta`: cambia el día o subruta y deja la solicitud en la preparación de la nueva ruta.
- `Dejar pendiente`: la retira de la plantilla, devuelve la tarea a pendiente y conserva un motivo para que Ventas pueda corregirla o volver a proponerla.
- `Rechazar solicitud`: la retira de la plantilla, devuelve la tarea a pendiente para evitar una ejecución accidental y marca la solicitud como rechazada con motivo obligatorio.

**Reglas:**

- `deferred` y `rejected` son estados distintos; devolver a pendiente no equivale a rechazar.
- Las acciones de devolver o rechazar requieren un motivo de al menos tres caracteres.
- El motivo se guarda en `customer_route_assignment_requests.review_note` y en `activity_history` asociado al invoice.
- Ventas puede consultar ese registro en la bitácora del invoice; no se borra la solicitud histórica.
- Una parada de una ruta `draft` solo puede retirarse con una de esas dos decisiones y motivo; una ruta cerrada no permite esta modificación normal.

**Resultado:** Logística puede corregir la composición de la plantilla, dejar una solicitud para revisión posterior o rechazarla con una explicación auditable para Ventas.

### 2026-08-06 — LOG-040: cajas vacías necesarias visibles en Plantillas

**Contexto:** Al preparar una ruta, Logística necesita saber cuántas cajas vacías debe apartar para las entregas; el total genérico de cajas no distingue entregas de recolecciones.

**Decisión:** `Rutas → Plantillas` muestra por cada grupo de reservas y por cada ruta preparada el conteo de `deliver_empty_box` como `cajas vacías para entregar`. Las cajas de `pickup_full_box` se muestran por separado como cajas llenas para recoger. El detalle de la ruta conserva ambos conteos y el total.

**Regla:** El conteo se calcula a partir de las cantidades de `boxLines` en las solicitudes o de `boxCount` en las paradas; no se inventa inventario disponible ni confirma que el almacén tenga esas cajas.

**Resultado:** Antes de crear o cerrar la ruta, el equipo puede preparar el número correcto de cajas vacías y distinguirlo de las cajas llenas que regresarán.

### 2026-08-06 — LOG-041: aceptar o retirar solicitudes desde la revisión

**Contexto:** Las tres acciones textuales en cada solicitud (`Mover a otra ruta`, `Dejar pendiente` y `Rechazar solicitud`) ocupaban espacio y no expresaban bien la decisión principal.

**Decisión:** Cada solicitud pendiente muestra un chulito para aceptar y agregar la solicitud a la ruta en preparación. La `X` abre `Mover a otra ruta`, `Dejar pendiente` y `Rechazar solicitud`; las dos últimas requieren motivo y conservan la bitácora existente.

**Resultado:** La revisión diaria queda reducida a aceptar o retirar; mover de ruta sigue disponible en el flujo de programación cuando se necesita cambiar el día o la subruta.

### 2026-08-06 — LOG-042: fecha de entrada visible en Tareas

**Contexto:** Las invoices de `Tareas` mostraban la fecha programada del servicio, pero no cuándo fueron enviadas o agregadas a Logística.

**Decisión:** La fecha visible `Agregada a Logística` se toma de `shipment_logistics_tasks.ordered_at` (`orderedAt` en la UI). Si ese campo está vacío en una tarea histórica, se usa `created_at` como respaldo de la creación de la tarea. Nunca se sustituye por `scheduled_at`, porque esa fecha representa el servicio comprometido y no la entrada a la cola operativa.

**Resultado:** Cada invoice de Tareas puede distinguir cuándo entró a Logística frente a cuándo debe ejecutarse.

### 2026-08-06 — LOG-043: venta selecciona ruta y fecha como combinación operativa

**Contexto:** En la venta con chofer, el usuario elige la ruta y el día en que esa ruta debe atender el envío. La fecha no representa cuándo se creó el invoice ni cuándo entró a Logística.

**Decisión:** En la selección completa de Ventas se conservan ambas piezas: `routeTemplateId` identifica la ruta y `routeDate`/`scheduledAt` identifica el día de operación. En Tareas, el filtro de ruta y el filtro de día/fecha deben leerse como una combinación para localizar la operación correspondiente.

**Excepciones:** La ruta puede quedar pendiente en ciertos flujos, y algunas recolecciones pueden quedar sin día hasta que el cliente lo defina; esos estados deben mostrarse explícitamente y no confundirse con la fecha de entrada a Logística.

**Resultado:** La fecha de agregación (`ordered_at`) queda como antigüedad informativa; la fecha del filtro sigue siendo el día de ruta/servicio.

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
| Configuración → Ventas → Rutas | Días disponibles | Ventas, programación de entregas y recolecciones, Logística (pickers) | Ventas sólo ofrece los días activados en el catálogo semanal. |
| Configuración → Ventas → Rutas | Rutas semanales | Ventas, tareas logísticas | Las rutas ofrecidas en una venta provienen del catálogo semanal. |
| Inventario | Stock por bodega | Ventas, bodega, asignaciones | Ningún módulo puede confirmar disponibilidad física, reservar, descontar ni vender más unidades de las existentes. La venta completa se bloquea si falta stock para cualquier línea (ver VEN-COB-004). |
| Inventario → ubicaciones (bins) | Ubicaciones y cantidades por estante (`warehouse_bins` + `inventory_bin_stock`) | Tarjetas y filas de `/inventario` | La ubicación visible proviene de los bins del stock agregado; la suma ubicada no supera el stock de esa bodega. El módulo `/bodega` no es la fuente de estas ubicaciones: administra cajas llenas individuales (`shipment_packages`). |
| Inventario | Movimientos | Historial, costos y auditoría | Toda entrada, salida o ajuste genera una traza auditable. |
| Configuración comercial | Países y precios | Ventas, catálogo | Ventas consume países y precios configurados; no crea precios implícitos. |

### 2026-07-27 — LOG-007: días administrados únicamente en Rutas

**Contexto:** La configuración logística volvió a mostrar selectores de días para entregar y recoger, aunque esos días ya se administran en el catálogo semanal de Rutas.

**Decisión (actualizada 2026-08-04):** `Configuración → Ventas → Rutas` es la única fuente de verdad para activar o desactivar días operativos y editar plantillas semanales. Logística consume el catálogo para tareas; no lo edita. El cargo adicional lo captura el flujo de venta. Ningún guardado de precios/depósito puede modificar días ni horarios de ruta.

**Resultado:** Un solo calendario semanal; `/logistica?view=rutas` redirige a Configuración.

### 2026-07-27 — LOG-008: horario operativo por ruta semanal

**Contexto:** Los rangos globales de entrega y recolección seguían aparentando ser el horario de las rutas, aunque una empresa puede operar todo el lunes con un horario general o dividirlo en varias rutas con horarios diferentes.

**Decisión:** Activar un día crea una ruta general implícita, sin insertar una plantilla `Ruta del {día}`. Su hora de inicio y fin se guarda en la configuración semanal del propio día. `logistics_route_templates` queda reservado para subrutas nombradas; si existen, cada una administra su horario. Ventas deriva los rangos sugeridos del día general cuando no hay subrutas y de las subrutas cuando el día fue dividido.

**Resultado:** El día activado funciona inmediatamente como ruta, la lista inferior permanece vacía hasta que se creen subrutas y Ventas no ofrece rangos inventados.

## Reglas confirmadas

### LOG-001 — Disponibilidad de días

**Fuente:** Configuración → Ventas → Rutas → Calendario de rutas.

**Consumidor:** Ventas → Entrega de caja vacía y recolección de caja llena.

**Reglas:**

- Un día activado en el catálogo semanal (Configuración → Ventas → Rutas) puede ofrecerse en Ventas.
- Un día desactivado no puede seleccionarse en Ventas.
- Si no hay ningún día activado, Ventas muestra cero días disponibles.
- Ventas no puede usar los siete días como respaldo.
- El calendario se vuelve a consultar al abrir el programador para evitar datos obsoletos.

### LOG-002 — Ruta opcional y fecha requerida

**Fuente:** Configuración → Ventas → Rutas.

**Consumidor:** Ventas → `Chofer entrega`.

**Reglas:**

- Para entregar una caja vacía mediante chofer se requiere un día o fecha válida.
- La ruta específica puede quedar pendiente.
- La venta no se confirma hasta que exista una fecha concreta y una tarea `deliver_empty_box` vinculada a esa fecha.
- La validación se repite en el servidor; ocultar o manipular los controles de Ventas no permite crear una entrega de chofer sin fecha.
- No cargar el catálogo de rutas no debe cerrar el flujo ni producir disponibilidad falsa.
- Si el catálogo falla, el modal puede abrir, pero sólo con la disponibilidad real conocida.
- Una ruta pendiente conserva la fecha elegida para que Logística complete la asignación.

**Decisión confirmada 2026-08-05:** La obligación aplica únicamente cuando la caja vacía se entrega mediante chofer. La entrega inmediata en oficina no requiere fecha. Ruta y conductor pueden quedar pendientes sin bloquear la venta, pero la fecha y la tarea logística no.

**Resultado:** Toda venta confirmada con entrega por chofer entra a Logística con un día comprometido; no se generan ventas sin fecha de entrega.

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

### 2026-08-03 — COM-001: país único y persistencia serializada

**Contexto:** Un doble clic ya estaba bloqueado en la interfaz, pero el autoguardado podía coincidir con el guardado explícito y enviar dos reemplazos del mismo catálogo. Otro cliente también podía intentar registrar el mismo país con diferencias de mayúsculas o espacios.

**Decisión:** El cliente serializa las escrituras del catálogo y omite snapshots ya confirmados. La interfaz rechaza países repetidos por código o nombre normalizado. PostgreSQL es la autoridad final mediante unicidad por organización de `upper(btrim(code))` y `lower(btrim(name))`.

**Resultado:** Una intención de agregar país produce una sola escritura activa; México no puede registrarse otra vez como variante de código o nombre. La migración `181_pricing_country_normalized_uniqueness.sql` solo valida y agrega índices; no borra ni modifica datos existentes.

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
- Movimientos históricos sin referencia exacta: se resuelven por RPC/scripts de mantenimiento (`list_inventory_movements_missing_shipment_refs` / `backfill_inventory_shipment_refs_unambiguous`); no hay panel en la UI de Inventario.
- Cobro + cierre de tarea atómicos vía `complete_conductor_task_atomic` (idempotente por `client_operation_id`).
- Aceptar custodia actualiza estado físico (p. ej. `handed_to_carrier`); existe cierre de paleta.

**Resultado verificado en DB local (2026-08-02):** `draft → publicar → planned → iniciar (GPS) → in_progress → completar paradas/pagos → completar ruta`, con RLS de dos conductores, RPC atómico, custodia, inventario histórico y notificaciones. Script: `scripts/test-logistics-route-integrity.mjs`.

### 2026-08-02 — LOG-015 / L-H1: attempt no implica éxito de cierre

**Contexto:** El path `completed` de conductor insertaba `shipment_logistics_task_attempts` con `client_operation_id` antes de `complete_conductor_task_atomic`. Si el RPC fallaba, el reintento encontraba el attempt y devolvía `replayed: true` sin completar ni cobrar; la action podía responder `ok`.

**Decisión:**

- En el path `completed`, TypeScript no inserta attempt antes del RPC; el attempt lo crea el RPC al cerrar de verdad.
- `replayed: true` solo es válido si la tarea persistida está en estado terminal coherente (`completed` / `cancelled` según el resultado). Un attempt huérfano se elimina y el RPC continúa.
- Tras el RPC, la action relee `shipment_logistics_tasks.status` y solo trata éxito/replay si quedó `completed`; si no, falla (la cola offline no marca `synced`).

**Resultado:** Éxito falso por attempt prematuro ya no es posible; reintentos con la misma clave pueden completar tras un fallo real.

### 2026-08-02 — LOG-015 / L-H3: preview TS no reemplaza logistics_plan del RPC

**Contexto:** `completeTask` enviaba en `p_shipment_patch.logistics_plan` un snapshot/preview (paymentPlan / noCollectionPlan) construido antes del cierre. Tras `collect_shipment_invoice_payment`, el mismo RPC reemplazaba el `logistics_plan` entero con ese preview y podía pisar billing, saldo, depositStatus y metadatos SQL.

**Decisión:**

- Un preview TypeScript anterior al cierre nunca puede reemplazar el `logistics_plan` persistido por un RPC atómico. Billing, dinero y resultado del cierre son autoridad SQL.
- TypeScript solo envía patches de hitos/status allowlisteados (`buildConductorCompleteShipmentPatch`); no manda `logistics_plan`.
- El RPC ignora `logistics_plan` del cliente y, si aplica, fusiona solo `billing.lastDriverCollection` sobre el plan ya autoritativo.
- Los cambios posteriores deben ser patches parciales explícitos; está prohibido el read-modify-write completo del plan desde TypeScript tras el RPC.

**Resultado:** El billing SQL y los campos operativos del plan sobreviven al cierre online/offline; un replay legítimo no reescribe el plan.

### 2026-08-02 — LOG-015 / L-H2: efectos de finalización solo post-commit

**Contexto:** En el path `completed`, el conductor aplicaba movimientos de camión, vinculación de evidencia en paquetes e historial de invoice **antes** de `complete_conductor_task_atomic`. Si el RPC fallaba, la tarea quedaba incompleta con inventario/evidencia/historial adelantados.

**Decisión:**

- Los efectos que materializan la finalización de una tarea del conductor solo pueden confirmarse dentro del cierre atómico o después de verificar que la tarea quedó `completed`.
- Antes del RPC: validaciones, preparación de evidencia en storage (clave `client_operation_id`) y comprobaciones de camión sin mutar.
- Después del commit (status persistido `completed`): `recordInvoiceEvidence` + eventos de camión + historial de cierre (`shipment.logistics_task_updated` / cobro pendiente), todos idempotentes (guards de paquete + índices únicos / 23505 + lookup de historial por `taskId`).
- Un fallo del RPC no puede dejar movimientos definitivos de camión, historial de cierre ni evidencia de cierre vinculada.
- Si el RPC ya cerró y falla un efecto post-commit, el reintento reconcilia sin duplicar (incluida la rama `status === completed`).
- Los efectos post-commit deben ser idempotentes y reconciliables. Offline solo marca `synced` tras `ok` real.

**Resultado:** Camión, evidencia e historial de finalización ya no se adelantan a un cierre fallido.

### 2026-08-03 — LOG-015 / L-H5: resultado failed atómico e idempotente

**Contexto:** El path `failed` insertaba `shipment_logistics_task_attempts` y efectos (incidente de invoice / stop) antes o fuera de una transacción única con el cambio de estado de la tarea (`cancelled`). Un fallo intermedio dejaba attempt huérfano o estados parciales; un replay podía mentir sobre el cierre.

**Decisión:**

- El fallo de visita se cierra solo vía `fail_conductor_task_atomic`: valida alcance, bloquea la tarea, marca `cancelled`, actualiza el stop (`outcome=failed`) e inserta el attempt en la misma transacción.
- TypeScript no llama `recordTaskAttempt` antes del RPC. Tras el RPC relee `status` y solo continúa si quedó `cancelled`.
- Replay idéntico (mismo `client_operation_id` + payload compatible) es éxito idempotente. Payload incompatible → `ATTEMPT_CONFLICT` (no reintentable). Fallo SQL → rollback total.
- Efectos post-commit (historial / incidente “Invoice no visible”) solo tras estado autoritativo y son reconciliables.

**Resultado:** No hay ventana attempt-sin-tarea-fallida; offline solo marca `synced` tras `ok` real.

### 2026-08-03 — LOG-015 / L-H4: errores definitivos vs temporales en offline

**Contexto:** La API `/api/conductor/task-results` mapeaba casi cualquier error de negocio a HTTP 503 y la cola reintentaba por status ≥500, saturando reintentos en fallos permanentes.

**Decisión:**

- Una sola fuente de verdad (`classifyConductorTaskResultError`) define `code`, `message`, `status` y `retryable`.
- Errores definitivos (validación, permiso, conflicto de attempt, estado inválido, cancelada, etc.) → 4xx y `retryable: false`.
- Errores temporales evidentes (timeout, conexión, deadlock, unavailable) → 503 y `retryable: true`.
- Desconocido → mensaje seguro, no 503 universal; `retryable: false` salvo evidencia de transitoriedad.
- La cola offline decide con el flag `retryable` explícito (`resolveConductorOfflineRetryable`), no solo con el código HTTP.

**Resultado:** Fallos de negocio dejan de reintentarse en bucle; fallos de red siguen reintentando.

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

**Fuente:** Configuración → Ventas → Depósito para el depósito mínimo; Configuración → Ventas → Rutas para días y horario operativo del catálogo semanal. En el flujo de venta, la preferencia del cliente (`Exacta` / `Antes de` / …) se toma del historial cuando existe.

**Consumidores:** Ventas → programador de entrega o recolección.

**Reglas:**

- Las sugerencias de `Exacta`, `Antes de` y `A partir` se asocian a cada día activado en `Configuración → Ventas → Rutas`; los valores anteriores de empresa sólo sirven como respaldo para días que todavía no tienen una personalización.
- Las sugerencias de `Entre` pueden configurarse como rangos por día y servicio; los rangos operativos de las rutas también pueden sumarse como atajos, pero no se reemplaza la autoridad de Rutas sobre el horario real.
- Si el día tiene varias rutas, Ventas puede ofrecer una ventana por cada ruta configurada.
- El horario general se guarda en la configuración semanal del día activado; no crea, cuenta ni lista una plantilla `Ruta del {día}`.
- Cuando el día no tiene subrutas, el propio día es la ruta operativa. Cuando se divide, las plantillas representan exclusivamente sus subrutas.
- Las sugerencias son atajos de captura; no reemplazan el horario operativo de una ruta ni confirman una cita.
- Al elegir una ruta, Ventas muestra si el horario solicitado es compatible, requiere revisión o está pendiente de configurar.

**Si falta el dato:**

- Se usan los valores predeterminados únicamente como atajos iniciales; no se inventa el horario operativo de una ruta.

## Registro de aclaraciones y decisiones

### 2026-07-25 — INV-002: antecedente de venta sin stock (reemplazado)

**Contexto:** En Ventas puede intentarse crear una venta de una caja sin existencia disponible.

**Decisión vigente:** Desde el 2026-08-13, `VEN-COB-004` prohíbe registrar la venta cuando falta stock suficiente. El comportamiento anterior queda solo como antecedente histórico y no debe implementarse ni usarse como fallback.

### 2026-07-31 — INV-002: antecedente de aviso en Notificaciones (reemplazado)

**Contexto:** El banner ámbar fijo bajo “Invoice creado” competía con el estado de éxito y desaparecía al salir de la venta.

**Decisión vigente:** `VEN-COB-004` reemplaza este aviso: no se crea el invoice ni un recordatorio nuevo. Los recordatorios históricos se conservan exclusivamente como auditoría.

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

**Decisión (actualizada 2026-08-03):** El cargo adicional lo captura el vendedor en Ventas cuando participa un conductor. Ya no existe un catálogo de importes sugeridos en `Configuración → Costos → Operativos`; la sección comercial (`Configuración → Ventas`) administra precios por país, depósito y horarios sugeridos.

**Reglas:**

- El cargo se aplica una vez por servicio y nunca por caja ni por país.
- Comienza desactivado; al activarlo el vendedor escribe el importe (> 0) y una **razón obligatoria**.
- No hay tarifa sugerida de organización.
- Ventas lee el historial del mismo cliente (`shipments.logistics_plan.feeAdjustments`) para precargar el último importe/razón y ofrecer chips de razones recientes por tipo (entrega o recolección).
- El servidor valida importe positivo y razón no vacía cuando el cargo está activo, y recalcula total, depósito y saldo.
- Se conservan importe aplicado, razón, vendedor y fecha.
- La venta normal y la venta rápida usan la misma validación.
- El envío muestra `Cargo logístico adicional` cuando corresponde.

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

**Forma del conjunto:** 10 medidas de caja en la categoría `cajas`, 10 países, precio y costo por caja en cada país, 15 remitentes y un destinatario por país para cada remitente (150 en total). `npm run db:seed:scgs-demo` produce exactamente eso y es idempotente: repetirlo no duplica filas.

**Precio por país:** cada país tiene un `priceFactor` que multiplica el precio y el costo base de la caja, para que los destinos lejanos no queden con la misma tarifa que México.

**Dependencias que hay que respetar:**

- `customer_recipients.country_id` es obligatorio (`customer_recipients_country_required`). Todo destinatario nuevo debe resolver el país contra `pricing_countries` de la misma org; el nombre de país en texto no basta.
- `pricing_country_boxes.catalog_key` debe coincidir con `categoría|kind|subcategoría` normalizado del ítem de inventario, o el producto no se enlaza con el catálogo en Configuración.
- Sembrar un país sin precios deja destinatarios sin producto vendible; los países del catálogo demo y los de las plantillas de destinatarios se mantienen en la misma lista.

**Stock:** `scripts/seed-scgs-box-stock.mjs` (incluido en `db:seed:scgs-demo`) deja la mayoría de medidas con cantidad en bodega y unas pocas en 0 (`22x22x22`, `24x24x24`, `30x20x20`) para comprobar que Venta bloquea cajas agotadas.

### 2026-08-03 — DEMO-001 ampliado a 15 remitentes × 10 países

**Contexto:** Se pidió un set operativo más amplio para probar Ventas.

**Decisión:** Mismo pipeline `db:seed:scgs-demo`; países = MX, CO, GT, SV, HN, NI, CR, PA, PE, EC; 15 remitentes; 10 destinatarios por remitente (uno por país).

**Resultado:** 150 destinatarios con `country_id`; seed idempotente.

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

**Decisión:** Las sugerencias se guardan con alcance de día dentro de `organization_route_settings.schedule_suggestions.byWeekday`, usando los mismos índices semanales de Rutas (`lunes = 0` … `domingo = 6`). El flujo de venta usa la configuración del día seleccionado entre los días activos del catálogo. Desactivar un día lo quita de la disponibilidad, pero conserva sus sugerencias para si se vuelve a activar.

**Reglas:**

- La activación de días es exclusiva de `Configuración → Ventas → Rutas`.
- Si un día activo todavía no tiene una personalización, se muestran los valores heredados de la configuración anterior o los predeterminados hasta que se guarden los del día.
- Cada día tiene una sola configuración de sugerencias compartida por entrega y recolección; puede activar sólo las modalidades que realmente acepta (`Exacta`, `Antes de`, `A partir` y/o `Entre`).
- Desactivar una modalidad la oculta de la captura, pero conserva sus horas guardadas para poder activarla otra vez sin reconfigurarlas.
- Una lista de horas vacía guardada de forma explícita significa “sin atajos” para esa modalidad; no se rellena otra vez con valores predeterminados y el resto del flujo continúa disponible.
- `Entre` se administra con rangos configurables; los rangos de Rutas continúan disponibles como referencia operativa del día.

**Resultado:** Lunes, martes y los demás días pueden ofrecer atajos distintos sin duplicar el calendario de rutas ni confundir la sugerencia del cliente con el horario operativo.

### 2026-08-01 — LOG-014: horario de ruta separado de preferencia del cliente

**Contexto:** Logística estaba administrando listas de horas que después aparecían en Ventas como si fueran horarios sugeridos para todos los clientes. Eso mezcla la operación de una ruta con el hábito particular de cada cliente.

**Decisión:**

- `Configuración → Ventas → Rutas` es responsable del horario operativo de cada ruta: hora de inicio y fin estimado de la ruta o subruta.
- Logística no administra un catálogo global de horas para que Ventas lo ofrezca a los clientes.
- Ventas puede capturar una preferencia opcional del cliente/remitente, como `Exacta`, `Antes de`, `A partir` o `Entre`. Esa preferencia no confirma una cita, no cambia el horario de la ruta y no debe enviarse al conductor como hora asignada.
- Las sugerencias de Ventas se obtienen del historial confirmado o completado del mismo cliente y del mismo tipo de operación. Si el cliente ya tuvo una recolección a las 10:00 AM, esa hora puede volver a aparecer como primera sugerencia en una recolección posterior.
- Si no existe historial válido, Ventas no inventa horas ni muestra las antiguas sugerencias globales como disponibilidad.
- Logística conserva la autoridad para definir posteriormente el horario confirmado, que es el único que organiza la ruta y llega al conductor.

**Si falta el dato:**

- Sin historial del cliente, la preferencia queda vacía y el vendedor puede continuar sin hora solicitada.
- Sin horario operativo de la ruta, Ventas muestra que está pendiente de configurar por Logística; no presenta la preferencia del cliente como horario confirmado.

**Resultado:** Ventas aprende hábitos reales por cliente sin convertirlos en reglas generales, mientras Logística conserva el control exclusivo de la operación de las rutas.

### 2026-08-03 — FIN-004: idempotencia de cobros de oficina

**Contexto:** Un reintento o doble clic tras timeout podía insertar un segundo `shipment_payments` aunque el primero ya hubiera committed. El RPC serializaba con `FOR UPDATE` (evita sobrepago por carrera de lectura) pero no deduplicaba por operación de cliente. Además, cerrar el diálogo tras un timeout descartaba la clave en memoria y al reabrir se mintía una intención nueva.

**Decisión:**
- Todo cobro de oficina envía `clientPaymentId` estable. SQL persiste `shipment_payments.client_payment_id` con unique parcial **por organización** `(organization_id, client_payment_id)`. No hay unique global: cada tenant es un namespace de claves.
- Replays idénticos (misma org + clave + factura + monto + método) → jsonb `{ replayed: true }` sin segundo efecto. Payload distinto → `PAYMENT_IDEMPOTENCY_CONFLICT`.
- `payment_kind` (`deposit`/`balance`/`full`) es solo etiqueta derivada del umbral de depósito; **no** cambia `paid`, saldo, estado de factura ni efectos contables del RPC, y por eso no entra en la huella (puede cambiar tras cruzar `depositRequired`).
- Antes del `await`, la UI persiste la intención ambigua en `localStorage` (`boxario.officePayment.pending.v1`: shipmentId, clientPaymentId, amount, method, createdAt). Cerrar/reabrir reutiliza esa clave hasta éxito/replay, conflicto o error definitivo. Un segundo abono legítimo usa clave nueva tras limpiar el storage.
- PostgreSQL sigue siendo la autoridad; el storage del navegador solo preserva la intención.

**Resultado:** Abonos no se duplican por retry, doble submit, concurrencia ni cierre/reapertura tras timeout. Migraciones `170`–`178`.

### 2026-08-03 — AGE-001: idempotencia de operaciones de agencia

**Contexto:** Crear solicitud y asignar a ruta podían duplicar entidades cuando la UI o el Server Action regeneraban la clave (`randomUUID()`), cuando un reintento usaba una clave nueva, o cuando `assign` no trataba el estado asignado como autoridad. La guarda de `171` devolvía la visita existente ante cualquier status terminal sin distinguir ruta ni huella, lo que convertía silenciosamente un segundo intento en “éxito”.

**Decisión:**
- PostgreSQL es la autoridad vía `idempotency_operations` (alcance `tenant_id + operation_type + idempotency_key`) con columna `request_hash` (huella canónica).
- **Crear solicitud:** la UI genera `clientRequestId` una vez por intención, la persiste ante resultado ambiguo en `boxario.agencyOperation.pending.v1` (namespace por organización) y la envía sin regenerar. Replay idéntico → `{ replayed: true }`. Misma clave con payload distinto → `AGENCY_IDEMPOTENCY_CONFLICT`.
- **Asignar:** la UI genera `clientAssignmentId` por intención (request+ruta), la persiste en el mismo store namespaced. Replay idéntico → visita/stop originales. Misma clave con otra ruta → conflicto de huella. Clave nueva sobre solicitud ya asignada → `REQUEST_ALREADY_ASSIGNED` (no hay reasignación silenciosa). Cancelada → `REQUEST_CANCELLED`; completada/rechazada → `REQUEST_NOT_ASSIGNABLE`.
- Huella de creación incluye tenant, org/agencia, fecha, nota y líneas semánticas (servicio, cantidad, recurso, cliente, dirección). Excluye cargos/precios resueltos en servidor.
- Huella de asignación incluye tenant, org/agencia, request, ruta y ventana programada.
- Unicidad física: `agency_visit_lines_request_line_uidx` (una línea de solicitud en a lo sumo una visita).
- `busyRef` / disabled son solo UX; la garantía es SQL + clave de cliente.

**Resultado:** Una intención produce como máximo una solicitud; una asignación produce como máximo una visita y un stop. Migraciones `171` (guarda inicial), `179` (huella, conflictos, unicidad, ciclo de vida de clave) y `180` (corrige `ON CONFLICT` ambiguo parámetro/columna).

### 2026-08-03 — INV-002 / L-H9: `stock_deducted_at` solo con movimiento real

**Contexto:** `complete_conductor_task_atomic` y `start_logistics_route_atomic` marcaban `stock_deducted_at` al completar entrega o iniciar ruta aunque esos RPC no ejecutaran fulfill/salida de inventario. Las ventas históricas sin stock o las rutas sin carga real quedaban con un hito falso.

**Decisión:** `stock_deducted_at` solo se escribe cuando un RPC de carga/fulfill con movimiento de inventario lo fija (`mark_logistics_task_loaded_with_stock_atomic` / `update_logistics_task_atomic` con stock). Complete y start de ruta preservan el valor existente y nunca lo inventan. El action TS de cierre de conductor deja de enviar ese campo en el patch.

**Resultado:** El hito significa descuento real de stock. Migración `172_stock_deducted_at_consistency.sql`.

### 2026-08-03 — LOG-015: cancelación atómica de rutas

**Contexto:** `cancelLogisticsRouteAction` desasignaba conductor por tarea, liberaba paradas y marcaba la ruta cancelada en llamadas separadas. Un fallo a mitad dejaba paradas liberadas con ruta aún planificada (o al revés).

**Decisión:** Un solo RPC `cancel_logistics_route_atomic` hace FOR UPDATE de la ruta, desasigna tareas/envíos del conductor de la ruta, libera paradas, cancela la ruta y escribe auditoría. Solo `draft`/`planned`; `cancelled` es replay. La action deja de orquestar pasos sueltos.

**Resultado:** Cancelar ruta es todo-o-nada. Migración `173_cancel_logistics_route_atomic.sql`.

### 2026-08-03 — LOG-015: movimiento bodega + evento camión atómicos

**Contexto:** Carga/devolución del camión hacía `record_inventory_movement_atomic` y luego `insert` en `logistics_truck_inventory_events` por separado. Si el segundo fallaba, la bodega ya había cambiado sin evento de camión (o al revés en transferencias entre vehículos).

**Decisión:** Un RPC `conductor_truck_inventory_move_atomic` con modos `load`, `return_warehouse` y `transfer_vehicle` ejecuta movimiento de inventario (cuando aplica) y el/los eventos de camión en la misma transacción. Las actions de conductor dejan de encadenar pasos sueltos; la bitácora operativa sigue después del commit.

**Resultado:** Inventario de bodega y ledger de camión no divergen por fallos parciales. Migración `174_conductor_truck_warehouse_move_atomic.sql`.

### 2026-08-03 — Rendimiento: límites por defecto en listados

**Contexto:** `listShipmentsAction` usaba default 500 (tope 1000). Paletas y paquetes de bodega no tenían `limit`/`range`. Logística y auditoría pedían el listado completo por omisión.

**Decisión:** Default de envíos = 50 (`SHIPMENTS_PAGE_SIZE`), tope 200. Tableros operativos pasan `SHIPMENTS_BOARD_LIMIT` (200) de forma explícita. `listWarehousePackagesAction` y `listWarehousePalletsAction` usan paginación acotada.

**Resultado:** Se evita over-fetch silencioso al crecer el volumen de envíos/paletas.

### 2026-07-31 — SEG-003: depuración limpia de envíos/inbounds en seguimiento

**Contexto:** Se solicitó eliminar todos los envíos / inbounds en seguimiento (`/seguimiento`) sin borrar los catálogos de remitentes (`customers`) ni destinatarios (`customer_recipients`).

**Decisión:** Se creó y ejecutó la rutina de depuración atómica `scripts/delete-tracking-shipments.mjs`. Esta rutina elimina en orden de dependencia todas las operaciones de venta, registros de tareas logísticas, custodias, paquetes físicos, cobros y los envíos en seguimiento (`public.shipments`), deshabilitando temporalmente triggers inmutables para el wipe operativo.

**Resultado:** El total de envíos en seguimiento pasó a 0, mientras que los 5 remitentes y 25 destinatarios permanecieron 100% intactos en la base de datos.

### 2026-08-04 — VEN-COB-001: depósito por caja y medios de pago configurables

**Contexto:** El depósito mínimo se aplicaba una sola vez al invoice aunque la venta tuviera varias cajas. Además, oficina y conductor mostraban métodos de pago fijos.

**Decisión:** `minimum_deposit` representa el importe por cada caja física. El depósito exigido es `importe por caja × cantidad de cajas`, limitado al total cotizado. La organización define los métodos aceptados, el subconjunto disponible al conductor, el método predeterminado y qué métodos requieren referencia. Estas reglas se consultan desde la configuración vigente y se validan también en servidor al registrar cada cobro.

**Resultado:** Dos cajas con depósito unitario de $20 exigen $40; una forma deshabilitada o una referencia obligatoria vacía no puede registrarse mediante manipulación del cliente. Migración `182_sales_payment_methods.sql`.

### 2026-08-04 — LOG-016: reservas, excepciones, capacidad y cobertura de rutas

**Contexto:** El calendario semanal no expresaba anticipación mínima, cierre para el día siguiente, feriados/excepciones, capacidad ni cobertura postal de una subruta.

**Decisión:** La organización puede definir una hora límite para reservar la ruta del día siguiente y excepciones por fecha (cerrada o con horario especial). Cada día general y cada subruta pueden limitar paradas y cajas; las subrutas pueden declarar zona y códigos postales admitidos. La confirmación de programación valida estas reglas antes de crear o agregar una parada. La anticipación mínima en horas que introdujo originalmente esta migración fue retirada posteriormente por `LOG-021`.

**Resultado:** Ventas y Logística no pueden confirmar una fecha cerrada, fuera del horario permitido, sobre capacidad o fuera de la cobertura postal configurada. Migración `183_route_booking_controls.sql`.

### 2026-08-04 — FIN-005 / LOG-017: plazo incluido para pedir recolección

**Contexto:** La venta entrega primero una caja vacía y la recolección de la caja llena no puede quedar incluida indefinidamente.

**Decisión:** La organización configura los días incluidos y un cargo por recolección fuera de plazo. El conteo comienza cuando la caja vacía se entrega realmente al cliente (`empty_box_delivered_at`), no al crear el invoice. La solicitud se considera hecha cuando se ordena la tarea activa `pickup_full_box`; si ocurre hasta el instante límite inclusive no hay cargo. Si ocurre después, el importe congelado en la venta se agrega una sola vez al invoice. El cargo es por solicitud/recolección del invoice, no por caja, y no aplica cuando el cliente trae la caja llena a la oficina. Una demora de programación posterior a una solicitud oportuna no penaliza al cliente. Las ventas anteriores sin instantánea de esta política no reciben cargos retroactivos.

**Resultado:** La regla conserva el acuerdo vigente al vender, reabre el saldo si el invoice ya estaba pagado y registra historial operativo y auditoría financiera. Migración `184_late_pickup_window.sql`.

### 2026-08-04 — LOG-018: activación y cierre de reservas por ruta

**Contexto:** Habilitar un día podía dejarlo disponible sin horario operativo y el cierre global solo revisaba si la fecha elegida era mañana. Se pidió el funcionamiento habitual de paquetería: una ruta del viernes cierra el jueves a una hora configurable, con posibilidad de una hora propia por ruta.

**Decisión:** Un día de ruta solo se habilita mediante un comando atómico que guarda inicio y fin obligatorios junto con su disponibilidad. Toda subruta nueva también requiere inicio y fin. La organización define un cierre global del día anterior; la ruta implícita de cada día y cada subruta pueden heredarlo o sobrescribirlo. La fecha límite se calcula como `fecha de ruta - 1 día` a la hora efectiva y se valida en servidor, por lo que también bloquea altas durante el mismo día de la ruta.

**Resultado:** No existen nuevas rutas habilitadas sin horario. Una ruta del viernes con cierre `21:00` acepta cajas hasta el jueves antes de las 21:00 y las rechaza desde ese instante. Migración `185_route_booking_cutoff_overrides.sql`.

### 2026-08-04 — LOG-019: rutas con fin abierto

**Contexto:** Algunas rutas tienen una hora conocida de salida, pero terminan cuando se completa el recorrido y no cuentan con una hora de cierre predecible.

**Decisión:** La hora de inicio continúa siendo obligatoria para días y subrutas. La hora estimada de fin es opcional cuando se declara explícitamente `hasta terminar la ruta`. Esta modalidad no altera la fecha límite para agregar cajas, que sigue resolviéndose por la política global o propia de reservas.

**Resultado:** Una ruta puede iniciar a las 09:00 sin inventar una hora final; la interfaz y los resúmenes la identifican como `hasta terminar la ruta`. Migración `186_open_ended_route_hours.sql`.

### 2026-08-04 — LOG-020: cierre uniforme para agregar cajas

**Contexto:** La programación inicial validaba el cierre del día anterior, pero el selector de rutas y la edición operativa podían agregar la misma tarea mediante otra acción del servidor.

**Decisión:** Toda entrada de una tarea/caja a una ruta resuelve primero el cierre propio de la ruta y, si no existe, el global. La programación, el selector, el alta directa y la edición operativa rechazan desde el mismo instante límite. Una razón de edición no permite eludir el cierre.

**Resultado:** Una ruta cerrada a las 21:00 del día anterior no acepta cajas después de esa hora por ninguna superficie operativa de Ventas o Logística.

### 2026-08-04 — LOG-021: retiro de la anticipación adicional

**Contexto:** La anticipación mínima en horas y el cierre del día anterior resolvían casi el mismo límite y obligaban a entender cuál de las dos reglas vencía primero.

**Decisión:** Eliminar por completo la anticipación mínima en horas, incluida su configuración y validación. La única regla temporal para agregar cajas es el cierre del día anterior: cada día o subruta puede definir uno propio y, si no lo hace, hereda el cierre global.

**Resultado:** No queda una restricción oculta basada en horas exactas. El operador administra un solo concepto y todas las entradas a ruta conservan la misma validación de cierre. Migración `187_remove_route_minimum_notice.sql`.

### 2026-08-05 — LOG-022: administración de subrutas independiente de la disponibilidad del día

**Contexto:** La sección inferior es la superficie de administración de subrutas, pero el alta desaparecía cuando el día seleccionado no estaba disponible.

**Decisión:** Las subrutas se agregan, editan y eliminan exclusivamente desde la sección inferior del día seleccionado. Pueden configurarse mientras el día está apagado; permanecen guardadas, pero no se ofrecen como rutas operativas hasta que el día se active.

**Resultado:** Logística puede preparar la división de un día antes de habilitarlo sin mezclar esas acciones con las tarjetas del calendario ni publicar rutas inactivas en Ventas.

### 2026-08-05 — LOG-023: conductor predeterminado según el nivel de ruta

**Contexto:** El conductor predeterminado se configuraba por día incluso cuando ese día estaba dividido en varias subrutas con recorridos distintos.

**Decisión:** El conductor semanal del día se aplica únicamente a la ruta general implícita, es decir, cuando el día no tiene subrutas. Si existen subrutas, cada plantilla guarda su propio conductor predeterminado y la programación resuelve el conductor desde la subruta seleccionada, sin heredar el del día.

**Resultado:** Un día sin divisiones conserva un único conductor general. Al dividirlo, cada recorrido puede tener un conductor diferente y no se asigna accidentalmente el conductor general a todas las subrutas. Migración `190_route_template_default_driver.sql`.

### 2026-08-05 — DEMO-001: sembrado de cajas por medida, países y remitentes con destinatarios

**Contexto:** Se solicitó poblar el inventario con cajas de diferentes medidas (con y sin stock), configurar países de destino con sus precios al público e internos, y registrar remitentes con destinatarios asociados a direcciones coherentes por país.

**Decisión:** Se ejecutó el pipeline idempotente `npm run db:seed:scgs-demo` con la secuencia de sembrado y actualización de scripts:
- **Inventario & Stock:** 10 medidas de cajas (`12x12x12`, `14x14x14`, `16x16x16`, `18x18x18`, `20x20x20`, `22x22x22`, `24x24x24`, `20x14x14`, `24x18x18`, `30x20x20`). 7 medidas con stock (entre 10 y 48 unidades) y 3 medidas sin stock (0 unidades: `22x22x22`, `24x24x24`, `30x20x20`) en la `Bodega principal` para probar ventas pendientes de inventario.
- **Países & Precios:** 10 países registrados en `pricing_countries` (México, Colombia, Guatemala, El Salvador, Honduras, Nicaragua, Costa Rica, Panamá, Perú y Ecuador). Cada país cuenta con sus tarifas al público (`price`) y costo/precio interno (`cost`) calculados en `pricing_country_boxes`.
- **Remitentes & Destinatarios:** 15 remitentes en `customers` y 10 destinatarios por remitente en `customer_recipients` (150 en total) distribuidos entre los países con direcciones y teléfonos coherentes con cada país y vinculados mediante `country_id`.
- **Infraestructura de Bodega:** `add-inventory-box-sizes.mjs` verifica y genera la `Bodega principal` si la organización no cuenta aún con bodegas activas.

**Resultado:** La base de datos local quedó poblada con cajas con/sin stock, 10 países con catálogo de precios e internos y 15 remitentes con 10 destinatarios coherentes por país cada uno.

### 2026-08-05 — LOG-024: plantilla, reserva y ruta operativa son entidades distintas

**Contexto:** Las rutas semanales se estaban usando a la vez como disponibilidad comercial y como recorrido real. Al elegir una ruta en Ventas se podía crear inmediatamente una `logistics_route`, asignar conductor y agregar paradas, aunque Logística todavía no hubiera armado ni cerrado el recorrido.

**Decisión:** El calendario semanal y sus subrutas son plantillas de disponibilidad. Ventas únicamente reserva la tarea/caja contra una plantilla y una fecha; esa reserva permanece pendiente. Logística agrupa las reservas de la misma plantilla y fecha y crea, o completa, una ruta operativa real en estado `draft` (`En preparación`). Crear la ruta confirma la programación de sus tareas, pero no asigna conductor ni vehículo.

**Resultado:** La disponibilidad que ve Ventas no se confunde con una ruta de trabajo. Varias cajas reservadas se convierten juntas, de forma atómica e idempotente, en una ruta operativa consultable. La migración `192_logistics_route_booking_lifecycle.sql` conserva las solicitudes históricas y las enlaza con la ruta creada.

**Copy Seguimiento (2026-08-05):** el botón del programador se llama `Enviar a logística`, no `Asignar ruta`. La acción solo crea la reserva `pending`; el toast confirma `Enviado a logística para aprobar la ruta`. El chip de progreso usa `Entrega solicitada para el {día}` mientras la reserva está pendiente y `Entrega para el {día}` solo cuando la tarea ya está en una ruta operativa.

### 2026-08-07 - LOG-050: La ruta recurrente se materializa por fecha

Una definición activa como “todos los domingos” representa una recurrencia, no una única ruta operativa. `Rutas` debe consultar y mostrar instancias concretas por fecha —por ejemplo, domingo 9 y domingo 16— mediante un selector o navegador de semanas. Cada instancia conserva su propio estado, solicitudes, conductor y vehículo; la configuración semanal permanece en `Calendario y subrutas`.

### 2026-08-07 - LOG-049: Rutas como superficie operativa unificada

**Contexto:** `Calendario y subrutas`, `Plantillas` y `Rutas operativas` separaban en pantallas distintas una misma operacion y ocultaban la ruta activa del domingo cuando todavia no tenia una instancia fechada.

**Decision:** La pagina visible de `Rutas` unifica las rutas activas del calendario, sus subrutas y las instancias de trabajo por fecha. Una definicion semanal puede mostrarse como `Configurada`; las solicitudes la llevan a `Por preparar`, `Crear ruta` genera la instancia `draft` (`En preparacion`) y el cierre la convierte en `planned` (`Operativa`). La asignacion de conductor se mantiene vinculada a la instancia concreta cerrada, nunca a una definicion semanal sin fecha.

**Resultado:** Logistica encuentra la ruta del domingo en una sola pagina, puede expandir sus subrutas y administrar el conductor sin perder la separacion entre disponibilidad, preparacion y recorrido operativo.

### 2026-08-05 - LOG-025: cierre antes de asignar conductor

**Contexto:** El flujo anterior exigía conductor y vehículo para publicar una ruta, mientras que la operación definida requiere terminar primero el armado de cajas y paradas.

**Decisión:** `planned` representa una ruta `Cerrada`. El cierre ocurre desde `draft`, exige al menos una parada, ubicación verificada y fechas confirmadas, pero no conductor ni vehículo. Una ruta cerrada no admite altas, bajas ni reordenamientos normales. Solo después del cierre se pueden asignar conductor y vehículo; al asignar el conductor, la ruta cerrada aparece en su módulo. `in_progress`, `completed` y `cancelled` conservan sus significados operativos. No existe reapertura normal de `planned` a `draft`.

**Resultado:** Logística puede revisar el recorrido completo, cerrarlo conscientemente y después despacharlo al conductor. Los conductores no ven borradores. Los conductores predeterminados de las plantillas pueden servir como referencia futura, pero nunca se persisten automáticamente en la ruta operativa antes de cerrarla.

### 2026-08-05 — LOG-026: cancelar una ruta devuelve sus reservas

**Contexto:** Cancelar una ruta liberaba sus paradas, pero las solicitudes que originaron esas cajas podían quedar marcadas como aprobadas y dejar de aparecer para rearmar el recorrido.

**Decisión:** Al cancelar una ruta `draft` o `planned`, sus paradas se liberan y las reservas vinculadas vuelven atómicamente a `pending`, sin conductor ni enlace a la ruta cancelada. La ruta cancelada se conserva como historial.

**Resultado:** Las cajas no desaparecen del trabajo pendiente y pueden agruparse en una nueva ruta sin borrar la trazabilidad de la ruta cancelada.

### 2026-08-05 — LOG-027: Tareas muestra únicamente trabajo sin ruta operativa

**Contexto:** El board de Tareas podía seguir mostrando tareas después de agregarlas a una ruta, mezclando trabajo pendiente con recorridos que ya se administran desde Rutas.

**Decisión:** Tareas muestra únicamente tareas sin vínculo a una ruta operativa y sin solicitud pendiente agrupada en Plantillas, incluidas las tareas rechazadas o devueltas a pendiente. En cuanto una tarea tiene una reserva `pending` en Plantillas o se agrega a una ruta `draft`, `planned`, `in_progress` o posterior, deja de aparecer en Tareas y se consulta desde Rutas.

**Resultado:** Tareas funciona como cola de trabajo sin asignación y Rutas como fuente de verdad de las solicitudes en preparación y de los recorridos armados, cerrados y ejecutados. Las búsquedas del board respetan la misma separación y no ofrecen tareas que ya tienen una solicitud en Plantillas o una parada activa.

### 2026-08-05 — LOG-028: cancelar en Seguimiento libera la parada operativa

**Contexto:** Al cancelar una recolección/entrega programada desde Seguimiento, el plan marcaba la tarea `cancelled` con un update directo. La parada en `logistics_route_stops` seguía con `released_at` nulo. Al volver a asignar, `requestCustomerRouteAssignmentAction` respondía `Esta tarea ya esta en una ruta operativa`.

**Decisión:** Cancelar o reactivar una tarea desde el plan de Seguimiento (`persistShipmentLogisticsPlanUpdate`) debe liberar primero las paradas activas (`released_at` + motivo `task_cancelled_from_plan` / `task_reactivated` / `task_date_changed`) y después actualizar la tarea. También se rechazan reservas `pending` de esa tarea. El mensaje al usuario debe ser operativo, no un error SQL genérico.

**Resultado:** Cancelar en Seguimiento deja la caja libre para una nueva reserva/ruta; no quedan paradas huérfanas bloqueando la reasignación.

### 2026-08-05 — LOG-029: revertir recepción de caja llena en oficina

**Contexto:** Un clic accidental en `Cliente entregó caja en oficina` marcaba el invoice `En oficina`, fijaba `full_box_collected_at` / `office_received_at` y bloqueaba Recoger. No había forma de deshacer el error antes de salida.

**Decisión:** Mientras el estado sea `En oficina` y no existan `departed_at`, `shipped_at` ni `delivered_at`, Seguimiento puede revertir esa recepción (`revertFullBoxOfficeReceptionAction`). La acción limpia los hitos de recepción, restaura el estado pendiente de recolección (`Pendiente recolección caja llena` vía `resolvePendingShipmentStatus`) y deja el plan de caja llena sin modo/programación. No aplica a depósitos de caja vacía ni cuando el invoice ya avanzó a salida o tránsito.

**Resultado:** Un registro erróneo en oficina se puede corregir sin inventar datos ni saltarse validaciones; Recoger vuelve a quedar editable para programar chofer o volver a registrar la entrega en oficina.

### 2026-08-05 — EST-001: semántica autoritativa del dashboard

**Contexto:** La reconstrucción de Estadísticas necesita comparar ventas, caja, cartera y operación sin atribuir un cobro al día en que se creó su factura ni mezclar obligaciones de dominios distintos.

**Decisión:** `Ventas` suma el `quotedTotal` persistido de envíos no anulados creados en el periodo; `Cobrado` suma `shipment_payments` por su propia fecha de registro; `Saldo pendiente` es la fotografía actual de total cotizado menos pagado para las ventas del periodo. Las deudas de clientes operativos, clientes locales de agencia, agencias frente a matriz y distribuidores legacy permanecen separadas. Productos se derivan únicamente de líneas persistidas en el snapshot de facturación; clientes sin `customer_id` no se deduplican por nombre.

**Resultado:** Los flujos del periodo y los saldos actuales se etiquetan como conceptos diferentes. No se publican como métricas la utilidad basada en `shipments.profit`, deuda histórica a una fecha, conversión sin embudo, cumplimiento sin SLA aprobado ni valor de inventario cuando falta costo unitario confiable.

### 2026-08-09 — EST-002: estadísticas logísticas por finalización real

**Contexto:** La pantalla de Estadísticas mezclaba ventas, finanzas y algunos conteos operativos, pero no permitía responder cuántas cajas se entregaron o recogieron cada día ni qué ZIP, ruta, vehículo o conductor concentró la operación.

**Decisión:** Estadísticas se divide visualmente en `Compañía` y `Logística`, con un único periodo y los mismos filtros. La pestaña logística cuenta únicamente tareas con estado `completed` y `completed_at` dentro del periodo, convertido a día operativo de `America/Los_Angeles`. `deliver_empty_box` representa una entrega y `pickup_full_box` una recolección. La cantidad usa primero `customer_route_assignment_requests.box_count` y después el `billing.boxCount` persistido del envío; cuando ambos faltan, la operación sí cuenta como completada, pero sus cajas no se estiman y la cobertura se informa. El ZIP usa el snapshot de la parada y después el ZIP persistido de la solicitud. Ruta, vehículo y conductor provienen de la asignación operativa que ejecutó la tarea.

**Resultado:** El día, ZIP, ruta, vehículo y conductor líderes se basan en resultados completados y trazables. Las tareas programadas o pendientes permanecen en el resumen operativo, pero no inflan entregas, recolecciones ni cajas efectivamente manejadas.

### 2026-08-05 — LOG-030: aprobación logística separada del invoice físico

**Contexto:** Los badges `Invoice por confirmar`, `Invoice confirmado` e `Invoice no visible` aparecían en la cola de Logística y podían interpretarse como la aprobación de una solicitud de retiro. En realidad provenían de la evidencia física por caja (`invoice_marked_at` e incidentes del conductor).

**Decisión:** Logística confirma una solicitud de entrega o recolección únicamente al incluir su reserva en la ruta operativa correspondiente a la plantilla y fecha solicitadas. La evidencia de que el invoice está escrito y visible en la caja pertenece al flujo del conductor y a la auditoría física; no representa aprobación logística y no se muestra como badge en las tarjetas ni filas de Tareas.

**Resultado:** La cola de Logística comunica solamente el estado operativo de reserva, ruta y tarea. La evidencia física por caja se conserva sin mezclarse con la decisión de aceptar el trabajo solicitado.

### 2026-08-05 — LOG-031: cierre manual o automático de la ruta preparada

**Contexto:** El cierre global del día anterior solo impedía agregar cajas, aunque la operación definida requiere que también cierre la ruta que Logística ya armó.

**Decisión:** Incluir las reservas en una ruta `draft` (`En preparación`) es la confirmación de Logística. Esa ruta puede cerrarse manualmente antes del límite o automáticamente al alcanzar el cierre efectivo del día anterior (propio de la subruta/día o global heredado). El cierre automático aplica únicamente a rutas con al menos una parada, ubicaciones verificadas y fechas confirmadas; una ruta incompleta permanece visible en preparación para corregirla. Desde el límite no se pueden crear rutas tardías ni agregar paradas. Las reservas que Logística no incluyó no se consideran confirmadas.

**Resultado:** La plantilla sigue siendo disponibilidad, la ruta preparada representa el trabajo aceptado y `planned` (`Cerrada`) es el recorrido listo para asignar conductor y vehículo. El conductor nunca recibe una plantilla ni un borrador.

### 2026-08-05 — LOG-035: Tareas identifica la ruta operativa

**Contexto:** Las filas activas de `Logística → Tareas` mostraban invoice, cliente, acción y dirección, pero ocultaban la ruta concreta cuando la tarea ya tenía una parada asignada.

**Decisión:** La fuente de verdad de la ruta en una fila es la asignación de la tarea a `logistics_route_stops`. El resumen debe mostrar el nombre de la ruta y su día/fecha operativa. Cuando no existe una asignación, debe decir `Ruta pendiente`; no se debe inferir una ruta solo por el día solicitado.

**Resultado:** El operador puede distinguir inmediatamente a qué recorrido pertenece cada caja y cuáles siguen pendientes de asignación.

### 2026-08-05 — LOG-036: Plantillas cuenta como asignación temporal de ruta

**Contexto:** Una solicitud pendiente podía aparecer simultáneamente en `Rutas → Plantillas` y en `Logística → Tareas` con la etiqueta `Ruta pendiente`. La solicitud ya tenía día y ruta elegidos por Ventas; lo pendiente era la confirmación de Logística.

**Decisión:** Una caja cuenta como asignada si cumple cualquiera de estas condiciones: tiene una parada activa en `logistics_route_stops`, o tiene una solicitud `pending` en `customer_route_assignment_requests` agrupada en `Plantillas`. La segunda condición representa una asignación temporal previa a crear la ruta `draft`.

**Reglas:**

- `Tareas → Activas` muestra únicamente cajas sin parada operativa y sin solicitud pendiente en `Plantillas`.
- Una solicitud pendiente en `Plantillas` no se etiqueta como `Ruta pendiente`; su estado es confirmación pendiente de Logística.
- Al crear la ruta, la solicitud pasa a parada de una ruta `draft`; la caja continúa fuera de `Tareas` y queda en `Rutas → Plantillas`.
- Al dejar pendiente, rechazar o liberar la solicitud con una acción auditada, deja de contar como asignada y puede volver a `Tareas` si su tarea sigue abierta.
- `Ruta pendiente` solo aplica cuando no existe ni solicitud en `Plantillas` ni parada activa.

**Resultado:** No se duplica una caja en la cola de tareas sin ruta y en la preparación de una ruta. La cola representa trabajo sin asignación; `Plantillas` representa trabajo asignado temporalmente a un recorrido que aún debe confirmarse.

### 2026-08-05 — LOG-037: recuperar solicitudes rechazadas desde Tareas

**Contexto:** Al rechazar o devolver una solicitud, la tarea vuelve a estar abierta y puede necesitar una nueva asignación. Sin un filtro, Logística tendría que buscarla mezclada con todas las cajas sin ruta.

**Decisión:** `Tareas` incorpora un filtro de situación de asignación con estas opciones: `Todas las situaciones`, `Sin ruta asignada`, `Rechazadas` y `Devueltas a pendiente`. Las solicitudes revisadas se identifican por la última decisión registrada para su tarea.

**Reglas:**

- Las solicitudes `rejected` y `deferred` permanecen fuera de Plantillas hasta que Ventas o Logística creen una nueva solicitud de ruta.
- El filtro usa la última solicitud revisada de la tarea; no revive una solicitud rechazada antigua si después existe una solicitud nueva pendiente o una parada activa.
- La fecha y la subruta conservadas en la solicitud revisada alimentan los filtros de día y ruta para que la caja pueda localizarse aunque la tarea haya sido reiniciada sin fecha confirmada.
- Una tarea rechazada o devuelta sigue siendo seleccionable desde Tareas para asignarla nuevamente a una ruta, respetando las validaciones normales de ubicación, fecha y cierre.

**Resultado:** Logística puede corregir un rechazo accidental o retomar una caja devuelta a pendiente sin perder el contexto ni crear una asignación silenciosa.

### 2026-08-06 - Rutas geográficas, horarios y ciclo de Plantillas


**Contexto:** La configuración anterior trataba cada subruta de un día como una “plantilla” y la aprobación logística creaba prematuramente un recorrido operativo.

**Decisión:** La identidad de ruta es estable e independiente del día. Cada ruta tiene modo `day_only` o `postal_codes`, uno o más horarios semanales, capacidad y ZIP Codes estadounidenses de cinco dígitos. Un ZIP puede pertenecer a varias rutas; día, hora y capacidad resuelven las opciones compatibles. Los días lunes–domingo siguen siendo interruptores maestros y una ruta general `day_only` cubre un día activo sin rutas nombradas.

Las solicitudes usan `pending_approval`, `template_confirmed`, `deferred`, `rejected` y `routed`. El chulito solo guarda la aprobación de la dirección exacta y deja la solicitud en Plantillas; únicamente `Crear ruta` crea `logistics_routes` y paradas. Una aprobación se identifica por cliente, ruta y huella normalizada de dirección; un cambio de dirección exige nueva evaluación. Las solicitudes pendientes y confirmadas reservan capacidad provisional.

Quitar un ZIP revoca las aprobaciones de ese ZIP y devuelve a Tareas las solicitudes aún no convertidas. Desactivar un horario hace lo mismo con sus reservas futuras. Archivar conserva historial. Ninguna de estas operaciones modifica retroactivamente recorridos ya creados.

**Resultado:** Ventas solo puede proponer rutas compatibles; una coincidencia se preselecciona, varias se muestran para elección y ninguna permite continuar sin ruta hacia Tareas. Crear ruta queda bloqueado mientras el grupo tenga aprobaciones pendientes y es transaccional e idempotente.

### 2026-08-07 - LOG-048: tablero de Logística por estado operativo

**Contexto:** Los filtros de fecha y la mezcla de reservas, plantillas y rutas publicadas podían ocultar trabajo pendiente.

**Decisión:** La entrada de Logística se organiza en cuatro secciones: `Por confirmar` muestra todas las solicitudes `pending_approval` sin filtro automático de fecha; `Plantillas` agrupa `template_confirmed` por fecha y subruta, además de rutas `draft`; `Rutas operativas` muestra la última versión publicada (`planned` o `in_progress`); e `Historial` muestra `completed` y `cancelled`. Rechazar exige motivo y devuelve la solicitud a Seguimiento mediante el flujo auditado existente. Una solicitud confirmada después de publicar permanece visible como cambio sin publicar y `Actualizar ruta` la incorpora transaccionalmente, repitiendo las validaciones de fecha, ZIP, capacidad y disponibilidad antes de volver a publicar.

**Resultado:** Configurar días, horarios o subrutas no oculta invoices. Cada solicitud conserva un estado visible hasta ser corregida, incluida en una plantilla, publicada o archivada.

### 2026-08-06 - LOG-044: programación directa de Logística

**Contexto:** El botón `Programar` de Logística representa una decisión operativa explícita, no una propuesta del vendedor que deba esperar otra aprobación.

**Decisión:** Cuando Logística programa una caja en una ruta geográfica, la solicitud se crea directamente como `template_confirmed` y la tarea queda con su confirmación de horario en `confirmed`. Todavía no se crea una ruta operativa ni una parada; eso ocurre únicamente al pulsar `Crear ruta`. Las propuestas de Ventas o las coincidencias `day_only` que no hayan sido confirmadas por Logística conservan `pending_approval`.

**Resultado:** Una caja programada por Logística aparece confirmada dentro de Plantillas y no vuelve a Tareas como si su ruta estuviera pendiente.

### 2026-08-09 - LOG-051: clave estable para reservas de rutas generales

**Contexto:** Una venta con día y horario válidos creaba correctamente el invoice y la tarea, pero no lograba enviar la solicitud a Logística cuando el día usaba la ruta general. Esas rutas no tienen zona geográfica (`zone_name` vacío), mientras que la solicitud requiere una clave de agrupación no vacía.

**Decisión:** Las solicitudes de una ruta general usan `day:{weekday}` como clave técnica estable; las rutas nombradas conservan su zona configurada y, si está vacía, usan `route:{route_definition_id}`. Esta clave identifica el grupo de reserva y no inventa cobertura geográfica.

**Resultado:** Seleccionar un día activo puede crear el invoice, la tarea y la reserva de Plantillas en el mismo flujo. Los invoices que ya quedaron creados por el fallo no se duplican: se completan desde `Reintentar entrega`.

### 2026-08-09 - LOG-052: Plantillas respetan el día y la semana seleccionados

**Contexto:** La pestaña `Rutas` filtraba el catálogo de rutas por el día seleccionado, pero la lista de solicitudes `template_confirmed` se calculaba por separado y podía mostrar grupos de otro día, como la ruta del jueves al consultar lunes.

**Decisión:** `Solicitudes listas para preparar` comparte el día y la semana operativa seleccionados con el catálogo superior. Solo muestra grupos cuya `route_date` pertenece a esa semana y cuyo índice de día coincide con el día activo; si no hay catálogo de días, conserva la lista completa para no ocultar reservas.

**Resultado:** Cambiar entre lunes, jueves u otro día actualiza conjuntamente las rutas y sus solicitudes de preparación, sin mezclar reservas de otra fecha operativa.

### 2026-08-09 - LOG-053: Preparación y rutas reales son etapas distintas

**Contexto:** La vista operativa mostraba al mismo tiempo el nombre de una ruta semanal configurada y, debajo, un grupo de solicitudes con un nombre similar. Esto hacía parecer que ambos bloques eran rutas reales o que la misma ruta estaba duplicada.

**Decisión:** El flujo visible se divide en `Por confirmar`, `Preparación`, `Rutas` e `Historial`. Aprobar una solicitud la mueve a un grupo de `Preparación`; no crea una ruta. `Crear ruta` convierte atómicamente ese grupo en una ruta real fechada con estado `draft` (`En preparación`) y la muestra en `Rutas`. `Cerrar ruta` conserva la transición existente a `planned` (`Cerrada`). Las definiciones semanales recurrentes permanecen en `Calendario y subrutas` y no se presentan como rutas operativas.

**Resultado:** Cada caja aparece en una sola etapa comprensible y la pestaña `Rutas` representa exclusivamente recorridos que ya existen en `logistics_routes`.

### 2026-08-09 - LOG-054: selección parcial dentro de Preparación

**Contexto:** Un grupo de Preparación puede contener solicitudes que Logística no desea convertir todas al mismo tiempo.

**Decisión:** `Crear ruta` procesa únicamente las solicitudes marcadas. La primera selección crea o reutiliza la ruta `draft` de esa fecha e identidad; las solicitudes no seleccionadas permanecen en `Preparación`. Una selección posterior se agrega a la misma ruta abierta mediante el comando idempotente existente. Cerrar la ruta conserva las reglas actuales y evita nuevas incorporaciones normales.

**Resultado:** Logística puede preparar un recorrido por partes sin duplicar rutas ni sacar del grupo solicitudes que todavía no ha elegido.

### 2026-08-09 - COND-001: la ruta asignada es la unidad de trabajo del conductor

**Contexto:** Las tareas del conductor y el inventario del camión aparecían como páginas principales separadas, aunque el conductor necesita completar un solo ciclo: identificar su ruta, preparar las cajas necesarias, ejecutar sus paradas y regresar con la carga recogida.

**Decisión:** La experiencia del conductor se organiza alrededor de una ruta operativa concreta asignada. Para esa ruta debe mostrar el total de paradas y el desglose entre entregas de caja vacía y recolecciones de caja llena. Las entregas determinan las cantidades y tipos de cajas vacías que deben cargarse al vehículo antes de iniciar; el cálculo proviene de las líneas reales de las tareas, no de asumir una caja por parada.

**Reglas:**

- Una ruta `planned` permite revisar paradas y preparar carga, pero no confirmar visitas hasta iniciarla y pasarla a `in_progress`.
- La carga requerida se deriva únicamente de las tareas `deliver_empty_box` de la ruta seleccionada. No se puede confirmar una entrega sin la caja correspondiente en el camión.
- Cada parada conserva su tipo (`deliver_empty_box` o `pickup_full_box`) y permite registrar `completada` o `no se pudo`.
- Una visita completada exige foto de evidencia. Una visita que no se pudo completar exige motivo y lo registra en el intento y la bitácora; no crea movimientos de entrega/recolección ni cobros ficticios.
- Completar una entrega descuenta la caja vacía del camión. Completar una recolección agrega la caja llena a la carga del vehículo para su posterior entrega en bodega.
- La parada muestra el depósito y el saldo pendientes del invoice. Cuando exista saldo cobrable, el conductor puede registrar el importe recibido o indicar que no recibió dinero; esto también debe estar disponible al recibir una caja llena si el invoice continúa debiendo el depósito.
- Un importe recibido se registra como pago del invoice y reduce su saldo. El invoice queda saldado únicamente cuando el saldo real llega a cero; un abono parcial conserva la diferencia pendiente y elegir `No recibí dinero` no modifica el saldo.
- El cierre o arqueo de la caja de efectivo del conductor queda fuera de esta etapa. Por ahora solo se registra quién recibió, cuánto, por qué método y en qué visita, con la auditoría e idempotencia existentes.

**Resultado:** El conductor puede preparar y ejecutar su ruta desde un mismo contexto sin separar artificialmente paradas, carga, evidencia y cobro, mientras inventario, pagos y bitácora conservan sus fuentes de verdad.

### 2026-08-09 - COND-002: resultado físico y cobro son decisiones independientes

**Contexto:** Puede ocurrir que el conductor deje correctamente una caja vacía pero no cobre el depósito porque el cliente no estaba presente o no pudo pagar. Tratar la falta de cobro como una entrega fallida inventaría un resultado físico incorrecto; tratarla como saldada perdería la deuda.

**Decisión:** Completar una entrega o recolección confirma únicamente que la operación física ocurrió. El resultado del cobro se registra por separado como importe completo, importe parcial o sin dinero recibido.

**Reglas:**

- Una caja vacía puede marcarse como entregada aunque no se cobre en esa visita, siempre que el conductor aporte la evidencia requerida e indique por qué no recibió el dinero.
- La ausencia del cliente no obliga por sí sola a marcar `No se pudo` cuando la caja sí fue dejada de forma permitida. `No se pudo` se reserva para una operación física que realmente no ocurrió.
- Elegir `No recibí dinero` exige una razón o nota operativa y conserva íntegro el depósito o saldo pendiente del invoice.
- Un cobro parcial reduce únicamente el importe recibido y conserva la diferencia pendiente.
- Cualquier visita posterior elegible, incluida la recolección de la caja llena, debe mostrar la deuda que siga abierta y permitir registrarla sin duplicar cobros.
- Evidencia, resultado físico, motivo de no cobro y pago quedan vinculados a la misma visita en la bitácora, pero conservan estados independientes.

**Resultado:** La operación refleja lo que ocurrió en la calle: la caja puede quedar entregada mientras el dinero continúa pendiente y trazable para cobrarse después.
### 2026-08-13 - Entrada exacta y referencia visual para remitentes y destinatarios

**Contexto:** Ventas necesita distinguir la dirección que Google valida de la puerta, portón o acceso que el cliente confirma manualmente.

**Decisión:** Remitentes y destinatarios conservan las coordenadas geocodificadas de su dirección y pueden guardar, de forma opcional, otro par de coordenadas para la entrada exacta. La confirmación puede incluir una nota para el conductor y la referencia de una vista de calle (panorama y orientación), pero no modifica calle, ciudad, estado ni código postal. Las nuevas instantáneas operativas conservan ambos puntos y la navegación logística prioriza la entrada confirmada.

**Resultado:** La cobertura de rutas continúa evaluándose con la zona de la dirección; el conductor navega al acceso real cuando fue confirmado y dispone de la referencia necesaria para encontrarlo.
### 2026-08-13 - País autoritativo para buscar direcciones de cada parte

**Contexto:** El buscador flotante de direcciones se usa tanto para remitentes como para destinatarios y no debe mezclar resultados de distintos países.

**Decisión:** Para el remitente, la búsqueda, las sugerencias y el centro inicial del mapa se restringen a USA. Para cada destinatario se usa exclusivamente el país seleccionado en su formulario; cambiar el país invalida cualquier dirección o entrada exacta que estuviera en borrador.

**Resultado:** Google devuelve ubicaciones dentro del país correspondiente a cada parte y el mapa no induce a seleccionar accidentalmente una dirección extranjera.
