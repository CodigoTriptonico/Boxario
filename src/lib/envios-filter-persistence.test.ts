import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  EMPTY_ENVIOS_FILTERS,
  ENVIOS_FILTER_STORAGE_KEY,
  applyEnviosFiltersToSearchParams,
  enviosFiltersFromSearchParams,
  enviosFiltersHaveValues,
  enviosFiltersPresentInSearchParams,
  normalizeEnviosPersistedFilters,
  readEnviosFiltersFromSession,
  resolveEnviosFiltersOnLoad,
  writeEnviosFiltersToSession,
} from "@/lib/envios-filter-persistence";

describe("envios filter persistence", () => {
  it("normalizes unknown status and readiness values", () => {
    assert.deepEqual(
      normalizeEnviosPersistedFilters({
        query: "  ABC  ",
        country: " Honduras ",
        statusFilter: "nope",
        salesOwnerFilter: " seller-1 ",
        readinessFilter: "maybe" as "all",
      }),
      {
        query: "ABC",
        country: "Honduras",
        statusFilter: "",
        salesOwnerFilter: "seller-1",
        readinessFilter: "all",
      },
    );

    assert.equal(
      normalizeEnviosPersistedFilters({ statusFilter: "recolecciones" }).statusFilter,
      "recolecciones",
    );
    assert.equal(
      normalizeEnviosPersistedFilters({ statusFilter: "pendientes" }).statusFilter,
      "",
    );
    assert.equal(
      normalizeEnviosPersistedFilters({ readinessFilter: "listos" }).readinessFilter,
      "listos",
    );
  });

  it("round-trips filters through URL search params", () => {
    const params = applyEnviosFiltersToSearchParams(new URLSearchParams("view=history&audit=x"), {
      query: "INV-1",
      country: "Guatemala",
      statusFilter: "recolecciones",
      salesOwnerFilter: "owner-1",
      readinessFilter: "listos",
    });

    assert.equal(params.get("view"), "history");
    assert.equal(params.get("audit"), "x");
    assert.equal(params.get("q"), "INV-1");
    assert.equal(params.get("status"), "recolecciones");
    assert.equal(params.get("country"), "Guatemala");
    assert.equal(params.get("seller"), "owner-1");
    assert.equal(params.get("ready"), "listos");
    assert.deepEqual(enviosFiltersFromSearchParams(params), {
      query: "INV-1",
      country: "Guatemala",
      statusFilter: "recolecciones",
      salesOwnerFilter: "owner-1",
      readinessFilter: "listos",
    });

    applyEnviosFiltersToSearchParams(params, EMPTY_ENVIOS_FILTERS);
    assert.equal(params.has("q"), false);
    assert.equal(params.has("status"), false);
    assert.equal(params.has("ready"), false);
    assert.equal(params.get("view"), "history");
  });

  it("prefers explicit URL filters over session storage", () => {
    const memory = new Map<string, string>();
    const originalSession = globalThis.sessionStorage;
    Object.defineProperty(globalThis, "sessionStorage", {
      configurable: true,
      value: {
        getItem: (key: string) => memory.get(key) ?? null,
        setItem: (key: string, value: string) => {
          memory.set(key, value);
        },
        removeItem: (key: string) => {
          memory.delete(key);
        },
      },
    });

    try {
      writeEnviosFiltersToSession({
        query: "",
        country: "",
        statusFilter: "entregas_solicitadas",
        salesOwnerFilter: "",
        readinessFilter: "all",
      });
      assert.equal(memory.has(ENVIOS_FILTER_STORAGE_KEY), true);
      assert.equal(enviosFiltersHaveValues(readEnviosFiltersFromSession()!), true);

      const fromSession = resolveEnviosFiltersOnLoad(new URLSearchParams());
      assert.equal(fromSession.statusFilter, "entregas_solicitadas");

      const fromUrl = resolveEnviosFiltersOnLoad(new URLSearchParams("status=recolecciones"));
      assert.equal(fromUrl.statusFilter, "recolecciones");
      assert.equal(fromUrl.query, "");

      memory.set(
        ENVIOS_FILTER_STORAGE_KEY,
        JSON.stringify({
          query: "",
          country: "Honduras",
          statusFilter: "entregas_solicitadas",
          salesOwnerFilter: "",
          readinessFilter: "all",
        }),
      );
      const merged = resolveEnviosFiltersOnLoad(new URLSearchParams("q=INV-9"));
      assert.equal(merged.query, "INV-9");
      assert.equal(merged.statusFilter, "entregas_solicitadas");
      assert.equal(merged.country, "Honduras");

      assert.equal(enviosFiltersPresentInSearchParams(new URLSearchParams("status=recolecciones")), true);
      assert.equal(enviosFiltersPresentInSearchParams(new URLSearchParams("view=history")), false);

      writeEnviosFiltersToSession(EMPTY_ENVIOS_FILTERS);
      assert.equal(memory.has(ENVIOS_FILTER_STORAGE_KEY), false);
    } finally {
      Object.defineProperty(globalThis, "sessionStorage", {
        configurable: true,
        value: originalSession,
      });
    }
  });
});
