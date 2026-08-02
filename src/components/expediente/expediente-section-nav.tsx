"use client";

import type { ComponentType } from "react";
import {
  Boxes,
  ClipboardList,
  FileText,
} from "lucide-react";

export type ExpedienteSectionId =
  | "resumen"
  | "documentos"
  | "registro";

type ExpedienteSectionNavProps = {
  active: ExpedienteSectionId;
  onChange: (section: ExpedienteSectionId) => void;
  visibleSections: ExpedienteSectionId[];
};

const SECTION_META: Record<
  ExpedienteSectionId,
  { label: string; Icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }> }
> = {
  resumen: { label: "Resumen", Icon: ClipboardList },
  documentos: { label: "Documentos", Icon: FileText },
  registro: { label: "Registro", Icon: Boxes },
};

export function ExpedienteSectionNav({
  active,
  onChange,
  visibleSections,
}: ExpedienteSectionNavProps) {
  return (
    <div
      className="no-print -mx-1 flex min-w-0 gap-1 overflow-x-auto px-1 pb-1"
      role="tablist"
      aria-label="Secciones del expediente"
    >
      {visibleSections.map((section) => {
        const meta = SECTION_META[section];
        const selected = active === section;

        return (
          <button
            key={section}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(section)}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-black transition ${
              selected
                ? "border-emerald-700/60 bg-emerald-950/40 text-emerald-100"
                : "border-black bg-surface-inset text-slate-300 hover:bg-surface-card"
            }`}
          >
            <meta.Icon className="h-3.5 w-3.5" aria-hidden />
            {meta.label}
          </button>
        );
      })}
    </div>
  );
}
