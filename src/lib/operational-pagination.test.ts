import assert from "node:assert/strict";
import test from "node:test";
import { takeOperationalPage } from "@/lib/operational-pagination";

test("cursor page keeps a relevant item outside the initial 50 without accumulating 1,000 rows", () => {
  const rows = Array.from({ length: 1_000 }, (_, index) => `task-${index}`);
  const first = takeOperationalPage(rows, 50);
  const later = takeOperationalPage(rows.slice(950), 50);
  assert.equal(first.items.length, 50);
  assert.equal(first.hasMore, true);
  assert.equal(later.items.at(-1), "task-999");
  assert.equal(later.hasMore, false);
});

test("a 10,000-row server result transfers only one bounded page", () => {
  const page = takeOperationalPage(Array.from({ length: 10_000 }, (_, index) => index), 100);
  assert.equal(page.items.length, 100);
  assert.equal(page.items[0], 0);
  assert.equal(page.items.at(-1), 99);
  assert.equal(page.hasMore, true);
});
