type Props = { children: React.ReactNode };

/**
 * El boundary autoritativo vive en AppFrame para que un módulo no reemplace
 * su superficie por un segundo placeholder genérico durante la misma carga.
 */
export function ModuleSuspense({ children }: Props) {
  return children;
}
