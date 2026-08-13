import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  contextMenuFlyoutSideClass,
  resolveContextMenuFlyoutSide,
} from "@/components/context-menu-flyout";

describe("context menu flyout placement", () => {
  it("opens right when there is room, otherwise flips left", () => {
    const previous = globalThis.window;
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: { innerWidth: 1000 },
    });

    try {
      assert.equal(
        resolveContextMenuFlyoutSide({ left: 100, right: 300 }, 256),
        "right",
      );
      assert.equal(
        resolveContextMenuFlyoutSide({ left: 800, right: 980 }, 256),
        "left",
      );
      assert.equal(
        resolveContextMenuFlyoutSide({ left: 200, right: 900 }, 256),
        "left",
      );
    } finally {
      Object.defineProperty(globalThis, "window", {
        configurable: true,
        value: previous,
      });
    }
  });

  it("exposes side classes for absolute panels", () => {
    assert.match(contextMenuFlyoutSideClass("right"), /left-\[calc\(100%-1px\)\]/);
    assert.match(contextMenuFlyoutSideClass("left"), /right-\[calc\(100%-1px\)\]/);
  });

  it("wires placement into ContextMenuFlyout", () => {
    const source = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "../components/context-menu-flyout.tsx"),
      "utf8",
    );
    assert.match(source, /resolveContextMenuFlyoutSide/);
    assert.match(source, /data-flyout-side=\{side\}/);
    assert.match(source, /updatePlacement/);
  });
});
