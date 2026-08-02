# Operaciones de agencia

Documento de referencia del módulo de agencias (migración `072_agency_operations.sql` y comandos asociados).

## Custodia de cajas por cantidad (FIFO)

Las cajas de agencia se administran por **lotes y cantidades**, no como unidades individualizadas.

- **No tienen QR ni identidad individual.**
- El consumo usa FIFO por `delivered_at` / `id` del lote.
- Las diferencias entre solicitado y confirmado quedan registradas con motivo y evidencia.
- **No crean cargos, multas ni ajustes automáticos** por edad del lote o demora: cualquier cargo nace de una confirmación operativa explícita.

## Ruta predeterminada vs ruta operativa de la visita

- La asignación predeterminada (`agency_default_route_assignments`) es **histórica**: conserva vigencia con `ended_at`.
- La ruta operativa de una visita (`agency_visits.route_id`) es **específica de esa visita**.
- **Cambiarla no cambia la asignación predeterminada.**

## Confirmación de visita

La confirmación es una transacción idempotente (`confirm_agency_visit`) derivada del tenant actual: actualiza stock, registra cargos cuando corresponde y deja auditoría inmutable.
