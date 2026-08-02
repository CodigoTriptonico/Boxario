import type { SaleRecipient, SaleSender } from "@/lib/customers/mappers";

export type PersonName = {
  firstName: string;
  lastName: string;
};

export type Recipient = SaleRecipient;
export type Sender = SaleSender;

export type ContextMenuState = {
  x: number;
  y: number;
  title: string;
  firstName: string;
  lastName: string;
  type: "remitente" | "destinatario" | "caja";
  targetKey: string;
  customerId?: string;
  recipientId?: string;
  phones: string[];
  address: {
    street?: string;
    houseNumber?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
    addressReference?: string;
  };
};

export type SaleLogisticsDetailRow = {
  label: string;
  value: string;
};

export type SaleStep = "client" | "recipient" | "box" | "delivery" | "finish";
export type AddressFormKind = "client" | "recipient";

export type AddressSuggestion = {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
  postalCode?: string;
};

export type SalePersonAddress = {
  street?: string;
  houseNumber?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  postalCode?: string;
};
