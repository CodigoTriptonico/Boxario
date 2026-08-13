import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { uniqueMapPositions } from "@/components/logistica/logistics-stops-map";

describe("logistics stops map", () => {
  it("treats repeated stops at the same coordinates as one map location", () => {
    assert.deepEqual(
      uniqueMapPositions([
        { lat: 34.424, lng: -118.535 },
        { lat: 34.424, lng: -118.535 },
      ]),
      [{ lat: 34.424, lng: -118.535 }],
    );
  });

  it("keeps genuinely different locations", () => {
    assert.equal(
      uniqueMapPositions([
        { lat: 34.424, lng: -118.535 },
        { lat: 34.4167103, lng: -118.4477933 },
      ]).length,
      2,
    );
  });
});
