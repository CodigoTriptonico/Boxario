import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  agencyAlreadyAssignedUserMessage,
  agencyAssignIdempotencyKey,
  agencyCompleteVisitIdempotencyKey,
  agencyIdempotencyConflictUserMessage,
  AGENCY_IDEMPOTENCY_CONFLICT,
  AGENCY_REQUEST_ALREADY_ASSIGNED,
  isDefinitiveAgencyClientError,
  mapAgencyOperationError,
  parseAgencyAssignRpcResult,
  parseAgencyCreateRpcResult,
  requireClientIdempotencyKey,
  validateClientAgencyIdempotencyKey,
} from "@/lib/agency-idempotency";
import {
  AGENCY_PENDING_STORAGE_KEY,
  beginAgencyAssignIntention,
  beginAgencyCreateIntention,
  clearPendingAgencyAssignIntention,
  clearPendingAgencyCreateIntention,
  loadPendingAgencyAssignIntention,
  loadPendingAgencyCreateIntention,
  resolveAgencyAssignIntention,
  resolveAgencyCreateIntentionOnOpen,
} from "@/lib/agency-pending";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

test("agency assign and complete keys are stable for retries", () => {
  assert.equal(
    agencyAssignIdempotencyKey("req-1", "route-2"),
    "assign:req-1:route-2",
  );
  assert.equal(
    agencyAssignIdempotencyKey("req-1", "route-2", "2026-08-03T12:00:00Z"),
    "assign:req-1:route-2:2026-08-03T12:00:00Z",
  );
  assert.equal(
    agencyCompleteVisitIdempotencyKey("visit-9"),
    "complete-visit:visit-9",
  );
});

test("validateClientAgencyIdempotencyKey rejects empty and short keys", () => {
  assert.equal(validateClientAgencyIdempotencyKey("").ok, false);
  assert.equal(validateClientAgencyIdempotencyKey("short").ok, false);
  assert.equal(validateClientAgencyIdempotencyKey("a".repeat(129)).ok, false);
  const ok = validateClientAgencyIdempotencyKey("  client-key-01  ");
  assert.equal(ok.ok, true);
  if (ok.ok) assert.equal(ok.value, "client-key-01");
});

test("requireClientIdempotencyKey rejects empty keys", () => {
  assert.throws(() => requireClientIdempotencyKey("", "La solicitud"), /clave de idempotencia/);
  assert.throws(() => requireClientIdempotencyKey("   ", "La solicitud"), /clave de idempotencia/);
  assert.equal(requireClientIdempotencyKey(" abcdefgh ", "La solicitud"), "abcdefgh");
});

test("parse agency RPC results", () => {
  assert.equal(parseAgencyCreateRpcResult(null), null);
  assert.deepEqual(parseAgencyCreateRpcResult({ requestId: "r1", replayed: true, fingerprint: "f" }), {
    requestId: "r1",
    replayed: true,
    fingerprint: "f",
  });
  assert.deepEqual(parseAgencyAssignRpcResult({ visitId: "v1", requestId: "r1", routeId: "rt", replayed: false }), {
    visitId: "v1",
    requestId: "r1",
    routeId: "rt",
    replayed: false,
    fingerprint: null,
  });
});

test("mapAgencyOperationError returns stable domain codes", () => {
  assert.equal(mapAgencyOperationError("AGENCY_IDEMPOTENCY_CONFLICT"), AGENCY_IDEMPOTENCY_CONFLICT);
  assert.equal(mapAgencyOperationError("REQUEST_ALREADY_ASSIGNED"), AGENCY_REQUEST_ALREADY_ASSIGNED);
  assert.equal(mapAgencyOperationError("FORBIDDEN"), "FORBIDDEN");
  assert.match(agencyIdempotencyConflictUserMessage(), /otros datos/);
  assert.match(agencyAlreadyAssignedUserMessage(), /ya está asignada/);
});

test("definitive agency client errors do not include network ambiguity", () => {
  assert.equal(isDefinitiveAgencyClientError(AGENCY_IDEMPOTENCY_CONFLICT), true);
  assert.equal(isDefinitiveAgencyClientError(AGENCY_REQUEST_ALREADY_ASSIGNED), true);
  assert.equal(isDefinitiveAgencyClientError("FORBIDDEN"), true);
  assert.equal(isDefinitiveAgencyClientError("Failed to fetch"), false);
  assert.equal(isDefinitiveAgencyClientError("TypeError: NetworkError"), false);
  assert.equal(isDefinitiveAgencyClientError("timeout"), false);
});

test("agency create pending intention survives close/reopen namespace", () => {
  const memory = new Map<string, string>();
  const original = globalThis.localStorage;
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => {
        memory.set(key, value);
      },
      removeItem: (key: string) => {
        memory.delete(key);
      },
    },
  });

  try {
    const orgA = "org-agency-a";
    const orgB = "org-agency-b";
    beginAgencyCreateIntention({ organizationId: orgA, clientRequestId: "create-key-aaaa" });
    beginAgencyCreateIntention({ organizationId: orgB, clientRequestId: "create-key-bbbb" });

    const restored = resolveAgencyCreateIntentionOnOpen({
      organizationId: orgA,
      mintId: () => "should-not-mint",
    });
    assert.equal(restored.restored, true);
    assert.equal(restored.clientRequestId, "create-key-aaaa");
    assert.equal(loadPendingAgencyCreateIntention(orgB)?.clientRequestId, "create-key-bbbb");

    clearPendingAgencyCreateIntention(orgA);
    assert.equal(loadPendingAgencyCreateIntention(orgA), null);
    const fresh = resolveAgencyCreateIntentionOnOpen({
      organizationId: orgA,
      mintId: () => "fresh-create-key",
    });
    assert.equal(fresh.restored, false);
    assert.equal(fresh.clientRequestId, "fresh-create-key");
    assert.match(memory.get(AGENCY_PENDING_STORAGE_KEY) || "", /create-key-bbbb/);
  } finally {
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: original,
    });
  }
});

test("agency assign pending intention is scoped by org+request and route", () => {
  const memory = new Map<string, string>();
  const original = globalThis.localStorage;
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => {
        memory.set(key, value);
      },
      removeItem: (key: string) => {
        memory.delete(key);
      },
    },
  });

  try {
    beginAgencyAssignIntention({
      organizationId: "org-1",
      requestId: "req-1",
      routeId: "route-a",
      clientAssignmentId: "assign-key-aaaa",
    });
    const same = resolveAgencyAssignIntention({
      organizationId: "org-1",
      requestId: "req-1",
      routeId: "route-a",
      mintId: () => "new-key",
    });
    assert.equal(same.restored, true);
    assert.equal(same.clientAssignmentId, "assign-key-aaaa");

    const otherRoute = resolveAgencyAssignIntention({
      organizationId: "org-1",
      requestId: "req-1",
      routeId: "route-b",
      mintId: () => "new-route-key",
    });
    assert.equal(otherRoute.restored, false);
    assert.equal(otherRoute.clientAssignmentId, "new-route-key");

    clearPendingAgencyAssignIntention("org-1", "req-1");
    assert.equal(loadPendingAgencyAssignIntention("org-1", "req-1"), null);
    assert.equal(memory.has(AGENCY_PENDING_STORAGE_KEY), false);
  } finally {
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: original,
    });
  }
});

test("agency actions require client keys and never mint randomUUID for create/assign", () => {
  const actionsSource = readFileSync(join(root, "src/app/actions/agency-operations.ts"), "utf8");
  const createPanel = readFileSync(join(root, "src/components/business/agency-operations-panel.tsx"), "utf8");
  const assignPanel = readFileSync(join(root, "src/components/logistica/agency-logistics-panel.tsx"), "utf8");
  const migration = readFileSync(
    join(root, "supabase/migrations/179_agency_operations_idempotency.sql"),
    "utf8",
  );

  assert.doesNotMatch(actionsSource, /idempotency_key:\s*randomUUID\(\)/);
  assert.doesNotMatch(actionsSource, /agencyAssignIdempotencyKey\(/);
  assert.match(actionsSource, /validateClientAgencyIdempotencyKey/);
  assert.match(actionsSource, /idempotencyKey: string/);
  assert.match(actionsSource, /replayed: boolean/);
  assert.match(createPanel, /beginAgencyCreateIntention/);
  assert.match(createPanel, /resolveAgencyCreateIntentionOnOpen/);
  assert.match(assignPanel, /beginAgencyAssignIntention/);
  assert.match(assignPanel, /clientAssignmentId|idempotencyKey/);
  assert.match(migration, /AGENCY_IDEMPOTENCY_CONFLICT/);
  assert.match(migration, /REQUEST_ALREADY_ASSIGNED/);
  assert.match(migration, /request_hash/);
  assert.match(migration, /agency_visit_lines_request_line_uidx/);
  assert.match(migration, /pg_advisory_xact_lock/);
});
