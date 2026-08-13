import { redirect } from "next/navigation";

export default async function ConductorInventarioCamionPage({
  searchParams,
}: {
  searchParams: Promise<{ conductor?: string; route?: string }>;
}) {
  const { conductor, route } = await searchParams;
  const params = new URLSearchParams({ view: "carga" });

  if (conductor) {
    params.set("conductor", conductor);
  }

  if (route) {
    params.set("route", route);
  }

  redirect(`/conductor/tareas?${params.toString()}`);
}
