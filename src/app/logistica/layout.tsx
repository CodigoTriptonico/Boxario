import { ModuleSuspense } from "@/components/module-suspense";
import { requirePathAccess } from "@/lib/auth/require";

export default async function LogisticaLayout({ children }: { children: React.ReactNode }) {
  await requirePathAccess("/logistica");
  return <ModuleSuspense>{children}</ModuleSuspense>;
}
