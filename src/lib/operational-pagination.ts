/**
 * Turns a `limit + 1` keyset result into a stable page.  The database owns
 * filtering and ordering; this helper never requests or accumulates later
 * pages.
 */
export function takeOperationalPage<T>(rows: ReadonlyArray<T>, limit: number) {
  const normalizedLimit = Math.max(1, limit);
  return {
    items: rows.slice(0, normalizedLimit),
    hasMore: rows.length > normalizedLimit,
  };
}
