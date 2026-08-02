import type { ReactNode } from "react";
import type { SalesOwnerRow, ShipmentRow, ShipmentStatus } from "@/lib/shipment-types";

export type RouteProgramTarget = {
  row: ShipmentRow;
  kind: "empty_box" | "full_box";
};
import type { countryNamesPickerOptions } from "@/components/country-picker-options";
import type { collectShipmentInvoiceCopy } from "@/lib/shipment-invoice-copy";
import type { ShipmentAuditContext } from "@/lib/shipment-audit";
import type { ShipmentLogisticsEditorState } from "@/lib/shipment-logistics-edit";
import type { EnviosClientMode, EnviosReadinessFilter } from "@/lib/shipment-display";

export type EnviosFiltersToolbarProps = {
  workspaceTabs?: ReactNode;
  mode: EnviosClientMode;
  readinessFilter: EnviosReadinessFilter;
  onReadinessFilterChange: (value: EnviosReadinessFilter) => void;
  totalCount: number;
  listosCount: number;
  pendientesCount: number;
  query: string;
  onQueryChange: (value: string) => void;
  canManageShipmentOwners: boolean;
  salesOwnerFilter: string;
  onSalesOwnerFilterChange: (value: string) => void;
  salesOwners: SalesOwnerRow[];
  country: string;
  onCountryChange: (value: string) => void;
  countryFilterOptions: ReturnType<typeof countryNamesPickerOptions>;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  statusFilterOptions: { value: string; label: string }[];
  canManageSales: boolean;
  canManageSalesSettings: boolean;
  isConductor: boolean;
};

export type EnviosBulkSelectionBarProps = {
  selectedCount: number;
  visibleCount: number;
  markableCount: number;
  unmarkableCount: number;
  busy: boolean;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onMarkReady: () => void;
  onUnmarkReady: () => void;
};

export type EnviosShipmentListsSharedProps = {
  displayShipments: ShipmentRow[];
  cardClass: string;
  canManageSales: boolean;
  canViewShipmentJournal: boolean;
  canManageShipmentOwners: boolean;
  canEditProgress: boolean;
  canUpdateShipmentStatus: boolean;
  isHistoryMode: boolean;
  salesOwners: SalesOwnerRow[];
  routeMemberLabelById: (memberId: string) => string | undefined;
  routeByTaskId: (taskId: string) => {
    routeName: string;
    assignedTo: string | null;
    routeTemplateId: string | null;
  } | undefined;
  busyId: string | null;
  progressBusyId: string | null;
  priorityBusyId: string | null;
  finalizeCopy: ReturnType<typeof collectShipmentInvoiceCopy>;
  onShipmentContextMenu: (event: React.MouseEvent, row: ShipmentRow) => void;
  onContactLogOpen: (shipmentId: string) => void;
  onTogglePriority: (row: ShipmentRow) => Promise<void>;
  onFinalizeOpen: (row: ShipmentRow) => void;
  onLogisticsPatch: (
    row: ShipmentRow,
    patch: Partial<ShipmentLogisticsEditorState>,
    audit: ShipmentAuditContext,
  ) => Promise<void>;
  onStatusChange: (
    row: ShipmentRow,
    status: ShipmentStatus,
    audit: ShipmentAuditContext,
  ) => Promise<void>;
  onFullBoxReceivedAtOffice: (row: ShipmentRow, audit: ShipmentAuditContext) => Promise<void>;
  onProgramRoute?: (row: ShipmentRow, kind: "empty_box" | "full_box") => void;
  pendingRouteTaskIds?: Set<string>;
  onLockedLeg: (message: string) => void;
  selectionEnabled: boolean;
  isShipmentSelected: (shipmentId: string) => boolean;
  onShipmentRowActivate: (
    event: React.MouseEvent,
    row: ShipmentRow,
    index: number,
  ) => void;
};

export type EnviosShipmentRowsListProps = EnviosShipmentListsSharedProps & {
  expandedShipmentIds: Set<string>;
};

export type EnviosShipmentCardsGridProps = Omit<EnviosShipmentListsSharedProps, "cardClass"> & {
  ownerBusyId: string | null;
  onUpdateSalesOwner: (row: ShipmentRow, salesOwnerId: string) => Promise<void>;
};
