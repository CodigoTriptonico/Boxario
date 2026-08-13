import { Suspense } from "react";
import { PageContentPlaceholder } from "@/components/page-loading";

type Props = { children: React.ReactNode };

/** Fallback quieto para layouts con useSearchParams: mantiene hueco de barra + lista. */
export function ModuleSuspense({ children }: Props) {
  return <Suspense fallback={<PageContentPlaceholder />}>{children}</Suspense>;
}
