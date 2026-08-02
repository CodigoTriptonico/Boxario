import {
  Crown,
  Shield,
  ShieldCheck,
  Truck,
  UserCog,
} from "lucide-react";
import type { PermissionKey } from "@/lib/auth/types";

export const PERMISSION_GROUPS: { title: string; keys: PermissionKey[] }[] = [
  { title: "Ventas", keys: ["sales.manage", "sales.settings.manage", "customers.manage"] },
  { title: "Logística", keys: ["logistics.settings.manage"] },
  {
    title: "Inventario",
    keys: ["inventory.view", "inventory.reserve", "inventory.adjust", "inventory.assign", "inventory.return", "warehouses.manage"],
  },
  { title: "Rutas", keys: ["routes.view", "routes.update_status"] },
  {
    title: "Administracion",
    keys: ["users.manage", "permissions.manage", "settings.manage"],
  },
];

export const ROLE_META: Record<
  string,
  { icon: typeof Shield; hint: string }
> = {
  administrador: {
    icon: Crown,
    hint: "Gestión completa de la empresa.",
  },
  vendedor: {
    icon: UserCog,
    hint: "Ventas, clientes e inventario operativo.",
  },
  conductor: {
    icon: Truck,
    hint: "Consulta rutas y actualiza entregas.",
  },
  logistica: {
    icon: Truck,
    hint: "Rutas, asignación y operaciones de entrega.",
  },
  bodega: {
    icon: Shield,
    hint: "Inventario y bodegas.",
  },
  finanzas: {
    icon: ShieldCheck,
    hint: "Cuentas, cobros y retención financiera.",
  },
  auditor: {
    icon: ShieldCheck,
    hint: "Consulta de auditoría y estados financieros.",
  },
  captador_distribuidores: {
    icon: UserCog,
    hint: "Alta y seguimiento de distribuidores.",
  },
  captador_agencias: {
    icon: UserCog,
    hint: "Crea y da soporte a agencias.",
  },
  supervisor_agencias: {
    icon: Crown,
    hint: "Supervisa captadores y soporte de agencias.",
  },
};

export function ToggleSwitch({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-5 w-9 shrink-0 rounded-full border border-black p-0.5 transition disabled:opacity-50 ${
        checked ? "bg-emerald-400" : "bg-surface-inset"
      }`}
    >
      <span
        className={`block h-3.5 w-3.5 rounded-full bg-slate-950 transition ${
          checked ? "translate-x-4" : "translate-x-0"
        }`}
      />
    </button>
  );
}

export function roleButtonClass(active: boolean) {
  return `flex w-full items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition ${
    active
      ? "border-black bg-emerald-400/10 hover:bg-emerald-400/15"
      : "border-black bg-surface-inset hover:bg-surface-card-hover"
  }`;
}
