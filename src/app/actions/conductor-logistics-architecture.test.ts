import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  CONDUCTOR_ACTION_FILES,
  LOGISTICS_ROUTE_ACTION_FILES,
} from "@/test-utils/conductor-logistics-action-sources";

const actionsDirectory = join(process.cwd(), "src", "app", "actions");
const conductorPublicActions = [
  "listConductorDriverTasksAction",
  "listConductorClosedDriverTasksAction",
  "getConductorRouteArrivalWorkspaceAction",
  "completeConductorRouteArrivalAction",
  "getConductorTruckInventoryAction",
  "getConductorHomeVehicleStatusAction",
  "listConductorTruckBalancesAction",
  "loadConductorTruckLineAction",
  "loadConductorTruckExtraAction",
  "returnConductorTruckLineAction",
  "startConductorRouteAction",
  "submitConductorTaskResultAction",
  "reactivateConductorTaskAction",
  "listConductorRouteNotificationsAction",
  "countConductorRouteUnreadNotificationsAction",
  "markConductorRouteNotificationReadAction",
] as const;
const logisticsRoutePublicActions = [
  "listLogisticsRouteCatalogAction",
  "setLogisticsWeekdayDefaultDriverAction",
  "setLogisticsWeekdayScheduleAction",
  "setLogisticsRouteWeekdayEnabledAction",
  "createLogisticsRouteTemplateAction",
  "updateLogisticsRouteTemplateAction",
  "deleteLogisticsRouteTemplateAction",
  "confirmLogisticsTaskScheduleAction",
  "confirmOperationalRouteFromBookingsAction",
  "createOperationalRouteFromBookingsAction",
  "updatePublishedRouteFromBookingsAction",
  "listLogisticsRoutesAction",
  "listLogisticsTaskAddressesAction",
  "addLogisticsRouteStopAction",
  "assignLogisticsTaskToRouteFromPickerAction",
  "removeLogisticsRouteStopAction",
  "reorderLogisticsRouteStopsAction",
  "assignLogisticsRouteDriverAction",
  "assignLogisticsRouteVehicleAction",
  "cancelLogisticsRouteAction",
  "publishLogisticsRouteAction",
  "addLogisticsRouteStopWithReasonAction",
  "cancelLogisticsRoutePendingStopAction",
  "reorderLogisticsRouteStopsWithReasonAction",
] as const;
const serverActionFiles = [
  "conductor-tasks-read.ts",
  "conductor-route-arrival-actions.ts",
  "conductor-truck-actions.ts",
  "conductor-task-results.ts",
  "conductor-route-notifications.ts",
  "logistics-route-catalog-actions.ts",
  "logistics-route-catalog-read.ts",
  "logistics-route-schedule-actions.ts",
  "logistics-route-booking-actions.ts",
  "logistics-routes-read.ts",
  "logistics-route-stop-actions.ts",
  "logistics-route-management-actions.ts",
  "logistics-route-publish-actions.ts",
  "logistics-route-live-edit-actions.ts",
] as const;

function readActionFile(file: string) {
  return readFileSync(join(actionsDirectory, file), "utf8");
}

function lineCount(source: string) {
  return source.split(/\r?\n/).length;
}

describe("conductor and logistics route action boundaries", () => {
  it("keeps both public APIs in small neutral facades", () => {
    const conductorFacade = readActionFile("conductor-tasks.ts");
    const routeFacade = readActionFile("logistics-routes.ts");

    assert.doesNotMatch(conductorFacade, /^"use server";/);
    assert.doesNotMatch(routeFacade, /^"use server";/);
    assert.ok(lineCount(conductorFacade) < 100);
    assert.ok(lineCount(routeFacade) < 100);

    for (const action of conductorPublicActions) {
      assert.match(conductorFacade, new RegExp(`\\b${action}\\b`));
    }
    for (const action of logisticsRoutePublicActions) {
      assert.match(routeFacade, new RegExp(`\\b${action}\\b`));
    }
  });

  it("keeps every implementation module below 800 lines", () => {
    const implementationFiles = [
      ...CONDUCTOR_ACTION_FILES.slice(1),
      ...LOGISTICS_ROUTE_ACTION_FILES.slice(1),
    ];

    for (const file of implementationFiles) {
      assert.ok(
        lineCount(readActionFile(file)) < 800,
        `${file} exceeded the 799-line limit`,
      );
    }
  });

  it('keeps "use server" on modules that define public actions', () => {
    for (const file of serverActionFiles) {
      assert.match(readActionFile(file), /^"use server";/);
    }
  });

  it("does not let implementations depend on their public facades", () => {
    for (const file of CONDUCTOR_ACTION_FILES.slice(1)) {
      assert.doesNotMatch(
        readActionFile(file),
        /from\s+["']@\/app\/actions\/conductor-tasks["']/,
      );
    }
    for (const file of LOGISTICS_ROUTE_ACTION_FILES.slice(1)) {
      assert.doesNotMatch(
        readActionFile(file),
        /from\s+["']@\/app\/actions\/logistics-routes["']/,
      );
    }
  });
});
