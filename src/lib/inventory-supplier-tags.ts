export function normalizeInventorySupplierName(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

function inventorySupplierNameKey(name: string) {
  return normalizeInventorySupplierName(name).toLocaleLowerCase("es");
}

export function mergeInventorySupplierTags(existing: string[], incoming: string) {
  const normalized = normalizeInventorySupplierName(incoming);

  if (!normalized) {
    return existing;
  }

  const incomingKey = inventorySupplierNameKey(normalized);

  if (existing.some((tag) => inventorySupplierNameKey(tag) === incomingKey)) {
    return existing;
  }

  return [normalized, ...existing];
}

export function collectInventorySupplierTagsFromMovements(
  movements: Array<{ evidence?: unknown }>,
) {
  const tags: string[] = [];
  const seen = new Set<string>();

  for (const movement of movements) {
    const evidence =
      movement.evidence && typeof movement.evidence === "object"
        ? (movement.evidence as { supplierName?: unknown })
        : null;
    const supplierName =
      typeof evidence?.supplierName === "string"
        ? normalizeInventorySupplierName(evidence.supplierName)
        : "";

    if (!supplierName) {
      continue;
    }

    const key = inventorySupplierNameKey(supplierName);

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    tags.push(supplierName);
  }

  return tags;
}

export function filterInventorySupplierTags(tags: string[], query: string) {
  const normalizedQuery = inventorySupplierNameKey(query);

  if (!normalizedQuery) {
    return tags;
  }

  return tags.filter((tag) => inventorySupplierNameKey(tag).includes(normalizedQuery));
}

export function isInventorySupplierTagSelected(tag: string, selectedName: string) {
  if (!selectedName.trim()) {
    return false;
  }

  return inventorySupplierNameKey(tag) === inventorySupplierNameKey(selectedName);
}
