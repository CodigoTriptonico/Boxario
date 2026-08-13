import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  contrastRatio,
  defaultHoverHex,
  hasWcagAaTextContrast,
  normalizeHex,
  pickReadableTextColor,
  readableMutedTextColor,
  relativeLuminance,
} from "./ui-surface-color-math.ts";

describe("ui surface color math", () => {
  it("normalizes hex values", () => {
    assert.equal(normalizeHex("2c3440"), "#2c3440");
    assert.equal(normalizeHex("#ABC123"), "#abc123");
    assert.equal(normalizeHex("nope"), null);
  });

  it("mixes toward white for hover on dark bases", () => {
    const hover = defaultHoverHex("#2c3440");
    assert.ok(hover);
    assert.notEqual(hover, "#2c3440");
    assert.match(hover, /^#[0-9a-f]{6}$/);
  });

  it("calculates WCAG relative luminance and contrast", () => {
    assert.equal(relativeLuminance("#000000"), 0);
    assert.equal(relativeLuminance("#ffffff"), 1);
    assert.equal(contrastRatio("#000000", "#ffffff"), 21);
    assert.equal(hasWcagAaTextContrast("#f8fafc", "#2c3440"), true);
  });

  it("chooses readable light or dark foregrounds for bright and dark rows", () => {
    const brightForeground = pickReadableTextColor("#a67a0a");
    const darkForeground = pickReadableTextColor("#2c3440");

    assert.equal(brightForeground, "#0f172a");
    assert.equal(darkForeground, "#f8fafc");
    assert.ok(contrastRatio(brightForeground, "#a67a0a") >= 4.5);
    assert.ok(contrastRatio(darkForeground, "#2c3440") >= 4.5);
  });

  it("uses a black fallback when the fixed dark foreground misses AA", () => {
    const foreground = pickReadableTextColor("#4a8a14");

    assert.equal(foreground, "#000000");
    assert.ok(contrastRatio(foreground, "#4a8a14") >= 4.5);
  });

  it("derives a muted foreground that still passes normal-text AA", () => {
    const muted = readableMutedTextColor("#a67a0a", "#0f172a");
    assert.ok(contrastRatio(muted, "#a67a0a") >= 4.5);
    assert.notEqual(muted, "#a67a0a");
  });
});
