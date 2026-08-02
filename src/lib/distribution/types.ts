import type { DistributionLedgerEntry } from "@/lib/distribution/ledger";

type DistributionOffer = {
  id: string;
  countryName: string;
  catalogKey: string;
  productName: string;
  wholesalePrice: number;
  publicPrice: number | null;
  isActive: boolean;
};

export type DistributionLedgerRow = DistributionLedgerEntry & {
  id: string;
  shipmentCode: string | null;
  note: string;
};

type DistributionShipment = {
  id: string;
  code: string;
  status: string;
  publicPrice: number;
  createdAt: string;
};

export type DistributionPartner = {
  id: string;
  name: string;
  distributorOrganizationId: string;
  acquisitionOwnerId: string | null;
  acquisitionOwnerName: string | null;
  ownerId: string | null;
  ownerName: string | null;
  ownerEmail: string | null;
  createdAt: string;
  creditLimit: number;
  balance: number;
  availableCredit: number;
  isActive: boolean;
  offers: DistributionOffer[];
  ledger: DistributionLedgerRow[];
  shipments: DistributionShipment[];
};

export type DistributionCatalogItem = {
  countryName: string;
  catalogKey: string;
  productName: string;
};

export type DistributionCaptor = {
  id: string;
  name: string;
};

export type DistributionWorkspace = {
  mode: "matrix" | "distributor";
  partners: DistributionPartner[];
  catalog: DistributionCatalogItem[];
  captors: DistributionCaptor[];
};
