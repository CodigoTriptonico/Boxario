import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import { readEnviosClientSource } from "@/test-utils/envios-client-source";

const pickerSource = readFileSync(
  join(process.cwd(), "src/components/inline-search-picker.tsx"),
  "utf8",
);
const enviosSource = readEnviosClientSource();

describe("inline search picker panel eval", () => {
  it("sizes dropdown panels from option labels instead of truncating them", () => {
    assert.match(pickerSource, /resolveInlineSearchPanelWidth/);
    assert.match(pickerSource, /whitespace-normal break-words capitalize/);
    assert.doesNotMatch(
      pickerSource.match(/role="listbox"[\s\S]*?<\/ul>/)?.[0] || "",
      /truncate capitalize/,
    );
  });

  it("keeps dropdown panels above app modals when portaled to body", () => {
    assert.match(pickerSource, /createPortal\(panel, document\.body\)/);
    assert.match(pickerSource, /fixed z-\[170\]/);
    assert.doesNotMatch(pickerSource, /fixed z-\[120\]/);
  });

  it("gives envios status filter enough room for bucket labels", () => {
    const toolbarSource = readFileSync(
      join(process.cwd(), "src/components/envios/envios-filters-toolbar.tsx"),
      "utf8",
    );
    assert.match(enviosSource, /ENVIOS_STATUS_FILTER_OPTIONS/);
    assert.match(enviosSource, /matchesEnviosStatusFilter/);
    assert.match(toolbarSource, /sm:min-w-\[11rem\] sm:w-\[13rem\]/);
    assert.match(toolbarSource, /enviosStatusFilterDisplayLabel/);
  });
});
