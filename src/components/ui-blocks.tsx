import { LucideIcon } from "lucide-react";
import Link from "next/link";
export { CompactInfoDisclosure } from "@/components/compact-info-disclosure";

export const inputClass =
  "h-11 min-w-0 rounded-lg border border-app-border-control bg-surface-inset px-3 text-sm font-black text-app-text-primary outline-none placeholder:font-semibold placeholder:text-app-text-muted focus:border-app-border-control focus-visible:ring-2 focus-visible:ring-app-focus-ring";

/** Marco para controles con campo transparente dentro (pickers, búsqueda, fecha). */
export const insetShellClass = "inset-shell";

export const pickerShellClass =
  `${insetShellClass} box-border inline-flex h-11 min-w-0 max-w-full items-center gap-2 rounded-lg border border-solid border-app-border-control bg-surface-inset px-3 text-sm font-black text-app-text-primary`;

export const primaryButtonClass =
  "inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-400 px-3 text-sm font-black text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface-shell";

export const secondaryButtonClass =
  "inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-app-border-control bg-surface-inset px-3 text-sm font-black text-app-text-primary hover:border-app-border-control hover:bg-surface-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-focus-ring";

const cardHeaderClass =
  "flex items-center gap-3 border-b border-app-border-divider bg-surface-card-header px-4 py-3";

export const cardClass = "rounded-xl border border-app-border-control";

/** Toolbar superior dentro de un Panel, sin caja extra. */
export const panelToolbarClass =
  "relative shrink-0 overflow-visible border-b border-app-border-divider pb-3";

/** Lista con scroll dentro del panel (sin marco adicional). */
export const panelListScrollClass = "min-h-0 flex-1 overflow-y-auto pr-1";

/** Filas separadas con superficie propia (sin divide-y en caja anidada). */
export const panelListStackClass = "flex flex-col gap-2";

/** Fondo base de cada fila en listados operativos. */
export const listRowBaseClass =
  "surface-list-row rounded-lg border bg-surface-list-row text-surface-list-row-foreground transition-colors";

export const listRowHoverClass = "hover:bg-surface-list-row-hover";

/** Misma superficie de color en tarjetas del listado (modo tarjetas). */
export const listCardShellClass = `${listRowBaseClass} ${listRowHoverClass}`;

export const cardHoverClass =
  "transition-colors hover:border-app-border-control hover:bg-surface-card-hover";

/** Selección en tarjetas/listas: borde neutro, estado en el fondo. */
export const unselectedDimClass =
  "saturate-[0.85] transition-[filter,background-color,border-color] hover:saturate-100";

export const selectionShellClass = "border border-app-border-control transition-colors";

export const selectionActiveClass = "border-app-border-control bg-emerald-400/10 hover:bg-emerald-400/15";

export const accentEmeraldSolid =
  "border border-emerald-600 bg-emerald-400 text-slate-950";

export const iconWellEmerald =
  "flex items-center justify-center rounded-lg border border-emerald-600 bg-emerald-400 text-slate-950";

export const labelMutedClass = "text-xs font-black uppercase text-app-text-muted";

export const textMutedClass = "text-sm font-bold text-app-text-secondary";

/** Ellipsis without clipping descenders (g/y/p). Prefer over Tailwind `truncate`. */
export const textTruncateSafeClass = "text-truncate-safe min-w-0";

export function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-app-border-control bg-surface-card shadow-[0_6px_20px_rgba(0,0,0,0.18)]">
      <p className="border-b border-app-border-divider bg-surface-card-header px-3 py-2 text-xs font-black uppercase text-slate-400">
        {label}
      </p>
      <p className={`px-3 py-3 text-3xl font-black ${tone}`}>{value}</p>
    </div>
  );
}

export function BigAction({
  title,
  text,
  icon: Icon,
  color,
  href,
}: {
  title: string;
  text: string;
  icon: LucideIcon;
  color: string;
  href?: string;
}) {
  const className = `${cardClass} ${cardHoverClass} block p-4 text-left`;
  const content = (
    <>
      <span
        className={`mb-4 flex h-11 w-11 items-center justify-center rounded-lg border border-app-border-control text-slate-950 ${color}`}
      >
        <Icon className="h-6 w-6" />
      </span>
      <span className="block text-xl font-black text-[#f8fafc]">{title}</span>
      <span className={`mt-1 block ${textMutedClass}`}>{text}</span>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }

  return <button className={className}>{content}</button>;
}

export function Panel({
  title,
  action,
  hideHeader = false,
  children,
  className,
  contentClassName,
  clipContent = true,
}: {
  title: React.ReactNode;
  action?: React.ReactNode;
  hideHeader?: boolean;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  /** false permite menús desplegables (p. ej. selector de país) sin recortar */
  clipContent?: boolean;
}) {
  return (
    <section
      className={`rounded-xl border border-app-border-control bg-surface-shell ${
        clipContent ? "overflow-hidden" : "overflow-visible"
      } ${className ?? ""}`}
    >
      {hideHeader ? null : (
        <div className={`flex flex-wrap items-center gap-3 sm:px-5 ${cardHeaderClass}`}>
          {action}
          <h3 className="min-w-0 text-xl font-black tracking-tight text-[#f8fafc] sm:text-2xl">{title}</h3>
        </div>
      )}
      <div className={contentClassName ?? "p-4 sm:p-5"}>{children}</div>
    </section>
  );
}
