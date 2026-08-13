import assert from "node:assert/strict";
import test from "node:test";
import {
  addressMatchesCoveragePlaces,
  normalizeUsPostalCode,
  normalizedAddressFingerprintSource,
  routeCandidateCoverageMatches,
  routeCandidateIsCompatible,
  routeCandidateIsSelectable,
  routeSchedulesOverlap,
  type RouteCoveragePlace,
} from "./logistics-route-coverage";

test("ZIP estadounidenses conserva ceros iniciales y exige cinco digitos", () => {
  assert.equal(normalizeUsPostalCode(" 01234 "), "01234");
  assert.equal(normalizeUsPostalCode("1234"), null);
  assert.equal(normalizeUsPostalCode("12345-6789"), null);
});

test("la huella cambia cuando cambia la direccion exacta", () => {
  const base = { street: "Main St", houseNumber: "10", city: "Valencia", state: "CA", postalCode: "91355" };
  assert.notEqual(
    normalizedAddressFingerprintSource(base),
    normalizedAddressFingerprintSource({ ...base, houseNumber: "11" }),
  );
  assert.equal(
    normalizedAddressFingerprintSource(base),
    normalizedAddressFingerprintSource({ ...base, street: "  MAIN STREET  ".replace("STREET", "St") }),
  );
});

test("una ruta seleccionable respeta día, hora y capacidad sin fingir cobertura", () => {
  const candidate = {
    routeDefinitionId: "route",
    routeScheduleId: "schedule",
    name: "Norte",
    weekday: 3,
    startTime: "09:00",
    estimatedEndTime: "13:00",
    coverageMode: "places" as const,
    postalCodes: [],
    places: [{
      placeId: "valencia",
      displayName: "Valencia",
      kind: "neighborhood" as const,
      parentPlaceId: null,
      selectionRole: "root_whole" as const,
      lat: 34.44,
      lng: -118.55,
      bounds: null,
    }],
    maxStops: 2,
    maxBoxes: 4,
    reservedStops: 1,
    reservedBoxes: 2,
    isActive: true,
    routeStatus: "active" as const,
  };
  assert.equal(routeCandidateIsSelectable({ candidate, weekday: 3, time: "10:00", requestedBoxes: 2 }), true);
  assert.equal(routeCandidateCoverageMatches({ candidate, address: { neighborhood: "Valencia" } }), true);
  assert.equal(routeCandidateCoverageMatches({ candidate, address: { neighborhood: "Saugus" } }), false);
  assert.equal(routeCandidateIsSelectable({ candidate, weekday: 3, time: "14:00", requestedBoxes: 1 }), false);
  assert.equal(routeCandidateIsSelectable({ candidate, weekday: 3, time: "10:00", requestedBoxes: 3 }), false);
});

test("dos rutas del mismo día pueden advertir cruces horarios", () => {
  assert.equal(
    routeSchedulesOverlap(
      { weekday: 3, startTime: "09:00", estimatedEndTime: "12:00" },
      { weekday: 3, startTime: "11:00", estimatedEndTime: "14:00" },
    ),
    true,
  );
  assert.equal(
    routeSchedulesOverlap(
      { weekday: 3, startTime: "09:00", estimatedEndTime: "11:00" },
      { weekday: 3, startTime: "11:00", estimatedEndTime: "14:00" },
    ),
    false,
  );
});

const santaClaritaWhole: RouteCoveragePlace = {
  placeId: "city-sc",
  displayName: "Santa Clarita",
  kind: "locality",
  parentPlaceId: null,
  selectionRole: "root_whole",
  lat: 34.39,
  lng: -118.54,
  bounds: { north: 34.5, south: 34.3, east: -118.4, west: -118.7 },
};

const santaClaritaPartial: RouteCoveragePlace = {
  ...santaClaritaWhole,
  selectionRole: "root_partial",
};

const valenciaChild: RouteCoveragePlace = {
  placeId: "zone-valencia",
  displayName: "Valencia",
  kind: "neighborhood",
  parentPlaceId: "city-sc",
  selectionRole: "child_included",
  lat: 34.44,
  lng: -118.55,
  bounds: { north: 34.46, south: 34.42, east: -118.5, west: -118.6 },
};

test("ciudad completa coincide por ciudad o bounds", () => {
  assert.equal(
    addressMatchesCoveragePlaces({
      places: [santaClaritaWhole],
      address: { city: "Santa Clarita", neighborhood: "Canyon Country", postalCode: "91387" },
    }),
    true,
  );
  assert.equal(
    addressMatchesCoveragePlaces({
      places: [santaClaritaWhole],
      address: { city: "Lancaster", lat: 34.4, lng: -118.55 },
    }),
    true,
  );
  assert.equal(
    addressMatchesCoveragePlaces({
      places: [santaClaritaWhole],
      address: { city: "Lancaster", lat: 35, lng: -118 },
    }),
    false,
  );
});

test("desglose parcial solo admite zonas hijas seleccionadas", () => {
  assert.equal(
    addressMatchesCoveragePlaces({
      places: [santaClaritaPartial, valenciaChild],
      address: { city: "Santa Clarita", neighborhood: "Valencia" },
    }),
    true,
  );
  assert.equal(
    addressMatchesCoveragePlaces({
      places: [santaClaritaPartial, valenciaChild],
      address: { city: "Santa Clarita", neighborhood: "Canyon Country" },
    }),
    false,
  );
});

test("compatibilidad places exige coincidencia geografica", () => {
  const candidate = {
    routeDefinitionId: "route",
    routeScheduleId: "schedule",
    name: "Valencia",
    weekday: 1,
    startTime: "09:00",
    estimatedEndTime: null,
    coverageMode: "places" as const,
    postalCodes: [],
    places: [santaClaritaPartial, valenciaChild],
    isActive: true,
    routeStatus: "active" as const,
  };
  assert.equal(
    routeCandidateIsCompatible({
      candidate,
      postalCode: "91355",
      weekday: 1,
      time: "10:00",
      requestedBoxes: 1,
      address: { city: "Santa Clarita", neighborhood: "Valencia", postalCode: "91355" },
    }),
    true,
  );
  assert.equal(
    routeCandidateIsCompatible({
      candidate,
      postalCode: "91387",
      weekday: 1,
      time: "10:00",
      requestedBoxes: 1,
      address: { city: "Santa Clarita", neighborhood: "Canyon Country", postalCode: "91387" },
    }),
    false,
  );
});
