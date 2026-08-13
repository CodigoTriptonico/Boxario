import { ModuleSuspense } from "@/components/module-suspense";
import { requirePathAccess } from "@/lib/auth/require";

export default async function EstadisticasLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePathAccess("/estadisticas");
  return <ModuleSuspense>{children}</ModuleSuspense>;
}
