import { ModuleSuspense } from "@/components/module-suspense";
import { requirePathAccess } from "@/lib/auth/require";

export default async function AuditoriaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePathAccess("/auditoria");
  return <ModuleSuspense>{children}</ModuleSuspense>;
}
