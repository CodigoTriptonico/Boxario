import { resolveCountryCodeFromString } from "@/lib/country-options";

const COUNTRY_ALPHA3: Record<string, string> = {
  CO: "COL",
  CR: "CRI",
  EC: "ECU",
  SV: "SLV",
  GT: "GTM",
  HN: "HND",
  MX: "MEX",
  NI: "NIC",
  PA: "PAN",
  PE: "PER",
  US: "USA",
};

export function invoiceReferenceCountryCode(country: string | undefined) {
  const alpha2 = resolveCountryCodeFromString(country?.trim() || "");
  return COUNTRY_ALPHA3[alpha2] || alpha2 || "UNK";
}

export function invoiceReferenceCityCode(city: string | undefined) {
  const normalized = (city || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "");
  return normalized ? normalized.slice(0, 3).padEnd(3, "X") : "UNK";
}

export function formatSellerCode(sellerCode: number) {
  const safeSellerCode = Math.min(999, Math.max(1, Math.floor(sellerCode) || 1));
  return String(safeSellerCode).padStart(3, "0");
}

export function formatCompanyCode(companyCode: number) {
  const safeCompanyCode = Math.max(1, Math.floor(companyCode) || 1);
  return String(safeCompanyCode).padStart(3, "0");
}

export type InvoiceReferenceInput = {
  sequence: number;
  country: string | undefined;
  city: string | undefined;
  sellerCode: number;
  companyCode: number;
  boxCount: number;
};

export function formatInvoiceReference({
  sequence,
  country,
  city,
  sellerCode,
  companyCode,
  boxCount,
}: InvoiceReferenceInput) {
  const safeSequence = Math.max(1, Math.floor(sequence) || 1);
  const safeBoxCount = Math.max(1, Math.floor(boxCount) || 1);

  return `${invoiceReferenceCountryCode(country)}${formatSellerCode(sellerCode)}${invoiceReferenceCityCode(city)}${safeBoxCount}${formatCompanyCode(companyCode)}${String(safeSequence).padStart(4, "0")}`;
}
