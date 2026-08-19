type PageLoadingProps = {
  /** Ocupa el panel sin bloquear toda la pantalla ni animaciones pesadas. */
  inline?: boolean;
  /** Usa el fondo del contenedor padre, sin crear una superficie interna. */
  seamless?: boolean;
};

type PageContentPlaceholderProps = {
  variant?: "logistics-routes" | "logistics-fleet" | "shipments" | "inventory" | "driver-route";
};

export function LogisticsRouteCatalogPlaceholder({ withTopPadding = true }: { withTopPadding?: boolean } = {}) {
  return (
    <div className={`flex min-h-0 flex-1 flex-col ${withTopPadding ? "pt-1 sm:pt-2" : ""}`} aria-busy="true" aria-label="Cargando rutas">
      <div className="grid min-h-0 flex-1 overflow-hidden rounded-2xl border border-slate-800 bg-[#121815]/95 lg:grid-cols-[minmax(16rem,0.32fr)_minmax(0,0.68fr)]">
        <div className="flex min-h-0 flex-col border-b border-slate-800 bg-[#141b18] lg:border-b-0 lg:border-r">
          <div className="h-11 shrink-0 border-b border-slate-800 bg-[#0f1412]" />
          <div className="flex min-h-0 flex-1 flex-col gap-2.5 p-2.5">
            <div className="h-24 shrink-0 rounded-xl border border-slate-700/80 bg-[#1e2723]" />
            <div className="h-24 shrink-0 rounded-xl border border-slate-700/80 bg-[#1e2723]" />
          </div>
        </div>
        <div className="min-h-0 bg-[#0f1412]" />
      </div>
    </div>
  );
}

/** Hueco estable de contenido (barra + lista) mientras suspende o carga un módulo. */
export function PageContentPlaceholder({ variant }: PageContentPlaceholderProps = {}) {
  if (variant === "shipments") {
    return (
      <div className="flex min-h-0 flex-1 flex-col p-3 sm:p-4" aria-busy="true" aria-label="Cargando seguimiento">
        <div className="mb-3 flex flex-wrap gap-2 border-b border-app-border-divider pb-3">
          <div className="h-9 min-w-[14rem] flex-1 rounded-lg border border-black bg-surface-inset" />
          <div className="h-9 w-32 rounded-lg bg-surface-card-header" />
          <div className="h-9 w-28 rounded-lg bg-surface-card-header" />
        </div>
        <div className="grid min-h-0 flex-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
          <div className="h-44 rounded-xl border border-black bg-surface-card" />
          <div className="h-44 rounded-xl border border-black bg-surface-card" />
          <div className="h-44 rounded-xl border border-black bg-surface-card" />
        </div>
      </div>
    );
  }

  if (variant === "inventory") {
    return (
      <div className="flex min-h-0 flex-1 flex-col" aria-busy="true" aria-label="Cargando inventario">
        <div className="flex h-12 shrink-0 items-center border-b border-black/70 bg-surface-card-header px-3 sm:px-4" />
        <div className="grid min-h-0 flex-1 grid-cols-[minmax(10rem,0.25fr)_minmax(0,0.75fr)] gap-3 p-3 sm:p-4">
          <div className="rounded-xl border border-black bg-surface-card" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <div className="h-40 rounded-xl border border-black bg-surface-card" />
            <div className="h-40 rounded-xl border border-black bg-surface-card" />
            <div className="h-40 rounded-xl border border-black bg-surface-card" />
          </div>
        </div>
      </div>
    );
  }

  if (variant === "driver-route") {
    return (
      <div className="flex min-h-0 flex-1 flex-col p-3 sm:p-4" aria-busy="true" aria-label="Cargando ruta del conductor">
        <div className="h-12 shrink-0 rounded-xl border border-black bg-surface-card-header" />
        <div className="mt-3 grid gap-3 lg:grid-cols-[15rem_minmax(0,1fr)]">
          <div className="h-44 rounded-xl border border-black bg-surface-card" />
          <div className="h-56 rounded-xl border border-black bg-surface-card" />
        </div>
      </div>
    );
  }

  if (variant === "logistics-routes") {
    return (
      <div className="flex min-h-0 flex-1 flex-col p-2 sm:py-3 sm:pl-3 sm:pr-0" aria-busy="true" aria-label="Cargando rutas">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5 border-b border-app-border-divider pb-2 lg:flex-nowrap lg:pb-3">
          <div className="h-9 min-w-[19rem] flex-1 rounded-lg border border-black bg-surface-inset lg:flex-none" />
          <div className="h-9 w-44 rounded-lg bg-surface-card-header" />
          <div className="ml-auto h-9 w-9 rounded-lg bg-emerald-400/80" />
        </div>
        <LogisticsRouteCatalogPlaceholder />
      </div>
    );
  }

  if (variant === "logistics-fleet") {
    return (
      <div className="flex min-h-0 flex-1 flex-col rounded-xl border border-app-border-control bg-surface-shell p-3 shadow-md sm:p-4" aria-busy="true" aria-label="Cargando conductores y vehículos">
        <div className="flex min-w-0 flex-wrap items-center gap-2 border-b border-app-border-divider pb-2 lg:pb-3">
          <div className="h-9 w-44 rounded-lg border border-black bg-surface-inset" />
          <div className="h-9 w-36 rounded-lg bg-surface-card-header" />
          <div className="h-9 min-w-[14rem] flex-1 rounded-lg border border-black bg-surface-inset" />
          <div className="h-9 w-20 rounded-lg bg-emerald-400/80" />
          <div className="h-9 w-9 rounded-lg bg-emerald-400/80" />
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden pt-2 lg:pt-3">
          <div className="h-56 shrink-0 rounded-xl border border-black bg-surface-card" />
          <div className="h-56 shrink-0 rounded-xl border border-black bg-surface-card" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col p-3 sm:p-4" aria-busy="true" aria-label="Cargando">
      <div className="mb-3 h-12 shrink-0 rounded-xl border border-black bg-surface-card-header" />
      <div className="min-h-[12rem] flex-1 rounded-xl border border-dashed border-black/50 bg-surface-panel/40" />
    </div>
  );
}

export function PageLoading({ inline = false, seamless = false }: PageLoadingProps) {
  if (inline) {
    return (
      <div
        className={`flex min-h-[12rem] flex-1 items-center justify-center ${
          seamless ? "" : "rounded-xl border border-dashed border-black/50 bg-surface-panel/40"
        }`}
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
