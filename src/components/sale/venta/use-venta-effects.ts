"use client";

import { useEffect, useRef } from "react";
import type { VentaBootstrapData } from "@/app/actions/sale-bootstrap";
import { listCustomerLogisticsChargeHistoryAction } from "@/app/actions/sale-customer-history";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { emptyCustomerLogisticsChargeHistory } from "@/lib/logistics-charge-history";
import { type AddressFormKind, type AddressSuggestResponse, type AddressSuggestion, applyAddressSuggestResult } from "@/components/sale/venta-parts";
import { formatValidatedAddress } from "@/components/sale/venta/shared";
import type { VentaCore } from "@/components/sale/venta/use-venta-core";
import type { VentaFoundation } from "@/components/sale/venta/use-venta-foundation";
import type { VentaData } from "@/components/sale/venta/use-venta-data";
import type { VentaFlow } from "@/components/sale/venta/use-venta-flow";

type VentaEffectsContext = VentaCore & VentaFoundation & VentaData & VentaFlow;

export function useVentaEffects(
  context: VentaEffectsContext,
  initialData?: VentaBootstrapData,
) {
  const {
    activeSender,
    clientAddressQuery,
    clientAddressValidation,
    ensureSenderRecipients,
    historyLoading,
    historyRows,
    mode,
    needsRecipientCountrySetup,
    newClientCity,
    newClientHouse,
    newClientNeighborhood,
    newClientPostalCode,
    newClientState,
    newClientStreet,
    newRecipientCity,
    newRecipientCountry,
    newRecipientHouse,
    newRecipientNeighborhood,
    newRecipientPostalCode,
    newRecipientState,
    newRecipientStreet,
    quickSaleSender,
    recipientAddressQuery,
    recipientAddressValidation,
    recipientsHydratingRef,
    reloadCustomers,
    reloadHistory,
    resetNewRecipientForm,
    selectedSender,
    senderQuery,
    setActiveStep,
    setClientAddressSearch,
    setClientAddressSearching,
    setClientAddressSuggestions,
    setClientAddressValidation,
    setCustomerLogisticsChargeHistory,
    setMode,
    setNewClientCity,
    setNewClientHouse,
    setNewClientNeighborhood,
    setNewClientPostalCode,
    setNewClientState,
    setNewClientStreet,
    setNewRecipientCity,
    setNewRecipientHouse,
    setNewRecipientNeighborhood,
    setNewRecipientPostalCode,
    setNewRecipientState,
    setNewRecipientStreet,
    setRecipientAddressSearch,
    setRecipientAddressSearching,
    setRecipientAddressSuggestions,
    setRecipientAddressValidation,
    setRecipientCountryGateOpen,
  } = context;

  const prevSenderQueryRef = useRef("");

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      return;
    }

    let cancelled = false;

    queueMicrotask(() => {
      if (!cancelled && !initialData?.senders?.length) {
        void reloadCustomers("", { showLoading: true });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [initialData?.senders?.length, reloadCustomers]);

  useEffect(() => {
    if (!activeSender?.id || activeSender.id.startsWith("local-") || activeSender.recipients.length > 0) {
      return;
    }

    if (recipientsHydratingRef.current === activeSender.id) {
      return;
    }

    recipientsHydratingRef.current = activeSender.id;
    void ensureSenderRecipients(activeSender).finally(() => {
      if (recipientsHydratingRef.current === activeSender.id) {
        recipientsHydratingRef.current = null;
      }
    });
  }, [activeSender, ensureSenderRecipients, recipientsHydratingRef]);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      return;
    }

    const query = senderQuery.trim();
    const prevQuery = prevSenderQueryRef.current.trim();
    prevSenderQueryRef.current = senderQuery;

    if (!query && !prevQuery) {
      return;
    }

    const timer = window.setTimeout(() => {
      void reloadCustomers(query);
    }, query ? 250 : 0);

    return () => window.clearTimeout(timer);
  }, [reloadCustomers, senderQuery]);

  useEffect(() => {
    if (mode !== "history" || historyRows.length > 0 || historyLoading) {
      return;
    }

    queueMicrotask(() => {
      void reloadHistory();
    });
  }, [historyLoading, historyRows.length, mode, reloadHistory]);

  useEffect(() => {
    const customerId = String(quickSaleSender?.id || selectedSender?.id || "").trim();
    if (!customerId || customerId.startsWith("local-") || !isSupabaseConfigured()) {
      setCustomerLogisticsChargeHistory(emptyCustomerLogisticsChargeHistory());
      return;
    }

    let cancelled = false;
    void listCustomerLogisticsChargeHistoryAction({ customerId }).then((result) => {
      if (cancelled) {
        return;
      }
      if (!result.ok) {
        setCustomerLogisticsChargeHistory(emptyCustomerLogisticsChargeHistory());
        return;
      }
      setCustomerLogisticsChargeHistory(result.data);
    });

    return () => {
      cancelled = true;
    };
  }, [quickSaleSender?.id, selectedSender?.id, setCustomerLogisticsChargeHistory]);

  function startRecipientCreation() {
    if (needsRecipientCountrySetup) {
      setRecipientCountryGateOpen(true);
      return;
    }

    resetNewRecipientForm();
    setMode("new-recipient");
    setActiveStep("recipient");
  }

  async function selectAddressSuggestion(kind: AddressFormKind, suggestion: AddressSuggestion) {
    const isClient = kind === "client";
    const setValidation = isClient ? setClientAddressValidation : setRecipientAddressValidation;
    const setSuggestions = isClient ? setClientAddressSuggestions : setRecipientAddressSuggestions;
    const setSearch = isClient ? setClientAddressSearch : setRecipientAddressSearch;

    setValidation({ status: "checking", message: "Separando direccion..." });
    setSearch(suggestion.description);
    setSuggestions([]);
    if (isClient) {
      setClientAddressSearching(false);
    } else {
      setRecipientAddressSearching(false);
    }

    try {
      const response = await fetch("/api/validate-address", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "details",
          placeId: suggestion.placeId,
        }),
      });
      const data = (await response.json()) as {
        ok?: boolean;
        partial?: boolean;
        error?: string;
        address?: {
          street?: string;
          houseNumber?: string;
          neighborhood?: string;
          city?: string;
          state?: string;
          postalCode?: string;
          country?: string;
          formattedAddress?: string;
          placeId?: string;
          lat?: number | null;
          lng?: number | null;
        };
      };

      if (!response.ok || !data.ok || !data.address) {
        setValidation({
          status: "invalid",
          message: data.error || "No se pudo separar direccion",
        });
        return;
      }

      if (isClient) {
        setNewClientStreet(data.address.street || newClientStreet);
        setNewClientHouse(data.address.houseNumber || newClientHouse);
        setNewClientNeighborhood(data.address.neighborhood || newClientNeighborhood);
        setNewClientCity(data.address.city || newClientCity);
        setNewClientState(data.address.state || newClientState);
        setNewClientPostalCode(data.address.postalCode || newClientPostalCode);
      } else {
        setNewRecipientStreet(data.address.street || newRecipientStreet);
        setNewRecipientHouse(data.address.houseNumber || newRecipientHouse);
        setNewRecipientNeighborhood(data.address.neighborhood || newRecipientNeighborhood);
        setNewRecipientCity(data.address.city || newRecipientCity);
        setNewRecipientState(data.address.state || newRecipientState);
        setNewRecipientPostalCode(data.address.postalCode || newRecipientPostalCode);
      }

      const needsUnit = !data.address.houseNumber?.trim();
      const typedUnit = isClient ? newClientHouse : newRecipientHouse;

      setValidation({
        status: "valid",
        message: "Direccion valida",
        formattedAddress: formatValidatedAddress(data.address, typedUnit),
        placeId: data.address.placeId || suggestion.placeId,
        needsUnit,
        lat: data.address.lat ?? null,
        lng: data.address.lng ?? null,
      });
    } catch {
      setValidation({
        status: "invalid",
        message: "No se pudo conectar con Google",
      });
    }
  }

  function touchClientAddressField(update: () => void) {
    update();
    setClientAddressValidation({ status: "idle", message: "" });
  }

  function touchRecipientAddressField(update: () => void) {
    update();
    setRecipientAddressValidation({ status: "idle", message: "" });
  }

  useEffect(() => {
    const query = clientAddressQuery.trim();

    if (clientAddressValidation.status === "valid" || clientAddressValidation.status === "checking") {
      queueMicrotask(() => setClientAddressSuggestions([]));
      queueMicrotask(() => setClientAddressSearching(false));
      return;
    }

    if (query.length < 3) {
      queueMicrotask(() => setClientAddressSuggestions([]));
      queueMicrotask(() => setClientAddressSearching(false));
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      setClientAddressSearching(true);
      void fetch("/api/validate-address", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "suggest", query, country: "USA" }),
        signal: controller.signal,
      })
        .then(async (response) => {
          const data = (await response.json()) as AddressSuggestResponse;
          if (controller.signal.aborted) {
            return;
          }
          applyAddressSuggestResult(
            data,
            response.ok,
            setClientAddressSuggestions,
            setClientAddressValidation,
          );
          setClientAddressSearching(false);
        })
        .catch(() => {
          if (!controller.signal.aborted) {
            setClientAddressSuggestions([]);
            setClientAddressSearching(false);
            setClientAddressValidation({
              status: "invalid",
              message: "No se pudo conectar con el servicio de direcciones",
            });
          }
        });
    }, 350);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [
    clientAddressQuery,
    clientAddressValidation.status,
    setClientAddressSearching,
    setClientAddressSuggestions,
    setClientAddressValidation,
  ]);

  useEffect(() => {
    const query = recipientAddressQuery.trim();

    if (recipientAddressValidation.status === "valid" || recipientAddressValidation.status === "checking") {
      queueMicrotask(() => setRecipientAddressSuggestions([]));
      queueMicrotask(() => setRecipientAddressSearching(false));
      return;
    }

    if (query.length < 3 || !newRecipientCountry) {
      queueMicrotask(() => setRecipientAddressSuggestions([]));
      queueMicrotask(() => setRecipientAddressSearching(false));
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      setRecipientAddressSearching(true);
      void fetch("/api/validate-address", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "suggest", query, country: newRecipientCountry }),
        signal: controller.signal,
      })
        .then(async (response) => {
          const data = (await response.json()) as AddressSuggestResponse;
          if (controller.signal.aborted) {
            return;
          }
          applyAddressSuggestResult(
            data,
            response.ok,
            setRecipientAddressSuggestions,
            setRecipientAddressValidation,
          );
          setRecipientAddressSearching(false);
        })
        .catch(() => {
          if (!controller.signal.aborted) {
            setRecipientAddressSuggestions([]);
            setRecipientAddressSearching(false);
            setRecipientAddressValidation({
              status: "invalid",
              message: "No se pudo conectar con el servicio de direcciones",
            });
          }
        });
    }, 350);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [
    newRecipientCountry,
    recipientAddressQuery,
    recipientAddressValidation.status,
    setRecipientAddressSearching,
    setRecipientAddressSuggestions,
    setRecipientAddressValidation,
  ]);

  return {
    startRecipientCreation,
    selectAddressSuggestion,
    touchClientAddressField,
    touchRecipientAddressField,
  };
}

export type VentaEffects = ReturnType<typeof useVentaEffects>;
