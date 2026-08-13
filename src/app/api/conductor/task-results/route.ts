import { submitConductorTaskResultAction } from "@/app/actions/conductor-tasks";
import { classifyConductorTaskResultError } from "@/lib/conductor-result-errors";
import { randomUUID } from "node:crypto";

export const runtime = "nodejs";

const MAX_MULTIPART_BYTES = 9 * 1024 * 1024;

export async function POST(request: Request) {
  const correlationId = randomUUID();
  try {
    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > MAX_MULTIPART_BYTES) {
      const classified = classifyConductorTaskResultError("Operacion demasiado grande");
      return Response.json(
        {
          ok: false,
          code: classified.code,
          error: classified.message,
          message: classified.message,
          retryable: classified.retryable,
          correlationId,
        },
        { status: classified.status, headers: { "Cache-Control": "private, no-store" } },
      );
    }
    const contentType = request.headers.get("content-type") || "";
    if (!contentType.toLowerCase().startsWith("multipart/form-data;")) {
      const classified = classifyConductorTaskResultError("Formato de operacion invalido");
      return Response.json(
        {
          ok: false,
          code: classified.code,
          error: classified.message,
          message: classified.message,
          retryable: classified.retryable,
          correlationId,
        },
        { status: classified.status, headers: { "Cache-Control": "private, no-store" } },
      );
    }
    const formData = await request.formData();
    const result = await submitConductorTaskResultAction(formData);
    if (result.ok) {
      return Response.json(result, {
        status: 200,
        headers: { "Cache-Control": "private, no-store" },
      });
    }

    // L-H4: action already classified; never promote business errors to 503.
    return Response.json(
      {
        ok: false,
        code: result.code,
        error: result.message,
        message: result.message,
        retryable: result.retryable,
        correlationId,
      },
      { status: result.status, headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    const classified = classifyConductorTaskResultError(error);
    console.error("[conductor/task-results] request failed", {
      correlationId,
      code: classified.code,
      retryable: classified.retryable,
      error: error instanceof Error ? error.name : "unknown",
    });
    return Response.json(
      {
        ok: false,
        code: classified.code,
        error: classified.message,
        message: classified.message,
        retryable: classified.retryable,
        correlationId,
      },
      { status: classified.status, headers: { "Cache-Control": "private, no-store" } },
    );
  }
}
