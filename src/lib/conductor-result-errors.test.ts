import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ActionError } from "@/lib/actions/errors";
import {
  classifyConductorTaskResultError,
  resolveConductorOfflineRetryable,
} from "@/lib/conductor-result-errors";

describe("conductor result error classification (L-H4)", () => {
  it("maps business and auth failures to definitive 4xx non-retryable", () => {
    const samples: Array<{ input: unknown; code: string; status: number }> = [
      { input: "UNAUTHORIZED", code: "UNAUTHORIZED", status: 401 },
      { input: new Error("FORBIDDEN"), code: "FORBIDDEN", status: 403 },
      { input: "Falta tarea", code: "VALIDATION", status: 422 },
      { input: "Foto requerida", code: "VALIDATION", status: 422 },
      { input: "Tarea cancelada", code: "TASK_CANCELLED", status: 409 },
      { input: "ATTEMPT_CONFLICT", code: "ATTEMPT_CONFLICT", status: 409 },
      { input: "TASK_ALREADY_COMPLETED", code: "TASK_ALREADY_COMPLETED", status: 409 },
      { input: "TASK_NOT_EXECUTABLE", code: "TASK_NOT_EXECUTABLE", status: 409 },
      { input: "TASK_NOT_ASSIGNED_TO_DRIVER", code: "FORBIDDEN", status: 403 },
      { input: "Inicia la ruta antes de confirmar entregas o recolecciones", code: "TASK_NOT_EXECUTABLE", status: 409 },
      { input: "Invoice no encontrado", code: "NOT_FOUND", status: 404 },
      { input: new ActionError("VALIDATION", "Indica el motivo"), code: "VALIDATION", status: 422 },
    ];

    for (const sample of samples) {
      const classified = classifyConductorTaskResultError(sample.input);
      assert.equal(classified.ok, false);
      assert.equal(classified.retryable, false, String(sample.input));
      assert.equal(classified.status, sample.status, String(sample.input));
      assert.equal(classified.code, sample.code, String(sample.input));
      assert.notEqual(classified.status, 503, String(sample.input));
    }
  });

  it("marks transient database/network failures as retryable 503", () => {
    for (const message of [
      "fetch failed",
      "timeout connecting to database",
      "connection reset",
      "deadlock detected",
      "could not serialize access",
      "service temporarily unavailable",
    ]) {
      const classified = classifyConductorTaskResultError(new Error(message));
      assert.equal(classified.retryable, true, message);
      assert.equal(classified.status, 503, message);
      assert.equal(classified.code, "TEMPORARY", message);
      assert.equal(classified.message, "No se pudo procesar la operacion");
    }
  });

  it("does not convert unknown errors into universal 503", () => {
    const classified = classifyConductorTaskResultError(new Error("weird boom xyz"));
    assert.equal(classified.retryable, false);
    assert.equal(classified.status, 500);
    assert.equal(classified.code, "INTERNAL");
  });

  it("offline queue prefers explicit retryable over HTTP status heuristics", () => {
    assert.equal(
      resolveConductorOfflineRetryable({ payloadRetryable: false, httpStatus: 503 }),
      false,
    );
    assert.equal(
      resolveConductorOfflineRetryable({ payloadRetryable: true, httpStatus: 422 }),
      true,
    );
    assert.equal(
      resolveConductorOfflineRetryable({ payloadRetryable: undefined, httpStatus: 422 }),
      false,
    );
    assert.equal(
      resolveConductorOfflineRetryable({ payloadRetryable: undefined, httpStatus: 503 }),
      true,
    );
  });
});
