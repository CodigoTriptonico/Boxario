import { resolveGoogleCountryCode } from "@/lib/country-options";

type GoogleAddressGeocodeResult = {
  formatted_address?: string;
  partial_match?: boolean;
  place_id?: string;
  geometry?: {
    location?: {
      lat?: number;
      lng?: number;
    };
  };
};

export type GoogleAddressGeocodeInput = {
  street?: string | null;
  houseNumber?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
  formattedAddress?: string | null;
};

export type GoogleAddressGeocodeLocation = {
  lat: number;
  lng: number;
  label: string;
  placeId: string;
  partial: boolean;
};

function clean(value: string | null | undefined) {
  return String(value || "").trim();
}

export function buildGoogleAddressQuery(input: GoogleAddressGeocodeInput) {
  const addressParts = [
    input.houseNumber,
    input.street,
    input.neighborhood,
    input.city,
    input.state,
    input.postalCode,
  ].map(clean).filter(Boolean);
  const country = clean(input.country);

  return addressParts.length
    ? [...addressParts, country].filter(Boolean).join(", ")
    : clean(input.formattedAddress);
}

export function normalizeGoogleAddressGeocodeResult(
  result: GoogleAddressGeocodeResult | null | undefined,
  fallbackLabel: string,
): GoogleAddressGeocodeLocation | null {
  const lat = result?.geometry?.location?.lat;
  const lng = result?.geometry?.location?.lng;
  if (
    typeof lat !== "number" ||
    !Number.isFinite(lat) ||
    lat < -90 ||
    lat > 90 ||
    typeof lng !== "number" ||
    !Number.isFinite(lng) ||
    lng < -180 ||
    lng > 180
  ) {
    return null;
  }

  return {
    lat,
    lng,
    label: clean(result?.formatted_address) || fallbackLabel,
    placeId: clean(result?.place_id),
    partial: Boolean(result?.partial_match),
  };
}

/**
 * Obtiene una ubicación visual de respaldo sin modificar el cliente. Es una
 * ayuda para mapas cuando la dirección postal existe pero todavía no tiene
 * coordenadas persistidas.
 */
export async function geocodeAddressForDisplay(
  input: GoogleAddressGeocodeInput,
): Promise<GoogleAddressGeocodeLocation | null> {
  const address = buildGoogleAddressQuery(input);
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!address || !apiKey) return null;

  const params = new URLSearchParams({ address, key: apiKey });
  const countryCode = resolveGoogleCountryCode(input.country || undefined);
  if (countryCode) params.set("components", `country:${countryCode}`);

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`,
      { cache: "no-store" },
    );
    const data = (await response.json()) as {
      status?: string;
      results?: GoogleAddressGeocodeResult[];
    };
    if (!response.ok || data.status !== "OK") return null;
    return normalizeGoogleAddressGeocodeResult(data.results?.[0], address);
  } catch {
    return null;
  }
}
