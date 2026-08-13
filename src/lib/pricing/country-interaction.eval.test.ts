import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const root = process.cwd();

describe("country pricing interaction wiring", () => {
  it("persists add/remove with explicit payload and busy guards", () => {
    const actions = readFileSync(
      join(root, "src/components/config/use-config-country-pricing-actions.ts"),
      "utf8",
    );

    assert.match(actions, /isCountryAlreadyConfigured/);
    assert.match(actions, /countryAddSuccessMessage/);
    assert.match(actions, /flushPendingSave\(\{\s*countries: nextCountries/);
    assert.match(actions, /mutationLockRef/);
    assert.match(actions, /assessCountryRemovalRisk/);
    assert.match(actions, /offerUndo: true/);
    assert.match(actions, /ActionConfirm|countryRemovalConfirm/);
  });

  it("exposes undo toasts and loading buttons", () => {
    const notify = readFileSync(
      join(root, "src/components/notifications/notification-provider.tsx"),
      "utf8",
    );
    const landing = readFileSync(
      join(root, "src/components/config/country-prices-landing-panel.tsx"),
      "utf8",
    );
    const dialog = readFileSync(
      join(root, "src/components/action-confirm-dialog.tsx"),
      "utf8",
    );

    assert.match(notify, /undo/);
    assert.match(notify, /UNDO_DISMISS_MS/);
    assert.match(landing, /LoadingButton/);
    assert.match(landing, /Agregando\.\.\./);
    assert.match(landing, /aria-pressed=\{isPending\}/);
    assert.doesNotMatch(landing, /role="button"/);
    assert.match(dialog, /aria-describedby/);
    assert.match(dialog, /Escape/);
    assert.match(dialog, /Enter confirma|Enter acepta|event\.key === "Enter"/);
    assert.match(dialog, /confirmRef\.current\?\.focus|data-action-confirm="confirm"/);
    assert.match(dialog, /data-action-confirm="cancel"/);
  });

  it("maps country-in-use backend errors to operator copy", () => {
    const pricingAction = readFileSync(join(root, "src/app/actions/pricing.ts"), "utf8");
    assert.match(pricingAction, /PRICING_COUNTRY_IN_USE/);
    assert.match(pricingAction, /configuraciones relacionadas/);
    assert.match(pricingAction, /Ese país ya está registrado/);
  });

  it("enforces normalized country uniqueness in PostgreSQL", () => {
    const migration = readFileSync(
      join(root, "supabase/migrations/181_pricing_country_normalized_uniqueness.sql"),
      "utf8",
    );

    assert.match(
      migration,
      /unique index[\s\S]*organization_id, upper\(btrim\(code\)\)/i,
    );
    assert.match(
      migration,
      /unique index[\s\S]*organization_id, lower\(btrim\(name\)\)/i,
    );
    assert.doesNotMatch(migration, /delete from public\.pricing_countries/i);
  });
});
