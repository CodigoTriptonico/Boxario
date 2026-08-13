/**
 * Client-side pending agency operation intentions (AGE-001).
 * Namespaced separately from office-payment pending keys.
 * PostgreSQL / idempotency_operations remain authoritative.
 */

export const AGENCY_PENDING_STORAGE_KEY = "boxario.agencyOperation.pending.v1";
const AGENCY_PENDING_TTL_MS = 24 * 60 * 60 * 1000;

export type PendingAgencyCreateIntention = {
  kind: "create_request";
  organizationId: string;
  clientRequestId: string;
  createdAt: number;
};

export type PendingAgencyAssignIntention = {
  kind: "assign_request";
  organizationId: string;
  requestId: string;
  routeId: string;
  clientAssignmentId: string;
  createdAt: number;
};

type PendingAgencyIntention =
  | PendingAgencyCreateIntention
  | PendingAgencyAssignIntention;

type PendingStore = Record<string, PendingAgencyIntention>;

function canUseStorage(): boolean {
  return typeof globalThis.localStorage?.getItem === "function";
}

function readStore(): PendingStore {
  if (!canUseStorage()) return {};
  try {
    const raw = globalThis.localStorage.getItem(AGENCY_PENDING_STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return parsed as PendingStore;
  } catch {
    return {};
  }
}

function writeStore(store: PendingStore): void {
  if (!canUseStorage()) return;
  try {
    const keys = Object.keys(store);
    if (!keys.length) {
      globalThis.localStorage.removeItem(AGENCY_PENDING_STORAGE_KEY);
      return;
    }
    globalThis.localStorage.setItem(AGENCY_PENDING_STORAGE_KEY, JSON.stringify(store));
  } catch {
    // ignore quota / private mode
  }
}

function isFresh(createdAt: number, now: number): boolean {
  return Number.isFinite(createdAt) && now - createdAt <= AGENCY_PENDING_TTL_MS;
}

function createStorageKey(organizationId: string): string {
  return `create:${organizationId}`;
}

function assignStorageKey(organizationId: string, requestId: string): string {
  return `assign:${organizationId}:${requestId}`;
}

export function loadPendingAgencyCreateIntention(
  organizationId: string,
  now = Date.now(),
): PendingAgencyCreateIntention | null {
  const store = readStore();
  const key = createStorageKey(organizationId);
  const entry = store[key];
  if (!entry || entry.kind !== "create_request") return null;
  if (!isFresh(entry.createdAt, now) || entry.clientRequestId.trim().length < 8) {
    delete store[key];
    writeStore(store);
    return null;
  }
  return entry;
}

export function beginAgencyCreateIntention(input: {
  organizationId: string;
  clientRequestId: string;
  createdAt?: number;
}): PendingAgencyCreateIntention {
  const full: PendingAgencyCreateIntention = {
    kind: "create_request",
    organizationId: input.organizationId,
    clientRequestId: input.clientRequestId,
    createdAt: input.createdAt ?? Date.now(),
  };
  const store = readStore();
  store[createStorageKey(full.organizationId)] = full;
  writeStore(store);
  return full;
}

export function clearPendingAgencyCreateIntention(organizationId: string): void {
  const store = readStore();
  const key = createStorageKey(organizationId);
  if (!(key in store)) return;
  delete store[key];
  writeStore(store);
}

export function resolveAgencyCreateIntentionOnOpen(input: {
  organizationId: string;
  mintId: () => string;
  now?: number;
}): { clientRequestId: string; restored: boolean } {
  const pending = loadPendingAgencyCreateIntention(input.organizationId, input.now);
  if (pending) {
    return { clientRequestId: pending.clientRequestId, restored: true };
  }
  const clientRequestId = input.mintId();
  return { clientRequestId, restored: false };
}

export function loadPendingAgencyAssignIntention(
  organizationId: string,
  requestId: string,
  now = Date.now(),
): PendingAgencyAssignIntention | null {
  const store = readStore();
  const key = assignStorageKey(organizationId, requestId);
  const entry = store[key];
  if (!entry || entry.kind !== "assign_request") return null;
  if (!isFresh(entry.createdAt, now) || entry.clientAssignmentId.trim().length < 8) {
    delete store[key];
    writeStore(store);
    return null;
  }
  return entry;
}

export function beginAgencyAssignIntention(input: {
  organizationId: string;
  requestId: string;
  routeId: string;
  clientAssignmentId: string;
  createdAt?: number;
}): PendingAgencyAssignIntention {
  const full: PendingAgencyAssignIntention = {
    kind: "assign_request",
    organizationId: input.organizationId,
    requestId: input.requestId,
    routeId: input.routeId,
    clientAssignmentId: input.clientAssignmentId,
    createdAt: input.createdAt ?? Date.now(),
  };
  const store = readStore();
  store[assignStorageKey(full.organizationId, full.requestId)] = full;
  writeStore(store);
  return full;
}

export function clearPendingAgencyAssignIntention(
  organizationId: string,
  requestId: string,
): void {
  const store = readStore();
  const key = assignStorageKey(organizationId, requestId);
  if (!(key in store)) return;
  delete store[key];
  writeStore(store);
}

/**
 * Restore pending assign only when org+request+route match.
 * A different target route is a new intention (mint a new key).
 */
export function resolveAgencyAssignIntention(input: {
  organizationId: string;
  requestId: string;
  routeId: string;
  mintId: () => string;
  now?: number;
}): { clientAssignmentId: string; restored: boolean } {
  const pending = loadPendingAgencyAssignIntention(
    input.organizationId,
    input.requestId,
    input.now,
  );
  if (pending && pending.routeId === input.routeId) {
    return { clientAssignmentId: pending.clientAssignmentId, restored: true };
  }
  const clientAssignmentId = input.mintId();
  return { clientAssignmentId, restored: false };
}
