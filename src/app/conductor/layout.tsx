import { ModuleSuspense } from "@/components/module-suspense";
import { requirePathAccess } from "@/lib/auth/require";

export default async function ConductorLayout({ children }: { children: React.ReactNode }) {
  await requirePathAccess("/conductor/tareas");
  return <ModuleSuspense>{children}</ModuleSuspense>;
}
