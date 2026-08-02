"use client";

import { useMemo } from "react";
import type {
  LogisticsDriverRow,
  LogisticsVehicleRow,
} from "@/app/actions/logistics-fleet";
import {
  driverName,
  matchesQuery,
} from "@/components/logistica/fleet/shared";

export function useFleetFilters(
  drivers: LogisticsDriverRow[],
  vehicles: LogisticsVehicleRow[],
  query: string,
) {
  const driverOptions = useMemo(
    () => [
      { value: "", label: "Sin conductor", searchText: "sin conductor" },
      ...drivers.map((driver) => ({
        value: driver.id,
        label: driverName(driver),
        searchText: [driver.fullName, driver.email, driver.phone].join(" "),
      })),
    ],
    [drivers],
  );

  const filteredDrivers = useMemo(
    () =>
      drivers.filter((driver) =>
        matchesQuery(
          [driver.fullName, driver.email, driver.phone, driver.vehicleName, driver.vehiclePlate],
          query,
        ),
      ),
    [drivers, query],
  );

  const filteredVehicles = useMemo(
    () =>
      vehicles.filter((vehicle) =>
        matchesQuery(
          [
            vehicle.name,
            vehicle.plate,
            vehicle.cargoBoxSize,
            vehicle.cargoCapacity,
            vehicle.assignedDriverName,
            vehicle.assignedDriverEmail,
          ],
          query,
        ),
      ),
    [query, vehicles],
  );

  return { driverOptions, filteredDrivers, filteredVehicles };
}
