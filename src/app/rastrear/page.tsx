import { Suspense } from "react";
import { PublicTrackingClient } from "@/components/public-tracking-client";

export const metadata = { title: "Rastrea tu envío | Boxario" };

export default function PublicTrackingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center" aria-busy="true" aria-label="Cargando">
          <div className="skeleton-line h-2 w-24 rounded-full bg-surface-card" />
        </div>
      }
    >
      <PublicTrackingClient />
    </Suspense>
  );
}
