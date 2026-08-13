import type { PricingCountryConfig } from "@/lib/pricing/types";
import type { PricingPromotionConfig } from "@/lib/pricing-promotions";

type CountryRemovalRisk = "low" | "moderate";

export type CountryRemovalAssessment = {
  risk: CountryRemovalRisk;
  hasBoxes: boolean;
  hasPromotions: boolean;
  hasDistributorPrices: boolean;
};

export function assessCountryRemovalRisk(
  country: PricingCountryConfig | undefined,
  promotions: PricingPromotionConfig[],
  distributorPrices: Record<string, Record<string, PricingCountryConfig["boxes"]>>,
): CountryRemovalAssessment {
  const countryName = country?.name ?? "";
  const hasBoxes = Boolean(country?.boxes.length);
  const hasPromotions = promotions.some(
    (promotion) => promotion.countryName === countryName,
  );
  const hasDistributorPrices = Object.values(distributorPrices).some((byCountry) =>
    Boolean(byCountry?.[countryName]?.length),
  );

  const risk: CountryRemovalRisk =
    hasBoxes || hasPromotions || hasDistributorPrices ? "moderate" : "low";

  return { risk, hasBoxes, hasPromotions, hasDistributorPrices };
}

export function countryAddSuccessMessage(countryName: string) {
  return `${countryName} se agregó correctamente.`;
}

export function countryAddDuplicateMessage(countryName: string) {
  return `${countryName} ya está agregado.`;
}

export function countryAddErrorMessage(countryName: string) {
  return `No se pudo agregar ${countryName}. Revisa tu conexión e inténtalo nuevamente.`;
}

export function countryRemoveSuccessMessage(countryName: string) {
  return `${countryName} eliminado.`;
}

export function countryRemoveBlockedMessage(countryName: string) {
  return `${countryName} no puede eliminarse porque tiene configuraciones relacionadas.`;
}

export function countryRemoveErrorMessage(countryName: string) {
  return `No se pudo eliminar ${countryName}. Inténtalo nuevamente.`;
}

export function countryRemovalConfirmCopy(countryName: string, assessment: CountryRemovalAssessment) {
  const parts: string[] = [];

  if (assessment.hasBoxes) {
    parts.push("productos con precio");
  }
  if (assessment.hasPromotions) {
    parts.push("promociones");
  }
  if (assessment.hasDistributorPrices) {
    parts.push("precios de distribuidor");
  }

  const related =
    parts.length > 0
      ? `${countryName} tiene ${parts.join(", ")}. Esta acción puede afectar otras funciones del sistema.`
      : `${countryName} se quitará de la configuración comercial.`;

  return {
    title: `Eliminar ${countryName}`,
    message: related,
    confirmLabel: "Eliminar país",
  };
}
