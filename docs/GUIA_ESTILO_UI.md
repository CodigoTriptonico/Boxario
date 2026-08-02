# Guía de estilo e interacción de Boxario

### 2026-08-02 - Preferencia UI: motivo de ruta activa con modal

**No repetir:** pedir el motivo de un cambio en ruta `in_progress` con `window.prompt` o un campo suelto fuera de diálogo.

**Motivo:** en móvil y escritorio el prompt nativo es frágil, poco accesible y no muestra contexto de ruta/parada.

**Preferir:** modal dedicado (`LiveRouteChangeReasonDialog`) con contexto, motivo obligatorio (≥3) y confirmación explícita. El estado del formulario se reinicia al abrir mediante remount (`key`), no con `setState` en `useEffect`.

### 2026-08-02 - Preferencia UI: excepción administrativa visible

**No repetir:** completar tareas administrativas saltando la máquina de estados sin UI de riesgo explícita.

**Motivo:** la excepción debe ser consciente, auditable y difícil de confundir con el flujo normal del conductor.

**Preferir:** modal de excepción (`LogisticsAdminTaskExceptionDialog`) con motivo, checkbox de riesgo y auditoría; remount al abrir para limpiar estado sin efectos.

### 2026-08-01 - Preferencia UI: mostrar las cuatro modalidades configuradas

**No repetir:** ocultar `Entre` solo porque todavia no tiene rangos guardados, ni mostrar horarios predeterminados cuando el grupo del dia esta vacio.

**Motivo:** la categoria debe poder configurarse manualmente y el usuario debe ver exactamente la disponibilidad que definio.

**Preferir:** mostrar `Entre` si esta habilitado, aunque no tenga presets, y mantener vacios los grupos sin horas.

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

- No crear encabezados permanentes de página para repetir el nombre o la explicación del módulo.
- No crear encabezados introductorios permanentes de página.
- No reservar una franja solo para texto; la barra operativa y el contenido deben comenzar sin espacio artificial.
- Sí conservar contexto operativo indispensable: nombre de un registro seleccionado, estado, paso activo, título de modal u otra señal sin la cual la tarea pierde sentido.
- La ayuda opcional usa `CompactInfoDisclosure`. Abrir la ayuda no debe empujar ni redimensionar el contenido.

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

### 2026-07-31 - Preferencia UI: stock pendiente en Notificaciones

**No repetir:** banner fijo de “Advertencia de inventario” bajo el estado verde de invoice creado en el paso Final.

**Motivo:** compite con el éxito de la venta y se pierde al salir de la pantalla.

**Preferir:** toast informativo breve + ítem pendiente en la campanita de Notificaciones (sección “Pendiente de inventario”), con enlace a Seguimiento. Los fallos de ruta con Reintentar sí permanecen en el paso Final.

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

> **Actualizado el 2026-07-31.** La ubicación original `Configuración → Entrega y recolección` quedó obsoleta (la sección `deliveries` redirige a Seguimiento). Ubicaciones vigentes:

> **Vigencia actualizada el 2026-08-01:** las listas de sugerencias que se muestran en Ventas ya no deben administrarse desde Logística ni desde una configuración global por día. Logística sólo edita el horario operativo de las rutas; Ventas obtiene sus atajos del historial del cliente, conforme a LOG-014.
>
> | Dato | Ubicación |
> |---|---|
> | Depósito mínimo | `Seguimiento → Configuración de ventas` |
> | Preferencia horaria del cliente (`Exacta`, `Antes de`, `A partir`, `Entre`) | Programador de Ventas, tomada del historial del cliente |
> | Días y horarios operativos | `Logística → Rutas` |
> | Cargos sugeridos de conductor y anticipación | `Configuración → Costos → Operativos` |

- No existe un panel global para que Logística administre las horas que ve Ventas.
- El programador de Ventas muestra una superficie compacta de `Preferencia del cliente`, con sugerencias del historial del mismo cliente y del mismo tipo de operación. Las modalidades disponibles son `Exacta`, `Antes de`, `A partir` o `Entre`.
- `Entre` conserva sus dos límites; una sugerencia histórica puede cargarse en el selector y editarse antes de guardarla como solicitud.
- Las horas o rangos se muestran como chips reutilizables y removibles. El chip representa una preferencia solicitada, no un horario confirmado.
- Si no hay historial del cliente, el editor queda vacío y permite continuar sin hora solicitada; no restaura valores predeterminados ni inventa disponibilidad.
- En celular, las opciones deben envolver en varias líneas sin truncar valores ni crear una cuadrícula alta innecesaria.
- Las opciones de ruta muestran una señal breve de `Compatible`, `Revisar horario` o `Sin horario`; el detalle completo aparece al seleccionar la ruta.

## Preferencias rechazadas por el usuario

Este apartado conserva patrones de interfaz que el usuario ha rechazado para no repetirlos en nuevas pantallas.

### 2026-07-31 - Preferencia UI: modalidades horarias por día

**No repetir:** obligar a mostrar `Exacta`, `Antes de` y `A partir` como opciones activas en todos los días de ruta.

**Motivo:** cada ruta puede aceptar una modalidad distinta; por ejemplo, el lunes puede trabajar únicamente con `A partir`.

**Preferir:** permitir activar o desactivar cada modalidad por día, conservar sus horas o rangos al ocultarla, ofrecer una acción compacta para restaurarla, editar una modalidad a la vez y ocultarla también en la captura de Ventas para ambas operaciones.

### 2026-08-01 - Preferencia UI: sugerencias compartidas por ruta

**No repetir:** mostrar un selector separado de `Entrega` y `Recolección` en Sugerencias de horario cuando ambas usan la misma ruta operativa.

**Motivo:** obliga a configurar dos veces los mismos atajos y puede hacer que entrega y recolección presenten horarios diferentes para una sola ruta.

**Preferir:** seleccionar únicamente el día de ruta y administrar una lista compartida de modalidades y horas para ambas operaciones.

### 2026-08-01 - Preferencia UI: desactivación explícita de modalidades

**No repetir:** colocar una `X` pequeña junto a cada modalidad activa en la barra de selección.

**Motivo:** es fácil tocarla por accidente al cambiar de modalidad y desactivar una opción sin intención.

**Preferir:** mantener la barra sólo para seleccionar modalidades y usar un icono de ocultar con tooltip `Desactivar modalidad` dentro del editor activo.

### 2026-08-01 - Preferencia UI: chips editables y eliminación separada

**No repetir:** hacer que tocar el chip completo de una hora o rango lo elimine, o usar la misma zona para editar y borrar.

**Motivo:** el usuario necesita poder corregir una hora sin perderla por un toque accidental.

**Preferir:** tocar el texto de la hora o del rango para cargarlo en el selector y editarlo; reservar la `X` lateral exclusivamente para eliminarlo.

### 2026-08-01 - Preferencia UI: contexto compacto en sugerencias

**No repetir:** volver a mostrar el título `Sugerencias de horario` y una explicación larga dentro de la pestaña que ya tiene ese nombre.

**Motivo:** ocupa varias líneas antes de llegar al selector de días y repite contexto evidente.

**Preferir:** mostrar sólo `Día de ruta` y sus controles; el nombre de la pestaña ya funciona como contexto.

### 2026-08-01 - Preferencia UI: selector de día junto a su etiqueta

**No repetir:** empujar el selector de día al extremo opuesto de la pantalla cuando sólo acompaña a la etiqueta `Día de ruta`.

**Motivo:** crea un vacío visual innecesario y separa una etiqueta de su control.

**Preferir:** mantener `Día de ruta` y todos los botones de lunes a domingo agrupados; los días no activos se muestran apagados y bloqueados.

### 2026-08-01 - Preferencia UI: pestaña como contexto de reglas

**No repetir:** volver a mostrar `Reglas de venta` y una explicación introductoria dentro de la pestaña `Reglas`.

**Motivo:** el nombre de la pestaña ya identifica el contenido y el texto desplaza innecesariamente los controles.

**Preferir:** comenzar directamente con los campos de reglas.

### 2026-08-01 - Preferencia UI: selector horario de ancho estable

**No repetir:** permitir que el panel del selector de hora se contraiga según el ancho del campo que lo abrió.

**Motivo:** el mismo selector aparece con tamaños diferentes y algunas opciones quedan comprimidas.

**Preferir:** mantener un ancho amplio y constante, como el selector de referencia grande.

### 2026-08-01 - Preferencia UI: calendario de fecha con ancho estable

**No repetir:** dejar que el calendario de fecha se contraiga según el ancho del campo que lo abre.

**Motivo:** rompe la proporción de la cuadrícula y hace que el calendario se vea diferente al selector de hora.

**Preferir:** usar un panel de ancho fijo con el mismo borde, fondo, radio y sombra del selector de hora.

### 2026-08-01 - Preferencia UI: minutos en intervalos de cinco

**No repetir:** mostrar los 60 minutos individuales en el selector de hora.

**Motivo:** para programar entregas y recolecciones, minutos como `12` o `47` agregan ruido y no representan horarios habituales.

**Preferir:** ofrecer `00, 05, 10, 15...55`.

### 2026-08-01 - Preferencia UI: encabezado compacto del selector de minutos

**No repetir:** usar instrucciones largas que se partan en varias líneas dentro del encabezado del selector.

**Motivo:** `Hora` se veía cortado y `Elige el minuto` ocupaba demasiado espacio.

**Preferir:** eliminar las etiquetas auxiliares y usar directamente los valores superiores como controles.

### 2026-08-01 - Preferencia UI: período AM/PM sin repetición

**No repetir:** mostrar el período (`AM` o `PM`) en el encabezado y nuevamente en los botones de selección.

**Motivo:** duplica información dentro de un panel pequeño.

**Preferir:** mostrar `AM` y `PM` únicamente como controles seleccionables.

### 2026-08-01 - Preferencia UI: ocultar modalidades horarias desactivadas

**No repetir:** mostrar en Ventas las categorías `Exacta`, `Antes de`, `A partir` o `Entre` cuando fueron desactivadas para el día en Logística.

**Motivo:** el usuario interpreta que una modalidad desactivada no está disponible; dejarla visible genera opciones falsas.

**Preferir:** renderizar únicamente las modalidades habilitadas para el día seleccionado.

### 2026-08-01 - Preferencia UI: campos de rango compactos

**No repetir:** estirar los dos campos de hora de `Entre` para ocupar todo el ancho de la página.

**Motivo:** una hora necesita poco espacio y el rango se percibe desproporcionado.

**Preferir:** limitar los campos a un ancho compacto y mantenerlos juntos con la acción de agregar.

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

### 2026-07-28 - Preferencia UI: libreta de envíos desde Último envío

> **Histórico — reemplazada el 2026-07-29.** La auditoría ya no vive en la libreta ni se abre con `Auditoría completa`. Fuente vigente: decisión **2026-07-29 — Expediente del envío**.

**No repetir:** dejar `Último envío` como etiqueta pasiva sin acceso al historial, ni abrir otra pantalla fuera de Ventas para consultar envíos previos de un destinatario.

**Motivo:** el vendedor necesita revisar envíos anteriores al mismo destinatario (estado, cobro, auditoría) cuando le preguntan o debe confirmar datos.

**Preferir (histórico):** al hacer clic en `Último envío`, abrir un panel lateral tipo libreta con el listado de envíos del remitente actual hacia ese destinatario; marcar el más reciente como `Último` y, al elegir uno, mostrar resumen y auditoría del envío en el mismo panel con opción de volver al listado. Incluir acción `Abrir en Seguimiento` que lleve a `/seguimiento` con el invoice expandido (bitácora, cobros, seguimiento logístico); usar `Auditoría completa` solo si se necesita el panel de auditoría global.

### 2026-07-29 - Preferencia UI: un solo acceso a Seguimiento por envío

**No repetir:** mostrar `Abrir en Seguimiento` tanto en una tarjeta del listado como dentro del detalle del mismo envío.

**Motivo:** duplica la misma acción y añade ruido visual sin aportar otro flujo.

**Preferir (histórico):** mostrar el acceso una sola vez dentro del detalle seleccionado, junto a `Auditoría completa`.

### 2026-07-29 - Preferencia UI: Expediente del envío

**No repetir:** duplicar auditoría, documentos o finanzas completas dentro de la libreta de `Último envío` o dentro de Seguimiento; volver a usar `Auditoría completa` como acceso separado; agregar una fila o bloque nuevo en Seguimiento solo para `Ver expediente`; colocar `Abrir en Seguimiento` también en el listado de la libreta.

**Motivo:** Seguimiento debe seguir siendo la superficie operativa compacta; la libreta de Ventas solo necesita un resumen rápido; la documentación completa, cajas, finanzas consultivas y auditoría deben vivir en una sola superficie documental sin competir con cobros, bitácora o reprogramaciones.

**Preferir:**
- En el detalle seleccionado de `Último envío` mostrar solo `Abrir en Seguimiento` y `Ver expediente`.
- La auditoría vive dentro del expediente, no en la libreta ni como overlay global obligatorio.
- Seguimiento conserva su diseño actual y agrega un único botón compacto `Ver expediente` dentro del bloque de acciones existente de cada envío (junto a bitácora, favorito o `Cobrar`), sin desplazar ni rediseñar esas acciones.
- `Ver expediente` abre `/seguimiento/[shipmentId]/expediente` usando el identificador interno del envío.
- Desde el expediente, `Abrir en Seguimiento` regresa al mismo shipment enfocado en `/seguimiento`.

### 2026-07-29 - Preferencia UI: lectura documental del expediente

**No repetir:** presentar el expediente como una secuencia plana de párrafos, controles y divisores sin una jerarquía visual clara entre identificación, contexto, documentos y detalle operativo.

**Motivo:** dificulta identificar rápidamente el invoice abierto y hace que una consulta documental extensa se perciba como una pantalla de configuración.

**Preferir:** una única superficie documental con cabecera compacta, estado visible, contexto resumido en columnas y secciones con títulos, iconos discretos y separación editorial. Mantener las acciones de impresión junto al documento y evitar tarjetas anidadas para cada campo.

**Ancho:** el expediente debe ocupar el ancho disponible del área de trabajo, con márgenes laterales compactos de seguridad. No limitarlo a una columna estrecha en pantallas de escritorio cuando el contenido puede beneficiarse de columnas más legibles.

**Orden:** la barra de pestañas es el primer elemento de la superficie. El contexto del envío y el contenido de la pestaña seleccionada se muestran debajo; no intercalar la navegación entre ambos.

**Integración con el panel:** el expediente utiliza la misma superficie continua (`contentEdgeToEdge`) de Nueva venta y los espacios de trabajo operativos. No añadir un segundo margen lateral que lo separe innecesariamente del menú lateral.

**Color base:** utilizar el tono operativo oscuro `#1a221f` como superficie del expediente, con barras `#1c2622` ligeramente elevadas. No usar la superficie clara genérica (`bg-surface-card`) como fondo dominante.

**No repetir:** envolver el expediente completo en una tarjeta redondeada con sombra, y después dividir su contexto en celdas bordeadas como si fueran tarjetas dentro de esa tarjeta.

**Preferir:** una superficie continua sin marco exterior ornamental; ordenar contexto y métricas con espacios y divisores puntuales, reservando los controles encapsulados únicamente para acciones o pestañas.

**Detalle accionable:** las direcciones con datos suficientes deben permitir abrir una búsqueda de mapa en una nueva pestaña. La información financiera debe diferenciar visualmente total, abono requerido, abonado, saldo y el estado explícito del abono; no usar sólo el rótulo genérico `Pagado`.

**Navegación:** no mostrar una pestaña por cada bloque de datos del expediente. Mantener sólo `Resumen`, `Documentos` y `Registro`; Registro organiza cajas, finanzas, logística y auditoría mediante secciones consecutivas y divisores.

**Móvil:** la superficie principal de cada espacio de trabajo debe declarar `w-full` y aprovechar el ancho disponible del panel. No dejar una columna angosta o un margen derecho residual cuando no hay navegación lateral visible.

La barra de navegación móvil tampoco debe limitarse con `max-w-*`: sus cuatro acciones se distribuyen en todo el ancho disponible para que `Más` quede en el extremo derecho funcional de la pantalla.


### 2026-07-28 - Preferencia UI: sin botón Recientes en paso de remitentes

**No repetir:** botón, menú o sección `Recientes` en la barra de herramientas del paso de remitentes en envíos.

**Motivo:** El usuario pidió quitar esa accesibilidad rápida del paso; ocupaba espacio en la barra y no aportaba al flujo actual.

**Preferir:** barra de remitentes solo con buscador y acción de nuevo remitente; la selección se hace desde la lista o el buscador.


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

### 2026-07-31 - Preferencia UI: carrito lleno como acción amarilla

**No repetir:** dejar el carrito con ítems en el mismo tono verde apagado que el resto de iconos del encabezado.

**Motivo:** se confunde con controles secundarios y es fácil olvidar que hay productos pendientes.

**Preferir:** vacío = icono neutro; con productos = relleno ámbar/naranja de acción (mismo lenguaje que el badge `xN` de cajas), contador oscuro contrastado; abierto = ámbar sólido.

### 2026-07-31 - Preferencia UI: panel del carrito anclado al botón

**No repetir:** abrir el panel del carrito fijo en una esquina de la pantalla lejos del icono que se tocó.

**Motivo:** obliga a mirar al otro lado y desconecta la acción del resultado.

**Preferir:** posicionar el panel justo debajo del botón del carrito (`[data-sale-header-cart]`), alineado a su borde derecho y dentro del viewport.

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

### 2026-07-31 - Preferencia UI: configuración de ventas en una sola superficie

**No repetir:** encabezado grande con `Guardar` permanente, dos bloques abiertos con el mismo título de horarios para Entrega y Recolección, ni tarjetas anidadas para cada modalidad.

**Motivo:** duplica la jerarquía, ocupa espacio vertical y obliga a comparar dos editores iguales aunque solo se configure una operación a la vez.

**Preferir:** una superficie continua que agrupe las pestañas `Reglas` y `Sugerencias de horario`; dentro de la pestaña activa, el día de ruta muestra un solo editor compartido para entrega y recolección, usando una barra compacta para `Exacta`, `Antes de`, `A partir` y `Entre`. `Guardar cambios` solo aparece cuando las reglas generales tienen modificaciones pendientes; los atajos horarios conservan su guardado inmediato.

**Ancho:** la configuración de ventas usa todo el ancho disponible del espacio de trabajo (`contentEdgeToEdge` + `w-full`); no dejar una columna centrada con espacio vacío a ambos lados.

### 2026-07-31 - Preferencia UI: configuración de ventas separada en pestañas

**No repetir:** mostrar `Reglas` y `Sugerencias de horario` abiertas simultáneamente en la misma pantalla.

**Motivo:** mezcla dos tareas distintas y vuelve a alargar la superficie aunque solo se esté editando una de ellas.

**Preferir:** pestañas principales `Reglas` y `Sugerencias de horario`; solo se renderiza el contenido activo. Dentro de sugerencias permanece el selector secundario `Entrega`/`Recolección`.

### 2026-07-31 - Preferencia UI: sugerencias según el día de Rutas

**No repetir:** mostrar una sola lista global de horas o crear en Ventas un segundo selector para activar lunes, martes y los demás días.

**Motivo:** las rutas ya son la fuente de verdad del calendario; una lista global no permite reflejar que cada día puede operar con horarios y necesidades distintas.

**Preferir:** mostrar sólo los días activos de `Logística → Rutas` como selector compacto dentro de `Sugerencias de horario`. Al elegir un día, mostrar sus sugerencias de `Entrega` o `Recolección`; si no hay días activos, orientar a `Rutas` para activar uno.

### 2026-08-01 - Preferencia UI: esperar el día antes de mostrar horas

**No repetir:** mostrar `Horas frecuentes` o el campo de hora cuando el modal de Ventas todavía no tiene un día de ruta elegido.

**Motivo:** las horas pertenecen al día seleccionado; mostrarlas antes hace parecer que son globales y puede hacer que el usuario elija una hora equivocada.

**Preferir:** mantener la sección de hora oculta hasta seleccionar un día activo. Después de elegirlo, cargar únicamente sus modalidades y atajos configurados.

### 2026-07-26 - Preferencia UI: configuración junto al eje de trabajo

**No repetir:** concentrar depósito, horarios de vendedor, rangos operativos y cargos logísticos en una pantalla general extensa llamada `Entrega y recolección`.

**Motivo:** mezcla responsabilidades, duplica controles y obliga a cada encargado a salir de su página habitual para encontrar opciones de su trabajo.

**Preferir:** ubicar `Configuración de ventas` dentro de Seguimiento; los cargos de entrega/recolección viven en `Configuración → Costos → Operativos`, no en Logística.

### 2026-07-27 - Preferencia UI: no duplicar los días de Rutas

**No repetir:** mostrar botones de lunes a domingo para entregar o recoger dentro de `Configuración → Costos → Operativos`.

**Motivo:** los días ya se seleccionan en Rutas; repetirlos crea dos lugares aparentes para controlar el mismo calendario.

**Preferir:** administrar los días y horarios exclusivamente en `Logística → Rutas` y dejar en `Costos → Operativos` sólo la anticipación y los cargos.

### 2026-07-27 - Preferencia UI: horario junto a la ruta

**No repetir:** mostrar editores globales de rangos para `Entregar` y `Recoger` fuera del catálogo semanal de Rutas.

**Motivo:** el horario pertenece a una ruta concreta; un mismo lunes puede usar un horario general o contener varias rutas con ventanas diferentes.

**Preferir:** al activar un día, facilitar la captura de su `Horario general`; si se crean rutas dentro del día, mostrar `Hora de inicio` y `Fin estimado` en cada ruta. Las sugerencias `Entre` de Ventas se pueden configurar y se complementan con esas ventanas.

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

### 2026-07-28 - Preferencia UI: marca Sin dest. en remitentes vacíos

**No repetir:** ocultar que un remitente aún no tiene destinatarios hasta después de seleccionarlo.

**Motivo:** el vendedor pierde tiempo abriendo remitentes sin destino.

**Preferir:** en filas y tarjetas de remitente, mostrar la marca compacta `Sin dest.` cuando `recipients.length === 0`. No confundir con contadores tipo `1 dest.` (rechazados).

### 2026-07-28 - Preferencia UI: catálogo de precios agrupado por categoría de inventario

**No repetir:** listar productos del catálogo o ítems asignados a un país en una sola lista plana sin separación por categoría.

**Motivo:** las categorías de inventario definen la organización del catálogo; mezclar todo dificulta encontrar productos cuando hay varias categorías.

**Preferir:** encabezados por categoría (mismo orden que inventario) en el picker `Agregar ítems` y en el listado de precios del país. En el picker, cada categoría va contraída por defecto en una fila tipo acordeón con borde, badge de conteo y chevron; al filtrar, las categorías con coincidencias se expanden solas. En el listado principal del país, las categorías quedan siempre visibles y expandidas con un encabezado de sección claro (no acordeón). La línea secundaria del ítem muestra subcategoría o tipo, no repetir la categoría.


**No repetir:** llamar `Configuración` a la sección de Logística que solo editaba anticipación y cargos adicionales opcionales para ventas.

**Motivo:** el nombre prometía setup operativo y confundía con precios comerciales o con Admin → Configuración.

**Preferir:** no alojar esos cargos en Logística; administrarlos en `Configuración → Costos → Operativos`.

### 2026-07-27 - Preferencia UI: Costos unifica precios y cargos operativos

**No repetir:** mantener `Países y precios` y `Distribuidores` como tarjetas separadas del menú de Configuración mientras Distribuidores aún no está listo, ni dejar los cargos de conductor en Logística.

**Motivo:** “lo que cobramos” estaba repartido; Distribuidores (compra) distrae del armado comercial; Logística no es el lugar natural para tarifas de venta.

**Preferir:** una sola tarjeta `Costos` con pestañas `Países` (precio público, costo interno y ganancia por país) y `Operativos` (cargos sugeridos de entrega/recolección con conductor). Diferir Distribuidores. No meter tiempos de entrega del país en Operativos.

### 2026-07-27 - Preferencia UI: crear categoría o item sin botón duplicado

**No repetir:** dejar visible el botón `Agregar categoría` / `Nueva categoría` / `Agregar` (item) a la vez que el campo inline de nombre, ni confirmar esa creación con un icono `+`.

**Motivo:** el botón sigue sugiriendo que se puede abrir otro entrybox; el `+` no comunica confirmar/crear.

**Preferir:** al abrir el campo, ocultar el botón de agregar; confirmar con chulito (`Check`) o etiqueta `Crear`/`OK`, y cancelar con `X`.

### 2026-07-27 - Preferencia UI: costos de entrada en USD

**No repetir:** mostrar el campo `Costo` de una entrada de inventario sin indicar que el monto es en dólares.

**Motivo:** `$` solo o un número suelto puede confundirse con otra moneda en el contexto operativo.

**Preferir:** etiqueta `Costo (USD)` y prefijo `$` dentro del campo, alineado con otros montos en dólares del sistema.

### 2026-07-27 - Preferencia UI: proveedores como tags en entrada

**No repetir:** pedir el proveedor solo con un campo de texto libre sin mostrar los ya usados.

**Motivo:** obliga a escribir el mismo nombre una y otra vez y no aprovecha el historial operativo.

**Preferir:** tags clicables con los proveedores guardados debajo del campo; el usuario puede elegir uno o escribir uno nuevo y confirmarlo con Enter.

### 2026-07-28 - Preferencia UI: inventario disponibles y administración

**No repetir:** mostrar `piezas` como etiqueta principal de stock en tarjetas de inventario, usar `Borrar` para artículos con historial, ni mostrar `Países y precio` en artículos no comerciales.

**Motivo:** `disponibles` comunica stock operativo; borrar rompe auditoría; cinta o herramientas internas no se venden por país.

**Preferir:** `N disponibles` en tarjeta; sección `Administración` con `Editar` y `Archivar artículo`; menú `Precios de venta` solo para artículos comerciales; ubicación principal visible en tarjeta (`A-01 · Bodega principal`).

### 2026-07-27 - Preferencia UI: motivos según el tipo de movimiento

**No repetir:** mostrar en Entrada motivos de Salida o Ajuste, ni una lista genérica compartida entre los tres formularios.

**Motivo:** opciones como "Salida manual" no aplican cuando el usuario ya eligió registrar una entrada.

**Preferir:** listas contextuales por tipo (Entrada, Salida, Ajuste) y detalle obligatorio solo en conteo físico u otro. El conteo físico no aparece en Entrada; las correcciones por inventario van en Ajuste.

### 2026-07-29 - Preferencia UI: línea de tiempo en resumen de envío

**No repetir:** mostrar las dos etapas logísticas como texto corrido dentro de las notas del resumen.

**Motivo:** cuesta distinguir qué operación sigue y qué fecha pertenece a cada caja.

**Preferir:** una línea de tiempo compacta con `Entrega de caja vacía` y `Recolección de caja llena`, conectadas visualmente. Cada etapa lleva un número de paso visible dentro del círculo. Si una etapa depende de la anterior, debe verse atenuada, marcada `Bloqueado` y explicar qué hito la habilita; no mostrar su programación como activa. El estado se muestra como chip, la ruta como etiqueta independiente (ámbar cuando falta asignar, verde cuando existe) y la fecha como texto secundario; nunca como una oración técnica acumulada. Cuando una ruta existe, su renglón permite desplegar día, horario, conductor y nota operativa. Debajo, mostrar total, saldo y depósito con estado claro, el botón `Registrar abono` cuando exista saldo y un historial compacto de pagos; el expediente conserva el detalle documental. Sin crear tarjetas anidadas.

### 2026-07-30 - Preferencia UI: ruta visible una sola vez en el resumen

**No repetir:** volver a mostrar el nombre de la ruta en la fila contraída de `Datos de operación` cuando ya aparece en la etapa correspondiente de la línea de tiempo.

**Motivo:** duplica el mismo dato y agrega ruido al resumen del envío.

**Preferir:** mostrar una sola línea de tiempo como resumen operativo. No repetir la operación ni crear un bloque inferior de `Datos de operación`; la ruta y la fecha permanecen junto a su etapa correspondiente.

**Dependencias:** cuando la siguiente etapa esté bloqueada, el chip `Bloqueado` es suficiente; no agregar el texto explicativo `Se habilita al completar la entrega de la caja vacía.`.

**No repetir:** texto fijo que explique qué contiene Seguimiento o el expediente dentro del resumen del envío.

**Motivo:** ocupa espacio y repite el propósito de los botones; los datos operativos ya son visibles en el propio resumen.

**Preferir:** dejar solo las acciones y la información del envío; el usuario abre cada superficie cuando necesita más detalle.

### 2026-07-29 - Preferencia UI: cobro directo desde el resumen

**No repetir:** pantalla inicial de cobro con dos tarjetas grandes para elegir entre `Pago completo` y `Abono`.

**Motivo:** se percibe como un paso extra genérico antes de capturar el importe y no aporta al cobro habitual desde el resumen.

**Preferir:** abrir directamente el formulario `Registrar abono`, con monto editable, atajo discreto para liquidar el saldo, método de pago y nota.

### 2026-07-29 - Preferencia UI: verde reservado para pago confirmado

**No repetir:** presentar la opción `Pago completo` en verde antes de que el cobro se haya registrado.

**Motivo:** parece un estado exitoso o una recomendación visual, cuando todavía es una decisión del operador.

**Preferir:** opciones de cobro en tonos neutrales; usar verde sólo para confirmar el registro exitoso, importes cubiertos y estados pagados.

### 2026-07-29 - Preferencia UI: opciones de cobro en dos líneas

**No repetir:** título y explicación de una opción de cobro compartiendo un solo renglón.

**Motivo:** el texto se amontona y reduce la lectura rápida de la decisión.

**Preferir:** título principal en la primera línea y explicación breve debajo, alineados a la izquierda.

### 2026-07-29 - Preferencia UI: un solo pago, depósito como umbral

**No repetir:** mostrar el monto del pago y un bloque independiente para marcar el depósito como pagado.

**Motivo:** sugiere que abono y depósito son operaciones distintas, aunque el mismo importe cubre ambos conceptos.

**Preferir:** un único formulario de pago con monto, método y nota. En el resumen mostrar `Total del envío`, `Abono` y `Saldo pendiente` en una sola columna vertical, seguido del historial de abonos. No usar `Incluye depósito`, porque puede insinuar que ya fue pagado.

**Divulgación progresiva:** el grupo financiero inicia contraído y muestra sólo `Total del envío`. Al expandirlo, muestra el desglose vertical, `Registrar abono` y el historial de abonos.

### 2026-07-30 - Preferencia UI: sin pie redundante en el resumen del envío

**No repetir:** agregar al final del resumen una lista plana con `Estado`, `Total cobrado`, `País destino`, `Transporte` y `Destinatario`.

**Motivo:** el estado ya se comunica en la ruta logística, los cobros pertenecen al grupo financiero y los demás datos están disponibles en el contexto del envío o en el expediente.

**Preferir:** terminar el resumen después del grupo financiero. Mantener el historial dentro de ese grupo, contraído por defecto, y usar `Ver expediente` para consultar el detalle documental.

### 2026-07-30 - Preferencia UI: encabezado interactivo visible en grupos contraíbles

**No repetir:** usar como disparador de expansión una fila con el mismo color, espaciado y tratamiento visual que el contenido circundante.

**Motivo:** no se distingue qué zona se puede pulsar para abrir el grupo.

**Preferir:** una barra compacta de ancho completo con fondo ligeramente elevado, borde, margen interior, estado hover/focus, texto de acción (`Ver detalle` / `Ocultar`) y chevron. El encabezado contraído conserva un dato útil como el total del envío.

### 2026-07-30 - Preferencia UI: desglose financiero vertical

**No repetir:** distribuir total, saldo y abono como tres columnas horizontales dentro de un resumen compacto.

**Motivo:** los importes se perciben separados y cuesta compararlos como una operación sencilla.

**Preferir:** una sola columna con conceptos a la izquierda e importes alineados a la derecha; ordenar `Total del envío`, `Abono` y `Saldo pendiente`, con un divisor antes del saldo final.

**Alineación:** centrar el bloque expandido de finanzas dentro del ancho disponible. No dejar una columna limitada pegada al borde izquierdo; el desglose, la acción y el historial comparten el mismo ancho centrado.

### 2026-07-30 - Preferencia UI: importes completos en Seguimiento

**No repetir:** comprimir `Total`, `Pagado` y `Debe` hasta truncar los importes con puntos suspensivos.

**Motivo:** oculta información financiera necesaria para decidir si corresponde cobrar y cuánto falta.

**Preferir:** reservar ancho suficiente para los tres importes compactos y mantenerlos completos, en una sola línea y con números tabulares.

### 2026-07-30 - Preferencia UI: jerarquía de filas en Seguimiento

**No repetir:** comprimir identidad, tres métricas financieras y cuatro etapas del envío en una misma franja, ni repetir debajo un aviso de logística que diga lo mismo que los badges de ruta y conductor.

**Motivo:** los datos compiten por ancho, se cortan y cuesta reconocer la siguiente acción.

**Preferir:** primera fila con invoice, cliente, país, cajas y un único saldo visible; segunda fila completa para el progreso. Al expandir, mostrar una sola señal breve del enlace con Logística, los badges operativos y acciones con nombre (`Bitácora`, `Priorizar`, `Expediente`, `Registrar abono`).

### 2026-07-30 - Preferencia UI: no programar otra vez una tarea programada

**No repetir:** mostrar `Programar entrega` o `Programar recolección` cuando el paso ya tiene una ruta o una fecha programada, ni dejar el chip compacto de Seguimiento en `Dejar`/`Recoger` cuando esa etapa activa ya está ordenada.

**Motivo:** contradice la asignación visible y hace parecer que la programación guardada no existe.

**Preferir:** en el menú, `Editar entrega` / `Editar recolección`. En el chip compacto activo: `Entrega para el lunes` (o el día programado), `Entrega programada` si hay tarea sin día legible, y `Entrega por asignar` si todavía no hay orden. Lo mismo con `Recolección…`. Reservar `Dejar`/`Recoger` para pasos ya hechos o aún no activos.

### 2026-07-30 - Preferencia UI: cancelación logística explícita

**No repetir:** usar `No dejar` o `No recoger` para cancelar una tarea logística existente.

**Motivo:** esas frases suenan como una elección inicial y no comunican claramente que se cancelará una entrega o recolección ya creada.

**Preferir:** usar `Cancelar entrega` y `Cancelar recolección`, mantener el tratamiento visual destructivo y pedir confirmación antes de cancelar la tarea.

### 2026-07-30 - Preferencia UI: Bitácora como línea de tiempo operativa

**No repetir:** forzar la Bitácora a ocupar casi toda la altura disponible con espacio vacío, encerrar cada evento en una tarjeta independiente ni mantener visibles todos los campos opcionales del compositor.

**Motivo:** la captura compite con el historial, los eventos se sienten aislados y los controles de contacto o recordatorio añaden peso aunque no se necesiten.

**Preferir:** una ventana de altura natural con máximo según la pantalla; compositor compacto con `Detalles del contacto` y `Recordatorio` contraídos; historial continuo con eje temporal, divisores y conteo de eventos. No repetir el invoice dentro del título de cada evento ni mostrar estados de recordatorio cuando el evento no tiene uno. El evento `Venta registrada` omite estados iniciales obvios, como `Recolección pendiente`; esa etapa vuelve a aparecer cuando exista una programación, confirmación, cambio, cancelación o falla relevante.

### 2026-07-29 - Preferencia UI: proyección de saldo sólo con monto capturado

**No repetir:** mostrar `Pendiente después` cuando aún no se ha capturado un importe.

**Motivo:** repite el saldo actual y parece un dato contradictorio.

**Preferir:** mostrar la proyección únicamente después de que el operador escriba un monto válido.

### 2026-07-29 - Preferencia UI: calculadora de efectivo en cobros

**No repetir:** obligar al operador a calcular mentalmente el cambio o a salir del formulario de pago.

**Motivo:** al recibir billetes físicos se necesita confirmar rápido si falta dinero o cuánto debe devolverse.

**Preferir:** al abrir el pago, precargar el saldo como importe real editable. La calculadora aparece automáticamente dentro del área de monto recibido, debajo del máximo permitido. Incluye efectivo entregado, atajos de billetes y resultado de faltante, pago exacto o cambio. La calculadora no modifica el monto que se registrará.

### 2026-07-28 - Preferencia UI: un solo selector de fecha y hora

**No repetir:** `input type="date"`, `type="datetime-local"` ni otros pickers nativos del navegador para elegir fechas u horas en la app.

**Motivo:** cada sistema operativo y navegador muestra un calendario distinto; rompe la coherencia visual con el resto de Boxario.

**Preferir:** `DateInput` para fechas, `TimePickerInput` para horas y `DateTimeInput` cuando hagan falta ambas. El panel flotante compartido (`DatePickerCalendar` / `TimePickerCalendar`) se renderiza en `document.body` vía `PickerPanelPortal` para no desalinearse dentro de modales. No envolver esos controles en `<label>`: usar `<span>` para el texto y dejar que sólo el botón del campo abra el picker.

### 2026-08-01 - Preferencia UI: periodo visible al elegir minutos

**No repetir:** ocultar `AM` y `PM` al pasar a la selección de minutos.

**Motivo:** el usuario puede perder el contexto del periodo o necesitar corregirlo después de elegir la hora.

**Preferir:** mantener el selector `AM`/`PM` visible también sobre la cuadrícula de minutos.

### 2026-08-01 - Preferencia UI: encabezado del selector sin instrucciones repetidas

**No repetir:** mostrar `Elige la hora` sólo en la vista de horas mientras la vista de minutos no tiene una instrucción equivalente.

**Motivo:** crea una diferencia visual innecesaria entre los dos pasos del mismo selector.

**Preferir:** usar directamente los botones de hora, periodo y minutos como controles autoexplicativos.

### 2026-07-30 - Preferencia UI: no preguntar una ruta inexistente

**No repetir:** mostrar un segundo paso `Ruta`, la acción `No sé la ruta` o un pie sobre ruta pendiente cuando el día seleccionado no tiene subrutas.

**Motivo:** en ese caso el día ya es la ruta; pedir otra decisión contradice lo elegido en `Día y hora`.

**Preferir:** confirmar directamente desde `Día y hora` usando la ruta implícita del día. Mostrar el paso y las acciones de ruta únicamente cuando existan subrutas con nombre para ese día.

### 2026-07-30 - Preferencia UI: operación completa en la factura

**No repetir:** mostrar únicamente un depósito requerido y el pendiente debajo de los conceptos, sin presentar el total calculado ni el dinero realmente abonado.

**Motivo:** aunque el saldo sea correcto, la factura no permite comprobar visualmente la suma de conceptos y la resta del pago.

**Preferir:** después de los conceptos, mostrar siempre `Total`, `Abono` y `Saldo pendiente`, en ese orden. El abono usa el pago real persistido; el depósito requerido sigue siendo una regla interna y no sustituye al dinero recibido.

### 2026-07-30 - Preferencia UI: una sola decisión de abono

**No repetir:** capturar un abono en la factura y después volver a preguntar en `Configurar pago` si el depósito fue pagado.

**Motivo:** son dos controles para la misma decisión y pueden contradecirse.

**Preferir:** ofrecer `Sin abono inicial` junto al abono de la factura. Al activarlo, mostrar abono `$0` y saldo pendiente igual al total. El diálogo final sólo pide método cuando existe dinero recibido; con abono cero confirma el invoice sin volver a preguntar por depósito.

### 2026-07-30 - Preferencia UI: signo monetario unido al importe

**No repetir:** reservar un ancho fijo para el campo numérico que deje `−$` separado visualmente del valor.

**Motivo:** parece que el signo y el número pertenecen a columnas distintas y dificulta leer la resta.

**Preferir:** ajustar el ancho editable al contenido para presentar `−$20` como una sola cantidad, alineada a la derecha con los demás importes.

### 2026-07-30 - Preferencia UI: omitir abonos inexistentes

**No repetir:** mostrar `Abono −$0` en la factura o en su confirmación.

**Motivo:** no ocurrió ningún movimiento de dinero y la fila agrega ruido.

**Preferir:** con abono cero, mostrar sólo `Total` y `Saldo pendiente` por el mismo importe. Mantener `Sin abono inicial` únicamente como control de configuración antes de crear el invoice.

### 2026-07-30 - Preferencia UI: un solo total cuando no hay abono

**No repetir:** mostrar `Total` y `Saldo pendiente` con el mismo importe cuando no existe abono, ni repetir el importe de una sola línea de cobro otra vez como total sin estado de pago.

**Motivo:** duplica el dato o deja el monto sin decir si está pagado.

**Preferir:** con abono y varias líneas, desglosar `Total`, `Abono` y `Saldo pendiente`. Con abono y una sola línea, la línea ya es el total: mostrar sólo `Abono` y `Saldo pendiente`. Sin abono, declarar `Debe` con el saldo. Si además hay una sola línea, el importe va en `Debe` (no junto al nombre del producto).

### 2026-07-31 - Preferencia UI: no repetir Total con una sola línea y abono

**No repetir:** debajo de una sola línea (`INV-… 18x18x18 $88`) volver a imprimir `Total $88` antes del abono.

**Motivo:** el importe ya está en la línea; el segundo `$88` no aporta nada.

**Preferir:** línea → `Abono` → `Saldo pendiente`. El `Total` aparte sólo cuando hay más de un concepto que sumar.

### 2026-07-31 - Preferencia UI: Debe cuando no hay abono

**No repetir:** dejar un importe suelto en la factura sin decir si está pagado, ni usar `Total pendiente` cuando el mensaje es que se debe.

**Motivo:** con `Sin abono inicial` el `$108` solo no comunica el estado de cobro.

**Preferir:** fila `Debe` con el saldo. En confirmaciones sin abono, la misma etiqueta `Debe`.

### 2026-07-31 - Preferencia UI: bandera del país en destinatarios

**No repetir:** filas de destinatario sin la bandera del país destino, aunque el país ya venga en los datos.

**Motivo:** con varios destinatarios del mismo apellido, el país es la señal que permite distinguirlos de un vistazo; la dirección sola no basta.

**Preferir:** en vista de filas, bandera junto al nombre (`CountryFlag` / `Flag`); en tarjetas, conservar bandera + nombre del país.

### 2026-07-31 - Preferencia UI: dirección en filas de persona

**No repetir:** una sola línea truncada con pin inline, ni una columna de dirección flotando en el centro de la fila.

**Motivo:** se ve aplastada o huérfana, con hueco vacío a la derecha cuando no hay acción.

**Preferir:** dirección debajo del teléfono, en la misma columna del nombre, con pin alineado y líneas (`calle`, `colonia`, `ciudad/estado/cp`).

### 2026-07-31 - Preferencia UI: precio junto al nombre en filas de caja

**No repetir:** empujar el precio o el badge `xN` al borde derecho opuesto del nombre/medida en filas de catálogo de cajas.

**Motivo:** deja un hueco vacío enorme y obliga a leer en zigzag.

**Preferir:** medida, precio y cantidad del carrito en la misma línea (`12x12x12 $38 x1`), tiempo de entrega debajo. No empujar el badge de cantidad al borde derecho.

### 2026-07-31 - Preferencia UI: stock cero separado de cantidad elegida

**No repetir:** mostrar el badge numérico rojo `0` de stock junto al badge `xN` del carrito en las filas de cajas.

**Motivo:** los dos números parecen cantidades equivalentes y el `0` compite visualmente con la cantidad que el vendedor ya eligió.

**Preferir:** conservar la disponibilidad positiva como badge; cuando sea cero, mostrar `Sin stock` como estado secundario debajo del precio y mantener `xN` junto a la medida y el precio.

### 2026-07-31 - Preferencia UI: error de ruta visible tras crear invoice

**No repetir:** aviso genérico “falta enviar una ruta” sin decir por qué falló la asignación.

**Motivo:** el vendedor cree que la ruta no existe o que eligió mal el día, cuando el fallo era otro (geo, tarea, plantilla).

**Preferir:** mostrar el error concreto de cada reintento (`Entrega: …`) junto al botón Reintentar.
### 2026-08-01 - Preferencia UI: pasos del selector desde los valores

**No repetir:** mostrar una fila adicional con las palabras `Hora` y `Minuto` para navegar entre pasos.

**Motivo:** ocupa espacio y obliga a buscar un control separado del valor que se quiere cambiar.

**Preferir:** hacer clic directamente en los valores de hora y minuto del encabezado para cambiar de paso.

### 2026-08-01 - Preferencia UI: horario aprendido por cliente

**No repetir:** mostrar en Ventas un catálogo global de `Límites sugeridos`, `Horas frecuentes` o modalidades configuradas por Logística como si fueran disponibilidad general para todos los clientes.

**Motivo:** el horario operativo de una ruta no representa el hábito de cada cliente y puede hacer que el vendedor prometa una hora que Logística todavía no confirmó.

**Preferir:** mostrar una sección compacta de `Preferencia del cliente` con sugerencias tomadas del historial del mismo cliente y del mismo tipo de operación. Una sugerencia debe poder reutilizarse y editarse, pero debe quedar marcada como solicitud/preferencia. Si no hay historial, dejar el campo vacío y permitir continuar sin inventar una hora.

**Diferenciar siempre:** `Preferencia del cliente` en Ventas frente a `Horario de ruta` y `Horario confirmado por Logística` en las superficies operativas.
