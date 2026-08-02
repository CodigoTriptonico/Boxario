# Knip — excepciones documentadas (Fase 2)

Actualizado 2026-08-02 (Fase 3B: contrato Knip). Solo falsos positivos / API pública intencional. Sin exclusiones amplias en `knip.json`.

**Consumidor:** `src/lib/public-api.contract.test.ts` importa cada símbolo de la tabla para que Knip lo vea usado. Actualizar ese test al agregar o retirar una excepción.

## Conservar (no son muertos)

| Símbolo | Archivo | Motivo | Consumidor / contrato | Revisar |
| --- | --- | --- | --- | --- |
| `createShipmentContactLogAction` | `src/app/actions/shipments-commercial.ts` (+ reexport `shipments.ts`) | API pública de bitácora de contactos | `public-api.contract.test` + eval `envios-contact-log` + `shipments-architecture.test` | Si se mueve a barrel de journal |
| `listShipmentsForRouteBoardAction` | `src/app/actions/shipments-read.ts` (+ reexport `shipments.ts`) | Contrato de tablero de rutas; conductor ya usa scoped board | `public-api.contract.test` + `shipments-architecture.test` | Si se elimina el contrato de board |
| `Constants` | `src/lib/db/database.generated.ts` | Salida estándar de Supabase codegen | `public-api.contract.test` · regenerado por `codegen:db-types` | Nunca eliminar a mano |
| `CompositeTypes` | `src/lib/db/database.generated.ts` | Salida estándar de Supabase codegen | `public-api.contract.test` · regenerado por `codegen:db-types` | Nunca eliminar a mano |
| `EnviosShipmentListsSharedProps` | `src/components/envios/types.ts` | Contrato de props compartidas de listados | `public-api.contract.test` · superficie tipada envíos/seguimiento | Si se inlinea el tipo |
| `LogisticsTaskWaiting` | `src/lib/logistics-view.ts` | Tipo de dominio del tablero | `public-api.contract.test` · timing / banners de espera | Si se deja de exportar el dominio |
| `CountryCatalogBoxRow` | `src/lib/pricing-catalog.ts` | Fila de catálogo por país | `public-api.contract.test` · pricing / config países | Si el catálogo deja de tiparse así |
| `ScheduleSuggestionModeAvailability` | `src/lib/sale/schedule-suggestions.ts` | Forma de disponibilidad por modo | `public-api.contract.test` · validación interna + UI config | Con cambios de sugerencias |
| `ScheduleSuggestionDayConfig` | `src/lib/sale/schedule-suggestions.ts` | Config por día | `public-api.contract.test` · persistencia de sugerencias | Con cambios de sugerencias |
| `EnviosStatusFilterBucket` | `src/lib/shipment-display.ts` | Buckets de filtro UI | `public-api.contract.test` · Envios display API | Con rediseño de filtros |
| `EnviosReadinessBucket` | `src/lib/shipment-display.ts` | Buckets de readiness | `public-api.contract.test` · Envios display API | Con rediseño de readiness |
| `FullBoxPickupPlanStatus` | `src/lib/shipment-display.ts` | Estado de plan pickup | `public-api.contract.test` · display / logística | Con cambios de plan |
| `ShipmentRouteAssignmentInfo` | `src/lib/shipment-display.ts` | Info de asignación a ruta | `public-api.contract.test` · display / envíos | Con cambios de assignment |
| `ExpedientePartySource` / `ExpedientePartyField` / `ExpedienteFinancialPayment` / `ExpedienteDocumentView` | `src/lib/shipment-expediente.ts` | Superficie tipada del expediente | `public-api.contract.test` · UI expediente + print | Con rediseño expediente |
| `SaleAgeTone` / `ShipmentStepGap` / `ShipmentTimingInsightStatus` / `ShipmentAuditTimings` | `src/lib/shipment-timing.ts` | Superficie tipada de timing | `public-api.contract.test` · insights / auditoría UI | Con cambios de timing |

## Eliminado en esta pasada (cierre)

Exports internos despromovidos o borrados: `navSections`, `SIDEBAR_GROUPS_EXPANDED_KEY_PREFIX`, `isMobileHomeActive`, `configSectionCards`, `defaultOrgSettings*`, `isValidEmail` (export), `SCHEDULE_SUGGESTION_MODE_KEYS` (export), re-exports muertos de tipos en `shipments.ts`, re-exports `findActiveTaskByType`/`findTaskByTypeIncludingCancelled` desde timing/core, `PackageCustodyHandoffStatus` sin callers, `logisticsWeekdayMatchesDate`, exports de máquina de estados cubiertos por tests (`assertPhysicalPackageTransition`, etc.).

## Resultado Knip esperado

- Archivos muertos: **0**
- Exports residuales justificados: **0** si `public-api.contract.test.ts` está actualizado (antes: 4 símbolos actions + codegen)
- Tipos residuales justificados: **0** si el contract test referencia la superficie de dominio
- Sin `ignoreIssues` amplios en `knip.json`
