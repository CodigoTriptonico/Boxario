import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildLogisticsGeoAddressPatch,
  routeAddressForLogisticsTask,
  routeAddressFromCustomer,
} from "@/lib/logistics-address";

describe("logistics-address", () => {
  it("falls back to recipient snapshot geo when customer lacks coordinates", () => {
    const address = routeAddressForLogisticsTask(
      {
        customerId: "cust-1",
        customerName: "Ana Lopez",
        recipientSnapshot: {
          street: "Main",
          city: "LA",
          lat: 34.05,
          lng: -118.25,
          formattedAddress: "Main, LA",
          placeId: "place-1",
        },
      },
      "deliver_empty_box",
      new Map([
        [
          "cust-1",
          {
            id: "cust-1",
            first_name: "Ana",
            last_name: "Lopez",
            street: "Main",
            city: "LA",
            country: "USA",
          },
        ],
      ]),
    );

    assert.equal(address.lat, 34.05);
    assert.equal(address.lng, -118.25);
    assert.equal(address.placeId, "place-1");
    assert.equal(address.source, "customer");
  });

  it("keeps customer address when geo is present", () => {
    const customer = routeAddressFromCustomer({
      id: "cust-1",
      first_name: "Ana",
      last_name: "Lopez",
      street: "Oak",
      city: "LA",
      country: "USA",
      lat: 1,
      lng: 2,
      formatted_address: "Oak LA",
      place_id: "place-2",
    });

    assert.equal(customer?.lat, 1);
    assert.equal(customer?.lng, 2);
  });

  it("uses the confirmed entrance for navigation and retains the geocoded address point", () => {
    const customer = routeAddressFromCustomer({
      id: "cust-entrance",
      formatted_address: "12 Oak, LA",
      lat: 34.05,
      lng: -118.25,
      exact_entrance_lat: 34.0507,
      exact_entrance_lng: -118.2512,
      exact_entrance_confirmed_at: "2026-08-13T12:00:00.000Z",
      exact_entrance_note: "Portón negro",
      exact_entrance_pano_id: "pano-1",
    });

    assert.equal(customer?.lat, 34.0507);
    assert.equal(customer?.lng, -118.2512);
    assert.equal(customer?.addressLat, 34.05);
    assert.equal(customer?.addressLng, -118.25);
    assert.equal(customer?.exactEntranceConfirmed, true);
    assert.equal(customer?.exactEntranceNote, "Portón negro");
  });

  it("keeps the corrected geo address aligned in the stop and recipient snapshot", () => {
    const patch = buildLogisticsGeoAddressPatch({
      customerId: "cust-1",
      customerName: "Ana Lopez",
      recipientSnapshot: { firstName: "Ana", lastName: "Lopez", phone: "555" },
      street: "Oak",
      houseNumber: "12",
      city: "LA",
      state: "CA",
      postalCode: "90001",
      country: "USA",
      formattedAddress: "12 Oak, LA",
      placeId: "place-2",
      lat: 34.05,
      lng: -118.25,
    });

    assert.equal(patch.addressSnapshot.formattedAddress, "12 Oak, LA");
    assert.equal(patch.addressSnapshot.lat, 34.05);
    assert.equal(patch.recipientSnapshot?.placeId, "place-2");
  });
});
