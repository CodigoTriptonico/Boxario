import { ModuleSuspense } from "@/components/module-suspense";
import { requirePathAccess } from "@/lib/auth/require";

export default async function VentaLayout({ children }: { children: React.ReactNode }) {
  await requirePathAccess("/venta");
  return <ModuleSuspense>{children}</ModuleSuspense>;
}
