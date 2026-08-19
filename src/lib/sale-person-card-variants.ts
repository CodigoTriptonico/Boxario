export type SalePersonCardVariantId =
  | "emerald-classic"
  | "slate-cold"
  | "amber-warm"
  | "forest-deep"
  | "teal-mist"
  | "rose-ops"
  | "side-bar"
  | "flat-minimal"
  | "high-contrast"
  | "violet-dusk";

export type SalePersonCardVariant = {
  id: SalePersonCardVariantId;
  label: string;
  tag: string;
  card: string;
  addressBlock: string;
  addressEmpty: string;
  addressText: string;
  iconWell: string;
  countryBadge: string;
  name: string;
  phone: string;
  mapPin: string;
  hint: string;
  hintHighlighted: string;
  quickSale: string;
  swatch: string;
  focusRing: string;
};

/** Misma silueta en todos los estilos; solo cambia la paleta. */
const CARD_SHELL =
  "rounded-xl border shadow-[0_6px_18px_rgba(0,0,0,0.28)] transition-colors";
const ADDRESS_SHELL =
  "rounded-lg border shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]";
const ADDRESS_EMPTY_SHELL = "rounded-lg border border-dashed";
const ICON_SHELL = "rounded-lg";
const BADGE_SHELL = "rounded-md border";
const QUICK_SALE_SHELL = "rounded-md border";

type Palette = {
  id: SalePersonCardVariantId;
  label: string;
  tag: string;
  swatch: string;
  focusRing: string;
  card: { bg: string; hover: string; border: string };
  address: { bg: string; border: string; text: string };
  addressEmpty: { bg: string; border: string };
  icon: { bg: string; border: string };
  badge: { bg: string; border: string; text: string };
  name: string;
  phone: string;
  mapPin: string;
  hint: string;
  hintHighlighted: string;
  quickSale: { bg: string; hover: string; border: string };
};

function variantFromPalette(palette: Palette): SalePersonCardVariant {
  return {
    id: palette.id,
    label: palette.label,
    tag: palette.tag,
    swatch: palette.swatch,
    focusRing: palette.focusRing,
    card: `${CARD_SHELL} ${palette.card.border} ${palette.card.bg} ${palette.card.hover}`,
    addressBlock: `${ADDRESS_SHELL} ${palette.address.border} ${palette.address.bg}`,
    addressEmpty: `${ADDRESS_EMPTY_SHELL} ${palette.addressEmpty.border} ${palette.addressEmpty.bg}`,
    addressText: palette.address.text,
    iconWell: `${ICON_SHELL} ${palette.icon.border} ${palette.icon.bg}`,
    countryBadge: `${BADGE_SHELL} ${palette.badge.border} ${palette.badge.bg} ${palette.badge.text}`,
    name: palette.name,
    phone: palette.phone,
    mapPin: palette.mapPin,
    hint: palette.hint,
    hintHighlighted: palette.hintHighlighted,
    quickSale: `${QUICK_SALE_SHELL} ${palette.quickSale.border} ${palette.quickSale.bg} ${palette.quickSale.hover}`,
  };
}

const PALETTES: Palette[] = [
  {
    id: "emerald-classic",
    label: "Esmeralda",
    tag: "V1",
    swatch: "bg-[#3a4842]",
    focusRing: "focus-visible:ring-2 focus-visible:ring-emerald-500/40",
    card: {
      border: "border-emerald-950/55",
      bg: "bg-[#3a4842]",
      hover: "hover:bg-[#425048]",
    },
    address: {
      border: "border-emerald-950/45",
      bg: "bg-[#2e3834]",
      text: "text-slate-300",
    },
    addressEmpty: { border: "border-emerald-900/35", bg: "bg-[#2a332f]/90" },
    icon: { border: "border-emerald-500/40", bg: "bg-emerald-950/70 text-emerald-300" },
    badge: {
      border: "border-emerald-950/50",
      bg: "bg-[#1f2c28]",
      text: "text-emerald-100",
    },
    name: "text-emerald-50",
    phone: "text-emerald-200",
    mapPin: "text-emerald-300",
    hint: "text-emerald-200",
    hintHighlighted: "text-emerald-300",
    quickSale: {
      border: "border-emerald-500/70",
      bg: "bg-emerald-400 text-slate-950",
      hover: "hover:bg-emerald-300",
    },
  },
  {
    id: "slate-cold",
    label: "Pizarra",
    tag: "V2",
    swatch: "bg-[#2c3440]",
    focusRing: "focus-visible:ring-2 focus-visible:ring-sky-500/40",
    card: {
      border: "border-slate-700/70",
      bg: "bg-[#2c3440]",
      hover: "hover:bg-[#323c4a]",
    },
    address: {
      border: "border-slate-700/60",
      bg: "bg-[#252d38]",
      text: "text-slate-300",
    },
    addressEmpty: { border: "border-slate-600/35", bg: "bg-[#222830]/90" },
    icon: { border: "border-sky-500/40", bg: "bg-sky-950/70 text-sky-300" },
    badge: {
      border: "border-slate-700/70",
      bg: "bg-[#1e2530]",
      text: "text-sky-100",
    },
    name: "text-slate-100",
    phone: "text-slate-400",
    mapPin: "text-sky-300",
    hint: "text-slate-500",
    hintHighlighted: "text-sky-300",
    quickSale: {
      border: "border-sky-500/70",
      bg: "bg-sky-400 text-slate-950",
      hover: "hover:bg-sky-300",
    },
  },
  {
    id: "amber-warm",
    label: "Ámbar",
    tag: "V3",
    swatch: "bg-[#3d3428]",
    focusRing: "focus-visible:ring-2 focus-visible:ring-amber-500/40",
    card: {
      border: "border-amber-950/60",
      bg: "bg-[#3d3428]",
      hover: "hover:bg-[#463c2e]",
    },
    address: {
      border: "border-amber-950/50",
      bg: "bg-[#2f281f]",
      text: "text-slate-300",
    },
    addressEmpty: { border: "border-amber-900/35", bg: "bg-[#282218]/90" },
    icon: { border: "border-amber-500/40", bg: "bg-amber-950/70 text-amber-300" },
    badge: {
      border: "border-amber-950/50",
      bg: "bg-[#221c14]",
      text: "text-amber-100",
    },
    name: "text-amber-50",
    phone: "text-amber-200",
    mapPin: "text-amber-300",
    hint: "text-amber-200",
    hintHighlighted: "text-amber-300",
    quickSale: {
      border: "border-amber-500/70",
      bg: "bg-amber-400 text-slate-950",
      hover: "hover:bg-amber-300",
    },
  },
  {
    id: "forest-deep",
    label: "Bosque",
    tag: "V4",
    swatch: "bg-[#243028]",
    focusRing: "focus-visible:ring-2 focus-visible:ring-emerald-600/40",
    card: {
      border: "border-emerald-950/65",
      bg: "bg-[#243028]",
      hover: "hover:bg-[#2a3830]",
    },
    address: {
      border: "border-emerald-950/55",
      bg: "bg-[#1c2620]",
      text: "text-slate-300",
    },
    addressEmpty: { border: "border-emerald-900/35", bg: "bg-[#182018]/90" },
    icon: { border: "border-emerald-500/40", bg: "bg-emerald-950/80 text-emerald-300" },
    badge: {
      border: "border-emerald-950/55",
      bg: "bg-[#141c18]",
      text: "text-emerald-100",
    },
    name: "text-emerald-50",
    phone: "text-emerald-200",
    mapPin: "text-emerald-400",
    hint: "text-emerald-200",
    hintHighlighted: "text-emerald-300",
    quickSale: {
      border: "border-emerald-500/70",
      bg: "bg-emerald-400 text-slate-950",
      hover: "hover:bg-emerald-300",
    },
  },
  {
    id: "teal-mist",
    label: "Teal",
    tag: "V5",
    swatch: "bg-[#1e3336]",
    focusRing: "focus-visible:ring-2 focus-visible:ring-teal-500/40",
    card: {
      border: "border-teal-900/50",
      bg: "bg-[#1e3336]",
      hover: "hover:bg-[#243a3e]",
    },
    address: {
      border: "border-teal-900/45",
      bg: "bg-[#1a2c30]",
      text: "text-slate-300",
    },
    addressEmpty: { border: "border-teal-800/35", bg: "bg-[#162428]/90" },
    icon: { border: "border-teal-400/40", bg: "bg-teal-950/70 text-teal-300" },
    badge: {
      border: "border-teal-900/50",
      bg: "bg-[#142022]",
      text: "text-teal-100",
    },
    name: "text-teal-50",
    phone: "text-teal-200",
    mapPin: "text-teal-300",
    hint: "text-teal-200",
    hintHighlighted: "text-teal-200",
    quickSale: {
      border: "border-teal-500/70",
      bg: "bg-teal-400 text-slate-950",
      hover: "hover:bg-teal-300",
    },
  },
  {
    id: "rose-ops",
    label: "Rosa",
    tag: "V6",
    swatch: "bg-[#3a2c32]",
    focusRing: "focus-visible:ring-2 focus-visible:ring-rose-500/40",
    card: {
      border: "border-rose-950/55",
      bg: "bg-[#3a2c32]",
      hover: "hover:bg-[#443238]",
    },
    address: {
      border: "border-rose-950/45",
      bg: "bg-[#2c2026]",
      text: "text-slate-300",
    },
    addressEmpty: { border: "border-rose-900/35", bg: "bg-[#261a20]/90" },
    icon: { border: "border-rose-400/40", bg: "bg-rose-950/70 text-rose-300" },
    badge: {
      border: "border-rose-950/50",
      bg: "bg-[#221418]",
      text: "text-rose-100",
    },
    name: "text-rose-50",
    phone: "text-rose-200",
    mapPin: "text-rose-300",
    hint: "text-rose-200",
    hintHighlighted: "text-rose-200",
    quickSale: {
      border: "border-rose-500/70",
      bg: "bg-rose-400 text-slate-950",
      hover: "hover:bg-rose-300",
    },
  },
  {
    id: "side-bar",
    label: "Musgo",
    tag: "V7",
    swatch: "bg-[#2f3834]",
    focusRing: "focus-visible:ring-2 focus-visible:ring-lime-500/40",
    card: {
      border: "border-lime-950/50",
      bg: "bg-[#2f3834]",
      hover: "hover:bg-[#36423d]",
    },
    address: {
      border: "border-lime-950/40",
      bg: "bg-[#28312d]",
      text: "text-slate-300",
    },
    addressEmpty: { border: "border-lime-900/30", bg: "bg-[#242c28]/90" },
    icon: { border: "border-lime-500/40", bg: "bg-lime-950/70 text-lime-300" },
    badge: {
      border: "border-lime-950/45",
      bg: "bg-[#1f2c28]",
      text: "text-lime-100",
    },
    name: "text-lime-50",
    phone: "text-lime-200",
    mapPin: "text-lime-300",
    hint: "text-lime-200",
    hintHighlighted: "text-lime-300",
    quickSale: {
      border: "border-lime-500/70",
      bg: "bg-lime-400 text-slate-950",
      hover: "hover:bg-lime-300",
    },
  },
  {
    id: "flat-minimal",
    label: "Grafito",
    tag: "V8",
    swatch: "bg-[#333a38]",
    focusRing: "focus-visible:ring-2 focus-visible:ring-slate-400/40",
    card: {
      border: "border-slate-800/70",
      bg: "bg-[#333a38]",
      hover: "hover:bg-[#3a4240]",
    },
    address: {
      border: "border-slate-800/60",
      bg: "bg-[#2b322f]",
      text: "text-slate-300",
    },
    addressEmpty: { border: "border-slate-700/40", bg: "bg-[#272e2c]/90" },
    icon: { border: "border-slate-600/50", bg: "bg-slate-800/70 text-slate-300" },
    badge: {
      border: "border-slate-800/65",
      bg: "bg-[#252b29]",
      text: "text-slate-200",
    },
    name: "text-slate-100",
    phone: "text-slate-400",
    mapPin: "text-slate-300",
    hint: "text-slate-500",
    hintHighlighted: "text-slate-200",
    quickSale: {
      border: "border-slate-500/60",
      bg: "bg-slate-300 text-slate-950",
      hover: "hover:bg-slate-200",
    },
  },
  {
    id: "high-contrast",
    label: "Noche",
    tag: "V9",
    swatch: "bg-[#121212]",
    focusRing: "focus-visible:ring-2 focus-visible:ring-amber-400/45",
    card: {
      border: "border-amber-800/45",
      bg: "bg-[#121212]",
      hover: "hover:bg-[#181818]",
    },
    address: {
      border: "border-amber-900/40",
      bg: "bg-[#0d0d0d]",
      text: "text-slate-300",
    },
    addressEmpty: { border: "border-amber-800/30", bg: "bg-[#0a0a0a]/90" },
    icon: { border: "border-amber-400/50", bg: "bg-zinc-900 text-amber-300" },
    badge: {
      border: "border-amber-800/50",
      bg: "bg-black",
      text: "text-amber-100",
    },
    name: "text-white",
    phone: "text-amber-200",
    mapPin: "text-amber-400",
    hint: "text-amber-200",
    hintHighlighted: "text-amber-300",
    quickSale: {
      border: "border-amber-400",
      bg: "bg-amber-400 text-slate-950",
      hover: "hover:bg-amber-300",
    },
  },
  {
    id: "violet-dusk",
    label: "Violeta",
    tag: "V10",
    swatch: "bg-[#322a3e]",
    focusRing: "focus-visible:ring-2 focus-visible:ring-violet-500/40",
    card: {
      border: "border-violet-950/55",
      bg: "bg-[#322a3e]",
      hover: "hover:bg-[#3a3048]",
    },
    address: {
      border: "border-violet-950/45",
      bg: "bg-[#282030]",
      text: "text-slate-300",
    },
    addressEmpty: { border: "border-violet-900/35", bg: "bg-[#221c2a]/90" },
    icon: { border: "border-violet-400/40", bg: "bg-violet-950/70 text-violet-300" },
    badge: {
      border: "border-violet-950/50",
      bg: "bg-[#1e1826]",
      text: "text-violet-100",
    },
    name: "text-violet-50",
    phone: "text-violet-200",
    mapPin: "text-violet-300",
    hint: "text-violet-200",
    hintHighlighted: "text-violet-200",
    quickSale: {
      border: "border-violet-500/70",
      bg: "bg-violet-400 text-slate-950",
      hover: "hover:bg-violet-300",
    },
  },
];

const DEFAULT_SALE_PERSON_CARD_VARIANT_ID: SalePersonCardVariantId = "emerald-classic";

export const SALE_PERSON_CARD_VARIANTS: SalePersonCardVariant[] =
  PALETTES.map(variantFromPalette);

const variantById = new Map(SALE_PERSON_CARD_VARIANTS.map((variant) => [variant.id, variant]));

export function resolveSalePersonCardVariant(
  id?: string | null,
): SalePersonCardVariant {
  if (id && variantById.has(id as SalePersonCardVariantId)) {
    return variantById.get(id as SalePersonCardVariantId)!;
  }

  return variantById.get(DEFAULT_SALE_PERSON_CARD_VARIANT_ID)!;
}

export function isSalePersonCardVariantId(value: string): value is SalePersonCardVariantId {
  return variantById.has(value as SalePersonCardVariantId);
}
