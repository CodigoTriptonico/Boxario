"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { listActivityHistoryAction } from "@/app/actions/history";
import { loadSaleCountryBoxesAction } from "@/app/actions/pricing";
import {
  normalizePhoneList,
  personFullName,
  recipientIdentityKey,
  saleSteps,
  samePersonName,
  senderHasPhone,
  type ContextMenuState,
  type SaleStep,
} from "@/components/sale/venta-parts";
import { saleContextTargetData } from "@/lib/sale-context-target";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { resolveCountryBoxes } from "@/components/sale/venta/shared";
import type { VentaCore } from "@/components/sale/venta/use-venta-core";
import type { VentaFoundation } from "@/components/sale/venta/use-venta-foundation";

type VentaDataContext = VentaCore & VentaFoundation;

export function useVentaData(context: VentaDataContext) {
  const {
    setBoxCartOpen,
    activeStep,
    setActiveStep,
    logisticsPlanReady,
    scrollToStep,
    quickSaleDraft,
    setQuickPayNowDraft,
    setQuickPayNowDraftTouched,
    logisticsFees,
    selectedBox,
    selectedRecipient,
    selectedSender,
    setHistoryLoading,
    setHistoryError,
    setHistoryRows,
    setCountryBoxes,
    mode,
    resetNewClientForm,
    resetNewRecipientForm,
    setMode,
    setActiveCopyGroup,
    setContextMenu,
    setShellConfig,
    contextMenu,
    newClientPhones,
    newClientEmails,
    newRecipientEmails,
    senderList,
    editingCustomerId,
    newRecipientFirstName,
    newRecipientLastName,
    newRecipientCountry,
    editingRecipientId,
    senderQuery,
    senderCatalogCountRef,
    recipientQuery,
    countryBoxes,
    saleShortcuts,
    fullAddress,
  } = context;

  function continueFromCart() {
    setBoxCartOpen(false);
    if (activeStep === "box") {
      setActiveStep("delivery");
    }
  }

  function continueFromLogistics() {
    if (!logisticsPlanReady) {
      return;
    }

    setActiveStep("finish");
    scrollToStep("finish");
  }

  useEffect(() => {
    queueMicrotask(() => {
      if (!quickSaleDraft) {
        setQuickPayNowDraft("");
        setQuickPayNowDraftTouched(false);
        return;
      }

      setQuickPayNowDraft(quickSaleDraft.payNowAmount);
      setQuickPayNowDraftTouched(true);
    });
  }, [
    quickSaleDraft,
    logisticsFees,
    setQuickPayNowDraft,
    setQuickPayNowDraftTouched,
  ]);

  const completedStep: SaleStep = logisticsPlanReady
    ? "finish"
    : selectedBox
      ? "delivery"
      : selectedRecipient
        ? "box"
        : selectedSender
          ? "recipient"
          : "client";
  const completedStepIndex = saleSteps.findIndex((step) => step.id === completedStep);
  const maxUnlockedStepIndex = completedStepIndex;

  const reloadHistory = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setHistoryLoading(false);
      return;
    }

    setHistoryLoading(true);
    setHistoryError("");

    const result = await listActivityHistoryAction();

    setHistoryLoading(false);

    if (!result.ok) {
      setHistoryError(result.error);
      return;
    }

    setHistoryRows(result.data);
  }, [setHistoryError, setHistoryLoading, setHistoryRows]);

  const reloadCountryBoxes = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      return;
    }

    const result = await loadSaleCountryBoxesAction();
    if (result.ok) {
      setCountryBoxes(result.data);
    }
  }, [setCountryBoxes]);

  useEffect(() => {
    function refreshCountryBoxes() {
      if (document.visibilityState === "visible") {
        void reloadCountryBoxes();
      }
    }

    window.addEventListener("focus", refreshCountryBoxes);
    document.addEventListener("visibilitychange", refreshCountryBoxes);
    return () => {
      window.removeEventListener("focus", refreshCountryBoxes);
      document.removeEventListener("visibilitychange", refreshCountryBoxes);
    };
  }, [reloadCountryBoxes]);

  useEffect(() => {
    if (mode === "new-recipient") {
      queueMicrotask(() => {
        void reloadCountryBoxes();
      });
    }
  }, [mode, reloadCountryBoxes]);

  function canOpenStep(step: SaleStep) {
    return saleSteps.findIndex((currentStep) => currentStep.id === step) <= maxUnlockedStepIndex;
  }

  function openStep(step: SaleStep) {
    if (!canOpenStep(step)) {
      return;
    }

    if (mode === "new-client") {
      resetNewClientForm();
    } else if (mode === "new-recipient") {
      resetNewRecipientForm();
    }
    setMode("sale");
    setActiveStep(step);
    scrollToStep(step);
  }

  function stepShellClass(step: SaleStep) {
    if (activeStep === step) {
      return "rounded-xl";
    }

    return "rounded-xl";
  }

  const openContextMenuAt = useCallback(
    (
      clientX: number,
      clientY: number,
      title: string,
      type: ContextMenuState["type"],
      targetKey: string,
      phones: string[] = [],
      address: ContextMenuState["address"] = {},
      firstName = "",
      lastName = "",
      customerId?: string,
      recipientId?: string,
    ) => {
      setActiveCopyGroup(null);
      const menuWidth = 288;
      const menuHeight = 380;
      const gap = 10;
      const x = Math.min(clientX, window.innerWidth - menuWidth - gap);
      const y = Math.min(clientY, window.innerHeight - menuHeight - gap);

      setContextMenu({
        x: Math.max(gap, x),
        y: Math.max(gap, y),
        title,
        firstName,
        lastName,
        type,
        targetKey,
        customerId,
        recipientId,
        phones,
        address,
      });
    },
    [setActiveCopyGroup, setContextMenu],
  );

  const openContextMenuForTarget = useCallback(
    (target: HTMLElement, clientX: number, clientY: number, delay = 0) => {
      const context = saleContextTargetData(target.dataset);

      if (!context) {
        return false;
      }

      const open = () =>
        openContextMenuAt(
          clientX,
          clientY,
          context.title,
          context.type,
          context.targetKey,
          context.phones,
          context.address,
          context.firstName,
          context.lastName,
          context.customerId,
          context.recipientId,
        );

      if (delay > 0) {
        window.setTimeout(open, delay);
      } else {
        open();
      }

      return true;
    },
    [openContextMenuAt],
  );

  useEffect(() => {
    setShellConfig({ contentEdgeToEdge: true });
    return () => setShellConfig({ contentEdgeToEdge: undefined });
  }, [setShellConfig]);

  useEffect(() => {
    function openSaleCardMenu(event: globalThis.MouseEvent) {
      if (event.type !== "contextmenu" && event.button !== 2) {
        return;
      }

      const target = event.target instanceof Element
        ? event.target.closest<HTMLElement>("[data-sale-context-key]")
        : null;

      if (!target) {
        return;
      }

      if (!openContextMenuForTarget(target, event.clientX, event.clientY)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
    }

    document.addEventListener("pointerup", openSaleCardMenu, true);
    document.addEventListener("mouseup", openSaleCardMenu, true);
    document.addEventListener("contextmenu", openSaleCardMenu, true);

    return () => {
      document.removeEventListener("pointerup", openSaleCardMenu, true);
      document.removeEventListener("mouseup", openSaleCardMenu, true);
      document.removeEventListener("contextmenu", openSaleCardMenu, true);
    };
  }, [openContextMenuForTarget]);

  useEffect(() => {
    if (!contextMenu) {
      return;
    }

    const closeMenu = () => {
      setContextMenu(null);
      setActiveCopyGroup(null);
    };

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMenu();
      }
    };

    window.addEventListener("pointerdown", closeMenu);
    window.addEventListener("scroll", closeMenu, true);
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      window.removeEventListener("pointerdown", closeMenu);
      window.removeEventListener("scroll", closeMenu, true);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [contextMenu, setActiveCopyGroup, setContextMenu]);

  const newClientPhoneList = useMemo(
    () => normalizePhoneList(newClientPhones),
    [newClientPhones],
  );
  const newClientEmailList = useMemo(
    () =>
      Array.from(
        new Set(newClientEmails.map((email) => email.trim().toLowerCase()).filter(Boolean)),
      ),
    [newClientEmails],
  );
  const newRecipientEmailList = useMemo(
    () =>
      Array.from(
        new Set(newRecipientEmails.map((email) => email.trim().toLowerCase()).filter(Boolean)),
      ),
    [newRecipientEmails],
  );

  const duplicateClient = useMemo(() => {
    if (!newClientPhoneList.length) {
      return null;
    }

    return senderList.find((sender) => {
      if (editingCustomerId && sender.id === editingCustomerId) {
        return false;
      }

      return newClientPhoneList.some((phone) => senderHasPhone(sender, phone));
    });
  }, [editingCustomerId, newClientPhoneList, senderList]);

  const recipientsHydratingRef = useRef<string | null>(null);

  const activeSender = useMemo(() => {
    if (!selectedSender) {
      return null;
    }

    return senderList.find((sender) => sender.id === selectedSender.id) ?? selectedSender;
  }, [selectedSender, senderList]);

  const duplicateRecipient = useMemo(() => {
    if (
      !selectedSender ||
      !newRecipientFirstName.trim() ||
      !newRecipientLastName.trim() ||
      !newRecipientCountry
    ) {
      return null;
    }

    const candidate = {
      firstName: newRecipientFirstName.trim(),
      lastName: newRecipientLastName.trim(),
    };

    return activeSender?.recipients.find(
      (recipient) =>
        recipient.id !== editingRecipientId &&
        samePersonName(recipient, candidate) && recipient.country === newRecipientCountry,
    );
  }, [
    activeSender,
    editingRecipientId,
    newRecipientCountry,
    newRecipientFirstName,
    newRecipientLastName,
    selectedSender,
  ]);

  const filteredSenders = useMemo(() => {
    return [...senderList].sort((left, right) => {
      const leftHasRecipients = left.recipients.length > 0 ? 1 : 0;
      const rightHasRecipients = right.recipients.length > 0 ? 1 : 0;

      if (rightHasRecipients !== leftHasRecipients) {
        return rightHasRecipients - leftHasRecipients;
      }

      return 0;
    });
  }, [senderList]);

  useEffect(() => {
    if (!senderQuery.trim()) {
      senderCatalogCountRef.current = senderList.length;
    }
  }, [senderCatalogCountRef, senderList, senderQuery]);

  const filteredRecipients = useMemo(() => {
    if (!activeSender) {
      return [];
    }

    const query = recipientQuery.trim().toLowerCase();

    if (!query) {
      return activeSender.recipients;
    }

    return activeSender.recipients.filter((recipient) =>
      [
        personFullName(recipient),
        recipient.firstName,
        recipient.lastName,
        recipient.phone,
        recipient.country,
        recipient.street,
        recipient.houseNumber,
        recipient.neighborhood,
        recipient.city,
        recipient.postalCode,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [activeSender, recipientQuery]);

  const recipientSearchOptions = useMemo(() => {
    if (!activeSender) {
      return [];
    }

    return activeSender.recipients.map((recipient) => ({
      value: recipientIdentityKey(recipient),
      label: personFullName(recipient),
      searchText: [
        personFullName(recipient),
        recipient.firstName,
        recipient.lastName,
        recipient.phone,
        recipient.country,
        recipient.street,
        recipient.city,
        recipient.postalCode,
      ]
        .filter(Boolean)
        .join(" "),
    }));
  }, [activeSender]);

  const boxesForCountry = useMemo(
    () =>
      selectedRecipient
        ? resolveCountryBoxes(countryBoxes, selectedRecipient.country)
        : [],
    [countryBoxes, selectedRecipient],
  );
  const suggestedRecipientId = useMemo(() => {
    if (!selectedSender?.id) {
      return undefined;
    }

    return saleShortcuts.lastRecipientByCustomerId[selectedSender.id];
  }, [saleShortcuts.lastRecipientByCustomerId, selectedSender]);

  const sortedFilteredRecipients = useMemo(() => {
    if (!suggestedRecipientId || filteredRecipients.length <= 1) {
      return filteredRecipients;
    }

    const suggested = filteredRecipients.find((recipient) => recipient.id === suggestedRecipientId);
    if (!suggested) {
      return filteredRecipients;
    }

    return [
      suggested,
      ...filteredRecipients.filter((recipient) => recipient.id !== suggestedRecipientId),
    ];
  }, [filteredRecipients, suggestedRecipientId]);

  useEffect(() => {
    const elements = Array.from(
      document.querySelectorAll<HTMLElement>("[data-sale-context-key]"),
    );

    function openElementMenu(event: globalThis.MouseEvent) {
      if (event.type !== "contextmenu" && event.button !== 2) {
        return;
      }

      const target = event.currentTarget instanceof HTMLElement ? event.currentTarget : null;

      if (!target) {
        return;
      }

      if (!openContextMenuForTarget(target, event.clientX, event.clientY, 50)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
    }

    elements.forEach((element) => {
      element.addEventListener("pointerup", openElementMenu, true);
      element.addEventListener("mouseup", openElementMenu, true);
      element.addEventListener("contextmenu", openElementMenu, true);
    });

    return () => {
      elements.forEach((element) => {
        element.removeEventListener("pointerup", openElementMenu, true);
        element.removeEventListener("mouseup", openElementMenu, true);
        element.removeEventListener("contextmenu", openElementMenu, true);
      });
    };
  }, [
    boxesForCountry,
    filteredSenders,
    openContextMenuForTarget,
    sortedFilteredRecipients,
  ]);

  const copyAddressItems = [
    {
      label: "Completa",
      value: fullAddress(),
    },
    { label: "Calle", value: contextMenu?.address.street },
    { label: "Casa", value: contextMenu?.address.houseNumber },
    { label: "Colonia", value: contextMenu?.address.neighborhood },
    { label: "Ciudad", value: contextMenu?.address.city },
    { label: "Estado", value: contextMenu?.address.state },
    { label: "CP", value: contextMenu?.address.postalCode },
    { label: "Referencias", value: contextMenu?.address.addressReference },
    { label: "Pais", value: contextMenu?.address.country },
  ].filter((item) => item.label === "Completa" || item.value);
  const copyGroups = [
    { label: "Todo", items: [] },
    {
      label: "Nombre",
      items: [
        { label: "Nombre completo", value: contextMenu?.title },
        { label: "Nombre", value: contextMenu?.firstName },
        { label: "Apellido", value: contextMenu?.lastName },
      ].filter((item) => item.value),
    },
    {
      label: "Telefono",
      items: contextMenu?.phones.length
        ? [
          ...(contextMenu.phones.length > 1
            ? [
              {
                label: "Todos los celulares",
                value: contextMenu.phones.join(", "),
              },
            ]
            : []),
          ...contextMenu.phones.map((phone, index) => ({
            label: `Celular ${index + 1}`,
            value: phone,
          })),
        ]
        : [],
    },
    {
      label: "Direccion",
      items: copyAddressItems,
    },
  ];
  return {
    continueFromCart,
    continueFromLogistics,
    completedStepIndex,
    maxUnlockedStepIndex,
    reloadHistory,
    openStep,
    stepShellClass,
    openContextMenuAt,
    openContextMenuForTarget,
    newClientPhoneList,
    newClientEmailList,
    newRecipientEmailList,
    duplicateClient,
    recipientsHydratingRef,
    activeSender,
    duplicateRecipient,
    filteredSenders,
    recipientSearchOptions,
    boxesForCountry,
    suggestedRecipientId,
    sortedFilteredRecipients,
    copyGroups,
  };
}

export type VentaData = ReturnType<typeof useVentaData>;
