/**
 * Returns the non-empty technical grouping key required by route assignment
 * requests. A general day route has no geographic zone, so it uses the day
 * identity instead of persisting an empty value.
 */
export function customerRouteAssignmentZoneKey(input: {
  zoneName?: string | null;
  isSystemGeneral?: boolean | null;
  weekday: number;
  routeDefinitionId: string;
}) {
  const configuredZone = String(input.zoneName || "").trim();
  if (configuredZone) {
    return configuredZone;
  }

  if (input.isSystemGeneral) {
    return `day:${input.weekday}`;
  }

  const routeDefinitionId = String(input.routeDefinitionId || "").trim();
  return `route:${routeDefinitionId || "unknown"}`;
}
