import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  saleInvoiceBoxDescription,
  saleInvoiceEtaLabel,
  saleInvoiceServiceLabel,
  saleInvoiceShowsDeliveryEta,
  saleInvoiceSituationNote,
} from "@/lib/sale-invoice-service";

describe("sale invoice service", () => {
  it("shows the selected box size instead of a generic box label", () => {
    assert.equal(saleInvoiceBoxDescription("Caja", "20x20x20"), "Caja 20x20x20");
    assert.equal(saleInvoiceBoxDescription("14x14x14", "20x20x20"), "Caja 14x14x14");
    assert.equal(saleInvoiceBoxDescription("Caja 12x12x12", "20x20x20"), "Caja 12x12x12");
  });

  it("labels the empty-box movement as delivery", () => {
    assert.equal(saleInvoiceServiceLabel("deliver_empty_box"), "Servicio de entrega");
  });

  it("labels the full-box movement as pickup", () => {
    assert.equal(saleInvoiceServiceLabel("pickup_full_box"), "Servicio de recoleccion");
  });

  it("describes the completed office handoff and pending collection", () => {
    assert.equal(
      saleInvoiceServiceLabel("deliver_empty_box", "empty_box_handed_off", 1),
      "Caja entregada · Recolección pendiente",
    );
    assert.equal(
      saleInvoiceServiceLabel("deliver_empty_box", "empty_box_handed_off", 2),
      "Cajas entregadas · Recolección pendiente",
    );
    assert.equal(
      saleInvoiceSituationNote("empty_box_handed_off", 1),
      "Caja vacía entregada en oficina. La recolección de la caja llena queda pendiente de coordinar.",
    );
    assert.equal(saleInvoiceShowsDeliveryEta("empty_box_handed_off"), false);
  });

  it("keeps the estimated time as compact secondary copy", () => {
    assert.equal(saleInvoiceEtaLabel(" 7-14 dias "), "Entrega est. 7-14 dias");
    assert.equal(saleInvoiceEtaLabel(undefined), "");
  });
});
