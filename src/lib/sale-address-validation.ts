export type AddressValidation = {
  status: "idle" | "checking" | "valid" | "invalid";
  message: string;
  formattedAddress?: string;
  placeId?: string;
  needsUnit?: boolean;
  lat?: number | null;
  lng?: number | null;
};
