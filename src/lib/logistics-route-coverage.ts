export type RouteCoverageMode = "day_only" | "places";

export type CoveragePlaceKind = "locality" | "neighborhood" | "sublocality";
export type CoveragePlaceSelectionRole = "root_whole" | "root_partial" | "child_included";

export type RouteCoveragePlaceBounds = {
  north: number;
  south: number;
  east: number;
  west: number;
};

export type RouteCoveragePlace = {
  placeId: string;
  displayName: string;
  kind: CoveragePlaceKind;
  parentPlaceId: string | null;
  selectionRole: CoveragePlaceSelectionRole;
  lat?: number | null;
  lng?: number | null;
  bounds?: RouteCoveragePlaceBounds | null;
  color?: string | null;
};

export const COVERAGE_PLACE_PALETTE = [
  "#10b981",
  "#38bdf8",
  "#f59e0b",
  "#a78bfa",
  "#f472b6",
  "#fb7185",
  "#34d399",
  "#fbbf24",
] as const;

export function normalizeCoveragePlaceColor(value: unknown, fallback = "#10b981") {
  const raw = String(value || "").trim();
  if (/^#[0-9a-fA-F]{6}$/.test(raw)) return raw.toLowerCase();
  const fallbackRaw = String(fallback || "").trim();
  if (/^#[0-9a-fA-F]{6}$/.test(fallbackRaw)) return fallbackRaw.toLowerCase();
  return "#10b981";
}

export function nextCoveragePlaceColor(places: RouteCoveragePlace[], fallback = "#10b981") {
  const used = new Set(
    places.map((place) => normalizeCoveragePlaceColor(place.color, "")).filter((item) => item !== ""),
  );
  for (const candidate of COVERAGE_PLACE_PALETTE) {
    if (!used.has(candidate)) return candidate;
  }
  return COVERAGE_PLACE_PALETTE[places.length % COVERAGE_PLACE_PALETTE.length];
}

export type RouteCoverageAddress = {
  street?: string | null;
  houseNumber?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
  formattedAddress?: string | null;
  placeId?: string | null;
  lat?: number | string | null;
  lng?: number | string | null;
};

export function normalizeUsPostalCode(value: unknown): string | null {
  const normalized = String(value || "").trim();
  return /^\d{5}$/.test(normalized) ? normalized : null;
}

export function normalizedAddressPart(value: unknown) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ");
}

export function normalizedAddressFingerprintSource(address: RouteCoverageAddress) {
  const postalCode = normalizeUsPostalCode(address.postalCode) || "";
  return [
    normalizedAddressPart(address.placeId),
    normalizedAddressPart(address.formattedAddress),
    normalizedAddressPart(address.street),
    normalizedAddressPart(address.houseNumber),
    normalizedAddressPart(address.neighborhood),
    normalizedAddressPart(address.city),
    normalizedAddressPart(address.state),
    postalCode,
    normalizedAddressPart(address.country || "USA"),
    address.lat == null ? "" : Number(address.lat).toFixed(6),
    address.lng == null ? "" : Number(address.lng).toFixed(6),
  ].join("|");
}

function namesMatch(left: unknown, right: unknown) {
  const a = normalizedAddressPart(left);
  const b = normalizedAddressPart(right);
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
}

function pointInBounds(lat: number, lng: number, bounds: RouteCoveragePlaceBounds | null | undefined) {
  if (!bounds) return false;
  if (![bounds.north, bounds.south, bounds.east, bounds.west].every(Number.isFinite)) return false;
  return lat <= bounds.north && lat >= bounds.south && lng <= bounds.east && lng >= bounds.west;
}

function placeMatchesAddress(place: RouteCoveragePlace, address: RouteCoverageAddress) {
  const addressPlaceId = String(address.placeId || "").trim();
  if (addressPlaceId && addressPlaceId === place.placeId) return true;
  if (place.kind === "locality") {
    if (namesMatch(address.city, place.displayName)) return true;
  } else if (namesMatch(address.neighborhood, place.displayName) || namesMatch(address.city, place.displayName)) {
    return true;
  }
  const lat = address.lat == null ? NaN : Number(address.lat);
  const lng = address.lng == null ? NaN : Number(address.lng);
  if (Number.isFinite(lat) && Number.isFinite(lng) && pointInBounds(lat, lng, place.bounds)) {
    return true;
  }
  return false;
}

/** Address matches places coverage: whole roots, or only selected children when a root is partial. */
export function addressMatchesCoveragePlaces(input: {
  places: RouteCoveragePlace[];
  address: RouteCoverageAddress;
}) {
  const places = input.places || [];
  if (!places.length) return false;

  const wholeRoots = places.filter((place) => place.selectionRole === "root_whole");
  for (const root of wholeRoots) {
    if (placeMatchesAddress(root, input.address)) return true;
  }

  const includedChildren = places.filter((place) => place.selectionRole === "child_included");
  for (const child of includedChildren) {
    if (placeMatchesAddress(child, input.address)) return true;
  }

  return false;
}

export function parseCoveragePlaceBounds(value: unknown): RouteCoveragePlaceBounds | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const north = Number(row.north);
  const south = Number(row.south);
  const east = Number(row.east);
  const west = Number(row.west);
  if (![north, south, east, west].every(Number.isFinite)) return null;
  return { north, south, east, west };
}

export function normalizeCoveragePlaceKind(value: unknown): CoveragePlaceKind {
  const kind = String(value || "").trim();
  if (kind === "neighborhood" || kind === "sublocality") return kind;
  return "locality";
}

export function normalizeCoveragePlaceSelectionRole(value: unknown): CoveragePlaceSelectionRole {
  const role = String(value || "").trim();
  if (role === "root_partial" || role === "child_included") return role;
  return "root_whole";
}

export type CompatibleRouteCandidate = {
  routeDefinitionId: string;
  routeScheduleId: string;
  name: string;
  weekday: number;
  startTime: string;
  estimatedEndTime?: string | null;
  coverageMode: RouteCoverageMode;
  postalCodes: string[];
  places?: RouteCoveragePlace[];
  maxStops?: number | null;
  maxBoxes?: number | null;
  reservedStops?: number;
  reservedBoxes?: number;
  isActive: boolean;
  routeStatus: "active" | "archived";
};

export function routeCandidateIsCompatible(input: {
  candidate: CompatibleRouteCandidate;
  postalCode: string | null;
  weekday: number;
  time: string;
  requestedBoxes: number;
  address?: RouteCoverageAddress | null;
}) {
  return (
    routeCandidateIsSelectable(input) &&
    routeCandidateCoverageMatches({
      candidate: input.candidate,
      address: input.address,
    })
  );
}

export function routeCandidateIsSelectable(input: {
  candidate: CompatibleRouteCandidate;
  weekday: number;
  time: string;
  requestedBoxes: number;
}) {
  const { candidate } = input;
  if (!candidate.isActive || candidate.routeStatus !== "active") return false;
  if (candidate.weekday !== input.weekday) return false;
  if (input.time < candidate.startTime) return false;
  if (candidate.estimatedEndTime && input.time > candidate.estimatedEndTime) return false;
  if (
    candidate.maxStops != null &&
    Number(candidate.reservedStops || 0) + 1 > candidate.maxStops
  ) {
    return false;
  }
  if (
    candidate.maxBoxes != null &&
    Number(candidate.reservedBoxes || 0) + Math.max(1, input.requestedBoxes) > candidate.maxBoxes
  ) {
    return false;
  }
  return true;
}

export function routeCandidateCoverageMatches(input: {
  candidate: CompatibleRouteCandidate;
  address?: RouteCoverageAddress | null;
}) {
  if (input.candidate.coverageMode !== "places" || !input.address) return false;
  const places = input.candidate.places || [];
  return places.length > 0 && addressMatchesCoveragePlaces({ places, address: input.address });
}

export function routeSchedulesOverlap(
  left: Pick<CompatibleRouteCandidate, "weekday" | "startTime" | "estimatedEndTime">,
  right: Pick<CompatibleRouteCandidate, "weekday" | "startTime" | "estimatedEndTime">,
) {
  if (left.weekday !== right.weekday) return false;
  const leftEnd = left.estimatedEndTime || "23:59";
  const rightEnd = right.estimatedEndTime || "23:59";
  return left.startTime < rightEnd && right.startTime < leftEnd;
}

export function boundsToGeoJsonPolygon(bounds: RouteCoveragePlaceBounds): Record<string, unknown> {
  const ring = [
    [bounds.west, bounds.south],
    [bounds.east, bounds.south],
    [bounds.east, bounds.north],
    [bounds.west, bounds.north],
    [bounds.west, bounds.south],
  ];
  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Polygon",
          coordinates: [ring],
        },
      },
    ],
  };
}
