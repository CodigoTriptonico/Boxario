"use client";

import type { VentaBootstrapData } from "@/app/actions/sale-bootstrap";
import { useVentaContextActions } from "@/components/sale/venta/use-venta-context-actions";
import { useVentaCore } from "@/components/sale/venta/use-venta-core";
import { useVentaData } from "@/components/sale/venta/use-venta-data";
import { useVentaEffects } from "@/components/sale/venta/use-venta-effects";
import { useVentaFlow } from "@/components/sale/venta/use-venta-flow";
import { useVentaForms } from "@/components/sale/venta/use-venta-forms";
import { useVentaFoundation } from "@/components/sale/venta/use-venta-foundation";
import { useVentaInvoices } from "@/components/sale/venta/use-venta-invoices";
import { useVentaNavigation } from "@/components/sale/venta/use-venta-navigation";
import { useVentaSelectionBase } from "@/components/sale/venta/use-venta-selection-base";
import { useVentaSelection } from "@/components/sale/venta/use-venta-selection";

export function useVentaController(initialData?: VentaBootstrapData) {
  const core = useVentaCore(initialData);
  const foundation = useVentaFoundation(core, initialData);
  const data = useVentaData({ ...core, ...foundation });
  const flow = useVentaFlow({ ...core, ...foundation, ...data });
  const selectionBase = useVentaSelectionBase({ ...core, ...flow });
  const effects = useVentaEffects(
    { ...core, ...foundation, ...data, ...flow },
    initialData,
  );
  const forms = useVentaForms({
    ...core,
    ...foundation,
    ...data,
    ...flow,
    ...selectionBase,
    ...effects,
  });
  const selection = useVentaSelection({
    ...core,
    ...foundation,
    ...data,
    ...flow,
    ...selectionBase,
  });
  const invoices = useVentaInvoices({
    ...core,
    ...foundation,
    ...data,
    ...flow,
    ...selectionBase,
    ...selection,
  });
  const contextActions = useVentaContextActions({
    ...core,
    ...foundation,
    ...data,
    ...flow,
    ...effects,
    ...forms,
    ...selection,
    ...invoices,
  });
  const navigation = useVentaNavigation({
    ...core,
    ...foundation,
    ...data,
    ...flow,
    ...effects,
    ...forms,
    ...selection,
    ...invoices,
    ...contextActions,
  });

  return {
    ...core,
    ...foundation,
    ...data,
    ...flow,
    ...selectionBase,
    ...effects,
    ...forms,
    ...selection,
    ...invoices,
    ...contextActions,
    ...navigation,
  };
}

export type VentaController = ReturnType<typeof useVentaController>;
