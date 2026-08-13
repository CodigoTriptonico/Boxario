import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { customerRouteAssignmentZoneKey } from "@/lib/customer-route-assignment-zone";

describe("customer route assignment zone key", () => {
  it("preserves a configured geographic zone", () => {
    assert.equal(
      customerRouteAssignmentZoneKey({
        zoneName: " Valle norte ",
        isSystemGeneral: false,
        weekday: 0,
        routeDefinitionId: "route-1",
      }),
      "Valle norte",
    );
  });

  it("uses the operating weekday for a general day route", () => {
    assert.equal(
      customerRouteAssignmentZoneKey({
        zoneName: "",
        isSystemGeneral: true,
        weekday: 0,
        routeDefinitionId: "general-monday",
      }),
      "day:0",
    );
  });

  it("keeps named routes non-empty even when their zone is blank", () => {
    assert.equal(
      customerRouteAssignmentZoneKey({
        zoneName: null,
        isSystemGeneral: false,
        weekday: 4,
        routeDefinitionId: "route-friday",
      }),
      "route:route-friday",
    );
  });

  it("keeps the database key non-empty for incomplete route metadata", () => {
    assert.equal(
      customerRouteAssignmentZoneKey({
        zoneName: "",
        isSystemGeneral: false,
        weekday: 2,
        routeDefinitionId: "",
      }),
      "route:unknown",
    );
  });
});
