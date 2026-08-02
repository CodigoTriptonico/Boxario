# Fase 2 — Línea base (2026-08-02)

Capturada antes de cualquier modificación de Fase 2. Entorno local sin datos reales.

## Comandos

| Comando | Resultado | ~Duración | Notas |
| --- | --- | --- | --- |
| `npm run typecheck` | PASS (0) | ~1.7 s | |
| `npm run build` | PASS (0) | ~24 s | Next 16.2.11 Turbopack |
| `npm run lint` | PASS con 8 warnings | ~18 s | 0 errores |
| `npm run check:architecture` | FAIL (15) | ~0.6 s | 4 layer + 11 max-lines |
| `npx knip` | FAIL | ~1.9 s | 14 files / 21 exports / 31 types |
| `npm run check:duplicates` | PASS | ~0.4 s | umbral 3% |
| `npm run test:db-integrity` | PASS | ~0.8 s | cross-tenant + atomic |
| `npm run test:gate` | PASS | ~11 s (bloque tests) | 241 archivos |
| `node scripts/test-logistics-route-integrity.mjs` | PASS | ~0.3 s | |
| `node scripts/phase1-closeout-verify.mjs` | PASS | ~0.3 s | 150–166 OK |

## Lint (0 errores, 8 advertencias)

| Archivo | Clasificación |
| --- | --- |
| `scripts/delete-tracking-shipments.mjs` unused `e` ×2 | defecto real menor (script CLI) |
| `scripts/test-user-deep.mjs` unused `e` | defecto real menor (script CLI) |
| `scripts/test-user-flow-simulation.mjs` unused `e` ×2 | defecto real menor (script CLI) |
| `src/app/actions/shipments-state.ts` unused `sessionHasPermission` | defecto real |
| `src/components/logistica/use-logistica-actions.tsx` unused `routes` | deuda / hook abandonado |
| `src/lib/shipment-timing/core.ts` unused `ShipmentLogisticsTaskRow` | defecto real menor |

## Arquitectura (15)

### Capas (4) — defecto real

- `src/app/actions/shipments-logistics.ts` → `@/components/sale/venta-parts` (`FULL_BOX_OFFICE_MODE`)
- `src/lib/shipment-logistics-edit.ts` → helpers `logisticsDriverTaskCount`, `logisticsSummary`
- `src/lib/shipment-timing/insights.ts` → modos conductor
- `src/lib/shipment-timing/milestones.ts` → modos

Nota: los modos ya existen en `@/lib/sale-logistics-modes`; los helpers viven en `parts-logistics.tsx`.

### max-lines (11) — deuda estructural Fase 2B

| Archivo | Líneas | max |
| --- | --- | --- |
| `logistica-client-implementation.tsx` | 3336 | 800 |
| `configuracion-client.tsx` | 2562 | 800 |
| `inventory-structure-editor.tsx` | 2377 | 800 |
| `envios-client.tsx` | 2371 | 800 |
| `conductor-tareas-client.tsx` | 1411 | 800 |
| `conductor-truck-inventory-client.tsx` | 932 | 800 |
| `inventory-item-context-menu.tsx` | 867 | 800 |
| `app-shell.tsx` | 865 | 800 |
| `platform-create-client-wizard.tsx` | 846 | 800 |
| `roles-permissions-panel.tsx` | 845 | 800 |
| `logistics-task-schedule-confirm-panel-view.tsx` | 816 | 800 |

## Knip — clasificación preliminar

### Archivos sin uso (14)

| Elemento | Clasificación |
| --- | --- |
| `scripts/phase1-closeout-verify.mjs` | script CLI (Fase 1) |
| `scripts/test-logistics-route-integrity.mjs` | script CLI (Fase 1) |
| `scripts/report-overpayment-adjustments.mjs` | script CLI |
| `scripts/delete-tracking-shipments.mjs` | script CLI |
| `scripts/run-full-user-test.mjs` | script CLI / temporal |
| `scripts/test-user-deep.mjs` | script CLI / temporal |
| `scripts/test-user-flow-simulation.mjs` | script CLI / temporal |
| `src/components/logistica/shared.tsx` | refactor incompleto / hooks abandonados |
| `src/components/logistica/types.ts` | refactor incompleto |
| `src/components/logistica/use-logistica-*.ts(x)` (4) | refactor incompleto |
| `src/lib/security/inventory-sale-reservation.ts` | pendiente: verificar uso dinámico / SQL / preparado |

### Exports / tipos

Mayormente barrel re-exports, API pública de estado de máquina logística y tipos de dominio — clasificar uno a uno antes de borrar. No eliminar en masa.

## Duplicación

`check:duplicates` PASS bajo umbral 3%. Casos conocidos (`planLeg` repetido, etc.) se tratan en 2A duplicaciones peligrosas sin forzar abstracciones artificiales.

## Git

Carpeta `.git` presente; `git` no está en PATH ni rutas habituales de Windows. Checkpoints por lista de archivos hasta recuperar la herramienta.
