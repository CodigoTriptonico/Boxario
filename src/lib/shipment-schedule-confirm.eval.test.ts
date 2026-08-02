import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { readEnviosClientSource } from "@/test-utils/envios-client-source";

const enviosSource = readEnviosClientSource();

describe("shipment schedule confirm eval", () => {
  it("opens one explicit route panel before creating the driver task", () => {
    assert.match(enviosSource, /setRouteProgramTarget\(\{ row, kind \}\)/);
    assert.match(enviosSource, /<LogisticsTaskScheduleConfirmPanel/);
    assert.match(enviosSource, /hasExistingProgramming/);
    assert.match(enviosSource, /"Guardar cambios"/);
    assert.match(enviosSource, /initialRouteTemplateId/);
    assert.match(enviosSource, /onConfirm=\{\(input\) => void confirmProgramRoute\(input\)\}/);
  });

  it("keeps a separate explicit pending-route decision", () => {
    assert.match(enviosSource, /allowPendingRoute/);
    assert.match(enviosSource, /onConfirmPendingRoute=\{\(\) => void confirmPendingRoute\(\)\}/);
    assert.match(enviosSource, /source: "envios\.program_route_pending"/);
  });
});
