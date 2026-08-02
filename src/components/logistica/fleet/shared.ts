import type {
  LogisticsDriverRow,
  LogisticsVehicleInput,
  LogisticsVehicleRow,
} from "@/app/actions/logistics-fleet";
import { inputClass } from "@/components/ui-blocks";

export type FleetView = "drivers" | "vehicles";

export type DriverForm = {
  id: string;
  email: string;
  password: string;
  fullName: string;
  phone: string;
};

export type VehicleForm = LogisticsVehicleInput & {
  id: string;
};

export const emptyDriverForm: DriverForm = {
  id: "",
  email: "",
  password: "",
  fullName: "",
  phone: "",
};

export const emptyVehicleForm: VehicleForm = {
  id: "",
  name: "",
  plate: "",
  photoUrl: "",
  cargoBoxSize: "",
  cargoCapacity: "",
  notes: "",
  assignedDriverId: null,
};

export const compactInputClass = `${inputClass} h-10`;

export function driverName(driver: LogisticsDriverRow) {
  return driver.fullName || driver.email;
}

export function driverVehicleLabel(driver: LogisticsDriverRow) {
  if (!driver.vehicleId) {
    return "Sin vehiculo";
  }

  return [driver.vehicleName, driver.vehiclePlate].filter(Boolean).join(" - ");
}

export function vehicleDriverLabel(vehicle: LogisticsVehicleRow) {
  return vehicle.assignedDriverName || vehicle.assignedDriverEmail || "Sin conductor";
}

export function matchesQuery(values: string[], query: string) {
  const clean = query.trim().toLowerCase();

  if (!clean) {
    return true;
  }

  return values.join(" ").toLowerCase().includes(clean);
}
