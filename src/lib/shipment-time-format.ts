export function parseShipmentIso(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

export function formatShipmentAbsolute(iso: string) {
  const at = parseShipmentIso(iso);
  if (at === null) {
    return "";
  }

  return new Date(at).toLocaleString("es-MX", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
