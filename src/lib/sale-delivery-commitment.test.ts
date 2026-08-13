import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  EMPTY_BOX_DRIVER_MODE,
  EMPTY_BOX_OFFICE_MODE,
} from "@/lib/sale-logistics-modes";
import { saleDeliveryCommitmentError } from "@/lib/sale-delivery-commitment";

describe("sale delivery commitment", () => {
  it("is enforced by the authoritative sale action", () => {
    const actionSource = readFileSync(
      new URL("../app/actions/shipments-create.ts", import.meta.url),
      "utf8",
    );

    assert.match(
      actionSource,
      /saleDeliveryCommitmentError\(quote\.plan, tasks\)/,
    );
  });

  it("allows an office handoff without a delivery date", () => {
    assert.equal(
      saleDeliveryCommitmentError(
        { emptyBox: { mode: EMPTY_BOX_OFFICE_MODE } },
        [],
      ),
      null,
    );
  });

  it("rejects driver delivery without a date", () => {
    assert.match(
      saleDeliveryCommitmentError(
        { emptyBox: { mode: EMPTY_BOX_DRIVER_MODE } },
        [{ taskType: "deliver_empty_box" }],
      ) || "",
      /fecha de entrega/i,
    );
  });

  it("accepts a dated pending delivery without a route", () => {
    assert.equal(
      saleDeliveryCommitmentError(
        {
          emptyBox: {
            mode: EMPTY_BOX_DRIVER_MODE,
            requestedRouteDate: "2026-08-12",
          },
        },
        [{ taskType: "deliver_empty_box", requestedRouteDate: "2026-08-12" }],
      ),
      null,
    );
  });

  it("accepts a selected route with a scheduled delivery task", () => {
    assert.equal(
      saleDeliveryCommitmentError(
        {
          emptyBox: {
            mode: EMPTY_BOX_DRIVER_MODE,
            requestedRouteDate: "2026-08-12",
            scheduleAt: "2026-08-12T10:00",
          },
        },
        [{ taskType: "deliver_empty_box", scheduledAt: "2026-08-12T17:00:00.000Z" }],
      ),
      null,
    );
  });

  it("rejects an impossible calendar date", () => {
    assert.match(
      saleDeliveryCommitmentError(
        {
          emptyBox: {
            mode: EMPTY_BOX_DRIVER_MODE,
            requestedRouteDate: "2026-02-30",
          },
        },
        [{ taskType: "deliver_empty_box", requestedRouteDate: "2026-02-30" }],
      ) || "",
      /fecha de entrega/i,
    );
  });

  it("rejects driver delivery when no logistics task will be created", () => {
    assert.match(
      saleDeliveryCommitmentError(
        {
          emptyBox: {
            mode: EMPTY_BOX_DRIVER_MODE,
            requestedRouteDate: "2026-08-12",
          },
        },
        [],
      ) || "",
      /tarea de entrega/i,
    );
  });

  it("rejects a pending task tied to another date", () => {
    assert.match(
      saleDeliveryCommitmentError(
        {
          emptyBox: {
            mode: EMPTY_BOX_DRIVER_MODE,
            requestedRouteDate: "2026-08-12",
          },
        },
        [{ taskType: "deliver_empty_box", requestedRouteDate: "2026-08-13" }],
      ) || "",
      /no coincide/i,
    );
  });
});
