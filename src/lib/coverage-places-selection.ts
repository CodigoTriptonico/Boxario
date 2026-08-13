import type { RouteCoveragePlace } from "@/lib/logistics-route-coverage";
import { nextCoveragePlaceColor, normalizeCoveragePlaceColor } from "@/lib/logistics-route-coverage";

/** Add or replace a root place. Existing children of that root are kept if placeId matches. */
export function upsertCoverageRootPlace(
  places: RouteCoveragePlace[],
  nextRoot: RouteCoveragePlace,
  fallbackColor = "#10b981",
): RouteCoveragePlace[] {
  const placeId = String(nextRoot.placeId || "").trim();
  if (!placeId) return places;
  const existingRoot = places.find((place) => place.placeId === placeId);
  const withoutSameRoot = places.filter(
    (place) => place.placeId !== placeId && place.parentPlaceId !== placeId,
  );
  const existingChildren = places.filter(
    (place) => place.selectionRole === "child_included" && place.parentPlaceId === placeId,
  );
  return [
    ...withoutSameRoot,
    {
      ...nextRoot,
      placeId,
      parentPlaceId: null,
      selectionRole: existingChildren.length ? "root_partial" : "root_whole",
      color: normalizeCoveragePlaceColor(
        nextRoot.color || existingRoot?.color || nextCoveragePlaceColor(places, fallbackColor),
        fallbackColor,
      ),
    },
    ...existingChildren,
  ];
}
