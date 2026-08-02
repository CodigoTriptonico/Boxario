import assert from "node:assert/strict";
import test from "node:test";
import {
  localCredentialGuardError,
  parseLoopbackHttpOrigin,
} from "./local-credential-guard.mjs";

test("allows credential scripts only with explicit local development scope", () => {
  assert.equal(
    localCredentialGuardError({
      nodeEnv: "development",
      enabled: "1",
      supabaseUrl: "http://127.0.0.1:54321",
    }),
    null,
  );
});

test("rejects production even when the explicit flag is present", () => {
  assert.match(
    localCredentialGuardError({
      nodeEnv: "production",
      enabled: "1",
      supabaseUrl: "http://127.0.0.1:54321",
    }),
    /NODE_ENV=development/,
  );
});

test("rejects remote Supabase URLs", () => {
  assert.match(
    localCredentialGuardError({
      nodeEnv: "development",
      enabled: "1",
      supabaseUrl: "https://example.supabase.co",
    }),
    /Supabase local/,
  );
});

test("rejects a missing explicit flag", () => {
  assert.match(
    localCredentialGuardError({
      nodeEnv: "development",
      enabled: "0",
      supabaseUrl: "http://localhost:54321",
    }),
    /habilitarse explícitamente/,
  );
});

test("accepts only bare loopback HTTP origins for local credentials", () => {
  assert.equal(
    parseLoopbackHttpOrigin("APP_BASE_URL", "http://127.0.0.1:3000"),
    "http://127.0.0.1:3000",
  );
  assert.equal(
    parseLoopbackHttpOrigin("APP_BASE_URL", "http://localhost:3000/"),
    "http://localhost:3000",
  );
});

test("rejects remote, HTTPS and path-bearing credential origins", () => {
  assert.throws(
    () => parseLoopbackHttpOrigin("APP_BASE_URL", "https://localhost:3000"),
    /HTTP/,
  );
  assert.throws(
    () => parseLoopbackHttpOrigin("APP_BASE_URL", "http://example.com:3000"),
    /localhost/,
  );
  assert.throws(
    () => parseLoopbackHttpOrigin("APP_BASE_URL", "http://localhost:3000/login"),
    /origen local/,
  );
});
