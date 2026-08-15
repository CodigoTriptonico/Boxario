import assert from "node:assert/strict";
import test from "node:test";
import {
  buildGoogleAddressQuery,
  normalizeGoogleAddressGeocodeResult,
} from "./google-address-geocoding";

test("la geocodificación de respaldo arma la consulta con la dirección postal", () => {
  assert.equal(
    buildGoogleAddressQuery({
      houseNumber: "23845",
      street: "McBean Parkway",
      city: "Valencia",
      state: "CA",
      postalCode: "91355",
      country: "USA",
    }),
    "23845, McBean Parkway, Valencia, CA, 91355, USA",
  );
  assert.equal(buildGoogleAddressQuery({ country: "USA" }), "");
});

test("un resultado parcial conserva la ubicación, pero queda identificable como aproximado", () => {
  assert.deepEqual(
    normalizeGoogleAddressGeocodeResult(
      {
        formatted_address: "Valencia, CA 91355, USA",
        partial_match: true,
        place_id: "place-valencia",
        geometry: { location: { lat: 34.4436, lng: -118.6095 } },
      },
      "23845 McBean Parkway, Valencia, CA 91355, USA",
    ),
    {
      lat: 34.4436,
      lng: -118.6095,
      label: "Valencia, CA 91355, USA",
      placeId: "place-valencia",
      partial: true,
    },
  );
});

test("el respaldo rechaza coordenadas imposibles", () => {
  assert.equal(
    normalizeGoogleAddressGeocodeResult({ geometry: { location: { lat: 0, lng: 181 } } }, "Dirección"),
    null,
  );
});
