import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveDevTunnelOrigins, TUNNEL_DEV_ORIGIN_WILDCARD } from "./dev-tunnel-origins";

describe("resolveDevTunnelOrigins", () => {
  it("includes localhost defaults and trycloudflare wildcard", () => {
    const origins = resolveDevTunnelOrigins();
    assert.ok(origins.includes("localhost"));
    assert.ok(origins.includes("127.0.0.1"));
    assert.equal(origins.includes(TUNNEL_DEV_ORIGIN_WILDCARD), true);
  });

  it("adds the tunnel hostname when provided", () => {
    const origins = resolveDevTunnelOrigins({
      tunnelUrl: "https://tahoe-mainstream-eos-overhead.trycloudflare.com",
    });
    assert.ok(origins.includes("tahoe-mainstream-eos-overhead.trycloudflare.com"));
  });

  it("allows the computer LAN addresses used by phones on the same network", () => {
    const origins = resolveDevTunnelOrigins({
      localOrigins: ["192.168.1.229", " 172.29.176.1 ", ""],
    });

    assert.ok(origins.includes("192.168.1.229"));
    assert.ok(origins.includes("172.29.176.1"));
    assert.equal(origins.includes(""), false);
  });

  it("ignores invalid tunnel urls", () => {
    const origins = resolveDevTunnelOrigins({ tunnelUrl: "not-a-url" });
    assert.equal(origins.length, 3);
  });
});
