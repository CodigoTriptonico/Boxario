import { ModuleSuspense } from "@/components/module-suspense";
import { requirePathAccess } from "@/lib/auth/require";

export default async function ConfiguracionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePathAccess("/configuracion");
  return <ModuleSuspense>{children}</ModuleSuspense>;
}
