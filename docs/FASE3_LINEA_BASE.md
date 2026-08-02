# Fase 3 — Línea base y confirmación (2026-08-02)

Checkpoint **3A**. Confirma con código y pruebas qué resolvieron las Fases 1–2. No reimplementar lo verde.

Base de trabajo: rama `refactor/phase3-technical-excellence` (desde cierre Fase 2 / PR #2).

## Matriz de confirmación

| Área | Declarada como hecha | Confirmada en código | Confirmada con prueba | Huecos (Fase 3) |
| --- | --- | --- | --- | --- |
| Seguridad cross-tenant / RLS | Sí | Fixture dos tenants; RLS logística/inventario; JWT scoped | `test:db-integrity`, `phase1-closeout-verify`, logistics integrity | Evidencia a escala (keyset); no reabrir RLS |
| RPC atómicos | Sí | `*_atomic` migraciones 132/150/158–166 | db-integrity escenarios 1–17; logistics integrity | Empaquetar narrativa concurrencia (esc. 12) |
| Pagos + FIN-004 | Sí | `collect_shipment_invoice_payment` recalcula en SQL; TS preview | conductor-driver-payment tests; overpayment report = 0 | Flujo crédito/ajuste de precio aún no producto |
| Inventario (disponible / reserved) | Sí | `stock - reserved`; guard escritura directa; RPC | `7_reserved_not_consumed`; unit tests | SKU vs paquetes físicos: contrato operador |
| Custodia | Sí (ops) | `package_custody_*` + handoffs; inventory custody read-model | package/inventory custody tests | Dos conceptos “custody”; outbound pallet incompleto (producto) |
| Rutas / tareas (estados) | Sí | SQL authority + TS preview `logistics-state-machine.ts` | state-machine + integrity tests | Cancel ruta: UPDATE directo vs RPC publish/start |
| Auditoría | Sí | `record_activity_history` (159); INSERT directo denegado | db-integrity insert denied + actor_from_auth | Dual ledger activity vs immutable_audit — contrato claro |
| Paginación | Sí | envíos 50, rutas 50, movimientos 50, stock 100, notif 20 | pagination tests + UI | Offset only; árbol categorías full-load; conductor BOUNDED 200 |
| Módulos ≤800 | Sí | `check:architecture` | architecture PASS | Archivos cerca del techo (~750) |
| Violaciones de capas | Sí (0) | `lib`↛actions/UI; actions↛UI | architecture PASS | No detecta “lógica de negocio en components” |
| Código muerto / Knip | Parcial | 0 files muertos; residuals documentados | knip exit≠0 esperado | Formalizar API pública / barrels |
| Duplicación | Sí | jscpd &lt;3% | check:duplicates PASS | Umbral grueso; twins de dominio quedan |
| Tipos generados + drift | Sí | `database.generated.ts` + `check:db-types` | codegen/check PASS | Mantener en CI con Supabase local |
| Conductor scoped | Sí | ≤60 rutas / ≤200 tareas / envíos por IDs | comentarios + call graph | Paginación conductor si supera techo |
| Fetches duplicados | Sí (conductor) | scoped board evita 2× listShipments | código | `listShipmentsForRouteBoardAction` contrato público |
| URLs firmadas página visible | Sí | batch solo `pageRows` en inventory/read | decisión + código | Otras superficies pueden firmar más |
| Contabilidad experimental | Sí (aislada) | UI métricas; sin write a motor 071 | DECISIONES + knip entry | No conectar sin diseño dual-write |

## Top huecos Fase 3 (no reabrir F1/F2)

1. Documentar arquitectura y fuentes de verdad para onboarding → **3A (este checkpoint)**.
2. Contratos/errores/comandos explícitos en flujos críticos → **3B**.
3. Keyset pagination + índices con EXPLAIN + datasets → **3C**.
4. `quality:gate` / `quality:db` + guía desarrollo → **3A/3D**.
5. Clarificar cancel de ruta, dual custody naming, shipment status vs display buckets → **3B docs/contratos**.
6. Contabilidad: mantener aislada; no cablear → **fuera de alcance de cambio**.

## Gates de partida (sesión)

| Comando | Resultado |
| --- | --- |
| typecheck | PASS |
| Fase 2 cierre (Docker) | PASS (ver `FASE2_INFORME.md`) |

## Principio de trabajo

No modificar precios, FIN-004, RLS, estados, permisos, días operativos, inventario, custodia, pagos ni Contabilidad sin aprobación explícita.
