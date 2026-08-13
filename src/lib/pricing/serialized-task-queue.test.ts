import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SerializedTaskQueue } from "@/lib/pricing/serialized-task-queue";

describe("SerializedTaskQueue", () => {
  it("never runs two persistence tasks concurrently", async () => {
    const queue = new SerializedTaskQueue();
    let active = 0;
    let maximumActive = 0;
    const order: string[] = [];

    const first = queue.enqueue(async () => {
      active += 1;
      maximumActive = Math.max(maximumActive, active);
      order.push("first:start");
      await new Promise((resolve) => setTimeout(resolve, 10));
      order.push("first:end");
      active -= 1;
      return "first";
    });
    const second = queue.enqueue(async () => {
      active += 1;
      maximumActive = Math.max(maximumActive, active);
      order.push("second:start");
      active -= 1;
      return "second";
    });

    assert.deepEqual(await Promise.all([first, second]), ["first", "second"]);
    assert.equal(maximumActive, 1);
    assert.deepEqual(order, ["first:start", "first:end", "second:start"]);
  });

  it("continues after a failed task", async () => {
    const queue = new SerializedTaskQueue();
    const failed = queue.enqueue(async () => {
      throw new Error("network");
    });
    const recovered = queue.enqueue(async () => "recovered");

    await assert.rejects(failed, /network/);
    assert.equal(await recovered, "recovered");
  });
});
