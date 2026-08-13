"use client";

import { useState } from "react";
import { CompactInfoDisclosure, listRowBaseClass } from "@/components/ui-blocks";
import { SurfacePalettePicker } from "@/components/ui/surface-palette-picker";
import { useUiSurfacePreferences } from "@/components/ui/ui-surface-preferences-provider";
import {
  UI_SURFACE_CONTEXTS,
  type UiSurfaceContextId,
  type UiSurfaceContextKind,
} from "@/lib/ui-surface-context";
import { isCustomPaletteId } from "@/lib/ui-surface-custom-palettes";
import { UI_SURFACE_PALETTES } from "@/lib/ui-surface-palettes";
import { resolveSalePersonCardVariant } from "@/components/sale/sale-person-card-variants";

function ListRowPreview({ paletteId }: { paletteId: string }) {
  const { resolvePalette } = useUiSurfacePreferences();
  const palette = resolvePalette(paletteId);
  return (
    <div
      className={`${listRowBaseClass} ${palette.listRow.rowClass} ${palette.listRow.hoverClass} px-3 py-2`}
      style={{
        color: palette.listRow.foregroundHex,
        borderColor: "#000000",
      }}
    >
      <p className="text-sm font-black" style={{ color: palette.listRow.foregroundHex }}>
        INV-000 · Cliente demo
      </p>
      <p className="text-[11px] font-bold" style={{ color: palette.listRow.mutedForegroundHex }}>
        Vista previa de fila
      </p>
    </div>
  );
}

function PersonCardPreview({ paletteId }: { paletteId: string }) {
  const { resolvePalette } = useUiSurfacePreferences();
  const palette = resolvePalette(paletteId);
  if (isCustomPaletteId(palette.id)) {
    return (
      <div
        className={`${listRowBaseClass} px-3 py-2.5`}
        style={{
          backgroundColor: palette.listRow.hex,
          borderColor: "#000000",
        }}
      >
        <p className="text-sm font-black" style={{ color: palette.listRow.foregroundHex }}>
          María López
        </p>
        <p className="text-xs font-bold" style={{ color: palette.listRow.mutedForegroundHex }}>
          555-0100
        </p>
      </div>
    );
  }
  const variant = resolveSalePersonCardVariant(palette.personCardId ?? paletteId);
  return (
    <div className={`${variant.card} px-3 py-2.5`}>
      <p className={`text-sm font-black ${variant.name}`}>María López</p>
      <p className={`text-xs font-bold ${variant.phone}`}>555-0100</p>
    </div>
  );
}

function ContextPaletteSection({
  contextId,
  kind,
  label,
  description,
}: {
  contextId: UiSurfaceContextId;
  kind: UiSurfaceContextKind;
  label: string;
  description: string;
}) {
  const { paletteIdForContext, setContextPalette } = useUiSurfacePreferences();
  const currentId = paletteIdForContext(contextId);

  return (
    <section className="rounded-xl border border-black p-4">
      <div className="mb-3">
        <p className="text-sm font-black text-[#f8fafc]">{label}</p>
        <p className="mt-0.5 text-xs font-bold text-slate-500">{description}</p>
      </div>
      <div className="mb-3 max-w-md">
        {kind === "personCard" ? (
          <PersonCardPreview paletteId={currentId} />
        ) : (
          <ListRowPreview paletteId={currentId} />
        )}
      </div>
      <SurfacePalettePicker
        inline
        mode={kind}
        currentId={currentId}
        contextId={contextId}
        title={label}
        onSelect={(paletteId) => setContextPalette(contextId, paletteId)}
        onClose={() => undefined}
      />
    </section>
  );
}

export function AppearanceSettingsPanel() {
  const { paletteIdForContext, resolvePalette } = useUiSurfacePreferences();
  const [labOpen, setLabOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 border-b border-black/70 pb-3">
        <p className="text-sm font-black text-[#f8fafc]">Colores por pantalla</p>
        <CompactInfoDisclosure ariaLabel="Cómo configurar los colores por pantalla">
          Cada listado puede tener su propia paleta. Usa el botón de paleta fijo en el sidebar (arriba del
          perfil) o ajusta aquí con temas, colores del catálogo y colores personalizados.
        </CompactInfoDisclosure>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {UI_SURFACE_CONTEXTS.map((context) => (
          <ContextPaletteSection
            key={context.id}
            contextId={context.id}
            kind={context.kind}
            label={context.label}
            description={context.description}
          />
        ))}
      </div>

      <details
        className="rounded-xl border border-black bg-surface-inset/30"
        open={labOpen}
        onToggle={(event) => setLabOpen((event.currentTarget as HTMLDetailsElement).open)}
      >
        <summary className="cursor-pointer px-4 py-3 text-sm font-black text-slate-300">
          Laboratorio de colores (comparar todas las paletas)
        </summary>
        <div className="space-y-2 border-t border-black/70 px-3 py-3">
          {UI_SURFACE_PALETTES.map((palette) => (
            <div
              key={palette.id}
              className={`${listRowBaseClass} ${palette.listRow.rowClass} px-3 py-2`}
              style={{
                color: palette.listRow.foregroundHex,
                borderColor: "#000000",
              }}
            >
              <span className="text-xs font-black" style={{ color: palette.listRow.foregroundHex }}>
                {palette.tag} · {palette.label}
              </span>
              <span
                className="ml-2 text-[10px] font-bold"
                style={{ color: palette.listRow.mutedForegroundHex }}
              >
                {palette.listRow.hex}
              </span>
            </div>
          ))}
        </div>
      </details>

      <p className="text-[11px] font-bold text-slate-600">
        Activo ahora en logística:{" "}
        {resolvePalette(paletteIdForContext("logistics.tasks")).label}
      </p>
    </div>
  );
}
