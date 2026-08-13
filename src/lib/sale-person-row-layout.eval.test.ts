import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { readVentaClientSource, readVentaPartsSource } from "@/test-utils/venta-source";

const senderListSource = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "../components/sale/sale-sender-list.tsx"),
  "utf8",
);
const recipientListSource = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "../components/sale/sale-recipient-list.tsx"),
  "utf8",
);
const personCardSource = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "../components/sale/sale-person-card.tsx"),
  "utf8",
);
const ventaPartsSource = readVentaPartsSource();
const flowStylesSource = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "../components/flow-form-styles.ts"),
  "utf8",
);
const ventaClientSource = readVentaClientSource();

describe("sale person row layout eval", () => {
  it("supports row and card layouts for senders and recipients", () => {
    assert.equal(flowStylesSource.includes("flowPersonRowListFrameClass"), true);
    assert.equal(flowStylesSource.includes("flowPersonCardGridClass"), true);
    assert.equal(flowStylesSource.includes("divide-y divide-black/70"), true);
    assert.equal(senderListSource.includes("flowPersonRowListSlotClass"), true);
    assert.equal(senderListSource.includes("flowPersonRowListFrameClass"), true);
    assert.equal(senderListSource.includes("SalePersonListToolbar"), true);
    assert.equal(senderListSource.includes("SalePersonRow"), true);
    assert.equal(senderListSource.includes("SalePersonCard"), true);
    assert.equal(senderListSource.includes("SalePersonExcelTable"), true);
    assert.equal(senderListSource.includes('viewLayout === "rows"'), true);
    assert.equal(senderListSource.includes('viewLayout === "excel"'), true);
    assert.equal(senderListSource.includes("onViewLayoutToggle"), false);
    assert.equal(recipientListSource.includes("SalePersonRow"), true);
    assert.equal(recipientListSource.includes("SalePersonCard"), true);
    assert.equal(recipientListSource.includes("SalePersonExcelTable"), true);
    assert.equal(recipientListSource.includes("flowPersonRowListSlotClass"), true);
    assert.equal(recipientListSource.includes("SalePersonAddRow"), false);
    assert.equal(recipientListSource.includes("SalePersonAddCard"), false);
    assert.equal(recipientListSource.includes('viewLayout === "rows"'), true);
    assert.equal(recipientListSource.includes('viewLayout === "excel"'), true);
  });

  it("scrolls person lists inside the viewport while toolbar stays fixed", () => {
    assert.equal(flowStylesSource.includes("flex min-h-0 w-full flex-1 flex-col overflow-hidden"), true);
    assert.equal(flowStylesSource.includes("overflow-y-auto"), true);
    assert.equal(ventaClientSource.includes("boundedPersonListLayout"), true);
    assert.equal(senderListSource.includes("useSalePersonRowsPerPage"), false);
    assert.equal(recipientListSource.includes("useSalePersonRowsPerPage"), false);
    assert.equal(senderListSource.includes(".slice("), false);
    assert.equal(recipientListSource.includes(".slice("), false);
  });

  it("keeps compact row grid aligned like envios", () => {
    assert.equal(
      personCardSource.includes(
        "grid-cols-[2.5rem_minmax(0,1fr)_auto]",
      ),
      true,
    );
    assert.equal(personCardSource.includes("divide-y"), false);
    assert.equal(personCardSource.includes("salePersonAddressLines"), true);
    assert.equal(personCardSource.includes("break-words sm:truncate"), true);
    assert.equal(personCardSource.includes("whitespace-nowrap text-[11px]"), true);
    assert.equal(ventaPartsSource.includes("grid w-full grid-cols-5 items-start gap-0 lg:flex lg:min-w-0"), true);
    assert.equal(ventaPartsSource.includes("max-sm:hidden"), true);
    assert.equal(ventaPartsSource.includes("hidden lg:mt-[2.125rem] lg:flex"), true);
    assert.match(
      personCardSource,
      /inline-flex h-9[^"`]*items-center[\s\S]*?sm:h-10[\s\S]*?>\s*<Package[\s\S]*?>\s*<span>Rápido<\/span>/,
    );
  });

  it("uses direct touch surfaces without pointer-event layers or global pointerup capture", () => {
    const rowSource = personCardSource.slice(
      personCardSource.indexOf("export function SalePersonRow"),
    );
    const cardSource = personCardSource.slice(
      0,
      personCardSource.indexOf("export function SalePersonRow"),
    );

    assert.match(rowSource, /role="button"[\s\S]*?onClick=\{onClick\}/);
    assert.match(cardSource, /role="button"[\s\S]*?onClick=\{onClick\}/);
    assert.match(rowSource, /touch-manipulation cursor-pointer/);
    assert.match(cardSource, /touch-manipulation cursor-pointer/);
    assert.doesNotMatch(personCardSource, /pointer-events-none relative z-10/);
    assert.doesNotMatch(personCardSource, /absolute inset-0 z-0 cursor-pointer/);
    assert.doesNotMatch(ventaClientSource, /addEventListener\("pointerup"/);
    assert.doesNotMatch(ventaClientSource, /addEventListener\("mouseup"/);
    assert.doesNotMatch(ventaClientSource, /onMouseUpCapture=/);
    assert.doesNotMatch(
      ventaClientSource,
      /customersLoading \? " pointer-events-none/,
    );
    assert.match(flowStylesSource, /flowToolbarInlineCreateClass[\s\S]*?touch-manipulation/);
  });

  it("shows the destination country flag beside the person name in rows", () => {
    const rowSource = personCardSource.slice(
      personCardSource.indexOf("export function SalePersonRow"),
    );
    assert.match(rowSource, /country,/);
    assert.match(
      rowSource,
      /flex min-w-0 items-center gap-2[\s\S]*?<Flag country=\{country\} \/>[\s\S]*?\{name\}/,
    );
    assert.equal(recipientListSource.includes("country={recipient.country}"), true);
  });

  it("stacks recipient address lines instead of one mashed summary", () => {
    const rowSource = personCardSource.slice(
      personCardSource.indexOf("export function SalePersonRow"),
    );
    assert.match(rowSource, /salePersonAddressLines\(address\)/);
    assert.match(
      rowSource,
      /MapPin className="mt-0\.5 h-3\.5 w-3\.5 shrink-0 text-slate-500"/,
    );
    assert.match(rowSource, /addressLines\.map/);
    assert.doesNotMatch(
      rowSource,
      /MapPin className="mr-1 inline/,
    );
  });

  it("uses row-specific selection classes in venta", () => {
    assert.equal(ventaClientSource.includes("contextPersonClass"), true);
    assert.equal(ventaClientSource.includes("salePersonRowSelectedClass"), true);
    assert.equal(ventaClientSource.includes("salePersonRowContextActiveClass"), true);
    assert.equal(ventaClientSource.includes("selectedCardClass"), true);
    assert.equal(ventaClientSource.includes("usePageViewLayout(saleListPaletteContext)"), true);
  });

  it("keeps person toolbars focused on actions and search without counters", () => {
    assert.equal(senderListSource.includes("countLabel={countLabel}"), false);
    assert.equal(recipientListSource.includes("SalePersonListFooter"), false);
    assert.equal(senderListSource.includes("formatSalePersonListCount"), false);
    assert.equal(ventaClientSource.includes("formatSalePersonListCount"), false);
    assert.equal(ventaClientSource.includes("recipientCountLabel"), false);
    assert.equal(senderListSource.includes("onPageChange"), false);
    assert.equal(recipientListSource.includes("onPageChange"), false);
    assert.equal(ventaClientSource.includes("senderPage"), false);
    assert.equal(ventaClientSource.includes("recipientPage"), false);
  });

  it("keeps sender toolbar search and actions in one compact shell", () => {
    assert.equal(flowStylesSource.includes("flowPersonToolbarShellClass"), true);
    assert.equal(flowStylesSource.includes("flowPersonToolbarSearchSlotClass"), true);
    assert.match(
      flowStylesSource,
      /flowPersonToolbarShellClass =\s*\n\s*"[^"]*overflow-hidden[^"]*"/,
    );
    assert.doesNotMatch(
      flowStylesSource,
      /flowPersonToolbarShellClass =\s*\n\s*"[^"]*overflow-x-auto/,
    );
    assert.equal(senderListSource.includes("flowPersonToolbarSearchShellClass"), true);
    assert.equal(senderListSource.includes("SalePersonListToolbar"), true);
  });
});
