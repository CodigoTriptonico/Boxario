"use client";

import { useEffect, useMemo, useState } from "react";
import { emptyDistributor } from "@/components/config/config-pricing-helpers";
import type { PricingCountryConfig } from "@/lib/pricing/types";
import type { PricingDistributorConfig } from "@/lib/pricing/types";

type UseConfigDistributorsParams = {
  section: string;
  countries: PricingCountryConfig[];
  distributors: PricingDistributorConfig[];
  setDistributors: React.Dispatch<React.SetStateAction<PricingDistributorConfig[]>>;
  distributorPrices: Record<string, Record<string, PricingCountryConfig["boxes"]>>;
  setDistributorPrices: React.Dispatch<
    React.SetStateAction<Record<string, Record<string, PricingCountryConfig["boxes"]>>>
  >;
};

export function useConfigDistributors({
  section,
  countries,
  distributors,
  setDistributors,
  distributorPrices,
  setDistributorPrices,
}: UseConfigDistributorsParams) {
  const [selectedDistributor, setSelectedDistributor] = useState<string | null>(null);
  const [selectedDistributorCountry, setSelectedDistributorCountry] = useState<string | null>(
    null,
  );
  const [showDistributorForm, setShowDistributorForm] = useState(false);
  const [newDistributor, setNewDistributor] = useState(emptyDistributor);

  const selectedDistributorData = useMemo(
    () => distributors.find((distributor) => distributor.name === selectedDistributor),
    [distributors, selectedDistributor],
  );

  const selectedDistributorCountryData = useMemo(
    () => countries.find((country) => country.name === selectedDistributorCountry),
    [countries, selectedDistributorCountry],
  );

  const selectedDistributorBoxes =
    selectedDistributor && selectedDistributorCountry
      ? distributorPrices[selectedDistributor]?.[selectedDistributorCountry] ||
        selectedDistributorCountryData?.boxes ||
        []
      : [];

  useEffect(() => {
    if (section === "distributors") {
      return;
    }

    queueMicrotask(() => {
      setSelectedDistributor(null);
      setSelectedDistributorCountry(null);
      setShowDistributorForm(false);
    });
  }, [section]);

  function addDistributor() {
    const name = newDistributor.name.trim();

    if (!name) {
      return;
    }

    setDistributors((current) => [
      ...current,
      {
        name,
        contact: newDistributor.contact.trim() || "Sin contacto",
        phone: newDistributor.phone.trim() || "Sin teléfono",
        active: true,
      },
    ]);
    setNewDistributor(emptyDistributor);
    setShowDistributorForm(false);
  }

  function toggleDistributor(name: string) {
    setDistributors((current) =>
      current.map((distributor) =>
        distributor.name === name
          ? { ...distributor, active: !distributor.active }
          : distributor,
      ),
    );
  }

  function updateDistributorPrice(size: string, price: string) {
    if (!selectedDistributor || !selectedDistributorCountry || !selectedDistributorCountryData) {
      return;
    }

    const cleanPrice = price.replace("$", "");

    setDistributorPrices((current) => {
      const currentDistributor = current[selectedDistributor] || {};
      const currentBoxes = currentDistributor[selectedDistributorCountry] ||
        selectedDistributorCountryData.boxes;

      return {
        ...current,
        [selectedDistributor]: {
          ...currentDistributor,
          [selectedDistributorCountry]: currentBoxes.map((box) =>
            box.size === size ? { ...box, price: `$${cleanPrice}` } : box,
          ),
        },
      };
    });
  }

  function clearDistributorCountrySelection(countryName: string) {
    if (selectedDistributorCountry === countryName) {
      setSelectedDistributorCountry(null);
    }
  }

  return {
    selectedDistributor,
    setSelectedDistributor,
    selectedDistributorCountry,
    setSelectedDistributorCountry,
    showDistributorForm,
    setShowDistributorForm,
    newDistributor,
    setNewDistributor,
    selectedDistributorData,
    selectedDistributorCountryData,
    selectedDistributorBoxes,
    addDistributor,
    toggleDistributor,
    updateDistributorPrice,
    clearDistributorCountrySelection,
  };
}
