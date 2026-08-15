# Guía de interacción y acciones críticas — Boxario

### 2026-08-15 — Confirmación dentro de la página para descartar subrutas

**No repetir:** usar `window.confirm` del navegador para cerrar, cambiar o reemplazar una subruta con cambios sin guardar.

**Motivo:** el aviso del navegador oculta el contexto de Boxario y no explica qué se perderá.

**Preferir:** mostrar una confirmación modal dentro de la página con el título `Cambios sin guardar`, enumerar los campos modificados y ofrecer `Seguir editando` junto a `Descartar cambios`. Escape y el clic fuera deben conservar el borrador.

**Resultado:** la persona entiende el riesgo y puede decidir sin salir del contexto de la subruta ni descartar cambios por accidente.

### 2026-08-15 — Guardar conserva abierta la subruta

**Contexto:** guardar una subruta limpiaba el borrador y cerraba el grupo, obligando a abrirlo de nuevo para continuar.

**Decisión:** después de una respuesta exitosa, conservar el grupo expandido y el borrador con su nuevo identificador, actualizar la línea base como limpia y mantener la pestaña actual. Solo `Cancelar` o `Cerrar` contraen la subruta.

**Resultado:** el guardado no cambia el contexto ni provoca una nueva edición accidental; los cambios posteriores vuelven a marcarse como pendientes normalmente.

### 2026-08-15 — Centrar el mapa en la ubicación actual

**Contexto:** la vista editable de cobertura no mostraba el control para llevar el mapa a la posición actual del operador.

**Decisión:** mostrar `Mi ubicación` junto a `Seleccionar área`. Al pulsarlo, solicitar la geolocalización del navegador, centrar el mapa y mostrar un error recuperable si el permiso o la lectura fallan. No modifica la cobertura ni el borrador.

**Resultado:** el operador puede regresar rápidamente a su posición sin alterar zonas seleccionadas.

### 2026-08-15 — Sincronización inmediata entre mapa y listado de cobertura

**Contexto:** `Mapa` y `Listado` estaban separados como pestañas, por lo que la selección geográfica no podía verse al mismo tiempo en la lista.

**Decisión:** mostrar ambas superficies juntas y conectarlas al mismo borrador. Cada clic o selección por área en el mapa agrega o quita lugares del borrador y el listado se actualiza inmediatamente; editar o quitar desde el listado actualiza el mapa. Solo `Guardar` persiste el conjunto completo.

**Resultado:** el operador puede seleccionar en el mapa y verificar el resultado en la lista sin cambiar de pestaña, manteniendo la operación reversible antes del guardado.

### 2026-08-15 — Edición de cobertura desde el mapa de la subruta

**Contexto:** el mapa de `Ruta Norte` quedó conectado solo como consulta y dejó de permitir seleccionar zonas como en el flujo anterior.

**Decisión:** en la pestaña `Mapa`, hacer clic en una pieza o seleccionar un área crea una vista previa local. `Agregar zona` confirma esa vista previa al borrador; hacer clic en una zona ya activa la quita del borrador. `Cancelar` descarta la vista previa y `Guardar` persiste el conjunto completo de la subruta.

**Resultado:** cambiar entre `Listado` y `Mapa` conserva el mismo borrador, la selección geográfica vuelve a ser reversible y ninguna interacción del mapa modifica una ruta operativa antes del guardado.

### 2026-08-15 — Ocultar límites de capacidad en horarios de subruta

**Contexto:** la edición de horarios de una subruta mostraba controles para máximas paradas y máximas cajas, aunque esta pantalla ya no debe ofrecer esa configuración.

**Decisión:** quitar ambos controles del borrador visual. Al guardar otros cambios, conservar los valores de capacidad que ya estén persistidos y no enviar un borrado implícito. Las validaciones operativas del servidor y las pantallas que todavía administran capacidad permanecen sin cambios.

**Resultado:** eliminar la opción es reversible desde la interfaz y no modifica reservas, rutas operativas ni límites existentes por accidente.

### 2026-08-15 — Cobertura de subruta con listado y mapa

**Contexto:** la edición de una subruta mezclaba la identidad con una pestaña `Datos` y dejaba la cobertura en una sola vista de lista.

**Decisión:** pulsar la cabecera abre la subruta con las pestañas `Horarios` y `Cobertura`. La pestaña `Cobertura` ofrece `Listado` y `Mapa`; cambiar entre ellas solo cambia la vista y conserva el mismo borrador local. Agregar, desglosar o quitar lugares continúa ocurriendo sobre el borrador del listado y solo `Guardar` persiste los cambios.

**Resultado:** consultar el mapa no cambia la cobertura ni la ruta operativa, y cerrar o cancelar conserva la advertencia y el descarte recuperable de cambios sin guardar.

### 2026-08-14 — Edición de cobertura de una subruta

**Contexto:** La cobertura de Ruta Norte se podía consultar, pero no modificar desde el botón `Cobertura`.

**Decisión:** Pulsar `Cobertura` abre la pestaña `Cobertura` del editor de esa subruta. Buscar y seleccionar una ciudad o zona actualiza el borrador local; quitar una ciudad completa exige la confirmación existente y desmarcar una zona hija actualiza ese borrador. Solo `Guardar` persiste el conjunto completo de lugares y cambia `coverageMode` según haya o no coberturas seleccionadas. Cancelar o cerrar con cambios descarta el borrador después de advertirlo.

**Resultado:** Agregar, desglosar y quitar zonas es reversible hasta guardar, no modifica rutas operativas ya creadas y conserva la escritura mediante la acción autorizada de la subruta.

### 2026-08-14 — Consulta de cobertura desde la configuración

**Contexto:** La configuración de Logística abre el mapa de una ruta sin tener una dirección de cliente seleccionada.

**Decisión:** Ese acceso conserva una consulta reversible de la cobertura configurada, sin botón `Ir a dirección del cliente` ni mensajes de ubicación de cliente. El comparador de direcciones mantiene esas acciones únicamente cuando recibe una ubicación de cliente.

**Resultado:** La configuración permite revisar la cobertura de la ruta sin sugerir que falta seleccionar o geocodificar un cliente.

### 2026-08-14 — Días accionables con el selector cerrado

**Contexto:** La fila de días quedó inicialmente dentro del desplegable y no era visible al abrir el comparador.

**Decisión:** Los siete días permanecen fuera del desplegable y pueden seleccionarse directamente cuando están activos. Pulsarlos cambia la vista de cobertura del mapa; abrir el selector de rutas queda reservado para elegir una ruta concreta.

**Resultado:** La acción principal de cambiar de día no depende de abrir otro control y los días inactivos siguen sin aceptar clic.

### 2026-08-14 — Consulta de cobertura por día activo

**Contexto:** El comparador debía reflejar que Logística opera con una configuración semanal de lunes a domingo.

**Decisión:** Cada día activo del catálogo puede seleccionarse para mostrar sus coberturas en el mapa y filtrar sus rutas. Los días inactivos se muestran en gris, no aceptan clic y no alteran la vista. `Todas las rutas` continúa siendo una vista de consulta global; ninguna de estas selecciones cambia la ruta operativa del formulario.

**Resultado:** Cambiar de día o de ruta sigue siendo una consulta reversible, con separación clara entre la vista del mapa y la asignación operativa.

### 2026-08-14 — Desactivar recolección incluida sin borrar configuración

**Contexto:** Desactivar el beneficio no debe obligar a volver a capturar los días y el cargo si se reactiva después.

**Decisión:** El checkbox cambia un borrador local y el botón global `Guardar cambios` persiste la decisión junto con el resto de Cobros. Mientras está apagado, los días quedan bloqueados; guardar conserva sus valores. Si guardar falla, el estado y los valores permanecen en pantalla para reintentar.

**Resultado:** La activación es reversible, no borra datos y usa el mismo guardado recuperable de la pantalla.

### 2026-08-14 - Paso 4 confirma la creación del invoice (decisión revertida)

**Contexto:** El paso de logística llevaba a `Final` con un botón `Siguiente`, aunque la acción real pendiente era crear el invoice. Eso ocultaba el momento en que se consumía el consecutivo.

**Decisión inicial:** Mientras no exista un invoice creado, el botón del paso 4 decía `Crear invoice` y abría la confirmación existente. Esta decisión fue revertida porque saltaba la edición del abono en `Final`.

**Resultado:** La etiqueta refleja la acción real, la confirmación es explícita y se evita el doble envío o la doble numeración.

### 2026-08-14 - Corrección: el abono se edita en Final antes de confirmar

**Contexto:** Mover `Crear invoice` al paso 4 impedía pasar por el editor de abono disponible en el paso 5.

**Decisión:** Se revierte esa parte: el paso 4 conserva `Siguiente` y lleva a `Final`; el paso 5 sigue siendo el lugar donde se edita el abono y se abre la confirmación para crear el invoice.

**Resultado:** La navegación permite ajustar el valor del abono antes de guardar y la confirmación conserva todos los datos revisados.

### 2026-08-14 - Reserva liberable durante la revisión del invoice

**Decisión:** Al entrar a `Final`, el invoice visible queda reservado temporalmente para evitar duplicados entre vendedores. Volver atrás, cancelar, abandonar la venta o recibir un error antes de guardar libera la reserva; guardar el shipment la confirma dentro de la misma transacción. La reserva expirada puede ser tomada por otra venta.

**Resultado:** La revisión del abono no consume definitivamente numeración y tampoco permite que dos ventas activas compartan la misma referencia.

### 2026-08-14 - Selección de ruta separada de la consulta de cobertura

**Decisión:** cuando el formulario ya ofrece un selector de ruta, ese control es la única acción que cambia la ruta operativa. El modal de cobertura recibe la ruta seleccionada, muestra solo su cobertura y no ofrece una segunda selección. `Confirmar pin exacto` continúa guardando únicamente la ubicación del cliente.

**Resultado:** cambiar la ruta y confirmar el pin dejan de parecer una misma operación; la asignación permanece visible y controlada desde el formulario.

### 2026-08-14 - Pin fijo durante la definición de ruta

**Decisión:** en el paso donde se define la ruta, el mapa conserva la ubicación del cliente como referencia no editable. La edición y confirmación de esa ubicación solo están disponibles en el paso de remitente o destinatario correspondiente.

**Resultado:** el paso de ruta no presenta acciones ni mensajes de pin; solo permite consultar la cobertura y reencuadrar la ruta seleccionada.

### 2026-08-14 - Selector de vista para comparar rutas

**Decisión:** el modal de cobertura puede abrir un desplegable y cambiar entre rutas o `Todas las rutas` únicamente para reencuadrar el mapa. Esa selección no modifica `routeTemplateId` ni la ruta operativa del formulario; la asignación continúa en el selector exterior.

**Resultado:** comparar una ruta alternativa es reversible y no produce un cambio de datos accidental.

### 2026-08-14 - Clic de cobertura sincroniza la vista de ruta

**Decisión:** cuando el mapa muestra `Todas las rutas`, hacer clic sobre una cobertura identifica la ruta que contiene esa zona, la muestra como vista activa en el desplegable y reencuadra el mapa. El clic es de consulta y no habilita edición de zonas ni modifica la ruta operativa.

**Resultado:** el operador puede pasar del mapa al nombre de la ruta sin perder el contexto ni confundir la vista con una asignación.

### 2026-08-14 - Separación entre verificación del cliente y notas operativas

**Contexto:** el mapa abierto desde `Cliente verifica mapa` se muestra al cliente, mientras `Ver rutas y coberturas` es una consulta interna del vendedor.

**Decisión:** la ventana del cliente solo permite revisar la dirección, mover el pin y confirmar la ubicación. `Referencias` y `Nota para el conductor` se editan en pestañas del comparador interno de rutas y coberturas. Sus cambios continúan formando parte del estado del formulario y se guardan con la operación correspondiente.

**Resultado:** el cliente no ve ni modifica instrucciones operativas, y el vendedor conserva un lugar único para completar la información que necesita la ruta.

### 2026-08-14 - Acción explícita para abrir el mapa desde una tarjeta

**Contexto:** la tarjeta de una persona también selecciona el contacto para continuar la venta.

**Decisión:** tocar el nombre, teléfono o texto de dirección conserva la selección de la persona. Solo el botón compacto del icono de ubicación abre el mapa y detiene la propagación hacia la tarjeta; `Rápido` mantiene su propio botón bajo el icono de la persona.

**Resultado:** abrir el mapa deja de competir con la acción principal de continuar la venta y se conserva un objetivo táctil claro para cada acción.

### 2026-08-14 - Carga estable del listado de envíos

**Contexto:** Seguimiento recibe un bootstrap del servidor y hace una lectura fresca al montar la pantalla. Cuando el bootstrap estaba vacío, el estado `Sin envíos` se pintaba antes de iniciar esa lectura y parpadeaba entre el vacío y el cargador.

**Decisión:** El listado conserva el bootstrap visible mientras se valida en segundo plano. Si no hay filas iniciales, mantiene el estado de carga hasta resolver la lectura fresca; solo después muestra `Sin envíos` o los resultados. La lectura fresca al montar se conserva para reflejar inmediatamente una venta recién creada.

**Resultado:** La pantalla no alterna entre estados contradictorios durante la carga y sigue mostrando envíos nuevos sin recarga manual.

### 2026-08-14 - Numeración de invoice exige identidad comercial completa

**Decisión:** Antes de reservar un correlativo, Venta valida en el servidor que el usuario tenga código de vendedor y que su empresa matriz tenga código empresarial. Si falta cualquiera, la venta no avanza ni muestra éxito; conserva el formulario y comunica cuál configuración debe corregirse. La asignación del correlativo continúa siendo atómica y bloquea dobles envíos.

**Resultado:** Ningún invoice nuevo se guarda con una referencia incompleta o inventada y un problema de configuración se puede corregir sin perder la venta en curso.

### 2026-08-13 - Venta rápida: regreso de Final a Caja

**Decisión:** abrir el invoice no limpia el remitente, el país ni el carrito de la venta rápida. Si el usuario regresa de `Final` a `Caja`, debe encontrar el mismo catálogo del país, las cantidades seleccionadas y la posibilidad de modificar la compra antes de confirmar.

**Resultado:** la navegación entre los pasos es reversible y no muestra falsamente un inventario vacío por haber perdido el país activo.

### 2026-08-13 - Venta rápida: no duplicar factura ni QR

**Decisión:** el checkout reutiliza las dos pestañas del Final normal: `Factura` y `Etiquetas`. Se eliminan el encabezado informativo, la tarjeta repetida del remitente y el panel QR lateral; el QR de `SaleInvoicePaper` permanece dentro de la pestaña `Factura` y cada etiqueta conserva su QR de caja.

**Resultado:** el usuario revisa y paga sobre el mismo documento que se imprimirá o consultará, sin separar la identificación del invoice de su código de rastreo.

### 2026-08-13 - Venta rápida: scroll único para documentos

**Decisión:** el checkout embebido no crea un segundo contenedor desplazable. El paso `Final` conserva un único scroll para que la barra de pestañas permanezca alineada con el documento visible.

**Resultado:** al desplazarse, `Factura`, `Etiquetas` y su contenido se mueven en la misma superficie y no se separan visualmente.

### 2026-08-13 - Venta rápida: cancelar separado de la navegación

**Decisión:** mientras la venta rápida no esté confirmada, la navegación contextual del encabezado de Boxario funciona como salida para cancelar y volver al flujo completo. No se agrega un botón adicional dentro de Caja, del catálogo ni de la barra de pasos.

**Resultado:** la acción permanece disponible sin ocupar espacio de la navegación ni interferir con la lectura del paso activo.

### 2026-08-13 - Venta rápida: transición Caja → invoice

**Decisión:** La venta rápida conserva la selección de la caja y avanza al invoice completo mediante una acción fija y explícita al pie: `Ver invoice completo`. Durante la asignación del número de invoice, la acción muestra `Abriendo invoice...` y no acepta dobles envíos.

**Resultado:** La transición del paso 3 al paso 5 es visible, reversible antes de confirmar y no depende de que el cliente encuentre el botón después de desplazar la lista.

### 2026-08-13 - Venta rápida: el invoice pertenece al paso Final

**Decisión:** Al completar la selección de Caja, el sistema activa `Final` y renderiza allí el invoice completo. El checkout no se presenta como un modal de pantalla completa; el diálogo queda reservado para confirmar el cobro antes de guardar.

**Resultado:** Cerrar o cancelar antes de confirmar devuelve el flujo de venta rápida de forma reversible y mantiene visible la navegación de pasos.

### 2026-08-13 - Venta rápida: salida reversible al flujo completo

**Contexto:** La venta rápida tenía un segundo modal después del selector de país, aunque el flujo solo necesita remitente, caja y confirmación.

**Decisión:** El selector de país es el único modal inicial. Al seleccionar un país, el sistema abre directamente el paso `Caja`; `Siguiente` abre el checkout final. Antes de confirmar, `Cancelar venta rápida` cierra el estado y checkout rápido, conserva el remitente y restablece los pasos de destinatario y logística. Cerrar el checkout rápido antes de confirmar tiene el mismo efecto reversible. Después de confirmar, `Nueva venta` inicia una venta limpia.

**Resultado:** No hay doble envío ni estado rápido colgado, y el usuario puede arrepentirse sin perder el remitente ni quedar atrapado en el flujo abreviado.

### 2026-08-13 - Propuesta manual de ruta fuera de cobertura

**Contexto:** ninguna ruta configurada puede cubrir una dirección y, aun así, Ventas puede necesitar proponer una ruta operativamente posible.

**Decisión:** la ausencia de coincidencia geográfica no bloquea el selector. Ventas elige una ruta activa del día y recibe una advertencia antes de aceptar. La escritura registra la falta de cobertura como estado persistente y mantiene la solicitud en aprobación; no confirma, no crea ruta y no oculta la excepción. Logística recibe el mismo aviso y su acción `Confirmar` representa la verificación humana. El rechazo conserva motivo y recuperación mediante Tareas.

**Resultado:** una excepción puede avanzar sin fingir cobertura ni saltarse la revisión operativa.

### 2026-08-13 - Venta bloqueada ante stock insuficiente

**Contexto:** El flujo anterior trataba el faltante como una advertencia posterior al éxito y creaba un pendiente de inventario.

**Decisión:** El faltante de stock es un error bloqueante anterior al commit. Durante la confirmación, la acción permanece en carga; si el servidor detecta disponibilidad insuficiente, no crea ninguna parte de la venta, conserva el formulario y muestra un mensaje recuperable para revisar cantidades o esperar una entrada. No se muestra éxito ni se genera un recordatorio nuevo en Notificaciones.

**Resultado:** Una confirmación nunca comunica éxito cuando no pudo reservar o descontar todas las cajas.

### 2026-08-12 - Confirmación explícita de la entrada exacta

**Contexto:** Un clic o arrastre accidental sobre el mapa de un remitente o destinatario podría enviar al conductor a coordenadas incorrectas.

**Decisión:** Mover el pin solo actualiza una vista previa local. Persistir la entrada exige pulsar `Confirmar entrada exacta`; mientras guarda, bloquear el doble envío y conservar la ubicación anterior si falla. Ofrecer `Restablecer al punto de la dirección` y distinguir claramente un punto sin confirmar. La selección es opcional y un fallo de Google Maps no bloquea guardar el contacto con su dirección validada.

Una modificación posterior no altera silenciosamente paradas ya creadas. Logística debe ver la diferencia y decidir expresamente si actualiza una ruta todavía editable; las rutas cerradas conservan su instantánea y auditoría.

**Resultado:** El mapa permite precisión real sin convertir un gesto exploratorio en una instrucción operativa ni perder recuperación ante errores.

### 2026-08-12 - Cierre recuperable del detalle de ruta

**Contexto:** seleccionar una ruta abría su detalle lateral, pero en escritorio no existía un control visible para cerrarlo y regresar al listado completo.

**Decisión:** todo detalle de ruta seleccionado muestra una acción `Cerrar detalle` en su cabecera, también se cierra con `Escape` y, al salir, intenta devolver el foco al grupo de ruta que lo abrió. En móvil se conserva además el cierre al tocar el fondo exterior.

**Resultado:** consultar una ruta nunca deja al operador atrapado en el panel ni obliga a cambiar de pestaña o recargar para recuperar el listado.

### 2026-08-12 - Venta creada visible sin recarga manual

### 2026-08-12 - Edición controlada del expediente

**Contexto:** Se añadió edición comercial desde el expediente del envío.

**Decisión:** El guardado requiere una acción explícita `Guardar cambios`, conserva auditoría y vuelve a consultar el expediente al terminar. Si el envío ya fue confirmado por Logística, la interfaz no abre el formulario y la acción de servidor vuelve a validar el bloqueo. Cambiar una dirección con una solicitud pendiente la devuelve a evaluación logística; no se conserva una programación que pueda apuntar a una dirección antigua.

**Resultado:** El usuario puede corregir datos antes de la confirmación sin doble envío ni mutaciones silenciosas sobre una ruta confirmada.

**Contexto:** Después de crear un invoice, entrar a Seguimiento podía reutilizar el listado precargado anterior y omitir el registro nuevo hasta recargar el navegador.

**Decisión:** Crear el shipment invalida Seguimiento y Logística. Al montar Seguimiento se hace además una lectura fresca aun cuando exista bootstrap de servidor. La venta confirmada y su número definitivo se muestran inmediatamente; una asignación logística pendiente no bloquea esa visibilidad.

**Resultado:** El invoice aparece al primer ingreso a Seguimiento y no exige recarga manual.

### 2026-08-11 - ActionConfirmDialog: Enter acepta; Escape cancela

**Contexto:** Al quitar una zona, el foco caía en `Cancelar` y Enter cancelaba en lugar de aceptar.

**Decisión:** El foco inicial va al botón de confirmar (`Quitar zona`, etc.). `Enter` ejecuta confirmar; si el foco está en `Cancelar`, Enter cancela. `Escape` siempre cancela sin ejecutar.

**Resultado:** Enter acepta la acción del diálogo; Escape o Tab+Enter en Cancelar la descartan.

**Contexto:** El operador borró zonas de una subruta, recargó y no se persistieron; también pudo quitarlas sin confirmación. Al guardar sin zonas el servidor rechaza.

**Decisión:** En subrutas, la cobertura por ciudad/zona es formulario explícito: solo `Guardar` persiste (no hay autoguardado como en el día-ruta). En modo `places` hace falta **al menos una ciudad o zona**. Si se quitan todas, aparece el aviso «Selecciona al menos una zona para poder guardar los cambios» junto a la lista y al pie; al pulsar `Guardar` también sale un toast con el mismo mensaje (el botón no se silencia). Una **vista previa** pendiente cuenta como selección: el aviso no se muestra y `Guardar` confirma esas zonas antes de persistir (equivalente a `Agregar zona`). Quitar una zona de la lista pide `ActionConfirmDialog`. Hay indicador `Cambios sin guardar` y aviso al cerrar con cambios pendientes.

**Resultado:** No se pierde cobertura por recargar sin guardar; no se pueden vaciar subrutas en modo places sin aviso; una zona en preview ya no dispara el falso mensaje de “falta zona”; quitar zona deja de ser un clic silencioso.

**Contexto:** Marcar muchas ciudades una a una es lento cuando la cobertura operativa cubre un área grande.

**Decisión:** El mapa ofrece **Seleccionar área**: el operador arrastra un rectángulo; las piezas Census que intersectan el área entran en vista previa (no se guardan). Puede quitar piezas individuales de esa preselección y solo entonces pulsar `Agregar zonas` (o `Agregar zona` si queda una). Cancelar descarta el lote. El clic pieza a pieza y el buscador siguen disponibles. El rectángulo no mueve la cámara.

**Carga:** Mientras se preparan las zonas, el mapa muestra un overlay con spinner y progreso `Preparando N/M zonas`, resalta las piezas del rectángulo y va pintando la preview por lotes (no espera al final en silencio).

**Edición en preview:** Con la vista previa activa, un clic en una pieza del mapa **añade o quita** esa zona de la lista pendiente (no reemplaza el lote ni toca la cobertura confirmada). El mismo gesto funciona sobre el contorno de preview o sobre la pieza del mosaico; los chips debajo del mapa siguen permitiendo quitar. Resaltar o cargar geometrías de la preview **no** llama `fitBounds` ni cambia el zoom. Antes de confirmar, un selector de **Color** aplica un solo color a todo el lote.

**Resultado:** Se puede cubrir un área amplia, revisar y podar antes de confirmar la cobertura.

### 2026-08-11 - Selección por polígonos administrativos clicables

**Contexto:** El clic en un punto del mapa hacía reverse geocode y luego buscaba un perímetro Census; a veces el nombre y el área no coincidían con la pieza que el operador creía tocar.

**Decisión:** Con permisos de edición, el mapa carga un mosaico GeoJSON de Places Census (ciudades incorporadas y CDP) según la vista actual. Cada pieza es un polígono independiente: hover/toque la resalta y muestra el nombre; el clic selecciona exactamente ese GeoJSON. Un punto vacío ya no inventa límites. Tras el clic se mantiene la franja `Cancelar` / `Agregar zona`. La identidad operativa sigue siendo `place_id` de Google (vinculado por nombre + centroide); la geometría de preview/cobertura es el polígono Census elegido.

**Resultado:** La selección corresponde a la pieza visible del rompecabezas, no a un área calculada desde el punto del clic.

### 2026-08-11 - No confirmar una preview con perímetro aproximado

**Contexto:** La preview de Los Angeles podía mostrar el `viewport` de Google mientras la frontera Census todavía cargaba o si el servicio fallaba. Ese rectángulo no es una frontera administrativa.

**Decisión:** Una preview pendiente no dibuja el `viewport` como área seleccionada. Solo una geometría Census válida puede rellenar la zona; si todavía no está disponible, el mapa conserva el contexto sin presentar un perímetro falso y la selección no cambia los datos hasta pulsar `Agregar zona`.

**Resultado:** El nombre, la preview visual y la cobertura confirmada no se contradicen por un fallback rectangular de Google.

### 2026-08-11 - Confirmación inline de preview de cobertura

**Contexto:** El modal de ampliación ocultaba parte del mapa mientras el operador comprobaba el perímetro.

**Decisión:** La preview no abre modal. La interfaz mantiene el mapa visible y renderiza debajo una franja inline con `Agregar zona` y `Cancelar`. Solo `Agregar zona` llama a `confirmPendingCoveragePlace`; cancelar elimina la preview. Los controles permanecen disponibles debajo del mapa y no provocan scroll ni cambio de cámara. Esta decisión actualiza la confirmación modal de la entrada anterior.

**Resultado:** Se puede revisar la zona completa y confirmar sin perder el contexto geográfico.

### 2026-08-11 - Selección directa de cobertura desde el mapa

**Contexto:** El operador aprobó que el mapa sea la superficie principal para marcar ciudades y zonas, porque el buscador con mapa pasivo resultaba indirecto.

**Decisión:** Con permisos de edición, un clic deliberado en el mapa identifica la ciudad o zona bajo el punto. Una zona nueva se muestra como preview y requiere `ActionConfirmDialog` antes de entrar a la cobertura; una zona ya confirmada se puede quitar con otro clic y la lista queda sincronizada. El buscador sigue disponible como alternativa. El mapa conserva la cámara durante la identificación y un fallo de geocodificación solo muestra el error sin bloquear el guardado.

**Resultado:** La persona marca la cobertura desde el mapa sin introducir polígonos libres ni cambiar el modelo actual de `place_id`/ciudad/zona; la cobertura confirmada continúa guardándose y auditándose con las mismas reglas existentes. Esta decisión reemplaza las entradas del 2026-08-10 que prohibían que el mapa iniciara propuestas.

### 2026-08-10 - El espacio vacío del mapa no propone cobertura

**Contexto:** La geocodificación inversa convertía cualquier clic sobre terreno, calles o espacios vacíos en una ciudad administrativa y abría una confirmación. Google no expone una hitbox fiable para las etiquetas base de ciudades como Santa Clarita; solo garantiza `placeId` para ciertos iconos de lugares.

**Decisión:** Las ciudades o zonas se proponen únicamente desde las sugerencias explícitas del buscador. El mapa queda como vista previa navegable: tocar nombres, terreno, calles, espacios vacíos o polígonos no abre confirmación ni cambia la selección. El resaltado de una cobertura confirmada se controla desde su nombre en el listado.

**Resultado:** La selección deja de depender de áreas administrativas invisibles o hitboxes inexactas. El nombre elegido en el buscador siempre coincide con la zona que se previsualiza y confirma.

### 2026-08-10 - Mapa estable al previsualizar cobertura

**Contexto:** Cada clic en el mapa reencuadraba la cámara (subía/bajaba) y el autoguardado podía mostrar `Guardando cobertura…` de forma permanente por claves de dirty-check demasiado sensibles (lat/lng/bounds).

**Decisión:** `fitBounds` solo responde a la cobertura ya confirmada; la vista previa del clic no mueve el mapa. Un fit puntual solo ocurre al elegir desde el buscador (`fitPreview`). La clave de sincronización de cobertura del día usa `placeId` + rol + color + ZIPs (sin coordenadas). `Guardando cobertura…` solo aparece mientras la petición está en curso.

**Resultado:** Clic y preview no sacuden el mapa; el indicador de guardado deja de quedarse colgado.

**Contexto (seguimiento 2):** Tras el primer arreglo, el mapa seguía saltando al clic. La clave de encuadre incluía el estado del contorno (`none` → `census`); cuando Census terminaba de cargar (a menudo justo al hacer clic), se volvía a llamar `fitBounds` y el zoom cambiaba. Además el texto `Identificando el área del clic…` encima del mapa refloweaba la fila del botón.

**Decisión:** La clave de cámara es solo el conjunto de `placeId`/ZIP confirmados (sin tipo de contorno ni preview). `fitBounds` vive en un efecto aparte y no se repite al llegar Census. El encabezado del mapa es texto fijo; el estado del clic va solo en el overlay inferior con altura reservada. Un clic sin ciudad no dispara toast (solo el overlay).

**Resultado:** Clic, “identificando…” y llegada de Census no mueven la cámara ni empujan el layout del mapa.

**Contexto:** Un clic en el buscador o en el mapa agregaba la ciudad al instante; el operador no veía el perímetro antes de comprometer la ruta.

**Decisión:** Elegir una sugerencia solo propone el lugar: el mapa pinta el perímetro en vista previa y `ActionConfirmDialog` pregunta si se amplía la cobertura. Confirmar hace `upsert` en la lista; cancelar descarta la preview. Si el lugar ya estaba, se destaca sin duplicar. El desglose de zonas hijas (checkboxes) sigue siendo inmediato. El mapa base no inicia propuestas desde puntos vacíos ni etiquetas no controladas por Boxario.

**Resultado:** Se puede juzgar el tamaño real del área (p. ej. San Fernando vs Santa Clarita) antes de guardarla en la cobertura.

### 2026-08-10 - Switch de día persiste al instante

**Contexto:** El switch solo abría un formulario pendiente; al recargar el día seguía inactivo. Una reparación desde `pickup_days` reactivaba días al apagar el último.

**Decisión:** Encender el switch llama `activateLogisticsRouteWeekdayAction` de inmediato. Apagar llama `setLogisticsRouteWeekdayEnabledAction(false)` y sincroniza `pickup_days = delivery_days`. Al leer el catálogo, si `pickup_days` diverge, se iguala a `delivery_days`; nunca se restaura `delivery_days` desde `pickup_days`.

**Resultado:** Activar/desactivar un día y recargar conserva exactamente ese conjunto; apagar el domingo no reenciende lunes ni jueves.

**Contexto:** Tras guardar cobertura ZIP, un fallo de red podía dejar `busy` activo y deshabilitar todos los switches de días maestros.

**Decisión:** Las operaciones async limpian `busy` en `finally`. Los interruptores de día solo se deshabilitan durante `day:` / `schedule:`, no durante guardar cobertura, subruta o archivo. Pulsar de nuevo el switch en activación pendiente cancela esa activación.

**Resultado:** Activar/desactivar un día sigue disponible aunque falle o cuelgue el guardado de cobertura.

**Contexto:** Cuando el día es la ruta (sin subrutas), el operador define el área con ciudades/zonas, sin elegir un modo.

**Decisión:** No hay selector `Modo` en la cobertura del día. Al agregar o quitar una ciudad/zona, la cobertura se guarda sola tras una breve pausa (sin botón extra). Con al menos un lugar se persiste `places`; sin lugares se persiste `day_only` (día abierto). Si la ruta del día aún está en ZIP legado, se muestran esos chips además del editor de lugares. Un fallo del mapa no bloquea el guardado; si el guardado falla, aparece `Reintentar guardado`. Con subrutas, esa cobertura del día no se edita; cada subruta conserva su propio guardado y su selector de modo (`day_only` / `places` / `postal_codes` legado).

**Resultado:** El jueves activo sin divisiones se pinta con lugares/mapa; al crear subrutas, la cobertura operativa pasa a cada división.

### 2026-08-10 - Sin cierre automático por hora del día anterior

**Contexto:** El cierre global y las fechas especiales bloqueaban altas y cerraban rutas `draft` por cron; el operador pidió eliminar esa lógica.

**Decisión:** Ya no existe validación de cutoff ni excepciones de fecha al programar o agregar cajas. Capacidad, cobertura, día habilitado y horario operativo siguen aplicándose con rechazo inmediato y mensaje concreto. El cierre de una ruta preparada es solo manual (`Confirmar ruta` / `Cerrar ruta`), con la confirmación y bloqueo anti doble envío ya vigentes. Esta nota reemplaza las entradas de 2026-08-04/05 sobre cierre uniforme, fecha especial y cierre automático por cutoff.

**Resultado:** No hay rechazo por “ruta cerró el día anterior” ni cierre silencioso por cron; Logística decide cuándo cerrar.

### 2026-08-10 - Error recuperable al guardar el orden de paradas

**Contexto:** El mensaje genérico `No se pudo completar la operación` no permitía distinguir un fallo técnico de un cambio concurrente en la ruta.

**Decisión:** Un conflicto de paradas indica que se debe recargar la ruta e intentar nuevamente; un cambio de estado comunica que la ruta ya inició; permisos y ruta inexistente conservan mensajes propios. Los detalles internos de PostgreSQL se registran únicamente en el servidor. No se aplica un orden optimista ni parcial cuando la escritura falla.

**Resultado:** El operador sabe cómo recuperarse sin exponer restricciones, SQL ni datos internos y la lista visible continúa representando el último orden confirmado por el servidor.

### 2026-08-10 - Sincronización visual entre orden y mapa

**Contexto:** Reordenar una parada cambia el recorrido esperado y el operador necesita verificar el resultado sin una segunda acción manual.

**Decisión:** Después de confirmar un cambio de `stop_order`, el mapa se vuelve a calcular con la secuencia recibida del servidor. El mapa es de solo lectura: arrastrar marcadores o consultar Google Maps no altera datos. Si el proveedor vial falla, se mantiene la lista y se dibuja una línea directa para comunicar el orden, acompañada de una advertencia; nunca se presenta ese respaldo como trayecto vial calculado.

**Resultado:** El usuario siempre puede distinguir el orden guardado de la disponibilidad temporal del proveedor cartográfico y no corre el riesgo de modificar la ruta accidentalmente desde el mapa.

### 2026-08-10 - Reordenamiento de una ruta cerrada antes de iniciar

**Contexto:** La ruta ya confirmada aparecía en `Rutas` con su secuencia visible, pero sin controles para corregir el orden antes de entregarla al conductor.

**Decisión:** En estados `draft` y `planned`, cada parada muestra acciones compactas `Subir` y `Bajar`. Los extremos deshabilitan la dirección imposible. Al pulsar, todos los controles de orden se bloquean hasta recibir respuesta; el servidor valida el conjunto completo, guarda `stop_order` y la interfaz recarga la ruta. Un fallo conserva el orden anterior y muestra el error. No se pide confirmación ni motivo porque la ruta aún no empezó y la acción es reversible con el movimiento contrario.

**Resultado:** La numeración visible coincide con el orden persistido, no hay envíos simultáneos y una ruta cerrada puede reorganizarse sin reabrirse ni habilitar altas o bajas.

### 2026-08-10 - Selección de rango en un solo calendario

**Contexto:** el selector personalizado de Logística mostraba dos campos independientes, cada uno con su propio calendario, aunque ambos componían un solo rango operativo.

**Decisión:** al abrir el selector se muestra una única cuadrícula mensual. El primer día elegido inicia el rango y el segundo lo completa; si el segundo es anterior, el sistema ordena ambos límites. El intervalo es inclusivo, permanece resaltado y `Aplicar rango` se bloquea mientras solo exista el primer clic. Un tercer clic inicia una selección nueva.

**Resultado:** el rango se comprende y se modifica como una sola intención, sin perder la normalización, la navegación mensual, la cancelación ni el retorno de foco existentes.

### 2026-08-09 - Confirmación atómica al salir de Preparación

**Contexto:** `Crear ruta` confirmaba el grupo pero persistía una ruta `draft`; después de navegar a `Rutas`, el operador debía ejecutar `Cerrar ruta` como una segunda confirmación de la misma preparación.

**Decisión:** `Confirmar ruta` crea las paradas y cambia la instancia a `planned` en una sola transacción idempotente. La interfaz bloquea el grupo durante el envío y navega a `Rutas` únicamente después de recibir la ruta cerrada. Si fallan cobertura, capacidad, ubicación, fecha o concurrencia, toda la intención se revierte y la selección permanece disponible para corregir o reintentar.

**Resultado:** no existe un éxito parcial que deje una ruta nueva en `En preparación`, no hay doble envío por reintento y el cambio de pestaña representa una transición de estado ya confirmada. Esta decisión reemplaza el segundo cierre manual y la transición a borrador descritos el 2026-08-05 y 2026-08-09 para los grupos confirmados desde `Preparación`.

### 2026-08-09 - Movimiento entre estantes sin estado parcial

**Contexto:** mover una cantidad entre dos estantes se ejecutaba como una reducción y un aumento separados; un fallo intermedio podía dejar una ubicación incompleta.

**Decisión:** el origen, el destino y la cantidad se validan y actualizan dentro de un único RPC transaccional con bloqueo del stock agregado del artículo. La interfaz deshabilita el envío mientras está en curso y solo actualiza las ubicaciones después de recibir confirmación completa.

**Resultado:** un traslado se aplica completo o no se aplica; nunca se comunica éxito después de mover únicamente uno de los extremos.

### 2026-08-09 — Cambio de presentación sin pérdida de contexto

Cambiar entre `Lista`, `Tarjetas` y `Tabla` es una acción de consulta de bajo riesgo. Debe aplicarse de inmediato, sin confirmación, y no puede alterar filtros, búsqueda, semana o día activo, paginación, selección de registros, grupos expandidos ni panel de detalle. La preferencia se conserva por página o pestaña. Si una superficie no implementa una vista, esa opción no se ofrece; si no implementa ningún cambio de presentación, el selector completo permanece oculto.

Documento de estándares de diseño de interacción (`Interaction Design`) para Boxario. Complementa `docs/GUIA_ESTILO_UI.md` (apariencia, densidad, mensajes aprobados y preferencias visuales) y `docs/REGLAS_NEGOCIO_Y_DEPENDENCIAS.md` (efectos en datos, auditoría y dependencias entre módulos).

**Producto:** Boxario — sistema operativo de envíos internacionales de cajas para una **empresa** (organización cliente) y, opcionalmente, su red de agencias (venta → logística → conductor → bodega → cobro). En copy de producto **debe** decirse `empresa`, no `paquetería` (preferencia en `GUIA_ESTILO_UI.md`).

**Normativa:**

| Palabra | Significado |
| --- | --- |
| **Debe** | Requisito obligatorio |
| **No debe** | Prohibición |
| **Debería** | Recomendación fuerte |
| **Puede** | Opción permitida |

Las reglas marcadas como **estándar recomendado** aún no están uniformemente implementadas en todo el código; deben aplicarse en pantallas nuevas y en rediseños.

---

## 1. Propósito y alcance

### Para qué sirve

Esta guía define cómo debe comportarse la interfaz cuando el usuario agrega, edita, guarda, elimina, desactiva, archiva o ejecuta acciones críticas; y cómo debe recibir confirmación, retroalimentación, errores y posibilidad de recuperación.

### A qué se aplica

- Pantallas del App Shell: Ventas (`/venta`), Seguimiento (`/seguimiento`), Inventario (`/inventario`), Bodega / Ingreso / Paletas, Logística (`/logistica`), Conductor, Contabilidad, Estadísticas, Configuración (`/configuracion`), Agencias y Plataforma (`/platform`).
- Componentes compartidos de confirmación, notificación y formularios (`ActionConfirmDialog`, `NotificationProvider` / `useNotify`, modales de motivo/excepción, menús contextuales).
- Flujos con efectos en dinero, stock, rutas, auditoría o permisos.

### Quién debe usarla

Diseñadores, desarrolladores frontend y revisores de pull requests. Antes de cambiar lógica de negocio, leer también `docs/REGLAS_NEGOCIO_Y_DEPENDENCIAS.md`. Antes de cambiar apariencia o preferencias visuales, leer `docs/GUIA_ESTILO_UI.md`.

### Diseño visual vs diseño de interacción

| Diseño visual (`GUIA_ESTILO_UI.md`) | Diseño de interacción (este documento) |
| --- | --- |
| Densidad, tipografía, color, superficies, modales | Cuándo confirmar, deshacer, bloquear o revertir |
| Jerarquía de botones y layout | Nivel de riesgo y secuencia de la acción |
| Mensajes y copy aprobados | Momento, tono y canal del feedback |
| Preferencias rechazadas de UI | Prevención de errores y recuperación |

La UI **no** es fuente de verdad de saldo, stock, permisos ni estados críticos (`docs/ARQUITECTURA.md`). La interacción debe anticipar el resultado, pero el servidor / RPC decide.

### 2026-08-07 — Regla de recuperación: cambiar días no oculta invoices

Modificar el calendario de rutas es una acción de configuración, no una acción de disposición de invoices. La interfaz debe conservar visibles los invoices abiertos y señalar los que quedaron fuera de un día operativo; no debe sustituir el filtro por otro día automáticamente ni presentar una cola vacía sin explicar el estado.

---

## 2. Principios generales de interacción

### Retroalimentación inmediata

La interfaz **debe** responder al gesto del usuario en menos de un instante percibido: selección marcada, botón en estado de carga, toast, mensaje inline o avance de paso. Un toque **no debe** quedar sin respuesta aunque una dependencia secundaria falle en segundo plano (preferencia documentada en Ventas al elegir remitente).

### Visibilidad del estado del sistema

El usuario **debe** poder saber en todo momento: qué está seleccionado, qué está en proceso, qué quedó pendiente y qué falló. Estados operativos (ruta `in_progress`, saldo o validación de stock fallida) **deben** ser visibles sin abrir menús innecesarios.

### Prevención de errores

Preferir impedir la acción inválida (deshabilitar con explicación, validar antes de enviar, ocultar opciones no disponibles) antes que corregir después. Ejemplo: un día desactivado en Logística **no debe** seleccionarse en Ventas.

### Consistencia

Las mismas acciones **deben** usar los mismos patrones: confirmación con `ActionConfirmDialog` (o modal dedicado equivalente), toasts con `useNotify`, tonos `warning` / `danger`, y textos específicos (`Cancelar entrega`, no `No dejar`).

### Control del usuario

El usuario **debe** poder cancelar diálogos, cerrar notificaciones y salir de flujos sin perder datos capturados cuando la acción no se haya confirmado. Las excepciones administrativas **deben** ser conscientes y difíciles de confundir con el flujo normal.

### Recuperación ante errores

Tras un fallo, la interfaz **debe** conservar lo capturado, explicar qué falló y ofrecer reintento o siguiente paso cuando exista (p. ej. `Reintentar` en fallos de ruta tras crear invoice).

### Accesibilidad

Toda acción crítica **debe** ser operable por teclado, con foco visible y mensajes anunciables. **No debe** depender solo del color, el sonido o la animación.

### Reducción de interrupciones

**No debe** pedirse confirmación para todas las acciones. La fatiga de confirmación hace que el usuario acepte sin leer. Confirmar solo cuando el riesgo lo justifique (sección 3 y 7).

---

## 3. Clasificación de acciones por nivel de riesgo

| Nivel | Ejemplos en Boxario | ¿Ejecutar de inmediato? | ¿Deshacer? | ¿Confirmación? | ¿Confirmación reforzada? | Mensaje |
| --- | --- | --- | --- | --- | --- | --- |
| **Bajo riesgo** | Agregar país a precios; seleccionar remitente; abrir detalle; filtrar listados | Sí | Opcional / no suele hacer falta | No | No | Toast de éxito breve o feedback inline |
| **Riesgo moderado** | Guardar precios; editar datos de empresa; crear usuario; desactivar modalidad horaria; archivar artículo sin impacto masivo | Sí tras validación | **Debería** si es reversible en UI | Solo si hay pérdida local no obvia | No | Toast éxito/error; estado “Guardando…” |
| **Alto riesgo** | Cancelar entrega/recolección; cancelar ruta `draft`/`planned`; completar pago; publicar ruta; borrar entrada de Bitácora; desactivar usuario | Tras confirmación | Solo si el dominio lo permite | Sí (`ActionConfirmDialog` o modal dedicado) | Motivo cuando la regla lo exige | Título + consecuencias + botón específico |
| **Crítica / irreversible** | Excepción administrativa que salta la máquina de estados; archivar empresa en Plataforma; wipe operativo de envíos; reversos financieros; borrado físico con dependencias | Nunca “de un clic” | No (o solo vía flujo de compensación auditable) | Sí | Sí (motivo, acuse de riesgo, y/o texto a escribir) | Modal de riesgo explícito + auditoría |

### Reglas

- Una acción de **bajo riesgo** **debe** ejecutarse al confirmar el gesto principal (clic en Agregar, selección, etc.), sin diálogo intermedio.
- Una acción de **alto riesgo** **debe** explicar exactamente qué ocurrirá (tarea cancelada, conductor notificado, historial conservado, etc.).
- Una acción **crítica** **debe** dejar traza auditable cuando el dominio lo requiera (`activity_history`, excepciones administrativas, etc.).
- Si el registro tiene historial, ventas, rutas o auditoría, **debe** preferirse desactivar o archivar antes que eliminar físicamente (sección 6).

---

## 4. Acciones de agregar

### Reglas

1. Si la acción es segura y reversible (p. ej. agregar un país al catálogo comercial), **debe** ejecutarse de inmediato al confirmar la selección.
2. La interfaz **debe** prevenir duplicados: no ofrecer de nuevo un país ya configurado, o rechazar el alta con mensaje claro.
3. Durante la persistencia, **debe** mostrarse estado de carga en el control relevante y **debe** deshabilitarse el botón de agregar para evitar doble envío.
4. Tras éxito, **debe** mostrarse un mensaje de éxito (toast vía `useNotify`) y **debe** actualizarse de inmediato la lista o el detalle.
5. Si el servidor falla, **debe** mostrarse error comprensible y **debe** revertirse el cambio optimista (o no aplicarlo hasta confirmación del servidor, según el patrón del módulo).
6. Los datos introducidos en formularios de alta **deben** conservarse tras un error de red o validación.

### Ejemplo: Agregar México

**Contexto real:** `Configuración → Ventas → Países` (`Agregar país`), acciones en `use-config-country-pricing-actions.ts`.

| Paso | Comportamiento |
| --- | --- |
| Usuario elige México | Se agrega a la lista local, se cierra el picker y se abre el detalle |
| Persistencia | Se dispara el guardado pendiente (`flushPendingSave`) |
| Éxito | Toast: `México agregado` |
| Lista | México aparece ordenado en el catálogo y queda seleccionable en Ventas tras guardar |
| Duplicado | **No debe** poder agregarse otra vez el mismo país ya presente |
| Fallo de guardado | Toast de error; la UI **debe** alinear el estado visible con la fuente de verdad (revertir o reintentar) |

**Nivel de riesgo:** bajo / moderado (configuración comercial; reversible quitando el país si aún no hay dependencias fuertes de uso).

**Estándar recomendado:** mientras el guardado está en vuelo, el botón `Agregar país` y la fila pendiente **deben** impedir un segundo alta del mismo código.

---

## 5. Edición y guardado

### Cuándo guardar automáticamente

El guardado automático **puede** usarse cuando:

- Los cambios son frecuentes y de bajo/moderado riesgo (precios de país, sugerencias horarias encoladas).
- Existe cola o serialización que evita pisar escrituras concurrentes del mismo cliente (ver decisión de guardado serializado en `docs/DECISIONES_TECNICAS_Y_COMPATIBILIDAD.md`).

El guardado automático **no debe** aplicarse a cobros, cambios de estado de ruta/tarea, excepciones administrativas ni cualquier mutación que requiera confirmación explícita.

### Cuándo usar botón Guardar

**Debe** usarse botón explícito cuando:

- El formulario agrupa varios campos que deben validarse juntos (datos de empresa, ajuste de inventario, cobro).
- La acción tiene efecto operativo inmediato (publicar ruta, confirmar programación, registrar pago).
- El copy del botón comunica la operación (`Guardar ajuste`, `Confirmar y programar`, no solo `Aceptar`).

### Cambios sin guardar

- La UI **debería** indicar cambios pendientes cuando el usuario pueda abandonar el contexto (badge, texto “Sin guardar”, deshabilitar navegación destructiva).
- Al intentar salir con cambios pendientes de un formulario explícito, **debe** advertirse (confirmación o barrera equivalente). **Estándar recomendado** si el módulo aún no lo implementa.

### Estados de guardado

| Estado | Comportamiento |
| --- | --- |
| Guardando | Botón deshabilitado; etiqueta `Guardando…` / `Confirmando…`; sin segundo envío |
| Guardado | Toast o indicador breve de éxito; lista/detalle actualizados |
| Error al guardar | Mensaje claro; datos conservados; reintento disponible |

### Conflictos de edición

- Si dos actores modifican el mismo recurso, el servidor **debe** ganar; la UI **debe** recargar o mostrar conflicto comprensible.
- **No debe** sobrescribir silenciosamente dinero, stock o estados de ruta con un respaldo local obsoleto.
- En comandos con idempotencia (`idempotency`), un reintento **debe** tratarse como la misma intención, no como una segunda mutación.

---

## 6. Eliminación, desactivación y archivado

### Diferencias

| Concepto | Significado en Boxario | Cuándo usarlo |
| --- | --- | --- |
| **Eliminar permanentemente** | Borrado físico del registro | Solo sin historial ni dependencias (p. ej. artículo de inventario sin movimientos) |
| **Eliminación lógica (`soft delete`)** | Marca de borrado; deja de operarse pero puede consultarse en historial | Bitácora (entrada eliminada con razón); filas que deben permanecer filtrables |
| **Desactivar** | Sigue existiendo; no disponible para operación nueva | Usuario (`is_active`); modalidad horaria; estante/bodega; día operativo |
| **Archivar** | Fuera del flujo activo; historial conservado | Artículo con historial (`archived: true`); agencias/`archived_at`; empresa en Plataforma |
| **Ocultar** | Solo presentación; no implica borrado | Modalidad desactivada oculta en Ventas; secciones contraídas |

### Regla de preferencia

Cuando existan datos históricos, relaciones, ventas, configuraciones o auditoría, **debe** preferirse **desactivar** o **archivar** antes que eliminar físicamente.

### Verbo en UI vs efecto real

En Boxario es frecuente que la UI diga **Eliminar** y el efecto sea soft delete o desactivación. **Debe** alinearse el verbo con el efecto en pantallas nuevas:

| Copy preferido | Efecto |
| --- | --- |
| `Desactivar…` | `is_active: false` (usuario, conductor, vehículo, bodega, remitente) |
| `Archivar…` | `archived` / `archived_at` (artículo con historial, agencia, empresa en Plataforma) |
| `Eliminar…` | Borrado físico o lógica sin recuperación operativa sencilla |

Si por legado el menú dice `Eliminar` pero llama a `deactivate*`, la confirmación **debe** explicar el efecto real (“dejará de aparecer en operaciones nuevas; el historial se conserva”).

Referencias confirmadas:

- Inventario (INV-004): con historial → archivar; sin historial → eliminar del catálogo.
- Bitácora: eliminar exige razón, usa borrado lógico y cancela recordatorio pendiente.
- Remitente: UI “Eliminar remitente” → `deactivateCustomerAction` (`is_active: false` + historial).
- Usuarios: activar/desactivar acceso, no borrar el perfil operativo por defecto.
- Flota / entidades con `archived_at` o `is_active`: soft delete para conservar filtros históricos.
- Componentes preferidos: `ActionConfirmDialog` o modal dedicado. `window.confirm` / `window.prompt` son legado; **no deben** usarse en flujos nuevos (motivo de ruta, excepciones, cancelaciones).

### Ejemplo: “Eliminar México”

Quitar un país del catálogo comercial **no** es equivalente a borrar su historial de ventas.

**Comportamiento actual observado:** el menú `Eliminar país` (`removeCountry`) actualiza el estado local, dispara `flushPendingSave` y muestra toast `México quitado` **sin** diálogo de confirmación.

| Aspecto | Comportamiento recomendado |
| --- | --- |
| Si México se acaba de agregar y no hay dependencias | Ejecutar de inmediato + toast; **debería** ofrecer Deshacer |
| Si hay precios, promociones o uso en Ventas | **Debería** pedir confirmación explicando qué se pierde en la configuración |
| Si hay destinatarios u operación ligada | `customer_recipients.country_id` es obligatorio; **no debe** dejarse un destino huérfano sin país resoluble |
| Mensaje de error | Explicar dependencia (“No se puede quitar: hay destinatarios o precios en uso”) y ofrecer alternativa |

**Nivel de riesgo:** moderado a alto según dependencias.

---

### 2026-08-06 — Revisión de reservas con aceptar y retirar

En `Rutas → Plantillas`, la acción principal de cada solicitud pendiente es un control de aceptar con icono de chulito. Aceptar ejecuta la aprobación y muestra estado de carga y toast de resultado. La `X` no rechaza inmediatamente: abre un menú accesible con `Mover a otra ruta`, `Dejar pendiente` y `Rechazar solicitud`; las dos últimas opciones abren el diálogo dedicado de motivo obligatorio. Al elegir una opción, el menú se cierra y la acción queda registrada en la bitácora cuando corresponde.

## 7. Confirmaciones

### 2026-08-07 — Selección múltiple en Por confirmar

**Contexto:** El operador necesita confirmar varias solicitudes recibidas desde Seguimiento sin repetir la misma acción invoice por invoice.

**Decisión:** `Por confirmar` debe mostrar un checkbox por solicitud y un control `Seleccionar todas` aplicado a los resultados visibles de la semana, día y búsqueda actuales. La acción `Confirmar seleccionadas` reutiliza la misma aprobación existente y procesa cada solicitud de forma secuencial.

**Resultado:** Las solicitudes aprobadas pasan a la ruta como en la confirmación individual; si alguna falla, se conservan los éxitos, se recarga la lista y se informa el número de solicitudes que no pudo confirmarse.

### Cuándo sí

- Pérdida de datos o cancelación de tarea/ruta ya creada.
- Impacto operativo (conductor, stock, dinero, estados).
- Acciones destructivas o administrativas fuera del flujo normal.

### Cuándo no

- Selecciones de listado, filtros, abrir menú, agregar ítems de bajo riesgo fácilmente reversibles.
- Guardados triviales ya cubiertos por feedback de éxito/error.
- Cada clic intermedio de un asistente de varios pasos.

### Reglas de contenido

1. **Debe** explicar exactamente qué ocurrirá.
2. El botón de confirmación **debe** usar verbo específico (`Eliminar país`, `Cancelar entrega`, `Archivar artículo`), no `Aceptar` genérico salvo excepciones de advertencia no destructiva ya aprobadas.
3. **Debe** existir `Cancelar` (o equivalente) claro.
4. **No debe** usarse solo “¿Está seguro?” sin contexto.
5. Preferir `ActionConfirmDialog` o modal dedicado; **no debe** usarse `window.prompt` para motivos operativos (preferencia: `LiveRouteChangeReasonDialog`).
6. Durante `confirming`, los botones **deben** deshabilitarse.

### Textos

Incorrecto:

> ¿Está seguro?

> Aceptar

Correcto (cancelación logística):

> **¿Cancelar entrega?**  
> Se quita el aviso a logística para la entrega. La tarea pendiente se cancela y tendrás que marcarla de nuevo cuando corresponda.  
> Botones: `Cancelar` · `Cancelar entrega`

Correcto (inventario con historial):

> **¿Archivar este artículo?**  
> Conservará su historial pero dejará de aparecer para operaciones nuevas.  
> Botones: `Cancelar` · `Archivar artículo`

---

## 8. Confirmación reforzada

Usar solo para acciones irreversibles o de impacto muy alto.

### Medidas admitidas

- Escribir el nombre del elemento o una palabra (`ELIMINAR`) — **estándar recomendado** en borrados masivos o archivo de empresa.
- Confirmar el número de elementos afectados.
- Mostrar dependencias o consecuencias (ruta actual, estado omitido, saldo).
- Motivo obligatorio (≥ 3 caracteres) + acuse explícito de riesgo (patrón real: `LogisticsAdminTaskExceptionDialog`).

### Ejemplo existente: excepción administrativa de tarea

- Modal dedicado, no el flujo del conductor.
- Motivo + checkbox de riesgo.
- Auditoría inmutable (`logistics_task_admin_exceptions`).
- Remount al abrir (`key`) para limpiar estado.
- Botón deshabilitado hasta cumplir condiciones.

**No debe** aplicarse confirmación reforzada a altas de catálogo, filtros ni guardados rutinarios.

---

## 9. Patrón “Deshacer”

### Cuándo preferirlo

Cuando la acción es reversible, de impacto moderado y frecuente (ocultar modalidad, quitar un país recién agregado, archivar con restauración sencilla), **debería** ejecutarse de inmediato y ofrecer Deshacer en lugar de un diálogo previo.

### Comportamiento recomendado

| Aspecto | Estándar |
| --- | --- |
| Mensaje | `México eliminado. Deshacer` (o `México quitado` + acción Deshacer) |
| Duración | Alineada al toast del sistema (`NotificationProvider` usa ~4,5 s). Para Deshacer, **debería** ofrecerse al menos 5–8 s o hasta que el usuario cierre |
| Al vencer | La acción queda confirmada; ya no hay Deshacer en ese toast |
| Si falla la restauración | Error claro; estado coherente con servidor; no fingir éxito |
| Teclado / lector | La acción Deshacer **debe** ser enfocable; el contenedor **debe** vivir en región `aria-live` (el provider actual usa `aria-live="polite"`) |

### Nota de implementación

Hoy los toasts de Boxario comunican éxito/error/info y se descartan solos; el patrón Deshacer con acción embebida es **estándar recomendado** para nuevas interacciones reversibles. No inventar Deshacer sobre operaciones ya auditadas como irreversibles (pagos aplicados, cierres atómicos de tarea, excepciones administrativas).

---

## 10. Retroalimentación del sistema

### Tipos

| Tipo | Uso en Boxario |
| --- | --- |
| Visual | Estados de botón, colores de tono (esmeralda éxito, rosa error, ámbar advertencia), spinners |
| Textual | Toasts, mensajes inline, títulos de diálogo |
| Sonora | No hay uso general en el código actual; ver sección 17 |
| Háptica | **Puede** usarse en escaneo móvil futuro; nunca como única señal |
| Accesible | `aria-live`, `role="status"`, `role="dialog"`, etiquetas en botones de cierre |

### Canales

| Canal | Cuándo |
| --- | --- |
| **Toast** (`useNotify`) | Éxito/error/info breve; no bloquea el flujo (p. ej. confirmación rechazada por stock insuficiente) |
| **Alerta / banner** | Condición persistente que exige atención en contexto; no competir con un éxito recién logrado |
| **Mensaje inline** | Validación de campo o error local del formulario |
| **Indicador de carga** | Operación en curso en botón o sección |
| **Barra de progreso** | Operaciones largas con avance conocido (**estándar recomendado**) |
| **Estado vacío** | Listas sin datos con siguiente acción clara (`Agregar país`) |
| **Cambio de estado en botón** | `Guardando…`, `Confirmando…`, deshabilitado |

El sonido **no debe** ser la única señal y **debe** ser opcional si se introduce (sección 17).

---

## 11. Estados de los botones

Estados mínimos:

| Estado | Requisito |
| --- | --- |
| Normal | Acción clara y habilitada |
| Hover | Feedback visual (escritorio) |
| Focus | Anillo/foco visible para teclado |
| Presionado | Respuesta al pointer |
| Cargando | Spinner o texto de proceso; **debe** impedir nueva ejecución |
| Deshabilitado | **Debe** explicar qué falta cuando sea posible (regla de `GUIA_ESTILO_UI.md`) |
| Éxito | Breve confirmación si el botón permanece en vista |
| Error | Re-habilitar para reintentar; no dejar el control “tragado” |

Un botón en proceso **no debe** permitir múltiples ejecuciones accidentales (doble clic, Enter repetido, toques dobles).

Referencia de tonos destructivos/advertencia: `actionConfirmButtonClass` en `action-confirm-dialog.tsx` (`warning` ámbar, `danger` rosa).

---

## 12. Acciones destructivas

### Diferenciación

- **Texto específico:** `Cancelar entrega`, `Archivar artículo`, `Eliminar entrada`, no `OK`.
- **Iconografía:** opcional como refuerzo; **no debe** ser la única pista.
- **Color:** tono destructivo del sistema (rose / danger), coherente con `ActionConfirmDialog` tone=`danger`.
- **Posición:** al final de menús y jerarquías; separadas de acciones frecuentes (`GUIA_ESTILO_UI.md`: acción principal → operativas → opcionales → administrativas → destructivas).
- **Teclado:** alcanzables y activables; Escape cierra el diálogo sin ejecutar.
- **No depender solo del color:** combinar verbo, tono, confirmación y, si aplica, icono.

Las acciones destructivas en menús contextuales **deben** vivir bajo el área secundaria cuando el menú mezcla opciones frecuentes y peligrosas.

---

## 13. Manejo de errores

### Reglas

1. Mensajes **deben** ser comprensibles para el operador (vendedor, logística, conductor, admin).
2. **Deben** decir qué falló y qué puede hacer el usuario.
3. **Deben** conservarse los datos introducidos.
4. **Deberían** ofrecer reintento cuando el fallo sea transitorio.
5. **No deben** mostrarse excepciones crudas, SQL, stacks ni códigos internos como único mensaje.

### Mapeo habitual (`docs/GUIA_DESARROLLO.md`)

| Condición | Mensaje típico al usuario |
| --- | --- |
| `UNAUTHORIZED` | Sesión requerida |
| `FORBIDDEN` | Sin permiso |
| Validación de dominio | Mensaje corto seguro |
| SQL / interno | “No se pudo completar la operación” |

### Casos

| Caso | Comportamiento |
| --- | --- |
| Red | Indicar conexión/reintento; no borrar el formulario |
| Permisos | Explicar falta de permiso; no fingir éxito |
| Conflictos / replay idempotente | Tratar como misma operación o mostrar conflicto explícito |
| Validación de campos | Inline junto al campo; foco al primer error |
| Dependencia faltante | Bloquear solo esa acción y decir dónde configurar (regla de fallos en `REGLAS_…`) |
| Venta sin stock | Bloquear la confirmación, conservar el formulario y explicar que no existe disponibilidad suficiente; no crear el invoice |

---

## 14. Operaciones asíncronas

1. **Debe** mostrarse indicador de carga en el control o región afectada.
2. Operaciones largas **deberían** permitir seguir viendo contexto; **no deben** congelar toda la aplicación sin feedback.
3. Cancelación **puede** ofrecerse si el backend lo soporta; si no, **debe** comunicarse que la operación ya no es cancelable.
4. **Optimistic UI** **puede** usarse en altas/bajas de catálogo de bajo riesgo (países, productos de precio) si hay reversión ante fallo. Hoy no es un patrón general del producto (hay casos puntuales de estado local + guardado, y optimistic en onboarding); **no debe** aplicarse a dinero, stock ni estados de ruta/tarea.
5. Ante fallo, **debe** revertirse el estado optimista o reconciliarse con el servidor.
6. **No debe** mostrarse éxito hasta tener certeza suficiente del resultado (respuesta ok o replay idempotente coherente). En catálogo con toast inmediato tras mutación local, el guardado **debe** reportar error y alinear la UI si la persistencia falla.
7. Efectos post-commit del conductor **deben** ser idempotentes en reintento (`docs/REGLAS_…`, intentos de tarea).

---

## 15. Prevención de doble ejecución e idempotencia (`idempotency`)

### Frontend

- **Debe** deshabilitar el botón / control mientras `confirming`, `saving` o `isPending`.
- **Debe** ignorar dobles clics en el mismo gesto de confirmación.
- En flujos de agencia, visitas y pagos, **debe** reutilizar la clave de idempotencia del intento (no regenerarla en cada reintento).
- **No debe** crear una segunda venta, cobro o asignación porque el usuario recargó o pulsó otra vez tras un timeout ambiguo sin consultar el resultado.

### Backend / actions / RPC

- Comandos sensibles **deben** aceptar `idempotency_key` cuando el dominio ya lo define (pagos, complete de conductor, operaciones de agencia, business commands).
- Un replay **debe** devolver el mismo resultado de negocio sin duplicar efectos colaterales.
- La UI **no** es autoridad final; el SQL/RPC **debe** denegar duplicados aunque el cliente falle.

---

## 16. Accesibilidad

1. Navegación por teclado en acciones primarias, menús y diálogos.
2. Foco visible en controles interactivos.
3. Al abrir un diálogo, el foco **debe** moverse al contenedor o primer control; al cerrar, **debería** volver al disparador (**estándar recomendado** donde aún falte).
4. Lectores de pantalla: toasts en `aria-live`; diálogos con `role="dialog"` y `aria-modal="true"` (como `ActionConfirmDialog`).
5. Etiquetas accesibles en iconos (`aria-label` en cerrar confirmación / notificación).
6. Contraste suficiente según el tema oscuro operativo de Boxario.
7. Mensajes **no deben** depender solo de color, sonido o animación.
8. Respetar `prefers-reduced-motion`: reducir animaciones no esenciales (**estándar recomendado**).
9. Evitar `window.prompt` / prompts nativos para flujos operativos (accesibilidad y contexto insuficientes).

---

## 17. Sonidos y notificaciones

### Estado actual

No hay un sistema general de sonido en el frontend de Boxario. Las notificaciones visuales cubren éxito, error e información (`NotificationProvider`) y la campanita de Notificaciones para pendientes persistentes.

### Si se introducen sonidos

Solo cuando aporten información real, por ejemplo:

- Escaneo exitoso.
- Alerta operativa urgente.
- Evento mientras el usuario no mira la pantalla (nueva asignación al conductor).

Reglas:

- **Deben** poder desactivarse.
- **Deben** tener alternativa visual.
- **No deben** sonar en cada clic.
- **No deben** usarse como decoración.
- **No deben** ser la única forma de comunicar un resultado.

---

## 18. Casos concretos del producto

| Acción | Nivel | Comportamiento recomendado | Éxito | Error | ¿Confirmación? | ¿Deshacer? | ¿Eliminar / desactivar / archivar? |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Agregar país (México) en Costos | Bajo–moderado | Alta inmediata + guardado; lista actualizada | `México agregado` | Explicar fallo de guardado; revertir si aplica | No | Recomendado tras quitar | N/A (alta) |
| Quitar país del catálogo | Moderado–alto | Hoy: sin confirmación + toast `… quitado`. Recomendado: confirmar si hay precios/promos; bloquear si hay dependencias críticas | `México quitado` | Bloquear si hay dependencias críticas | Según dependencias | Recomendado si acabas de quitarlo | Preferir no borrar historial de ventas |
| “Eliminar” remitente | Alto | Confirmación danger; efecto real = desactivar | Remitente desactivado / quitado de operación | Permiso / fallo | Sí (`ActionConfirmDialog`) | Reactivar si el dominio lo permite | **Desactivar** (`is_active`) |
| Archivar artículo con historial | Alto | Confirmar archivo (hoy a veces `window.confirm`; preferir modal) | `Artículo archivado` | Permiso / fallo de persistencia | Sí | Solo si existe restaurar | **Archivar** |
| Eliminar artículo sin historial | Moderado | Confirmar eliminación | Artículo eliminado | Fallo de borrado | Sí | No (o recrear) | **Eliminar** |
| Desactivar usuario | Alto | Confirmar; conservar perfil | `Usuario desactivado` | Sin permiso | Sí | Activar de nuevo | **Desactivar** |
| Desactivar modalidad horaria | Moderado | Icono dedicado (no toggle accidental); conservar horas | Feedback breve | Fallo de guardado | No (si es reversible y explícito) | Restaurar modalidad | **Desactivar / ocultar** |
| Cancelar entrega / recolección | Alto | `ActionConfirmDialog` danger | Tarea cancelada + UI actualizada | Conflicto de estado | Sí | No automático | Cancelar tarea (no borrar envío) |
| Cancelar ruta `draft`/`planned` | Alto–crítico | Confirmación; RPC atómico | Ruta cancelada | Estado no cancelable | Sí | No | Cancelar, no borrar historial |
| Confirmar programación logística | Alto | Panel de confirmación con resumen | Programado / toast o estado | Día sin ruta, validación | Sí (paso de confirmación) | Editar programación | N/A |
| Registrar cobro / pago de invoice | Alto–crítico | Monto validado ≤ saldo; idempotencia | Pago registrado | Excede saldo / permiso | Confirmación del flujo de cobro | No (reverso solo por flujo auditable) | N/A |
| Completar tarea de conductor | Alto | Diálogo de resultado; idempotencia de attempt | Tarea completada | Estado inválido / red | Según diálogo de resultado | No | N/A |
| Excepción administrativa de tarea | Crítica | Modal con motivo + riesgo + auditoría | Excepción registrada | Validación de motivo/riesgo | Reforzada | No | No es el flujo normal |
| Cambio en ruta `in_progress` | Alto | `LiveRouteChangeReasonDialog`; motivo ≥ 3 | Cambio aplicado + aviso a conductor | Validación | Sí + motivo | No | Solo paradas pendientes |
| Eliminar entrada de Bitácora | Alto | Razón obligatoria; soft delete | Entrada eliminada | Sin permiso / validación | Sí + razón | No (queda rastro) | **Soft delete** |
| Crear venta (invoice) | Alto | Flujo multi-paso; RPC atómico; idempotencia | Invoice creado | Stock/ruta/validación | Confirmación final del flujo | No | N/A |
| Venta sin stock | Alto | Validación de servidor + RPC atómico | No aplica | Stock insuficiente / cambio concurrente | Confirmación final no se completa | Corregir cantidades o esperar entrada | No se crea invoice ni pendiente |
| Archivar empresa (Plataforma) | Crítica | Confirmación reforzada | Empresa archivada | Permiso plataforma | Reforzada | No | **Archivar** |

---

## 19. Tabla de decisiones rápidas

| Situación | Acción recomendada |
| --- | --- |
| Acción reversible y de bajo impacto | Ejecutar inmediatamente y mostrar feedback |
| Acción reversible pero relevante | Ejecutar y ofrecer Deshacer |
| Pérdida potencial de datos | Solicitar confirmación |
| Acción irreversible de alto impacto | Usar confirmación reforzada |
| Registro con historial o dependencias | Desactivar o archivar |
| Operación en proceso | Mostrar carga y prevenir doble envío |
| Dinero, stock o estado de ruta | Autoridad en servidor/RPC; UI solo orquesta |
| Fallo de dependencia obligatoria | Bloquear solo esa acción y explicar dónde configurar |
| Fallo de dependencia opcional | Continuar la operación principal y marcar pendiente |
| Timeout tras enviar comando idempotente | Reutilizar clave; no crear segunda intención |
| Advertencia no bloqueante (p. ej. stock) | Toast/info + pendiente; no aparentar rollback de la venta |
| Acción frecuente vs destructiva | Separar en menú/jerarquía; destructiva al final |
| Motivo de cambio operativo | Modal dedicado, nunca `window.prompt` |
| Clic derecho en fila | Solo menú; no navegar al detalle automáticamente |

---

## 20. Checklist de revisión

Usar en pull requests o revisión de funcionalidades:

- [ ] ¿La acción da retroalimentación inmediata?
- [ ] ¿Puede ejecutarse accidentalmente dos veces?
- [ ] ¿Es reversible? Si lo es, ¿hay Deshacer o camino de restauración?
- [ ] ¿La confirmación es realmente necesaria o genera fatiga?
- [ ] ¿El usuario entiende las consecuencias (texto específico, no “¿Está seguro?”)?
- [ ] ¿El botón de confirmación nombra la acción (`Archivar…`, `Cancelar…`)?
- [ ] ¿Existe `Cancelar` claro y Escape cierra sin ejecutar?
- [ ] ¿Existe opción de recuperación ante error (reintento, datos conservados)?
- [ ] ¿Funciona con teclado y el foco es visible?
- [ ] ¿El estado se comunica sin depender solo del color?
- [ ] ¿Los errores explican cómo continuar y no exponen detalles internos?
- [ ] ¿Se conserva la integridad de los datos (auditoría, soft delete, no inventar datos)?
- [ ] ¿Si hay historial/dependencias se archiva o desactiva en lugar de borrar?
- [ ] ¿Las operaciones sensibles usan idempotencia cuando el dominio lo define?
- [ ] ¿La UI evita mostrarse como autoridad de saldo, stock o permisos?
- [ ] ¿Se respetaron preferencias rechazadas en `docs/GUIA_ESTILO_UI.md`?
- [ ] ¿Si cambió una regla de negocio o de interacción durable, se documentó en el doc correspondiente?

---

## Relación con otros documentos

| Documento | Responsabilidad |
| --- | --- |
| `docs/GUIA_ESTILO_UI.md` | Apariencia, densidad, copy visual, preferencias UI rechazadas |
| `docs/REGLAS_NEGOCIO_Y_DEPENDENCIAS.md` | Efectos en datos, dependencias, auditoría |
| `docs/ARQUITECTURA.md` | Capas, fuentes de verdad |
| `docs/GUIA_DESARROLLO.md` | Checklist de contribución y errores de actions |
| `docs/DECISIONES_TECNICAS_Y_COMPATIBILIDAD.md` | Infra, red, idempotencia técnica, compatibilidad |
| `docs/MAPA_FUNCIONAL_ACTUAL.md` | Qué está funcional / parcial / prototipo |

### Registro de decisiones de interacción

Cuando el usuario defina un comportamiento durable de confirmación, deshacer, riesgo o recuperación, **debe** registrarse aquí (o en `GUIA_ESTILO_UI.md` si es solo presentación) con fecha, contexto, decisión y resultado.

**2026-08-09 — Confirmación de entrega requiere selección explícita del día:** el modal de `Chofer entrega` puede calcular un próximo día disponible como apoyo visual, pero esa fecha no cuenta como una selección del usuario. `Aceptar` y su callback deben permanecer bloqueados hasta que se elija un día válido y, al confirmarlo, `Siguiente` debe seguir bloqueado hasta recibir esa confirmación. Resultado: abrir el modal y aceptar sin tocar ningún día no cierra la programación ni permite avanzar al paso siguiente.

**2026-08-07 — Menú Más en navegación móvil:** el botón inferior `Más` debe responder al toque y abrir un panel visible por encima de la barra inferior; el panel se vincula al disparador con `aria-controls` y conserva un área táctil explícita. Resultado: el primer toque comunica inmediatamente que el menú se abrió y la barra inferior no tapa el panel ni intercepta sus opciones.

**2026-08-07 — Revisión táctil del menú Más:** la capa del panel no debe bloquear los enlaces de la barra inferior cuando el menú está abierto; la barra conserva prioridad táctil y navegar la cierra. Resultado: abrir `Más` no impide volver a `Nueva venta` ni seleccionar remitentes.

**2026-08-07 — Toque fuera del panel Más:** el fondo oscurecido es visual y no debe capturar el toque; el panel sí recibe interacción y un toque fuera lo cierra mediante detección externa. Resultado: tocar una tarjeta detrás del panel puede cerrar el menú y ejecutar la selección en el mismo gesto.

**2026-08-03 — Altas de país:** el botón bloquea doble ejecución, el guardado explícito y el autoguardado comparten una cola serializada, y una escritura del mismo snapshot ya confirmado se omite. El backend conserva la autoridad de unicidad. Resultado: no hay dos solicitudes concurrentes producidas por una sola intención de alta y un fallo mantiene el país seleccionado para reintentar.

**2026-08-04 — Cobros configurables:** la interfaz solo ofrece métodos habilitados para el contexto (oficina o conductor), selecciona el predeterminado vigente y bloquea el envío cuando el método exige referencia. El servidor repite las mismas validaciones. Resultado: ocultar un método no es solo presentación y una manipulación del formulario no elude la política de cobro.

**2026-08-04 — Confirmación de ruta con controles operativos:** cierre del día anterior, fecha especial, capacidad y cobertura postal se verifican inmediatamente antes de confirmar la programación. Un rechazo conserva la selección para corregirla y devuelve el motivo concreto. Resultado: no se crea una parada parcial cuando la regla operativa falla. La antigua anticipación mínima por horas fue retirada; no debe aplicarse como restricción oculta.

**2026-08-04 — Cargo automático por recolección vencida:** antes de ordenar la recogida, Seguimiento avisa el importe cuando el plazo ya terminó. El servidor compara la entrega real con `ordered_at`, usa la política congelada en la venta y aplica el cargo mediante un comando idempotente; reintentar no duplica el cargo. La mutación actualiza total, saldo y estado contable juntos y escribe historial/auditoría. Resultado: el precio no depende del reloj del cliente ni de una demora de ruta y un fallo puede reintentarse sin doble cobro.

**2026-08-04 — Activación atómica de un día de ruta:** encender un día abre primero la captura obligatoria de inicio y fin; no cambia la disponibilidad hasta pulsar `Activar`. El servidor guarda horario, capacidad, cierre propio opcional y disponibilidad en una sola transacción. Cancelar no modifica datos y un error conserva los campos para reintentar. Las subrutas repiten la validación obligatoria en servidor. Resultado: no queda un día parcialmente habilitado ni una ruta nueva sin horario operativo.

**2026-08-04 — Fin abierto de ruta:** inicio sigue siendo obligatorio, pero marcar `Sin hora de fin` permite activar o guardar con el fin nulo. La casilla limpia y deshabilita el campo de fin para evitar valores contradictorios; desmarcarla vuelve a exigir una hora posterior al inicio. El servidor repite la misma regla. Resultado: el operador puede modelar una ruta que termina al completar el recorrido sin inventar datos.

**2026-08-04 — Cierre uniforme al agregar cajas:** programación, selector de ruta, alta normal y edición operativa consultan la misma política efectiva (propia o global) antes de insertar la parada. El rechazo ocurre antes de cualquier escritura y conserva la tarea disponible para otra fecha. Resultado: cambiar de pantalla o usar una edición con motivo no permite agregar cajas después del cierre.

**2026-08-05 — Fecha obligatoria para entrega por chofer:** en la venta normal y la venta rápida, elegir chofer obliga a seleccionar una fecha antes de confirmar. La ruta y el conductor pueden quedar pendientes. El botón permanece bloqueado con una explicación concreta y el servidor repite la validación, incluyendo la creación de la tarea de entrega vinculada a la fecha. La entrega inmediata en oficina queda exenta. Resultado: no se confirma una venta de chofer sin compromiso de entrega y un formulario manipulado no elude la regla.

**2026-08-05 — Límites de capacidad explícitos:** `Max. paradas` y `Max. cajas` permanecen contraídos bajo `Limitar paradas y cajas`. Activar la opción revela ambos campos; desactivarla los limpia y el guardado envía valores nulos para evitar restricciones ocultas. Las rutas con al menos un límite persistido abren la opción activa. Resultado: la configuración visible siempre coincide con la capacidad que realmente se aplicará.

**2026-08-05 — Activación de días sin recargar el catálogo:** activar o desactivar un día actualiza la tarjeta localmente y conserva el calendario montado mientras los datos se sincronizan con el servidor. El cargador de página se reserva para la carga inicial, no para mutaciones del calendario. Resultado: no se pierde el día seleccionado ni se produce un salto visual que parezca una recarga completa.

**2026-08-07 — Sincronización del calendario con Rutas:** cuando se activa o desactiva un día desde `Calendario y subrutas`, la mutación debe invalidar también el catálogo compartido que consume `Rutas`. Cambiar a la pestaña `Rutas` dentro de la misma navegación debe mostrar los nuevos días sin exigir una recarga completa de la página. Resultado: la configuración y la operación no pueden quedar con catálogos distintos durante la misma sesión.

**2026-08-05 — Actualización silenciosa del board:** la carga inicial, el retorno a la pestaña y el refresco periódico de Logística no muestran confirmaciones de éxito. La sincronización continúa en segundo plano y solo comunica errores relevantes. Resultado: no se acumulan toasts `Board actualizado`; los avisos quedan asociados a acciones reales del usuario o problemas que necesitan atención.

**2026-08-05 — Conductor predeterminado por nivel de ruta:** cambiar el conductor de la ruta general o de una subruta persiste inmediatamente en el control correspondiente, lo deshabilita durante el guardado y conserva el valor previo si el servidor rechaza la operación. La programación vuelve a resolver el valor en servidor según la ruta elegida. Resultado: una subruta nunca hereda silenciosamente el conductor general del día.

**2026-08-05 — Creación y cierre de rutas operativas:** `Crear ruta` procesa atómicamente todas las reservas visibles del mismo grupo y reutiliza una clave de idempotencia mientras un reintento siga pendiente; no pide confirmación porque deja una ruta abierta y editable. `Cerrar ruta` sí usa `ActionConfirmDialog`, resume la cantidad de paradas y explica que ya no se podrán agregar, quitar ni reordenar cajas normalmente. Durante ambas acciones el control queda bloqueado contra doble envío y un error conserva las reservas o la ruta abierta para corregir y reintentar. Resultado: un timeout no duplica recorridos y el operador conoce la consecuencia del cierre antes de ejecutarlo.

**2026-08-05 — Asignación posterior al cierre:** los selectores de conductor y vehículo no aparecen como controles operativos en una ruta `draft`; se habilitan únicamente cuando la ruta está `planned` (`Cerrada`). Cada asignación bloquea su propio control, espera confirmación del servidor y conserva el valor anterior si falla. Resultado: el conductor nunca recibe un recorrido que Logística todavía está armando.

**2026-08-05 — Activas vs Historial en Tareas:** el toggle recarga rutas (`statusMode` active/history) y el listado de invoices cambia de criterio: Activas = sin ruta operativa; Historial = invoices que ya estuvieron en una ruta terminada. Resultado: ya no se ven los mismos invoices en ambos modos.

**2026-08-10 — Filtro Estado por pierna:** en Seguimiento, el filtro Estado empieza por `Recolecciones` y `Entregas` (submenú `Pendientes` / `En logística`), luego `En oficina` y `En tránsito`. Se retiraron los atajos transversales que mezclaban ambas piernas. Valores viejos `pendientes` / `en_logistica` en URL o sesión se descartan. Resultado: el menú sigue el modelo mental dejar/recoger → pendiente o ya en Logística.

**2026-08-05 — Pendiente vs en Logística (chip + filtro):** en Seguimiento, el chip de Dejar/Recoger y el filtro Estado usan la misma regla: sin tarea abierta = pendiente; con tarea abierta = en logística. Visual del chip: ámbar outline = pendiente, cian relleno = en logística, verde = hecho. Tarjeta/fila: solo fondo teñido (ámbar/cian), sin riel ni anillo. Nodos del riel de progreso más grandes. El chip refina el copy dentro de logística (`solicitada` sin ruta operativa; `para el día` / `programada` con ruta). El filtro cerrado muestra `… pendiente` / `… en logística`. Resultado: se distingue de un vistazo lo no enviado de lo ya en Logística.

**2026-08-05 — Submenú contextual dentro del viewport:** los flyouts de menú contextual (`Marcar estado`, `Copiar`, etc.) miden el espacio disponible al abrir y, si no caben a la derecha, se abren a la izquierda; si no caben abajo, se alinean al borde inferior del ítem. Resultado: el panel no queda cortado por el borde de la pantalla.

**2026-08-05 — Quitar filtro de estado en Seguimiento:** cuando el picker de estado (o país) tiene un valor, muestra `X` para limpiarlo y volver a todos los envíos. El chevron permanece al abrir o sin filtro. Resultado: no hace falta recargar ni adivinar cómo salir de un estado filtrado.

**2026-08-05 — Filtro Entregas/Recolecciones con submenú:** en Seguimiento, `Recolecciones` y `Entregas` abren un submenú (`>`) con `Pendientes` y `En logística` (sin `Todas`). Clic en el padre selecciona todo el bucket; hover abre el submenú para acotar. `Pendientes` = sin tarea logística abierta; `En logística` = con tarea abierta. Resultado: un clic cubre ambas y el submenú queda solo para el detalle.

**2026-08-05 — Chip de entrega coherente con la reserva:** en Seguimiento, una entrega/recolección con fecha pero sin ruta operativa se etiqueta `solicitada` (p. ej. `Entrega solicitada para el jueves`) y el menú dice que el pedido ya fue enviado a Logística. Solo tras entrar a una ruta operativa el chip pasa a `para el {día}` / `programada` y el menú a `Ya está en una ruta`. Resultado: el texto del chip y el de “enviar a Logística para confirmar” no se contradicen.

**2026-08-05 — Menú de Dejar unificado:** en Seguimiento, el paso `Dejar` activo abre el mismo menú con clic izquierdo o derecho. Muestra `Entregar en oficina` (mostrador inmediato) y `Programar entrega` (chofer) como botones visibles, sin submenú por hover ni opciones repartidas entre gestos. Resultado: oficina y chofer se eligen igual que en Recoger y no dependen del clic derecho.

**2026-08-05 — Menú contextual de tareas:** en Tareas, el clic derecho sobre una tarea elegible abre un menú contextual. Si la tarea tiene una reserva pendiente, ofrece `Crear ruta` o `Agregar a ruta abierta` (mismo efecto que en Operativas, con el grupo plantilla+fecha completo). También puede ofrecer `Asignar a ruta` para meterla en una ruta operativa ya abierta mediante el selector existente. Las tareas ya asignadas, completadas o canceladas no muestran esas opciones. El menú se cierra al hacer clic fuera o pulsar `Escape`. Resultado: Logística puede confirmar una reserva o asignar a una ruta abierta sin salir de Tareas ni crear rutas a medias.

**2026-08-05 — Cierre automático y manual de rutas preparadas:** agregar una reserva a la ruta `En preparación` confirma que Logística acepta atenderla. La ruta se puede cerrar manualmente con la confirmación existente o automáticamente al llegar su cierre efectivo del día anterior. El proceso automático reutiliza las validaciones críticas del cierre: al menos una parada, geo válida y fechas confirmadas. Si alguna falla, no fuerza el estado ni oculta el problema; la ruta permanece en preparación. Desde el límite, la base de datos rechaza nuevas rutas o paradas para esa fecha. Resultado: no hay doble envío al conductor ni cajas agregadas después del cierre.

**2026-08-05 — Revertir recepción en oficina:** cuando Recoger está bloqueado por una recepción en oficina reversible, el menú muestra `Revertir recepción en oficina` además del motivo del bloqueo. La acción pide confirmación con `ActionConfirmDialog` (tono `warning`, botón `Revertir recepción`), bloquea el progreso mientras corre y notifica éxito o error. Tras confirmar, el invoice vuelve a pendiente de recolección. Resultado: un clic accidental no queda sin recuperación antes de salida.

**2026-08-05 — Selección de remitente en celular (actualizada):** la lista de remitentes no usa `pointer-events-none` mientras busca o recarga; solo puede atenuarse el estado vacío inicial. Las tarjetas, filas, `Rápido`, orden y `Nuevo` usan superficies directas con `touch-action: manipulation`, sin capas absolutas que alternen `pointer-events`. El menú contextual escucha únicamente `contextmenu`: no registra `pointerup` ni `mouseup` globales o en captura, porque esos eventos pertenecen también al gesto táctil normal. La recarga limpia el estado de carga aunque la petición falle. Resultado: tocar una acción ejecuta esa acción y tocar el remitente avanza a Destinatario, sin que la compatibilidad con clic derecho intercepte el flujo touch.

**2026-08-05 — Filtros de Seguimiento al salir y volver:** estado, país, vendedor, búsqueda y readiness se guardan en `sessionStorage` (`boxario.seguimiento.filters.v1`) y se reflejan en la URL (`status`, `country`, `seller`, `q`, `ready`). Al volver desde el menú a `/seguimiento` se restauran; un enlace con parámetros gana solo en las claves que trae. Resultado: filtrar, cambiar de pantalla y regresar conserva el mismo filtro sin reconstruirlo.

**2026-08-05 — Filtros y actualización de Estadísticas:** periodo y filtros comparten una única URL y se aplican juntos a todas las secciones. Al actualizar, la pantalla conserva el último informe válido, marca la región como ocupada e ignora respuestas obsoletas; un error ofrece reintento sin borrar el contexto. El drawer móvil devuelve el foco al control que lo abrió, cierra con Escape y bloquea el scroll de fondo. Resultado: cambios rápidos no sustituyen un informe nuevo por uno antiguo y la recuperación no obliga a reconstruir filtros.

**2026-08-09 — Pestañas de Estadísticas sin recarga:** `Compañía` y `Logística` comparten el informe ya cargado. Cambiar de pestaña actualiza `tab` en la URL sin disparar otra consulta; cambiar periodo o filtros sí vuelve a cargar ambas vistas juntas, conserva el último informe válido durante la espera e ignora respuestas obsoletas. Resultado: alternar entre economía y operación es inmediato y nunca compara filtros distintos por accidente.

**2026-08-09 — Barra operativa única en Estadísticas:** las pestañas, el periodo, los filtros y las acciones de actualizar, exportar e imprimir viven en una sola franja compacta. CSV e Imprimir permanecen accesibles también en móvil; al envolver, el orden conserva primero navegación y contexto, después los controles. Resultado: quitar el título permanente no oculta acciones ni altera la sincronización del informe.

**2026-08-09 — Riesgos como pestaña de trabajo:** `Riesgos` comparte el informe, periodo y filtros con `Compañía` y `Logística`; cambiar a ella actualiza únicamente `tab=risks` en la URL y no vuelve a consultar. Su contador refleja elementos de atención respaldados por datos, cada elemento conserva su enlace de siguiente acción y CSV exporta riesgos, cobertura y límites de interpretación. Resultado: revisar una alerta sigue siendo inmediato y trazable sin mezclarla con el informe económico.

### 2026-08-07 - Confirmar, rechazar y actualizar desde el tablero

**Decisión:** El botón ✓ confirma una solicitud y la pasa a Plantillas. El botón ✕ abre un motivo obligatorio y la devuelve a Seguimiento para corrección, conservando auditoría. `Actualizar ruta` bloquea el grupo durante la operación, usa una clave de idempotencia y, si alguna validación falla, conserva la versión publicada sin cambios.

**Resultado:** La acción no se duplica con toques repetidos y una solicitud nunca desaparece silenciosamente del flujo.

### 2026-08-06 - Confirmaciones críticas de cobertura y creación de rutas

**Contexto:** Cambiar cobertura u horarios puede sacar solicitudes de una plantilla, y convertir una plantilla puede duplicar recorridos bajo concurrencia.

**Decisión:** Quitar un ZIP, desactivar un horario con reservas o archivar una ruta exige confirmación visible y motivo cuando corresponda; las solicitudes afectadas vuelven a Tareas con razón automática y auditoría. Rechazar o dejar pendiente una solicitud siempre exige motivo. El chulito es permanente para la combinación ruta + dirección exacta, pero no crea recorridos.

`Crear ruta` debe bloquearse con `pending_approval`, volver a validar día, horario, cobertura y capacidad, bloquear las solicitudes en la transacción y aceptar una clave de idempotencia. Una repetición devuelve el mismo recorrido; nunca duplica paradas. Un fallo de Google Maps o Census solo muestra `Límite geográfico no disponible` y no impide guardar ni vender.

**Resultado:** Las acciones de alto impacto son explícitas, auditables y recuperables mediante Tareas, mientras los recorridos ya creados permanecen inmutables ante cambios futuros de catálogo.
**2026-08-07 — Ruta general sin paso redundante:** en el flujo de Seguimiento date-first, seleccionar un día que solo tiene la ruta general debe conservar el identificador implícito del día y confirmar desde `Día y hora`. El paso `Ruta`, `No sé la ruta todavía` y la selección adicional aparecen únicamente cuando existen subrutas nombradas. Resultado: el usuario no decide dos veces la misma ruta y las subrutas siguen requiriendo una elección explícita.

**2026-08-09 — Grupos de Plantillas:** expandir o contraer una ruta preparada es una acción de consulta de bajo riesgo. Los grupos de `Solicitudes listas para preparar` empiezan cerrados, el control mantiene una flecha y un estado accesible, y abrirlos no ejecuta ni confirma acciones operativas. `Crear ruta` y `Actualizar ruta` permanecen como controles independientes y conservan su bloqueo contra doble envío.

**2026-08-09 — Cambio de etapa al crear ruta:** al completar `Crear ruta`, la interfaz confirma el nombre creado y navega a `Rutas`, donde el recorrido real queda visible como `En preparación`. La mutación conserva su clave de idempotencia, bloqueo contra doble envío y recuperación de errores; si falla, el grupo permanece en `Preparación` para corregir o reintentar.

**2026-08-09 — Selección parcial en Preparación:** `Crear ruta`, `Agregar a ruta` y `Actualizar ruta` permanecen deshabilitados hasta que exista al menos una solicitud marcada y reciben únicamente los identificadores seleccionados. `Todas` marca o desmarca el grupo visible; una selección parcial se representa como estado indeterminado. Mientras la mutación está activa se bloquean selección y acción para evitar que el conjunto cambie durante el envío.

**2026-08-09 — Detalle de ruta después de crear:** seleccionar internamente la ruta recién creada no debe renderizar su panel mientras la pestaña visible siga siendo `Preparación`. El detalle solo puede aparecer en `Rutas` o `Historial`; durante la transición se mantiene la superficie de Preparación estable y después se completa la navegación normal.

### 2026-08-09 - Ejecución de paradas, evidencia y cobro del conductor

**Contexto:** La página del conductor debe cubrir la preparación de la ruta y el resultado real de cada parada, incluido el caso en que se recoge una caja pero el cliente todavía debe dinero.

**Decisión:** La ruta guía el orden de interacción. Antes de salir se revisan faltantes y se inicia la ruta; durante el recorrido cada parada ofrece `Completada` o `No se pudo`; al terminar las visitas se muestra el regreso a bodega. Cambiar entre las vistas internas es una acción de consulta y no altera estados por sí sola.

**Reglas de resultado:**

- `Completada` abre un único flujo de confirmación con foto obligatoria, validaciones de la caja correspondiente y, si existe saldo cobrable, la decisión de pago.
- `No se pudo` exige seleccionar un motivo y permite una nota breve. La confirmación escribe el intento y la bitácora, mantiene la evidencia adicional cuando el motivo la requiere y nunca simula un movimiento de caja o un cobro.
- Si hay dinero pendiente, el conductor elige entre el importe esperado, otro importe válido o `No recibí dinero`. Un importe no puede superar el saldo; el método debe estar habilitado para conductor y la referencia sigue siendo obligatoria cuando la configuración lo exige.
- Recibir dinero y completar la parada forman una sola intención idempotente: los controles se bloquean durante el envío y un reintento no duplica ni el resultado, ni el movimiento del camión, ni el pago.
- Sin conexión, el resultado puede mostrarse como `Guardado en este teléfono / pendiente de sincronizar`; el invoice no debe presentarse como saldado hasta que el servidor confirme el pago. Un error conserva motivo, nota, selección de pago y evidencia para reintentar.
- `No recibí dinero` completa únicamente la operación física permitida y conserva el cobro pendiente con registro en bitácora. Un pago parcial muestra el nuevo saldo; solo un saldo cero se comunica como `Saldado`.
- El arqueo y cierre de efectivo del conductor no se incluyen todavía. Registrar el pago no equivale a cerrar su caja diaria.

**Resultado:** La persona puede completar o justificar cada visita con una sola interacción comprensible, mientras los estados visibles distinguen resultado físico, sincronización y situación del cobro.

### 2026-08-09 - Entrega sin cobro con motivo registrado

**Contexto:** Una caja vacía puede quedar entregada aunque no haya una persona disponible para pagar el depósito. La interfaz debe ser permisiva con la operación real sin perder evidencia ni trazabilidad financiera.

**Decisión:** El flujo confirma primero si la entrega o recolección física ocurrió y después pregunta por el dinero. `No recibí dinero` no revierte ni cancela una operación física completada.

**Reglas de interacción:**

- Si la operación física ocurrió, se exige la foto de evidencia habitual y se permite continuar aunque el importe recibido sea cero.
- Al elegir `No recibí dinero`, la persona selecciona una razón breve o escribe una nota obligatoria, por ejemplo `Cliente ausente` o `Cliente no pudo pagar`.
- Antes de guardar, el resumen debe comunicar simultáneamente `Caja entregada/recogida` y `Cobro pendiente`, evitando una confirmación que sugiera que ambos resultados son iguales.
- La bitácora registra el resultado físico, el importe cero y el motivo. El saldo del invoice no cambia y vuelve a ofrecerse en una visita posterior elegible.
- Si la caja no se dejó o no se recogió, se usa `No se pudo`; ese flujo conserva su motivo obligatorio y no registra el movimiento físico.
- La escritura del resultado y del cobro conserva idempotencia. Un reintento no duplica la entrega, la recolección, la evidencia ni un pago posterior.

**Resultado:** La aplicación permite trabajar con situaciones reales de calle sin convertir una deuda pendiente en una visita fallida ni perder la explicación de por qué no se cobró.

### 2026-08-09 — Menús flotantes fuera de capas recortables

**Contexto:** varios menús visibles dentro de barras desplazables o paneles con `overflow` recibían el clic, pero su contenido quedaba recortado y parecía que el control no respondía.

**Decisión:** todo menú, ayuda o panel flotante anclado a un botón debe usar la capa compartida renderizada en `document.body`, calcular su posición contra el viewport y reajustarse con scroll o cambio de tamaño. No se deben crear desplegables flotantes con `details` + `absolute`/`fixed` dentro de la superficie de la página.

**Resultado:** los controles flotantes permanecen visibles y clicables en cualquier página aunque sus barras, tablas o paneles usen desplazamiento o recorte interno.
### 2026-08-10 - Navegación libre en el mapa de cobertura

**Contexto:** Al arrastrar el mapa de cobertura por lugares, pasar el cursor por un contorno o pin reencuadraba el mapa o robaba el gesto y cortaba la navegación.

**Decisión:** `fitBounds` solo cuando cambia el conjunto de cobertura, no en hover ni highlight. Los contornos de lugar no son clicables ni capturan el arrastre; el hover bidireccional usa los pines. Mientras el mapa se arrastra, se ignora highlight y clic de agregar.

**Resultado:** El operador puede panear y hacer zoom sin que un cuadro o pin interrumpa el gesto.

### 2026-08-10 - Hover del nombre muestra sombra preview de la zona

**Contexto:** Al pasar el mouse por un nombre en la lista, el contorno en el mapa casi no se notaba; el operador pedía una “preview” / sombra del área.

**Decisión:** Hover de nombre (lista) o pin (mapa) aplica relleno suave y trazo marcado de esa zona y atenúa las demás; no mueve la cámara. Al quitar el mouse de la lista/nombre, la sombra se apaga (no queda pegada). No es cobertura permanente ni el perímetro cielo de “ampliar cobertura”.

**Resultado:** Se ve de un vistazo qué área corresponde al nombre señalado, solo mientras se señala.

### 2026-08-10 - Selección y desplazamiento del rango operativo

**Contexto:** Logística necesitaba consultar Por confirmar, Preparación y Rutas dentro de fechas personalizadas, además de avanzar por semanas completas.

**Decisión:** Pulsar el periodo abre un panel flotante compartido en `document.body`; el primer toque elige el inicio y el segundo el final, y la lista no cambia hasta pulsar `Aplicar rango`. Ambas fechas se incluyen en el filtro, el intervalo se ordena aunque el segundo día sea anterior al primero y `Aplicar rango` permanece bloqueado mientras falte el segundo límite. En un rango personalizado, Anterior/Siguiente desplazan el intervalo completo por su propia duración; Hoy restablece la semana operativa actual. Cambiar el periodo limpia selecciones de solicitudes, día o ruta que ya podrían no estar visibles.

**Resultado:** La persona puede explorar un intervalo sin aplicar estados intermedios ni ejecutar acciones sobre elementos ocultos por un cambio de fechas.

### 2026-08-12 - Indicadores operativos estables desde la carga inicial

**Contexto:** Al navegar entre `Por confirmar`, `Preparación` y `Rutas`, los conteos de trabajo pendiente se obtenían después del primer render. El botón aparecía primero neutro y después cambiaba a amarillo con su cantidad, produciendo un destello engañoso.

**Decisión:** Los datos que determinan conteos y estados visuales de la navegación operativa deben resolverse en la carga del servidor y entregarse como estado inicial. La actualización en segundo plano puede refrescarlos, pero no debe reiniciarlos temporalmente en cero ni quitar su estilo mientras responde.

**Resultado:** La navegación muestra desde el primer cuadro el mismo conteo y color que tendrá después de hidratarse, sin parpadeo gris ni cambio tardío de jerarquía.
### 2026-08-13 - Guardado explícito del pin y la vista de calle

**Contexto:** Arrastrar un pin o explorar Street View son acciones de prueba y no deben sobrescribir silenciosamente una ubicación ya confirmada.

**Decisión:** Buscar, mover el pin y orientar la cámara dentro de la ventana flotante son borradores locales hasta pulsar `Usar esta entrada`; cerrar o cancelar no guarda el pin. Elegir una sugerencia sí completa la dirección postal validada en el formulario para que el vendedor pueda revisarla. `Restablecer pin` recupera la coordenada geocodificada y el mapa sigue siendo opcional cuando el cliente no puede confirmarlo o Google no está disponible.

**Resultado:** El vendedor controla qué referencia se persiste y una falla del mapa no bloquea el alta del contacto.
### 2026-08-13 - Ventana separada y movimiento directo del pin de entrada

**Contexto:** el vendedor necesita conservar Venta en un monitor y entregar al cliente el mapa en otro; además, el marcador debe poder corregirse sin una acción secundaria de restablecimiento.

**Decisión:** `Abrir mapa` debe ejecutarse desde el gesto del usuario y abrir una ventana emergente real. Si el navegador la bloquea, el formulario muestra una advertencia recuperable para permitir popups de Boxario. Cerrar la ventana nativa, `Cancelar` o la X descarta el borrador no confirmado. Hay un único pin rojo con arrastre directo; esta decisión reemplaza las indicaciones anteriores de ofrecer `Restablecer pin`. Solo `Usar esta entrada` confirma las coordenadas y la nota.

**Resultado:** la ventana puede moverse a otro monitor, no queda abandonada al cerrar o desmontar el formulario y el cliente corrige la entrada mediante una sola interacción inequívoca.
### 2026-08-14 - Ubicar direccion desde una tarjeta

**Contexto:** abrir una direccion debe permitir corregir el pin, pero no guardar cambios por accidente al explorar el mapa.

**Decision:** el clic en la direccion abre la ventana emergente compartida. Geolocalizar, arrastrar el pin, cambiar vista o consultar Street View son borradores; solo `Confirmar ubicacion` persiste. El boton bloquea doble envio y, si falla el guardado, la ventana permanece abierta con el error.

**Resultado:** remitentes y destinatarios tienen una correccion exacta recuperable sin perder el punto previamente guardado.
### 2026-08-14 - Cambio de ruta reencuadra el mapa

**Contexto:** una ruta fuera de cobertura podia quedar seleccionada en la barra sin que el mapa mostrara su zona.

**Decision:** cada clic de ruta genera una solicitud explicita de reencuadre. Si la ruta no tiene contorno disponible pero si un centro, se usa ese centro como respaldo; el foco del cliente se conserva para el boton `Ir a direccion del cliente`.

**Resultado:** Ruta norte, Ruta sur y `Todas las rutas` tienen una respuesta visual consistente al cambiar de vista.
### 2026-08-14 - Confirmacion del pin de cobertura

**Contexto:** arrastrar un pin cambia una coordenada operativa y debe poder recuperarse si el usuario se equivoca.

**Decision:** arrastrar solo modifica el borrador local. `Confirmar pin exacto` o `Guardar ubicacion exacta` es la unica accion que persiste; el boton bloquea doble envio, muestra carga y conserva el borrador si falla. El guardado genera una entrada en la bitacora con antes/despues y actor.

**Resultado:** cerrar el mapa sin confirmar no cambia la direccion exacta; los cambios confirmados quedan auditables para Ventas y Logistica.

### 2026-08-14 - Consulta interna de rutas desde la dirección

**Contexto:** el vendedor necesita consultar las rutas de recolección antes de informar al cliente, incluso mientras captura una dirección nueva.

**Decisión:** `Ver rutas y coberturas` muestra carga y errores recuperables, bloquea el doble envío y consulta la dirección vigente. Cambiar de ruta solo cambia la vista del mapa. Mover el pin dentro del comparador conserva un borrador local; únicamente `Confirmar pin exacto` o `Guardar ubicación exacta` persiste la coordenada.

**Resultado:** una consulta fallida no borra los datos del formulario ni bloquea el alta, y cerrar el comparador sin confirmar deja intacta la entrada exacta guardada.
### 2026-08-14 — Edición parcial de importes monetarios

**Contexto:** Al cambiar un importe como `$20`, borrar el primer dígito dejaba temporalmente `0`. La normalización inmediata lo convertía en `$0` y la interfaz ocultaba el cero, impidiendo escribir el nuevo valor.

**Decisión:** Los campos monetarios conservan un borrador de texto independiente mientras el usuario escribe. La normalización a formato persistible ocurre en el estado de configuración y al guardar, pero no reemplaza el texto parcial visible durante cada tecla. Esto permite editar `20` como `30`, borrar el campo o introducir un valor desde cero sin perder el foco ni el cursor.

**Resultado:** La edición de depósito y cargos monetarios admite borrado parcial y reemplazo directo; un valor vacío o cero continúa representando un importe desactivado únicamente al guardar.
