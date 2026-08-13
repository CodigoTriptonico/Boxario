"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

type LoadingButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  loadingLabel?: ReactNode;
  children: ReactNode;
};

/**
 * Botón con estado de carga accesible. Impide doble envío mientras `loading` es true.
 */
export function LoadingButton({
  loading = false,
  loadingLabel,
  children,
  disabled,
  className,
  type = "button",
  ...props
}: LoadingButtonProps) {
  return (
    <button
      type={type}
      className={className}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (loadingLabel ?? children) : children}
    </button>
  );
}
