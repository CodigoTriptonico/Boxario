export type ViewLayout = "rows" | "cards" | "excel";

export const VIEW_LAYOUT_STORAGE_KEY = "boxario:view-layout";
export const LEGACY_ENVIOS_VIEW_LAYOUT_STORAGE_KEY = "boxario:envios:view-layout";
export const DEFAULT_VIEW_LAYOUT: ViewLayout = "rows";

export function parseViewLayout(value: unknown): ViewLayout {
  if (value === "cards") {
    return "cards";
  }

  if (value === "excel") {
    return "excel";
  }

  return "rows";
}

export function toggleViewLayout(
  layout: ViewLayout,
  supportsExcel = false,
): ViewLayout {
  if (layout === "rows") {
    return "cards";
  }

  if (layout === "cards") {
    return supportsExcel ? "excel" : "rows";
  }

  return "rows";
}

export function viewLayoutToggleLabel(
  layout: ViewLayout,
  supportsExcel = false,
): string {
  if (layout === "rows") {
    return "Ver como tarjetas";
  }

  if (layout === "cards" && supportsExcel) {
    return "Ver como Excel";
  }

  return "Ver como filas";
}

export function viewLayoutAriaLabel(
  layout: ViewLayout,
  supportsExcel = false,
): string {
  if (layout === "rows") {
    return "Cambiar a vista tarjetas";
  }

  if (layout === "cards" && supportsExcel) {
    return "Cambiar a vista Excel";
  }

  return "Cambiar a vista filas";
}
