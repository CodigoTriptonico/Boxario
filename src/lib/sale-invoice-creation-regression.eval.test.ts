import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const root = process.cwd();
const read = (relativePath: string) => readFileSync(join(root, relativePath), "utf8");

describe("sale invoice creation regressions", () => {
  it("previews the next organization sequence without replacing atomic allocation", () => {
    const bootstrap = read("src/lib/sale/bootstrap.ts");
    const core = read("src/components/sale/venta/use-venta-core.tsx");
    const invoices = read("src/components/sale/venta/use-venta-invoices.ts");

    assert.match(bootstrap, /organization_invoice_counters/);
    assert.match(bootstrap, /last_number/);
    assert.match(bootstrap, /nextInvoiceSequence/);
    assert.match(core, /initialData\?\.nextInvoiceSequence \?\? 1/);
    assert.match(invoices, /allocateInvoiceNumberAction\(\)/);
  });

  it("creates a pending route request with a valid non-null review note", () => {
    const request = read("src/app/actions/customer-route-assignments/request.ts");

    assert.match(
      request,
      /const status = confirmImmediately \? "template_confirmed" : "pending_approval"/,
    );
    assert.doesNotMatch(request, /definition\.coverage_mode === "places" \|\| approval/);
    assert.match(
      request,
      /review_note: confirmImmediately \? "Confirmada por Logística al programar" : ""/,
    );
  });

  it("refreshes tracking and presents route failure as partial success", () => {
    const shipmentAction = read("src/app/actions/shipments-create.ts");
    const tracking = read("src/components/envios-client.tsx");
    const invoices = read("src/components/sale/venta/use-venta-invoices.ts");
    const finish = read("src/components/sale/venta/venta-finish-step.tsx");

    assert.match(shipmentAction, /revalidatePath\("\/seguimiento"\)/);
    assert.match(shipmentAction, /revalidatePath\("\/logistica"\)/);
    assert.doesNotMatch(tracking, /skipInitialPageFetchRef/);
    assert.match(tracking, /listShipmentsAction\(\{/);
    assert.match(invoices, /notify\.success\(`Invoice \$\{invoice\} creado\. La ruta quedó pendiente/);
    assert.match(finish, /La venta y el invoice quedaron guardados/);
  });

  it("only labels a task as requested when Logistics has a persisted request", () => {
    const progress = read("src/components/shipment-progress-steps.tsx");
    const rows = read("src/components/envios/envios-shipment-rows-list.tsx");
    const cards = read("src/components/envios/envios-shipment-cards-grid.tsx");
    const excel = read("src/components/envios/envios-shipment-excel-table.tsx");

    assert.match(progress, /requestedRouteTaskIds\?\.has\(task\.id\)/);
    for (const surface of [rows, cards, excel]) {
      assert.match(surface, /requestedRouteTaskIds=\{pendingRouteTaskIds\}/);
    }
  });
});
