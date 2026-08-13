export const SALE_PERSON_SORT_MODES = [
  "recent",
  "name-asc",
  "name-desc",
  "country",
] as const;

export type SalePersonSortMode = (typeof SALE_PERSON_SORT_MODES)[number];

export const SALE_SENDER_SORT_OPTIONS: Array<{
  value: Exclude<SalePersonSortMode, "country">;
  label: string;
}> = [
  { value: "recent", label: "Más recientes" },
  { value: "name-asc", label: "A → Z" },
  { value: "name-desc", label: "Z → A" },
];

export const SALE_RECIPIENT_SORT_OPTIONS: Array<{
  value: SalePersonSortMode;
  label: string;
}> = [
  { value: "recent", label: "Más recientes" },
  { value: "name-asc", label: "A → Z" },
  { value: "name-desc", label: "Z → A" },
  { value: "country", label: "Por país" },
];

const SENDER_SORT_STORAGE_KEY = "boxario.sale.senderSort";
const RECIPIENT_SORT_STORAGE_KEY = "boxario.sale.recipientSort";

export function isSalePersonSortMode(value: unknown): value is SalePersonSortMode {
  return (
    typeof value === "string" &&
    (SALE_PERSON_SORT_MODES as readonly string[]).includes(value)
  );
}

export function readSalePersonSortMode(
  key: "sender" | "recipient",
  fallback: SalePersonSortMode = "recent",
): SalePersonSortMode {
  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const storageKey = key === "sender" ? SENDER_SORT_STORAGE_KEY : RECIPIENT_SORT_STORAGE_KEY;
    const stored = window.localStorage.getItem(storageKey);
    if (isSalePersonSortMode(stored)) {
      if (key === "sender" && stored === "country") {
        return fallback;
      }
      return stored;
    }
  } catch {
    // ignore storage failures
  }

  return fallback;
}

export function writeSalePersonSortMode(
  key: "sender" | "recipient",
  mode: SalePersonSortMode,
) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const storageKey = key === "sender" ? SENDER_SORT_STORAGE_KEY : RECIPIENT_SORT_STORAGE_KEY;
    window.localStorage.setItem(storageKey, mode);
  } catch {
    // ignore storage failures
  }
}

type SortablePerson = {
  id: string;
  firstName: string;
  lastName: string;
  createdAt?: string;
  country?: string;
};

function personNameKey(person: SortablePerson) {
  return `${person.lastName} ${person.firstName}`.trim().toLocaleLowerCase("es");
}

function compareIsoDesc(left?: string, right?: string) {
  return String(right || "").localeCompare(String(left || ""));
}

export function compareSalePersonsBySortMode(
  left: SortablePerson,
  right: SortablePerson,
  mode: SalePersonSortMode,
) {
  if (mode === "recent") {
    const byDate = compareIsoDesc(left.createdAt, right.createdAt);
    if (byDate !== 0) {
      return byDate;
    }
    return left.id.localeCompare(right.id);
  }

  if (mode === "country") {
    const byCountry = String(left.country || "").localeCompare(
      String(right.country || ""),
      "es",
      { sensitivity: "base" },
    );
    if (byCountry !== 0) {
      return byCountry;
    }
  }

  const byName = personNameKey(left).localeCompare(personNameKey(right), "es", {
    sensitivity: "base",
  });

  if (mode === "name-desc") {
    return byName * -1 || left.id.localeCompare(right.id);
  }

  return byName || left.id.localeCompare(right.id);
}

export function sortSalePersons<T extends SortablePerson>(
  items: readonly T[],
  mode: SalePersonSortMode,
) {
  return [...items].sort((left, right) => compareSalePersonsBySortMode(left, right, mode));
}
