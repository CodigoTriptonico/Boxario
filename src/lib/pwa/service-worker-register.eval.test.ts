import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const source = readFileSync(
  join(process.cwd(), "src/components/pwa/service-worker-register.tsx"),
  "utf8",
);
const rootLayoutSource = readFileSync(
  join(process.cwd(), "src/app/layout.tsx"),
  "utf8",
);
const cleanupRouteSource = readFileSync(
  join(process.cwd(), "src/app/dev-sw-cleanup/route.ts"),
  "utf8",
);
const proxySource = readFileSync(join(process.cwd(), "src/proxy.ts"), "utf8");

describe("service worker registration eval", () => {
  it("does not register the worker in development and removes stale app caches", () => {
    assert.match(source, /nodeEnv: process\.env\.NODE_ENV/);
    assert.match(source, /process\.env\.NODE_ENV !== "production"/);
    assert.match(source, /registration\.unregister\(\)/);
    assert.match(source, /new URL\(controllerUrl\)\.pathname === "\/sw\.js"/);
    assert.match(source, /name\.startsWith\("boxario-static-"\)/);
    assert.match(source, /window\.location\.reload\(\)/);
    assert.match(source, /DEV_SERVICE_WORKER_RELOAD_FLAG/);
    assert.match(source, /shouldReloadOnceAfterDevelopmentCleanup/);
    assert.match(
      source,
      /if \(!hasAppController\) \{\s*sessionStorage\.removeItem\(DEV_SERVICE_WORKER_RELOAD_FLAG\);\s*\}/,
    );
  });

  it("escapes a stale controller before cached React bundles can run", () => {
    assert.match(rootLayoutSource, /process\.env\.NODE_ENV !== "production"/);
    assert.match(rootLayoutSource, /navigator\.serviceWorker\.controller/);
    assert.match(rootLayoutSource, /location\.replace\("\/dev-sw-cleanup\?return="/);
    assert.ok(
      rootLayoutSource.indexOf("/dev-sw-cleanup?return=") <
        rootLayoutSource.indexOf('<body className='),
    );
    assert.match(cleanupRouteSource, /registration\.unregister\(\)/);
    assert.match(cleanupRouteSource, /name\.startsWith\("boxario-static-"\)/);
    assert.match(cleanupRouteSource, /"Cache-Control": "no-store"/);
    assert.match(cleanupRouteSource, /process\.env\.NODE_ENV === "production"/);
    assert.match(
      proxySource,
      /process\.env\.NODE_ENV !== "production" && pathname === "\/dev-sw-cleanup"/,
    );
  });
});
