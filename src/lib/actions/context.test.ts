import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { AppSession } from "@/lib/auth/types";
import { sessionHasAnyPermission } from "@/lib/actions/context";

function session(permissions: string[]): AppSession {
  return {
    userId: "user-1",
    email: "user@example.com",
    fullName: "User",
    avatarUrl: null,
    organizationId: "org-1",
    organizationName: "Boxario",
    organizationShortName: null,
    organizationLogoUrl: null,
    agencyModuleEnabled: false,
    multiWarehouseEnabled: false,
    maxWarehouses: 1,
    roleSlug: "vendedor",
    roleName: "Vendedor",
    permissions,
    warehouseIds: [],
    preferredWarehouseId: null,
    isPlatformAdmin: false,
  };
}

describe("sessionHasAnyPermission", () => {
  it("accepts any explicitly granted permission", () => {
    assert.equal(
      sessionHasAnyPermission(session(["sales.manage"]), [
        "customers.manage",
        "sales.manage",
      ]),
      true,
    );
  });

  it("preserves the administrator all-permissions shortcut", () => {
    assert.equal(sessionHasAnyPermission(session(["all"]), ["permissions.manage"]), true);
  });

  it("fails closed without a matching permission", () => {
    assert.equal(sessionHasAnyPermission(session(["inventory.view"]), ["sales.manage"]), false);
  });
});
