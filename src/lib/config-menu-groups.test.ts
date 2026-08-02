import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CONFIG_MENU_GROUPS, CONFIG_MENU_SECTION_IDS } from "./config-menu-groups";

describe("config menu groups", () => {
  it("lists only the sections shown on the landing menu", () => {
    assert.deepEqual([...CONFIG_MENU_SECTION_IDS].sort(), [
      "appearance",
      "organization",
      "prices",
      "timeclock",
    ]);
  });

  it("keeps operation lean and administration balanced", () => {
    assert.equal(CONFIG_MENU_GROUPS.length, 2);
    assert.equal(CONFIG_MENU_GROUPS[0]?.sectionIds.length, 1);
    assert.equal(CONFIG_MENU_GROUPS[1]?.sectionIds.length, 3);
  });

  it("groups operation settings before administration settings", () => {
    assert.equal(CONFIG_MENU_GROUPS[0]?.id, "operation");
    assert.equal(CONFIG_MENU_GROUPS[1]?.id, "administration");
    assert.deepEqual(CONFIG_MENU_GROUPS[0]?.sectionIds, ["prices"]);
    assert.ok(!CONFIG_MENU_GROUPS[0]?.sectionIds.includes("distributors"));
    assert.ok(CONFIG_MENU_GROUPS[1]?.sectionIds.includes("organization"));
    assert.ok(CONFIG_MENU_GROUPS[1]?.sectionIds.includes("timeclock"));
  });
});
