import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const source = readFileSync(join(process.cwd(), "src/components/estadisticas/statistics-trend-chart.tsx"), "utf8");

test("el gráfico estadístico conserva escala, unidad y comparación explícitas", () => {
  assert.match(source, /scale\.ticks\.map/);
  assert.match(source, /axisValue\(tick/);
  assert.match(source, /metricDefinition\.label.*dashboard\.meta\.currency/s);
  assert.match(source, /formatStatisticDateRange/);
  assert.match(source, /Pico del periodo/);
  assert.match(source, /ResizeObserver/);
  assert.doesNotMatch(source, /preserveAspectRatio="none"/);
});
