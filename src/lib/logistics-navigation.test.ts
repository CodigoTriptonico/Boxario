import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildGoogleMapsRouteUrl, buildMapsNavigationUrl } from "@/lib/logistics-navigation";

describe("logistics-navigation", () => {
  it("builds google and apple navigation urls", () => {
    const urls = buildMapsNavigationUrl({
      lat: 34.05,
      lng: -118.25,
      label: "Cliente",
    });

    assert.ok(urls);
    assert.match(urls.google, /google\.com\/maps/);
    assert.match(urls.apple, /maps:\/\//);
  });

  it("returns null without coordinates", () => {
    assert.equal(buildMapsNavigationUrl({ lat: null, lng: 1 }), null);
  });

  it("builds a Google Maps route preserving the stop order", () => {
    const route = buildGoogleMapsRouteUrl([
      { lat: 34.1, lng: -118.1 },
      { lat: 34.2, lng: -118.2 },
      { lat: 34.3, lng: -118.3 },
      { lat: 34.4, lng: -118.4 },
    ]);

    assert.ok(route);
    const url = new URL(route.url);
    assert.equal(url.searchParams.get("origin"), "34.1,-118.1");
    assert.equal(url.searchParams.get("waypoints"), "34.2,-118.2|34.3,-118.3");
    assert.equal(url.searchParams.get("destination"), "34.4,-118.4");
    assert.equal(url.searchParams.get("travelmode"), "driving");
    assert.equal(route.truncated, false);
  });

  it("ignores stops without coordinates and caps the portable Google Maps link", () => {
    const route = buildGoogleMapsRouteUrl([
      { lat: null, lng: null },
      ...Array.from({ length: 12 }, (_, index) => ({ lat: 34 + index / 100, lng: -118 - index / 100 })),
    ]);

    assert.ok(route);
    assert.equal(route.includedStops, 11);
    assert.equal(route.totalStops, 12);
    assert.equal(route.truncated, true);
  });
});
