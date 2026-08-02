import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

const SIGNED_URL_TTL_SECONDS = 60 * 60;

export function extractStorageObjectPath(bucket: string, value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (!trimmed.includes("://")) {
    return trimmed.replace(/^\/+/, "");
  }

  const publicMarker = `/object/public/${bucket}/`;
  const publicIndex = trimmed.indexOf(publicMarker);
  if (publicIndex >= 0) {
    return trimmed.slice(publicIndex + publicMarker.length);
  }

  const signMarker = `/object/sign/${bucket}/`;
  const signIndex = trimmed.indexOf(signMarker);
  if (signIndex >= 0) {
    return trimmed.slice(signIndex + signMarker.length).split("?")[0] || null;
  }

  return null;
}

/** Reject path traversal and empty/unsafe storage object keys. */
export function isSafeStorageObjectPath(path: string): boolean {
  const trimmed = path.trim();
  if (!trimmed) {
    return false;
  }

  if (
    trimmed.startsWith("/") ||
    trimmed.includes("\\") ||
    trimmed.includes("\0") ||
    trimmed.includes("//")
  ) {
    return false;
  }

  let decoded = trimmed;
  try {
    decoded = decodeURIComponent(trimmed);
  } catch {
    return false;
  }

  if (decoded.includes("..") || decoded.includes("\\") || decoded.includes("\0")) {
    return false;
  }

  const segments = decoded.split("/").filter(Boolean);
  if (!segments.length || segments.some((segment) => segment === "." || segment === "..")) {
    return false;
  }

  return true;
}

/** True when path is exactly ownerId or under ownerId/. */
export function storagePathOwnedBy(path: string, ownerId: string): boolean {
  const owner = ownerId.trim();
  if (!owner || !isSafeStorageObjectPath(path)) {
    return false;
  }

  return path === owner || path.startsWith(`${owner}/`);
}

export function assertStoragePathOwnedBy(path: string, ownerId: string): string {
  const normalized = path.replace(/^\/+/, "").trim();
  if (!storagePathOwnedBy(normalized, ownerId)) {
    throw new Error("FORBIDDEN_STORAGE_PATH");
  }
  return normalized;
}

export type CreateStorageSignedUrlOptions = {
  expiresInSeconds?: number;
  /** Required owner folder (organizationId or userId for avatars). */
  ownerId?: string;
};

export async function createStorageSignedUrl(
  client: SupabaseClient,
  bucket: string,
  pathOrUrl: string,
  expiresInSecondsOrOptions: number | CreateStorageSignedUrlOptions = SIGNED_URL_TTL_SECONDS,
): Promise<string> {
  const options: CreateStorageSignedUrlOptions =
    typeof expiresInSecondsOrOptions === "number"
      ? { expiresInSeconds: expiresInSecondsOrOptions }
      : expiresInSecondsOrOptions;

  const path = extractStorageObjectPath(bucket, pathOrUrl);
  if (!path || !isSafeStorageObjectPath(path)) {
    return "";
  }

  if (options.ownerId && !storagePathOwnedBy(path, options.ownerId)) {
    return "";
  }

  const { data, error } = await client.storage
    .from(bucket)
    .createSignedUrl(path, options.expiresInSeconds ?? SIGNED_URL_TTL_SECONDS);

  if (error || !data?.signedUrl) {
    return "";
  }

  return data.signedUrl;
}

/**
 * Firma varias rutas en una sola llamada a Storage.
 * Mantiene el control de ownership por organización; no comparte firmas entre orgs.
 */
export async function createStorageSignedUrls(
  client: SupabaseClient,
  bucket: string,
  pathOrUrls: string[],
  options: CreateStorageSignedUrlOptions = {},
): Promise<Map<string, string>> {
  const expiresIn = options.expiresInSeconds ?? SIGNED_URL_TTL_SECONDS;
  const uniquePaths: string[] = [];
  const pathByInput = new Map<string, string>();

  for (const pathOrUrl of pathOrUrls) {
    const path = extractStorageObjectPath(bucket, pathOrUrl);
    if (!path || !isSafeStorageObjectPath(path)) {
      continue;
    }
    if (options.ownerId && !storagePathOwnedBy(path, options.ownerId)) {
      continue;
    }
    pathByInput.set(pathOrUrl, path);
    if (!uniquePaths.includes(path)) {
      uniquePaths.push(path);
    }
  }

  const signedByPath = new Map<string, string>();
  if (uniquePaths.length === 0) {
    return new Map();
  }

  const { data, error } = await client.storage
    .from(bucket)
    .createSignedUrls(uniquePaths, expiresIn);

  if (!error && data) {
    for (const row of data) {
      if (row.path && row.signedUrl && !row.error) {
        signedByPath.set(row.path, row.signedUrl);
      }
    }
  } else {
    // Fallback: firmar una a una si el batch no está disponible.
    await Promise.all(
      uniquePaths.map(async (path) => {
        const signed = await createStorageSignedUrl(client, bucket, path, options);
        if (signed) {
          signedByPath.set(path, signed);
        }
      }),
    );
  }

  const result = new Map<string, string>();
  for (const [input, path] of pathByInput) {
    const signed = signedByPath.get(path);
    if (signed) {
      result.set(input, signed);
    }
  }
  return result;
}

export function buildStorageObjectPath(organizationId: string, fileName: string): string {
  const extension = fileName.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "webp";
  const unique = randomUUID();
  return `${organizationId}/${unique}.${extension}`;
}
