# Guía de desarrollo — Boxario

Estándares para código nuevo. Complementa `docs/ARQUITECTURA.md` y `AGENTS.md`.

## Antes de escribir

1. Identifica el **dominio** (ventas, envíos, logística, inventario, pagos, …).
2. Busca la **autoridad** en `docs/ARQUITECTURA.md` y `docs/REGLAS_NEGOCIO_Y_DEPENDENCIAS.md`.
3. Reutiliza helpers/actions existentes; no copies una regla “parecida”.
4. Si la regla no existe o está en conflicto: **documenta y pregunta**; no inventes.

## Al implementar

### Capas

- UI en `components` / `app/**/page.tsx`: presentación y orquestación de llamadas.
- Casos de uso en `app/actions`: authz, validación de entrada, llamada a dominio/RPC.
- Dominio en `lib`: puro cuando sea posible; sin imports a UI ni a actions.
- Integridad fuerte (dinero, stock, concurrencia, RLS): **PostgreSQL RPC/trigger**.

### Contratos

- Tipa comandos (`PublishRouteCommand`) en lugar de `patch: Record<string, unknown>`.
- No aceptes `organizationId` / `actorId` del cliente como autoridad.
- `ActionResult<T>` (`ok` / `fail`) para actions; mensajes vía `actionErrorMessage`.
- Sin `any`. Sin casts `as unknown as` nuevos.
- Nombres con unidad/intención: `quotedTotal`, `availableStock`, `routeDate`, `assignedDriverId`.

### Datos

- Listados: `limit` + `offset` (o cursor), orden estable (`created_at`, `id`), filtros en servidor.
- Selects mínimos. Batches para IDs/URLs firmadas (solo página visible).
- No cargar la organización completa “para filtrar en cliente”.

### Seguridad

- `requireAppSession` + `sessionHasPermission` / `canAccessWarehouse`.
- Scoped Supabase client. Default deny.
- Idempotencia en reintentos de RPC cuando el flujo lo permita.

### UI

- Seguir `docs/GUIA_ESTILO_UI.md` (densidad, sin intros permanentes, `CompactInfoDisclosure`).
- Preferencias rechazadas documentadas: no reintroducirlas.
- La UI **no** es fuente de verdad de saldo, stock ni permisos.

## Errores

Códigos internos habituales (lanzados como `Error(message)` y mapeados en `actionErrorMessage`):

| Código / condición | Usuario típico |
| --- | --- |
| `UNAUTHORIZED` | Sesión requerida |
| `FORBIDDEN` | Sin permiso |
| Validación de dominio | Mensaje corto seguro |
| SQL / interno | “No se pudo completar la operación” (`publicActionErrorMessage`) |

No compares mensajes humanos para ramificar lógica. No expongas SQL ni stacks.

## Antes de terminar

```bash
npm run quality:gate
```

Si tocaste schema, RPC, RLS o integridad de datos:

```bash
npm run quality:db
```

Además:

- Tests focalizados del módulo.
- Actualiza `REGLAS_…` / `DECISIONES_…` / `GUIA_ESTILO_UI` solo si hay decisión que deba perdurar.
- No commits con secretos, `.env`, ni `.jscpd-report/`.

## Ejemplos del repo

| Tarea | Referencia |
| --- | --- |
| Action paginada | `listLogisticsRoutesAction` + `logistics-routes-pagination.ts` |
| Preview TS + autoridad SQL | `logistics-state-machine.ts` + `update_logistics_task_atomic` |
| Pago conductor | `settleConductorPayment` → RPC collect |
| Inventario disponible | `availableEmptyBoxStock` + RPC movimiento |
| Conductor sin fan-out org | `loadConductorScopedBoard` |
| Drift tipos | `npm run check:db-types` |

## Qué no hacer en un PR “de calidad”

- Cambiar precios, FIN-004, RLS, estados, días operativos, Contabilidad.
- Dividir archivos solo para bajar líneas.
- Abstracciones YAGNI (plugins, factories genéricas).
- Unificar ledgers de agencia/envíos/071.
