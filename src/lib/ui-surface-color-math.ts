/** Utilidades determinísticas para colores de superficie (sin LLM). */

const HEX_RE = /^#([0-9a-f]{6})$/i;

export const LIGHT_FOREGROUND_HEX = "#f8fafc";
export const DARK_FOREGROUND_HEX = "#0f172a";
/** Fallback extremo para fondos que no alcanzan AA con el azul oscuro base. */
export const BLACK_FOREGROUND_HEX = "#000000";
export const WCAG_AA_NORMAL_TEXT_CONTRAST = 4.5;
export const WCAG_AA_LARGE_TEXT_CONTRAST = 3;

export function normalizeHex(value: string): string | null {
  const trimmed = value.trim();
  const withHash = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  if (!HEX_RE.test(withHash)) {
    return null;
  }
  return withHash.toLowerCase();
}

export function hexToRgb(hex: string) {
  const normalized = normalizeHex(hex);
  if (!normalized) {
    return null;
  }
  const raw = normalized.slice(1);
  return {
    r: Number.parseInt(raw.slice(0, 2), 16),
    g: Number.parseInt(raw.slice(2, 4), 16),
    b: Number.parseInt(raw.slice(4, 6), 16),
  };
}

/** Relative luminance according to WCAG 2.x for an opaque hexadecimal color. */
export function relativeLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) {
    return 0;
  }

  const linearize = (channel: number) => {
    const normalized = channel / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  };

  return (
    0.2126 * linearize(rgb.r) +
    0.7152 * linearize(rgb.g) +
    0.0722 * linearize(rgb.b)
  );
}

/** Ratio de contraste WCAG entre dos colores hexadecimales opacos. */
export function contrastRatio(hexA: string, hexB: string): number {
  const luminanceA = relativeLuminance(hexA);
  const luminanceB = relativeLuminance(hexB);
  const lighter = Math.max(luminanceA, luminanceB);
  const darker = Math.min(luminanceA, luminanceB);
  return (lighter + 0.05) / (darker + 0.05);
}

function rgbToHex(r: number, g: number, b: number) {
  const clamp = (channel: number) => Math.max(0, Math.min(255, Math.round(channel)));
  return `#${[clamp(r), clamp(g), clamp(b)]
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("")}`;
}

/** Mezcla hacia blanco (amount 0–1) o negro (amount negativo). */
function mixHex(hex: string, amount: number, target: "white" | "black" = "white") {
  const rgb = hexToRgb(hex);
  if (!rgb) {
    return null;
  }
  const targetRgb = target === "white" ? { r: 255, g: 255, b: 255 } : { r: 0, g: 0, b: 0 };
  const t = Math.max(-1, Math.min(1, amount));
  const weight = t >= 0 ? t : -t;
  const from = t >= 0 ? rgb : targetRgb;
  const to = t >= 0 ? targetRgb : rgb;
  return rgbToHex(
    from.r + (to.r - from.r) * weight,
    from.g + (to.g - from.g) * weight,
    from.b + (to.b - from.b) * weight,
  );
}

function mixHexes(fromHex: string, toHex: string, amount: number) {
  const from = hexToRgb(fromHex);
  const to = hexToRgb(toHex);
  if (!from || !to) {
    return null;
  }

  const t = Math.max(0, Math.min(1, amount));
  return rgbToHex(
    from.r + (to.r - from.r) * t,
    from.g + (to.g - from.g) * t,
    from.b + (to.b - from.b) * t,
  );
}

/** Elige el color de texto con mayor contraste entre los candidatos. */
export function pickReadableTextColor(
  backgroundHex: string,
  candidates: string[] = [LIGHT_FOREGROUND_HEX, DARK_FOREGROUND_HEX],
  minimumContrast = WCAG_AA_NORMAL_TEXT_CONTRAST,
): string {
  const normalizedBackground = normalizeHex(backgroundHex) ?? "#29312d";
  const normalizedCandidates = candidates
    .map((candidate) => normalizeHex(candidate))
    .filter((candidate): candidate is string => Boolean(candidate));
  const pool = normalizedCandidates.length
    ? normalizedCandidates
    : [LIGHT_FOREGROUND_HEX, DARK_FOREGROUND_HEX];

  const best = pool.reduce((current, candidate) =>
    contrastRatio(candidate, normalizedBackground) > contrastRatio(current, normalizedBackground)
      ? candidate
      : current,
  );

  if (contrastRatio(best, normalizedBackground) >= minimumContrast) {
    return best;
  }

  return [
    ...pool,
    LIGHT_FOREGROUND_HEX,
    DARK_FOREGROUND_HEX,
    BLACK_FOREGROUND_HEX,
  ].reduce((current, candidate) =>
    contrastRatio(candidate, normalizedBackground) > contrastRatio(current, normalizedBackground)
      ? candidate
      : current,
  );
}

/** Creates a less dominant secondary tone that remains AA-readable. */
export function readableMutedTextColor(
  backgroundHex: string,
  foregroundHex = pickReadableTextColor(backgroundHex),
  minimumContrast = WCAG_AA_NORMAL_TEXT_CONTRAST,
): string {
  const background = normalizeHex(backgroundHex) ?? "#29312d";
  const foreground = normalizeHex(foregroundHex) ?? LIGHT_FOREGROUND_HEX;
  if (contrastRatio(foreground, background) < minimumContrast) {
    return pickReadableTextColor(background, [foreground], minimumContrast);
  }

  let low = 0;
  let high = 1;
  for (let index = 0; index < 24; index += 1) {
    const amount = (low + high) / 2;
    const candidate = mixHexes(background, foreground, amount) ?? foreground;
    if (contrastRatio(candidate, background) >= minimumContrast) {
      high = amount;
    } else {
      low = amount;
    }
  }

  return mixHexes(background, foreground, Math.min(1, high + 0.01)) ?? foreground;
}

export function hasWcagAaTextContrast(
  foregroundHex: string,
  backgroundHex: string,
  minimumContrast = WCAG_AA_NORMAL_TEXT_CONTRAST,
): boolean {
  return contrastRatio(foregroundHex, backgroundHex) >= minimumContrast;
}

/** Hover por defecto: un poco más claro en fondos oscuros. */
export function defaultHoverHex(baseHex: string) {
  const rgb = hexToRgb(baseHex);
  if (!rgb) {
    return "#343d4d";
  }
  const luminance = (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255;
  return mixHex(baseHex, luminance < 0.35 ? 0.14 : 0.08, "white") ?? baseHex;
}

export function colorDistance(hexA: string, hexB: string) {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  if (!a || !b) {
    return Number.POSITIVE_INFINITY;
  }
  return Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2);
}

export function randomCustomPaletteId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `custom:${crypto.randomUUID()}`;
  }
  return `custom:${Date.now().toString(36)}`;
}
