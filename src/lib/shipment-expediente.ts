import type {
  SaleRecipient as Recipient,
  SaleSender as Sender,
} from "@/lib/customers/mappers";
import type { LogisticsTaskType } from "@/lib/logistics-routing";
import type { InvoiceBillingSnapshot } from "@/lib/invoice-billing";
import type { ExpedienteSectionPermissions } from "@/lib/expediente-permissions";
import type { OrganizationBranding } from "@/lib/organizations/branding";
import type { PhysicalPackageStatus } from "@/lib/physical-packages";
import type {
  InvoiceStatus,
  ShipmentLogisticsTaskRow,
  ShipmentSaleKind,
  ShipmentStatus,
} from "@/lib/shipment-types";
import type { ActivityHistoryRow } from "@/lib/activity-history-types";

export type ExpedientePartySource =
  | "shipment_name"
  | "customer_live"
  | "recipient_snapshot"
  | "recipient_live"
  | "unavailable";

export type ExpedientePartyField = {
  label: string;
  value: string;
};

export type ExpedienteParty = {
  name: string;
  fields: ExpedientePartyField[];
  mapQuery: string;
  source: ExpedientePartySource;
  sourceNote: string;
};

export type ExpedientePackageRow = {
  id: string;
  code: string;
  invoiceCode: string;
  position: number;
  boxCount: number;
  country: string;
  status: PhysicalPackageStatus;
  boxLabel: string;
  collectionWeightKg: number | null;
  intakeWeightKg: number | null;
  providerTrackingNumber: string;
  invoiceIncidentReason: string;
  hasIncident: boolean;
};

export type ExpedienteLogisticsTaskView = {
  id: string;
  taskType: "deliver_empty_box" | "pickup_full_box";
  taskLabel: string;
  status: string;
  scheduleLabel: string;
  routeLabel: string;
  driverLabel: string;
  notes: string;
  completedAt: string | null;
};

export type ExpedienteFinancialPayment = {
  id: string;
  amount: number;
  method: string;
  kind: string;
  note: string;
  createdAt: string;
};

export type ExpedienteFinancialView = {
  quotedTotal: string;
  paid: number;
  balanceDue: string;
  depositRequired: string | null;
  depositStatus: "paid" | "pending" | null;
  depositRemaining: string | null;
  invoiceStatus: InvoiceStatus;
  invoiceStatusLabel: string;
  logisticsCharge: string | null;
  logisticsChargeAdjusted: boolean;
  logisticsChargeReason: string;
  promotionName: string | null;
  promotionDiscount: string | null;
  payments: ExpedienteFinancialPayment[];
};

export type ExpedienteDocumentView = {
  billing: InvoiceBillingSnapshot | null;
  boxLines: Array<{ label: string; quantity: number }>;
  serviceOperation: LogisticsTaskType;
  sender: Sender;
  recipient: Recipient | null;
  packages: Array<{
    packageId: string;
    invoiceCode: string;
    position: number;
    boxCount: number;
    boxLabel: string;
    box: string[];
  }>;
};

export type ShipmentExpedientePayload = {
  shipmentId: string;
  code: string;
  status: ShipmentStatus;
  saleKind: ShipmentSaleKind;
  country: string;
  carrier: string;
  createdAt: string | null;
  organizationName: string;
  organizationBranding: OrganizationBranding;
  salesOwnerName: string;
  boxCount: number;
  permissions: ExpedienteSectionPermissions;
  sender: ExpedienteParty;
  recipient: ExpedienteParty | null;
  documents: ExpedienteDocumentView;
  financial: ExpedienteFinancialView | null;
  logistics: {
    emptyBoxMode: string;
    fullBoxMode: string;
    tasks: ExpedienteLogisticsTaskView[];
  } | null;
  packages: ExpedientePackageRow[] | null;
  audit: ActivityHistoryRow[] | null;
  sectionErrors: Partial<Record<"audit" | "packages" | "routes", string>>;
};

function clean(value: unknown) {
  return String(value || "").trim();
}

function splitCustomerName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) {
    return { firstName: "", lastName: "" };
  }

  if (parts.length === 1) {
    return { firstName: parts[0], lastName: "" };
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

function readPhones(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((entry) => clean(entry)).filter(Boolean);
  }

  const single = clean(value);
  return single ? [single] : [];
}

function readEmails(value: unknown, fallback?: string) {
  if (Array.isArray(value)) {
    const emails = value.map((entry) => clean(entry)).filter(Boolean);
    if (emails.length) {
      return emails;
    }
  }

  const single = clean(fallback);
  return single ? [single] : [];
}

function addressFields(input: {
  street?: string;
  houseNumber?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  formattedAddress?: string;
  addressReference?: string;
}): ExpedientePartyField[] {
  const fields: ExpedientePartyField[] = [];
  const streetLine = [input.street, input.houseNumber].filter(Boolean).join(" ").trim();

  if (streetLine) {
    fields.push({ label: "Dirección", value: streetLine });
  } else if (input.formattedAddress) {
    fields.push({ label: "Dirección", value: input.formattedAddress });
  }

  if (input.neighborhood) {
    fields.push({ label: "Colonia", value: input.neighborhood });
  }

  const cityLine = [input.city, input.state, input.postalCode].filter(Boolean).join(", ");
  if (cityLine) {
    fields.push({ label: "Ciudad", value: cityLine });
  }

  if (input.country) {
    fields.push({ label: "País", value: input.country });
  }

  if (input.addressReference) {
    fields.push({ label: "Referencias", value: input.addressReference });
  }

  return fields;
}

function partyMapQuery(fields: ExpedientePartyField[]) {
  return fields
    .filter((field) => ["Dirección", "Colonia", "Ciudad", "País"].includes(field.label))
    .map((field) => field.value)
    .filter(Boolean)
    .join(", ");
}

export function buildExpedienteSenderParty(input: {
  customerName: string;
  customer?: {
    first_name?: string | null;
    last_name?: string | null;
    phones?: string[] | null;
    email?: string | null;
    emails?: string[] | null;
    street?: string | null;
    house_number?: string | null;
    neighborhood?: string | null;
    city?: string | null;
    state?: string | null;
    postal_code?: string | null;
    country?: string | null;
    formatted_address?: string | null;
    address_reference?: string | null;
  } | null;
}): ExpedienteParty {
  const name = clean(input.customerName);
  const customer = input.customer;
  const fields: ExpedientePartyField[] = [];

  if (customer) {
    const phones = readPhones(customer.phones);
    if (phones.length) {
      fields.push({ label: "Teléfono", value: phones.join(" · ") });
    }

    const emails = readEmails(customer.emails, customer.email || undefined);
    if (emails.length) {
      fields.push({ label: "Correo", value: emails.join(" · ") });
    }

    fields.push(
      ...addressFields({
        street: clean(customer.street),
        houseNumber: clean(customer.house_number),
        neighborhood: clean(customer.neighborhood),
        city: clean(customer.city),
        state: clean(customer.state),
        postalCode: clean(customer.postal_code),
        country: clean(customer.country),
        formattedAddress: clean(customer.formatted_address),
        addressReference: clean(customer.address_reference),
      }),
    );
  }

  return {
    name,
    fields,
    mapQuery: partyMapQuery(fields),
    source: customer ? "customer_live" : "shipment_name",
    sourceNote: customer
      ? "Nombre registrado en la venta. Teléfono, correo y dirección provienen del contacto actual."
      : "Solo el nombre quedó registrado en la venta; no hay instantánea histórica del remitente.",
  };
}

export function buildExpedienteRecipientParty(input: {
  recipientSnapshot?: Record<string, unknown> | null;
  recipient?: {
    first_name?: string | null;
    last_name?: string | null;
    phone?: string | null;
    email?: string | null;
    emails?: string[] | null;
    street?: string | null;
    house_number?: string | null;
    neighborhood?: string | null;
    city?: string | null;
    state?: string | null;
    postal_code?: string | null;
    country?: string | null;
    formatted_address?: string | null;
    address_reference?: string | null;
  } | null;
}): ExpedienteParty | null {
  const snapshot =
    input.recipientSnapshot && typeof input.recipientSnapshot === "object"
      ? input.recipientSnapshot
      : null;

  if (snapshot) {
    const firstName = clean(snapshot.firstName);
    const lastName = clean(snapshot.lastName);
    const name = [firstName, lastName].filter(Boolean).join(" ").trim();
    const fields: ExpedientePartyField[] = [];
    const phone = clean(snapshot.phone);

    if (phone) {
      fields.push({ label: "Teléfono", value: phone });
    }

    const emails = readEmails(snapshot.emails, clean(snapshot.email));
    if (emails.length) {
      fields.push({ label: "Correo", value: emails.join(" · ") });
    }

    fields.push(
      ...addressFields({
        street: clean(snapshot.street),
        houseNumber: clean(snapshot.houseNumber),
        neighborhood: clean(snapshot.neighborhood),
        city: clean(snapshot.city),
        state: clean(snapshot.state),
        postalCode: clean(snapshot.postalCode),
        country: clean(snapshot.country),
        formattedAddress: clean(snapshot.formattedAddress),
        addressReference: clean(snapshot.addressReference),
      }),
    );

    return {
      name,
      fields,
      mapQuery: partyMapQuery(fields),
      source: "recipient_snapshot",
      sourceNote: "Datos capturados al crear la venta.",
    };
  }

  const recipient = input.recipient;
  if (!recipient) {
    return null;
  }

  const name = [clean(recipient.first_name), clean(recipient.last_name)].filter(Boolean).join(" ");
  const fields: ExpedientePartyField[] = [];
  const phone = clean(recipient.phone);

  if (phone) {
    fields.push({ label: "Teléfono", value: phone });
  }

  const emails = readEmails(recipient.emails, recipient.email || undefined);
  if (emails.length) {
    fields.push({ label: "Correo", value: emails.join(" · ") });
  }

  fields.push(
    ...addressFields({
      street: clean(recipient.street),
      houseNumber: clean(recipient.house_number),
      neighborhood: clean(recipient.neighborhood),
      city: clean(recipient.city),
      state: clean(recipient.state),
      postalCode: clean(recipient.postal_code),
      country: clean(recipient.country),
      formattedAddress: clean(recipient.formatted_address),
      addressReference: clean(recipient.address_reference),
    }),
  );

  return {
    name,
    fields,
    mapQuery: partyMapQuery(fields),
    source: "recipient_live",
    sourceNote:
      "No hay instantánea histórica del destinatario; se muestra el contacto actual vinculado al envío.",
  };
}

export function snapshotToSaleRecipient(
  snapshot: Record<string, unknown>,
  fallbackCountry = "",
): Recipient {
  return {
    id: "",
    firstName: clean(snapshot.firstName),
    lastName: clean(snapshot.lastName),
    country: clean(snapshot.country) || fallbackCountry,
    phone: clean(snapshot.phone),
    email: clean(snapshot.email),
    emails: readEmails(snapshot.emails, clean(snapshot.email)),
    street: clean(snapshot.street),
    houseNumber: clean(snapshot.houseNumber),
    neighborhood: clean(snapshot.neighborhood),
    city: clean(snapshot.city),
    state: clean(snapshot.state),
    postalCode: clean(snapshot.postalCode),
    addressReference: clean(snapshot.addressReference),
    cardStyle: "",
    placeId: clean(snapshot.placeId),
    formattedAddress: clean(snapshot.formattedAddress),
    addressVerified: Boolean(snapshot.addressVerified),
    lat: typeof snapshot.lat === "number" ? snapshot.lat : null,
    lng: typeof snapshot.lng === "number" ? snapshot.lng : null,
  };
}

export function recipientRowToSaleRecipient(
  row: NonNullable<Parameters<typeof buildExpedienteRecipientParty>[0]["recipient"]>,
): Recipient {
  return {
    id: "",
    firstName: clean(row.first_name),
    lastName: clean(row.last_name),
    country: clean(row.country),
    phone: clean(row.phone),
    email: clean(row.email),
    emails: readEmails(row.emails, row.email || undefined),
    street: clean(row.street),
    houseNumber: clean(row.house_number),
    neighborhood: clean(row.neighborhood),
    city: clean(row.city),
    state: clean(row.state),
    postalCode: clean(row.postal_code),
    addressReference: clean(row.address_reference),
    cardStyle: "",
    placeId: "",
    formattedAddress: clean(row.formatted_address),
    addressVerified: false,
    lat: null,
    lng: null,
  };
}

export function buildExpedienteSaleSender(input: {
  customerName: string;
  customer?: Parameters<typeof buildExpedienteSenderParty>[0]["customer"];
}): Sender {
  const customer = input.customer;
  const fallback = splitCustomerName(input.customerName);

  return {
    id: "",
    referredByCustomerId: "",
    firstName: clean(customer?.first_name) || fallback.firstName,
    lastName: clean(customer?.last_name) || fallback.lastName,
    phones: customer ? readPhones(customer.phones) : [],
    email: clean(customer?.email),
    emails: customer ? readEmails(customer.emails, customer.email || undefined) : [],
    street: clean(customer?.street),
    houseNumber: clean(customer?.house_number),
    neighborhood: clean(customer?.neighborhood),
    city: clean(customer?.city),
    state: clean(customer?.state || ""),
    postalCode: clean(customer?.postal_code),
    addressReference: clean(customer?.address_reference),
    cardStyle: "",
    placeId: "",
    formattedAddress: clean(customer?.formatted_address),
    addressVerified: false,
    lat: null,
    lng: null,
    recipients: [],
  };
}

export function resolveExpedienteServiceOperation(
  logisticsPlan: Record<string, unknown>,
): LogisticsTaskType {
  const emptyBox =
    logisticsPlan.emptyBox && typeof logisticsPlan.emptyBox === "object"
      ? (logisticsPlan.emptyBox as Record<string, unknown>)
      : null;
  const fullBox =
    logisticsPlan.fullBox && typeof logisticsPlan.fullBox === "object"
      ? (logisticsPlan.fullBox as Record<string, unknown>)
      : null;

  if (fullBox?.driverTaskNeeded) {
    return "pickup_full_box";
  }

  if (emptyBox?.driverTaskNeeded) {
    return "deliver_empty_box";
  }

  return "deliver_empty_box";
}

export function logisticsLegModeLabel(
  leg: Record<string, unknown> | null,
  kind: "empty_box" | "full_box",
) {
  if (!leg) {
    return kind === "empty_box" ? "Sin modalidad registrada" : "Sin modalidad registrada";
  }

  if (leg.officeHandoff === true || leg.mode === "office") {
    return "Mostrador";
  }

  if (leg.driverTaskNeeded === true || leg.mode === "driver") {
    return "Chofer";
  }

  return clean(leg.mode) || "Sin modalidad registrada";
}

export function mapExpedienteLogisticsTask(
  task: ShipmentLogisticsTaskRow,
  routeLabel: string,
  driverLabel: string,
  scheduleLabel: string,
): ExpedienteLogisticsTaskView {
  return {
    id: task.id,
    taskType: task.taskType,
    taskLabel:
      task.taskType === "deliver_empty_box"
        ? "Entrega de caja vacía"
        : "Recolección de caja llena",
    status: task.status,
    scheduleLabel,
    routeLabel,
    driverLabel,
    notes: task.notes,
    completedAt: task.completedAt,
  };
}
