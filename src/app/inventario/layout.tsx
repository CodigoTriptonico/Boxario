import { ModuleSuspense } from "@/components/module-suspense";
import { requirePathAccess } from "@/lib/auth/require";

export default async function InventarioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePathAccess("/inventario");
  return <ModuleSuspense>{children}</ModuleSuspense>;
}
