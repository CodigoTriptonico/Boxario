# Knip — excepciones documentadas (Fase 2)

Actualizado 2026-08-02 (cierre Fase 2). Solo falsos positivos / API pública intencional. Sin exclusiones amplias en `knip.json`.

## Conservar (no son muertos)

| Símbolo | Archivo | Motivo | Consumidor / contrato | Revisar |
| --- | --- | --- | --- | --- |
| `createShipmentContactLogAction` | `src/app/actions/shipments-commercial.ts` (+ reexport `shipments.ts`) | API pública de bitácora de contactos | Eval `envios-contact-log` + `shipments-architecture.test` exigen el export | Si se mueve a barrel de journal |
| `listShipmentsForRouteBoardAction` | `src/app/actions/shipments-read.ts` (+ reexport `shipments.ts`) | Contrato de tablero de rutas; conductor ya usa scoped board | `shipments-architecture.test` lista el export | Si se elimina el contrato de board |
| `Constants` | `src/lib/db/database.generated.ts` | Salida estándar de Supabase codegen | Regenerado por `codegen:db-types` | Nunca eliminar a mano |
| `CompositeTypes` | `src/lib/db/database.generated.ts` | Salida estándar de Supabase codegen | Regenerado por `codegen:db-types` | Nunca eliminar a mano |
| `EnviosShipmentListsSharedProps` | `src/components/envios/types.ts` | Contrato de props compartidas de listados | Superficie tipada envíos/seguimiento | Si se inlinea el tipo |
| `LogisticsTaskWaiting` | `src/lib/logistics-view.ts` | Tipo de dominio del tablero | Timing / banners de espera | Si se deja de exportar el dominio |
| `CountryCatalogBoxRow` | `src/lib/pricing-catalog.ts` | Fila de catálogo por país | Pricing / config países | Si el catálogo deja de tiparse así |
| `ScheduleSuggestionModeAvailability` | `src/lib/sale/schedule-suggestions.ts` | Forma de disponibilidad por modo | Validación interna + UI config | Con cambios de sugerencias |
| `ScheduleSuggestionDayConfig` | `src/lib/sale/schedule-suggestions.ts` | Config por día | Persistencia de sugerencias | Con cambios de sugerencias |
| `EnviosStatusFilterBucket` | `src/lib/shipment-display.ts` | Buckets de filtro UI | Envios display API | Con rediseño de filtros |
| `EnviosReadinessBucket` | `src/lib/shipment-display.ts` | Buckets de readiness | Envios display API | Con rediseño de readiness |
| `FullBoxPickupPlanStatus` | `src/lib/shipment-display.ts` | Estado de plan pickup | Display / logística | Con cambios de plan |
| `ShipmentRouteAssignmentInfo` | `src/lib/shipment-display.ts` | Info de asignación a ruta | Display / envíos | Con cambios de assignment |
| `ExpedientePartySource` / `ExpedientePartyField` / `ExpedienteFinancialPayment` / `ExpedienteDocumentView` | `src/lib/shipment-expediente.ts` | Superficie tipada del expediente | UI expediente + print | Con rediseño expediente |
| `SaleAgeTone` / `ShipmentStepGap` / `ShipmentTimingInsightStatus` / `ShipmentAuditTimings` | `src/lib/shipment-timing.ts` | Superficie tipada de timing | Insights / auditoría UI | Con cambios de timing |

## Eliminado en esta pasada (cierre)

Exports internos despromovidos o borrados: `navSections`, `SIDEBAR_GROUPS_EXPANDED_KEY_PREFIX`, `isMobileHomeActive`, `configSectionCards`, `defaultOrgSettings*`, `isValidEmail` (export), `SCHEDULE_SUGGESTION_MODE_KEYS` (export), re-exports muertos de tipos en `shipments.ts`, re-exports `findActiveTaskByType`/`findTaskByTypeIncludingCancelled` desde timing/core, `PackageCustodyHandoffStatus` sin callers, `logisticsWeekdayMatchesDate`, exports de máquina de estados cubiertos por tests (`assertPhysicalPackageTransition`, etc.).

## Resultado Knip esperado

- Archivos muertos: **0**
- Exports residuales justificados: **4 símbolos** (2 actions + 2 codegen)
- Tipos residuales justificados: dominio/codegen listados arriba
- Sin `ignoreIssues` amplios en `knip.json`
