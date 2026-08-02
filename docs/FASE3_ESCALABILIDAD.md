# Fase 3C — Escalabilidad: índices, benchmark y observabilidad (2026-08-02)

Evidencia de paginación offset + índices existentes. **No se añadió migración 167**: los índices actuales cubren los patrones de listado.

## Dataset local (antes del benchmark)

| Tabla | Filas aprox. |
| --- | ---: |
| logistics_routes | 14 (1 por org demo) |
| shipments | 14 |
| inventory_movements | 7 |
| logistics_route_notifications | 14 |
| inventory_stock | 21 |

Caveat: con datasets pequeños Postgres elige **Seq Scan** (coste de índice > heap). Eso **no** prueba falta de índice. Con `enable_seqscan = off` o ~600 filas sembradas en txn, aparecen los Index Scan esperados.

## Patrones de consulta (app)

| Lista | Filtros | ORDER BY | Índice preferido |
| --- | --- | --- | --- |
| Rutas | `organization_id` + `status` (opcional) | `route_date DESC, created_at DESC, id DESC` | `idx_logistics_routes_org_status_date` / `idx_logistics_routes_org_date` |
| Envíos | `organization_id` | `created_at DESC, id DESC` | `idx_shipments_org_created_at` |
| Movimientos | `organization_id` + `warehouse_id` | `created_at DESC` (+ `id` en algunos listados) | `idx_inventory_movements_wh` `(warehouse_id, created_at DESC)` |
| Notificaciones | `organization_id` + `recipient_id` | `created_at DESC, id DESC` | `idx_logistics_route_notifications_recipient` `(recipient_id, read_at, created_at DESC)` |
| Stock | `organization_id` + `warehouse_id` | `id ASC` (+ nombre ítem en UI) | `idx_inventory_stock_wh` `(warehouse_id)` |

## EXPLAIN (resumen)

### logistics_routes (org + status + order)

- Datos pequeños: Seq Scan + Sort.
- Índice preferido: `Index Scan using idx_logistics_routes_org_status_date` (cond: org + status); sort incremental solo por `id`.
- Sin filtro status: `idx_logistics_routes_org_date`.
- **Recomendación:** no añadir índice. El compuesto `(organization_id, status, route_date desc, created_at desc)` ya cubre el patrón; `id` es desempate barato.

### inventory_movements (org + warehouse + order)

- Datos pequeños: Seq Scan.
- Índice preferido: `idx_inventory_movements_wh` — Index Cond en `warehouse_id`, Filter en `organization_id`.
- **Recomendación:** no añadir `(organization_id, warehouse_id, created_at)`. Warehouse ya es tenancy-scoped; el índice actual basta para paginación por bodega. Un compuesto org+wh solo ayudaría si muchas bodegas compartieran id space (no aplica).

### shipments (org + order)

- Datos pequeños: Seq Scan.
- Índice preferido: `idx_shipments_org_created_at` `(organization_id, created_at DESC)`.
- **Recomendación:** no añadir. Cubierto.

### logistics_route_notifications (org + recipient + order)

- Índice existente: `(recipient_id, read_at, created_at DESC)`.
- Listado filtra org + recipient; recipient es el predicado selectivo; org refuerza RLS/tenancy.
- **Recomendación:** no añadir. Opcional futuro solo si unread-only (`read_at IS NULL`) domina y el índice parcial aportara beneficio medido.

### inventory_stock (org + warehouse + order id)

- Índice preferido: `idx_inventory_stock_wh` + Filter org.
- Unique `(warehouse_id, item_id)` también acota.
- **Recomendación:** no añadir. Página ≤100; bodega es selectiva.

## Decisión de índices

| Acción | Resultado |
| --- | --- |
| Migración `167_*.sql` | **No creada** |
| Motivo | EXPLAIN (con seqscan off / seed txn) usa índices existentes; no hay hueco claro para el patrón LIMIT/OFFSET actual |

## Benchmark ligero

Script: `npm run benchmark:pagination` → `scripts/benchmark-list-pagination.mjs`

- Conecta vía `scripts/lib/db-connection.mjs`.
- Inserta ~600 filas de rutas / envíos / movimientos en una **transacción** y hace **ROLLBACK**.
- Mide `LIMIT 50` en `OFFSET 0 / 500 / 5000`.
- Exit 0 siempre (no es gate).

### Números (sesión 2026-08-02, local @ 127.0.0.1:54322)

Dataset en txn: routes=601, shipments=601, movements=600. Luego ROLLBACK.

| table | offset | ms | rows | notes |
| --- | ---: | ---: | ---: | --- |
| logistics_routes | 0 | 1.03 | 50 | Index Scan `idx_logistics_routes_org_status_date` (~0.04 ms EXPLAIN) |
| shipments | 0 | 0.64 | 50 | |
| inventory_movements | 0 | 0.56 | 50 | |
| logistics_routes | 500 | 0.50 | 0 | solo ~1/3 seed es `planned` → OFFSET 500 vacío |
| shipments | 500 | 0.61 | 50 | |
| inventory_movements | 500 | 0.57 | 50 | |
| logistics_routes | 5000 | 0.61 | 0 | offset &gt; seed |
| shipments | 5000 | 0.59 | 0 | offset &gt; seed |
| inventory_movements | 5000 | 0.55 | 0 | offset &gt; seed |

Notificaciones (datos existentes, 1 fila): Bitmap Index Scan en `idx_logistics_route_notifications_recipient` (~0.02 ms).
Stock (datos existentes, ~1 fila/bodega): Seq Scan por tamaño trivial (~0.01 ms) — no justifica índice nuevo.

**Honestidad:** no se sembraron 10k filas (constraints/triggers/coste). OFFSET profundo no está bien ejercitado. El coste real de offset profundo crece con filas saltadas; la migración a **keyset** sigue pendiente para escala real.

## Observabilidad

- Helper: `src/lib/observability/operation-log.ts` → `logOperation({...})`.
- Emite **una línea JSON** a `console.info` (sin secretos: no tokens/passwords/payment payloads).
- Test: `src/lib/observability/operation-log.test.ts`.
- Cableado opcional (un solo flujo): `cancelLogisticsRouteAction` registra ok/error + `durationMs`.
- Flujos críticos **deberían** llamar esto con el tiempo; **no** cablear masivamente aún (YAGNI).

## Qué no se hizo (3C)

- Keyset pagination en actions/UI.
- Seed permanente de 10k.
- Nuevos índices “por si acaso”.
