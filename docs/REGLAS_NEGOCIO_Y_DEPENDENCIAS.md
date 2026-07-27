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

## Mapa inicial de dependencias

| Fuente de verdad | Dato | Consumidores | Regla |
|---|---|---|---|
| Logística → Rutas | Días disponibles | Ventas, programación de entregas y recolecciones | Ventas sólo ofrece los días activados en Logística. |
| Logística → Rutas | Rutas semanales | Ventas, tareas logísticas | Las rutas ofrecidas en una venta provienen del catálogo de Logística. |
| Inventario | Stock por bodega | Ventas, bodega, asignaciones | Ningún módulo puede ofrecer más existencia que el stock disponible. |
| Bodega | Ubicaciones y cantidades por estante | Inventario | La ubicación visible en las tarjetas proviene de las existencias ubicadas en bodega. |
| Inventario | Movimientos | Historial, costos y auditoría | Toda entrada, salida o ajuste genera una traza auditable. |
| Configuración comercial | Países y precios | Ventas, catálogo | Ventas consume países y precios configurados; no crea precios implícitos. |

### 2026-07-27 — LOG-007: días administrados únicamente en Rutas

**Contexto:** La configuración logística volvió a mostrar selectores de días para entregar y recoger, aunque esos días ya se administran en el catálogo semanal de Rutas.

**Decisión:** `Logística → Rutas` es la única fuente de verdad para activar o desactivar días operativos. `Logística → Configuración` sólo administra anticipación y cargos sugeridos, y ningún guardado desde esa pantalla puede modificar días ni horarios.

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

### INV-002 — Costos de entrada

**Fuente:** entrada de inventario.

**Reglas:**

- El usuario captura costo por lote o costo por pieza.
- El sistema calcula automáticamente el valor complementario.
- Ambos valores representan la misma compra y no son entradas independientes.
- Los costos no aplican a salidas o ajustes salvo que una regla futura lo establezca expresamente.

### INV-003 — Proveedor de una entrada

**Fuente:** usuario que registra la entrada.

**Destino:** evidencia estructurada del movimiento.

**Reglas:**

- El proveedor pertenece al movimiento de entrada, no al stock acumulado.
- Entradas distintas del mismo artículo pueden tener proveedores diferentes.
- El proveedor debe aparecer en el historial del movimiento.

### BOD-001 — Ubicación física

**Fuente:** Bodega → ubicaciones y stock por estante.

**Consumidor:** tarjetas y filas de Inventario.

**Reglas:**

- La ubicación es información operativa visible, no una opción escondida.
- Una tarjeta puede resumir varias ubicaciones.
- Si existen más ubicaciones de las que caben, se muestran las principales y un contador adicional.
- Cambiar o transferir una ubicación actualiza el resumen visible.
- La suma ubicada no puede superar el stock disponible en la bodega.

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

## Pendientes para el mapa completo

- Ciclo completo de una venta.
- Relación entre venta, factura, pagos y saldo.
- Reserva y descuento de inventario.
- Entrega y recolección de cajas.
- Creación, asignación y cierre de tareas logísticas.
- Custodia física de paquetes.
- Transferencias entre bodegas.
- Inventario asignado a empleados y conductores.
- Precios por país, grupo y entidad.
- Reglas de permisos por rol.
- Cancelaciones, reversos y conservación de auditoría.
- Flujo financiero entre Boxario, vendedores, agencias y matriz.

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

**Fuente:** Seguimiento → Configuración de ventas para `Exacta`, `Antes de` y `A partir`; Logística → Rutas para `Entre`.

**Consumidores:** Ventas → programador de entrega o recolección.

**Reglas:**

- Las sugerencias de `Exacta`, `Antes de` y `A partir` son configurables por empresa.
- Las sugerencias de `Entre` provienen del inicio y fin de las rutas disponibles para el día elegido.
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
- El sistema muestra una advertencia visible para que el operador atienda el faltante.
- Cuando exista stock, la operación posterior de inventario conserva sus controles y auditoría.

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
- Conductores sólo ven la información operativa de sus tareas y sus propios resultados; las notas comerciales y financieras siguen siendo internas.

### 2026-07-26 — FIN-003: cargos logísticos adicionales opcionales

**Contexto:** Entregar o recoger normalmente forma parte del envío, pero algunas operaciones necesitan un cargo excepcional.

**Decisión:** Logística mantiene una sugerencia general independiente para entrega y recolección. El cargo comienza apagado y Ventas decide si lo aplica cuando participa un conductor.

**Reglas:**

- El cargo se aplica una vez por servicio y nunca por caja ni por país.
- Si Ventas usa la sugerencia no necesita explicación.
- Si modifica el importe, la razón es obligatoria.
- El servidor vuelve a cargar la sugerencia, valida la razón y recalcula total, depósito y saldo.
- Se conservan sugerencia, importe aplicado, razón, vendedor y fecha.
- La venta normal y la venta rápida usan la misma validación.
- El envío muestra `Cargo logístico adicional` y `Tarifa ajustada` cuando corresponde.
