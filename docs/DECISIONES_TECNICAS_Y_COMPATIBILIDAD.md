# Decisiones técnicas y compatibilidad

Este documento conserva decisiones de infraestructura, red, autenticación y compatibilidad entre dispositivos que no pertenecen al diseño visual.

## Registro de decisiones

### 2026-07-26 - Sugerencias horarias persistidas por empresa

**Contexto:** Las sugerencias visibles en Ventas no deben quedar fijas en el componente ni confundirse con el horario operativo de cada ruta.

**Decisión:** Las horas sugeridas para `Exacta`, `Antes de` y `A partir` se persisten en `organization_route_settings.schedule_suggestions`; los rangos de `Entre` continúan usando los rangos de servicio de esa misma configuración. El catálogo de rutas conserva la autoridad sobre `start_time` y `estimated_end_time`.

**Compatibilidad:** La migración agrega un JSONB opcional con respaldo vacío, por lo que las empresas existentes conservan sus rutas y reciben valores predeterminados hasta personalizarlos.

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

**Compatibilidad:** El rol Logística recibe su permiso automáticamente, Conductores no lo reciben y Administrador conserva acceso completo. La URL anterior `configuracion?view=deliveries` redirige a la configuración de Ventas en Seguimiento.

### 2026-07-27 - Escritura logística sin días ni horarios operativos

**Contexto:** Los primeros RPC separados de Logística todavía recibían días y rangos globales, aunque el catálogo semanal de Rutas ya contiene los campos `start_time` y `estimated_end_time` por plantilla.

**Decisión:** La interfaz usa `save_logistics_axis_settings_v3`, que sólo actualiza anticipación y cargos. Los RPC anteriores pierden ejecución para usuarios autenticados. Las ventanas sugeridas en Ventas se derivan en memoria de las plantillas del día seleccionado.

**Compatibilidad:** Los días y rangos globales existentes se conservan para lectura histórica, pero las versiones nuevas no los administran ni los usan para sugerencias. Los horarios vigentes viven en `logistics_route_templates`.

### 2026-07-26 - Estado actual y auditoría de la Bitácora

**Contexto:** Las notas y recordatorios necesitan edición operativa, mientras que las revisiones y eventos del sistema deben permanecer inmutables.

**Decisión:** `shipment_journal_entries` conserva el estado actual, asignación, recordatorio y borrado lógico. `activity_history` conserva eventos automáticos y cada revisión con antes/después, actor, fecha y razón de eliminación.

**Compatibilidad:** Los contactos existentes se migran conservando autor y fechas; la tabla anterior queda como respaldo sin nuevas escrituras. Los resultados offline del conductor continúan usando su operación idempotente y la Bitácora filtra eventos auxiliares para mostrar una sola entrada por resultado.
