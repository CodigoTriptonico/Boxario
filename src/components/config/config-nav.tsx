import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { iconWellEmerald } from "@/components/ui-blocks";

const configNavCardClass =
  "group flex min-h-[9.5rem] min-w-0 flex-col rounded-xl border border-black bg-surface-card p-4 text-left shadow-[0_6px_20px_rgba(0,0,0,0.18)] transition hover:border-emerald-700/35 hover:bg-surface-card-hover sm:p-5";

export function ConfigNavGroup({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-black bg-[#171d1b] shadow-[0_8px_24px_rgba(0,0,0,0.22)]">
      <header className="border-b border-black bg-surface-card-header px-4 py-3 sm:px-5">
        <h2 className="text-sm font-black text-[#f8fafc]">{title}</h2>
        <p className="mt-1 text-sm font-bold text-slate-400">{description}</p>
      </header>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3 p-4 sm:gap-4 sm:p-5">
        {children}
      </div>
    </section>
  );
}

export function ConfigNavCard({
  href,
  title,
  text,
  icon: Icon,
  badge,
  onboardingTarget,
}: {
  href: string;
  title: string;
  text: string;
  icon: LucideIcon;
  badge?: string;
  onboardingTarget?: string;
}) {
  return (
    <Link
      href={href}
      className={configNavCardClass}
      data-onboarding-target={onboardingTarget}
    >
      <span className={`h-11 w-11 shrink-0 ${iconWellEmerald}`}>
        <Icon className="h-6 w-6" />
      </span>
      <span className="mt-4 block break-words text-xl font-black leading-snug text-[#f8fafc] sm:text-2xl">
        {title}
      </span>
      <span className="mt-2 block flex-1 break-words text-sm font-bold leading-snug text-slate-300 sm:text-base">
        {text}
      </span>
      {badge ? (
        <span className="mt-4 inline-flex w-fit rounded-lg border border-black bg-surface-panel px-3 py-1.5 text-xs font-black uppercase tracking-wide text-slate-400">
          {badge}
        </span>
      ) : null}
    </Link>
  );
}
