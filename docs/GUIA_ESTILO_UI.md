# Guía de estilo e interacción de Boxario

### 2026-08-19 — Separación del borde en superficies de logística

**Contexto:** Conductores y Calendario y rutas mostraban sus líneas y paneles pegados al borde derecho de la ventana.

**Decisión:** Las vistas de logística con contenido a borde completo conservan una separación exterior simétrica (`p-3`, `sm:p-4`) para que los bordes de sus superficies no lleguen al límite de la página.

**Resultado:** Conductores, Calendario y rutas, subrutas y las demás vistas de logística mantienen un margen visible y consistente alrededor de la superficie principal.

### 2026-08-19 — Carga de logística con geometría estable

**Contexto:** Al entrar a Calendario y rutas se mostraba primero una barra y un bloque genéricos; al terminar la carga aparecía la estructura real de navegación y master-detail, provocando un salto visual.

**Decisión:** El estado de carga de las rutas de logística debe conservar la misma geometría principal de la vista final: barra superior, panel maestro y panel de detalle.

**Resultado:** La pantalla mantiene su estructura y proporciones durante la carga, reduciendo el cambio visible entre el primer render y el contenido listo.

**Implementación conservada:** Las rutas de logística usan loaders propios por segmento y el catálogo de rutas usa un placeholder master-detail, evitando volver al cargador genérico de página durante consultas internas.

**Ajuste fino:** El placeholder interno del catálogo no debe repetir el margen superior del contenedor de Configuración; ambos estados deben iniciar el master-detail en la misma coordenada vertical.

### 2026-08-18 — Preferencia UI: formulario vacío de Inventario como un solo control

**No repetir:** mostrar un doble rectángulo de foco dentro del campo `Nueva categoría` cuando está activo.

**Motivo:** el foco del input y el del contenedor se superponían y hacían que el formulario se viera roto o desalineado.

**Preferir:** tratar el shell y el input como una sola superficie, con un único borde de foco y botones de confirmar/cancelar alineados.

### 2026-08-18 — Preferencia UI: botón de Bitácora solo con icono

**No repetir:** mostrar el texto `Bitácora` junto al icono en el botón compacto de acceso.

**Motivo:** el usuario pidió eliminar el texto para reducir el botón y dejar la acción visualmente más limpia.

**Preferir:** mostrar únicamente el icono de libreta, manteniendo `title` y `aria-label` para identificación y accesibilidad.

### 2026-08-18 — Preferencia UI: icono de libreta para Bitácora

**No repetir:** usar un icono de conversación o globo de mensaje en el botón `Bitácora`.

**Motivo:** la Bitácora representa un registro histórico consultable, no una conversación.

**Preferir:** usar el icono de libreta `BookOpen` junto al texto `Bitácora`, conservando la acción y el estilo del botón.

### 2026-08-18 — Preferencia UI: Bloc de notas de accesos limpio con hojas individuales sin botón de bitácora en la cabecera

**No repetir:** incluir un conmutador o botón de pestaña `Bitácora` en la cabecera del bloc de notas ("pero la bitacora no deberia salir ahi no? ese boton de bitacora quitalo").

**Motivo:** la cabecera del bloc de notas debe ser limpia y directa para escribir y leer notas sin botones redundantes de bitácora que saturen el encabezado. La trazabilidad y autoría (`👤 Creado por: {autor} · {fecha} · {hora}`) viven directamente en el pie de cada hojita de nota.

**Preferir:** un **Bloc de notas de accesos** limpio y directo:
1. **Cabecera despejada:** icono, título `Bloc de notas` y botón cerrar `[ ✕ ]`.
2. **Hojas de notas por pin:** selector superior de hojas por cada pin colocado (`[🚪 Entrada]` `[🚗 Garaje]` `[🚧 Portón 📄]`).
3. **Hojita cerrada / modo lectura:** tarjeta con texto de la nota, firma de autoría (`👤 Creado por: {autor} · {fecha} · {hora}`) y última modificación (`✏️ Editado por`), más botones `Editar hoja` y `Borrar nota`.
4. **Modo edición:** textarea multilínea con teclado virtual y botones `Guardar en hoja` y `Cancelar`.

### 2026-08-18 — Preferencia UI: barra unificada de pines en un solo renglón en mapa de accesos

**No repetir:** fragmentar la información y acciones de pines en 4 renglones apilados, o imprimir el texto completo de una nota dentro de la etiqueta del botón en la barra (lo que provocaría ensanchamiento desproporcionado o cortes truncados con puntos suspensivos cuando la nota es larga).

**Motivo:** el usuario rechazó la dispersión en múltiples renglones y observó que las notas largas o múltiples quedarían mal en la barra ("¿qué pasa acá si tenemos más de una nota o la nota es muy larga? Va a quedar mal en el cartel, ¿no?").

**Preferir:** una sola barra horizontal unificada y compacta (`h-11`) que integra:
1. **Grupo izquierdo:** botón desplegable `+ Agregar pin` con símbolo más visible ubicado a la izquierda, y pills interactivos para cada pin (activo y colocados, con icono, color, check de guardado y badge `📄` si tiene nota), sin etiquetas redundantes como "PUNTOS".
2. **Divisor sutil y grupo derecho:** campo inline para personalización (si es tipo Otro), botón de etiqueta estable `Libreta de notas` / `Notas ({count})` (con tooltip de vista previa) que abre el **Bloc de notas de accesos**, y botón `Quitar pin` cuando el pin está ubicado.

### 2026-08-18 — Preferencia UI: selector de puntos compacto en el mapa de entrada

**No repetir:** separar `Puntos` y el punto de acceso activo en extremos opuestos de una barra ancha, dejando espacio vacío innecesario.

**Motivo:** en Nueva venta el selector se percibe sobredimensionado y dificulta leer la relación entre la etiqueta `Puntos` y el estado activo.

**Preferir:** una barra de altura y relleno reducidos, con `Puntos`, el punto activo y el indicador de expansión agrupados al inicio; el mapa conserva el espacio restante.

**Regla adicional:** al desplegar la lista, no repetir como opción el punto que ya aparece como activo en la barra; mostrar únicamente los puntos alternativos.

**Flujo de pines:** el desplegable lista únicamente los pines ya colocados. Los tipos sin pin permanecen ocultos hasta pulsar `Agregar pin nuevo`, que abre las opciones disponibles para seleccionar una antes de colocarla en el mapa.

### 2026-08-18 — Preferencia UI: Tarjetas de bitácora enriquecidas con día, fecha, hora y autor ("Creado por")

**No repetir:** mostrar entradas de bitácora o eventos de actividad reducidos únicamente a una hora aislada (e.g. `05:20 PM`) sin día, fecha ni autoría clara de quién realizó la acción.

**Motivo:** el usuario solicitó una bitácora completa y profesional ("que me diga fechas dias horas quien lo creo. me entiendes una bitacora mela completa con todo") para disponer de trazabilidad operativa y auditoría clara de cada movimiento.

**Preferir:** tarjetas estructuradas donde cada entrada presente:
1. **Día, fecha y hora:** badge destacado con día de la semana (e.g. `Martes`), fecha formateada (`18 ago 2026`) y hora (`05:20 PM`), además de tooltip o pie con fecha completa.
2. **Autoría visible:** bloque `👤 Creado por: {actorName}` con icono y diferenciación entre operador y sistema automático.
3. **Categoría e icono contextual:** iconos y badges temáticos acordes a la acción (`Registro de Cliente`, `Modificación de Datos`, `Ubicación Exacta`, `Envío & Logística`, `Cobro & Factura`, `Llamada`, `WhatsApp`, etc.).
4. **Contenido estructurado:** datos como teléfonos y direcciones con iconos legibles y chips interactivos.

### 2026-08-18 — Preferencia UI: Bitácora y libreta de envíos en ventana modal centrada (no panel lateral/drawer)

**No repetir:** presentar la bitácora y la libreta de envíos del cliente como un panel lateral / drawer deslizante anclado al borde derecho de la pantalla (`aside` lateral).

**Motivo:** el usuario rechazó el formato de panel lateral ("la bitacoria deberia ser una ventana no esto cambialo pls"), prefiriendo una ventana modal emergente centrada en pantalla con espacio visual amplio.

**Preferir:** mostrar la libreta de envíos y bitácora unificadas con pestañas dentro de una ventana modal centrada (`app-modal-overlay` / `app-modal-content` con `max-w-4xl`), conservando las pestañas directas `💬 Bitácora` (línea de tiempo, notas, llamadas, recordatorios y filtros) y `📦 Libreta de envíos` (listado histórico de envíos, detalle de expedientes y cobros). El botón `Bitácora` de las tarjetas y filas de cliente abre directamente la pestaña de Bitácora, mientras que el acceso de `Último envío` / historial abre la pestaña de Libreta de envíos, permitiendo alternar entre ambas con una sola pestaña sin modales anidados.

### 2026-08-17 — Preferencia UI: controles de mapa legibles en celular

**Contexto:** en la vista móvil del mapa de accesos, los botones, tags y textos se percibían demasiado pequeños y difíciles de tocar.

**Decisión:** usar en móvil botones de al menos 40 px, texto `sm` y mayor separación para tags, controles de vista, notas y acciones del pie; conservar la densidad compacta actual desde `sm` en adelante.

**Resultado:** la interfaz móvil prioriza legibilidad y objetivos táctiles claros sin ampliar innecesariamente la vista de escritorio.

### 2026-08-17 — Bitácora: conservar los datos del cliente cuando no hay envíos

**Contexto:** la Libreta de envíos mostraba únicamente `Sin envíos registrados` cuando un cliente todavía no tenía envíos, ocultando una dirección y un teléfono que sí estaban disponibles.

**Decisión:** la cabecera de la bitácora debe mostrar el teléfono, la dirección completa y la referencia del cliente cuando existan, incluso si la línea de tiempo no contiene envíos.

**Resultado:** el operador puede consultar y verificar los datos del cliente desde la bitácora antes de registrar el primer envío.

### 2026-08-17 — Preferencia UI: Ancho acotado y centrado en listas de personas (evitar filas excesivamente largas con vacíos)

**No repetir:** dejar que las listas y filas de clientes se estiren sin límite a todo el ancho de pantallas panorámicas (1600px–1920px), provocando una brecha vacía gigantesca entre los datos de dirección y los botones de acción en el extremo derecho.

**Motivo:** en pantallas medianas y grandes, el contenido de identidad y dirección ocupa una fracción del ancho disponible, haciendo que la fila se sienta desproporcionadamente larga, desconectada y con espacio sobrante excesivo.

**Preferir:** acotar el contenedor de listas de personas a un ancho máximo profesional y centrado (`max-w-5xl mx-auto`), logrando que la barra de búsqueda, las filas y las tarjetas mantengan una cercanía visual armoniosa, legible y sin vacíos desiertos.

### 2026-08-17 — Preferencia UI: Tarjetas de personas compactas con grilla acotada (sin estiramiento horizontal desproporcionado)

**No repetir:** expandir tarjetas individuales de clientes a todo el ancho de la pantalla (`1fr` / `auto-fit` ilimitado) ni apilar los datos en un solo tótem vertical largo y centrado con enormes vacíos a los lados.

**Motivo:** cuando hay un solo cliente o pocos resultados, la tarjeta se estiraba desproporcionadamente a 1400px+ de ancho, dejando un enorme espacio vacío desperdiciado y elementos desarticulados.

**Preferir:** una grilla con `auto-fill` y ancho máximo acotado (`grid-cols-[repeat(auto-fill,minmax(min(100%,18rem),22rem))] justify-start`), combinada con un diseño de tarjeta compacto (`max-w-sm`), estructurado en cabecera (avatar, identidad y acción rápida), cuerpo (dirección legible con botón de mapa) y pie (bitácora y badges de estado), asegurando que cada tarjeta mantenga proporciones elegantes sin importar el ancho del monitor.

### 2026-08-17 — Preferencia UI: Filas de clientes limpias con avatar único a la izquierda y acciones agrupadas a la derecha

**No repetir:** apilar verticalmente el botón de venta rápida debajo del icono de avatar en la columna izquierda en modo lista, ni utilizar paletas con fondos marrones y contrastes amarillos estridentes como aspecto predeterminado de clientes.

**Motivo:** el usuario expresó rechazo al diseño ("se ve feo") debido a que la columna izquierda se sentía saturada y tosca con un doble bloque vertical apretado, los tonos ocres/marrones desentonaban con el tema esmeralda de la plataforma y las acciones quedaban desarticuladas entre los extremos de la fila.

**Preferir:** una fila elegante y compacta donde la columna izquierda contenga exclusivamente el avatar del cliente centrado verticalmente; la sección central presente con claridad identidad (nombre con bandera y teléfono) y dirección (con botón interactivo de mapa); y el extremo derecho agrupe ordenadamente los controles de acción (`Bitácora`, `Rápido`) y badges de estado (`Sin dest.`) con alturas consistentes (`h-8`), bordes redondeados sobrios y paleta predeterminada esmeralda armónica.

### 2026-08-17 — Preferencia UI: Distribución balanceada y visualmente integrada de filas de remitentes y destinatarios en modo lista

**No repetir:** amontonar todos los datos (nombre, teléfono y múltiples líneas de dirección) en una sola columna estrecha a la izquierda dejando un enorme vacío horizontal en el medio de la fila y los botones de acción aislados en el extremo derecho.

**Motivo:** la información se percibe desarticulada, muy separada y con espacio desperdiciado en pantallas medianas y grandes, además de forzar una altura vertical excesiva e incómoda.

**Preferir:** una estructura balanceada y armoniosa con alineación vertical centrada (`items-center`), avatar y acción rápida proporcionales en la primera columna, sección central responsiva dividida en identidad/contacto (nombre con bandera y teléfono) y bloque de dirección (botón de mapa interactivo con líneas de calle y ciudad organizadas y separador sutil en pantallas de escritorio), y grupo de acciones (Bitácora, badges de estado) alineado a la derecha.

### 2026-08-17 — Preferencia UI: Botón de acceso visible a la Bitácora en tarjetas y filas de clientes

**No repetir:** ocultar el acceso al historial y bitácora del cliente exclusivamente detrás del menú contextual de clic derecho.

**Motivo:** dificulta descubrir la función y obliga a pasos adicionales innecesarios para consultar o anotar seguimiento de un cliente.

**Preferir:** mostrar un botón directo y visible con icono `💬 Bitácora` en las filas y tarjetas de remitentes y destinatarios (junto a los badges de estado o acciones rápidas), permitiendo abrir la bitácora integral con un solo clic.

### 2026-08-17 — Preferencia UI: Bitácora integral organizada por cliente con tarjetas enriquecidas de envíos y direcciones

**No repetir:** mostrar bitácoras aisladas por cada invoice que no permitan ver los demás envíos ni el historial general del cliente.

**Motivo:** obligaba a abrir y cerrar múltiples ventanas para reconstruir la historia de un cliente recurrente, perdiendo el hilo de acuerdos y cambios de dirección previos.

**Preferir:** presentar la **Bitácora del Cliente** (`CustomerJournalDialog`) con cabecera de datos de contacto, filtros temáticos rápidos (*Todo*, *Envíos & Direcciones*, *Seguimiento & Llamadas*, *Recordatorios*, *Cambios*), tarjetas de envíos con desglose de direcciones de recolección y entrega, y formulario ágil para registrar llamadas y acuerdos con opción de asociar o no a un envío específico.

### 2026-08-17 — Preferencia UI: botón de confirmación en el mapa denominado "Guardar pin"

**No repetir:** usar el texto `Confirmar ubicación` en el botón principal del mapa de accesos.

**Motivo:** la función operativa de esta pantalla es ubicar y guardar pines de acceso específicos (garaje, entrada, portón, etc.) y no modificar ni confirmar la ubicación postal.

**Preferir:** rotular la acción como `Guardar pin` (o `Guardar pines` si hay varios), reflejando con exactitud que el operador está guardando los pines colocados en el mapa.

### 2026-08-17 — Preferencia UI: icono de teclado virtual incrustado exclusivamente dentro de las cajas de texto con efecto luminoso

**No repetir:** mostrar botones de teclado virtual flotantes o permanentes en la cabecera superior de la ventana cuando no hay campos de texto activos.

**Motivo:** agrega elementos innecesarios a la barra superior y distrae cuando el usuario solo está observando el mapa o seleccionando pines.

**Preferir:** ubicar el icono de teclado `⌨️` directamente dentro del borde derecho de la caja de texto activa (notas o nombre de punto personalizado) con un resplandor luminoso esmeralda/turquesa (`glow` / `pulse`), indicando de forma clara e intuitiva la disponibilidad del teclado en pantalla únicamente cuando se va a escribir.

### 2026-08-17 — Preferencia UI: icono/botón desplegable de notas debajo del tag activo en lugar de campo inferior permanente

**No repetir:** mostrar un campo de texto fijo permanente en la parte inferior de la ventana del mapa que ocupe espacio vertical constante.

**Motivo:** saturaba la pantalla del mapa y ocupaba área visual útil aunque el usuario no quisiera escribir una nota.

**Preferir:** mostrar un botón/icono de nota contextual (`📝 Agregar nota` / `📝 Nota: "..."`) debajo del botón del tag activo que despliega el campo de texto únicamente al hacer clic en él, manteniendo el mapa limpio y despejado.

### 2026-08-17 — Preferencia UI: sin títulos redundantes ni etiquetas de entidad en cabecera de mapa

**No repetir:** mostrar encabezados textuales como `UBICAR PUNTO DE ACCESO · ESTE REMITENTE` y badges de país en la barra superior del modal de mapa.

**Motivo:** agrega ruido visual innecesario, ocupa espacio vertical y repite jerarquías obvias.

**Preferir:** cabecera minimalista mostrando únicamente la dirección legible del contacto junto a los controles de vista (*Satélite* / *Mapa*) y botón de cierre.

### 2026-08-17 — Preferencia UI: mapa enfocado con tags de acceso sin formulario de dirección

**No repetir:** mostrar campos de desglose de dirección (`Calle y número`, `Unidad/Apto`, `Colonia`, `Ciudad`, `Estado`, `C.P.`) o teclado virtual ocupando la parte superior del visor de mapa de entrada exacta.

**Motivo:** saturaba la pantalla emergente, reducía el espacio visual del mapa satelital y generaba confusión al mutar o mezclar la dirección postal con la ubicación de puntos de acceso operativos.

**Preferir:** mapa satelital maximizado y limpio, con chips o tags rápidos de puntos de acceso (*Entrada principal*, *Garaje*, *Portón*, *Recepción*, *Muelle*, *Puerta trasera*, *Otro*), arrastre directo del pin o clic en el mapa, y nota operativa opcional.

### 2026-08-17 — Preferencia UI: rediseño amigable del formulario y mapa de entrada exacta *(reemplazada)*

**No repetir:** mostrar campos de dirección con bordes y textos rojos predeterminados como si fueran errores cuando están vacíos, ni usar una barra de búsqueda ficticia desconectada de los campos.

**Motivo:** saturaba visualmente la pantalla con advertencias innecesarias, ocupaba demasiado espacio vertical y dificultaba buscar una dirección de forma fluida.

**Preferir:** barra de búsqueda interactiva directa con autocompletado flotante de Google Places, desglose de campos compacto con tonos neutros oscuros y foco esmeralda, y teclado en pantalla integrado con la búsqueda y los campos.

### 2026-08-17 — Preferencia UI: eliminación definitiva de Street View y monigote

**No repetir:** incluir Street View, visor de primera persona, monigote de arrastre o capas de cobertura en el mapa de ubicación de entrada exacta.

**Motivo:** el usuario determinó que no funciona satisfactoriamente para la operativa y solicitó eliminar la vista desde abajo, el monigote y todo lo relacionado.

**Preferir:** conservar exclusivamente las vistas `Mapa` y `Satélite`, con el pin rojo arrastrable directo, geocodificación inversa y notas del conductor.

### 2026-08-17 — Preferencia UI: cobertura de Street View en lugar de velo amarillo *(reemplazada)*

**No repetir:** iluminar todo el mapa con un velo o recuadro amarillo/ámbar (`bg-amber-300/10` y borde punteado) al arrastrar el monigote de Street View.

**Motivo:** alumbra y opaca el mapa, impidiendo al usuario ver claramente las calles reales y distinguir qué zonas tienen cobertura para soltar el monigote y cuáles no.

**Preferir:** activar la capa nativa de líneas de cobertura (`StreetViewCoverageLayer` de Google Maps) en color azul sobre las calles transitables sin velos superpuestos, manteniendo el mapa nítido y visible en todo momento.

### 2026-08-17 — Preferencia UI: monigote activado por arrastre

**Contexto:** Google Maps no abre Street View al pulsar el monigote; se debe soltar sobre una zona con cobertura.

**Decisión:** el icono del monigote en la barra de vistas será arrastrable y no abrirá una ubicación aproximada con un clic. Durante el arrastre, el mapa indica la zona de soltado y valida la cobertura al recibirlo.

**Resultado:** la vista se abre únicamente en el punto elegido por el usuario y no salta a otra calle al pulsar accidentalmente.

### 2026-08-17 — Preferencia UI: Street View en la barra de vistas *(reemplazada)*

**Contexto:** el monigote nativo de Google aparecía dentro del mapa y no quedaba junto a `Mapa` y `Satélite`.

**Decisión:** ocultar el control nativo dentro del mapa y mostrar un único botón compacto con el icono del monigote junto a `Mapa` y `Satélite`. El botón no lleva texto y cambia de estado al abrir la primera persona.

**Resultado:** las tres vistas quedan agrupadas en una sola fila, sin iconos duplicados ni controles ocultos detrás del mapa.

### 2026-08-17 — Preferencia UI: no duplicar el control de Street View *(reemplazada)*

**No repetir:** colocar un botón textual `Primera persona` encima del monigote nativo de Google Maps.

**Motivo:** el botón tapa el control real, crea dos acciones para la misma función y hace que el icono parezca quedar detrás.

**Preferir:** dejar únicamente el monigote nativo de Google Maps, con una zona interactiva reforzada, sin texto superpuesto y ubicado en la parte superior izquierda del mapa.

### 2026-08-17 — Preferencia UI: visor dedicado para primera persona *(reemplazada)*

**Contexto:** el botón de respaldo quedaba enfocado, pero el mapa no cambiaba visualmente al pulsarlo.

**Decisión:** `Primera persona` debe abrir un visor de Street View dedicado encima del mapa usando la panorámica encontrada. Mientras está abierto, la acción se convierte en `Cerrar vista` y permanece visible sobre el visor.

**Resultado:** el usuario recibe un cambio de vista evidente al pulsar la acción, sin depender de que el mapa base cambie internamente de modo.

### 2026-08-17 — Preferencia UI: acceso directo a primera persona *(reemplazada)*

**Contexto:** el monigote de Google puede verse dentro de la ventana flotante, pero su zona de arrastre no siempre responde en todos los tamaños de la ventana.

**Decisión:** conservar el control nativo de Street View y añadir junto al mapa una acción visible `Primera persona` que busque la panorámica exterior más cercana al pin actual antes de abrirla. La acción cambia a `Cerrar vista` mientras la panorámica está abierta.

**Resultado:** la vista a nivel de calle sigue disponible con el patrón de Google, pero también tiene un acceso claro y clicable cuando el control nativo no recibe el gesto.

### 2026-08-17 — Preferencia UI: Street View disponible desde el mapa de entrada

**Contexto:** el usuario necesita comprobar visualmente la entrada en primera persona antes de confirmar el pin.

**Decisión:** habilitar el monigote nativo de Google Maps para arrastrarlo sobre las calles con cobertura y entrar a Street View. Esta decisión reemplaza la preferencia anterior que ocultaba la vista a nivel de calle.

**Resultado:** la vista conserva `Mapa` y `Satélite` como controles principales y añade Street View como consulta contextual, sin convertirlo en una pestaña adicional.

### 2026-08-17 — Preferencia UI: no mostrar carga textual al mover el pin

**No repetir:** mostrar `Ubicando dirección…` como una línea adicional mientras el mapa resuelve un punto.

**Motivo:** agrega ruido visual en una ventana ya densa y desplaza el contenido sin aportar una acción.

**Preferir:** mantener la carga de forma interna y mostrar únicamente el resultado final o un error recuperable.

### 2026-08-17 — Preferencia UI: títulos descriptivos para direcciones

**No repetir:** usar títulos operativos como `Dónde recoger` o `Dónde entregar` en formularios de persona.

**Motivo:** describen la acción logística, pero no identifican claramente que la sección contiene los datos de una dirección.

**Preferir:** `Dirección del cliente` para remitentes y `Dirección del destinatario` para destinatarios.

### 2026-08-17 — Preferencia UI: una sola señal de validación de dirección

**No repetir:** mostrar `Verificada` en la cabecera y volver a mostrar `Verificada con Google` dentro del formulario.

**Motivo:** dos estados para la misma validación generan ruido y hacen parecer que son controles distintos.

**Preferir:** conservar un único panel contextual dentro de la sección de dirección, donde el estado y el mensaje de Google aparecen juntos.

### 2026-08-17 — Preferencia UI: mapa navegable sin instrucción Ctrl

**No repetir:** mostrar el mapa con una capa que indique mantener Ctrl para acercar o alejar.

**Motivo:** hace parecer que el mapa está bloqueado y agrega una regla innecesaria para una acción habitual.

**Preferir:** controles visibles de zoom, rueda y arrastre directos, además de botones de vista `Mapa` y `Satélite` que reflejen inmediatamente el cambio.

### 2026-08-17 — Preferencia UI: coincidencias de dirección con apartamento visible

**Contexto:** Google devuelve la dirección base, pero el apartamento o suite se captura en un campo separado y desaparecía visualmente de la coincidencia.

**Decisión:** mostrar el número de unidad escrito junto a la dirección principal, con formato `Dirección · Apto 511`.

**Resultado:** la persona puede verificar la dirección completa antes de elegir una coincidencia.

### 2026-08-17 — Preferencia UI: agregar contactos desde cada sección

**Contexto:** las acciones con texto `Agregar correo` y `Agregar teléfono` ocupaban una fila general y separaban la acción del campo que modifican.

**Decisión:** colocar un botón `+` compacto junto al título de `Correos` y `Teléfonos`, con `title` y etiqueta accesible que indiquen su función.

**Resultado:** cada acción queda ubicada donde el usuario espera agregar el dato, sin una barra adicional de contacto.

### 2026-08-17 — Preferencia UI: acciones explícitas para agregar contacto

**No repetir:** usar un botón aislado con solo `+` para agregar correo o teléfono.

**Motivo:** el usuario no puede saber qué tipo de contacto agregará el control sin abrirlo o adivinar su función.

**Preferir:** mostrar acciones visibles y nombradas como `Agregar correo` y `Agregar teléfono`, con iconos de apoyo.

### 2026-08-17 — Preferencia UI: no mostrar estado inicial redundante de Google

**No repetir:** mostrar `Buscar y validar en Google` como una pastilla permanente cuando la dirección todavía está vacía.

**Motivo:** el texto repite la función del formulario y ocupa espacio en la cabecera antes de que exista un estado que comunicar.

**Preferir:** ocultar la pastilla en reposo y mostrarla solo cuando haya un estado real, como `Buscando`, `Verificando`, `Verificada` o `Revisar dirección`.

### 2026-08-17 — Preferencia UI: formularios de persona con jerarquía sobria

**No repetir:** usar bordes gruesos y colores intensos en todos los campos, dividir el formulario en dos mitades rígidas con espacio vacío y amontonar acciones de dirección en una cabecera sin salto.

**Motivo:** la pantalla de remitente/dirección competía consigo misma: los campos parecían estados de error, la columna izquierda quedaba sobredimensionada y las acciones perdían jerarquía.

**Preferir:** una superficie única con columnas proporcionales al contenido, bordes sutiles, etiquetas grises y color reservado para foco, validación y acciones. La cabecera de dirección debe poder envolver sus acciones en pantallas estrechas.

### 2026-08-17 — Preferencia UI: resumen compacto de cambios sin guardar

**No repetir:** volcar listas largas de ciudades o zonas dentro del diálogo de descarte de cambios.

**Motivo:** el detalle completo domina el diálogo y dificulta entender rápidamente qué se modificó.

**Preferir:** mostrar cada cambio en una fila compacta con su categoría y un resumen útil, por ejemplo `Quitaste Tin` o `Agregaste Tan`; si solo cambiaron zonas internas, usar `Actualizaste zonas` con el conteo como apoyo.

### 2026-08-17 — Ajuste de controles de horario por día

**Contexto:** el editor de horarios mostraba el selector de conductor demasiado ancho, el control de hora tenía un área clicable pequeña y faltaba la opción de ruta sin hora final.

**Decisión:** usar el selector de hora compartido en salida y fin estimado, limitar el conductor a un ancho compacto comparable con los horarios y mostrar la casilla `Sin hora de fin · hasta terminar` debajo del fin estimado.

**Resultado:** los tres controles mantienen una escala coherente y la modalidad de cierre de ruta vuelve a estar disponible de forma visible.

### 2026-08-17 — Preferencia UI: horarios resumidos como tarjetas por día

**Contexto:** el resumen de varios horarios de una ruta aparecía concatenado en una sola línea y era difícil identificar cada día o consultar su detalle.

**Decisión:** representar cada día activo como una tarjeta compacta que muestre el nombre del día. Al pasar el cursor, enfocarla o pulsarla, mostrar el horario y su estado en una información contextual; la pulsación permite dejar el detalle visible.

**Resultado:** los días se escanean de forma independiente sin perder la información del horario ni ocupar una franja de texto difícil de leer.

### 2026-08-16 — Preferencia UI: ficha de vehículo con vista previa y modo lista ordenado

**Contexto:** en modo lista la foto ocupaba demasiado espacio y los datos y acciones del camión quedaban visualmente centrados en una fila muy alta.

**Decisión:** en modo lista, dar prioridad visual a una columna amplia de vista previa a la izquierda y mantener una columna de información a la derecha, con nombre, placa, capacidad, conductor y acciones agrupados de arriba hacia abajo. Los botones de fila deben ser compactos y ajustarse a su contenido. En el formulario, mostrar una vista previa de la foto y acciones explícitas `Agregar foto`, `Cambiar foto` y `Quitar foto`.

**Resultado:** la foto identifica rápidamente al camión y ocupa el protagonismo de la fila; las acciones quedan en una zona estable, compacta y fácil de escanear.

### 2026-08-16 — Preferencia UI: distinguir controles de vista del menú lateral

**No repetir:** usar flechas izquierda/derecha para abrir u ocultar las opciones de vista y apariencia cuando el mismo espacio también contiene el control del menú lateral.

**Motivo:** ambos controles se percibían como la misma acción, aunque uno despliega preferencias de la superficie y el otro contrae el menú de navegación.

**Preferir:** representar vista y apariencia con el icono de controles deslizantes (`SlidersHorizontal`) y un estado activo visible al expandirlo. Mantener el menú lateral con su icono de panel (`PanelLeftOpen`/`PanelLeftClose`) y sus etiquetas específicas.

### 2026-08-16 — Preferencia UI: controles de vista en todas las superficies logísticas

**Contexto:** el control plegable de vista y apariencia aparecía en Tareas, pero no en Vehículos, Conductores ni Calendario y rutas.

**Decisión:** cada superficie logística con un listado debe registrar su propio contexto de preferencias y mostrar el control compartido. Conductores, Vehículos y Calendario y rutas ofrecen como mínimo vista de lista y tarjetas; la preferencia queda aislada por superficie para no cambiar accidentalmente otra página.

**Resultado:** el usuario puede abrir `Ocultar opciones de vista y apariencia` en las cuatro áreas y cambiar el formato del listado desde el mismo patrón.

### 2026-08-16 — Preferencia UI: resumen visual de cambios sin guardar

**Preferir:** cuando se cambia de ruta con un borrador pendiente, mostrar un resumen breve en bloques con etiquetas como `Nombre`, `Zona`, `Horarios y días` y `Cobertura`. Cada bloque debe comunicar el valor anterior y el nuevo, y no deben mostrarse categorías que no cambiaron.

### 2026-08-16 — Preferencia UI: rutas como superficie principal del calendario

**No repetir:** mostrar `Días maestros` como una superficie separada encima de `Rutas del día` y volver a pedir la activación de días dentro de cada ruta.

**Motivo:** el usuario decidió que la ruta debe ser la entidad principal; la configuración de sus días debe vivir dentro de la ruta y no dividirse entre dos niveles de la pantalla.

**Preferir:** mostrar directamente el maestro-detalle de `Rutas`, abrir una ruta y gestionar ahí sus días, horarios y cobertura. La configuración global de días puede conservarse internamente para compatibilidad, pero no debe competir visualmente con el catálogo de rutas.

### 2026-08-16 — Preferencia UI: días maestros como única fuente y horarios contraídos *(reemplazada)*

**No repetir:** mostrar otra segunda fila persistente de `Lun–Dom` dentro del editor de una ruta cuando la pantalla ya tiene la sección `Días maestros`. Tampoco mostrar todos los campos de cada horario abiertos al mismo tiempo.

**Motivo:** el usuario indicó que la activación de días se veía repetida y que la vista debía aparecer contraída para mantener cada cosa en su lugar.

**Preferir:** dejar `Días maestros` como la referencia global de disponibilidad. En la pestaña `Horarios`, mostrar una lista de secciones plegables por día; la cabecera enseña día, horario resumido y estado, y al expandir se editan horas, conductor y activación. `Agregar día` aparece como acción puntual para copiar un horario a un día disponible, sin mantener otra barra global duplicada.

**Nota:** esta preferencia fue reemplazada inmediatamente por `Rutas como superficie principal del calendario`; los días maestros ya no se muestran en esta pantalla.

### 2026-08-16 — Preferencia UI: días de ruta como conmutadores visuales

**No repetir:** usar un `<select>` nativo dentro de cada horario para mezclar activación, duplicación y desactivación de días. El menú se vuelve largo, difícil de escanear y visualmente desconectado del estado real de la ruta.

**Motivo:** el usuario indicó que el desplegable de días se veía horrible y no comunicaba bien qué días estaban activos.

**Preferir:** mostrar una franja compacta de botones `Lun` a `Dom` con estado activo/inactivo visible. Activar un chip copia el primer horario disponible; desactivarlo conserva la ruta y deja el horario inactivo. Los campos de hora permanecen debajo, separados de la decisión de días.

### 2026-08-15 — Preferencia UI: mapa de cobertura de dirección contextualizado al día preseleccionado

**No repetir:** mostrar la barra conmutadora de los 7 días de logística en el diálogo de *Dirección y Coberturas* cuando el usuario ya eligió un día específico en el paso anterior.

**Motivo:** el usuario indicó que en esa vista solo debe mostrarse el día que se eligió antes, no los 7 días.

**Preferir:** filtrar automáticamente las rutas y coberturas exclusivamente al día preseleccionado (`selectedWeekday`), ocultando el conmutador de 7 días para evitar confusiones y mantener el diálogo enfocado y relevante.

### 2026-08-15 — Preferencia UI: eliminación de pastillas flotantes de resumen en modales de programación

**No repetir:** mostrar una pastilla o caja flotante de resumen (e.g. `DÍA Y HORA: Lun · 17 agosto 2026...`) entre el indicador de pasos y el contenido del formulario.

**Motivo:** el usuario solicitó quitarla para evitar elementos redundantes y mantener una interfaz más limpia y directa.

**Preferir:** dejar que la barra de pasos guíe el progreso y que cada paso contenga directamente sus campos sin capas intermedias de texto redundante.

### 2026-08-15 — Preferencia UI: unificación en una sola tarjeta para el paso de ruta en modales de programación

**No repetir:** mostrar 3 o más cajas y botones aislados apilados verticalmente (caja de selector de ruta, caja de horario, botón de continuar sin ruta y chips de resumen flotantes).

**Motivo:** el usuario expresó rechazo al diseño de múltiples tarjetas y botones apilados ("toda esta parte no me gusta júntalo de otra manera").

**Preferir:** unificar todo el paso de ruta en **una sola tarjeta principal** (`rounded-2xl border border-slate-800 bg-[#16201b] p-4`):
- Cabecera integrada con etiqueta `Ruta del día` y botón de acción `Ver dirección y coberturas`.
- Selector principal `InlineSearchPicker`.
- Sección inferior integrada (separada por un divisor sutil) con el horario de salida (`Clock3`) y la confirmación de cobertura (`✓`).
- Enlace sutil al pie para *¿Aún no decides la ruta? Continuar sin ruta*, eliminando botones pesados que compitan con la acción principal.

### 2026-08-15 — Preferencia UI: unificación de datos de ruta y horarios en una sola pestaña

**No repetir:** separar los datos generales de la ruta (color, nombre, zona) y los horarios en pestañas independientes (`Datos de ruta` y `Horarios`), multiplicando las pestañas en la barra superior.

**Motivo:** el usuario solicitó expresamente juntar los datos de la ruta y los horarios en una sola vista.

**Preferir:** simplificar el editor a únicamente dos pestañas: **`Horarios`** (que contiene la tarjeta con los datos de la ruta arriba y la lista de horarios abajo) y **`Cobertura`** (con el mapa interactivo full-height).

### 2026-08-15 — Preferencia UI: pestaña Horarios sin textos explicativos y con botón "+ Horario" al final

**No repetir:** mostrar un texto introductorio ("Define cuándo sale esta ruta") ni ubicar el botón `+ Horario` en una barra superior redundante sobre la lista de horarios.

**Motivo:** el usuario solicitó eliminar el texto innecesario y colocar el botón `+ Horario` en la parte inferior del listado de horarios.

**Preferir:** mostrar directamente las tarjetas de horarios y ubicar el botón `+ Horario` al pie de la lista para añadir nuevos horarios de forma limpia y directa.

### 2026-08-15 — Preferencia UI: botón único de "+ Nueva ruta" en cabecera de rutas del día

**No repetir:** duplicar el botón `+ Nueva ruta` en el estado vacío del panel derecho cuando ya existe el botón principal en la cabecera del panel izquierdo (*Rutas del día*).

**Motivo:** el usuario señaló que el botón `+ Nueva ruta` salía dos veces en la misma pantalla al no tener una ruta seleccionada.

**Preferir:** mantener el botón `+ Nueva ruta` exclusivamente en la cabecera del listado de rutas (panel izquierdo), dejando el estado vacío del panel derecho como un mensaje informativo limpio sin botones duplicados.

### 2026-08-15 — Preferencia UI: estabilidad total de layout (sin saltos ni redimensionado) al seleccionar rutas

**No repetir:** permitir que al seleccionar o abrir una ruta se produzcan saltos visuales, movimientos verticales o redimensionado en la página por diferencias de altura en cabeceras, animaciones de desplazamiento (`translateY` / `slide-in`), o llamadas a `scrollIntoView` en ventana.

**Motivo:** el usuario rechazó que la página parezca moverse de lugar o redimensionarse al hacer clic en una ruta.

**Preferir:** fijar alturas idénticas y constantes en las cabeceras de ambos paneles (`h-11 shrink-0`), eliminar traslaciones que alteren el bounding box, y restringir cualquier scroll estrictamente al contenedor interno `overflow-y-auto`, manteniendo la página 100% inmóvil y estable.

### 2026-08-15 — Preferencia UI: mantener estilo idéntico en la tarjeta de ruta durante el modo Cobertura

**No repetir:** cambiar el diseño, altura, padding o estructura de la tarjeta de ruta cuando pasa a modo Cobertura (por ejemplo, convirtiéndola en una mini-tarjeta con enlaces secundarios o perdiendo la línea de horario y el botón de archivar).

**Motivo:** el usuario expresó que la tarjeta debe verse exactamente igual todo el tiempo, conservando su identidad, dimensiones, muestra de color, nombre, zona, botón de archivar y horario.

**Preferir:** renderizar la tarjeta activa en la parte superior con la estructura y estilos exactos de la tarjeta original (`p-3.5`, `gap-2.5`, muestra de color interactiva, nombre en `text-sm font-black`, badge de zona, botón de archivar y línea de horario con `Clock3`), logrando total consistencia visual.

### 2026-08-15 — Preferencia UI: vista de Cobertura lado a lado (panel izquierdo de Zonas + panel derecho de Mapa completo)

**No repetir:** mostrar sub-pestañas "Zonas" y "Mapa" dentro del editor derecho forzando al usuario a alternar a ciegas entre la lista y el mapa mientras el panel izquierdo permanece ocupado con rutas secundarias irrelevantes.

**Motivo:** el usuario indicó que al entrar en Cobertura de una ruta, las demás rutas deben ocultarse para aprovechar ese espacio en mostrar el listado de zonas, teniendo el mapa y el listado de zonas visibles simultáneamente.

**Preferir:** un patrón de transición donde:
- Al abrir **Cobertura**, el panel izquierdo oculta las demás rutas, ancla la ruta activa como mini-tarjeta superior y despliega fluidamente el buscador y listado de zonas (`GeographicRoutePlacesEditor`).
- La cabecera del panel izquierdo ofrece un botón de retorno `← Rutas` para volver al listado de rutas del día.
- El panel derecho muestra exclusivamente el **Mapa interactivo a pantalla completa** (`fillHeight`, `resizable={false}`) sincronizado en tiempo real con la lista izquierda.

### 2026-08-15 — Preferencia UI: eliminación de campos de identidad redundantes en cabecera del editor de ruta

**No repetir:** mostrar la muestra de color y los campos de entrada de nombre y zona en la barra superior del editor de ruta.

**Motivo:** el usuario señaló que estos campos duplican exactamente lo que ya se está mostrando en la tarjeta de ruta seleccionada en el panel izquierdo (*Rutas del día*), recargando la cabecera.

**Preferir:** dejar la cabecera del editor limpia únicamente con las 3 pestañas principales (`Horarios`, `Cobertura`, `Datos de ruta`) y los botones de acción (`Cancelar`, `Guardar`), gestionando la edición de nombre, zona y color dentro de la pestaña dedicada **`Datos de ruta`**.

### 2026-08-15 — Preferencia UI: eliminación de barra flotante desconectada en Rutas e integración contextual de acciones

**No repetir:** mostrar una franja exterior superior con el título general `Rutas` y los botones de acción (`+ Nueva ruta`, `Cancelar`, `Guardar`) flotando fuera de la superficie principal Master-Detail.

**Motivo:** el usuario señaló que esa barra se siente desconectada de la interfaz y como si no tuviera que ver con el resto de cosas, además de descontextualizar las acciones (crear pertenece a la lista izquierda, guardar/cancelar al editor derecho).

**Preferir:** integrar cada acción directamente dentro del panel que le corresponde:
- `+ Nueva ruta` en la cabecera de **Rutas del día** (panel izquierdo) junto al conteo.
- `Cancelar`, `Guardar` y la insignia `Sin guardar` en la cabecera del **Editor de ruta** (panel derecho) junto a la identidad y las pestañas.
- Eliminar la franja superior externa para maximizar la cohesión visual y el espacio vertical útil.

### 2026-08-15 — Preferencia UI: pantalla de Rutas y mapa de cobertura ajustados al viewport sin scrollbar vertical

**No repetir:** permitir que al abrir la pestaña Cobertura el mapa y los paneles apilados expandan la altura de la página, forzando un scrollbar vertical y obligando al usuario a desplazarse hacia arriba y abajo para ver la barra de acciones o los días maestros.

**Motivo:** el usuario expresó rechazo a tener que subir y bajar en la página para ver los elementos; todo el catálogo, listado y mapa de cobertura deben caber completamente en la vista simultáneamente.

**Preferir:** un diseño *viewport-fit* donde los contenedores usen `flex h-full min-h-0 w-full flex-col` sin encabezados introductorios permanentes, la sección de Días maestros sea compacta (`shrink-0`), y el mapa de cobertura ocupe el 100% de la altura útil del panel derecho (`fillHeight`, `resizable={false}`) manteniendo los scrolls restringidos estrictamente al interior de las listas si es necesario, sin scroll vertical en la página general.

### 2026-08-15 — Preferencia UI: botón de archivar integrado en cabecera de la tarjeta de ruta

**No repetir:** colocar el botón de archivar aislado en una franja/pie inferior separado por un divisor en la tarjeta de ruta.

**Motivo:** al eliminarse los controles redundantes del pie de la tarjeta, el botón quedaba solitario e innecesariamente ocupando espacio vertical con una línea divisoria vacía.

**Preferir:** ubicar el botón de archivar compacto junto a la etiqueta de zona en la esquina superior derecha de la tarjeta de ruta, eliminando por completo la franja inferior vacía y haciendo la tarjeta más limpia y compacta.

### 2026-08-15 — Preferencia UI: franja superior integrada (Color + Nombre + Zona) con pestañas Horarios y Cobertura

**No repetir:** tener una pestaña separada "Datos de ruta" solo para nombre, zona y color, obligando a cambiar de pestaña para editar la identidad básica de la ruta.

**Motivo:** el usuario indicó que el color y los datos deben cambiarse directamente en la cabecera/muestra de la ruta ("acá debería"), manteniendo las pestañas operativas limpias y directas.

**Preferir:** integrar en la barra superior compacta del editor la muestra de color interactiva (`<input type="color">`), el nombre de la ruta y la zona en una sola línea accesible todo el tiempo, dejando únicamente 2 pestañas con iconos (`Horarios` y `Cobertura`).

### 2026-08-15 — Preferencia UI: selector de color interactivo directamente en la muestra principal

**No repetir:** mostrar un punto o indicador de color estático junto al nombre de la ruta y un segundo botón duplicado en el pie de la tarjeta para cambiar el color.

**Motivo:** el usuario señaló que no tiene sentido tener dos círculos con el mismo color (uno de muestra y otro para hacer clic), lo cual genera redundancia visual e innecesarios controles duplicados.

**Preferir:** hacer que el punto de color principal junto al nombre de la ruta sea directamente interactivo (`<input type="color">` transparente con hover zoom y tooltip), eliminando el selector repetido del pie de la tarjeta.

### 2026-08-15 — Preferencia UI: denominación "Rutas" en lugar de "Subrutas"

**No repetir:** usar el término "subruta" o "subrutas" en títulos, botones, tarjetas, contadores y modales de la interfaz de Logística.

**Motivo:** el usuario solicitó cambiar la denominación a "Rutas" para simplificar la terminología y hacer más natural la operación.

**Preferir:** emplear consistentemente "Ruta" y "Rutas" en toda la interfaz (ej: "Rutas", "Nueva ruta", "Rutas del día", "3 rutas", "Directa", "Ruta creada", etc.).

### 2026-08-15 — Preferencia UI: eliminación de la cabecera superior en el editor de subrutas

**No repetir:** mostrar una franja de encabezado fija (swatch, insignia "Editar subruta", nombre de la ruta, badge de zona y día) encima del editor de subrutas.

**Motivo:** el usuario rechazó esa franja superior por ocupar espacio y recargar visualmente; la subruta activa ya está seleccionada en el listado lateral y sus datos se gestionan directamente dentro de las pestañas.

**Preferir:** iniciar el panel de edición directamente con las pestañas de acción (`Horarios`, `Cobertura`, `Datos de ruta`) sin cabeceras intermedias.

### 2026-08-15 — Preferencia UI: editor de subruta en pestañas con iconos y sin tarjetas fijas apiladas

**No repetir:** apilar permanentemente la tarjeta de identidad (Nombre, Zona, Color) encima de las pestañas de Horarios y Cobertura, ocupando espacio vertical excesivo y desplazando el contenido operativo.

**Motivo:** el usuario solicitó separar los elementos en pestañas con iconos para que no ocupe tanto espacio vertical y la vista sea más ágil y espaciosa.

**Preferir:** organizar el editor de subruta en 3 pestañas compactas con iconos:
- `Horarios` (con icono `Clock3` y contador).
- `Cobertura` (con icono `MapPinned` y contador, aprovechando toda la altura de pantalla para el mapa).
- `Datos de ruta` (con icono `SlidersHorizontal` para nombre, zona y color).
- Encabezado superior minimalista en una sola franja con swatch de color, insignia de estado, nombre de la subruta y etiqueta del día.

**Resultado:** el editor no desperdicia espacio vertical; cada sección tiene su propio espacio limpio y la cobertura cuenta con el 100% de la altura útil.

### 2026-08-15 — Preferencia UI: cabecera de subrutas sin badges ni disclosures redundantes

**No repetir:** colocar pastillas con el día/conteo de rutas (`Lunes · 2 subrutas configuradas`) ni botones de ayuda `CompactInfoDisclosure` junto al título principal `Subrutas`.

**Motivo:** el usuario indicó que estorbaba y sobrecargaba la vista; el día y el conteo ya están claramente representados en la barra superior de Días Maestros y en la cabecera del listado de Rutas del día.

**Preferir:** dejar la cabecera limpia con el título `Subrutas` y las acciones primarias (`Nueva subruta`, `Guardar`, `Cancelar`).

**Resultado:** cabecera minimalista, ágil y sin información duplicada.

### 2026-08-15 — Preferencia UI: contraste y elevación de tarjetas sobre el fondo

**No repetir:** usar el mismo tono de fondo de la página (`#29312d` / `bg-surface-card` / `bg-surface-shell`) en las tarjetas, listados y contenedores, haciendo que los elementos se mimetizen y se sientan planos sin separación visual.

**Motivo:** el usuario expresó que no le gusta que los elementos y tarjetas compartan el mismo color del fondo de la página, ya que se pierde la jerarquía, el relieve y la visibilidad de los bloques interactivos.

**Preferir:** una jerarquía de superficies oscuras bien diferenciadas:
- Contenedores de trabajo con tono profundo y grounded (`bg-[#121815]`/`bg-[#141b18]`) y bordes nítidos `border-slate-800`.
- Tarjetas operativas elevadas y visibles (`bg-[#1e2723]` / `border-slate-700/80` / `shadow-md`), con estados hover (`hover:bg-[#27342e]`) y estados activos iluminados (`bg-emerald-950/60 border-emerald-400 ring-1 ring-emerald-400/50`).
- Campos de entrada y chips de detalle empotrados con contraste oscuro (`bg-[#0f1412] border-slate-700`).

**Resultado:** las subrutas, días maestros y horarios destacan claramente sobre el fondo general de la aplicación con profundidad, contraste y legibilidad óptima.

### 2026-08-15 — Preferencia UI: rediseño integral de catálogo de subrutas y días maestros

**No repetir:** contenedores negros rígidos con marcos oscuros toscos, tarjetas vacías con bordes negros pesados, acordeones anidados desarticulados y elementos sin jerarquía o iluminación visual.

**Motivo:** el diseño previo se percibía tosco, oscuro, con cajas pesadas y bordes negros agresivos que dificultaban la lectura de rutas, días activos, horarios y coberturas.

**Preferir:** una interfaz estructurada y moderna con una sola superficie shell integrada:
- Selector de **Días maestros** en tarjetas cuadrícula de 7 días con anillos/glows activos, estado sutil (subrutas configuradas o ruta directa) e interruptor táctil rápido.
- Diseño **Master-Detail** en panel dividido: a la izquierda, listado interactivo de *Rutas del día* con tarjeta visual, swatch circular de color, badge de zona, resumen de horarios, selector rápido de color y acción de archivar; a la derecha, editor de subruta con tarjeta de identidad limpia, tabs tipo píldora (`Horarios` con badges y `Cobertura` con mapa interactivo y listado de zonas raíz).
- Estados vacíos ilustrados con iconos semánticos (`Compass`, `Route`) y llamadas a la acción directas para crear subrutas.

**Resultado:** el catálogo mantiene el 100% de la funcionalidad (borradores, mapas, selector de conductores, horarios con/sin hora de fin, confirmación de descarte de cambios) con una experiencia visual fluida, luminosa y altamente legible.

### 2026-08-15 — Preferencia UI: subrutas como flujo de trabajo

**No repetir:** mostrar los grupos de subrutas como tarjetas grandes y anidadas, ni abrir el formulario de nueva subruta dentro de una caja pesada con mucho espacio vacío.

**Motivo:** la jerarquía visual hacía difícil distinguir el listado, el grupo activo y el formulario; la expansión se sentía aparatosa y poco clara.

**Preferir:** usar un índice maestro de subrutas separado del panel de edición, con filas ligeras y divisores. La nueva subruta se crea en ese mismo panel, de forma compacta y claramente identificada. Las pestañas deben ser discretas y el pie de acciones debe ocupar solo el espacio necesario.

**Resultado:** la sección prioriza el listado y el contexto; seleccionar una subruta cambia el panel de trabajo sin convertir todo el grupo en otra tarjeta.

### 2026-08-15 — Preferencia UI: cobertura sin desplazamiento interno

**No repetir:** introducir un scrollbar vertical dentro del panel de subrutas cuando se muestra el mapa.

**Motivo:** el desplazamiento interno mueve el contenido y hace que el mapa aparezca de forma incómoda, separado del contexto del listado.

**Preferir:** dejar que el panel crezca de forma natural y mostrar el mapa y el listado completos dentro de la misma superficie, sin altura fija ni `overflow-y-auto`.

**Resultado:** la cobertura se presenta completa y estable; solo el desplazamiento normal de la página queda disponible cuando el contenido realmente supera el viewport.

### 2026-08-15 — Preferencia UI: mapa a altura completa

**No repetir:** dejar el mapa reducido a una franja en la parte superior mientras queda espacio vacío debajo dentro del editor.

**Motivo:** la cobertura pierde protagonismo y el mapa deja de aprovechar la superficie disponible.

**Preferir:** hacer que el mapa estire su superficie hasta el final de la cobertura y que quede alineado con la altura del listado. Las acciones `Cancelar`/`Guardar` deben vivir en una fila compacta junto a `Nueva subruta`, fuera de la superficie flexible del editor, para que no creen un hitbox de ancho completo ni recorten la superficie del mapa.

**Resultado:** mapa y listado comparten una superficie de cobertura completa, sin huecos visuales innecesarios.

### 2026-08-15 — Preferencia UI: guardar sin contraer la subruta

**No repetir:** cerrar o contraer el grupo de una subruta después de pulsar `Guardar`.

**Motivo:** la persona necesita comprobar el resultado guardado y continuar trabajando en la misma ruta sin volver a abrirla.

**Preferir:** conservar la subruta expandida, mantener la pestaña visible y limpiar el indicador de cambios sin guardar después de una respuesta exitosa.

**Resultado:** guardar confirma la operación sin cambiar el contexto de trabajo; `Cancelar` o `Cerrar` siguen siendo las acciones para contraer el grupo.

### 2026-08-15 — Preferencia UI: controles del mapa en una sola barra

**No repetir:** colocar una explicación separada encima del mapa cuando la propia barra del mapa ya comunica la acción disponible.

**Motivo:** el texto duplicaba la instrucción de selección y desplazaba innecesariamente el mapa y el listado.

**Preferir:** mantener una barra compacta dentro del mapa con `Seleccionar área` y `Mi ubicación`. `Mi ubicación` debe centrar el mapa en la posición actual del navegador.

**Resultado:** la cobertura empieza directamente con sus controles operativos, sin repetir instrucciones fuera del mapa.

### 2026-08-15 — Preferencia UI: mapa y listado de cobertura en una sola superficie

**No repetir:** separar `Mapa` y `Listado` de una subruta como pestañas excluyentes.

**Motivo:** al seleccionar zonas sobre el mapa, la persona necesita comprobar inmediatamente el resultado en el listado sin cambiar de vista.

**Preferir:** mostrar mapa y listado juntos dentro de `Cobertura`, con el mapa como superficie principal y el listado sincronizado al lado o debajo según el ancho disponible. Ambos editan el mismo borrador local.

**Resultado:** agregar o quitar una zona en el mapa actualiza el listado en el mismo momento y conserva el guardado explícito de la subruta.

### 2026-08-15 — Preferencia UI: listado de cobertura resumido por ciudad

**No repetir:** mostrar en el editor de una subruta el contador, los chips y el desglose de todas las zonas hijas de una ciudad.

**Motivo:** el listado se vuelve demasiado largo y la persona necesita identificar la cobertura por su ciudad principal, no leer cada zona interna.

**Preferir:** mostrar únicamente la ciudad raíz, por ejemplo `Santa Clarita`, dentro del listado de la subruta. El mapa conserva la cobertura completa y las zonas guardadas no se eliminan; el cambio es únicamente de presentación.

**Resultado:** la lista queda compacta y legible sin alterar la cobertura operativa ni el borrador que se guarda.

### 2026-08-15 — Preferencia UI: mapa editable de cobertura de subruta

**No repetir:** presentar el `Mapa` de una subruta como una vista únicamente informativa sin controles para activar o desactivar zonas.

**Motivo:** la cobertura geográfica se trabaja directamente sobre el mapa; obligar a volver al listado para cada zona elimina la interacción que el operador necesita para explorar y ajustar el área.

**Preferir:** permitir clic en piezas individuales y selección por área. Las zonas nuevas aparecen como vista previa con `Agregar zona`, las selecciones existentes se pueden quitar desde el mapa y los cambios permanecen en el borrador hasta `Guardar`.

**Resultado:** `Listado` y `Mapa` editan la misma cobertura local, con confirmación intermedia para nuevas zonas y sin persistir cambios por el solo hecho de explorar el mapa.

### 2026-08-15 — Preferencia UI: horarios de subruta sin límites de paradas o cajas

**No repetir:** mostrar en la pestaña `Horarios` de una subruta los campos `Máx. paradas` y `Máx. cajas`.

**Motivo:** la configuración visible de la subruta debe concentrarse en día, horario y conductor, sin presentar esos límites como opciones editables en este flujo.

**Preferir:** mostrar únicamente día, hora de inicio, hora final opcional, conductor y la opción `Sin hora de fin · hasta terminar`. Los límites que ya existan se conservan internamente para no borrarlos silenciosamente al editar otros datos.

**Resultado:** la pestaña `Horarios` queda más clara y compacta; retirar los controles no altera rutas operativas ni elimina datos persistidos.

### 2026-08-15 — Preferencia UI: Ruta Norte con Horarios y Cobertura separadas

**No repetir:** abrir una subruta con una pestaña independiente de `Datos` y mostrar la cobertura únicamente como una lista dentro del mismo panel.

**Motivo:** la identidad de la subruta debe permanecer visible como `Ruta Norte`, mientras que la persona necesita cambiar directamente entre sus horarios y su cobertura y consultar la cobertura en el formato más útil para cada momento.

**Preferir:** al pulsar la cabecera de la subruta, mostrar dos pestañas principales: `Horarios` y `Cobertura`. Dentro de `Cobertura`, mostrar las opciones `Listado` y `Mapa`; el listado conserva el buscador y la edición de ciudades o zonas, y el mapa queda disponible como vista separada para revisar la cobertura sin apilar ambas superficies.

**Resultado:** la configuración de una subruta se entiende como una sola superficie con identidad, horarios y cobertura; cambiar de `Listado` a `Mapa` es una consulta reversible y no altera el guardado.

### 2026-08-14 — Preferencia UI: variante 3 como invoice oficial

**No repetir:** usar en Ventas el invoice anterior, con una composición operativa de tarjetas, caja de cobro y jerarquía visual fragmentada.

**Motivo:** la variante 3 fue la propuesta aprobada por su presencia editorial, lectura clara del detalle y separación visible entre total, abono y saldo.

**Preferir:** usar la composición `Premium / editorial` como invoice oficial de Ventas y del expediente, manteniendo el mismo documento para impresión, QR, etiquetas, Venta rápida y edición del abono. El diseño debe adaptarse a datos reales de Boxario, conservar referencias continuas sin separadores y mostrar cada caja física con su código e importe.

**Resultado:** la variante 3 dejó de ser únicamente una demo y se convirtió en la fuente visual reutilizable de los invoices productivos.

### 2026-08-14 — Preferencia UI: fecha de emisión en el cierre del invoice

**No repetir:** mostrar la fecha de emisión en la línea superior del documento.

**Motivo:** la cabecera debe priorizar la marca, el título y la referencia; la fecha debe acompañar las condiciones y notas operativas del invoice.

**Preferir:** mostrar `Fecha de emisión: [fecha]` en el bloque inferior, junto a `Conserva esta factura...` y la información de recolección incluida.

**Resultado:** la parte superior queda más limpia y la fecha se consulta junto con el resto de condiciones del documento.

### 2026-08-14 — Preferencia UI: identificación comercial en el cierre del invoice

**No repetir:** mostrar en la cabecera la franja `SCGS / DOCUMENTO COMERCIAL` con la fecha alineada a la derecha.

**Motivo:** esa franja forma parte del cierre documental y debe acompañar las notas, el QR y la información operativa inferior.

**Preferir:** mostrar toda la franja al final del invoice, con la marca a la izquierda y la fecha a la derecha.

**Resultado:** la cabecera queda reservada para el contenido principal de la factura y la identificación documental se concentra en el cierre.

### 2026-08-14 — Cobertura editable desde una subruta

**Contexto:** El botón `Cobertura` de una subruta solo abría una vista de consulta con las zonas ya guardadas; no había una acción clara para agregar o quitar lugares de Ruta Norte, Ruta Sur u otra subruta.

**Decisión:** `Cobertura` debe abrir la sección editable de la subruta. Esa sección muestra el buscador de ciudades y zonas, el desglose de zonas hijas y la acción confirmada para quitar una cobertura. Esta decisión reemplaza la preferencia anterior que ocultaba la cobertura del editor de subrutas.

**Resultado:** La persona puede administrar las zonas de cada subruta desde el mismo contexto donde administra su nombre y horarios, sin depender de un diálogo de solo lectura.

### 2026-08-14 — Cobertura de ruta sin contexto de cliente

**Contexto:** El botón `Cobertura` de la configuración de Logística reutilizaba el comparador de una dirección y mostraba `La dirección del cliente no pudo ubicarse en el mapa`, aunque esa pantalla no tiene cliente seleccionado.

**Decisión:** El comparador debe distinguir la consulta de una dirección de cliente de la consulta de una cobertura configurada. En configuración, usar `Cobertura de la ruta` y `Cobertura configurada para esta ruta`; no mostrar acciones ni mensajes que impliquen que existe un cliente o una dirección pendiente.

**Resultado:** La ventana comunica que se está revisando la configuración de la ruta y no presenta un error de geocodificación inexistente.

### 2026-08-14 — Días visibles fuera del selector de rutas

**Contexto:** Mostrar los días únicamente dentro del desplegable hacía que desaparecieran cuando el selector estaba cerrado.

**Decisión:** La fila de lunes a domingo debe permanecer visible en la superficie principal del comparador, antes del selector de rutas. El desplegable se reserva para listar y elegir las rutas del día.

**Resultado:** El calendario semanal se reconoce sin abrir controles adicionales y la separación por día queda disponible desde el primer vistazo.

### 2026-08-14 — Coberturas separadas por día operativo

**Contexto:** El comparador de `Dirección y coberturas` mezclaba las rutas de lunes a domingo en una sola lista y dejaba el día como un dato secundario.

**Decisión:** Mostrar siempre los siete días de logística en orden de lunes a domingo. Los días activos usan el acento verde y permiten abrir sus coberturas; los días inactivos permanecen grises y deshabilitados. Las rutas se agrupan bajo el día que les corresponde.

**Resultado:** El operador identifica de inmediato qué días están configurados y puede revisar las coberturas de cada día sin mezclar rutas de jornadas distintas.

### 2026-08-14 — Mapa de entrada sin vista a nivel de calle

**No repetir:** mostrar la opción `A nivel de calle` junto a `Mapa` y `Satélite` en el mapa de entrada exacta.

**Motivo:** no es una vista necesaria para este flujo y ocupa espacio en la barra de controles.

**Preferir:** mantener únicamente `Mapa` y `Satélite`.

### 2026-08-14 — Mapa de entrada usa el espacio vertical disponible

**Contexto:** La ventana del mapa ocupaba toda la pantalla, pero el mapa estaba limitado a `30vh` y dejaba gran parte del área inferior vacía.

**Decisión:** El mapa de entrada debe crecer como la superficie flexible principal de la ventana, conservando los controles superiores y las acciones inferiores fuera del mapa. Solo mantiene una altura mínima para que siga siendo utilizable en ventanas pequeñas.

**Resultado:** El mapa aprovecha el espacio vertical disponible y deja de mostrar una zona negra innecesaria debajo.

### 2026-08-14 — Control de activación para recolección incluida

**Contexto:** El bloque de `Recolección incluida` necesitaba una forma clara de indicar si el beneficio está disponible.

**Decisión:** Mostrar junto al título un checkbox compacto con estado textual `Activa`/`Inactiva`. Al desactivar, el campo de días permanece visible pero deshabilitado y atenuado para conservar la configuración sin sugerir que puede editarse mientras la opción está apagada.

**Resultado:** El estado se entiende de un vistazo y el control no agrega una tarjeta o superficie anidada a la configuración.

### 2026-08-14 - Preferencia UI: conservar la edición del abono en Final

**No repetir:** mover la acción `Crear invoice` al paso 4 y saltarse el documento editable del paso 5.

**Motivo:** el vendedor necesita revisar y cambiar el valor del abono antes de confirmar la creación.

**Preferir:** el paso 4 debe decir `Siguiente`; el paso 5 concentra la edición del abono, la revisión del invoice y la confirmación final. Su acción principal visible debe decir `Crear invoice` y abrir la confirmación de pago antes de guardar.

### 2026-08-14 - Preferencia UI: rutas de cobertura dentro de un desplegable

**No repetir:** mostrar todas las rutas de cobertura como un listado permanente dentro del diálogo.

**Motivo:** el listado ocupa espacio y compite visualmente con el mapa y la dirección del cliente.

**Preferir:** mostrar la ruta activa en un selector desplegable cerrado por defecto; dentro del desplegable conservar la búsqueda, `Todas las rutas` y las opciones de rutas con sus estados de cobertura.

### 2026-08-14 - Preferencia UI: una sola selección operativa de ruta

**No repetir:** permitir seleccionar otra ruta dentro del comparador de coberturas cuando el formulario ya tiene un selector externo de ruta.

**Motivo:** el comparador solo cambia la vista del mapa y no guarda la asignación, por lo que dos selectores generan una expectativa falsa y confusa.

**Preferir:** en el flujo de programación, el selector exterior es la única fuente para elegir la ruta y el modal muestra únicamente la cobertura de esa ruta. El comparador conserva la comparación entre rutas solo en contextos que no tienen otro selector operativo.

### 2026-08-14 - Preferencia UI: cobertura sin edición de pin en el paso de ruta

**No repetir:** mostrar `Pin`, `Confirmar pin exacto` o instrucciones para mover la ubicación dentro del paso donde se define la ruta.

**Motivo:** la ubicación del remitente o destinatario se confirma en el paso anterior; mezclar su edición con la selección de ruta hace parecer que ambas operaciones se guardan juntas.

**Preferir:** en el paso de ruta mostrar la ubicación únicamente como referencia fija del mapa y concentrar las acciones en consultar la cobertura, reencuadrar la ruta y elegir la ruta desde el control exterior.

### 2026-08-14 - Actualización UI: comparar otras rutas sin cambiar la asignación

**Contexto:** el paso de rutas necesita consultar la cobertura de rutas alternativas, pero el selector exterior debe seguir siendo el control que define la ruta operativa.

**Decisión:** el nombre de la ruta visible en el modal funciona como un desplegable de vistas. Permite elegir `Todas las rutas` u otra ruta para reencuadrar el mapa, con una aclaración visible de que el cambio solo afecta la visualización.

**Resultado:** se pueden comparar coberturas sin duplicar ni ocultar el control que guarda la ruta elegida.

### 2026-08-14 - Preferencia UI: desplegable de rutas superpuesto

**No repetir:** abrir el selector de rutas dentro del flujo normal del modal y desplazar el mapa o cambiar la altura de la ventana.

**Motivo:** la expansión modifica el contexto visible y mueve elementos que el operador ya estaba consultando.

**Preferir:** anclar el panel de rutas debajo del control activo, superponerlo sobre el contenido y darle scroll propio cuando sea necesario.

### 2026-08-14 - Preferencia UI: selector de rutas neutral y ordenado por remitente

**No repetir:** asignar una paleta de colores distinta a cada ruta dentro del comparador de coberturas.

**Motivo:** con más rutas, los colores por identidad hacen que el selector sea más difícil de leer y no comunican cuál ruta corresponde a la dirección abierta.

**Preferir:** mostrar todas las rutas con el mismo tratamiento neutral, ordenarlas primero por coincidencia de cobertura y después por cercanía aproximada a la dirección del remitente, y resaltar en verde únicamente las rutas cuya cobertura coincide. El listado debe incluir un buscador por nombre, zona o día.

### 2026-08-14 - Preferencia UI: mapa de entrada sin encabezado promocional

**No repetir:** mostrar la barra superior con `Cliente verifica su ubicación`, la descripción del mapa y una X de cierre dentro de la ventana emergente.

**Motivo:** ocupa espacio vertical y duplica acciones que ya están disponibles en el flujo del mapa.

**Preferir:** iniciar directamente con el formulario y el mapa; conservar las acciones inferiores de `Cancelar` y `Confirmar ubicación`.

### 2026-08-14 - Preferencia UI: mapa del cliente sin datos operativos

**No repetir:** mostrar `Referencias` y `Nota para el conductor` dentro de la ventana que se abre con `Cliente verifica mapa`.

**Motivo:** esa ventana se entrega al cliente para confirmar la dirección y la entrada exacta; las instrucciones internas no forman parte de esa revisión.

**Preferir:** mantener el mapa del cliente enfocado en dirección, pin y `Confirmar ubicación`. Mostrar las pestañas `Referencias` y `Nota para el conductor` en el comparador interno que se abre con `Ver rutas y coberturas`.

### 2026-08-14 - Preferencia UI: tarjetas de personas optimizadas para móvil

**No repetir:** reservar una columna lateral completa para `Rápido` ni convertir toda la dirección en una superficie clicable en las listas de remitentes y destinatarios.

**Motivo:** en pantallas estrechas la columna lateral reduce el espacio para leer y seleccionar la persona, y tocar la dirección abre el mapa por accidente.

**Preferir:** colocar `Rápido` debajo del icono de la persona y mantener la dirección como texto; el acceso al mapa debe ser un botón compacto con el icono de ubicación.

### 2026-08-14 - Preferencia UI: subrutas sin selector de cobertura por ciudad

**No repetir:** mostrar en el editor de subrutas el selector `Por ciudad / zona`, el panel de ciudades y zonas atendidas o el contador de lugares de la subruta.

**Motivo:** esa modalidad no debe formar parte de la configuración visible de una subruta.

**Preferir:** mostrar únicamente la identidad y los horarios de la subruta. Los datos históricos de cobertura se conservan internamente para no borrarlos al editar rutas antiguas.

### 2026-08-14 - Consulta de cobertura desde una subruta

**Contexto:** en la lista de subrutas faltaba un acceso directo para comprobar en el mapa qué cobertura tiene la ruta abierta.

**Decisión:** cada subruta muestra una acción compacta `Cobertura` que abre el mapa reutilizando el diálogo compartido y muestra únicamente la cobertura configurada para esa subruta.

**Resultado:** la cobertura se consulta desde el contexto de la subruta sin agregar un selector operativo duplicado ni introducir edición de cobertura dentro del editor de identidad y horarios.

### 2026-08-14 - Preferencia UI: editor de subruta organizado por pestañas

**No repetir:** presentar las secciones del editor como una lista de filas colapsables de altura y estilo distintos.

**Motivo:** la relación entre identidad y horarios se percibe fragmentada y ocupa espacio sin una navegación clara.

**Preferir:** dos pestañas compactas, `Datos` y `Horarios`, con iconos, estado activo visible y un solo panel abierto a la vez. La pestaña `Horarios` muestra el número de horarios configurados.

### 2026-08-14 - Preferencia UI: comparador de coberturas con rutas seleccionables

**No repetir:** mostrar todas las coberturas de rutas distintas en un único mapa sin una forma visible de cambiar la vista ni de volver a la dirección del cliente.

**Motivo:** el operador necesita distinguir qué zonas pertenecen a cada ruta y regresar rápidamente al punto del cliente después de explorar una cobertura.

**Preferir:** controles compactos para `Todas las rutas` y cada ruta, con la ruta activa claramente marcada, más la acción `Ir a dirección del cliente`. Esta última se deshabilita y explica la causa cuando no existe una coordenada verificada.

### 2026-08-14 - Preferencia UI: la ruta sugerida es la vista inicial

**No repetir:** abrir el comparador en `Todas las rutas` cuando Ventas ya recibió una ruta sugerida por coincidencia de cobertura.

**Motivo:** el operador debe comprobar primero la cobertura que originó la sugerencia; las demás rutas son alternativas para comparar, no el contexto inicial.

**Preferir:** seleccionar y mostrar primero la ruta sugerida. `Todas las rutas` permanece disponible como acción explícita y la vista se reinicia a la sugerencia cada vez que se vuelve a abrir el comparador.

### 2026-08-14 - Preferencia UI: mostrar ubicación aproximada si falta entrada exacta

**Contexto:** Una dirección del cliente puede estar guardada sin un pin de entrada exacta confirmado.

**Decisión:** El comparador debe mostrar la ubicación geocodificada de la dirección como respaldo y no ocultar el pin solo porque falta la entrada exacta.

**Preferir:** usar un marcador visualmente diferenciado y el aviso `Se muestra la ubicación aproximada de la dirección del cliente. El pin no representa una entrada exacta confirmada.`; reservar el aviso de error para cuando tampoco se pueda obtener una ubicación de la dirección.

### 2026-08-14 - Mapa de coberturas enfocado en el cliente

**Preferir:** al abrir “Ver dirección y coberturas”, centrar el mapa en la dirección del cliente con un zoom de zona; no encuadrar todas las coberturas si eso produce una vista mundial.

### 2026-08-14 - Cancelación visible de Venta rápida

**Preferir:** mostrar una X identificada como `Cancelar venta rápida` en la barra superior mientras el checkout aún no está confirmado.

### 2026-08-14 - Acción compacta para omitir el abono inicial

**Preferir:** reemplazar el checkbox de “Sin abono inicial” por una X junto al botón de restaurar del abono; la X pone el abono en cero sin ocultar la fila `Abono`, y restaurar devuelve el depósito calculado.

### 2026-08-14 - Desglose de cajas bajo demanda

**Preferir:** mantener ocultas las medidas de las cajas en la barra de pasos y mostrarlas únicamente al hacer clic en la cantidad de productos.

### 2026-08-14 - Restaurar depósito calculado

**Preferir:** junto al abono editable de la factura, mostrar un icono de restaurar que devuelva el depósito calculado originalmente por el sistema.

### 2026-08-14 - Productos antes del desglose de cajas

**Preferir:** en el paso `Caja`, mostrar primero el país de precios, luego la cantidad de productos y debajo el desglose de medidas de las cajas.

### 2026-08-14 - Venta rápida sincroniza cambios antes del invoice

**No repetir:** mostrar el invoice con una selección de cajas distinta a la que está actualmente seleccionada.

**Motivo:** el invoice podía mostrar la selección anterior aunque el vendedor hubiera agregado o quitado cajas.

**Preferir:** llamar `Siguiente` al botón del paso `Caja`; si el vendedor entra directamente a `Final` con cambios pendientes, ejecutar automáticamente la misma actualización antes de mostrar el invoice.

### 2026-08-14 - Numeración propia para Venta rápida

**No repetir:** mostrar en Venta rápida el número interno del paso equivalente de la venta normal, como `5 Final`.

**Motivo:** Venta rápida solo tiene tres pasos visibles y la numeración debe comunicar ese flujo real.

**Preferir:** numerar Venta rápida como `1 Remitente`, `2 Caja` y `3 Final`; conservar la numeración completa únicamente en ventas normales.

### 2026-08-14 - Fecha de entrega visible en el plazo de recolección

**No repetir:** mostrar en la factura el plazo de recolección solo como "desde la entrega" sin indicar cuándo ocurrió.

**Motivo:** el cliente necesita saber desde qué fecha corre el plazo incluido.

**Preferir:** mostrar la fecha real de `empty_box_delivered_at`; si aún no existe, indicar que está pendiente de registro sin inventar una fecha.

### 2026-08-14 - Preferencia UI: referencia de invoice sin guiones

**No repetir:** mostrar la referencia base de un invoice con separadores, por ejemplo `COL2-001-001-0004`.

**Motivo:** la referencia se lee mejor como una cadena continua y los guiones agregan cortes visuales innecesarios.

**Preferir:** mostrar referencias como `COL20010010004`. Los sufijos de caja física permanecen reservados para identificar cada caja.

### 2026-08-14 - Preferencia UI: resumen de cajas sin texto redundante

**No repetir:** mostrar `Carrito mixto` en la barra de pasos de `Caja` cuando hay varios tipos de caja seleccionados.

**Motivo:** el texto ocupa el espacio del país y del plazo, pero no ayuda a identificar los precios ni agrega información operativa necesaria.

**Preferir:** conservar la bandera y `Precios: [país]`; mostrar el plazo solo cuando corresponde a una única caja. El desglose completo permanece en el carrito y en el invoice.

### 2026-08-14 - País de precios visible en Caja

**Contexto:** La barra de pasos mostraba únicamente la medida, plazo y cantidad en `Caja`. En Venta rápida el país se selecciona antes de abrir el paso, y en la venta normal proviene del destinatario; en ambos casos el vendedor podía perder de vista qué catálogo estaba usando.

**Decisión:** En el paso `Caja`, tanto de Venta rápida como de venta normal, mostrar la bandera y el texto `Precios: [país]` junto al plazo del producto. En Venta rápida el país se toma de la selección inicial; en venta normal se toma del destinatario seleccionado. Nunca se reemplaza por el país del remitente.

**Resultado:** El origen de los precios queda visible durante la selección de cajas en ambos flujos y se conserva el plazo sin alterar la selección del catálogo.

### 2026-08-14 - Carga sin superficie interna en Seguimiento

**Contexto:** El estado de carga de Seguimiento mostraba un rectángulo con otro tono, borde y esquinas redondeadas dentro de la superficie principal. Al terminar la consulta, ese bloque desaparecía y el fondo cambiaba visualmente.

**Decisión:** En el listado de envíos, la carga usa el mismo fondo del contenedor padre y solo conserva un indicador sutil. No debe crear una superficie interna con color o borde propios cuando el estado final ocupa esa misma área.

**Resultado:** La transición entre carga y contenido mantiene un fondo uniforme y no produce un cambio de superficie perceptible.

### 2026-08-14 - Preferencia UI: acciones compactas del checkout rápido

**Contexto:** Los botones `Cancelar` y `Crear invoice` del cierre de la venta rápida ocupaban una franja demasiado alta y dominaban visualmente la pantalla.

**Decisión:** Mantener ambas acciones en dos columnas, pero usar altura compacta de 40 px y texto de tamaño pequeño. La acción principal conserva su color y el flujo de confirmación no cambia.

**Resultado:** El invoice mantiene más espacio visible y las acciones siguen siendo claras sin competir con el documento.

### 2026-08-14 - Referencia de invoice inicia con país y cantidad

**Contexto:** La cantidad de cajas aparecía unida al código del vendedor (`COL-0012`), lo que hacía menos inmediata la lectura del destino y el tamaño del envío.

**Decisión:** La referencia visible agrupa primero el país y la cantidad, por ejemplo `COL2`, y concatena los bloques de vendedor, empresa y correlativo: `COL20010010001`. El invoice base no lleva sufijo; `-A`, `-B` y siguientes se reservan para identificar las cajas físicas.

**Resultado:** El inicio del código comunica de una mirada “Colombia, dos cajas” y evita interpretar la cantidad como parte del vendedor.

### 2026-08-13 - Factura de venta rápida: estado por caja

**Preferir:** no repetir arriba el estado de una venta rápida de caja vacía. El bloque inferior conserva la explicación completa de entrega, recolección, rastreo y plazo; cada línea muestra únicamente su código, presentación real e importe.

**Resultado:** la factura evita duplicar el mismo mensaje y mantiene la información operativa completa en un solo lugar.

### 2026-08-13 - Preferencia UI: factura identifica cada tamaño de caja

**No repetir:** mostrar una línea genérica `Caja` en la factura cuando la venta conserva la medida o presentación seleccionada.

**Motivo:** el cliente y el operador no pueden comprobar qué caja corresponde a cada código e importe.

**Preferir:** cada línea del invoice debe mostrar `Caja [tamaño]`, conservar su código hijo e importe y repetir una línea por cada unidad física seleccionada. Si existen tamaños distintos, cada línea mantiene su propia medida.

### 2026-08-13 - Preferencia UI: factura de venta rápida explica el estado real

**No repetir:** usar `Servicio de entrega` o mostrar una entrega estimada en la factura de una venta rápida cuando la caja vacía ya se entregó en oficina.

**Motivo:** esas etiquetas contradicen el resultado físico de la venta y no informan al cliente cuál es el siguiente hito.

**Preferir:** mostrar `Caja entregada · Recolección pendiente` (o su plural), ocultar la entrega estimada y explicar al pie que la caja vacía fue entregada en oficina y que la recolección de la caja llena queda pendiente de coordinar.

### 2026-08-13 - Venta rápida: factura y etiquetas en el mismo Final

**No repetir:** mostrar encima de la factura un encabezado con número/tipo de venta, una tarjeta duplicada del remitente o un panel lateral separado para el QR.

**Motivo:** esos datos ya forman parte de la factura y crean una composición más larga y fragmentada.

**Preferir:** conservar las pestañas compartidas `Factura` y `Etiquetas` dentro del paso `Final`. La pestaña `Factura` mantiene su QR dentro del documento; fuera de los documentos solo deben quedar las acciones necesarias para pagar o iniciar otra venta.

### 2026-08-13 - Venta rápida: una sola superficie de scroll en Final

**No repetir:** anidar un scroll propio del checkout rápido dentro del scroll del paso `Final`; la barra de documentos termina quedando desfasada respecto de la factura.

**Preferir:** usar el scroll del contenedor del paso `Final` para mover juntos la barra `Factura/Etiquetas`, la factura y las etiquetas.

### 2026-08-13 - Preferencia UI: cancelar venta rápida fuera de la barra de pasos

**No repetir:** colocar un botón textual de `Cancelar venta rápida` dentro de la barra, encima del catálogo o debajo de la acción principal.

**Motivo:** reduce el espacio de la navegación y distrae/estorba el paso activo.

**Preferir:** usar la navegación contextual estándar del encabezado de Boxario para regresar de la venta rápida al flujo completo, sin agregar controles dentro del contenido.

### 2026-08-13 - Preferencia UI: venta rápida compacta

**Contexto:** El segundo modal de venta rápida (`Venta de caja vacía`) repetía la selección de cajas y ocupaba espacio con información de destinatario/logística que no se usa en una venta rápida.

**Decisión:** Mantener únicamente el modal inicial de país. Después, mostrar el selector normal de cajas en el paso 3 y una barra compacta con los pasos 1, 3 y 5. El cierre debe ofrecer un botón visible `Cancelar venta rápida`, separado de la navegación, para volver al flujo completo.

**Resultado:** La venta rápida ocupa una sola superficie de trabajo, conserva el diseño compartido del selector de cajas y deja claro cómo regresar a una venta completa.

### 2026-08-13 - Preferencia UI: transición visible al invoice de venta rápida

**Decisión:** En el paso `Caja` de una venta rápida, la acción principal debe permanecer visible al fondo de la lista y llamarse `Ver invoice completo`. Mientras se prepara el invoice, debe indicar `Abriendo invoice...` y bloquear dobles clics.

**Resultado:** El cliente entiende que la selección de la caja lleva al invoice final sin tener que buscar un botón fuera de la pantalla.

### 2026-08-13 - Preferencia UI: invoice rápido integrado en el paso 5

**Contexto:** El checkout rápido aparecía como un modal independiente y ocultaba la barra de pasos, aunque la venta rápida debe terminar en el paso `Final`.

**Decisión:** Después de seleccionar la caja, el invoice completo se muestra dentro de la superficie principal del paso 5. Solo la confirmación de cobro puede abrir un diálogo secundario; el invoice, el QR y sus acciones permanecen en la página.

**Resultado:** El usuario ve la transición `Caja → Final` sin que la pantalla parezca cambiar a otra página o a una ventana telefónica.

### 2026-08-13 - Preferencia UI: checkout final no se colapsa en escritorio

**Contexto:** La factura final de una venta rápida compartía el ancho del modal con el QR y terminaba usando una columna estrecha, con apariencia de vista telefónica aunque la pantalla fuera de escritorio.

**Decisión:** El checkout final debe conservar un contenedor amplio en escritorio. La factura mantiene su ancho de papel legible y el QR ocupa una columna lateral independiente; en pantallas menores ambas áreas se apilan de forma natural.

**Resultado:** Llegar al paso final no cambia la página a una composición móvil ni comprime la factura junto al QR.

### 2026-08-13 - Campos de dirección consistentes en verificación de ubicación

**Contexto:** La ventana para confirmar la entrada exacta no reflejaba todos los campos de dirección de los formularios de remitente y destinatario.

**Decisión:** Los tres flujos muestran la misma dirección postal: Calle, Número de unidad, Colonia, Ciudad, Estado, Código postal, País y Referencias. La nota para el conductor permanece separada porque es una instrucción operativa para la entrega.

**Resultado:** Remitentes y destinatarios tienen una experiencia consistente y las referencias del domicilio no se pierden al seleccionar una dirección en el mapa.

### 2026-08-13 - Preferencia UI: zoom visible en el mapa de entrada

**Contexto:** El mapa dependía de Ctrl + scroll o de gestos que algunos clientes no conocen.

**Decisión:** La ventana de ubicación exacta debe mostrar controles grandes y visibles de acercar y alejar sobre el mapa, utilizables con clic, teclado y pantalla táctil. El arrastre del pin y el zoom permanecen como acciones independientes.

**Resultado:** El cliente puede ajustar el encuadre sin conocer atajos del navegador ni gestos especiales.

### 2026-08-13 - Preferencia UI: ventana del mapa sin scroll de página

**Contexto:** La ventana de ubicación exacta obligaba a desplazar la página para ver el mapa o las acciones finales.

**Decisión:** La ventana usa toda la altura visible, oculta el scroll de página y adapta la altura del mapa al viewport para mantener campos, mapa, nota y acciones dentro de la misma pantalla.

**Resultado:** El cliente puede completar la ubicación sin desplazarse por la ventana.

### 2026-08-13 - Preferencia UI: sugerencias no cubren campos de dirección

**Contexto:** La lista de sugerencias de Google se superponía a la primera fila y bloqueaba el acceso a Calle y Número de unidad.

**Decisión:** Las sugerencias deben ocupar espacio normal dentro del formulario y empujar los campos hacia abajo; nunca deben quedar flotando encima de un campo editable.

**Resultado:** El cliente puede seleccionar una sugerencia y después editar directamente el número de unidad y el resto de la dirección.

### 2026-08-13 - Preferencia UI: campos vacíos visibles en el mapa de entrada

**Contexto:** En la ventana de ubicación exacta no era evidente qué datos de dirección faltaban.

**Decisión:** Todo campo de dirección vacío se muestra con etiqueta, borde y fondo en rojo tenue; al escribir un valor recupera el estilo normal. Esta señal es visual y no convierte por sí sola los campos opcionales en obligatorios.

**Resultado:** El cliente identifica inmediatamente qué información falta, incluido el número de unidad y las referencias.

### 2026-08-13 - Preferencia UI: referencias y nota en pestañas

**Contexto:** Referencias del domicilio y nota para el conductor ocupaban dos espacios y parecían duplicadas.

**Decisión:** En la ventana de ubicación exacta comparten una sola sección inferior con pestañas `Referencias` y `Nota para el conductor`. Cada pestaña conserva su campo persistente independiente.

**Resultado:** La interfaz ocupa menos espacio sin mezclar la información permanente del domicilio con la instrucción operativa.

### 2026-08-13 - Preferencia UI: mapa comparativo desde el selector de ruta

**No repetir:** obligar al vendedor a decidir una excepción de cobertura únicamente con etiquetas textuales como `Compatible` o `Verificar cobertura`.

**Motivo:** sin contexto espacial no puede comprobar dónde está el domicilio respecto de las zonas configuradas ni comparar rutas cercanas.

**Preferir:** en el paso `Ruta`, mostrar la acción compacta `Ver dirección y coberturas`. Debe abrir un modal sobre la pantalla actual con el pin diferenciado del cliente, todas las coberturas de las rutas disponibles de ese día y una leyenda por color que identifique coincidencia, fuera de cobertura, ausencia de cobertura y ruta seleccionada. El mapa es de consulta: no cambia cobertura ni confirma la ruta.

### 2026-08-13 - Preferencia UI: sugerencia de ruta explica la cobertura real

**No repetir:** afirmar que una ruta se seleccionó por ZIP, día, horario o capacidad cuando no se comprobó que la dirección pertenece a su ciudad/zona; tampoco presentar etiquetas de cobertura heredada.

**Motivo:** esos mensajes hacen parecer automática y válida una decisión que puede necesitar criterio operativo de Logística.

**Preferir:** comunicar `La dirección coincide con esta cobertura` únicamente para una coincidencia real. Cuando Ventas elija una ruta fuera de cobertura, mostrar una advertencia ámbar que indique que la solicitud quedará pendiente de verificación por Logística; en `Por confirmar`, repetir el aviso junto a la dirección del invoice.

### 2026-08-13 - Preferencia UI: selector de cajas agotadas bloqueadas

**No repetir:** mostrar cajas agotadas como si fueran opciones activas o permitir que un clic las agregue al carrito.

**Motivo:** ocultarlas elimina contexto del catálogo, pero dejarlas activas induce a intentar una selección que no puede atenderse.

**Preferir:** mantenerlas visibles y atenuadas, con la etiqueta `Sin stock`, sin clic ni clic derecho, y conservar las cajas disponibles como las únicas seleccionables.

**Regla permanente:** una caja agotada no puede venderse ni convertirse en un invoice pendiente. Si la disponibilidad cambia al confirmar, conservar el formulario y mostrar el error de stock sin estado de éxito.

### 2026-08-12 - Preferencia UI: acciones de selección masiva junto a la columna de selección

**Corrección:** la selección masiva no debe vivir dentro de la franja de navegación. Debe ocupar una fila propia inmediatamente debajo del navegador y conservar el mismo `padding` horizontal que las filas de solicitudes.

**No repetir:** colocar `Todas`, el contador de seleccionadas y `Confirmar` al extremo derecho de la franja de navegación de `Por confirmar`, después del selector de días.

**Motivo:** la acción queda visualmente separada de los checkboxes de las solicitudes y puede parecer una acción de navegación en lugar de una acción sobre la selección.

**Preferir:** mostrar el grupo de selección masiva en su propia fila debajo del navegador, alineado con la columna izquierda donde aparecen los checkboxes de las solicitudes. El selector de días permanece dentro de la franja de navegación.

**Estabilidad:** reservar desde el primer render el ancho del contador y de `Confirmar`; cuando no haya selección, ambos espacios permanecen invisibles para que las solicitudes y controles vecinos no cambien de posición al seleccionar.

**Legibilidad:** el espacio reservado para `Confirmar` debe ser suficiente para mantener el texto y su icono en una sola línea; no se permite partir la etiqueta en dos renglones.

### 2026-08-12 - Filtro de ruta en Por confirmar

### 2026-08-12 - Preferencia UI: editar desde el expediente

**No repetir:** un expediente de envío completamente estático cuando Ventas todavía puede corregir la operación.

**Motivo:** el vendedor no encontraba ninguna acción para corregir la información del envío y debía salir a otra pantalla.

**Preferir:** mostrar `Editar envío` junto a `Abrir en Seguimiento`, dentro de la cabecera del expediente. Cuando la edición esté bloqueada por una confirmación logística, mostrar `Edición bloqueada` con el motivo disponible al pasar el cursor.

**Decisión:** `Por confirmar` conserva el navegador semanal y agrega un selector explícito `Todas las rutas` junto a los controles de periodo y día. El selector se alimenta de las rutas presentes en la semana o rango actual; al elegir una ruta, la lista y los días visibles se limitan a esa ruta.

**Resultado:** la búsqueda libre sigue destinada a invoice, cliente y texto relacionado, mientras que el selector permite revisar una ruta completa sin depender de coincidencias parciales.

**Corrección visual:** el filtro usa un menú flotante propio renderizado fuera de las superficies recortables; evita la apariencia nativa del `<select>`, el borde blanco de foco y las opciones azules del navegador.

### 2026-08-12 - Preferencia UI: linea de tiempo en el expediente

**No repetir:** una vista del expediente que obligue a abrir Seguimiento para entender en que paso operativo esta el envio.

**Motivo:** el expediente debe concentrar la consulta principal del envio y mostrar su avance con el mismo lenguaje visual de Seguimiento.

**Preferir:** reutilizar la linea de tiempo compartida de Seguimiento dentro del resumen del expediente, en modo solo lectura y con la misma fuente de estados y tiempos.

### 2026-08-12 - Preferencia UI: navegador semanal compacto y sin controles duplicados

**No repetir:** reservar una franja ancha para el texto completo `Semana de operación`, usar botones de navegación con etiquetas largas y mostrar `Hoy` dos veces (en la navegación y en los accesos rápidos de semana).

**Motivo:** el navegador consume demasiado ancho y obliga a leer dos controles que ejecutan la misma vuelta a la semana actual.

**Preferir:** mostrar el rango como dato principal junto al calendario; agrupar Anterior/Hoy/Siguiente en un control compacto, conservar el contador de pendientes en `Hoy` y excluir la semana actual de los accesos rápidos para no duplicarla.

### 2026-08-12 - Preferencia UI: mapa para confirmar la entrada exacta

**No repetir:** mostrar un solo pin sin explicar si proviene de la dirección o si alguien confirmó manualmente la casa, portón o entrada.

**Motivo:** el cliente puede interpretar el punto de Google como exacto aunque esté sobre la calle, un lote vecino o el centro de un edificio.

**Preferir:** después de validar la dirección de remitente o destinatario, mostrar un mapa compacto con vistas `Mapa` y `Satélite`. Diferenciar `Ubicación de la dirección` del pin editable `Entrada exacta`; usar la acción textual `Marcar entrada exacta` y el estado `Entrada confirmada`. En Logística y Conductor, mostrar el pin confirmado con su estado y conservar la dirección escrita y sus referencias.

### 2026-08-12 - Preferencia UI: explicación del editor dentro de ayuda compacta

**No repetir:** reservar dos líneas permanentes dentro de la subruta abierta para `Configuración de la subruta` e `Identidad, cobertura y horario en una sola vista`.

**Motivo:** la explicación repite el contexto evidente del formulario y aumenta su altura en cada edición.

**Preferir:** mostrar un `!` compacto en la cabecera de la subruta abierta; al pulsarlo, desplegar el título y la explicación mediante `CompactInfoDisclosure`.

### 2026-08-12 - Preferencia UI: acciones próximas al contenido de subruta

**No repetir:** estirar las filas de zona y los encabezados desplegables por todo el ancho disponible, dejando `Color`, `Quitar`, `Ver` o `Editar` aislados en el extremo derecho de pantallas grandes.

**Motivo:** se pierde la relación visual entre la acción y el texto sobre el que actúa.

**Preferir:** limitar el ancho operativo de las filas de zona y encabezados de `Cobertura`/`Horarios`, manteniendo sus acciones inmediatamente después del contenido. El mapa puede conservar el ancho completo cuando se consulta.

### 2026-08-12 - Preferencia UI: cobertura de subruta desplegable

**No repetir:** mantener permanentemente visibles el buscador, las zonas y el acceso al mapa dentro de cada subruta abierta.

**Motivo:** la cobertura ocupa espacio incluso cuando el operador solo necesita cambiar nombre, modo u horario.

**Vigencia:** esta preferencia quedó reemplazada el 2026-08-14 por la decisión de no mostrar cobertura por ciudad/zona dentro del editor de subrutas.

**Preferir:** mostrar una cabecera compacta `Cobertura` con su explicación breve; al pulsarla se despliegan el buscador, las zonas y las vistas `Zonas`/`Mapa`. Al elegir `Por ciudad / zona` desde el selector, abrir automáticamente esta sección.

### 2026-08-12 - Preferencia UI: color de subruta desde su indicador

**No repetir:** mostrar un campo `Color` separado dentro del formulario de identidad cuando la cabecera ya tiene una barra que comunica ese mismo color.

**Motivo:** duplica el concepto y obliga a relacionar un selector distante con el indicador visible de la subruta.

**Preferir:** convertir la barra vertical de la cabecera en el selector de color. Al cambiarla, abrir la subruta, reflejar el color inmediatamente y conservar el guardado explícito junto con los demás cambios.

### 2026-08-12 - Preferencia UI: explicación de subrutas bajo demanda

**No repetir:** mostrar permanentemente debajo del título `Subrutas` la explicación de que cada subruta usa su propio horario.

**Motivo:** es información secundaria que consume una línea completa cada vez que se abre la configuración.

**Preferir:** colocar el disparador compacto `!` inmediatamente junto a `Subrutas` y mostrar la explicación mediante `CompactInfoDisclosure` solo cuando se solicite.

### 2026-08-12 - Preferencia UI: días maestros en una sola fila

**No repetir:** dividir cada día maestro en dos franjas horizontales, con el nombre y `Viendo` arriba y `Activo`/`Inactivo` debajo.

**Motivo:** aunque separa las dos funciones, el día parece una tarjeta partida y la línea central añade ruido visual.

**Preferir:** una única fila continua: nombre como área principal de selección, disponibilidad como acción compacta al lado derecho y borde azul discreto para identificar el día consultado. Sin divisor interno ni etiqueta `Viendo`; cuando el ancho sea limitado, conservar el nombre completo y reducir el estado visible a su punto de color, manteniendo su descripción accesible.

### 2026-08-12 - Preferencia UI: selector de días sin controles anidados

**No repetir:** día activo como bloque verde sólido con un switch de cápsula incrustado dentro de la misma fila y un anillo adicional para señalar la selección.

**Motivo:** selección y disponibilidad compiten visualmente; el switch parece un botón dentro de otro y el verde domina demasiado la pantalla.

**Alternativa descartada:** se probó un control de dos niveles con nombre arriba y estado abajo. El usuario rechazó posteriormente esa división; la preferencia vigente es la fila única documentada inmediatamente arriba.

### 2026-08-12 - Preferencia UI: editor de subrutas con jerarquía operativa

**No repetir:** subrutas como filas planas dentro de un contenedor continuo y, al abrir una, mostrar campos y listas estirados de extremo a extremo sin títulos de sección ni estado visible de edición.

**Motivo:** en pantallas anchas la información se dispersa, las zonas parecen elementos aislados y cuesta distinguir la cabecera accionable del formulario abierto.

**Preferir:** cada subruta como acordeón independiente con resumen de horario y cobertura, estado `Abrir`/`Editando` y cabecera completa clicable. Dentro, agrupar identidad, cobertura y horarios mediante divisores en una sola superficie; limitar el ancho útil del buscador y nombres de zona, señalar cambios sin guardar y cerrar con una franja compacta de acciones.

### 2026-08-12 - Preferencia UI: tarjetas de confirmación con composición propia

**No repetir:** reutilizar dentro de las tarjetas la cuadrícula horizontal de la vista de filas; el checkbox crea una columna desproporcionada, desplaza el invoice y deja horario, ruta y acciones sin una estructura común.

**Motivo:** la vista de tarjetas se percibe desordenada aunque la misma distribución funcione correctamente como fila de ancho completo.

**Preferir:** tarjeta en columna con cuatro zonas estables: cabecera con selección, invoice y tipo; dirección; resumen dividido de horario y ruta/cajas; acciones inferiores de igual ancho. Las tarjetas de una misma cuadrícula conservan altura y acciones alineadas mediante `margin-top: auto`.

### 2026-08-12 - Preferencia UI: solicitudes por confirmar como filas operativas

**No repetir:** filas altas con toda la información amontonada a la izquierda, una gran zona vacía en medio y botones de icono aislados al extremo derecho.

**Motivo:** cuesta recorrer horario, ruta y carga entre varios invoices; las acciones `✓` y `×` no explican por sí solas qué decisión ejecutan.

**Preferir:** una fila compacta y escaneable: invoice/cliente y dirección como identidad; tipo `Entregar`/`Recoger` visible; horario solicitado, ruta sugerida y cajas en columnas; acciones textuales `Confirmar` y `Rechazar` junto al contenido. En móvil, apilar estas zonas debajo de la identidad conservando la selección y objetivos táctiles legibles, sin crear tarjetas internas.

### 2026-08-12 - Preferencia UI: mapa sin destello al entrar

**No repetir:** mostrar el lienzo claro o incompleto de Google Maps mientras carga, ni recrear visualmente el mapa durante la verificación de efectos de React.

**Motivo:** el cambio rápido entre la superficie oscura, un cuadro claro y el mapa terminado se percibe como parpadeo cada vez que se consulta una ruta.

**Preferir:** conservar una sola instancia del mapa, mantener una superficie oscura estable con `Cargando mapa…` y revelar las teselas únicamente después del evento `tilesloaded`. Estabilizar también la colección de paradas para que un render ordinario del detalle no reinicialice el mapa.

### 2026-08-12 - Preferencia UI: mapa de paradas con encuadre útil

**No repetir:** aplicar `fitBounds` a varias paradas con coordenadas idénticas, abrir el mapa con zoom extremo ni mostrar un error de trayecto vial cuando origen y destino representan la misma ubicación.

**Motivo:** el operador necesita contexto alrededor del domicilio y no debe alejar manualmente el mapa ni interpretar como fallo una entrega y una recolección en el mismo lugar.

**Preferir:** deduplicar coordenadas para encuadre y cálculo vial. Una sola ubicación usa zoom de vecindario y explica cuántas paradas la comparten; varias ubicaciones usan límites con espacio alrededor. Las coordenadas guardadas siguen siendo la fuente visible y nunca se corrigen o sustituyen silenciosamente desde el componente.

### 2026-08-12 - Preferencia UI: encabezado de ruta como franja operativa

**No repetir:** encabezado de ruta construido como tarjeta convencional con icono, una hilera de chips y un botón verde `Mostrar N paradas` colocado a la derecha.

**Motivo:** aun después de reforzar la interacción, la composición seguía pareciendo la misma tarjeta y el usuario pidió cambiar por completo la manera de presentar el encabezado.

**Preferir:** una franja operativa dividida en tres zonas: fecha vertical de lectura rápida, identidad con métricas abiertas y una zona lateral de paradas que funciona como control de expansión. Evitar chips y botones sólidos dentro de este encabezado; comunicar la interacción mediante la estructura completa, hover, foco y chevrón.

### 2026-08-12 - Preferencia UI: resumen de ruta en chips y acción principal

**No repetir:** resolver la expansión con una cápsula secundaria pequeña `Ver paradas` pegada al extremo de una fila mayormente plana, aunque la fila tenga borde y hover.

**Motivo:** el grupo seguía sin gustar visualmente y la acción parecía añadida después, no parte central del bloque de trabajo.

**Preferir:** presentar la ruta como un bloque operativo compacto: identidad clara, fecha, cajas y conductor en chips diferenciados, y un botón principal integrado `Mostrar N paradas`. Al expandir, el botón cambia a `Ocultar paradas` y el detalle continúa en la misma superficie. No repetir los totales inmediatamente dentro del detalle.

### 2026-08-12 - Preferencia UI: grupos de ruta evidentemente expandibles

**No repetir:** presentar un grupo de ruta como una fila plana con un chevrón pequeño y aislado al extremo derecho.

**Motivo:** la cabecera parece únicamente informativa y no comunica que toda su superficie puede pulsarse para mostrar las paradas.

**Preferir:** delimitar cada grupo con borde y superficie interactiva, reforzar hover y foco en toda la cabecera y mostrar un control textual `Ver paradas` / `Ocultar paradas` junto a un chevrón visible. Al abrir, unir visualmente el detalle con la cabecera mediante el estado del borde, sin cajas anidadas adicionales.

### 2026-08-12 - Preferencia UI: navegación operativa señala dónde hay trabajo

**No repetir:** mostrar `Por confirmar`, `Preparación`, `Rutas` e `Historial` como pestañas neutras que obligan a abrir cada sección para descubrir si contiene trabajo.

**Motivo:** aunque el navegador semanal indique dónde existen pendientes, el operador todavía necesita saber primero a qué etapa debe entrar.

**Preferir:** mantener verde únicamente la pestaña activa y usar un acento ámbar contenido con contador en las pestañas operativas que tienen trabajo. `Por confirmar` cuenta solicitudes pendientes de aprobación, `Preparación` solicitudes confirmadas todavía no convertidas y `Rutas` recorridos activos; `Historial` no se presenta como pendiente. No asignar un color distinto a cada etapa.

### 2026-08-12 - Preferencia UI: detalle operativo completo al expandir rutas

**No repetir:** expandir una ruta mostrando únicamente los totales de cajas para dejar y recoger.

**Motivo:** para preparar y ejecutar la ruta se necesitan invoice, nombre, teléfono, dirección, movimiento y medidas de cada parada.

**Preferir:** conservar los totales arriba y listar debajo cada parada con sus datos operativos completos y las medidas de sus cajas.

### 2026-08-12 - Preferencia UI: desglose expandible de cajas en rutas

**No repetir:** mostrar solo el total de cajas en la fila de ruta sin una forma evidente de distinguir entregas y recogidas.

**Motivo:** el conductor no puede preparar la carga si no sabe qué debe dejar y qué debe recoger.

**Preferir:** fila de ruta expandible, con un desglose directo de `Dejar` y `Recoger` y un indicador claro de apertura.

### 2026-08-12 - Preferencia UI: fechas legibles y superficies unificadas en ruta del conductor

**No repetir:** fechas ISO (`AAAA-MM-DD`) en el selector de ruta ni un fondo azul aislado dentro de la cabecera.

**Motivo:** la fecha numérica obliga a interpretarla y el contraste de superficies hace que el control parezca separado del panel.

**Preferir:** fecha en español con palabras y el mismo fondo de la superficie contenedora.

### 2026-08-12 - Preferencia UI: preparación anticipada del conductor

**No repetir:** mostrar “Sin ruta asignada” cuando el conductor sí tiene una ruta futura, solo porque todavía no es la fecha de operación.

**Motivo:** el conductor necesita revisar carga, paradas y vehículo con anticipación para preparar la jornada.

**Preferir:** selector de rutas asignadas con fecha visible; permitir abrir rutas futuras y mantener explícita la fecha seleccionada para no confundir preparación con operación del día.

### 2026-08-12 - Preferencia UI: guía visual de semanas con pendientes

**No repetir:** mostrar únicamente la semana activa y obligar a recorrer `Anterior` / `Siguiente` sin indicar dónde hay solicitudes.

**Motivo:** el operador no sabe en qué semana existen cosas pendientes y termina buscando a ciegas.

**Preferir:** una tira compacta de semanas cercanas con estado visible: número de pendientes, semana actual destacada y salto directo al pulsar una semana.

### 2026-08-12 - Preferencia UI: etiquetas de zona legibles sobre mapas

**No repetir:** texto verde directamente sobre rellenos verdes del mapa; el contraste cambia según la cartografía y dificulta leer la zona seleccionada.

**Motivo:** la etiqueta `Zona: ...` se pierde sobre áreas verdes y puede parecer duplicada o ilegible.

**Preferir:** etiqueta blanca dentro de una cápsula oscura semitransparente, con borde y sombra sutiles, para mantener contraste estable sobre cualquier color del mapa.

### 2026-08-12 - Preferencia UI: éxito de invoice con pendiente logístico

**No repetir:** mostrar en rojo como error general una venta cuyo invoice sí quedó creado, ni encabezar el pendiente con un mensaje ambiguo que haga dudar si se perdió la venta.

**Motivo:** el toast rojo contradice el documento generado y puede provocar que el vendedor repita la operación y busque un invoice duplicado.

**Preferir:** confirmar el invoice en verde y mostrar el pendiente de Logística en un aviso ámbar separado, con la etapa (`Entrega` o `Recolección`), la causa concreta y su acción de reintento.

### 2026-08-11 - Preferencia UI: zonas hijas prendidas en ciudad completa

**No repetir:** al expandir una ciudad en cobertura `root_whole`, mostrar todos los checkboxes de zonas hijas apagados.

**Motivo:** el operador agregó la ciudad completa y al abrir el desglose parece que no hay nada seleccionado.

**Preferir:** con ciudad completa, todas las zonas listadas aparecen prendidas; apagar una inicia el desglose parcial; marcar todas de nuevo vuelve a ciudad completa.

### 2026-08-11 - Preferencia UI: mapa de cobertura en pestaña

**No repetir:** apilar el mapa siempre encima de la lista de zonas en la misma superficie expandida de subruta o cobertura del día.

**Motivo:** el mapa ocupa demasiado y estorba al revisar/editar la lista; el operador quiere el mapa solo cuando lo necesita.

**Preferir:** pestañas `Zonas` (por defecto) y `Mapa`. La lista y el buscador viven en `Zonas`; el mapa y la franja de preview/`Agregar zona` viven en `Mapa`. Si hay una preview pendiente, saltar a `Mapa` (con contador en la pestaña).

### 2026-08-11 - Preferencia UI: subruta expandida ordenada y densa

**No repetir:** al expandir una subruta volcar nombre, zona, color, cobertura, mapa, lugares y todos los horarios en cajas anidadas a la vez.

**Motivo:** la interfaz se veía desordenada y competía con la tarea (ver/editar cobertura).

**Preferir:** una sola superficie bajo la cabecera; fila compacta de identidad; cobertura con pestañas `Zonas`/`Mapa` (mapa no siempre visible); horarios contraídos por defecto con resumen y `Editar`/`Ver`; acciones `Guardar`/`Cancelar` al final; sin tarjetas internas de más.

### 2026-08-12 - Preferencia UI: cobertura y horarios como chips de sección

**No repetir:** presentar `Cobertura` y `Horarios` como dos filas de listado con el título en una línea, el resumen en otra y la acción separada al extremo derecho.

**Motivo:** las secciones ocupan altura innecesaria y parecen registros independientes en lugar de controles del editor de la subruta.

**Preferir:** chips de sección en una sola línea con icono, título, resumen truncable y acción `Ver`/`Editar`; conservar el resumen completo como información accesible y mostrar el contenido debajo solo al abrirlo.

### 2026-08-11 - Preferencia UI: Subrutas se expanden desde el nombre

**No repetir:** botón de lápiz (u otro iconito aparte) para abrir el mapa/edición de una subruta como `Ruta norte`.

**Motivo:** el operador espera un grupo acordeón: clic en el nombre/cabecera abre o cierra el detalle (mapa, lugares, horarios).

**Preferir:** cabecera clicable con el nombre; `Archivar` queda como acción aparte; `Nueva subruta` sigue creando arriba. Sin chevron ni lápiz para expandir.

### 2026-08-11 - Preferencia UI: cabecera completa para expandir zonas de cobertura

**No repetir:** chevron u otro botón aparte para expandir una ciudad/grupo de cobertura.

**Motivo:** el operador espera abrir el grupo con un clic en el nombre de la cabecera, como un acordeón; el iconito aparte estorba.

**Preferir:** el nombre (cabecera) expande/contrae; color y quitar siguen aparte. Al expandir, señalar la zona en el mapa.

### 2026-08-11 - Preferencia UI: encuadre de cobertura sin zoom excesivo

**No repetir:** hacer `fitBounds` solo con el centro del lugar (antes de tener geojson/bounds), ni abrir una ciudad/ruta a zoom de calle.

**Motivo:** al abrir p. ej. Ruta norte el mapa quedaba demasiado cerca y obligaba a alejar mucho a mano.

**Preferir:** esperar contorno real (`geojson` o `bounds`) antes del primer `fitBounds`; padding amplio; tope de zoom tras el encuadre (~11). Un solo encuadre por conjunto de ids; no re-fit al llegar Census si ya se enmarcó con bounds.

### 2026-08-11 - Preferencia UI: cobertura sin scroll horizontal

**No repetir:** `overflow-x-auto` en el panel de cobertura / subruta, ni dejar que el mapa guardado sea más ancho que el panel y obligue a desplazar la página o el listado de izquierda a derecha.

**Motivo:** al revisar o expandir una ruta (p. ej. Ruta norte) el contenido se cortaba o exigía la barra horizontal; el operador necesita ver mapa y zonas enteras sin mover la vista hacia los lados.

**Preferir:** contenedores con `min-w-0` + `overflow-x-hidden`; mapa limitado al ancho del host (relleno por defecto; el arrastre de ancho no supera el panel); textos de zonas con `break-words` / wrap; scroll solo vertical cuando haga falta.

### 2026-08-11 - Preferencia UI: controles del mapa encima y al ancho del mapa

**No repetir:** anclar `Seleccionar área` / `Mi ubicación` al borde derecho del panel completo, creando un hueco vacío a la derecha del mapa.

**Motivo:** ese hueco parece espacio “robado” al mapa y limita visualmente cuánto se puede ampliar.

**Preferir:** barra de instrucción + acciones en la misma franja, con el mismo ancho que el mapa; al ensanchar el mapa, la barra crece con él.

### 2026-08-11 - Preferencia UI: mapa de cobertura redimensionable

**No repetir:** dejar el mapa de cobertura a una altura fija sin forma de ampliarlo cuando se revisan muchas piezas o un área grande; ni usar `maxWidth: 100%` / `inline-block max-w-full` que dejan un gutter vacío a la derecha e impiden crecer el mapa hacia ese espacio.

**Motivo:** el operador necesita ver más (o menos) mapa como si ajustara una ventana, sin cambiar de pantalla. El gutter vacío se sentía como área “bloqueada”.

**Preferir:** el mapa **ocupa el 100% del ancho del panel** por defecto (`flex-1` / fill), sin tope fijo tipo 1400px; asas de arrastre **fuera** del mapa (borde derecho = ancho, borde inferior = alto, esquina = ambos); el ancho personalizado **no supera el panel** (sin scroll horizontal del padre); recordar solo anchos más estrechos que el host; al soltar, notificar a Google Maps con `resize`.

### 2026-08-11 - Preview de zona solo con frontera válida

**No repetir:** pintar el `viewport` rectangular de Google como si fuera el perímetro de la ciudad o zona seleccionada.

**Motivo:** cuando la frontera oficial tarda en llegar, el rectángulo puede cubrir casi todo el mapa y hacer que una selección como Los Angeles parezca incorrecta.

**Preferir:** mantener el mapa sin relleno de área hasta recibir una frontera Census válida; mientras tanto, comunicar que la geometría está cargando o no está disponible. El `viewport` puede orientar la cámara, pero no representa una zona confirmada.

### 2026-08-11 - Preferencia UI: color único al agregar un área

**No repetir:** al confirmar `Agregar zonas` de una selección por área, asignar un color distinto automático a cada pieza sin dejar elegir el color del lote.

**Motivo:** el operador quiere que el área agregada se lea como un mismo grupo visual, no como un arcoíris accidental.

**Preferir:** un selector `Color` en la franja de vista previa; todas las zonas del lote comparten ese color al confirmar (también al ir añadiendo piezas al lote pendiente).

### 2026-08-11 - Preferencia UI: cobertura confirmada con relleno visible

**No repetir:** dejar ciudades confirmadas (p. ej. Beverly Hills) solo con trazo y `fillOpacity` ~0.07, de modo que en el mapa parezcan “no pintadas” frente a una preview o zona resaltada con relleno claro.

**Motivo:** el operador ve la ciudad en el listado pero en el mapa solo el borde; parece un fallo de selección.

**Preferir:** cobertura Census confirmada con relleno suave legible (~0.26 en reposo); al resaltar otra pieza, atenuar sin vaciar (~0.16). Preview pendiente sigue en cielo (~0.28).

### 2026-08-11 - Preferencia UI: preview de área con el mismo relleno que el clic

**No repetir:** pintar la selección por área solo como contorno (borde cielo) mientras el clic unitario muestra relleno suave; ni atenuar el resto del lote a `fillOpacity` casi 0 porque la primera pieza quedó en `highlightedPlaceId`.

**Motivo:** parece que el área “no está seleccionada” o que solo tiene borde, frente al clic que se lee como zona marcada.

**Preferir:** toda pieza en vista previa (`source: preview`) usa el mismo relleno cielo suave (~0.28) y trazo marcado; el highlight no vacía las demás previews del lote.

### 2026-08-11 - Preferencia UI: editar la preview de área con clics en el mapa

**No repetir:** con una vista previa de varias zonas activa, hacer que un clic nuevo reemplace todo el lote o ignore quitar piezas desde el mapa.

**Motivo:** tras seleccionar un área, el operador necesita afinar el conjunto de forma natural, pieza a pieza.

**Preferir:** mientras la preview está activa, cada clic en una pieza del mapa añade o quita esa zona de la lista pendiente; los chips debajo siguen siendo un atajo; confirmar solo al pulsar `Agregar zonas`.

### 2026-08-11 - Preferencia UI: confirmación de cobertura debajo del mapa

**No repetir:** abrir un modal que cubra o quite de vista el perímetro mientras se decide agregar una zona.

**Motivo:** el operador necesita comparar el tamaño y la posición de la preview sin que la confirmación tape el mapa.

**Preferir:** mostrar la preview estable y una franja de acción inmediatamente debajo del mapa, con `Agregar zona` como acción principal y `Cancelar` como salida secundaria. Esta nota actualiza la confirmación modal definida antes para cobertura.

### 2026-08-11 - Preferencia UI: mapa como selector de cobertura

**No repetir:** obligar al operador a buscar primero una ciudad o zona y dejar el mapa únicamente como vista previa pasiva.

**Motivo:** la cobertura debe sentirse como una acción geográfica directa; el flujo anterior separaba demasiado el lugar que se quería marcar de su representación en el mapa.

**Preferir:** hacer del mapa el selector principal de ciudades y zonas conocidas: clic para identificar y previsualizar una zona, confirmación para agregarla, clic sobre una zona confirmada para quitarla y lista sincronizada como resumen. El buscador queda como apoyo, no como única entrada. Esta decisión reemplaza la preferencia del 2026-08-10 sobre selección exclusiva desde nombres del buscador.

### 2026-08-10 - Preferencia UI: selección de cobertura solo desde nombres explícitos

**No repetir:** usar toda la superficie invisible de una ciudad como hitbox para proponer cobertura, de modo que tocar una carretera, montaña o espacio vacío active una zona administrativa.

**Motivo:** parece que el mapa inventa una selección donde no hay ningún nombre y vuelve impredecible la intención del clic.

**Preferir:** elegir ciudades o zonas únicamente desde una sugerencia explícita del buscador. El mapa es una vista previa navegable del perímetro y no funciona como selector; el resaltado se controla desde el listado.

### 2026-08-10 - Preferencia UI: Configuración de Logística accesible en móvil

**Contexto:** En `Rutas`, las pestañas operativas ocupaban todo el ancho del teléfono y el engranaje que abre `Conductores`, `Vehículos` y `Calendario y subrutas` quedaba fuera del viewport.

**Decisión:** La barra móvil mantiene visible el botón compacto de Configuración junto a las pestañas operativas. La búsqueda puede pasar a una segunda línea deliberada para no ocultar el acceso ni comprimir la navegación.

**Resultado:** Desde el celular se puede abrir el mismo menú de recursos que en escritorio sin duplicar pantallas ni perder las vistas `Por confirmar`, `Preparación`, `Rutas` e `Historial`.

### 2026-08-10 - Preferencia UI: mapa de cobertura sin saltos al navegar

**No repetir:** reencuadrar el mapa al pasar el mouse por un contorno o pin; ni overlays de cobertura que capturen el arrastre.

**Motivo:** el mapa se “mueve solo” al entrar en un cuadradito y corta la navegación.

**Preferir:** paneo/zoom estables; `fitBounds` solo al cambiar la cobertura; hover lista ↔ pin sin mover la cámara.

### 2026-08-10 - Preferencia UI: clic de preview sin salto de cámara ni de página

**No repetir:** reencuadrar el mapa cuando llega la geometría Census (`none` → `census`); ni cambiar el texto de la fila encima del mapa (`Identificando el área del clic…`) de forma que reflowee el layout; ni tratar la preview del clic como cobertura confirmada en la clave de encuadre.

**Motivo:** el mapa “salta” (zoom distinto) al hacer clic porque Census termina y vuelve a hacer `fitBounds`; el texto dinámico encima empuja el contenedor.

**Preferir:** clave de cámara = solo ids confirmados; un solo `fitBounds` por cambio de conjunto; encabezado fijo; estado del clic solo en overlay inferior; confirmación con `preventScroll`.

### 2026-08-10 - Preferencia UI: cobertura por nombres, no por pinturas

**No repetir:** rellenar el mapa con cuadros verdes opacos como si fueran la frontera exacta de la cobertura.

**Motivo:** los bounds de Google son ventanas aproximadas; pintarlas como “área real” se siente impreciso y confunde.

**Preferir:** pin + nombre visible de la ciudad/zona como señal principal; el pin debajo del nombre, sin taparlo; frontera Census (TIGER Places/CDP) cuando exista; contorno viewport de Google solo como respaldo; selector de color por ciudad/zona en la lista para distinguir varias áreas en el mapa; hover que resalta el nombre y la tarjeta de la lista. La lista sigue siendo la fuente de verdad.

### 2026-08-10 - Preferencia UI: hover del nombre = sombra preview de la zona

**No repetir:** dejar el contorno casi invisible al pasar el mouse por el nombre en la lista o el pin; ni mover la cámara en ese hover; ni dejar la sombra encendida después de quitar el mouse.

**Motivo:** el operador necesita una “preview” rápida del área (sombra suave) al señalar el nombre, sin confundirla con cobertura pintada permanente.

**Preferir:** al hover del nombre/tarjeta/pin, relleno suave (~sombra) + trazo más marcado de esa zona; el resto se atenúa; al salir del nombre/lista la sombra se apaga; sin `fitBounds`.

### 2026-08-10 - Preferencia UI: frontera Census en cobertura por ciudad

**No repetir:** dejar el cuadrado viewport de Google como contorno principal de una ciudad US cuando Census TIGER ya puede devolver el polígono oficial.

**Motivo:** el viewport se siente impreciso frente a la frontera municipal real.

**Preferir:** cargar polígono Census simplificado (gratis) al marcar una ciudad/zona US; trazo claro y relleno muy suave; pin + nombre siguen siendo la identidad; viewport solo si no hay geometría Census. No borrar el contorno en cada recarga (evita parpadeo).

### 2026-08-10 - Preferencia UI: preview + confirmación al ampliar cobertura

**No repetir:** agregar una ciudad/zona a la cobertura al elegir una sugerencia, sin mostrar antes el perímetro.

**Motivo:** el operador necesita ver el área real (p. ej. que San Fernando es pequeño) antes de comprometer la cobertura.

**Preferir:** al elegir un nombre en las sugerencias, mostrar el perímetro en vista previa (contorno cielo) y preguntar `¿Quieres agregar {lugar} a la cobertura de esta ruta?` con `Sí, agregar` / `No, cancelar`. Solo entonces entra en la lista.

### 2026-08-10 - Preferencia UI: cobertura guiada por sugerencias

**No repetir:** un campo de búsqueda sin lista de sugerencias al escribir; ni usar espacios vacíos del mapa como áreas de selección invisibles.

**Motivo:** el operador necesita elegir explícitamente ciudades/zonas (Santa Clarita, Newhall…) y comprobar su perímetro sin que un clic ambiguo agregue otra área.

**Preferir:** autocomplete con sugerencias desde 2 letras; mensaje claro si no hay coincidencias; una sugerencia **previsualiza** el perímetro y pide confirmación antes de ampliar la cobertura; el listado puede resaltar su área en el mapa, pero el mapa no cambia la selección; luego desglosar zonas en la lista si hace falta.

### 2026-08-10 - Preferencia UI: cobertura por ciudad y zonas

**No repetir:** volver a poner ZIP como flujo principal del día-ruta; ni un selector `Modo` en la cobertura del día.

**Motivo:** el operador elige Santa Clarita y, si quiere ser más preciso, desglosa zonas internas. ZIP queda solo como legado.

**Vigencia:** la cobertura por ciudad/zona continúa disponible para el día maestro, pero quedó retirada del editor de subrutas el 2026-08-14. Las subrutas nuevas usan `Por día y aprobación`.

**Preferir:** para el día maestro, buscador de ciudad/zona, chips jerárquicos con desglose, checkboxes de zonas hijas y mapa con pin + nombre (contorno suave solo de referencia). ZIP aparece como `Por ZIP Code (legado)`.

### 2026-08-10 - Preferencia UI: mapa ZIP con mi ubicación

**No repetir:** centrar el mapa siempre en Los Ángeles por defecto; iluminar un ZIP sin decir cuál es; o omitir la posición del operador.

**Motivo:** sin un punto de referencia propio, un ZCTA correcto (p. ej. `91387` en Santa Clarita) parece “otra zona”.

**Preferir:** pedir geolocalización del navegador, marcar `Tú` en el mapa, botón `Mi ubicación`, y ajustar el encuadre para incluir tanto los ZIP iluminados como la posición del usuario. El polígono muestra el ZIP estadounidense (ZCTA); códigos de otros países no tienen geometría Census.

**No repetir:** dejar solo chips ZIP sin un mapa visible; o un bloque vacío que diga que falta la clave sin ofrecer el mapa cuando `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` sí está configurada.

**Motivo:** el operador necesita ver el área geográfica de la ruta al agregar un código postal.

**Preferir:** mapa Google interactivo (paneable/zoom) junto a la cobertura del día-ruta o subruta. Al agregar un ZIP, cargar el polígono ZCTA y pintarlo con el color de la ruta; al quitarlo, quitar esa área. La lista de ZIP sigue siendo la fuente de verdad; si Census o Maps fallan, el guardado no se bloquea.

**No repetir:** limitar ZIP/mapa solo al editor de subrutas nombradas cuando el día activo no tiene subrutas (el día es la ruta). Ni poner un selector `Modo` con `Por día y aprobación` / `Por ZIP Code` en la cobertura del día-ruta.

**Motivo:** si el jueves está activo y no hay divisiones, la ruta es el jueves y lo que se elige es el área (ZIP + mapa), no un modo abstracto. El desplegable de dos opciones confundía.

**Preferir:** con `dayIsRoute`, bajo el horario compacto, chips ZIP y mapa ZCTA directamente. Sin ZIPs guardados, la ruta del día queda abierta (`day_only`); con ZIPs, cobertura postal. Con subrutas, ocultar esa cobertura del día. El selector de modo de cobertura permanece solo en el editor de subrutas.

### 2026-08-10 - Preferencia UI: mapa ZIP dentro de la subruta

**No repetir:** volver a poner búsqueda ZIP o mapa ZCTA como chrome del filtro del día (`Rutas geográficas · {día}`); ni bloquear el guardado si Census/Google Maps fallan.

**Motivo:** el mapa acompaña la cobertura de la ruta vigente (día-ruta o subruta), no una superficie vacía de filtro.

**Preferir:** en el editor de subruta, con cobertura `Por ZIP Code`, mostrar chips ZIP y un mapa compacto que pinta el área con los límites ZCTA del color de la ruta. La lista de ZIP es la fuente de verdad; el mapa es apoyo visual degradable. Cuando el día es la ruta, el mismo patrón vive junto al horario del día.

### 2026-08-10 - Preferencia UI: horario del día compacto

**No repetir:** un panel ancho a todo el ancho con título grande (`El {día} es la ruta`), campos de hora altos y mucho aire vacío alrededor del horario general.

**Motivo:** el control es una decisión corta (inicio/fin) y el bloque grande se siente pesado bajo los días maestros.

**Preferir:** una pastilla compacta (`max-w-sm`): en reposo solo muestra el horario (`10:00 AM · hasta terminar`) con `Editar`; al editar, inicio/fin en una sola fila con `Guardar` y la casilla `Sin hora de fin · hasta terminar` debajo, sin encabezado hero.

### 2026-08-10 - Preferencia UI: día seleccionado solo muestra Subrutas

**No repetir:** debajo de `Días maestros` mostrar `Rutas geográficas · {día}`, subtítulos de filtro, mensaje vacío de rutas geográficas, búsqueda por ZIP ni mapa ZCTA al seleccionar un día que ya tiene subrutas (o como lista genérica del día).

**Motivo:** esa superficie mezclaba cobertura y mapa con la lectura simple de las divisiones del día; con un lunes sin divisiones parecía un módulo incompleto.

**Preferir:** al seleccionar un día, debajo `Subrutas` (lista de divisiones nombradas). Si el día no tiene subrutas, el área de subrutas queda vacía sin mensaje de estado; la cobertura ZIP/mapa del día-ruta vive junto al horario del día, no dentro de Subrutas. Crear divisiones con `Nueva subruta`.

### 2026-08-10 - Preferencia UI: horario del día hasta que existan subrutas

**No repetir:** dejar la activación solo en memoria (switch “encendido” sin persistir); exigir un segundo botón `Activar` para que el día quede guardado; dejar un horario general visible cuando el día ya tiene subrutas; o inventar un cierre obligatorio cuando la ruta termina al completar paradas.

**Motivo:** el operador espera que el switch guarde; el flujo de “pendiente + Activar” parecía activo y al recargar el día volvía apagado.

**Preferir:** el switch persiste de inmediato (`activate_logistics_route_weekday`) con `10:00` y sin hora de fin (o el horario ya guardado). Después se puede editar en la pastilla compacta. Sin subrutas, mostrar ese horario general junto al día. Al crear la primera subruta, desactivar el horario del día; si se archivan todas, reactivarlo.

### 2026-08-10 - Preferencia UI: sin panel de cierre global ni fechas especiales

**No repetir:** mostrar `Reservas y fechas especiales`, `Sin cierre global`, `Cierre global del día anterior`, herencia `Usar cierre global` ni campos de cutoff por día/subruta en el calendario de rutas.

**Motivo:** el operador pidió eliminar esa superficie y su lógica; mezclaba reglas temporales con la configuración diaria de horarios.

**Preferir:** el calendario de rutas como única superficie para días, horarios, capacidad y cobertura. El cierre de una ruta operativa permanece como acción explícita en Preparación/Rutas, no como hora global.

### 2026-08-10 - Preferencia UI: móvil sin recortes ni ancho residual

**No repetir:** diseñar una superficie únicamente para el ancho de escritorio, ocultar sus desbordamientos para que parezca que cabe, imponer paneles o cuadrículas más anchos que el teléfono, o truncar con puntos suspensivos nombres, teléfonos, direcciones, estados y demás datos necesarios para operar.

**Motivo:** una parte principal de los usuarios trabaja desde el celular. En anchos de 320 a 430 px, un mínimo fijo, un popover calculado con el ancho de escritorio o un texto esencial truncado impiden leer o completar la tarea aunque la página no muestre una barra de desplazamiento global.

**Preferir:** validar cada módulo entre 320 y 430 px; permitir que el texto esencial envuelva; aplicar `min-w-0` a campos y celdas flexibles; limitar modales, menús y popovers al ancho útil real del documento; y reservar el desplazamiento horizontal para superficies donde forma parte de la interacción aprobada, como tablas Excel, pestañas, navegación compacta o resúmenes comparables. Las barras móviles priorizan búsqueda y acción principal, y las opciones secundarias se contraen o pasan a una línea deliberada antes de comprimir el dato principal.

**Resultado:** la navegación, formularios, listados, tablas, calendarios, menús y paneles flotantes conservan su operación en teléfonos compactos sin recortes, solapamientos ni margen lateral oculto.

### 2026-08-10 - Preferencia UI: foco único en selectores compuestos

**No repetir:** dibujar un borde de foco rectangular alrededor del campo interno cuando ya existe un contenedor redondeado con icono y acción; el resultado parece dos controles superpuestos.

**Motivo:** el doble marco rompe la forma del selector, fragmenta visualmente el buscador y hace que el icono y la flecha parezcan elementos separados.

**Preferir:** mantener transparente y sin borde el campo interno; mostrar el foco como un único contorno continuo sobre el contenedor exterior redondeado, conservando juntos icono, texto y acción.

### 2026-08-10 - Mapa operativo dentro del detalle de ruta

**Contexto:** El mapa de paradas debe ayudar a leer el recorrido sin crear otra pantalla ni separar la secuencia visual de la lista operativa.

**Decisión:** Mostrar un mapa compacto dentro de la misma superficie del detalle, inmediatamente antes de la lista. Los marcadores usan los mismos números y orden que las filas. La acción `Google Maps` permanece compacta en la barra de `Paradas`; el mapa no agrega encabezados introductorios, tarjetas anidadas ni controles de optimización automática.

**Resultado:** El recorrido es visible junto a sus paradas y los controles de orden siguen disponibles en la misma vista.

### 2026-08-10 - Preferencia UI: un solo calendario para rangos

**No repetir:** mostrar dos calendarios o dos campos separados `Desde` y `Hasta` para elegir un único rango de fechas.

**Motivo:** ambas fechas pertenecen a la misma decisión y separarlas duplica controles, ocupa espacio y hace menos evidente el intervalo seleccionado.

**Preferir:** abrir una sola cuadrícula de calendario; el primer clic selecciona el inicio, el segundo selecciona el final y el intervalo completo queda resaltado antes de aplicarlo.

### 2026-08-09 - Preferencia UI: una sola confirmación de preparación

**No repetir:** enviar una ruta confirmada desde `Preparación` a la pestaña `Rutas` con el estado visible `En preparación` y pedir un segundo cierre para completar la misma decisión.

**Motivo:** el operador ya revisó y confirmó el grupo; repetir el nombre de la etapa hace parecer que la acción anterior no se guardó o que el recorrido retrocedió.

**Preferir:** usar `Confirmar ruta` como acción final de `Preparación`, mostrar `Ruta confirmada` al completar y abrirla en `Rutas` con su estado cerrado/operativo. Reservar `En preparación` para borradores excepcionales que necesiten corrección.

### 2026-08-11 - Preferencia UI: Inventario sin scroll horizontal de página

**No repetir:** `overflow-x-auto` en la cabecera de Inventario (ni en la nav de áreas) que empuje o desplace la página hacia los lados.

**Motivo:** el usuario rechazó mover la página lateralmente para alcanzar filtros, métricas o navegación.

**Preferir:** cabecera con `min-w-0`, `overflow-x-hidden` y `flex-wrap` para que filtros, contadores y áreas quepan dentro del panel; comprimir controles antes que scroll lateral de página.

### 2026-08-11 - Preferencia UI: Inventario en una sola barra

**No repetir:** poner filtros/búsqueda/métricas en un renglón y Artículos / Dónde están / Transferencias… en un segundo renglón permanente fijo.

**Motivo:** la cabecera de Inventario ocupaba dos franjas y empujaba el listado hacia abajo.

**Preferir:** una sola franja operativa compacta; si el ancho no alcanza, envolver dentro del panel (sin scroll horizontal de página) en lugar de forzar una fila con desplazamiento lateral.

### 2026-08-09 - Preferencia UI: Inventario operativo a la vista

**No repetir:** esconder movimientos, transferencias, asignaciones, ubicaciones, camiones y bodegas detrás de un único menú de tres puntos o depender del clic derecho para operar un artículo.

**Motivo:** Inventario combina catálogo y operación diaria; si las áreas principales no son visibles, el usuario no puede anticipar qué existe ni descubrir cómo registrar una entrada, salida o ajuste.

**Preferir:** una sola superficie con navegación compacta para `Artículos`, `Dónde están`, `Transferencias`, `Asignaciones`, `Movimientos`, `Camiones` y `Bodegas`, integrada en la misma cabecera que filtros y contadores. Cada tarjeta o fila de artículo muestra un botón `Operar`; el clic derecho se conserva como atajo, no como única entrada. En anchos estrechos la cabecera envuelve dentro del panel; no desplazar la página hacia los lados.

**Resultado:** las funciones reales quedan visibles y agrupadas, Artículos continúa como área principal y no se crean tarjetas o módulos ficticios para procesos que todavía no tengan respaldo de datos.

### 2026-08-09 - Preferencia UI: selector homologado por página y pestaña

**No repetir:** un icono cíclico que no indica la vista activa, un modo global que cambia pantallas no relacionadas o un control visible en superficies que no responden.

**Motivo:** Lista, Tarjetas y Tabla sirven para trabajos distintos; Logística necesita recordar una presentación propia en Por confirmar, Preparación, Rutas e Historial sin afectar Seguimiento, Venta u otros módulos.

**Preferir:** un selector explícito con `Lista`, `Tarjetas` y `Tabla`, mostrando únicamente las opciones implementadas. La elección se recuerda por página o pestaña. Cambiar de vista conserva filtros, semana, día, búsqueda, selección y grupos expandidos. Las pantallas sin un listado compatible no muestran el selector.

**Resultado:** Logística ofrece las tres vistas en sus cuatro etapas operativas; los demás listados conservan sus modos compatibles y no presentan controles sin efecto. Esta decisión reemplaza la preferencia anterior de modo de vista global.

### 2026-08-09 - Buscador junto a la navegación de Logística

**Contexto:** El buscador de Por confirmar quedaba dentro de la barra semanal y separaba visualmente la semana de sus días; Rutas e Historial no compartían el mismo punto de búsqueda.

**Decisión:** El buscador debe vivir en la franja superior junto a Por confirmar, Rutas e Historial. Por confirmar conserva su búsqueda de invoice, cliente y ruta; Rutas e Historial usan el mismo espacio para buscar ruta, invoice o cliente. La barra semanal queda reservada para semana, navegación y días.

**Resultado:** Las tres vistas operativas conservan una cabecera común y los días permanecen pegados al contexto semanal.

### 2026-08-09 - Semana, búsqueda y días en una sola barra

**Contexto:** El navegador semanal y la fila de búsqueda/pestañas seguían ocupando dos renglones aunque ya mostraban la fecha concreta de cada día.

**Decisión:** `Por confirmar` y las listas semanales de `Rutas` deben integrar semana, navegación, búsqueda y pestañas fechadas dentro de una sola barra horizontal. La barra puede desplazarse lateralmente en anchos muy estrechos, pero no debe crear una segunda fila permanente.

**Resultado:** El contexto de la semana y la selección del día se leen como un único control compacto; la fecha y el contador permanecen diferenciados.

### 2026-08-09 - Pestañas de día con fecha concreta

**Contexto:** En `Por confirmar` la pestaña podía mostrar `Lunes` y una insignia numérica sin dejar claro si el número era la fecha o la cantidad de solicitudes; además, el nombre del día no permitía saber qué lunes de la semana estaba activo.

**Decisión:** Las pestañas de día deben mostrar el nombre del día y, debajo, la fecha concreta de la semana activa (`Lunes · 4 ago`). La cantidad de solicitudes permanece en una insignia separada y el nombre accesible/título conserva la fecha completa.

**Resultado:** El operador identifica la instancia fechada sin hacer cálculos mentales ni confundir la fecha con el contador. Al cambiar de semana, las fechas de las pestañas se actualizan con la misma navegación.

### 2026-08-07 - Preferencia UI: modo Excel en Seguimiento

**Contexto:** Las filas y tarjetas ayudan a revisar un invoice individual, pero la operación también necesita comparar muchos envíos al mismo tiempo.

**Decisión:** `Seguimiento` ofrece un tercer modo `Excel` con una tabla horizontal: una fila por invoice, encabezados persistentes y columnas separadas para cliente, cajas, proceso, ruta/conductor, finanzas, vendedor y acciones. La tabla puede desplazarse horizontalmente en pantallas pequeñas sin convertir los datos en tarjetas apiladas.

**Resultado:** El operador puede escanear y comparar el listado como una hoja de cálculo, conservando selección, edición de progreso y acciones operativas dentro de cada fila.

### 2026-08-08 - Preferencia UI: modo Excel en Por confirmar

**Contexto:** `Logística → Rutas → Por confirmar` también necesita comparar solicitudes de varios invoices sin leer tarjetas una por una.

**Decisión:** El modo `Excel` de confirmaciones muestra una fila por solicitud con columnas para invoice/cliente, dirección, operación, fecha y hora, ruta sugerida, cajas y acciones. La selección masiva, confirmar y rechazar conservan el mismo comportamiento y los botones importantes mantienen un área de 40 px.

**Resultado:** Logística puede revisar y decidir solicitudes pendientes como una hoja de cálculo; en pantallas estrechas la tabla se desplaza horizontalmente.

### 2026-08-07 - Por confirmar usa el navegador compacto de semana

**Contexto:** El navegador de semana de `Rutas` permite revisar rápidamente una semana operativa sin ocupar una barra alta y resulta útil también para las solicitudes pendientes de aprobación.

**Decisión:** `Por confirmar` debe mostrar el mismo encabezado compacto `Semana de operación` con `Anterior`, `Hoy` y `Siguiente`. La lista debe mostrar únicamente las solicitudes pendientes cuya fecha solicitada pertenece a la semana elegida.

**Resultado:** La cola de confirmaciones se puede revisar por semana con el mismo patrón visual y de navegación que las rutas operativas.

### 2026-08-07 - Por confirmar incluye búsqueda compacta

**Contexto:** La cola de confirmaciones puede contener varias solicitudes dentro de una misma semana y no tenía una forma rápida de localizar un invoice concreto.

**Decisión:** El encabezado de `Por confirmar` debe incluir un buscador compacto para invoice, cliente, dirección y ruta. El texto buscado se combina con el filtro semanal activo.

**Resultado:** Logística puede acotar la semana y encontrar una solicitud sin recorrer manualmente toda la cola.

### 2026-08-07 - Por confirmar usa pestañas por día

**Contexto:** El filtro semanal de `Por confirmar` podía dejar varias solicitudes apiladas y los días pendientes no tenían una forma compacta de cambiarse.

**Decisión:** `Por confirmar` debe mostrar pestañas únicamente para los días que tienen solicitudes `pending_approval` en la semana activa. Al seleccionar una pestaña, la lista se limita a ese día y conserva el buscador.

**Resultado:** El operador cambia entre días con el mismo patrón compacto de `Rutas` y no recorre una lista mezclada.

### 2026-08-07 - Tarjetas seleccionables en Por confirmar

**Contexto:** Un checkbox pequeno dejaba demasiado espacio sin accion y hacia poco evidente que invoices estaban seleccionados para una confirmacion masiva.

**Decision:** Toda la tarjeta de una solicitud `pending_approval` debe funcionar como hitbox de seleccion, conservar un checkbox visible de 20 px y responder tambien a `Enter` y `Espacio`. La tarjeta seleccionada usa fondo verde tenue y una linea lateral verde; los botones de confirmar y rechazar quedan fuera de esa seleccion.

**Resultado:** El operador puede seleccionar con un toque amplio y distinguir inmediatamente las solicitudes elegidas.

### 2026-08-07 - Preferencia UI: botones de accion de Por confirmar

**No repetir:** botones de confirmar y rechazar de 32 px con iconos pequenos en la cola de solicitudes.

**Motivo:** Son acciones importantes y el area tactil no se distinguia lo suficiente en pantallas pequenas.

**Preferir:** botones de 40 px, iconos de 20 px, separacion visible entre confirmar y rechazar y centrado vertical dentro de la tarjeta.

### 2026-08-07 - Controles de Por confirmar en una sola barra

**Contexto:** La semana, el buscador, los botones de navegacion, los dias y la seleccion masiva ocupaban filas separadas en `Por confirmar`.

**Decision:** Esos controles deben compartir la barra compacta de semana en pantallas amplias. En pantallas pequenas pueden envolver el contenido, pero no se deben crear filas permanentes adicionales.

**Resultado:** La cola conserva sus filtros y acciones con menor consumo vertical; la navegacion principal de `Por confirmar`, `Rutas` e `Historial` permanece separada.

### 2026-08-07 - Preferencia UI: cabecera compacta de Rutas

**No repetir:** cabeceras altas con una fila para el título, otra para la explicación, otra para la semana y otra para la ruta cuando la información puede agruparse.

**Motivo:** La vista ocupaba demasiado espacio vertical para una ruta recurrente con pocos datos visibles.

**Preferir:** Una cabecera compacta, sin descripción secundaria, con la semana y sus controles reducidos; las rutas deben usar filas de baja altura sin perder la expansión de subrutas.

### 2026-08-07 - Rutas usa pestañas compactas por día

**Contexto:** La vista semanal podía apilar una fila por cada día operativo y consumir demasiado espacio vertical cuando había varias rutas generales.

**Decisión:** `Rutas` debe mostrar los días operativos disponibles como pestañas compactas. Al elegir un día, solo se muestran sus rutas y subrutas de la semana activa; la pestaña seleccionada usa el estado visual principal y conserva navegación accesible de pestañas.

**Resultado:** El operador cambia de día con un toque y la lista mantiene una sola superficie corta, sin perder las instancias fechadas ni las subrutas.

### 2026-08-07 - Rutas activas con fecha concreta

**Contexto:** Una ruta recurrente, como la ruta de todos los domingos, no permite saber por sí sola si se está consultando el domingo 9, el domingo 16 o una fecha posterior.

**Decisión:** `Rutas` debe separar visualmente la definición recurrente de sus instancias fechadas. La vista tendrá un selector o navegador de fechas/semanas y cada instancia mostrará su fecha completa, estado, solicitudes y conductor. La ruta semanal seguirá funcionando como agrupador de sus subrutas.

**Resultado:** El usuario podrá cambiar entre domingos concretos y abrir la instancia correspondiente sin confundir el calendario recurrente con una ruta operativa específica.

### 2026-08-07 - Por confirmar solo muestra solicitudes pendientes

**Contexto:** La vista `Por confirmar` aparecía vacía aunque existieran tareas de Logística, y también mostraba un segundo estado vacío de rutas operativas.

**Decisión:** La vista debe alimentarse de solicitudes de asignación en estado pendiente de aprobación; las tareas sin orden logística permanecen fuera de esta cola. Cuando no haya solicitudes, solo se muestra el estado vacío de `Por confirmar`.

**Resultado:** La pantalla distingue entre una solicitud lista para revisión y un invoice que aún no tiene una orden de ruta, sin ocultar ni duplicar avisos.

### 2026-08-07 - Por confirmar comunica la solicitud operativa

**Contexto:** La fila mostraba fecha, hora y ruta como datos sueltos, sin dejar claro que la ruta todavía era una sugerencia pendiente de revisión.

**Decisión:** Mostrar `Solicitado para {día y fecha completa}`, `Ruta sugerida: {ruta}` y el número con singular/plural correcto (`1 caja`, `2 cajas`).

**Resultado:** Logística entiende de inmediato qué pidió Ventas, para cuándo y qué ruta debe revisar.

### 2026-08-07 - Calendario y subrutas abre la configuración desde Rutas

**Contexto:** El menú de configuración mostraba `Calendario y subrutas`, pero al seleccionarlo desde `Rutas operativas` no cambiaba de pantalla.

**Decisión:** Ese elemento debe abrir directamente la vista `Configuración` de calendario y subrutas en el mismo espacio de Rutas, conservando el estado activo del menú.

### 2026-08-07 - Recursos de Logística conservan salida a la operación

**Contexto:** En Conductores y Vehículos desaparecía la navegación de `Por confirmar`, `Plantillas`, `Rutas operativas` e `Historial`, dejando como única salida el menú de configuración.

**Decisión:** Las pantallas de recursos deben mostrar la navegación operativa compacta para volver directamente a cualquiera de esas cuatro vistas.

### 2026-08-07 - Marco estable entre pantallas de Logística

**Contexto:** Al cambiar entre Rutas, Conductores y Vehículos, la barra superior cambiaba de estructura y el contenido se desplazaba verticalmente.

**Decisión:** Todas las pantallas de Logística conservan una primera franja común con la navegación operativa y Configuración en la misma posición; el contenido específico de la página se coloca debajo.

**Preferir:** mantener la franja con altura fija y evitar que los botones se envuelvan verticalmente; si falta espacio horizontal, la navegación se desplaza lateralmente.

**Criterio:** Conductores, Vehículos y Calendario y subrutas muestran su título en la misma franja y posición relativa a la navegación operativa.

### 2026-08-07 — Visibilidad permanente de invoices en Logística

**Contexto:** Un invoice no debe desaparecer visualmente porque se active o desactive un día maestro.

**Decisión:** `Tareas` inicia con todos los días visibles. Un invoice programado para un día desactivado permanece en la lista con apariencia atenuada y la etiqueta `Día no operativo · visible`, sin confundirse con un invoice eliminado.

**Preferir:** comunicar la restricción con color y estado visible; nunca usar la configuración de días para sacar silenciosamente información de la pantalla.

### 2026-08-07 - Días maestros con nombre completo y estado cromático

**Contexto:** La configuración mostraba abreviaturas y el texto `Activo`/`Inactivo` dentro de cada día, ocupando espacio y haciendo más pesada la lectura.

**Decisión:** Mostrar los nombres completos de lunes a domingo. El estado se comunica con una paleta: verde para días habilitados y superficie apagada para días deshabilitados; no repetir el estado como texto visible.

**Resultado:** La fila se entiende de un vistazo y conserva el estado para lectores de pantalla mediante la etiqueta accesible del botón y `aria-pressed`.

### 2026-08-07 - Filtro de calendario conserva la fecha elegida

**Contexto:** Al seleccionar una fecha anterior del mismo día de ruta, el control volvía inmediatamente a la próxima fecha calculada desde hoy y parecía no responder.

**Decisión:** Al hacer clic en una fecha del calendario, el día de ruta se sincroniza sin reemplazar la fecha que el usuario eligió. El campo mantiene suficiente ancho para mostrar el año completo.

**Resultado:** El operador puede revisar días anteriores y futuros desde el mismo calendario; la fecha visible coincide con la selección y no se pierde por el cálculo del próximo día habilitado.

### 2026-08-06 - Preferencia UI: barra de Tareas compacta

**Contexto:** La barra de Tareas ocupaba tres renglones completos porque la navegación, la búsqueda y los filtros de programación estaban separados en franjas distintas.

**Decisión:** En pantallas grandes, navegación, búsqueda, programación y filtros principales comparten una sola franja compacta. Se conserva el panel de opciones para móvil y para anchos intermedios, y se mantienen todas las acciones existentes.

**Resultado:** La barra reduce su altura sin perder filtros ni acciones; los controles usan etiquetas y alturas compactas, mientras los campos siguen siendo legibles y accesibles.

### 2026-08-06 - Preferencia UI: fecha de entrada a Logística en Tareas

**Contexto:** El usuario necesita distinguir la fecha en que un invoice llegó a Logística de la fecha programada para entregar o recoger.

**Decisión:** Mostrar en filas y tarjetas de Tareas la etiqueta compacta `Agregada a Logística · {fecha}` usando `ordered_at` y, solo si falta en una tarea histórica, `created_at`. La fecha programada permanece como un dato separado dentro del detalle.

**Resultado:** La antigüedad de cada invoice en la cola operativa se entiende de inmediato sin confundirla con la cita del servicio.

### 2026-08-06 - Preferencia UI: filtro de ruta y día de operación

**Contexto:** En Ventas se eligen normalmente una ruta y una fecha para el servicio; la fecha visible del filtro no es la fecha de creación del invoice.

**Decisión:** La barra de Tareas debe presentar el día/fecha y la ruta como filtros coordinados de la operación. La etiqueta `Agregada a Logística` se reserva para la antigüedad informativa del invoice.

**Resultado:** El usuario puede distinguir rápidamente dónde y cuándo debe ejecutarse un envío, sin confundirlo con cuándo fue registrado en la cola.

### 2026-08-06 - Preferencia UI: nombre corto para la ruta general

**No repetir:** mostrar una ruta general como `Ruta general de jueves`, `Ruta General De Jue` o variantes con el día duplicado.

**Motivo:** el usuario quiere identificarla rápidamente por el día al que pertenece.

**Preferir:** mostrar siempre `Ruta del jueves` (y el equivalente de lunes a domingo) para la ruta general. Las rutas geográficas nombradas conservan su nombre propio.

### 2026-08-06 - Preferencia UI: Configuración se representa con engranaje

**No repetir:** mostrar `Configuración` como un botón textual al mismo nivel que `Tareas` y `Rutas`.

**Motivo:** el usuario quiere que la barra principal conserve únicamente las acciones operativas y aproveche mejor el espacio horizontal.

**Preferir:** mostrar `Tareas` y `Rutas` como botones principales; colocar Configuración al extremo derecho de la barra completa como botón de engranaje con tooltip y menú para Conductores, Vehículos y Calendario/subrutas. Dentro de Rutas no repetir una pestaña textual de Configuración junto a `Plantillas` y `Operativas`; el engranaje es el único acceso visible a esa configuración.

### 2026-08-06 - Preferencia UI: navegación de Logística con Configuración agrupada

**No repetir:** ocupar la navegación principal de Logística con cuatro secciones al mismo nivel (`Tareas`, `Conductores`, `Vehículos` y `Rutas`), mezclando operación diaria con administración de recursos.

**Motivo:** la barra pierde espacio y no comunica qué pantallas se usan para operar y cuáles para administrar recursos.

**Preferir:** navegación principal `Tareas`, `Rutas` y `Configuración`. Dentro de `Configuración` ofrecer `Conductores`, `Vehículos` y `Calendario y subrutas`. Mantener la asignación rápida de conductor y vehículo disponible desde las rutas.

### 2026-08-05 - Preferencia UI: filtrar situaciones de asignación en Tareas

**No repetir:** obligar a buscar manualmente entre todas las tareas para distinguir una caja sin ruta de una solicitud rechazada o devuelta a pendiente.

**Motivo:** una solicitud rechazada por error debe poder recuperarse y enviarse nuevamente a una ruta sin perder el día ni el contexto original.

**Preferir:** en `Tareas` ofrecer un filtro de situación con `Todas las situaciones`, `Sin ruta asignada`, `Rechazadas` y `Devueltas a pendiente`. Las filas recuperadas deben conservar una etiqueta visible de su decisión anterior y seguir siendo seleccionables para asignarlas otra vez.

### 2026-08-05 - Preferencia UI: una solicitud en Plantillas ya ocupa ruta

**No repetir:** mostrar en `Tareas` una caja que ya está agrupada en `Rutas → Plantillas` con la etiqueta `Ruta pendiente`.

**Motivo:** la ruta y la fecha ya fueron elegidas por Ventas; lo pendiente es la confirmación de Logística. `Plantillas` es una ruta temporal de preparación y la caja no debe duplicarse en la cola de tareas sin ruta.

**Preferir:** `Tareas` debe mostrar únicamente cajas sin ruta asignada y sin solicitud pendiente en `Plantillas`. Una solicitud dentro de `Plantillas` cuenta como asignada hasta que se deje pendiente, se rechace o se libere por otra acción auditable.

### 2026-08-05 - Preferencia UI: Tareas debe identificar su ruta

**No repetir:** mostrar una tarea activa con invoice, cliente, tipo y dirección, pero ocultar la ruta concreta a la que pertenece o dejar el estado de asignación ambiguo.

**Motivo:** Logística necesita reconocer de inmediato el recorrido de cada caja sin abrir una vista adicional ni adivinarlo por la fecha.

**Preferir:** en el resumen de cada fila de `Tareas` mostrar la ruta operativa y su día/fecha. Si la tarea todavía no tiene ruta operativa, mostrar explícitamente `Ruta pendiente`.

### 2026-08-05 - Preferencia UI: decisiones por parada con motivo

**No repetir:** ofrecer únicamente `Quitar` para sacar una caja de una plantilla, sin distinguir mover, devolver a pendiente y rechazar, ni permitir guardar la decisión sin explicación.

**Motivo:** retirar una solicitud cambia lo que Ventas espera y necesita dejar una explicación consultable en la bitácora del invoice.

**Preferir:** en el detalle de cada parada mostrar `Mover a otra ruta`, `Dejar pendiente` y `Rechazar solicitud`. Las dos últimas abren el motivo obligatorio; el resultado y la explicación deben quedar visibles para Ventas en la bitácora.

### 2026-08-05 - Preferencia UI: el grupo de Plantillas se expande directamente

**No repetir:** obligar a pulsar un botón separado `Ver detalle` / `Ocultar detalle` para revisar una reserva agrupada.

**Motivo:** el grupo de la ruta, por ejemplo `Ruta del jueves`, debe sentirse como una sección expandible y contraíble; el botón adicional agrega un paso innecesario.

**Preferir:** hacer clicable la cabecera completa del grupo para expandir o contraer sus paradas. Mantener `Crear ruta` como la única acción independiente y evitar que ese clic cambie la expansión.

### 2026-08-05 - Preferencia UI: Plantillas debe permitir revisar sus paradas

**No repetir:** mostrar una reserva pendiente solo con el nombre de la ruta, la fecha y los totales de paradas/cajas antes de ofrecer `Crear ruta`.

**Motivo:** Logística necesita saber qué invoice, cliente, dirección, tipo de tarea y cajas entrarán en la ruta antes de convertir la reserva en un recorrido.

**Preferir:** cada grupo de reservas en `Plantillas` debe tener un detalle expandible desde su propia cabecera. Mostrar allí una fila por parada con invoice, cliente, `Dejar`/`Recoger`, dirección, referencia, horario y desglose de cajas; `Crear ruta` queda como acción posterior a esa revisión.

### 2026-08-05 - Preferencia UI: Plantillas es la preparación de una ruta

**No repetir:** usar `Operativas` para mostrar rutas que todavía se están armando, o llamar `Plantillas` a la pantalla que activa días y crea subrutas semanales.

**Motivo:** el usuario distingue la configuración semanal de la ruta concreta que se prepara para una fecha. Mientras se revisan y acomodan invoices, esa ruta todavía no debe mezclarse con las rutas ya cerradas para operar.

**Preferir:** dentro de `Rutas` mostrar `Plantillas` para rutas fechadas en preparación, `Operativas` para rutas cerradas/en curso/terminadas/canceladas y `Configuración` para días disponibles, horarios generales y subrutas.

### 2026-08-05 - Preferencia UI: Rutas usa Configuración, no Plantillas

**No repetir:** llamar `Plantillas` a la vista de `Logística → Rutas` donde se activan o desactivan días, se configura el horario general y se crean subrutas.

**Motivo:** esa superficie configura las rutas disponibles de la empresa; no es una biblioteca separada de plantillas. El nombre anterior confundía la configuración semanal con la ruta real que se opera en una fecha concreta.

**Preferir:** nombrar el botón interno `Configuración`. Mantener `Operativas` para las rutas concretas de una fecha y usar `Configuración` para el calendario de rutas y sus subrutas.

### 2026-08-10 - Preferencia UI: filtro Estado por pierna, no transversal

**No repetir:** poner arriba del filtro Estado atajos transversales `Pendientes` / `En logística` que mezclan entregas y recolecciones; ni duplicar ese mismo criterio otra vez dentro de `Recolecciones` / `Entregas`.

**Motivo:** el operador piensa primero en la pierna (dejar o recoger) y después en si ya se mandó a Logística; la lista anterior se sentía larga y rara.

**Preferir:** filtro Estado con `Recolecciones` y `Entregas` primero (submenú `>` → `Pendientes` / `En logística`), luego `En oficina` y `En tránsito`. Clic en el padre selecciona toda la pierna; el submenú acota. Sin opción `Todas` ni filtros transversales.

### 2026-08-05 - Preferencia UI: pendiente vs en Logística (chip + filtro)

**No repetir:** usar criterios distintos entre el chip de Dejar/Recoger y el filtro Estado; ni etiquetas cerradas ambiguas como `Entrega logística` / `Recolección logística` que no digan “en logística”; ni pintar pendiente y en logística con el mismo ámbar relleno (solo outline vs sólido apenas se distingue).

**Motivo:** el operador necesita distinguir de un vistazo lo que aún no se envió a Logística de lo que ya está en Logística.

**Preferir:** mismo criterio en ambos: pendiente = sin tarea logística abierta; en logística = con tarea abierta (aunque aún no haya ruta operativa). Chip visual: **ámbar outline** = pendiente; **cian/sky relleno** = en logística; verde = hecho. Nodos de progreso más grandes en el riel compacto. En **tarjeta/fila**: solo fondo teñido (ámbar / cian), sin riel ni anillo extra. Copy: `… pendiente` vs `… solicitada…` / `… para el {día}` / `… programada`. Filtro: submenú `Pendientes` / `En logística`; al cerrar, `Entrega pendiente` / `Entrega en logística` (y lo mismo con Recolección). `solicitada` y `para el día` pertenecen ambos al filtro `En logística`. No volver al bloque amarillo ancho tipo alerta que domina como error.

### 2026-08-05 - Preferencia UI: filtro Estado con etiqueta corta, no más ancho

**No repetir:** alargar el campo de filtro Estado para caber `Recolecciones · Pendientes`; ni mostrar en el trigger cerrado la composición larga `Padre · Hijo` del submenú.

**Motivo:** el ancho fijo ocupa la barra y el texto anidado se corta (`Recolecciones · Pe…`); ensanchar el control no es la solución preferida.

**Preferir:** mantener el ancho compacto (`11rem` / `13rem`) y, al cerrar, etiquetas cortas alineadas al criterio pendiente/en logística: `Recolección pendiente`, `Recolección en logística`, `Entrega pendiente`, `Entrega en logística` (padres `Recolecciones` / `Entregas` sin cambio). El submenú abierto muestra solo `Pendientes` / `En logística`; clic en el padre selecciona ambos.

### 2026-08-05 - Preferencia UI: filtro Entregas/Recolecciones con submenú

**No repetir:** listar planos `Recolecciones · sin orden` / `Entregas · solicitadas` (u otras variantes planas) como filas hermanas del padre; ni un solo filtro que mezcle cajas pendientes con las ya enviadas a Logística; ni etiquetas `Sin orden` / `Solicitadas` en ese submenú.

**Motivo:** el operador pidió el patrón de submenú de Windows (`Recolecciones >`); la lista plana no comunica jerarquía.

**Preferir:** en el picker, `Recolecciones` / `Entregas` con chevron `>` y submenú (`Pendientes`, `En logística`). Hover abre el submenú; clic en el padre selecciona todo el bucket (pendientes + en logística). Sin opción `Todas`. `Pendientes` = sin tarea abierta; `En logística` = con tarea abierta hacia Logística.

### 2026-08-05 - Preferencia UI: chip no suena confirmado antes de Logística

**No repetir:** mostrar `Entrega para el jueves` / `Recolección para el jueves` (o `… programada`) cuando la caja solo tiene reserva pendiente; ni decir en el menú `Ya está programada` si Logística aún no la metió en una ruta operativa; ni usar `Entrega pedida · jueves`.

**Motivo:** el chip suena a cita confirmada mientras el menú habla de enviar a Logística para confirmar; “pedida · día” queda abrupto.

**Preferir:** con reserva pendiente, `Entrega solicitada para el jueves` / `Entrega solicitada` y menú `Pedido enviado a Logística…`. Solo cuando ya hay ruta operativa: `Entrega para el jueves` / `Entrega programada` y menú `Ya está en una ruta…`.

### 2026-08-05 - Preferencia UI: chip pendiente sin “por asignar”

**No repetir:** etiquetar el paso activo sin orden como `Entrega por asignar` / `Recolección por asignar`.

**Motivo:** suena a falta de ruta o chofer, no al estado de la entrega; el usuario pidió un texto más claro.

**Preferir:** `Entrega pendiente` / `Recolección pendiente`, alineado con el copy de venta y bitácora.

### 2026-08-05 - Preferencia UI: Dejar con oficina y chofer en el mismo menú

**No repetir:** separar en Dejar la oficina al clic derecho (o a un flyout por hover) y el chofer al clic izquierdo; ni esconder `Entregar en oficina` detrás de un submenú lateral.

**Motivo:** el usuario no encuentra la entrega en oficina; el clic derecho parece vacío y el patrón no coincide con Recoger.

**Preferir:** el mismo menú de Dejar (clic izquierdo o derecho) muestra `Entregar en oficina` y `Programar entrega` como acciones visibles, al estilo de Recoger.

### 2026-08-05 - Preferencia UI: progreso de Seguimiento sin bloque de alerta

**No repetir:** mostrar una etapa pendiente por asignar como un botón ancho con borde y fondo amarillo que domina la tarjeta; ni encerrar los datos de pago en varias cajas anidadas.

**Motivo:** un pendiente normal se percibe como advertencia o error, los pasos se leen como botones aislados y la tarjeta pierde jerarquía entre identidad, avance y datos operativos.

**Preferir:** mostrar los pasos como un riel continuo con nodos conectados: completados en verde, etapa actual con un acento ámbar contenido y futuras en gris. Mantener `pendiente` como texto del paso actual sin teñir toda su superficie. En tarjetas, presentar total, pagado y saldo como una sola franja de datos separada por divisores.

### 2026-08-05 - Preferencia UI: listado de Logística sin flash de invoices

**No repetir:** pintar el listado de tareas con Día/Fecha todavía vacíos (`weekdayFilter=null`, `dateFilter=""`) y aplicar el día por defecto en un `useEffect` / `requestAnimationFrame` posterior; ni saltarse la recarga de rutas del SSR cuando el filtro de la UI ya no coincide con “hoy”; ni mostrar invoices en Tareas mientras las rutas del día filtrado aún no están cargadas.

**Motivo:** al entrar se ven invoices que ya están en una ruta (porque el board solo conoce las rutas de hoy), y ~30s después (refresh) o al asentar filtros desaparecen hacia Rutas.

**Preferir:** inicializar Día/Fecha de forma síncrona; recargar rutas en cuanto el alcance de la UI difiere del SSR; y no pintar el board de Tareas hasta que las rutas coincidan con ese filtro (indicador quieto en la lista).

### 2026-08-05 - Preferencia UI: buscador de Rutas en la misma barra

**No repetir:** poner el buscador de Rutas en una segunda franja sticky debajo de la navegación, con altura/`h-10` o estilo distinto al de Tareas / Conductores / Vehículos.

**Motivo:** al entrar a Rutas el buscador “baja” y cambia de aspecto; parece otra pantalla.

**Preferir:** el mismo `panelToolbarClass` + control `h-9` con `insetShellClass` en la barra superior, junto a la nav y `Plantillas` / `Operativas` / `Configuración`.

### 2026-08-05 - Preferencia UI: nav de Logística siempre a la izquierda

**No repetir:** empujar `Tareas` / `Conductores` / `Vehículos` / `Rutas` al lado derecho con `ml-auto`, ni dejar Rutas con un orden distinto al resto del módulo.

**Motivo:** al cambiar de sección las pestañas saltan de lado y Rutas parece otra jerarquía; el resto de pantallas del producto mantiene las pestañas a la izquierda.

**Preferir:** la navegación principal de Logística como primer control de la barra en Tareas, Conductores, Vehículos y Rutas. En Rutas, `Plantillas` / `Operativas` / `Configuración` van a continuación, en la misma fila.

### 2026-08-05 - Preferencia UI: listado de Logística contraído

**No repetir:** mostrar todos los controles de chofer, ruta y programación abiertos en cada fila del listado de Logística.

**Motivo:** el listado pierde la lectura rápida y obliga a recorrer demasiados controles antes de identificar la tarea.

**Preferir:** en modo filas, mostrar primero una fila-resumen compacta y expandir el detalle al hacer clic o activar la fila con teclado. Las tarjetas conservan su detalle visible.

### 2026-08-04 - Preferencia UI: Seguimiento sin cajas anidadas

**No repetir:** encerrar la barra de filtros y el estado vacío de Seguimiento en tarjetas bordeadas dentro del `Panel` principal.

**Motivo:** los marcos consecutivos se perciben como cuadros dentro de cuadros, fragmentan la pantalla y hacen competir a la barra con el contenido.

**Preferir:** una sola superficie principal; barra operativa sin tarjeta propia, separada del contenido por un divisor, y estado vacío integrado sin borde ni fondo adicional.

### 2026-08-04 - Preferencia UI: carga de módulos sin flash en blanco

**No repetir:** `Suspense fallback={null}` en layouts de módulos (Seguimiento, Logística, Configuración, Estadísticas, Auditoría, Conductor, Venta, Inventario); ni sustituir toda la pantalla por un skeleton suelto sin barra/chrome; ni `PageLoading` a pantalla completa dentro de paneles de Configuración que ya tienen marco.

**Motivo:** al entrar se ve vacío y después “saltan” marcos, barras y cuadros.

**Preferir:** `ModuleSuspense` / `PageContentPlaceholder` (hueco de barra + área de lista). Mientras carga el cliente, conservar el chrome del módulo (Panel, toolbar, rejilla de Auditoría, marco de Inventario) y un indicador quieto (`PageLoading inline`) en la zona de contenido.

### 2026-08-04 - Preferencia UI: carga de Seguimiento sin flash de marcos

**No repetir:** `Suspense` con `fallback={null}` que deja el shell vacío y luego aparece de golpe la barra + skeletons con varias cajas bordeadas; ni sustituir toda la página de envíos por un skeleton distinto a la barra final.

**Motivo:** al entrar a `/seguimiento` se ve primero sin líneas y después “saltan” marcos y cuadros por todos lados.

**Preferir:** el shell permanece visible; el contenido en suspense usa un placeholder de misma jerarquía (hueco de barra + área de lista). Mientras carga envíos, mantener la barra de filtros y un indicador quieto en la lista (borde punteado, sin grid de tarjetas skeleton).

### 2026-08-04 - Preferencia UI: misma barra en Tareas / Conductores / Vehiculos / Rutas

**No repetir:** envolver la barra de Conductores/Vehiculos en una tarjeta (`cardClass`) con borde completo mientras Tareas usa solo `panelToolbarClass` con una línea inferior; ni dejar el buscador de Rutas en otra franja.

**Motivo:** al cambiar de sección aparecen “más líneas” (caja anidada) y la barra salta de aspecto.

**Preferir:** la misma cromática de barra (`panelToolbarClass` + fila flex) en las cuatro secciones; sin tarjeta extra alrededor del toolbar; buscador `h-9` en esa misma fila.

### 2026-08-04 - Preferencia UI: nav de Logística sin salto al cambiar sección

**No repetir:** botones `Tareas` / `Conductores` / `Vehiculos` con `primaryButtonClass` vs `secondaryButtonClass` (borde distinto) ni anchos que crecen al activarse.

**Motivo:** al hacer clic el botón activo cambia de tamaño y el grupo se desplaza; se ve un salto raro.

**Preferir:** un solo control segmentado (mismo contenedor, borde fijo, fondo emerald solo en el activo) con `min-width` estable por etiqueta.

### 2026-08-04 - Preferencia UI: acceso a Rutas desde Logística

> Histórico — actualizado el 2026-08-04. La fuente vigente es la decisión `Rutas permanece dentro de Logística` registrada más abajo.

**Contexto:** Logística necesita abrir el calendario y las subrutas que se administran en Configuración → Ventas → Rutas.

**Decisión:** La navegación de Logística incluye `Rutas` junto a `Tareas`, `Conductores` y `Vehículos`. El enlace abre `/configuracion?view=prices&panel=rutas` y reutiliza la pantalla existente.

**No repetir:** crear otra pantalla o un segundo catálogo semanal dentro de Logística.

### 2026-08-04 - Preferencia UI: Rutas semanales en Configuración → Ventas

> Histórico — actualizado el 2026-08-04. El catálogo sigue compartido, pero su acceso desde Logística ahora permanece dentro de `/logistica?view=rutas`.

**No repetir:** editar el calendario semanal (activar días, horario general, plantillas) en `Logística → Rutas`, ni mostrar atajos Exacta/Antes de en la misma pestaña que el catálogo de rutas, ni dejar dos pantallas para el mismo calendario.

**Motivo:** el usuario activa días y define recorridos en un solo lugar; Logística opera tareas del día, no administra el catálogo semanal.

**Preferir:** `Configuración → Ventas → Rutas` (`/configuracion?view=prices&panel=rutas`) con el mismo `LogisticsRouteCatalog`. `/logistica?view=rutas` y `panel=horarios` redirigen ahí. Logística ya no muestra la sección Rutas en su nav.

### 2026-08-04 - Preferencia UI: Horarios solo con días activos

**No repetir:** mostrar lunes–domingo en un selector de atajos con días apagados/deshabilitados que no se pueden activar desde ahí.

**Motivo:** parece que se pueden encender o apagar días fuera del catálogo de rutas. Confunde.

**Preferir:** el calendario operativo vive en `Configuración → Ventas → Rutas` (activar/desactivar días ahí). No usar un segundo selector de días muertos en otra pantalla.

### 2026-08-04 - Preferencia UI: sección Ventas (no Costos) con Países, Depósito y Rutas

**No repetir:** llamar `Costos` a la sección que mezcla precios, depósito y calendario de rutas, ni dejar el catálogo semanal solo en Logística, ni duplicarlo.

**Motivo:** “Horarios con Costos” sonaba raro; precios, depósito y rutas semanales son política comercial/operativa de venta en un solo menú de Configuración.

**Preferir:** `Configuración → Ventas` (`view=prices`) con pestañas `Países`, `Depósito` y `Rutas`.

### 2026-08-04 - Preferencia UI: depósito mínimo en Configuración → Ventas

**No repetir:** esconder el depósito mínimo solo detrás del engranaje de Seguimiento (`/seguimiento?view=configuracion`) ni tratarlo como ajuste operativo del listado de envíos.

**Motivo:** es una regla comercial de la organización (como los precios por país). Quien busca “cambiar el depósito” mira Configuración, no Seguimiento.

**Preferir:** `Configuración → Ventas` pestaña `Depósito` (`/configuracion?view=prices&panel=deposito`).

### 2026-08-03 - Preferencia UI: razón reutilizable del cargo adicional

**No repetir:** cargo adicional solo con importe, sin razón, ni un catálogo global de motivos de organización.

**Motivo:** al volver el mismo cliente hay que saber cuánto se cobró y por qué, para no cambiar el precio al azar.

**Preferir:** en Ventas, al activar el cargo: importe + razón obligatoria; hint `Última vez: $X · razón` y chips de razones del historial del mismo cliente y del mismo tipo (entrega/recolección).

### 2026-08-03 - Preferencia UI: Ventas con países, depósito y rutas; cargo extra en captura

**No repetir:** pestaña `Operativos` con cargos sugeridos de entrega/recolección, ni textos `Sugerido $0` / `Se usará la sugerencia de Logística` en el programador de Ventas. Tampoco dejar el depósito mínimo solo en Seguimiento ni el catálogo semanal solo en Logística, ni llamar `Costos` a la sección que incluye rutas.

**Motivo:** el importe extra de conductor lo decide el vendedor por operación. Precios, depósito y calendario semanal deben vivir juntos bajo Configuración → Ventas.

**Preferir:** `Configuración → Ventas` con pestañas `Países`, `Depósito` y `Rutas`. En el flujo de venta, checkbox de cargo adicional + importe capturado por el vendedor; el servicio normal sigue incluido.

### 2026-08-03 - Preferencia UI: etiqueta de atajos horarios en Ventas

**No repetir:** etiquetar los atajos del programador como `Horas frecuentes`, `Límites sugeridos`, `Inicios sugeridos` o `Rangos sugeridos`; separar modalidades, atajos y campo de hora con rótulos distintos (`Hora`, `Hora exacta`, `Antes de`, `A partir de`); ni presentar `Exacta`/`Antes de`/`A partir`/`Entre` como si fueran la cita oficial.

**Motivo:** suenan a horario operativo o cita confirmada; la recolección oficial la define después Logística. Varias etiquetas hacen parecer bloques distintos.

**Preferir:** una sola sección `Preferencia del cliente` que agrupe modalidades, atajos y campo de hora. Acompañar el título con `CompactInfoDisclosure` aclarando que Logística confirma después el horario oficial. En `Entre`, conservar solo `Desde`/`Hasta` para distinguir los dos extremos. Diferenciar siempre esa preferencia del `Horario confirmado por Logística`.

### 2026-08-03 - Preferencia UI: ordenar listados de remitentes y destinatarios

**No repetir:** botón o sección suelta llamada `Recientes` en la barra (preferencia 2026-07-28).

**Motivo:** el usuario quiere cambiar el orden del listado (más recientes, A→Z, etc.) sin otra entrada rápida aparte.

**Preferir:** control compacto de **Orden** solo con icono (flechas) junto al buscador; al pasar el mouse se muestra el modo actual (`Más recientes`, `A → Z`, `Z → A`; en destinatarios también `Por país`). Preferencia persistida en localStorage.

### 2026-08-03 - Preferencia UI: sin paneles de mantenimiento, simulación o jerga técnica

**No repetir:** paneles de limpieza de datos, “Actualizar reporte”, “Simular…”, dry-run, backfill, ILIKE, `shipment_ref`, códigos crudos de estado (`in_progress`, etc.) ni textos de motor interno (RPC, rollback, coincidencia parcial) en pantallas de operador.

**Motivo:** el usuario opera envíos, stock y rutas; no diagnostica integridad de datos ni prueba migraciones.

**Preferir:** UI solo operativa y en español claro. Herramientas de integridad/histórico quedan en SQL/RPC/scripts. Si hace falta una excepción real (p. ej. completar fuera del flujo), usar modal de riesgo con copy humano, sin jerga de implementación.

### 2026-08-03 - Preferencia UI: clic derecho solo abre el menú

**No repetir:** al abrir un menú contextual de fila/tarjeta, navegar o seleccionar el registro como si fuera un clic izquierdo.

**Motivo:** el usuario espera opciones sobre la fila sin abandonar la lista; abrir el detalle a la vez oculta el menú o cambia de vista por error.

**Preferir:** el clic derecho solo muestra el menú; las acciones del menú (p. ej. “Ver datos”) son las que navegan o abren el detalle.

### 2026-08-03 - Preferencia UI: listados largos sin clip en Panel

**No repetir:** envolver listas de página completa en `Panel` con `clipContent` por defecto (`overflow-hidden`) ni forzar `min-h-[calc(100dvh-…)]` para “llenar” la vista.

**Motivo:** el App Shell de escritorio ya hace scroll en el área central; un `Panel` con `overflow-hidden` como hijo flex se encoge, recorta el contenido y oculta la scrollbar.

**Preferir:** `clipContent={false}` en paneles de listado/detalle de página, dejar que el contenido crezca y que el shell muestre la scrollbar. Reservar `overflow-hidden` + scroll interno solo cuando la pantalla tenga un layout de relleno deliberado (`min-h-0 flex-1 overflow-y-auto`).

### 2026-08-02 - Preferencia UI: motivo de ruta activa con modal

**No repetir:** pedir el motivo de un cambio en ruta `in_progress` con `window.prompt` o un campo suelto fuera de diálogo.

**Motivo:** en móvil y escritorio el prompt nativo es frágil, poco accesible y no muestra contexto de ruta/parada.

**Preferir:** modal dedicado (`LiveRouteChangeReasonDialog`) con contexto, motivo obligatorio (≥3) y confirmación explícita. El estado del formulario se reinicia al abrir mediante remount (`key`), no con `setState` en `useEffect`.

### 2026-08-02 - Preferencia UI: excepción administrativa visible

**No repetir:** completar tareas administrativas saltando la máquina de estados sin UI de riesgo explícita.

**Motivo:** la excepción debe ser consciente, auditable y difícil de confundir con el flujo normal del conductor.

**Preferir:** modal de excepción (`LogisticsAdminTaskExceptionDialog`) con motivo, checkbox de riesgo y auditoría; remount al abrir para limpiar estado sin efectos. Copy en español claro (“Completar fuera del flujo”), sin códigos internos de estado.

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

### 2026-07-25 — Antecedente de advertencia de venta sin stock (reemplazado)

Esta preferencia fue reemplazada el 2026-08-13: el faltante bloquea la venta, conserva el formulario con un error recuperable y nunca se presenta como advertencia posterior al éxito.

### 2026-07-31 - Antecedente UI: stock pendiente en Notificaciones (reemplazado)

**No repetir:** mostrar éxito de invoice, un banner, un toast informativo o un nuevo ítem de Notificaciones cuando la reserva de inventario falló.

**Motivo:** desde el 2026-08-13 el faltante impide crear la venta; comunicar éxito o un pendiente contradiría el resultado atómico.

**Preferir:** mantener el formulario abierto y mostrar el error de stock en el contexto de confirmación. Los recordatorios históricos pueden seguir visibles como auditoría.

### 2026-07-25 — Selección de remitente en celular

- Tocar un remitente debe marcarlo y avanzar inmediatamente al paso `Destinatario`.
- La carga de destinatarios es una dependencia opcional de la pantalla siguiente y debe ejecutarse en segundo plano.
- Una demora o fallo de esa consulta no debe dejar el toque sin respuesta ni bloquear el avance del flujo.
- **Actualizado 2026-08-05:** no usar `pointer-events-none` sobre la lista de remitentes mientras se recarga o busca; la lista visible debe seguir siendo tocable. El indicador de carga puede atenuar solo el estado vacío inicial. Las filas/tarjetas usan un botón de selección propio (no `role="button"` envolviendo otros botones) para que el toque funcione en celular.

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
> | Depósito mínimo | `Configuración → Ventas → Depósito` |
> | Preferencia horaria del cliente (`Exacta`, `Antes de`, `A partir`, `Entre`) | Programador de Ventas, tomada del historial del cliente |
> | Días y horarios operativos / recorridos semanales | `Configuración → Ventas → Rutas` |
> | Cargo logístico adicional | Ventas (importe capturado por el vendedor cuando hay conductor) |
> | Anticipación | Sin panel Operativos de cargos; lead time de rutas en Logística |

- No existe un panel global para que Logística administre las horas que ve Ventas.
- El programador de Ventas muestra una superficie compacta de `Preferencia del cliente` (modalidades `Exacta`, `Antes de`, `A partir` o `Entre`, atajos del historial y campo de hora), con `CompactInfoDisclosure` aclarando que Logística confirma el horario oficial después.
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

**Preferir:** reglas comerciales (precios por país, depósito mínimo) y el calendario semanal en `Configuración → Ventas`; Logística opera tareas del día; cargos de entrega/recolección capturados en el flujo de venta, no en un panel Operativos. Actualizado 2026-08-04: Rutas semanales salen de Logística y viven en Ventas → Rutas.

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

**Preferir:** una sola tarjeta `Costos` centrada en `Países` (precio público, costo interno y ganancia por país). El cargo logístico adicional lo captura el vendedor en Ventas. Diferir Distribuidores.

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

**Preferir:** en el menú, `Editar entrega` / `Editar recolección`. En el chip compacto activo: `Entrega solicitada para el lunes` mientras espera a Logística; `Entrega para el lunes` solo con ruta operativa; `Entrega solicitada` / `Entrega programada` si no hay día legible; `Entrega pendiente` si todavía no hay orden. Lo mismo con `Recolección…`. Reservar `Dejar`/`Recoger` para pasos ya hechos o aún no activos.

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

### 2026-08-04 - Configuración de cobros y rutas en Ventas

**Contexto:** La sección antes rotulada `Depósito` ahora reúne depósito y formas de pago.

**Decisión:** Mostrarla como `Cobros`, en una sola superficie con divisores: depósito por caja, programación pendiente, métodos aceptados, métodos del conductor, predeterminado y referencias obligatorias. En `Rutas`, agrupar reservas/fechas especiales antes del calendario semanal y conservar las capacidades y cobertura dentro del día o subruta correspondiente.

**Resultado:** La configuración refleja la fuente de verdad operativa sin crear nuevas páginas ni cajas introductorias anidadas.

### 2026-08-04 - Preferencia UI: forma predeterminada fuera de las columnas de cobro

**No repetir:** colocar `Forma predeterminada` dentro de la tercera columna junto a las referencias obligatorias, como si representara un tercer grupo de usuarios.

**Motivo:** estorba, mezcla dos propósitos y hace confusa la relación entre las tres columnas.

**Preferir:** usar las columnas `Formas aceptadas`, `Cobros del conductor` y `Comprobantes`; mostrar `Forma predeterminada` en una fila independiente debajo de las tres.

### 2026-08-04 - Plazo de recolección en Cobros

**Contexto:** El tiempo incluido y el cargo posterior determinan el precio que se cobrará al cliente, aunque su ejecución operativa termine en una ruta.

**Decisión:** Mostrar `Recolección incluida` y `Cargo fuera de plazo` dentro de `Configuración > Ventas > Cobros`, en la misma superficie y separados del bloque de formas de pago. La factura informa los días desde la entrega real de la caja vacía y el importe posterior. En Seguimiento, antes de ordenar una recolección vencida, mostrar el importe que se agregará.

**Resultado:** La política comercial queda junto a los demás cobros y el operador ve la consecuencia financiera en el momento pertinente.

### 2026-08-04 - Preferencia UI: controles excepcionales contraídos

**No repetir:** mostrar `Reservas y fechas especiales` como un formulario grande, abierto permanentemente encima del calendario semanal.

**Motivo:** ocupa demasiado espacio y complica la lectura y el uso cotidiano de la configuración de rutas.

**Preferir:** una fila compacta, contraída por defecto, con un resumen de anticipación, hora de cierre y cantidad de fechas especiales; abrir el formulario completo únicamente cuando el usuario lo solicite.

### 2026-08-04 - Activación guiada de días de ruta

**Contexto:** El interruptor de un día necesita recopilar el horario antes de poder representar una ruta disponible.

**Decisión:** Al intentar activar un día, mantenerlo visualmente pendiente y mostrar en su misma tarjeta los campos obligatorios de inicio y fin, más el cierre de reservas heredado o propio. El botón final se llama `Activar`; cancelar conserva el día apagado. Las subrutas muestran inicio y fin como obligatorios y un cierre propio opcional cuya ausencia significa `usar global`.

**Resultado:** La disponibilidad verde siempre representa una ruta utilizable y la configuración adicional aparece solo durante la creación o edición, sin añadir otro panel permanente.

### 2026-08-04 - Opción de ruta sin hora de fin

**Contexto:** No todas las rutas tienen una hora final conocida; algunas concluyen al terminar todas las paradas.

**Decisión:** Junto al horario mostrar la casilla `Sin hora de fin · hasta terminar la ruta`. Al marcarla, deshabilitar y limpiar el campo de fin. En tarjetas y confirmaciones mostrar `Inicio [hora] · hasta terminar la ruta`, sin presentar el horario como incompleto.

**Resultado:** El formulario no obliga a inventar una hora de cierre y mantiene claramente obligatoria la hora de inicio.

### 2026-08-05 - Preferencia UI: fin visiblemente bloqueado en rutas abiertas

**No repetir:** mantener el selector `Fin` con la misma apariencia activa después de marcar `Sin hora de fin`, aunque internamente ya no responda al clic.

**Motivo:** parece que ambos controles siguen disponibles y que el formulario conserva dos decisiones contradictorias.

**Preferir:** limpiar, bloquear y atenuar claramente el selector `Fin`; cerrar también su panel si estaba abierto. Al desmarcar la opción, recuperar inmediatamente su apariencia e interacción normales.

### 2026-08-05 - Preferencia UI: límites de ruta bajo demanda

**No repetir:** mostrar permanentemente `Max. paradas` y `Max. cajas` vacíos en la configuración de cada día o subruta.

**Motivo:** son restricciones opcionales y ocupan espacio en el flujo habitual aunque la ruta no necesite límites.

**Preferir:** mostrar primero una sola opción compacta `Limitar paradas y cajas`. Los dos campos aparecen únicamente al activarla; una ruta con límites guardados abre esa opción activa y visible.

### 2026-08-04 - Acciones al final de la tarjeta de ruta

**Contexto:** `Activar/Guardar` y `Cancelar` aparecían antes de la selección del conductor por defecto, aunque todavía quedaban datos por revisar debajo.

**Decisión:** En la edición o activación de un día, colocar las acciones después de horario, límites, política de reservas, subrutas y conductor por defecto. Deben cerrar visualmente la tarjeta.

**Resultado:** El operador completa la tarjeta de arriba hacia abajo y confirma únicamente al final.

### 2026-08-04 - Ayuda contextual en el cierre de reservas

**Contexto:** El efecto de `Cierre global del día anterior` no resulta evidente solo por el nombre.

**Decisión:** Mostrar un `CompactInfoDisclosure` con icono `!` junto al título. La ayuda explica la regla con lenguaje breve, un ejemplo concreto y la prioridad de un cierre propio de ruta. Mantener la explicación oculta hasta que el usuario la solicite.

**Resultado:** La sección conserva su densidad compacta y la configuración puede entenderse en contexto sin abandonar el formulario.

### 2026-08-04 - Preferencia UI: Rutas permanece dentro de Logística

**Contexto:** El acceso a Rutas desde Logística llevaba a Configuración y mostraba también las pestañas de Países y Cobros.

**Decisión:** Rutas es una sección del módulo de Logística, al mismo nivel que Tareas, Conductores y Vehículos. El enlace usa `/logistica?view=rutas` y muestra solo el panel de Rutas, sin pestañas de Países o Cobros.

**Resultado:** El operador conserva el contexto y la navegación de Logística. El panel reutiliza el catálogo compartido de rutas; no se crea un catálogo paralelo.

### 2026-08-04 - Preferencia UI: navegación de Logística con altura estable

**Contexto:** Al abrir Rutas desaparecía el buscador de tareas y la navegación quedaba en una fila distinta; los botones parecían subir, bajar o cambiar de tamaño frente a Tareas, Conductores y Vehículos.

**Decisión:** La navegación de Rutas debe ocupar el mismo slot de toolbar, con altura fija y alineación vertical centrada. La ausencia del buscador no debe cambiar la posición ni las dimensiones del control segmentado.

**Resultado:** Cambiar entre las cuatro secciones mantiene el grupo de navegación estable y evita saltos visuales.

### 2026-08-04 - Preferencia UI: una sola regla de cierre de reservas

**No repetir:** mostrar `Anticipación adicional (horas)` junto al cierre del día anterior.

**Motivo:** ambas opciones parecen resolver el mismo límite, generan dudas sobre cuál manda y complican innecesariamente la configuración.

**Preferir:** mostrar únicamente `Cierre global del día anterior`, con posibilidad de que cada día o subruta herede esa hora o defina una propia.

### 2026-08-05 - Preferencia UI: no mostrar un cierre global inexistente

**No repetir:** mostrar `Usar cierre global`, textos de herencia o resúmenes `Cierre: sin configurar` cuando no existe una hora global guardada.

**Motivo:** ofrece una opción que no tiene ningún valor que heredar y agrega ruido a la edición de días y subrutas.

**Preferir:** ocultar por completo la herencia y sus resúmenes cuando no hay cierre global. Si una ruta conserva un cierre propio real, mantener únicamente ese control para que pueda revisarse o retirarse.

### 2026-08-05 - Preferencia UI: sin Gestionar dentro de la tarjeta del día

**No repetir:** mostrar la fila `N rutas · Gestionar` dentro de cada tarjeta del calendario de rutas.

**Motivo:** duplica la selección disponible en el encabezado del día, alarga la tarjeta y compite visualmente con los controles operativos.

**Preferir:** seleccionar el día desde su encabezado y administrar sus subrutas en la sección inferior correspondiente, sin una acción redundante dentro de la tarjeta.

### 2026-08-05 - Preferencia UI: administración de subrutas en la sección inferior

**No repetir:** ocultar `Nueva subruta` cuando el día seleccionado está apagado ni repartir las acciones de subrutas entre las tarjetas del calendario.

**Motivo:** agregar, editar y eliminar pertenecen a la sección `Subrutas del día`; ocultar el alta en un día apagado hace que esa superficie parezca únicamente informativa.

**Preferir:** mantener `Nueva subruta` en el encabezado de la sección inferior y las acciones de editar y eliminar en cada subruta. Si el día está apagado, explicar que la configuración quedará guardada y no se usará hasta activarlo.

### 2026-08-05 - Preferencia UI: calendario estable al cambiar la disponibilidad

**No repetir:** reemplazar el catálogo de rutas por un cargador ni remontar toda la sección después de activar o desactivar un día.

**Motivo:** el salto visual se percibe como una recarga completa de la página, pierde el contexto del día seleccionado e interrumpe una acción breve.

**Preferir:** reflejar inmediatamente el nuevo estado en la tarjeta y sincronizar el catálogo en segundo plano, manteniendo la misma superficie visible y estable.

### 2026-08-05 - Preferencia UI: sincronización automática sin avisos acumulables

**No repetir:** mostrar toasts como `Board actualizado` al entrar a Logística, volver a la pestaña o ejecutar la actualización automática periódica.

**Motivo:** no corresponde a una acción iniciada por el usuario, aporta poco valor y puede apilar varias notificaciones iguales en la pantalla.

**Preferir:** actualizar el board silenciosamente en segundo plano. Reservar las notificaciones para acciones explícitas del usuario y para errores que requieran atención.

### 2026-08-05 - Preferencia UI: altura independiente en las tarjetas de días

**No repetir:** estirar todas las tarjetas de una fila cuando se abre una opción o editor dentro de un solo día.

**Motivo:** hace parecer que todas las tarjetas se expandieron aunque la acción solo corresponde al día seleccionado y deja grandes áreas vacías en las demás.

**Preferir:** alinear las tarjetas por arriba y permitir que cada una conserve su propia altura. Opciones como `Limitar paradas y cajas` expanden únicamente la tarjeta donde se activaron.

### 2026-08-05 - Preferencia UI: conductor fuera de las tarjetas del calendario

**No repetir:** mostrar `Conductor por defecto` dentro de cada tarjeta superior ni mantener un único selector por día cuando existen subrutas.

**Motivo:** el selector alarga todas las tarjetas y comunica incorrectamente que un solo conductor cubre recorridos distintos dentro del mismo día.

**Preferir:** mostrar `Conductor de la ruta general` en la sección inferior solo cuando el día no tiene subrutas. Si las tiene, mostrar un selector de conductor dentro de cada subruta y ocultar el selector general.

### 2026-08-05 - Preferencia UI: una sola entrada a Rutas con tres vistas internas

**No repetir:** agregar botones principales separados para `Rutas creadas`, `Rutas cerradas` y `Configuración` en la navegación de Logística.

**Motivo:** multiplica los accesos del módulo, ocupa la barra estable y separa estados que pertenecen al mismo listado operativo.

**Preferir:** conservar un único botón principal `Rutas`. Dentro de esa superficie usar las vistas `Plantillas`, `Operativas` y `Configuración`; `Plantillas` abre por defecto para preparar rutas fechadas. `Operativas` muestra `Cerrada`, `En curso`, `Terminada` y `Cancelada`, y `Configuración` administra el calendario semanal y las subrutas.

### 2026-08-06 - Preferencia UI: separar cajas para entregar y recoger en Rutas

**No repetir:** mostrar únicamente un total ambiguo de `cajas` en la preparación de una ruta.

**Motivo:** Logística necesita preparar cajas vacías para las entregas y no debe confundirlas con las cajas llenas de las recolecciones.

**Preferir:** en `Rutas → Plantillas` mostrar `cajas vacías para entregar` y, cuando exista, `cajas llenas para recoger`; en el detalle mostrar además el total.

### 2026-08-05 - Preferencia UI: listado de rutas resumido con detalle al seleccionar

**No repetir:** abrir en cada fila todos los controles de conductor, vehículo, cajas y administración, ni crear una tarjeta anidada por cada dato.

**Motivo:** el listado se vuelve alto, repite controles y dificulta comparar fechas, estados y cantidades entre rutas.

**Preferir:** filas compactas con nombre, fecha, estado, total de paradas, total de cajas, conductor y vehículo. Al seleccionar una fila, abrir un detalle lateral con las cajas y paradas; en móvil usar un panel superpuesto con regreso explícito. Mantener una sola superficie continua y divisores entre filas.

### 2026-08-06 - Preferencia UI: aceptar o retirar reservas con iconos

**No repetir:** mostrar tres botones de texto largos para cada solicitud pendiente (`Mover a otra ruta`, `Dejar pendiente` y `Rechazar solicitud`).

**Motivo:** ocupan demasiado espacio y no distinguen la decisión principal de aceptar frente a las alternativas de retirar la solicitud.

**Preferir:** mostrar un chulito para aceptar y una `X` para abrir un menú con `Mover a otra ruta`, `Dejar pendiente` y `Rechazar solicitud`. Mantener tooltip/aria-label y el motivo obligatorio en las dos opciones de decisión final.

### 2026-08-05 - Preferencia UI: reservas pendientes dentro de Plantillas

**No repetir:** mostrar las reservas de vendedores como un panel de aprobación separado dentro del listado general de tareas.

**Motivo:** una reserva no es todavía una tarea asignada ni una ruta real; revisarla lejos del listado de rutas oculta el paso en el que Logística crea el recorrido.

**Preferir:** agrupar las reservas por ruta semanal y fecha al inicio de `Rutas > Plantillas`, mostrando paradas y cajas totales con una sola acción `Crear ruta` o `Agregar a ruta abierta`. Al crearla, la ruta concreta queda `En preparación` para revisar, agregar, quitar o reordenar cajas. Desde Tareas, el clic derecho sobre una tarea con reserva pendiente puede ofrecer la misma acción (`Crear ruta` / `Agregar a ruta abierta`) sin reintroducir un panel de aprobación en el board.

### 2026-08-05 - Preferencia UI: no mezclar evidencia física con aprobación logística

**No repetir:** mostrar `Invoice por confirmar`, `Invoice confirmado` o `Invoice no visible` como badges en las tarjetas o filas de Tareas de Logística.

**Motivo:** esos estados describen si el invoice está escrito y visible físicamente en las cajas, no si Logística aceptó la solicitud para una fecha.

**Preferir:** representar la aceptación mediante la reserva incluida en una ruta `En preparación` y su posterior estado `Cerrada`. Mantener los incidentes de invoice físico en el flujo del conductor y en la trazabilidad correspondiente.

### 2026-08-05 - Preferencia UI: navegación y vistas de Rutas en una sola fila

**No repetir:** colocar la navegación principal de Logística en una fila y `Operativas` / `Configuración` en otra fila separada.

**Motivo:** consume espacio vertical y hace parecer que son dos navegaciones distintas.

**Preferir:** mostrar `Tareas`, `Conductores`, `Vehículos`, `Rutas` y las tres vistas internas de Rutas en una sola barra horizontal compacta.

### 2026-08-05 - Preferencia UI: orden de navegación en Rutas

> Histórico — actualizado el 2026-08-05. La fuente vigente es `nav de Logística siempre a la izquierda`.

**No repetir:** colocar la navegación principal a la derecha en Rutas (ni en el resto de Logística).

**Motivo:** el módulo debe conservar las pestañas a la izquierda al cambiar de sección.

**Preferir:** `Tareas / Conductores / Vehículos / Rutas` a la izquierda; `Plantillas / Operativas / Configuración` a continuación en la misma fila.

### 2026-08-05 - Preferencia UI: no reservar detalle vacío de Rutas

**No repetir:** mantener una columna lateral vacía con el mensaje `Selecciona una ruta para ver sus cajas, paradas y asignación` mientras no exista una ruta seleccionada.

**Motivo:** divide el listado a la mitad y reduce innecesariamente el espacio disponible para comparar rutas.

**Preferir:** cuando no haya selección, usar todo el ancho para el listado; mostrar el detalle lateral únicamente después de seleccionar una ruta.

### 2026-08-05 - Preferencia UI: mensajes concretos en acciones de tareas

**No repetir:** mostrar mensajes ambiguos como `Esta tarea ya está asignada o no está disponible` sin indicar cuál condición se cumple.

**Motivo:** Logística no puede saber si debe buscar otra tarea, revisar una ruta existente o corregir un estado.

**Preferir:** explicar la causa exacta, por ejemplo `Esta tarea ya está asignada a la ruta Miami — jueves`, `Esta tarea ya fue completada` o `Esta tarea fue cancelada`.

### 2026-08-05 - Preferencia UI: Seguimiento no dice Asignar ruta

**No repetir:** llamar `Asignar ruta` al botón principal del programador de Seguimiento, ni mostrar el toast `Ruta asignada` cuando solo se crea una reserva pendiente.

**Motivo:** en Seguimiento/Ventas la caja queda reservada para Logística; no entra en una ruta operativa hasta que Logística confirme (`Crear ruta` / `Agregar a ruta abierta`).

**Preferir:** botón `Enviar a logística` (o `Guardar cambios` si ya hay programación) y toast `Enviado a logística para aprobar la ruta`.

### 2026-08-05 - Preferencia UI: cinco pasos de venta visibles en celular

**No repetir:** usar anchos fijos o desplazamiento horizontal en la barra móvil de venta cuando eso deja pasos fuera de la pantalla.

**Motivo:** mostrar solo tres de los cinco pasos obliga a desplazar la barra lateralmente y oculta el avance completo del flujo.

**Preferir:** distribuir `Remite`, `Destino`, `Caja`, `Logística` y `Final` en cinco columnas iguales dentro del ancho disponible, con indicador y nombre corto legibles y sin scroll horizontal.

### 2026-08-05 - Preferencia UI: Estadísticas como una sola superficie analítica

**No repetir:** mosaicos de tarjetas KPI anidadas, pestañas separadas de vendedores/distribuidores, tablas anchas obligatorias en celular ni gráficos sin valores accesibles.

**Motivo:** la jerarquía repetida fragmenta el contexto, duplica indicadores y dificulta relacionar tendencia, operación y detalle al cambiar periodo o filtros.

**Preferir:** una barra operativa compacta dentro de una única superficie continua, KPIs en una franja con divisores, gráficos acompañados de resumen textual y tablas semánticas que se conviertan en filas compactas en móvil. Mantener visibles los datos anteriores durante una actualización y usar color solo junto con texto o iconografía de estado.
### 2026-08-05 - Preferencia UI: superficie analítica sin hueco lateral

**No repetir:** centrar la superficie principal de Estadísticas con márgenes automáticos (`mx-auto`) ni limitar el ancho con `max-w-[1600px]` (u otro tope) dentro del shell cuando eso deja una franja vacía entre el contenido y el borde derecho.

**Motivo:** el hueco se percibe como espacio roto y separa visualmente el panel de trabajo de su navegación.

**Preferir:** estirar la superficie al 100% del ancho disponible del contenedor flex (`w-full min-w-0 self-stretch`), sin `max-w-*` ni márgenes laterales automáticos que dejen franja vacía a la derecha.

### 2026-08-09 - Preferencia UI: Estadísticas como escaparate comercial legible

**No repetir:** gráficos estirados o borrosos, líneas de tiempo sin escala vertical, fechas técnicas en formato `AAAA-MM-DD` ni comparaciones que dependan únicamente del color o de pasar el cursor.

**Motivo:** Estadísticas es una pantalla principal para demostrar el valor de Boxario; un cliente debe entender cantidades, unidades, periodos y variaciones de inmediato, sin conocer la implementación ni adivinar los ejes.

**Preferir:** gráficos vectoriales nítidos y proporcionales, eje vertical con valores y unidad, fechas localizadas, periodos actual/anterior explícitos, resumen numérico permanente, variación y pico del periodo. En pantallas amplias, aprovechar el ancho para presentar la franja ejecutiva de KPIs sin dejar celdas desbalanceadas.

### 2026-08-09 - Preferencia UI: Estadísticas separa compañía y logística

**No repetir:** mezclar indicadores económicos y de ejecución de rutas en una secuencia larga sin una separación principal, ni crear dashboards independientes con periodos y filtros que puedan quedar desalineados.

**Motivo:** ventas, cartera y comportamiento comercial responden preguntas distintas a cajas entregadas o recogidas, ZIP, rutas, flota y conductores; verlos juntos dificulta encontrar el dato operativo del día.

**Preferir:** dos pestañas compactas dentro de la misma superficie continua: `Compañía` para ventas y economía, y `Logística` para resultados completados. Ambas comparten toolbar, periodo, filtros, actualización y URL. Logística abre con una franja de entregas/recolecciones, líderes legibles y un desglose diario responsivo; los datos faltantes se comunican como cobertura y nunca como ceros estimados.

### 2026-08-09 - Preferencia UI: Estadísticas sin título permanente

**No repetir:** encabezados introductorios altos con el nombre `Estadísticas` encima de pestañas y controles que ya identifican la pantalla.

**Motivo:** consumen altura, duplican contexto y separan artificialmente la navegación de periodo, filtros y acciones.

**Preferir:** una sola barra operativa compacta: `Compañía` y `Logística` al inicio, rango y última actualización como metadatos secundarios, y periodo, filtros, actualizar, CSV e imprimir agrupados por prioridad. En móvil puede envolver en filas deliberadas sin recuperar el título de página.

### 2026-08-09 - Preferencia UI: Riesgos como sección principal de Estadísticas

**No repetir:** insertar `Riesgos con evidencia y siguiente acción` entre los resultados económicos de Compañía como si fuera otro bloque financiero.

**Motivo:** las alertas requieren revisión y una siguiente acción; mezclarlas con ventas, cobros y rankings dificulta encontrarlas y diluye la lectura económica.

**Preferir:** una pestaña principal `Riesgos` junto a `Compañía` y `Logística`, con contador de alertas verificadas. La pestaña reúne atención requerida y calidad/cobertura de datos; Compañía conserva resultados económicos y Logística conserva ejecución operativa. Las tres comparten periodo, filtros, actualización y URL, y permanecen visibles en una sola fila compacta en móvil.

### 2026-08-05 - Preferencia UI: toolbar de Tareas con jerarquía y sin controles comprimidos

**No repetir:** forzar navegación, Activas/Historial, búsqueda, día, ruta, fecha, tipo y filtros dentro de una fila improvisada que termina envolviéndose sin jerarquía; ni comprimir la ruta hasta cortar su nombre; ni usar un botón `×` aislado para volver a todos los días.

**Motivo:** los controles compiten por ancho, la ruta seleccionada deja de ser legible y el salto de línea parece accidental. La acción del `×` tampoco explica qué filtro elimina.

**Preferir:** dentro de la misma superficie de toolbar, mantener navegación, alcance, Activas/Historial, búsqueda y el botón de filtros en la línea principal. Usar una segunda línea deliberada para `Programación`: día, fecha, ruta con ancho flexible y tipo de tarea. Mostrar `Todos los días` como acción explícita. Los filtros adicionales abren un panel compacto de dos columnas hacia el interior de la pantalla; en móvil permanecen únicamente búsqueda y filtros como controles permanentes.

### 2026-08-07 - Preferencia UI: estado de Configuración uniforme

**No repetir:** cambiar el color de selección entre Conductores, Vehículos y Calendario y subrutas.

**Motivo:** el usuario necesita una única regla visual para identificar la página actual.

**Preferir:** en las tres secciones de Configuración, resaltar tanto el botón de Configuración como el destino actual del menú; fuera de Configuración, ninguno de esos destinos se resalta.

### 2026-08-07 - Preferencia UI: resaltado de la página actual

**No repetir:** resaltar Calendario y subrutas cuando la persona se encuentra en Conductores o Vehículos.

**Motivo:** el color de selección debe confirmar dónde está la persona, no indicar una categoría genérica.

**Preferir:** resaltar exclusivamente el destino actual dentro del menú de Configuración.

### 2026-08-07 - Preferencia UI: subpáginas de Configuración coherentes

**No repetir:** mostrar la navegación antigua `Tareas / Rutas` dentro de Conductores o Vehículos después de mover la operación a la nueva pantalla de Logística.

**Motivo:** parece que se cambió de módulo y reintroduce filtros o secciones que no aplican a la gestión de flota.

**Preferir:** una barra compacta con el nombre de la sección, búsqueda y acción principal; mantener únicamente el botón Configuración para navegar entre Conductores, Vehículos y Calendario y subrutas.

### 2026-08-07 - Preferencia UI: Logística compacta por estado

**No repetir:** una barra con filtros, calendario, etiquetas y avisos persistentes que cambie lo visible sin explicar por qué.

**Motivo:** separa el trabajo de su estado operativo y puede hacer parecer que se perdió un invoice.

**Preferir:** cuatro secciones directas (`Por confirmar`, `Plantillas`, `Rutas operativas`, `Historial`), filas compactas con solo los datos necesarios para decidir y Configuración en el extremo derecho. Reservar avisos para problemas reales: datos incompletos, ZIP sin cobertura, capacidad agotada o fecha no disponible.

### 2026-08-07 - Rutas unifica configuracion, preparacion y operacion

**Contexto:** Separar `Plantillas` y `Rutas operativas` obligaba a cambiar de pantalla para seguir una misma ruta semanal, aunque el operador necesitaba ver sus dias, subrutas, cajas y conductor en un solo lugar.

**Decision:** La experiencia visible sera una sola pagina de `Rutas`. Las rutas activas del calendario aparecen como filas expandibles; dentro de cada fila se muestran sus subrutas y, cuando existe una fecha de trabajo, sus cajas y estado (`Configurada`, `Por preparar`, `En preparacion` u `Operativa`). La asignacion de conductor se ofrece en la instancia operativa correspondiente, no en la definicion semanal vacia.

**Resultado:** El operador puede localizar y abrir la ruta del domingo desde una unica superficie sin confundir disponibilidad semanal con un recorrido concreto listo para conducir.

### 2026-08-06 - Preferencia UI: rutas estables y plantillas operativas

**No repetir:** Llamar “Plantillas” a la pantalla que activa días y administra rutas/subrutas, ni mostrar una tarjeta de plantilla sin direcciones, tipo de parada, cajas y acciones.

**Motivo:** Confunde la configuración recurrente con la preparación temporal de un recorrido y no permite tomar decisiones logísticas informadas.

**Preferir:** En Configuración, mostrar días maestros y rutas geográficas con color, cobertura, chips ZIP y varios horarios. En Rutas → Plantillas, usar grupos expandibles completos, estado de aprobación por solicitud, conteo separado de cajas vacías para entregar y llenas para recoger, chulito de aprobación y X con las disposiciones. Mostrar buscador ZIP, cruces permitidos y mapa como apoyo, sin bloquear la lista si el mapa falla.
### 2026-08-07 - Preferencia UI: etiquetas completas del progreso en movil

**No repetir:** truncar las etiquetas de los pasos de un envio en tarjetas moviles con puntos suspensivos, por ejemplo `Entrega pe...`.

**Motivo:** el usuario necesita leer el estado completo sin adivinarlo ni abrir el detalle.

**Preferir:** permitir que las etiquetas se ajusten en dos o mas lineas en pantallas pequenas; conservar el formato compacto de una linea en pantallas mayores.
### 2026-08-07 - Preferencia UI: jerarquia clara en menu movil

**No repetir:** presentar los encabezados de grupo y las paginas hijas como tarjetas consecutivas con el mismo tratamiento visual.

**Motivo:** en el telefono no se distingue si `Operacion` es una pagina o el contenedor de `Logistica`, `Tareas conductor` e `Inventario camion`.

**Preferir:** dar al encabezado de grupo un fondo y borde propios; mostrar sus paginas indentadas con una guia lateral para comunicar la relacion padre-hijo.

### 2026-08-08 - Preferencia UI: contraste AA en todas las superficies

**No repetir:** usar texto gris tenue, opacidad en contenedores informativos o bordes negros como única señal visual en filas, tarjetas, tablas, formularios, navegación, modales y drawers.

**Motivo:** esos tonos pierden legibilidad en el tema oscuro y fallan especialmente cuando una persona elige un fondo claro para sus filas o tarjetas.

**Preferir:** conservar el fondo elegido y calcular en runtime el foreground principal, secundario, hover y los bordes con WCAG AA. Los estados deben incluir texto, iconos, etiquetas o estructura además del color; solo los controles realmente deshabilitados pueden atenuarse.

### 2026-08-08 - Preferencia UI: bordes oscuros en contenedores

**No repetir:** convertir los bordes de paneles, tablas, filas y navegación en gris claro casi blanco como consecuencia de una auditoría de contraste.

**Motivo:** rompe la estética oscura y agrega una línea visual demasiado dominante en toda la interfaz.

**Preferir:** mantener los bordes de contenedor en negro u otro tono oscuro como antes; reservar los indicadores claros para focus y estados interactivos explícitos.

### 2026-08-08 - Preferencia UI: Por confirmar separado por día

**Decisión:** en la pestaña `Por confirmar`, conservar el selector semanal y mostrar debajo los siete días de la semana con el conteo de solicitudes pendientes por día.

**Resultado:** el día con solicitudes se abre seleccionado por defecto, pero cualquier día puede elegirse para revisar explícitamente su estado vacío o sus solicitudes pendientes.

### 2026-08-09 - Preferencia UI: ocultar días vacíos en Por confirmar

**No repetir:** mostrar pestañas de días con conteo `0` dentro de `Por confirmar`.

**Motivo:** ocupan espacio y no representan trabajo pendiente para el operador.

**Preferir:** mostrar únicamente los días con solicitudes; si cambia la semana o se vacía el día seleccionado, seleccionar automáticamente el primer día que conserve solicitudes.

### 2026-08-09 - Preferencia UI: confirmación identifica invoice y plantilla

**No repetir:** mostrar `Solicitud aceptada` o un código de invoice sin contexto en el aviso de éxito de Logística.

**Motivo:** el operador necesita saber inmediatamente qué invoice se procesó y a qué plantilla fue enviado.

**Preferir:** usar el mensaje `Invoice [código] enviado a plantilla [nombre]`, tanto en confirmaciones individuales como masivas.

### 2026-08-09 - Preferencia UI: ruta configurada sin cajas

**No repetir:** mostrar únicamente `Configurada` cuando una ruta semanal todavía no tiene cajas asignadas.

**Motivo:** puede confundirse con una ruta ya preparada para operar.

**Preferir:** mostrar `Sin cajas asignadas aún` hasta que exista una solicitud confirmada o una ruta operativa.

### 2026-08-09 - Preferencia UI: seleccionar día separado de activación

**No repetir:** hacer que tocar el nombre del día active o desactive su disponibilidad.

**Motivo:** la persona necesita revisar o preparar un día sin cambiar por accidente el calendario operativo.

**Preferir:** tocar el nombre selecciona el día; activar o desactivar se realiza mediante un switch independiente y explícito.

### 2026-08-09 - Preferencia UI: días maestros como filtro de rutas

**Decisión:** el día seleccionado en `Días maestros` filtra la lista de rutas geográficas, sus horarios activos, la búsqueda por ZIP y el mapa.

**Resultado:** al seleccionar `Lunes`, la persona ve únicamente las rutas y horarios que operan el lunes; cambiar la selección actualiza esa misma superficie sin modificar la disponibilidad del día.

### 2026-08-09 - Preferencia UI: Excel para remitentes y destinatarios

**Decisión:** las listas de remitentes y destinatarios también deben ofrecer filas, tarjetas y tabla tipo Excel desde el selector compartido de vista.

**Resultado:** Excel conserva la selección y las acciones de la venta, y organiza identidad, contacto, dirección y actividad en columnas con desplazamiento horizontal.

### 2026-08-09 - Preferencia UI: modo de vista global

**No repetir:** guardar filas, tarjetas o Excel de forma independiente por página, obligando a configurar el mismo modo varias veces.

**Motivo:** el selector representa una preferencia visual de la aplicación completa; cambiarlo en una pantalla debe mantener la misma intención al navegar a otra.

**Preferir:** un único modo global para todas las superficies compatibles. Las páginas que todavía no ofrecen tabla tipo Excel muestran filas como fallback legible sin alterar el fondo ni la preferencia global de las superficies que sí soportan Excel.

### 2026-08-09 - Preferencia UI: flecha fija para controles colapsables

**No repetir:** usar un icono de ajustes al cerrar y una `X` en otro extremo para abrir/cerrar el menú de vista y apariencia.

**Motivo:** el control parece cambiar de función y se mueve de lugar al abrirse, lo que dificulta encontrar cómo volver a cerrarlo.

**Preferir:** mantener una única flecha en el mismo sitio; mostrar `>` cuando el menú está cerrado y `<` cuando está abierto.

### 2026-08-09 - Preferencia UI: grupos de Plantillas contraídos

**Contexto:** `Solicitudes listas para preparar` puede contener varias rutas fechadas y mostrar cada parada de todas ellas al entrar hace la superficie demasiado larga.

**Decisión:** presentar cada ruta preparada como un grupo expandible. Al entrar en `Rutas`, los grupos empiezan contraídos y dejan visible el nombre, la fecha, los conteos y la acción principal; el detalle de las solicitudes se abre bajo demanda.

**Resultado:** la página permite ubicar rápidamente el grupo correcto y consultar sus paradas sin perder el contexto de la ruta.

### 2026-08-09 - Preferencia UI: separar preparación de rutas reales

**No repetir:** mezclar la tarjeta de una ruta semanal configurada, grupos de solicitudes pendientes y rutas reales dentro de la misma pestaña operativa.

**Motivo:** nombres parecidos como `Ruta del lunes` parecen información duplicada y no permiten saber si las cajas ya forman parte de un recorrido real.

**Preferir:** navegación `Por confirmar → Preparación → Rutas → Historial`; `Preparación` usa grupos contraídos con resumen, estado y acción, mientras `Rutas` muestra únicamente recorridos reales con fecha y estado.

### 2026-08-09 - Preferencia UI: selección dentro de grupos de Preparación

**Decisión:** cada grupo ofrece `Todas` aun estando contraído; al expandirlo, cada solicitud se selecciona mediante checkbox o tocando su fila. El resumen muestra cuántas están seleccionadas y el botón incluye esa cantidad.

**Resultado:** seleccionar una parte o el grupo completo requiere pocos gestos y la persona ve exactamente cuántas solicitudes afectará la acción.

### 2026-08-09 - Preferencia UI: ocultar días vacíos en Preparación

**No repetir:** mostrar en `Preparación` días del calendario configurado que no contienen solicitudes esperando crear o actualizar una ruta durante la semana visible.

**Motivo:** esos controles parecen filtros con contenido y conducen únicamente a estados vacíos.

**Preferir:** calcular los días desde los grupos `template_confirmed` de la semana y mostrar solo aquellos que contienen trabajo; al vaciarse el día seleccionado, elegir automáticamente el siguiente día disponible.

### 2026-08-09 - Preferencia UI: ocultar días vacíos en Rutas

**No repetir:** mostrar en `Rutas` días configurados o con reservas que todavía no tienen un recorrido real durante la semana visible.

**Motivo:** el filtro conduce a una vista vacía y hace parecer que existe una ruta para ese día.

**Preferir:** construir los filtros desde rutas reales `draft`, `planned` o `in_progress` de la semana; si no existe ninguna, ocultar todos los días y comunicar el estado vacío semanal.

### 2026-08-09 - Preferencia UI global: filtros de día con contenido

**No repetir:** construir filtros operativos de día únicamente desde el calendario configurado, mostrando opciones que conducen a listas vacías.

**Motivo:** un filtro visible promete contenido y obliga a comprobar días que no tienen trabajo.

**Preferir:** en tableros, listas y pestañas operativas, ofrecer solo días presentes en los datos de la vista o periodo correspondiente y elegir automáticamente el siguiente disponible. Esta regla no aplica a calendarios de configuración ni a formularios de programación, donde los días disponibles son opciones de entrada y deben permanecer visibles aunque todavía no tengan trabajo.

### 2026-08-09 - Preferencia UI: una sola experiencia para la ruta del conductor

**No repetir:** presentar `Tareas conductor` e `Inventario camión` como dos destinos principales equivalentes, ni colocar ambas interfaces completas una debajo de la otra en una página interminable.

**Motivo:** el conductor realiza un único recorrido y necesita entender primero qué ruta le corresponde, cuántas paradas contiene, cuántas son entregas o recolecciones y qué carga debe preparar. Separar esos datos obliga a reconstruir el contexto; mezclarlos todos simultáneamente vuelve la pantalla densa y aumenta el riesgo de tocar una acción de inventario por accidente.

**Preferir:** una sola página operativa `Mi ruta`, sobre una superficie principal con divisores, y vistas internas por etapa: `Preparar carga`, `Paradas` y `Camión / Regreso`. La cabecera operativa compacta mantiene visibles ruta, vehículo, estado, total de paradas, entregas, recolecciones, cajas requeridas, faltantes y cajas recogidas. Al entrar, la vista prioritaria depende del estado real: carga para una ruta cerrada, paradas para una ruta en curso y regreso cuando terminaron las visitas.

En `Paradas`, cada fila o tarjeta identifica claramente entrega o recolección, cliente, dirección, cantidad/tipo de cajas y saldo pendiente. El detalle de resultado reúne evidencia, motivo cuando falló y cobro cuando corresponda, sin crear tarjetas anidadas para cada dato. En móvil se priorizan el nombre de la parada, el tipo y la siguiente acción; la información secundaria se abre bajo demanda.

### 2026-08-09 - Preferencia UI: separar entrega realizada de dinero recibido

**No repetir:** presentar `Entregada` como sinónimo de `Depósito cobrado`, ni obligar a marcar una entrega como fallida únicamente porque el cliente no estaba para pagar.

**Motivo:** el conductor puede dejar físicamente la caja con evidencia y, al mismo tiempo, conservar un cobro pendiente. Mezclar ambos resultados oculta lo sucedido y dificulta cobrar después.

**Preferir:** dentro del resultado de la parada, mostrar dos bloques consecutivos en la misma superficie: `Resultado de la visita` y `Cobro`. Después de confirmar que la caja fue entregada o recogida, el cobro ofrece `Recibí el importe esperado`, `Recibí otro monto` y `No recibí dinero`. Esta última opción revela una razón o nota obligatoria y muestra claramente `El saldo seguirá pendiente`; nunca debe cambiar el estado físico de la parada.

### 2026-08-09 - Preferencia UI: la ruta unificada debe sentirse reconstruida

**No repetir:** conservar la barra horizontal de controles de la antigua página de tareas y limitar la unificación a agregar tres pestañas pequeñas en una esquina.

**Motivo:** en escritorio la pantalla sigue pareciendo la plantilla anterior, los pasos operativos pierden jerarquía y el estado sin conductor deja un vacío grande sin explicar cómo comenzar.

**Preferir:** separar claramente la selección y el resumen de ruta de un navegador de etapas visible. En escritorio, mostrar `Preparar carga`, `Paradas` y `Camión / regreso` como una columna operativa; en móvil, conservarlos como tres pasos horizontales. Cuando no existe conductor activo, sustituir todos los filtros de tareas por un estado inicial que indique la acción necesaria.

### 2026-08-09 - Preferencia UI: ruta del conductor diseñada primero para celular

**No repetir:** comprimir en el teléfono la barra completa de filtros, contadores y excepciones de escritorio, especialmente cuando el conductor todavía no tiene una ruta asignada.

**Motivo:** el conductor manejará esta pantalla principalmente desde el celular y necesita reconocer la siguiente acción con una mirada, sin interpretar controles que aún no aplican.

**Preferir:** si no hay ruta, mostrar únicamente el estado de asignación y una acción para actualizar. Con una ruta activa, usar botones táctiles de al menos 44 px, mantener `En ruta / Resueltas` y `Por dejar / Por recoger` en filas estables, ocultar resúmenes secundarios en móvil y priorizar la carga o la siguiente parada según el estado operativo.
### 2026-08-10 - Rango personalizado en la barra de operación de Rutas

**Contexto:** El encabezado `Semana de operación` permitía recorrer semanas con Anterior/Siguiente, pero no comunicaba que la fecha pudiera abrirse ni permitía consultar un intervalo elegido por la persona.

**Decisión:** El icono y el texto del periodo forman un único control compacto que abre el calendario compartido. En el mismo calendario se elige primero la fecha inicial y después la final; el intervalo completo queda resaltado antes de aplicarlo, sin agregar un encabezado permanente de página. Al aplicar un intervalo distinto de la semana estándar, la barra lo identifica como `Rango de operación` y conserva visibles Anterior, Hoy y Siguiente.

**Resultado:** La selección personalizada queda disponible desde la misma franja operativa, sin añadir otra superficie ni separar los controles de día.

### 2026-08-10 - Preferencia UI: ruta vacía sin selector deshabilitado

**No repetir:** mostrar `Sin ruta asignada` dentro de un `select` deshabilitado y anidado en otra caja con borde.

**Motivo:** el borde interior duplica la superficie y la flecha sugiere que existen opciones aunque todavía no haya rutas disponibles.

**Preferir:** cuando no haya rutas, mostrar una sola fila de estado con icono y sin flecha. Cuando existan rutas, conservar una única superficie, con el campo transparente y una flecha homologada.

### 2026-08-12 - Preferencia UI: expediente compacto y escaneable

**No repetir:** extender la línea de tiempo verticalmente, separar en filas distintas los importes del resumen ni colocar acciones de ubicación lejos de la dirección a la que pertenecen.

**Motivo:** el expediente es una vista de consulta; el usuario necesita reconocer estado, dinero, recorrido y participantes sin desplazarse ni reconstruir relaciones entre datos alejados.

**Preferir:** una cabecera compacta con estados e importes en una sola franja, recorrido horizontal y datos de remitente/destinatario en dos columnas. La acción de mapa debe vivir dentro de la dirección y las notas de procedencia inmediatamente debajo del nombre.

### 2026-08-12 - Preferencia UI: cabecera del expediente solo en Resumen

**No repetir:** mantener fija o repetir la cabecera extensa con identidad, estado e importes al navegar por `Documentos` y `Registro`.

**Motivo:** esas pestañas tienen su propio contexto y necesitan aprovechar el alto disponible; la cabecera completa desplaza el contenido principal sin aportar información necesaria para la tarea actual.

**Preferir:** mostrar la cabecera completa únicamente en `Resumen`. En las demás pestañas conservar solo el navegador compacto del expediente y comenzar inmediatamente con el contenido de la sección.

### 2026-08-12 - Preferencia UI: el seguimiento encabeza el expediente

**No repetir:** usar como cabecera una ficha administrativa grande y dejar el recorrido como una sección independiente debajo; tampoco distribuir todos los datos e importes en una sola fila de ocho columnas.

**Motivo:** la función principal del expediente es comunicar el avance del envío. La cabecera anterior daba más jerarquía al número y a los importes, mientras el seguimiento parecía contenido secundario y el resto de la vista carecía de agrupaciones claras.

**Preferir:** en `Resumen`, integrar número, estado, acciones y recorrido horizontal dentro de una cabecera titulada `Seguimiento`. Debajo, separar `Operación` de `Estado de cuenta` mediante divisores y reunir remitente y destinatario bajo `Contactos y direcciones`, sin tarjetas anidadas.
### 2026-08-13 - Alta de personas con ventana flotante de ubicación

**Contexto:** El alta y edición de remitentes y destinatarios debe facilitar que el vendedor ubique la casa junto con el cliente sin mezclar esa tarea con la captura de datos.

**Decisión:** Mantener los datos en la superficie principal y abrir la ubicación mediante `Abrir mapa`. El mapa aparece como una ventana flotante independiente que puede arrastrarse desde su barra superior. Incluye buscador propio, sugerencias de dirección, botón para abrir/cerrar un teclado en pantalla, `Mapa`, `Satélite`, `A nivel de calle`, pin editable y nota opcional para el conductor. Al abrirse, el buscador se precarga con todos los componentes de dirección que ya estén escritos —incluidos unidad, colonia, ciudad, estado, código postal y país— y lanza sus sugerencias para que el cliente pueda revisarlos o corregirlos.

**Resultado:** El vendedor conserva visibles los datos mientras trabaja la ubicación junto con el cliente y puede mover la herramienta para comparar ambos contextos.
### 2026-08-13 - Preferencia UI: el flujo de ubicación debe ser visible desde el primer paso

**No repetir:** conservar el formulario anterior casi intacto y mostrar el nuevo enfoque únicamente después de validar la dirección.

**Motivo:** la pantalla inicial parece no haber cambiado y no comunica que existe un segundo paso dedicado a confirmar la entrada exacta.

**Preferir:** mostrar desde el inicio la acción `Abrir mapa`, usar una sola superficie dividida en `Quién envía/recibe` y `Dónde recoger/entregar`, y permitir abrir la herramienta aunque la dirección todavía no esté completa para terminarla desde su buscador.
### 2026-08-13 - Preferencia UI: formulario sin encabezado de pasos interno

**No repetir:** agregar dentro del formulario los bloques `Nuevo remitente · Paso 1 de 2`, `Datos y dirección`, `1 Datos y dirección` y `2 Abrir mapa`.

**Motivo:** repiten la navegación general de Venta, consumen altura y hacen parecer que el mapa es un paso obligatorio cuando se abre como herramienta flotante opcional.

**Preferir:** conservar únicamente las acciones compactas `Cancelar`, `Crear/Guardar` y el botón `Abrir mapa` junto a la sección de dirección. Dentro de la ventana, indicar de forma visible el país al que está limitada la búsqueda.
### 2026-08-13 - Preferencia UI: mapa en ventana real y un solo pin editable

**No repetir:** mostrar el mapa como panel, modal o ventana flotante limitada al área de la página; tampoco superponer un pin de dirección y otro de entrada ni conservar un botón `Restablecer pin`.

**Motivo:** un elemento HTML dentro de Chrome no puede trasladarse a un segundo monitor como ventana independiente y dos marcadores superpuestos hacen ambiguo cuál puede mover el cliente.

**Preferir:** `Abrir mapa` crea una ventana emergente real y redimensionable del navegador, que se mueve con la barra nativa al monitor deseado. El mapa presenta un único pin rojo, directamente arrastrable, acompañado por una instrucción breve. La búsqueda, las vistas, el teclado en pantalla y la nota del conductor permanecen dentro de esa ventana.

### 2026-08-13 - Preferencia UI: dirección separada por campos en el mapa

**No repetir:** mostrar la dirección inicial únicamente como una cadena concatenada dentro del buscador del mapa.

**Motivo:** el cliente debe poder revisar y corregir cada componente de la dirección con el mismo lenguaje del formulario principal.

**Preferir:** mostrar `Calle`, `Unidad`, `Colonia`, `Ciudad`, `Estado`, `Código postal` y `País` como campos separados dentro de la ventana del mapa. Las sugerencias se generan con esos campos y el país queda visible como contexto fijo.

### 2026-08-13 - Preferencia UI: lenguaje dirigido al cliente

**No repetir:** etiquetar la acción como `Abrir mapa` en la pantalla que se entrega al cliente o mostrar una confirmación interna como `Usar esta entrada`.

**Motivo:** el cliente debe entender que está revisando y confirmando su propia ubicación, no abriendo una herramienta operativa del vendedor.

**Preferir:** usar `Cliente verifica mapa` en el formulario y `Confirmar ubicación` dentro de la ventana.

### 2026-08-13 - Preferencia UI: sin contorno exterior claro

**No repetir:** dibujar un marco blanco o gris claro alrededor del panel lateral y la superficie principal de la aplicación.

**Motivo:** el contorno reapareció en Logística y en la navegación porque una utilidad de color de borde no estaba resolviendo su variable y caía en `currentColor` (blanco); los bordes exteriores no son parte de la jerarquía visual aprobada.

**Preferir:** mantener las superficies principales sin borde exterior; conservar únicamente divisores internos y estados de foco/selección necesarios para orientar la interacción.

### 2026-08-13 - Preferencia UI: perfil como identidad, no como mosaico de tarjetas

**No repetir:** dividir Mi perfil en varias tarjetas independientes con encabezados y cajas anidadas para cada dato de acceso.

**Motivo:** la pantalla se percibe fragmentada, desaprovecha el espacio disponible y no da suficiente jerarquía a la identidad ni al código con el que la persona realiza ventas.

**Preferir:** una sola superficie continua con una cabecera visual de identidad, el código de vendedor inmediatamente debajo del nombre y secciones de información personal, acceso, permisos y seguridad separadas mediante divisores. En móvil, conservar primero foto, nombre, código y rol.

### 2026-08-13 - Preferencia UI: secciones de perfil seleccionables

**Contexto:** el perfil necesita separar con claridad la edición del nombre, el cambio de contraseña y la consulta del acceso de la empresa.

**Decisión:** la cabecera conserva la identidad y el código de vendedor, y debajo ofrece las secciones `Información personal`, `Seguridad` y `Acceso y permisos`. Solo se muestra el contenido de la sección activa, con un estado seleccionado visible y controles accesibles.

**Resultado:** cambiar la contraseña ocurre dentro de `Seguridad`, los datos editables quedan agrupados en `Información personal` y los permisos no compiten visualmente con el formulario.

### 2026-08-13 - Preferencia UI: campos de perfil con el mismo fondo

**No repetir:** mostrar el nombre en un campo azul oscuro y el correo en una superficie verde distinta dentro del mismo formulario.

**Motivo:** parece que los campos tienen estados diferentes aunque el correo solo sea de lectura.

**Preferir:** mantener nombre y correo con el mismo fondo, borde, altura y radio; diferenciar el correo únicamente con texto atenuado y la nota de administración.

### 2026-08-14 - Preferencia UI: variantes de factura en pestañas

**Contexto:** la galería de propuestas mostraba cinco facturas completas una debajo de otra, lo que dificultaba compararlas y obligaba a recorrer una página demasiado larga.

**Decisión:** mostrar una sola variante de factura a la vez dentro de pestañas horizontales con nombre corto, estado seleccionado visible y desplazamiento horizontal en pantallas estrechas.

**Resultado:** el usuario puede cambiar rápidamente entre las cinco propuestas sin perder el contexto de la galería ni confundirlas con la factura productiva.
### 2026-08-14 - Preferencia UI: direccion accionable en tarjetas

**Contexto:** el operador necesita saber que la direccion de una tarjeta puede abrirse en el mapa para ubicar la entrada real.

**Decision:** la direccion de remitentes y destinatarios se presenta como accion de mapa con icono de pin, cursor de precision, subrayado discreto en tablas y foco visible. Usa la misma ventana de entrada exacta del alta.

**Resultado:** la accion se distingue del clic general de seleccion sin agregar una caja permanente ni duplicar el mapa.
### 2026-08-14 - Preferencia UI: cada ruta reencuadra su cobertura

**Contexto:** cambiar de Ruta norte a Ruta sur modificaba el chip activo, pero no siempre llevaba la camara a la cobertura elegida.

**Decision:** al pulsar cualquier chip de ruta, la vista activa debe reencuadrar su propia cobertura; `Todas las rutas` reencuadra el conjunto visible. El estado visual del chip y la camara deben cambiar juntos.

**Resultado:** la persona puede comparar rutas sin tener que arrastrar o buscar manualmente la zona de cada una.
### 2026-08-14 - Preferencia UI: pin editable en cobertura

**Contexto:** la bolita del cliente no comunicaba que la ubicacion podia precisarse.

**Decision:** mostrar un pin nativo rojo y arrastrable para el cliente. Cuando la ubicacion es aproximada, el aviso debe explicar que el pin se puede mover y que `Confirmar pin exacto` lo guarda.

**Resultado:** la vista conserva las coberturas comparables y hace visible la accion de precisar la entrada sin agregar cajas permanentes.

### 2026-08-14 - Preferencia UI: dos acciones en la dirección de recolección

**Contexto:** el botón del mapa de dirección no debe mezclar la confirmación del cliente con la consulta interna de rutas.

**No repetir:** usar una sola acción ambigua para abrir el mapa del cliente y revisar coberturas operativas.

**Preferir:** mostrar dos acciones compactas junto a `Dónde recoger`: `Cliente verifica mapa` para confirmar la entrada exacta y `Ver rutas y coberturas` para abrir el comparador interno. El comparador identifica cada ruta por color y muestra explícitamente el día semanal de recolección.

### 2026-08-17 - Preferencia UI: selector compacto de puntos de acceso

**Contexto:** la lista completa de tags de acceso ocupaba demasiado espacio vertical sobre el mapa, especialmente en móvil.

**Decisión:** mantener una barra compacta con `Puntos`, el tag activo y su estado; mostrar el resto de tags y sus acciones dentro de un desplegable.

**Resultado:** el mapa conserva más superficie visible y el operador puede abrir la lista completa solo cuando necesita cambiar de punto o editar una nota.
