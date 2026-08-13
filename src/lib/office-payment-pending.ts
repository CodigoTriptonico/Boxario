/**
 * Client-side pending office-payment intention (FIN-004).
 * Survives dialog close/reopen and ambiguous network errors.
 * PostgreSQL remains the authority; this store only preserves clientPaymentId.
 */

import type { PaymentMethod } from "@/lib/payment-methods";

export const OFFICE_PAYMENT_PENDING_STORAGE_KEY = "boxario.officePayment.pending.v1";
export const OFFICE_PAYMENT_PENDING_TTL_MS = 24 * 60 * 60 * 1000;

export type PendingOfficePaymentIntention = {
  shipmentId: string;
  clientPaymentId: string;
  /** Exact amount sent; null means "full remaining balance" at send time. */
  amount: number | null;
  method: PaymentMethod;
  createdAt: number;
};

type PendingStore = Record<string, PendingOfficePaymentIntention>;

function canUseStorage(): boolean {
  return typeof globalThis.localStorage?.getItem === "function";
}

function readStore(): PendingStore {
  if (!canUseStorage()) {
    return {};
  }
  try {
    const raw = globalThis.localStorage.getItem(OFFICE_PAYMENT_PENDING_STORAGE_KEY);
    if (!raw) {
      return {};
    }
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    return parsed as PendingStore;
  } catch {
    return {};
  }
}

function writeStore(store: PendingStore): void {
  if (!canUseStorage()) {
    return;
  }
  try {
    const keys = Object.keys(store);
    if (keys.length === 0) {
      globalThis.localStorage.removeItem(OFFICE_PAYMENT_PENDING_STORAGE_KEY);
      return;
    }
    globalThis.localStorage.setItem(OFFICE_PAYMENT_PENDING_STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Quota / private mode — ignore; in-memory refs still work within the session.
  }
}

function isValidIntention(
  value: PendingOfficePaymentIntention | undefined,
  now = Date.now(),
): value is PendingOfficePaymentIntention {
  if (!value) {
    return false;
  }
  if (!value.shipmentId || !value.clientPaymentId) {
    return false;
  }
  if (String(value.clientPaymentId).trim().length < 8) {
    return false;
  }
  if (!Number.isFinite(value.createdAt) || now - value.createdAt > OFFICE_PAYMENT_PENDING_TTL_MS) {
    return false;
  }
  if (value.amount !== null && !(Number.isFinite(value.amount) && value.amount > 0)) {
    return false;
  }
  if (!value.method) {
    return false;
  }
  return true;
}

export function loadPendingOfficePaymentIntention(
  shipmentId: string,
  now = Date.now(),
): PendingOfficePaymentIntention | null {
  const store = readStore();
  let changed = false;
  for (const [key, entry] of Object.entries(store)) {
    if (!isValidIntention(entry, now)) {
      delete store[key];
      changed = true;
    }
  }
  if (changed) {
    writeStore(store);
  }
  const pending = store[shipmentId];
  return isValidIntention(pending, now) ? pending : null;
}

function savePendingOfficePaymentIntention(
  intention: PendingOfficePaymentIntention,
  now = Date.now(),
): void {
  if (!isValidIntention(intention, now)) {
    return;
  }
  const store = readStore();
  // Drop stale entries while writing.
  for (const [key, entry] of Object.entries(store)) {
    if (!isValidIntention(entry, now)) {
      delete store[key];
    }
  }
  store[intention.shipmentId] = {
    shipmentId: intention.shipmentId,
    clientPaymentId: intention.clientPaymentId,
    amount: intention.amount,
    method: intention.method,
    createdAt: intention.createdAt,
  };
  writeStore(store);
}

export function clearPendingOfficePaymentIntention(shipmentId: string): void {
  const store = readStore();
  if (!(shipmentId in store)) {
    return;
  }
  delete store[shipmentId];
  writeStore(store);
}

export function beginOfficePaymentIntention(input: {
  shipmentId: string;
  clientPaymentId: string;
  amount: number | null;
  method: PaymentMethod;
  now?: number;
}): PendingOfficePaymentIntention {
  const createdAt = input.now ?? Date.now();
  const intention: PendingOfficePaymentIntention = {
    shipmentId: input.shipmentId,
    clientPaymentId: input.clientPaymentId,
    amount: input.amount,
    method: input.method,
    createdAt,
  };
  savePendingOfficePaymentIntention(intention, createdAt);
  return intention;
}

/** Resolve which clientPaymentId to use when opening the collect dialog. */
export function resolveOfficePaymentIntentionOnOpen(input: {
  shipmentId: string;
  mintId: () => string;
  now?: number;
}): { clientPaymentId: string; restored: boolean; pending: PendingOfficePaymentIntention | null } {
  const pending = loadPendingOfficePaymentIntention(input.shipmentId, input.now);
  if (pending) {
    return {
      clientPaymentId: pending.clientPaymentId,
      restored: true,
      pending,
    };
  }
  return {
    clientPaymentId: input.mintId(),
    restored: false,
    pending: null,
  };
}
