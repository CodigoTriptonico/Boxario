# Guía de estilo e interacción de Boxario

## Identidad del estilo

El estilo de Boxario se define como **minimalismo funcional operativo con densidad controlada**.

### Perfil visual del usuario

El estilo preferido combina **minimalismo funcional, estetica industrial elegante, fondo oscuro, acentos verdes y acciones amarillas**. La interfaz debe verse bonita por su orden, equilibrio y utilidad, no por acumular decoracion.

Rasgos que deben conservarse:

- Tipografia fuerte, clara y facil de leer.
- Jerarquia visual directa y acciones ubicadas junto a su contexto.
- Espacio bien aprovechado, especialmente en celular.
- Elementos compactos, pero nunca amontonados ni solapados.
- Pocos adornos, contadores o badges; cada elemento debe justificar su lugar.
- Iconos y datos alineados como una sola unidad visual.

La interfaz puede manejar operaciones complejas, pero no debe presentar toda esa complejidad al mismo tiempo. La pantalla muestra primero lo necesario para completar la tarea actual y revela opciones adicionales únicamente cuando el usuario las solicita.

## Principios

### Regla estricta: sin encabezados introductorios

- No crear encabezados introductorios permanentes de página para repetir el nombre o la explicación del módulo.
- No reservar una franja solo para texto; la barra operativa y el contenido deben comenzar sin espacio artificial.

### Una superficie, no cajas dentro de cajas

- Una sección usa una superficie principal y divisores; evita encerrar cada dato en otra tarjeta.
- Reserva las tarjetas internas para elementos seleccionables, estados independientes o acciones que realmente necesiten un límite propio.
- Nunca escondas información necesaria para trabajar. La explicación opcional puede usar `CompactInfoDisclosure`.

### 1. Lo operativo va al frente

La información necesaria para tomar una decisión rápida debe estar visible sin abrir menús.

Ejemplos:

- Cantidad disponible de un artículo.
- Ubicación del artículo en bodega.
- Estado actual de una operación.
- Próxima acción requerida.

### 2. Divulgación progresiva

Los campos poco frecuentes, opcionales o administrativos deben permanecer contraídos.

Ejemplos:

- En una entrada de inventario, la cantidad está visible.
- Costos y proveedor viven en `Datos de compra`.
- Motivo y notas viven en `Motivo y detalle`.
- Edición y administración viven en `Más opciones`.

### 3. Jerarquía por frecuencia

Las acciones no deben tener el mismo peso visual.

Orden recomendado:

1. Acción principal.
2. Acciones operativas frecuentes.
3. Información o configuración opcional.
4. Acciones administrativas.
5. Acciones destructivas.

### 4. Sin información redundante

Si el sistema puede calcular un valor a partir de otro, no se muestran ambos campos simultáneamente como si fueran independientes.

Ejemplo:

- El usuario elige capturar costo por lote o costo por pieza.
- El sistema calcula el otro valor.

### 5. Consistencia entre formularios

Los mismos datos deben conservar el mismo orden y presentación.

Orden de contacto:

1. Nombre y apellido.
2. Correo.
3. Teléfono.

## Reglas de modales

### Tamaño

- El modal usa **altura natural y compacta**.
- No se fija una altura grande para evitar movimientos.
- No debe existir espacio vacío artificial.
- Se establece una altura máxima según la pantalla.
- Sólo aparece desplazamiento interno cuando el contenido excede esa altura máxima.

### Posición

- El modal se ancla en una posición estable cerca de la parte superior.
- Al expandir una sección, crece hacia abajo.
- No se vuelve a centrar según su nueva altura.
- Abrir o cerrar un bloque no debe provocar saltos de posición.

### Contenido

- La acción principal y el dato obligatorio aparecen primero.
- Las secciones opcionales están contraídas por defecto.
- El encabezado de una sección contraída muestra una pista breve de su contenido o estado.
- Ningún input, selector o botón puede rebasar el marco del modal.
- Los controles usan `box-sizing: border-box`, ancho máximo del 100 % y contenedores con `min-width: 0`.

### Botones

- Los botones finales deben ser grandes y fáciles de pulsar.
- En formularios compactos, `Cancelar` y `Guardar` ocupan cada uno media fila.
- La acción principal tiene el mayor contraste.
- Una acción deshabilitada debe explicar qué falta.

## Menús contextuales

- El menú de clic derecho no debe ser una lista larga de opciones equivalentes.
- Las acciones frecuentes aparecen primero y en formato compacto.
- Las acciones secundarias se agrupan bajo `Más opciones`.
- El menú no se cierra al desplazar su contenido con la rueda.
- Se cierra al elegir una acción, hacer clic fuera o presionar `Escape`.
- La información importante no debe existir únicamente dentro del menú contextual.

## Tarjetas y filas

- Una tarjeta responde rápidamente: qué es, cuánto hay, dónde está y cuál es su estado.
- La ubicación en bodega debe ser visible en la tarjeta y en la vista de filas.
- Los textos secundarios son discretos, pero legibles.
- Se evita llenar la tarjeta con acciones; las acciones viven en menús o flujos específicos.

## Formularios

- Se muestra primero lo obligatorio.
- Los campos opcionales se agrupan por propósito, no como una lista plana.
- Los títulos deben describir el dato con lenguaje operativo.
- Se evita pedir dos veces información que el sistema ya conoce.
- Los errores deben indicar cómo continuar, no únicamente que algo falló.

## Lista de comprobación para nuevas interfaces

- ¿La tarea principal se entiende en menos de cinco segundos?
- ¿Está visible únicamente lo necesario para empezar?
- ¿La información operativa importante requiere un clic innecesario?
- ¿Hay campos redundantes o calculables?
- ¿Las opciones poco frecuentes pueden contraerse?
- ¿El modal conserva su posición al cambiar de contenido?
- ¿Los botones principales son suficientemente grandes?
- ¿Existe algún desbordamiento horizontal?
- ¿El orden coincide con formularios equivalentes?
- ¿La interfaz refleja la fuente real de los datos?

## Registro de aclaraciones y decisiones

### 2026-07-25 — Advertencia de venta sin stock

- Una falta de stock no debe impedir crear la venta cuando el flujo lo permita.
- La advertencia debe ser visible, de tono ámbar y explicar que la venta quedó pendiente de inventario.
- La advertencia no debe confundirse con un error que deshace la venta.

### 2026-07-25 — Selección de remitente en celular

- Tocar un remitente debe marcarlo y avanzar inmediatamente al paso `Destinatario`.
- La carga de destinatarios es una dependencia opcional de la pantalla siguiente y debe ejecutarse en segundo plano.
- Una demora o fallo de esa consulta no debe dejar el toque sin respuesta ni bloquear el avance del flujo.

### 2026-07-25 — Regreso entre módulos en celular

- El encabezado móvil debe ofrecer un botón `Volver` funcional al entrar directamente a un módulo como `Seguimiento`.
- Al cambiar de módulo, el botón no debe conservar el callback de la pantalla anterior.
- El regreso debe tener un destino estable (`Inicio`) y no depender de que exista historial previo en el navegador.

### 2026-07-25 — Flecha interna de Nueva venta

- Dentro de `Nueva venta`, la flecha del encabezado representa `Paso anterior`, no regresar a la página visitada previamente ni salir del módulo.
- Desde `Destino`, `Caja`, `Logística` o `Final`, la flecha vuelve exactamente un paso y conserva la información ya seleccionada.
- En el primer paso (`Remitente`) la flecha no aparece porque no existe un paso anterior.
- Los pasos visibles de la franja siguen siendo tocables cuando ya están desbloqueados.

### 2026-07-26 — Modalidades dentro de Día y hora

- El bloque `Hora` permite elegir `Exacta`, `Antes de`, `A partir` o `Entre`.
- La modalidad se elige antes de los controles de hora y permanece dentro del primer paso del programador.
- `Entre` muestra dos horas; las demás modalidades muestran una sola.
- En celular, las cuatro modalidades comparten una sola barra horizontal compacta.
- Las sugerencias cambian con la modalidad: horas exactas, límites, inicios o rangos completos.
- Los resúmenes usan frases completas como `antes de 10:00 AM`, `a partir de 2:00 PM` y `entre 4:00 PM y 5:00 PM`.

### 2026-07-26 — Administrar sugerencias horarias

- El panel vive en `Configuración → Entrega y recolección`, junto a los rangos de servicio.
- Cada servicio administra por separado `Exacta`, `Antes de`, `A partir` y `Entre`.
- Las horas se muestran como chips removibles y se agregan con el mismo selector horario usado en la operación.
- En celular, las opciones deben envolver en varias líneas sin truncar valores ni crear una cuadrícula alta innecesaria.
- Las opciones de ruta muestran una señal breve de `Compatible`, `Revisar horario` o `Sin horario`; el detalle completo aparece al seleccionar la ruta.

## Preferencias rechazadas por el usuario

Este apartado conserva patrones de interfaz que el usuario ha rechazado para no repetirlos en nuevas pantallas.

### 2026-07-26 - Horario de ruta visible y disponibilidad separada

- En Logística, crear y editar una ruta debe mostrar `Hora de inicio` y `Fin estimado` como campos operativos.
- En Ventas, al seleccionar una ruta, mostrar debajo del selector `Horario de la ruta`, `Inicio` y `fin estimado` en modo solo lectura.
- Mantener la disponibilidad del cliente en su propio control y mostrar una advertencia ámbar cuando podría no coincidir.
- Usar el texto: `La disponibilidad del cliente podría no coincidir con el horario de la ruta. Verifica con Logística antes de confirmar.`
- La advertencia orienta y no deshabilita la acción de confirmar la venta.

### Formato para nuevas preferencias

```md
### FECHA - Preferencia UI: nombre breve

**No repetir:** patron o decision rechazada.

**Motivo:** que problema causo o que no gusto.

**Preferir:** alternativa aprobada.
```

### 2026-07-25 - Preferencia UI: texto completo en celular

**No repetir:** textos importantes truncados con `...`, números de teléfono cortados o pasos de un flujo escondidos fuera del ancho visible.

**Motivo:** En el celular no se puede leer bien la información ni confirmar qué opciones existen.

**Preferir:** envolver el texto y reorganizar los elementos en varias filas cuando sea necesario, manteniendo todos los pasos y datos importantes visibles sin corte.

### 2026-07-25 - Preferencia UI: datos fuera de las cinco columnas del paso a paso

**No repetir:** colocar nombres, países, teléfonos o detalles logísticos dentro de cada una de las cinco columnas del indicador de venta.

**Motivo:** En celular las columnas son demasiado estrechas; los teléfonos se parten, los nombres ocupan demasiadas líneas y el paso a paso se ve desordenado.

**Preferir:** mantener únicamente una franja compacta con check o número y nombre del paso; los datos completos pertenecen al contenido operativo de cada pantalla, no a un segundo resumen.

### 2026-07-25 - Preferencia UI: carrito fuera de la columna Caja

**No repetir:** incrustar el botón o panel del carrito dentro de la columna estrecha `Caja` del indicador de cinco pasos.

**Motivo:** La acción queda comprimida, parece agregada a la fuerza y rompe la alineación del paso a paso.

**Preferir:** ubicar el carrito como una acción compacta del encabezado, junto a notificaciones, y abrir su detalle en un panel flotante.

### 2026-07-25 - Preferencia UI: carrito fuera del contenido de la venta

**No repetir:** colocar el acceso o el detalle del carrito dentro del resumen del paso `Caja` o de cualquier bloque que agregue altura al contenido principal de la venta.

**Motivo:** Aunque tenga ancho completo, el carrito interfiere con la página, desplaza la tarea activa y se siente como parte del paso a paso.

**Preferir:** mostrar un icono compacto con contador junto a notificaciones; al tocarlo, abrir un panel flotante que no altere la distribución de la venta.

## Reglas extrapoladas de las correcciones de la venta

Estas reglas deben aplicarse a nuevas pantallas, especialmente en celular:

- **Compacto no significa apretado:** reducir espacio sin provocar cortes, saltos extranos, solapamientos o elementos sin alineacion.
- **El contenido principal manda:** encabezados, pasos y barras de herramientas deben ocupar solo el espacio necesario para dejar visible la tarea.
- **Una sola fila cuando los elementos pertenecen al mismo flujo:** busqueda y creacion deben vivir juntos; no separar una accion de su contexto.
- **La informacion secundaria se oculta antes de comprimir la principal:** quitar contadores, badges o etiquetas antes de reducir el espacio del nombre o del telefono.
- **Los datos no se truncan:** telefonos, nombres y estados importantes deben envolverse o recibir prioridad de ancho; nunca deben terminar en `...` sin una alternativa legible.
- **Icono y valor forman una unidad:** cada icono debe permanecer alineado con el dato que representa.
- **No usar tarjetas grandes para simples indicadores:** un avance de pasos debe ser una franja ligera y tocable cuando no necesita paneles de contenido.
- **Cada accion debe tener un lugar claro:** Nuevo, Buscar, Rapido y continuar deben distinguirse sin competir ni quedar aislados.
- **Revisar siempre el ancho mas pequeno:** antes de aprobar una interfaz, comprobar que no haya desbordamiento horizontal, texto cortado o controles que se monten entre si.

### 2026-07-25 - Preferencia UI: accion de Nuevo integrada al buscador

**No repetir:** dejar el boton Nuevo aislado en un renglon separado de la busqueda.

**Motivo:** Se ve desconectado del flujo y ocupa espacio sin aportar contexto.

**Preferir:** colocar Nuevo junto al buscador, como la accion para crear una persona cuando no existe o se necesita agregar otra.

### 2026-07-25 - Preferencia UI: sin contadores junto a acciones

**No repetir:** mostrar contadores como “1 remitente” o “1 destinatario” junto al botón Nuevo en la barra de la venta.

Esta preferencia también aplica a badges dentro de las tarjetas, como “1 dest.” o “1 ref.”.

**Motivo:** Añaden ruido visual y distraen de las acciones principales.

**Preferir:** dejar la barra enfocada en Nuevo, búsqueda y las acciones necesarias para continuar.

### 2026-07-25 - Preferencia UI: icono y dato alineados

**No repetir:** colocar el icono de teléfono u otro dato en una línea distinta de su texto.

**Motivo:** La relación entre el icono y la información se vuelve confusa y la tarjeta se ve desacomodada.

**Preferir:** mantener cada icono junto a su valor, alineado con la primera línea del texto y con espacio suficiente para que el dato sea legible.

### 2026-07-25 - Preferencia UI: indicador de pasos sin tarjetas en celular

**No repetir:** cuadros grandes alrededor de cada paso del flujo en pantallas pequeñas.

**Motivo:** Aunque el contenido quepa, el encabezado sigue ocupando demasiado espacio y se siente pesado.

**Preferir:** una sola franja delgada de pasos tocables, con el paso activo claramente marcado y sin paneles grandes.

### 2026-07-25 - Preferencia UI: encabezado compacto en celular

**No repetir:** usar tarjetas grandes para mostrar el avance de un flujo y ocupar la mayor parte de la pantalla antes del contenido principal.

**Motivo:** El usuario necesita ver el paso actual sin perder el espacio de trabajo para la operación.

**Preferir:** conservar los pasos visibles en una distribución compacta y reservar el espacio principal para la tarea activa.

### 2026-07-26 - Preferencia UI: sin resumen duplicado bajo los pasos

**No repetir:** mostrar debajo del indicador una tarjeta con el número, nombre y estado del paso activo.

**Motivo:** Repite la misma información de la franja superior, agrega altura innecesaria y desplaza la tarea principal.

**Preferir:** dejar solamente la franja compacta de cinco pasos y comenzar inmediatamente debajo con el contenido operativo del paso actual.

### 2026-07-26 - Preferencia UI: sin bloque informativo para ruta automática

**No repetir:** mostrar un bloque con `Ruta del día`, el nombre abreviado del día y textos como `Lun es la ruta (sin rutas con nombre)` cuando el sistema ya resolvió esa ruta automáticamente.

**Motivo:** El bloque no ofrece una decisión, repite el día seleccionado y agrega ruido dentro del modal.

**Preferir:** omitir esa información y mostrar directamente las acciones para dejar la ruta pendiente o continuar; conservar el selector únicamente cuando existan rutas nombradas para elegir.

### 2026-07-26 - Preferencia UI: programador logístico en dos pasos

**No repetir:** separar `Día y fecha`, `Ruta` y `Hora` en tres pasos cuando el flujo comienza por la fecha.

**Motivo:** La hora pertenece a la programación del día y el tercer paso alarga el modal innecesariamente.

**Preferir:** usar `Día y hora` como primer paso, con día, fecha y hora juntos, y `Ruta` como segundo paso; conservar las opciones de ruta pendiente cuando correspondan.

### 2026-07-26 - Preferencia UI: encabezado mínimo en el programador

**No repetir:** mostrar en el encabezado del programador títulos genéricos como `Aceptar entrega` o `Aceptar recolección`, seguidos del número de invoice y el nombre del cliente.

**Motivo:** Esa información no es necesaria para elegir día, hora y ruta, repite el contexto de la venta y ocupa demasiado espacio en celular.

**Preferir:** conservar únicamente el icono y el nombre corto de la operación, como `Dejar caja vacía` o `Recoger caja llena`.

### 2026-07-26 - Preferencia UI: modalidades horarias compactas y contextuales

**No repetir:** distribuir `Exacta`, `Antes de`, `A partir` y `Entre` en una cuadrícula alta de dos filas ni mantener los mismos atajos para todas.

**Motivo:** La cuadrícula ocupa demasiado espacio vertical y las sugerencias genéricas obligan al usuario a interpretar cómo aplican a cada modalidad.

**Preferir:** mostrar las cuatro modalidades en una sola barra horizontal; debajo, ofrecer horas adecuadas para la modalidad elegida y rangos completos cuando se selecciona `Entre`.

### 2026-07-26 - Preferencia UI: barra logística compacta en celular

**No repetir:** mostrar al mismo tiempo, en varias filas permanentes, el alcance, estado, búsqueda, día, ruta, tipo de tarea, filtros y navegación de secciones.

**Motivo:** Los controles desplazan la lista operativa hasta ocupar cerca de media pantalla y hacen que las opciones secundarias estorben durante el trabajo.

**Preferir:** conservar visibles únicamente el estado, la búsqueda y los filtros rápidos de día y ruta; agrupar la navegación de secciones y los filtros adicionales en menús compactos superpuestos que no cambien la altura del contenido.

### 2026-07-26 - Preferencia UI: una sola fila permanente en logística móvil

**No repetir:** considerar compacta una barra logística de tres o cuatro filas permanentes, aunque cada control tenga poca altura; tampoco dejar la fecha visible por un conflicto de estilos responsivos.

**Motivo:** El conjunto de estado, sección, búsqueda, día, ruta y fecha sigue desplazando la lista y ocupa una porción excesiva de la pantalla.

**Preferir:** mostrar permanentemente sólo una fila con búsqueda y un botón de filtros; colocar estado, navegación logística, día, ruta, fecha y filtros secundarios dentro de un panel superpuesto que se abre únicamente cuando el usuario lo solicita.

### 2026-07-26 - Preferencia UI: configuración de entregas por secciones

**No repetir:** mostrar en una sola pantalla el cobro, rutas, rangos, sugerencias de entrega, sugerencias de recolección y reglas generales, con ambos editores de sugerencias abiertos al mismo tiempo.

**Motivo:** La pantalla se vuelve extensa, repetitiva y difícil de entender, especialmente en celular.

**Preferir:** separar la configuración en tres secciones: `Rutas`, `Sugerencias` y `Reglas`; mostrar un solo editor de sugerencias a la vez y usar un selector `Dejar`/`Recoger` cuando los horarios no estén vinculados.

### 2026-07-26 - Preferencia UI: configuración junto al eje de trabajo

**No repetir:** concentrar depósito, horarios de vendedor, rangos operativos y cargos logísticos en una pantalla general extensa llamada `Entrega y recolección`.

**Motivo:** mezcla responsabilidades, duplica controles y obliga a cada encargado a salir de su página habitual para encontrar opciones de su trabajo.

**Preferir:** ubicar `Configuración de ventas` dentro de Seguimiento y `Configuración de logística` dentro de Logística; ambas deben tener acceso directo y visible sólo para quien posee el permiso correspondiente.

### 2026-07-27 - Preferencia UI: no duplicar los días de Rutas

**No repetir:** mostrar botones de lunes a domingo para entregar o recoger dentro de `Configuración de logística`.

**Motivo:** los días ya se seleccionan en Rutas; repetirlos crea dos lugares aparentes para controlar el mismo calendario.

**Preferir:** administrar los días y horarios exclusivamente en `Logística → Rutas` y dejar en Configuración sólo la anticipación y los cargos.

### 2026-07-27 - Preferencia UI: horario junto a la ruta

**No repetir:** mostrar editores globales de rangos para `Entregar` y `Recoger` fuera del catálogo semanal de Rutas.

**Motivo:** el horario pertenece a una ruta concreta; un mismo lunes puede usar un horario general o contener varias rutas con ventanas diferentes.

**Preferir:** al activar un día, facilitar la captura de su `Horario general`; si se crean rutas dentro del día, mostrar `Hora de inicio` y `Fin estimado` en cada ruta. Las sugerencias `Entre` de Ventas se derivan de esas ventanas.

### 2026-07-27 - Preferencia UI: horario general dentro de la tarjeta del día

**No repetir:** colocar el editor del horario general en la sección inferior, mostrar la ruta general como una ruta nombrada o abrir un formulario precargado con `Ruta del lunes` al activar el día.

**Motivo:** el horario general define directamente la disponibilidad del día y se entiende mejor junto al interruptor que lo activa; repetirlo abajo mezcla dos niveles distintos.

**Preferir:** mostrar inicio y fin dentro de cada tarjeta semanal. La sección inferior se titula `Subrutas`, permanece vacía inicialmente y sólo contiene divisiones nombradas que el usuario decida crear con horario propio.

### 2026-07-26 - Preferencia UI: una sola Bitácora por envío

**No repetir:** separar contactos, fallas del conductor, cobros y cambios logísticos en ventanas o listas que aparentan ser historiales distintos.

**Motivo:** provoca duplicados y dificulta entender qué ocurrió realmente con el cliente y el envío.

**Preferir:** una línea de tiempo cronológica con una sola caja de captura y categoría; mostrar en la tarjeta los indicadores `Editada`, `Eliminada`, `Pendiente`, `Hoy` o `Vencido`, y mantener visibles evidencia y próximo paso.

### 2026-07-27 - Preferencia UI: sin barra fija de Guardar en configuración

**No repetir:** encabezado permanente con título, descripción y botón `Guardar` siempre visible en pantallas de configuración (p. ej. logística).

**Motivo:** Ocupa espacio, repite el nombre del módulo y obliga a un guardado explícito aunque no haya cambios.

**Preferir:** empezar directo con el contenido; el botón `Guardar cambios` aparece sólo cuando hay modificaciones pendientes (o guardar automáticamente si el flujo lo permite sin riesgo de valores a medias).

### 2026-07-27 - Preferencia UI: decir empresa, no paquetería

**No repetir:** llamar `paquetería` / `paqueteria` a la organización cliente, ni usar ese término en copy de producto, placeholders o facturas.

**Motivo:** el producto se llama Boxario; el nombre anterior del proyecto ya no debe aparecer en la interfaz.

**Preferir:** usar `empresa` para la organización cliente (p. ej. `Nueva empresa`, `Crear empresa`, `Gestión completa de la empresa`) y, en facturas, textos neutros como `Cajas y envíos internacionales`.
