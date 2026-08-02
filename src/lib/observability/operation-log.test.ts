import assert from "node:assert/strict";
import { describe, it, mock } from "node:test";
import { logOperation } from "@/lib/observability/operation-log";

describe("logOperation", () => {
  it("writes a single-line JSON object via console.info", () => {
    const info = mock.method(console, "info", () => {});

    logOperation({
      operation: "logistics.route_cancel",
      organizationId: "org-1",
      actorUserId: "user-1",
      resourceType: "logistics_route",
      resourceId: "route-1",
      durationMs: 12.6,
      result: "ok",
      operationId: "op-1",
    });

    assert.equal(info.mock.calls.length, 1);
    const line = String(info.mock.calls[0]?.arguments[0] ?? "");
    const parsed = JSON.parse(line) as Record<string, unknown>;
    assert.equal(parsed.type, "operation");
    assert.equal(parsed.operation, "logistics.route_cancel");
    assert.equal(parsed.result, "ok");
    assert.equal(parsed.organizationId, "org-1");
    assert.equal(parsed.durationMs, 13);
    assert.equal(parsed.resourceId, "route-1");
    assert.equal(Object.keys(parsed).includes("password"), false);
    assert.equal(Object.keys(parsed).includes("token"), false);

    info.mock.restore();
  });

  it("records errorCode on failure", () => {
    const info = mock.method(console, "info", () => {});

    logOperation({
      operation: "logistics.route_cancel",
      result: "error",
      errorCode: "FORBIDDEN",
    });

    const parsed = JSON.parse(String(info.mock.calls[0]?.arguments[0] ?? "")) as Record<
      string,
      unknown
    >;
    assert.equal(parsed.result, "error");
    assert.equal(parsed.errorCode, "FORBIDDEN");

    info.mock.restore();
  });
});
