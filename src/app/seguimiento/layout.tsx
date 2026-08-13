import { ModuleSuspense } from "@/components/module-suspense";
import { requirePathAccess } from "@/lib/auth/require";

export default async function SeguimientoLayout({ children }: { children: React.ReactNode }) {
  await requirePathAccess("/seguimiento");
  return <ModuleSuspense>{children}</ModuleSuspense>;
}
