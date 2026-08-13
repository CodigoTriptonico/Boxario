type PageLoadingProps = {
  /** Ocupa el panel sin bloquear toda la pantalla ni animaciones pesadas. */
  inline?: boolean;
};

/** Hueco estable de contenido (barra + lista) mientras suspende o carga un módulo. */
export function PageContentPlaceholder() {
  return (
    <div className="flex min-h-0 flex-1 flex-col p-3 sm:p-4" aria-busy="true" aria-label="Cargando">
      <div className="mb-3 h-12 shrink-0 rounded-xl border border-black bg-surface-card-header" />
      <div className="min-h-[12rem] flex-1 rounded-xl border border-dashed border-black/50 bg-surface-panel/40" />
    </div>
  );
}

export function PageLoading({ inline = false }: PageLoadingProps) {
  if (inline) {
    return (
      <div
        className="flex min-h-[12rem] flex-1 items-center justify-center rounded-xl border border-dashed border-black/50 bg-surface-panel/40"
        aria-busy="true"
        aria-label="Cargando"
      >
        <div className="skeleton-line h-2 w-24 rounded-full bg-surface-card" />
      </div>
    );
  }

  return (
    <section
      className="rounded-xl border border-black bg-surface-panel p-4 shadow-md sm:p-5"
      aria-busy="true"
      aria-label="Cargando"
    >
      <div className="grid gap-3">
        <div className="skeleton-line h-11 rounded-lg bg-surface-card" />
        <div className="skeleton-block h-32 rounded-lg bg-surface-inset" />
      </div>
    </section>
  );
}
