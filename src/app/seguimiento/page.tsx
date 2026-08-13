import { redirect } from "next/navigation";
import { EnviosPageContent } from "@/components/envios-page-content";

export default async function SeguimientoPage({
  searchParams,
}: {
  searchParams?: Promise<{ view?: string }>;
}) {
  const params = await searchParams;
  if (params?.view === "configuracion") {
    redirect("/configuracion?view=prices&panel=rutas");
  }

  return <EnviosPageContent mode="tracking" />;
}
