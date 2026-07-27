import type { ReactNode } from "react";
import { resolveCountryCode } from "@/lib/country-options";

export type CountryFlagSize = "xs" | "sm" | "md" | "lg";

const sizeClasses: Record<CountryFlagSize, string> = {
  xs: "h-4 w-6 text-[9px]",
  sm: "h-5 w-8 text-[10px]",
  md: "h-10 w-14 text-xs",
  lg: "h-12 w-16 text-sm",
};

function resolveCode(country: { code?: string; name?: string }) {
  const code = country.code?.trim() || "";
  const name = country.name?.trim() || code;

  if (!name) {
    return "";
  }

  return resolveCountryCode({ code, name });
}

export function CountryFlag({
  code,
  name,
  size = "sm",
  className = "",
  /** Escala de grises + contraste alto; mejor para etiquetas impresas en B/N. */
  mono = false,
}: {
  code?: string;
  name?: string;
  size?: CountryFlagSize;
  className?: string;
  mono?: boolean;
}) {
  const resolvedCode = resolveCode({ code, name });
  const sizeClass = sizeClasses[size];
  const base = `inline-block shrink-0 overflow-hidden rounded-md border border-black bg-slate-700 shadow-sm ${sizeClass}`;

  if (!resolvedCode) {
    return (
      <span
        className={`${base} flex items-center justify-center font-black text-slate-300 ${className}`}
        aria-hidden
      >
        --
      </span>
    );
  }

  const flagUrl = `https://flagcdn.com/w80/${resolvedCode.toLowerCase()}.png`;
  const label = name || resolvedCode;

  if (mono) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- CDN flag; grayscale for B/N print
      <img
        src={flagUrl}
        alt={label}
        className={`${base} object-cover grayscale contrast-150 ${className}`}
        loading="lazy"
        decoding="async"
      />
    );
  }

  return (
    <span
      className={`${base} bg-cover bg-center ${className}`}
      style={{
        backgroundImage: `url(${flagUrl})`,
      }}
      role="img"
      aria-label={label}
    />
  );
}

export function CountryName({
  name,
  code,
  size = "sm",
  className = "",
  labelClassName = "",
}: {
  name: string;
  code?: string;
  size?: CountryFlagSize;
  className?: string;
  labelClassName?: string;
}) {
  if (!name.trim()) {
    return null;
  }

  return (
    <span className={`inline-flex min-w-0 items-center gap-2 ${className}`}>
      <CountryFlag code={code} name={name} size={size} />
      <span className={`min-w-0 truncate ${labelClassName}`}>{name}</span>
    </span>
  );
}

export function countryFlagIcon(
  country: string | { code?: string; name: string },
  size: CountryFlagSize = "sm",
): ReactNode {
  if (typeof country === "string") {
    return <CountryFlag name={country} size={size} />;
  }

  return <CountryFlag code={country.code} name={country.name} size={size} />;
}
