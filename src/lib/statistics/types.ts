export const STATISTICS_TIME_ZONE = "America/Los_Angeles" as const;
export const STATISTICS_CURRENCY = "USD" as const;

export type StatisticsTrendGranularity = "hour" | "day" | "week" | "month";

export type StatisticsTrendMetricKey =
  | "sales"
  | "collections"
  | "pending"
  | "shipments"
  | "boxes"
  | "customers";

export type StatisticsFilters = {
  agencyId?: string | null;
  country?: string | null;
  sellerId?: string | null;
  routeId?: string | null;
  driverId?: string | null;
  shipmentStatus?: string | null;
  operationType?: string | null;
  productKey?: string | null;
};

/** Dates are inclusive business-date keys (YYYY-MM-DD), interpreted in STATISTICS_TIME_ZONE. */
export type StatisticsDashboardInput = {
  from: string;
  to: string;
  compareFrom: string;
  compareTo: string;
  filters?: StatisticsFilters | null;
};

export type StatisticsFilterOption = {
  value: string;
  label: string;
  meta?: string | null;
};

export type StatisticsCoverageItem = {
  key: string;
  label: string;
  available: number;
  total: number;
  percent: number;
  status: "complete" | "partial" | "unavailable";
};

export type StatisticsLimitation = {
  key: string;
  title: string;
  detail: string;
  impact: "info" | "warning";
};

export type StatisticsKpiValue = {
  value: number;
  previous: number;
  deltaPct: number | null;
};

export type StatisticsTrendValues = {
  sales: number;
  collections: number;
  pending: number;
  shipments: number;
  boxes: number;
  customers: number;
};

export type StatisticsTrendBucket = {
  key: string;
  label: string;
  current: StatisticsTrendValues;
  previous: StatisticsTrendValues;
};

export type StatisticsCountRow = {
  key: string;
  label: string;
  count: number;
  amount?: number | null;
};

export type StatisticsSellerRankingRow = {
  id: string | null;
  label: string;
  shipments: number;
  sales: number;
  collections: number;
  pending: number;
  customers: number;
  boxes: number;
};

export type StatisticsDimensionRankingRow = {
  key: string;
  label: string;
  shipments: number;
  sales: number;
  collections: number;
  pending: number;
  boxes: number;
};

export type StatisticsProductRankingRow = {
  key: string;
  label: string;
  quantity: number;
  sales: number;
  shipments: number;
};

export type StatisticsRouteRankingRow = {
  id: string;
  label: string;
  date: string;
  status: string;
  stops: number;
  completedStops: number;
  driverId: string | null;
  driverName: string | null;
};

export type StatisticsDriverRankingRow = {
  id: string;
  label: string;
  routes: number;
  stops: number;
  completedStops: number;
  tasks: number;
  completedTasks: number;
};

export type StatisticsLogisticsDailyRow = {
  date: string;
  deliveryOperations: number;
  pickupOperations: number;
  deliveryBoxOperations: number;
  pickupBoxOperations: number;
  deliveredBoxes: number;
  collectedBoxes: number;
};

export type StatisticsLogisticsRankingRow = {
  key: string;
  label: string;
  deliveries: number;
  pickups: number;
  deliveredBoxes: number;
  collectedBoxes: number;
  routes: number;
};

export type StatisticsLogisticsRouteRankingRow = StatisticsLogisticsRankingRow & {
  id: string;
  date: string;
};

export type StatisticsAttentionItem = {
  id: string;
  kind:
    | "overdue_task"
    | "operational_exception"
    | "weight_review"
    | "custody_handoff"
    | "financial_hold"
    | "low_stock";
  severity: "critical" | "warning" | "info";
  title: string;
  detail: string;
  occurredAt: string | null;
  href: string | null;
};

export type StatisticsShipmentTableRow = {
  id: string;
  code: string;
  createdAt: string;
  customerId: string | null;
  customerName: string;
  country: string;
  status: string;
  invoiceStatus: string;
  sellerId: string | null;
  sellerName: string;
  agencyName: string | null;
  sales: number;
  paid: number;
  pending: number;
  boxes: number;
};

export type StatisticsPaymentTableRow = {
  id: string;
  shipmentId: string;
  shipmentCode: string;
  createdAt: string;
  amount: number;
  method: string;
  customerName: string;
  sellerName: string;
};

export type StatisticsTaskTableRow = {
  id: string;
  shipmentId: string;
  shipmentCode: string;
  taskType: string;
  status: string;
  scheduledAt: string;
  routeId: string | null;
  routeName: string | null;
  driverId: string | null;
  driverName: string | null;
  customerName: string;
  country: string;
};

export type StatisticsAgencyRow = {
  id: string;
  label: string;
  code: string;
  status: string;
  sales: number;
  shipments: number;
  agencyReceivable: number;
  unappliedPayments: number;
};

export type StatisticsDashboard = {
  meta: {
    generatedAt: string;
    timeZone: typeof STATISTICS_TIME_ZONE;
    currency: typeof STATISTICS_CURRENCY;
    period: {
      from: string;
      to: string;
      compareFrom: string;
      compareTo: string;
      granularity: StatisticsTrendGranularity;
    };
    filters: StatisticsFilters;
    coverage: StatisticsCoverageItem[];
    limitations: StatisticsLimitation[];
  };
  capabilities: {
    finance: boolean;
    logistics: boolean;
    inventory: boolean;
    agencies: boolean;
    agencyFinance: boolean;
  };
  filterOptions: {
    agencies: StatisticsFilterOption[];
    countries: StatisticsFilterOption[];
    sellers: StatisticsFilterOption[];
    routes: StatisticsFilterOption[];
    drivers: StatisticsFilterOption[];
    shipmentStatuses: StatisticsFilterOption[];
    operationTypes: StatisticsFilterOption[];
    products: StatisticsFilterOption[];
  };
  kpis: {
    sales: StatisticsKpiValue;
    collections: StatisticsKpiValue;
    pending: StatisticsKpiValue;
    shipments: StatisticsKpiValue;
    boxes: StatisticsKpiValue;
    customers: StatisticsKpiValue;
    averageTicket: StatisticsKpiValue;
  };
  trend: {
    granularity: StatisticsTrendGranularity;
    buckets: StatisticsTrendBucket[];
  };
  finance: {
    billed: number;
    collected: number;
    pending: number;
    averageTicket: number;
    openInvoices: number;
    paidInvoices: number;
    byStatus: StatisticsCountRow[];
    paymentMethods: StatisticsCountRow[];
  };
  logistics: {
    tasks: StatisticsCountRow[];
    routes: StatisticsCountRow[];
    packages: StatisticsCountRow[];
    exceptions: number;
    pendingCustody: number;
  };
  logisticsAnalytics: {
    summary: {
      completedOperations: number;
      deliveryOperations: number;
      pickupOperations: number;
      deliveryBoxOperations: number;
      pickupBoxOperations: number;
      deliveredBoxes: number;
      collectedBoxes: number;
    };
    coverage: {
      boxes: StatisticsCoverageItem;
      postalCodes: StatisticsCoverageItem;
    };
    daily: StatisticsLogisticsDailyRow[];
    rankings: {
      postalCodes: StatisticsLogisticsRankingRow[];
      routes: StatisticsLogisticsRouteRankingRow[];
      vehicles: StatisticsLogisticsRankingRow[];
      drivers: StatisticsLogisticsRankingRow[];
    };
  };
  inventory: {
    stock: number;
    reserved: number;
    assigned: number;
    unavailable: number;
    available: number;
    estimatedValue: number | null;
    valuationCoveragePct: number;
    lowStockItems: StatisticsCountRow[];
  };
  agencies: {
    agencyReceivable: number;
    customerReceivable: number;
    unappliedAgencyPayments: number;
    rows: StatisticsAgencyRow[];
  };
  rankings: {
    sellers: StatisticsSellerRankingRow[];
    countries: StatisticsDimensionRankingRow[];
    products: StatisticsProductRankingRow[];
    routes: StatisticsRouteRankingRow[];
    drivers: StatisticsDriverRankingRow[];
  };
  attention: StatisticsAttentionItem[];
  tables: {
    shipments: StatisticsShipmentTableRow[];
    payments: StatisticsPaymentTableRow[];
    tasks: StatisticsTaskTableRow[];
  };
};
