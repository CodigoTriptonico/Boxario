import type { CoveragePlaceKind, RouteCoveragePlaceBounds } from "@/lib/logistics-route-coverage";

type GoogleAddressComponent = {
  long_name: string;
  short_name: string;
  types: string[];
};

type GooglePlaceGeometry = {
  location?: { lat?: number; lng?: number };
  viewport?: {
    northeast?: { lat?: number; lng?: number };
    southwest?: { lat?: number; lng?: number };
  };
};

type GooglePlaceResult = {
  place_id?: string;
  name?: string;
  types?: string[];
  address_components?: GoogleAddressComponent[];
  geometry?: GooglePlaceGeometry;
  formatted_address?: string;
};

export type CoveragePlaceSuggestion = {
  placeId: string;
  displayName: string;
  secondaryText: string;
  kind: CoveragePlaceKind;
};

export type CoveragePlaceDetails = {
  placeId: string;
  displayName: string;
  kind: CoveragePlaceKind;
  lat: number | null;
  lng: number | null;
  bounds: RouteCoveragePlaceBounds | null;
};

function firstComponent(components: GoogleAddressComponent[] | undefined, types: string[]) {
  return (components || []).find((component) => types.some((type) => component.types.includes(type)));
}

export function kindFromGoogleTypes(types: string[] | undefined): CoveragePlaceKind {
  const list = types || [];
  if (list.includes("neighborhood")) return "neighborhood";
  if (list.some((type) => type.startsWith("sublocality"))) return "sublocality";
  return "locality";
}

export function boundsFromGoogleViewport(geometry: GooglePlaceGeometry | undefined): RouteCoveragePlaceBounds | null {
  const northeast = geometry?.viewport?.northeast;
  const southwest = geometry?.viewport?.southwest;
  if (
    typeof northeast?.lat !== "number" ||
    typeof northeast?.lng !== "number" ||
    typeof southwest?.lat !== "number" ||
    typeof southwest?.lng !== "number"
  ) {
    return null;
  }
  return {
    north: northeast.lat,
    south: southwest.lat,
    east: northeast.lng,
    west: southwest.lng,
  };
}

function requireGoogleMapsApiKey() {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) throw new Error("Servicio de lugares no disponible");
  return apiKey;
}

async function fetchAutocomplete(input: {
  query: string;
  apiKey: string;
  countryCode?: string | null;
  types?: string;
  location?: { lat: number; lng: number } | null;
  radiusMeters?: number;
}) {
  const params = new URLSearchParams({
    input: input.query,
    key: input.apiKey,
  });
  if (input.types) params.set("types", input.types);
  if (input.countryCode) params.set("components", `country:${input.countryCode}`);
  if (input.location && Number.isFinite(input.location.lat) && Number.isFinite(input.location.lng)) {
    params.set("location", `${input.location.lat},${input.location.lng}`);
    params.set("radius", String(Math.max(1000, Math.min(50000, input.radiusMeters || 40000))));
    params.set("strictbounds", "false");
  }

  const response = await fetch(
    `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params.toString()}`,
    { cache: "no-store" },
  );
  const data = (await response.json()) as {
    status: string;
    error_message?: string;
    predictions?: Array<{
      place_id: string;
      description: string;
      types?: string[];
      structured_formatting?: { main_text?: string; secondary_text?: string };
    }>;
  };
  if (!response.ok || (data.status !== "OK" && data.status !== "ZERO_RESULTS")) {
    throw new Error(data.error_message || "No se pudieron buscar lugares");
  }
  return data.predictions || [];
}

function predictionToSuggestion(prediction: {
  place_id: string;
  description: string;
  types?: string[];
  structured_formatting?: { main_text?: string; secondary_text?: string };
}): CoveragePlaceSuggestion {
  return {
    placeId: prediction.place_id,
    displayName: prediction.structured_formatting?.main_text || prediction.description,
    secondaryText: prediction.structured_formatting?.secondary_text || prediction.description,
    kind: kindFromGoogleTypes(prediction.types),
  };
}

function isUsefulCoveragePrediction(types: string[] | undefined) {
  const list = types || [];
  if (
    list.includes("locality") ||
    list.includes("postal_town") ||
    list.includes("administrative_area_level_2") ||
    list.includes("administrative_area_level_3") ||
    list.includes("neighborhood") ||
    list.some((type) => type.startsWith("sublocality")) ||
    list.includes("political")
  ) {
    return true;
  }
  // Autocomplete often omits fine types; keep geocode/region results.
  return list.includes("geocode") || list.length === 0;
}

export async function searchCoveragePlaces(input: {
  query: string;
  countryCode?: string | null;
  location?: { lat: number; lng: number } | null;
  radiusMeters?: number;
  kinds?: Array<"cities" | "zones">;
}): Promise<CoveragePlaceSuggestion[]> {
  const apiKey = requireGoogleMapsApiKey();
  const query = String(input.query || "").trim();
  if (query.length < 2) return [];

  const kinds = input.kinds?.length ? input.kinds : ["cities", "zones"];
  const shared = {
    query,
    apiKey,
    countryCode: input.countryCode,
    location: input.location,
    radiusMeters: input.radiusMeters,
  };

  const requests: Array<Promise<Array<{
    place_id: string;
    description: string;
    types?: string[];
    structured_formatting?: { main_text?: string; secondary_text?: string };
  }>>> = [];

  if (kinds.includes("cities")) {
    requests.push(fetchAutocomplete({ ...shared, types: "(cities)" }));
    requests.push(fetchAutocomplete({ ...shared, types: "(regions)" }));
  }
  if (kinds.includes("zones")) {
    requests.push(fetchAutocomplete({ ...shared, types: "geocode" }));
  }
  if (!requests.length) {
    requests.push(fetchAutocomplete({ ...shared, types: "(cities)" }));
  }

  const batches = await Promise.all(requests);
  const seen = new Set<string>();
  const suggestions: CoveragePlaceSuggestion[] = [];
  for (const batch of batches) {
    for (const prediction of batch) {
      if (seen.has(prediction.place_id)) continue;
      if (!isUsefulCoveragePrediction(prediction.types)) continue;
      seen.add(prediction.place_id);
      suggestions.push(predictionToSuggestion(prediction));
      if (suggestions.length >= 10) return suggestions;
    }
  }

  if (suggestions.length) return suggestions;

  // Fallback: Text Search when Autocomplete returns nothing useful.
  const textParams = new URLSearchParams({
    query,
    key: apiKey,
  });
  if (input.countryCode) textParams.set("region", input.countryCode);
  if (input.location && Number.isFinite(input.location.lat) && Number.isFinite(input.location.lng)) {
    textParams.set("location", `${input.location.lat},${input.location.lng}`);
    textParams.set("radius", "40000");
  }
  const textResponse = await fetch(
    `https://maps.googleapis.com/maps/api/place/textsearch/json?${textParams.toString()}`,
    { cache: "no-store" },
  );
  const textData = (await textResponse.json()) as {
    status: string;
    results?: Array<{ place_id?: string; name?: string; formatted_address?: string; types?: string[] }>;
  };
  if (!textResponse.ok || (textData.status !== "OK" && textData.status !== "ZERO_RESULTS")) {
    return [];
  }
  for (const row of textData.results || []) {
    const placeId = String(row.place_id || "").trim();
    const displayName = String(row.name || "").trim();
    if (!placeId || !displayName || seen.has(placeId)) continue;
    seen.add(placeId);
    suggestions.push({
      placeId,
      displayName,
      secondaryText: String(row.formatted_address || ""),
      kind: kindFromGoogleTypes(row.types),
    });
    if (suggestions.length >= 10) break;
  }
  return suggestions;
}

function detailsFromGeocodeResult(result: GooglePlaceResult, fallbackId: string): CoveragePlaceDetails | null {
  const components = result.address_components || [];
  const neighborhood =
    firstComponent(components, ["neighborhood", "sublocality", "sublocality_level_1"])?.long_name || "";
  const city =
    firstComponent(components, ["locality", "postal_town", "administrative_area_level_2"])?.long_name || "";
  const types = result.types || [];
  const prefersNeighborhood =
    Boolean(neighborhood) &&
    (types.includes("neighborhood") ||
      types.some((type) => type.startsWith("sublocality")) ||
      !types.includes("locality"));
  const displayName = prefersNeighborhood ? neighborhood || city : city || neighborhood || result.formatted_address || result.name;
  if (!displayName) return null;
  const kind: CoveragePlaceKind = prefersNeighborhood && neighborhood
    ? types.some((type) => type.startsWith("sublocality"))
      ? "sublocality"
      : "neighborhood"
    : "locality";
  const lat = typeof result.geometry?.location?.lat === "number" ? result.geometry.location.lat : null;
  const lng = typeof result.geometry?.location?.lng === "number" ? result.geometry.location.lng : null;
  return {
    placeId: String(result.place_id || fallbackId),
    displayName,
    kind,
    lat,
    lng,
    bounds: boundsFromGoogleViewport(result.geometry),
  };
}

/** Resolve the city/neighborhood under a map click. Prefers locality, then neighborhood. */
export async function resolveCoveragePlaceAtLatLng(input: {
  lat: number;
  lng: number;
  prefer?: "locality" | "neighborhood";
}): Promise<CoveragePlaceDetails> {
  const apiKey = requireGoogleMapsApiKey();
  if (!Number.isFinite(input.lat) || !Number.isFinite(input.lng)) {
    throw new Error("Coordenadas invalidas");
  }
  const params = new URLSearchParams({
    latlng: `${input.lat},${input.lng}`,
    key: apiKey,
    result_type: "locality|neighborhood|sublocality|postal_town|administrative_area_level_3",
  });
  const response = await fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`,
    { cache: "no-store" },
  );
  const data = (await response.json()) as {
    status: string;
    error_message?: string;
    results?: GooglePlaceResult[];
  };
  if (!response.ok || (data.status !== "OK" && data.status !== "ZERO_RESULTS")) {
    throw new Error(data.error_message || "No se pudo identificar el area");
  }
  const results = data.results || [];
  if (!results.length) throw new Error("No hay una ciudad o zona en ese punto");

  const prefer = input.prefer || "locality";
  const scored = results
    .map((result) => {
      const details = detailsFromGeocodeResult(result, `latlng:${input.lat},${input.lng}`);
      if (!details) return null;
      const types = result.types || [];
      let score = 0;
      if (types.includes("locality") || types.includes("postal_town")) score += prefer === "locality" ? 30 : 10;
      if (types.includes("neighborhood")) score += prefer === "neighborhood" ? 30 : 12;
      if (types.some((type) => type.startsWith("sublocality"))) score += prefer === "neighborhood" ? 24 : 8;
      if (types.includes("administrative_area_level_3")) score += 6;
      return { details, score };
    })
    .filter((row): row is { details: CoveragePlaceDetails; score: number } => Boolean(row))
    .sort((left, right) => right.score - left.score);

  if (!scored.length) throw new Error("No hay una ciudad o zona en ese punto");
  return scored[0].details;
}

export async function fetchCoveragePlaceDetails(placeId: string): Promise<CoveragePlaceDetails> {
  const apiKey = requireGoogleMapsApiKey();
  const id = String(placeId || "").trim();
  if (!id) throw new Error("Falta placeId");

  const params = new URLSearchParams({
    place_id: id,
    fields: "place_id,name,types,geometry,address_components,formatted_address",
    key: apiKey,
  });
  const response = await fetch(
    `https://maps.googleapis.com/maps/api/place/details/json?${params.toString()}`,
    { cache: "no-store" },
  );
  const data = (await response.json()) as {
    status: string;
    error_message?: string;
    result?: GooglePlaceResult;
  };
  if (!response.ok || data.status !== "OK" || !data.result?.place_id) {
    throw new Error(data.error_message || "No se pudo cargar el lugar");
  }

  const result = data.result;
  const kind = kindFromGoogleTypes(result.types);
  const cityName = firstComponent(result.address_components, ["locality", "postal_town"])?.long_name;
  const displayName =
    kind === "locality"
      ? cityName || result.name || result.formatted_address || id
      : result.name || cityName || result.formatted_address || id;
  const lat = typeof result.geometry?.location?.lat === "number" ? result.geometry.location.lat : null;
  const lng = typeof result.geometry?.location?.lng === "number" ? result.geometry.location.lng : null;

  return {
    placeId: String(result.place_id),
    displayName: String(displayName),
    kind,
    lat,
    lng,
    bounds: boundsFromGoogleViewport(result.geometry),
  };
}

export async function searchCoveragePlaceChildren(input: {
  parentDisplayName: string;
  location?: { lat: number; lng: number } | null;
  countryCode?: string | null;
}): Promise<CoveragePlaceSuggestion[]> {
  const apiKey = requireGoogleMapsApiKey();
  const parentName = String(input.parentDisplayName || "").trim();
  if (!parentName) return [];

  const queries = [
    `neighborhoods in ${parentName}`,
    `communities in ${parentName}`,
  ];
  const seen = new Set<string>();
  const results: CoveragePlaceSuggestion[] = [];

  for (const query of queries) {
    const params = new URLSearchParams({
      query,
      key: apiKey,
    });
    if (input.location && Number.isFinite(input.location.lat) && Number.isFinite(input.location.lng)) {
      params.set("location", `${input.location.lat},${input.location.lng}`);
      params.set("radius", "25000");
    }
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/textsearch/json?${params.toString()}`,
      { cache: "no-store" },
    );
    const data = (await response.json()) as {
      status: string;
      results?: Array<{ place_id?: string; name?: string; formatted_address?: string; types?: string[] }>;
    };
    if (!response.ok || (data.status !== "OK" && data.status !== "ZERO_RESULTS")) continue;
    for (const row of data.results || []) {
      const placeId = String(row.place_id || "").trim();
      const displayName = String(row.name || "").trim();
      if (!placeId || !displayName || seen.has(placeId)) continue;
      const kind = kindFromGoogleTypes(row.types);
      if (kind === "locality" && normalizedEquals(displayName, parentName)) continue;
      seen.add(placeId);
      results.push({
        placeId,
        displayName,
        secondaryText: String(row.formatted_address || parentName),
        kind: kind === "locality" ? "neighborhood" : kind,
      });
      if (results.length >= 20) return results;
    }
  }

  return results;
}

function normalizedEquals(left: string, right: string) {
  return left.trim().toLowerCase() === right.trim().toLowerCase();
}

/** Resolve a Google place for a Census administrative polygon (name + centroid). */
export async function resolveCoveragePlaceFromCensusName(input: {
  name: string;
  lat: number;
  lng: number;
  preferLocality?: boolean;
}): Promise<CoveragePlaceDetails> {
  const displayName = String(input.name || "").trim();
  if (!displayName) throw new Error("Falta el nombre de la zona");
  if (!Number.isFinite(input.lat) || !Number.isFinite(input.lng)) {
    throw new Error("Coordenadas invalidas");
  }

  const suggestions = await searchCoveragePlaces({
    query: displayName,
    countryCode: "us",
    location: { lat: input.lat, lng: input.lng },
    radiusMeters: 25000,
    kinds: input.preferLocality === false ? ["zones", "cities"] : ["cities", "zones"],
  });

  const exact = suggestions.find((item) => normalizedEquals(item.displayName, displayName));
  const candidate = exact || suggestions[0];
  if (!candidate?.placeId) {
    throw new Error(`No se pudo vincular ${displayName} con un lugar de Google`);
  }

  try {
    const details = await fetchCoveragePlaceDetails(candidate.placeId);
    return {
      ...details,
      displayName: details.displayName || displayName,
      kind:
        input.preferLocality === false && details.kind === "locality"
          ? "neighborhood"
          : details.kind,
      lat: details.lat ?? input.lat,
      lng: details.lng ?? input.lng,
    };
  } catch {
    return {
      placeId: candidate.placeId,
      displayName: candidate.displayName || displayName,
      kind: candidate.kind,
      lat: input.lat,
      lng: input.lng,
      bounds: null,
    };
  }
}
