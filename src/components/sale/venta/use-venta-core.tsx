"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { VentaBootstrapData } from "@/app/actions/sale-bootstrap";
import type { LogisticsRouteCatalog } from "@/app/actions/logistics-routes";
import { useSetShellConfig } from "@/components/app-frame";
import { SaleHeaderCartTrigger } from "@/components/sale/sale-cart-panel";
import type { SalePersonCardVariantId } from "@/components/sale/sale-person-card-variants";
import type { QuickEmptyBoxDraft } from "@/components/sale/sale-quick-box-types";
import { formatInvoiceReference } from "@/lib/invoice-reference";
import {
  useDefaultPersonCardPaletteId,
  usePageViewLayout,
} from "@/components/ui/ui-surface-preferences-provider";
import { useNotify } from "@/hooks/use-notify";
import type { ActivityHistoryRow } from "@/lib/activity-history-types";
import {
  computeInvoiceBilling,
  defaultInvoiceBillingConfig,
  disabledLogisticsAdditionalCharge,
  logisticsAdditionalChargeIsValid,
  resolvePayNowFromDraft,
  type InvoiceBillingConfig,
  type LogisticsAdditionalCharge,
} from "@/lib/invoice-billing";
import {
  emptyCustomerLogisticsChargeHistory,
  type CustomerLogisticsChargeHistory,
} from "@/lib/logistics-charge-history";
import {
  PLATFORM_BRAND_TITLE,
  resolveOrganizationBranding,
} from "@/lib/organizations/branding";
import type { PricingPromotionConfig } from "@/lib/pricing-promotions";
import { recipientCountrySetupRequired } from "@/lib/recipient-country-gate";
import type { SaleShortcuts } from "@/lib/sale/shortcuts";
import { DEFAULT_SCHEDULE_SUGGESTIONS } from "@/lib/sale/schedule-suggestions";
import {
  saleRouteDecisionSummary,
  type SaleRouteDecision,
} from "@/lib/sale-route-decision";
import {
  SALE_PAYMENT_UNSET,
  type SalePaymentSelection,
} from "@/lib/sale-payment-choice";
import type { UiSurfaceContextId } from "@/lib/ui-surface-context";
import type { AddressValidation } from "@/lib/sale-address-validation";
import {
  EMPTY_BOX_DRIVER_MODE,
  FULL_BOX_DRIVER_MODE,
} from "@/lib/sale-logistics-modes";
import {
  logisticsDriverTaskCount,
  logisticsLegComplete,
  logisticsStepDetailRows,
  logisticsSummary,
  saleLogisticsContinueHint,
  saleLogisticsPlanReady,
  type AddressSuggestion,
  type ContextMenuState,
  type Recipient,
  type SaleStep,
  type Sender,
} from "@/components/sale/venta-parts";
import {
  billingForPaymentChoice,
  boxInvoicesForSale,
  buildAddressSuggestQuery,
  resolveCountryPromotionsForCatalogKeys,
  saleBoxCatalogKey,
  saleCartSummary,
  saleCartToBillingLines,
  type CreatedInvoiceSnapshot,
  type FinishDocTab,
  type RouteAssignmentRetry,
  type SaleBoxCartLine,
  type SaleDriverLeg,
} from "@/components/sale/venta/shared";

export function useVentaCore(initialData?: VentaBootstrapData) {
  const localIdPrefix = useId();
  const localIdCounterRef = useRef(0);
  const setShellConfig = useSetShellConfig();
  const notify = useNotify();
  const router = useRouter();
  const sellerCode = initialData?.sellerCode ?? 1;
  const companyCode = initialData?.companyCode ?? 1;
  const [mode, setMode] = useState<"sale" | "clients" | "history" | "new-client" | "new-recipient">("sale");
  const [activeStep, setActiveStep] = useState<SaleStep>("client");
  const saleListPaletteContext = useMemo<UiSurfaceContextId>(
    () => {
      if (activeStep === "box") {
        return "sale.box";
      }
      if (activeStep === "recipient" || mode === "new-recipient") {
        return "sale.recipientCard";
      }
      return "sale.senderCard";
    },
    [activeStep, mode],
  );
  const { layout: viewLayout } = usePageViewLayout(saleListPaletteContext);
  const defaultSenderCardStyle = useDefaultPersonCardPaletteId(
    "sale.senderCard",
  ) as SalePersonCardVariantId;
  const defaultRecipientCardStyle = useDefaultPersonCardPaletteId(
    "sale.recipientCard",
  ) as SalePersonCardVariantId;

  useEffect(() => {
    setShellConfig({ surfaceContextId: saleListPaletteContext });
    return () => setShellConfig({ surfaceContextId: undefined });
  }, [saleListPaletteContext, setShellConfig]);

  const [senderList, setSenderList] = useState<Sender[]>(initialData?.senders ?? []);
  const [saleShortcuts, setSaleShortcuts] = useState<SaleShortcuts>(
    initialData?.shortcuts ?? {
      recentCustomerIds: [],
      lastRecipientByCustomerId: {},
    },
  );
  const [customersLoading, setCustomersLoading] = useState(false);
  const [customersError, setCustomersError] = useState("");
  const [, setCustomersSaving] = useState(false);
  const [historyRows, setHistoryRows] = useState<ActivityHistoryRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [countryBoxes, setCountryBoxes] = useState<Record<string, string[][]>>(
    initialData?.countryBoxes ?? {},
  );
  const [boxStockByKey] = useState(initialData?.boxStockByKey ?? {});
  const [countryPromotions] = useState<PricingPromotionConfig[]>(
    initialData?.countryPromotions ?? [],
  );
  const [logisticsFees] = useState<InvoiceBillingConfig>(
    initialData?.logisticsFees ?? defaultInvoiceBillingConfig,
  );
  const [emptyBoxAdditionalCharge, setEmptyBoxAdditionalCharge] =
    useState<LogisticsAdditionalCharge>(disabledLogisticsAdditionalCharge);
  const [fullBoxAdditionalCharge, setFullBoxAdditionalCharge] =
    useState<LogisticsAdditionalCharge>(disabledLogisticsAdditionalCharge);
  const [quickEmptyBoxAdditionalCharge, setQuickEmptyBoxAdditionalCharge] =
    useState<LogisticsAdditionalCharge>(disabledLogisticsAdditionalCharge);
  const [customerLogisticsChargeHistory, setCustomerLogisticsChargeHistory] =
    useState<CustomerLogisticsChargeHistory>(emptyCustomerLogisticsChargeHistory);
  const scheduleSuggestions =
    initialData?.scheduleSuggestions ?? {
      delivery: {
        ...DEFAULT_SCHEDULE_SUGGESTIONS.delivery,
        range: [],
      },
      pickup: {
        ...DEFAULT_SCHEDULE_SUGGESTIONS.pickup,
        range: [],
      },
      byWeekday: {
        delivery: Array.from({ length: 7 }, () => ({
          ...DEFAULT_SCHEDULE_SUGGESTIONS.delivery,
          range: [],
        })),
        pickup: Array.from({ length: 7 }, () => ({
          ...DEFAULT_SCHEDULE_SUGGESTIONS.pickup,
          range: [],
        })),
      },
    };
  const organizationBranding =
    initialData?.organizationBranding ??
    resolveOrganizationBranding({ name: PLATFORM_BRAND_TITLE });
  const [payNowDraft, setPayNowDraft] = useState("");
  const [payNowDraftTouched, setPayNowDraftTouched] = useState(false);
  const [quickPayNowDraft, setQuickPayNowDraft] = useState("");
  const [quickPayNowDraftTouched, setQuickPayNowDraftTouched] = useState(false);
  const [invoicePaymentMethod, setInvoicePaymentMethod] =
    useState<SalePaymentSelection>(SALE_PAYMENT_UNSET);
  const [invoicePaymentNote, setInvoicePaymentNote] = useState("");
  const [quickPaymentMethod, setQuickPaymentMethod] =
    useState<SalePaymentSelection>(SALE_PAYMENT_UNSET);
  const [quickPaymentNote, setQuickPaymentNote] = useState("");
  const [createdInvoice, setCreatedInvoice] = useState<CreatedInvoiceSnapshot | null>(null);
  const [finishDocTab, setFinishDocTab] = useState<FinishDocTab>("invoice");
  const [editingFromFinish, setEditingFromFinish] = useState(false);
  const [documentEditKind, setDocumentEditKind] = useState<"sender" | "recipient" | null>(null);
  const [quickCheckoutCompleted, setQuickCheckoutCompleted] = useState(false);
  const [invoiceConfirmOpen, setInvoiceConfirmOpen] = useState(false);
  const [recipientCountryGateOpen, setRecipientCountryGateOpen] = useState(false);
  const [selectedPromotionId, setSelectedPromotionId] = useState("");
  const [boxCartOpen, setBoxCartOpen] = useState(false);
  const [quickSelectedPromotionId, setQuickSelectedPromotionId] = useState("");
  const [selectedSender, setSelectedSender] = useState<Sender | null>(null);
  const [selectedRecipient, setSelectedRecipient] = useState<Recipient | null>(null);
  const [selectedBoxLines, setSelectedBoxLines] = useState<SaleBoxCartLine[]>([]);
  const selectedBox = selectedBoxLines[0]?.box ?? null;
  const selectedBoxCount = selectedBoxLines.reduce((sum, line) => sum + line.quantity, 0);
  const selectedCartBillingLines = useMemo(
    () => saleCartToBillingLines(selectedBoxLines),
    [selectedBoxLines],
  );
  const selectedCartSummary = useMemo(
    () => saleCartSummary(selectedBoxLines),
    [selectedBoxLines],
  );
  const cartPanelLines = useMemo(
    () =>
      selectedBoxLines.map((line) => ({
        id: line.id,
        label: line.box[0] || "Producto",
        unitPrice: line.box[1] || "$0",
        quantity: line.quantity,
      })),
    [selectedBoxLines],
  );
  const [senderQuery, setSenderQuery] = useState("");
  const [recipientQuery, setRecipientQuery] = useState("");
  const [newClientFirstName, setNewClientFirstName] = useState("");
  const [newClientLastName, setNewClientLastName] = useState("");
  const [newClientPhones, setNewClientPhones] = useState<string[]>([""]);
  const [newClientEmails, setNewClientEmails] = useState<string[]>([""]);
  const [newClientStreet, setNewClientStreet] = useState("");
  const [newClientHouse, setNewClientHouse] = useState("");
  const [newClientNeighborhood, setNewClientNeighborhood] = useState("");
  const [newClientCity, setNewClientCity] = useState("");
  const [newClientState, setNewClientState] = useState("");
  const [newClientPostalCode, setNewClientPostalCode] = useState("");
  const [newClientAddressReference, setNewClientAddressReference] = useState("");
  const [newClientReferredByCustomerId, setNewClientReferredByCustomerId] = useState("");
  const [clientAddressSearch, setClientAddressSearch] = useState("");
  const [clientAddressSuggestions, setClientAddressSuggestions] = useState<AddressSuggestion[]>([]);
  const [clientAddressSearching, setClientAddressSearching] = useState(false);
  const [newRecipientFirstName, setNewRecipientFirstName] = useState("");
  const [newRecipientLastName, setNewRecipientLastName] = useState("");
  const [newRecipientPhone, setNewRecipientPhone] = useState("");
  const [newRecipientEmails, setNewRecipientEmails] = useState<string[]>([""]);
  const [newRecipientCountry, setNewRecipientCountry] = useState("");
  const [newRecipientStreet, setNewRecipientStreet] = useState("");
  const [newRecipientHouse, setNewRecipientHouse] = useState("");
  const [newRecipientNeighborhood, setNewRecipientNeighborhood] = useState("");
  const [newRecipientCity, setNewRecipientCity] = useState("");
  const [newRecipientState, setNewRecipientState] = useState("");
  const [newRecipientPostalCode, setNewRecipientPostalCode] = useState("");
  const [newRecipientAddressReference, setNewRecipientAddressReference] = useState("");
  const [recipientAddressSearch, setRecipientAddressSearch] = useState("");
  const [recipientAddressSuggestions, setRecipientAddressSuggestions] = useState<AddressSuggestion[]>([]);
  const [recipientAddressSearching, setRecipientAddressSearching] = useState(false);
  const [clientAddressValidation, setClientAddressValidation] = useState<AddressValidation>({
    status: "idle",
    message: "",
  });
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);
  const [editingRecipientId, setEditingRecipientId] = useState<string | null>(null);
  const [recipientAddressValidation, setRecipientAddressValidation] = useState<AddressValidation>({
    status: "idle",
    message: "",
  });
  const clientAddressQuery = useMemo(
    () =>
      buildAddressSuggestQuery(
        [
          newClientStreet,
          newClientHouse,
          newClientNeighborhood,
          newClientCity,
          newClientState,
          newClientPostalCode,
        ],
      ),
    [
      newClientStreet,
      newClientHouse,
      newClientNeighborhood,
      newClientCity,
      newClientState,
      newClientPostalCode,
    ],
  );
  const recipientAddressQuery = useMemo(
    () =>
      buildAddressSuggestQuery(
        [
          newRecipientStreet,
          newRecipientHouse,
          newRecipientNeighborhood,
          newRecipientCity,
          newRecipientState,
          newRecipientPostalCode,
        ],
      ),
    [
      newRecipientStreet,
      newRecipientHouse,
      newRecipientNeighborhood,
      newRecipientCity,
      newRecipientState,
      newRecipientPostalCode,
    ],
  );
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    kind: "remitente" | "destinatario";
    title: string;
    customerId: string;
    recipientId?: string;
  } | null>(null);
  const [deleteConfirming, setDeleteConfirming] = useState(false);
  const [historyDrawer, setHistoryDrawer] = useState<{
    sender: Sender | null;
    recipientId?: string;
    recipientName?: string;
  } | null>(null);
  const [quickSaleSender, setQuickSaleSender] = useState<Sender | null>(null);
  const [quickSaleCountry, setQuickSaleCountry] = useState<string | null>(null);
  const [quickSaleCountryPickerOpen, setQuickSaleCountryPickerOpen] = useState(false);
  const [cardStylePicker, setCardStylePicker] = useState<{
    kind: "sender" | "recipient";
    cardStyle: string;
    x: number;
    y: number;
    sender?: Sender;
    recipient?: Recipient;
  } | null>(null);
  const [quickSaleDraft, setQuickSaleDraft] = useState<QuickEmptyBoxDraft | null>(null);
  const [showQuickCheckout, setShowQuickCheckout] = useState(false);
  const [quickSaleAdvancing, setQuickSaleAdvancing] = useState(false);
  const [quickInvoiceNumber, setQuickInvoiceNumber] = useState("");
  const [quickTrackingToken, setQuickTrackingToken] = useState("");
  const [quickEmptyBoxDeliveredAt, setQuickEmptyBoxDeliveredAt] = useState<string | null>(null);
  const [activeCopyGroup, setActiveCopyGroup] = useState<string | null>(null);
  const [creatingOpenInvoice, setCreatingOpenInvoice] = useState(false);
  const [creatingQuickInvoice, setCreatingQuickInvoice] = useState(false);
  const [invoiceReservationToken, setInvoiceReservationToken] = useState("");
  const [invoiceReservation, setInvoiceReservation] = useState<{
    reservationToken: string;
    invoiceNumber: string;
    sequence: number;
    expiresAt: string;
  } | null>(null);
  const [invoiceReservationLoading, setInvoiceReservationLoading] = useState(false);
  const [invoiceSequence, setInvoiceSequence] = useState(
    initialData?.nextInvoiceSequence ?? 1,
  );
  const countries = useMemo(
    () => Object.keys(countryBoxes).sort((left, right) => left.localeCompare(right, "es")),
    [countryBoxes],
  );
  const needsRecipientCountrySetup = recipientCountrySetupRequired(countries);
  const [stockMessage, setStockMessage] = useState("");
  const [emptyBoxMode, setEmptyBoxMode] = useState("");
  const [emptyBoxScheduleMode, setEmptyBoxScheduleMode] = useState("");
  const [emptyBoxScheduleAt, setEmptyBoxScheduleAt] = useState("");
  const [fullBoxMode, setFullBoxMode] = useState("");
  const [fullBoxScheduleMode, setFullBoxScheduleMode] = useState("");
  const [fullBoxScheduleAt, setFullBoxScheduleAt] = useState("");
  const [emptyBoxRouteDecision, setEmptyBoxRouteDecision] = useState<SaleRouteDecision | null>(null);
  const [fullBoxRouteDecision, setFullBoxRouteDecision] = useState<SaleRouteDecision | null>(null);
  const [quickEmptyBoxRouteDecision, setQuickEmptyBoxRouteDecision] = useState<SaleRouteDecision | null>(null);
  const [routeCatalog, setRouteCatalog] = useState<LogisticsRouteCatalog | null>(null);
  const [routePlannerLeg, setRoutePlannerLeg] = useState<SaleDriverLeg | null>(null);
  const [routeAssignmentRetries, setRouteAssignmentRetries] = useState<RouteAssignmentRetry[]>([]);
  const [fullBoxPickupExpanded, setFullBoxPickupExpanded] = useState(false);
  const [logisticsNotes, setLogisticsNotes] = useState("");
  const clientRef = useRef<HTMLDivElement | null>(null);
  const recipientsRef = useRef<HTMLDivElement | null>(null);
  const boxesRef = useRef<HTMLDivElement | null>(null);
  const deliveryRef = useRef<HTMLDivElement | null>(null);
  const finishRef = useRef<HTMLDivElement | null>(null);
  const nextInvoiceNumber = invoiceReservation?.invoiceNumber || formatInvoiceReference({
    sequence: invoiceSequence,
    country: selectedRecipient?.country,
    city: selectedRecipient?.city,
    sellerCode,
    companyCode,
    boxCount: selectedBoxCount,
  });
  const finishPreviewBoxInvoices = useMemo(
    () => boxInvoicesForSale(nextInvoiceNumber, selectedBoxLines),
    [nextInvoiceNumber, selectedBoxLines],
  );
  const emptyBoxComplete = logisticsLegComplete(emptyBoxMode, emptyBoxScheduleMode, emptyBoxScheduleAt);
  const emptyBoxRouteReady =
    emptyBoxMode !== EMPTY_BOX_DRIVER_MODE ||
    emptyBoxRouteDecision?.kind === "selected" ||
    (emptyBoxRouteDecision?.kind === "pending" && Boolean(emptyBoxRouteDecision.routeDate));
  const fullBoxRouteReady =
    fullBoxMode !== FULL_BOX_DRIVER_MODE || Boolean(fullBoxRouteDecision);
  const logisticsPlanReady =
    saleLogisticsPlanReady(
      emptyBoxMode,
      emptyBoxScheduleMode,
      emptyBoxScheduleAt,
      fullBoxMode,
      fullBoxScheduleMode,
      fullBoxScheduleAt,
    ) &&
    emptyBoxRouteReady &&
    fullBoxRouteReady &&
    logisticsAdditionalChargeIsValid(emptyBoxAdditionalCharge) &&
    logisticsAdditionalChargeIsValid(fullBoxAdditionalCharge);
  const logisticsContinueHint = saleLogisticsContinueHint(
    emptyBoxMode,
    emptyBoxScheduleMode,
    emptyBoxScheduleAt,
    fullBoxMode,
    fullBoxScheduleMode,
    fullBoxScheduleAt,
    fullBoxPickupExpanded,
  );
  const logisticsBaseSummary = logisticsSummary(
    emptyBoxMode,
    emptyBoxScheduleMode,
    emptyBoxScheduleAt,
    fullBoxMode,
    fullBoxScheduleMode,
    fullBoxScheduleAt,
    logisticsNotes,
  );
  const currentLogisticsSummary = [
    logisticsBaseSummary,
    emptyBoxMode === EMPTY_BOX_DRIVER_MODE ? saleRouteDecisionSummary(emptyBoxRouteDecision) : "",
    fullBoxMode === FULL_BOX_DRIVER_MODE ? saleRouteDecisionSummary(fullBoxRouteDecision) : "",
  ]
    .filter(Boolean)
    .join(" · ");
  const currentLogisticsDetails = useMemo(
    () =>
      logisticsStepDetailRows({
        emptyBoxMode,
        emptyBoxScheduleMode,
        emptyBoxScheduleAt,
        emptyBoxRouteSummary:
          emptyBoxMode === EMPTY_BOX_DRIVER_MODE
            ? saleRouteDecisionSummary(emptyBoxRouteDecision)
            : "",
        fullBoxMode,
        fullBoxScheduleMode,
        fullBoxScheduleAt,
        fullBoxRouteSummary:
          fullBoxMode === FULL_BOX_DRIVER_MODE
            ? saleRouteDecisionSummary(fullBoxRouteDecision)
            : "",
      }),
    [
      emptyBoxMode,
      emptyBoxRouteDecision,
      emptyBoxScheduleAt,
      emptyBoxScheduleMode,
      fullBoxMode,
      fullBoxRouteDecision,
      fullBoxScheduleAt,
      fullBoxScheduleMode,
    ],
  );
  const currentDriverTaskCount = logisticsDriverTaskCount(emptyBoxMode, fullBoxMode);
  const selectedBoxPromotions = useMemo(
    () =>
      selectedRecipient && selectedCartBillingLines.length
        ? resolveCountryPromotionsForCatalogKeys(
          countryPromotions,
          selectedRecipient.country,
          selectedCartBillingLines.map((line) => line.catalogKey),
        )
        : [],
    [countryPromotions, selectedRecipient, selectedCartBillingLines],
  );
  const quickBoxPromotions = useMemo(
    () =>
      quickSaleDraft
        ? resolveCountryPromotionsForCatalogKeys(
          countryPromotions,
          quickSaleDraft.country,
          quickSaleDraft.boxLines.map((line) => saleBoxCatalogKey(line.box)),
        )
        : [],
    [countryPromotions, quickSaleDraft],
  );
  const invoiceBilling = useMemo(() => {
    if (!selectedBox || !selectedCartBillingLines.length) {
      return null;
    }

    const payNow = resolvePayNowFromDraft(payNowDraft, payNowDraftTouched);

    return computeInvoiceBilling({
      boxCount: selectedBoxCount,
      boxUnitPrice: selectedBox[1] || "$0",
      cartLines: selectedCartBillingLines,
      emptyBoxDriver: emptyBoxMode === EMPTY_BOX_DRIVER_MODE,
      fullBoxDriver: fullBoxMode === FULL_BOX_DRIVER_MODE,
      fees: logisticsFees,
      additionalCharges: {
        emptyBoxDelivery: emptyBoxAdditionalCharge,
        fullBoxPickup: fullBoxAdditionalCharge,
      },
      payNow,
      catalogKey: saleBoxCatalogKey(selectedBox),
      promotions: selectedBoxPromotions,
      selectedPromotionId,
    });
  }, [
    selectedBox,
    selectedBoxCount,
    selectedCartBillingLines,
    emptyBoxMode,
    fullBoxMode,
    logisticsFees,
    emptyBoxAdditionalCharge,
    fullBoxAdditionalCharge,
    payNowDraft,
    payNowDraftTouched,
    selectedBoxPromotions,
    selectedPromotionId,
  ]);
  const showSaleHeaderCart = mode === "sale" && Boolean(selectedRecipient);
  const saleHeaderCartAction = useMemo(
    () =>
      showSaleHeaderCart ? (
        <SaleHeaderCartTrigger
          itemCount={selectedBoxCount}
          total={invoiceBilling?.quotedTotal ?? null}
          open={boxCartOpen}
          onClick={() => setBoxCartOpen((open) => !open)}
        />
      ) : undefined,
    [
      boxCartOpen,
      invoiceBilling?.quotedTotal,
      selectedBoxCount,
      showSaleHeaderCart,
    ],
  );

  useEffect(() => {
    setShellConfig({ headerAction: saleHeaderCartAction });
  }, [saleHeaderCartAction, setShellConfig]);

  useEffect(() => {
    return () => setShellConfig({ headerAction: undefined });
  }, [setShellConfig]);

  const quickInvoiceBilling = useMemo(() => {
    if (!quickSaleDraft) {
      return null;
    }

    const payNow = resolvePayNowFromDraft(quickPayNowDraft, quickPayNowDraftTouched);

    return computeInvoiceBilling({
      boxCount: quickSaleDraft.boxCount,
      boxUnitPrice: quickSaleDraft.box[1] || "$0",
      cartLines: saleCartToBillingLines(quickSaleDraft.boxLines),
      emptyBoxDriver: quickSaleDraft.emptyBoxMode === EMPTY_BOX_DRIVER_MODE,
      fullBoxDriver: false,
      fees: logisticsFees,
      additionalCharges: {
        emptyBoxDelivery: quickEmptyBoxAdditionalCharge,
      },
      payNow,
      catalogKey: saleBoxCatalogKey(quickSaleDraft.box),
      promotions: quickBoxPromotions,
      selectedPromotionId: quickSelectedPromotionId,
    });
  }, [quickSaleDraft, logisticsFees, quickEmptyBoxAdditionalCharge, quickPayNowDraft, quickPayNowDraftTouched, quickBoxPromotions, quickSelectedPromotionId]);

  const invoiceBillingForPayment = useMemo(
    () => billingForPaymentChoice(invoiceBilling, invoicePaymentMethod),
    [invoiceBilling, invoicePaymentMethod],
  );
  const quickInvoiceBillingForPayment = useMemo(
    () => billingForPaymentChoice(quickInvoiceBilling, quickPaymentMethod),
    [quickInvoiceBilling, quickPaymentMethod],
  );

  useEffect(() => {
    queueMicrotask(() => {
      setPayNowDraft("");
      setPayNowDraftTouched(false);
    });
  }, [selectedBox, selectedBoxCount, selectedCartBillingLines, emptyBoxMode, fullBoxMode, logisticsFees]);

  useEffect(() => {
    if (!showSaleHeaderCart) {
      queueMicrotask(() => setBoxCartOpen(false));
    }
  }, [showSaleHeaderCart]);
  return {
    localIdPrefix, localIdCounterRef, setShellConfig, notify, router, sellerCode, companyCode,
    mode, setMode, activeStep, setActiveStep, viewLayout,
    defaultSenderCardStyle, defaultRecipientCardStyle, senderList, setSenderList, saleShortcuts,
    setSaleShortcuts, customersLoading, setCustomersLoading, customersError, setCustomersError,
    setCustomersSaving, historyRows, setHistoryRows, historyLoading, setHistoryLoading,
    historyError, setHistoryError, countryBoxes, setCountryBoxes, boxStockByKey, countryPromotions,
    logisticsFees, emptyBoxAdditionalCharge, setEmptyBoxAdditionalCharge, fullBoxAdditionalCharge, setFullBoxAdditionalCharge,
    quickEmptyBoxAdditionalCharge, setQuickEmptyBoxAdditionalCharge,
    customerLogisticsChargeHistory, setCustomerLogisticsChargeHistory,
    scheduleSuggestions, organizationBranding, payNowDraft,
    setPayNowDraft, payNowDraftTouched, setPayNowDraftTouched, quickPayNowDraft, setQuickPayNowDraft,
    quickPayNowDraftTouched, setQuickPayNowDraftTouched, invoicePaymentMethod, setInvoicePaymentMethod, invoicePaymentNote,
    setInvoicePaymentNote, quickPaymentMethod, setQuickPaymentMethod, quickPaymentNote, setQuickPaymentNote,
    createdInvoice, setCreatedInvoice, finishDocTab, setFinishDocTab, editingFromFinish,
    setEditingFromFinish, documentEditKind, setDocumentEditKind, quickCheckoutCompleted, setQuickCheckoutCompleted,
    invoiceConfirmOpen, setInvoiceConfirmOpen, recipientCountryGateOpen, setRecipientCountryGateOpen, selectedPromotionId,
    setSelectedPromotionId, boxCartOpen, setBoxCartOpen, quickSelectedPromotionId, setQuickSelectedPromotionId,
    selectedSender, setSelectedSender, selectedRecipient, setSelectedRecipient, selectedBoxLines,
    setSelectedBoxLines, selectedBox, selectedBoxCount, selectedCartSummary, cartPanelLines,
    senderQuery, setSenderQuery, recipientQuery, setRecipientQuery, newClientFirstName,
    setNewClientFirstName, newClientLastName, setNewClientLastName, newClientPhones, setNewClientPhones,
    newClientEmails, setNewClientEmails, newClientStreet, setNewClientStreet, newClientHouse,
    setNewClientHouse, newClientNeighborhood, setNewClientNeighborhood, newClientCity, setNewClientCity,
    newClientState, setNewClientState, newClientPostalCode, setNewClientPostalCode, newClientAddressReference,
    setNewClientAddressReference, newClientReferredByCustomerId, setNewClientReferredByCustomerId, clientAddressSearch, setClientAddressSearch,
    clientAddressSuggestions, setClientAddressSuggestions, clientAddressSearching, setClientAddressSearching, newRecipientFirstName,
    setNewRecipientFirstName, newRecipientLastName, setNewRecipientLastName, newRecipientPhone, setNewRecipientPhone,
    newRecipientEmails, setNewRecipientEmails, newRecipientCountry, setNewRecipientCountry, newRecipientStreet,
    setNewRecipientStreet, newRecipientHouse, setNewRecipientHouse, newRecipientNeighborhood, setNewRecipientNeighborhood,
    newRecipientCity, setNewRecipientCity, newRecipientState, setNewRecipientState, newRecipientPostalCode,
    setNewRecipientPostalCode, newRecipientAddressReference, setNewRecipientAddressReference, recipientAddressSearch, setRecipientAddressSearch,
    recipientAddressSuggestions, setRecipientAddressSuggestions, recipientAddressSearching, setRecipientAddressSearching, clientAddressValidation,
    setClientAddressValidation, editingCustomerId, setEditingCustomerId, editingRecipientId, setEditingRecipientId,
    recipientAddressValidation, setRecipientAddressValidation, clientAddressQuery, recipientAddressQuery, contextMenu,
    setContextMenu, deleteConfirm, setDeleteConfirm, deleteConfirming, setDeleteConfirming,
    historyDrawer, setHistoryDrawer, quickSaleSender, setQuickSaleSender, quickSaleCountry,
    setQuickSaleCountry, quickSaleCountryPickerOpen, setQuickSaleCountryPickerOpen, cardStylePicker, setCardStylePicker,
    quickSaleDraft, setQuickSaleDraft, showQuickCheckout, setShowQuickCheckout, quickSaleAdvancing,
    setQuickSaleAdvancing, quickInvoiceNumber,
    setQuickInvoiceNumber, quickTrackingToken, setQuickTrackingToken,
    quickEmptyBoxDeliveredAt, setQuickEmptyBoxDeliveredAt, activeCopyGroup, setActiveCopyGroup,
    creatingOpenInvoice, setCreatingOpenInvoice, creatingQuickInvoice, setCreatingQuickInvoice, setInvoiceSequence,
    countries, needsRecipientCountrySetup, stockMessage, setStockMessage, emptyBoxMode,
    setEmptyBoxMode, emptyBoxScheduleMode, setEmptyBoxScheduleMode, emptyBoxScheduleAt, setEmptyBoxScheduleAt,
    fullBoxMode, setFullBoxMode, fullBoxScheduleMode, setFullBoxScheduleMode, fullBoxScheduleAt,
    setFullBoxScheduleAt, emptyBoxRouteDecision, setEmptyBoxRouteDecision, fullBoxRouteDecision, setFullBoxRouteDecision,
    quickEmptyBoxRouteDecision, setQuickEmptyBoxRouteDecision, routeCatalog, setRouteCatalog, routePlannerLeg,
    setRoutePlannerLeg, routeAssignmentRetries, setRouteAssignmentRetries, fullBoxPickupExpanded, setFullBoxPickupExpanded,
    logisticsNotes, setLogisticsNotes, clientRef, recipientsRef, boxesRef,
    deliveryRef, finishRef, nextInvoiceNumber, finishPreviewBoxInvoices, emptyBoxComplete,
    logisticsPlanReady, logisticsContinueHint, currentLogisticsSummary, currentLogisticsDetails, currentDriverTaskCount,
    invoiceBilling, showSaleHeaderCart, quickInvoiceBilling, invoiceBillingForPayment, quickInvoiceBillingForPayment,
    invoiceReservationToken, setInvoiceReservationToken, invoiceReservation,
    setInvoiceReservation, invoiceReservationLoading, setInvoiceReservationLoading,
  };
}

export type VentaCore = ReturnType<typeof useVentaCore>;
