export function buildMapsNavigationUrl(input: {
  lat: number | null;
  lng: number | null;
  label?: string | null;
}) {
  if (input.lat == null || input.lng == null || !Number.isFinite(input.lat) || !Number.isFinite(input.lng)) {
    return null;
  }

  const label = encodeURIComponent((input.label || "").trim());
  const coords = `${input.lat},${input.lng}`;

  return {
    google: `https://www.google.com/maps/dir/?api=1&destination=${coords}${label ? `&destination_place_id=${label}` : ""}`,
    apple: `maps://?daddr=${coords}${label ? `&q=${label}` : ""}`,
  };
}

const GOOGLE_MAPS_ROUTE_MAX_STOPS = 11;

export type GoogleMapsRoutePoint = {
  lat: number | null | undefined;
  lng: number | null | undefined;
};

export function buildGoogleMapsRouteUrl(stops: GoogleMapsRoutePoint[]) {
  const validStops = stops.filter(
    (stop): stop is { lat: number; lng: number } => Number.isFinite(stop.lat) && Number.isFinite(stop.lng),
  );

  if (!validStops.length) return null;

  const includedStops = validStops.slice(0, GOOGLE_MAPS_ROUTE_MAX_STOPS);
  const coordinates = includedStops.map((stop) => `${stop.lat},${stop.lng}`);
  const params = new URLSearchParams({ api: "1" });

  if (coordinates.length === 1) {
    params.set("query", coordinates[0]);
    return {
      url: `https://www.google.com/maps/search/?${params.toString()}`,
      includedStops: 1,
      totalStops: validStops.length,
      truncated: validStops.length > 1,
    };
  }

  params.set("origin", coordinates[0]);
  params.set("destination", coordinates.at(-1) || coordinates[0]);
  params.set("travelmode", "driving");
  if (coordinates.length > 2) params.set("waypoints", coordinates.slice(1, -1).join("|"));

  return {
    url: `https://www.google.com/maps/dir/?${params.toString()}`,
    includedStops: includedStops.length,
    totalStops: validStops.length,
    truncated: validStops.length > includedStops.length,
  };
}
