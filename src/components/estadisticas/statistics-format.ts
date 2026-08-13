export const statisticsNumber = new Intl.NumberFormat("es-US", {
  maximumFractionDigits: 1,
});

export function formatStatisticNumber(value: number) {
  return statisticsNumber.format(Number.isFinite(value) ? value : 0);
}

export function formatStatisticMoney(value: number, currency = "USD") {
  return new Intl.NumberFormat("es-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
}

export function formatStatisticPercent(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "Sin comparación";
  const sign = value > 0 ? "+" : "";
  return `${sign}${statisticsNumber.format(value)}%`;
}

export function formatStatisticDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Fecha no disponible";
  return new Intl.DateTimeFormat("es-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function parseStatisticDateKey(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
}

export function formatStatisticDateRange(from: string, to: string) {
  const start = parseStatisticDateKey(from);
  const end = parseStatisticDateKey(to);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return `${from} – ${to}`;
  const sameYear = start.getFullYear() === end.getFullYear();
  const sameMonth = sameYear && start.getMonth() === end.getMonth();
  const startLabel = new Intl.DateTimeFormat("es-US", {
    day: "numeric",
    month: sameMonth ? undefined : "short",
    year: sameYear ? undefined : "numeric",
  }).format(start);
  const endLabel = new Intl.DateTimeFormat("es-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(end);
  return `${startLabel} – ${endLabel}`;
}

export function csvCell(value: string | number | null | undefined) {
  const text = value == null ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

export function downloadStatisticsCsv(filename: string, rows: Array<Array<string | number | null | undefined>>) {
  const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\n")}`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
