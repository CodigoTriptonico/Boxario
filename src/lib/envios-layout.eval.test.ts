import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readEnviosClientSource } from "@/test-utils/envios-client-source";

const enviosSource = readEnviosClientSource();

describe("envios page layout eval", () => {
  it("keeps envios inside the desktop shell instead of growing the page", () => {
    assert.equal(
      enviosSource.includes('className="flex w-full min-h-0 flex-col lg:flex-1 lg:overflow-hidden"'),
      true,
    );
    assert.equal(
      enviosSource.includes('contentClassName="flex min-h-0 flex-1 flex-col p-3 sm:p-4"'),
      true,
    );
    assert.equal(
      enviosSource.includes('<div className={`${panelToolbarClass} mb-3`}>'),
      true,
    );
    assert.equal(
      enviosSource.includes('className="h-full min-h-0 overflow-y-auto pr-1"'),
      true,
    );
    assert.equal(
      enviosSource.includes('rounded-lg border border-black bg-surface-card px-4 py-8 text-center'),
      false,
    );
    assert.equal(enviosSource.includes("divide-y divide-black/70"), false);
    assert.equal(enviosSource.includes("listRowBaseClass"), true);
    assert.equal(enviosSource.includes("usePageListRowPalette"), false);
    assert.equal(enviosSource.includes("sm:grid-cols-2 xl:grid-cols-3"), true);
    assert.equal(enviosSource.includes('viewLayout === "rows"'), true);
    assert.equal(enviosSource.includes("EnviosShipmentRowsList"), true);
    assert.equal(enviosSource.includes("EnviosShipmentCardsGrid"), true);
    assert.equal(
      enviosSource.includes(
        'className="w-full min-w-0 cursor-pointer"',
      ),
      true,
    );
    assert.equal(enviosSource.includes("max-w-[min(100%,17rem)]"), false);
    assert.equal(enviosSource.includes("w-[9.25rem] shrink-0"), false);
    assert.equal(enviosSource.includes("min-w-[18rem] flex-1 self-center"), false);
    assert.equal(enviosSource.includes("summaryRow"), false);
    assert.equal(enviosSource.includes("ShipmentPaymentProgress"), true);
    assert.equal(enviosSource.includes(">Saldo</p>"), true);
    assert.equal(enviosSource.includes("mt-2 min-w-0 border-t border-black/50 pt-2"), true);
    assert.equal(enviosSource.includes("singleLine"), true);
    assert.equal(enviosSource.includes("expandedShipmentIds"), true);
    assert.equal(enviosSource.includes("toggleShipmentExpanded"), true);
    assert.equal(enviosSource.includes("sortShipmentsByArrivalOrder(filteredShipments)"), true);
    assert.equal(enviosSource.includes("buildShipmentMilestoneAges(row, progressSteps)"), true);
    assert.equal(enviosSource.includes("buildShipmentTimingInsightPanel(row, progressSteps)"), true);
    assert.equal(enviosSource.includes("ShipmentMilestoneAgeTrigger"), true);
    assert.equal(enviosSource.includes('id={`envios-detail-${row.id}`}'), true);
    assert.equal(enviosSource.includes("logisticsNotice"), true);
    assert.equal(enviosSource.includes("showLabel"), true);
    assert.equal(enviosSource.includes('w-[12rem] shrink-0'), true);
    assert.equal(enviosSource.includes('>Todos vendedores</option>'), true);
    assert.equal(enviosSource.includes("pr-8 text-sm font-black"), true);
    assert.equal(enviosSource.includes(">Vista</span>"), false);
    assert.equal(enviosSource.includes('isHistoryMode ? "entregados" : "total"'), true);
    const toolbarSearchIndex = enviosSource.indexOf('aria-label="Buscar envíos"');
    const toolbarRowIndex = enviosSource.indexOf(
      'className="flex w-full items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"',
    );
    const workspaceTabsIndex = enviosSource.indexOf("{workspaceTabs}", toolbarRowIndex);
    const workspaceReadinessIndex = enviosSource.indexOf("<EnviosReadinessActions", workspaceTabsIndex);
    assert.equal(toolbarSearchIndex > -1, true);
    assert.equal(toolbarRowIndex > -1 && workspaceTabsIndex > toolbarRowIndex, true);
    assert.equal(workspaceReadinessIndex > workspaceTabsIndex, true);
    assert.equal(toolbarSearchIndex > workspaceTabsIndex && toolbarSearchIndex < workspaceReadinessIndex, true);
    assert.equal(enviosSource.includes("basis-full"), false);
    assert.equal(enviosSource.includes("readinessFilter"), true);
    assert.equal(enviosSource.includes("EnviosBulkSelectionBar"), true);
    assert.equal(enviosSource.includes("useEnviosShipmentSelection"), true);
    assert.equal(enviosSource.includes("Marcar como listos"), true);
    assert.doesNotMatch(
      enviosSource,
      /grid w-full min-w-0 cursor-pointer[\s\S]{0,1200}aria-label=\{`Vendedor de \$\{row\.code\}`\}/,
    );
  });
});
