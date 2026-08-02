import type { RoleSlug } from "@/lib/auth/types";
import type { LogisticsVehicleRow } from "@/lib/logistics-fleet";

export type FleetRoleJoin =
  | { slug: RoleSlug; name?: string }
  | { slug: RoleSlug; name?: string }[]
  | null;

export type LogisticsDriverProfileRecord = {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  roles: FleetRoleJoin;
};

export type LogisticsVehicleRecord = {
  id: string;
  name: string;
  plate: string;
  photo_url: string;
  cargo_box_size: string;
  cargo_capacity: string;
  notes: string;
  assigned_driver_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type LogisticsDriverLabelRecord = {
  id: string;
  email: string;
  full_name: string | null;
  is_active: boolean;
  roles?: FleetRoleJoin;
};

export function fleetRoleSlug(row: { roles: FleetRoleJoin }) {
  const role = Array.isArray(row.roles) ? row.roles[0] : row.roles;
  return role?.slug || "vendedor";
}

export function logisticsDriverLabel(
  row: Pick<LogisticsDriverLabelRecord, "email" | "full_name"> | null | undefined,
) {
  return (row?.full_name || row?.email || "").trim();
}

export function mapLogisticsVehicleRecord(
  row: LogisticsVehicleRecord,
  driverById: Map<string, LogisticsDriverLabelRecord>,
  photoUrl: string,
): LogisticsVehicleRow {
  const driver = row.assigned_driver_id ? driverById.get(row.assigned_driver_id) : null;

  return {
    id: row.id,
    name: row.name,
    plate: row.plate,
    photoUrl,
    cargoBoxSize: row.cargo_box_size,
    cargoCapacity: row.cargo_capacity,
    notes: row.notes,
    assignedDriverId: row.assigned_driver_id,
    assignedDriverName: logisticsDriverLabel(driver),
    assignedDriverEmail: driver?.email || "",
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
