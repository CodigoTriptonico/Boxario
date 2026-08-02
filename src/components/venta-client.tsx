"use client";

import type { VentaBootstrapData } from "@/app/actions/sale-bootstrap";
import { useVentaController } from "@/components/sale/venta/use-venta-controller";
import { VentaView } from "@/components/sale/venta/venta-view";

export function VentaClient({ initialData }: { initialData?: VentaBootstrapData; }) {
  const controller = useVentaController(initialData);

  return <VentaView controller={controller} />;
}
