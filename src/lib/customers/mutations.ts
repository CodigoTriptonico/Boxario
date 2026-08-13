import {
  normalizePersonName,
  personNameValidationMessage,
} from "@/lib/person-name";

type GeoAddressInput = {
  placeId?: string;
  formattedAddress?: string;
  addressVerified?: boolean;
  lat?: number | null;
  lng?: number | null;
  exactEntranceLat?: number | null;
  exactEntranceLng?: number | null;
  exactEntranceNote?: string;
  exactEntrancePanoId?: string;
  exactEntranceHeading?: number | null;
  exactEntrancePitch?: number | null;
};

type PersonContactInput = {
  firstName: string;
  lastName: string;
  email?: string;
  emails?: string[];
};

export type CustomerMutationInput = PersonContactInput &
  GeoAddressInput & {
    phones: string[];
    street: string;
    houseNumber: string;
    neighborhood: string;
    city: string;
    state: string;
    postalCode: string;
    country?: string;
    addressReference?: string;
  };

export type CreateCustomerInput = CustomerMutationInput & {
  referredByCustomerId?: string;
};

export type UpdateCustomerInput = CustomerMutationInput & {
  customerId: string;
};

export type RecipientMutationInput = PersonContactInput &
  GeoAddressInput & {
    phone: string;
    country: string;
    street: string;
    houseNumber: string;
    neighborhood: string;
    city: string;
    state?: string;
    postalCode: string;
    addressReference?: string;
  };

export type CreateRecipientInput = RecipientMutationInput & {
  customerId: string;
};

export type UpdateRecipientInput = RecipientMutationInput & {
  recipientId: string;
};

type NormalizedPerson = {
  firstName: string;
  lastName: string;
  emails: string[];
};

export type NormalizedCustomerMutation = NormalizedPerson & {
  phones: string[];
  patch: ReturnType<typeof customerMutationPatch>;
};

export type NormalizedRecipientMutation = NormalizedPerson & {
  patch: ReturnType<typeof recipientMutationPatch>;
};

export type PersonNormalizationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

export const CUSTOMER_MUTATION_SELECT =
  "id, referred_by_customer_id, first_name, last_name, phones, email, emails, street, house_number, neighborhood, city, state, postal_code, country, address_reference, card_style, place_id, formatted_address, address_verified, lat, lng, exact_entrance_lat, exact_entrance_lng, exact_entrance_confirmed_at, exact_entrance_note, exact_entrance_pano_id, exact_entrance_heading, exact_entrance_pitch, created_at";

export const RECIPIENT_MUTATION_SELECT =
  "id, first_name, last_name, phone, email, emails, country, street, house_number, neighborhood, city, state, postal_code, address_reference, card_style, place_id, formatted_address, address_verified, lat, lng, exact_entrance_lat, exact_entrance_lng, exact_entrance_confirmed_at, exact_entrance_note, exact_entrance_pano_id, exact_entrance_heading, exact_entrance_pitch, created_at";

function geoAddressPatch(input: GeoAddressInput) {
  const hasGeo =
    typeof input.lat === "number" &&
    Number.isFinite(input.lat) &&
    typeof input.lng === "number" &&
    Number.isFinite(input.lng);
  const hasExactEntrance =
    typeof input.exactEntranceLat === "number" &&
    Number.isFinite(input.exactEntranceLat) &&
    input.exactEntranceLat >= -90 &&
    input.exactEntranceLat <= 90 &&
    typeof input.exactEntranceLng === "number" &&
    Number.isFinite(input.exactEntranceLng) &&
    input.exactEntranceLng >= -180 &&
    input.exactEntranceLng <= 180;

  return {
    place_id: input.placeId?.trim() || null,
    formatted_address: input.formattedAddress?.trim() || null,
    address_verified: Boolean(input.addressVerified),
    lat: hasGeo ? input.lat : null,
    lng: hasGeo ? input.lng : null,
    geo_updated_at: hasGeo ? new Date().toISOString() : null,
    exact_entrance_lat: hasExactEntrance ? input.exactEntranceLat : null,
    exact_entrance_lng: hasExactEntrance ? input.exactEntranceLng : null,
    exact_entrance_confirmed_at: hasExactEntrance ? new Date().toISOString() : null,
    exact_entrance_note: hasExactEntrance ? input.exactEntranceNote?.trim() || "" : "",
    exact_entrance_pano_id: hasExactEntrance ? input.exactEntrancePanoId?.trim() || null : null,
    exact_entrance_heading:
      hasExactEntrance && Number.isFinite(input.exactEntranceHeading)
        ? input.exactEntranceHeading
        : null,
    exact_entrance_pitch:
      hasExactEntrance && Number.isFinite(input.exactEntrancePitch)
        ? input.exactEntrancePitch
        : null,
  };
}

export function normalizeEmailList(input?: string[]) {
  return Array.from(
    new Set((input || []).map((email) => email.trim().toLowerCase()).filter(Boolean)),
  );
}

function normalizePerson(input: PersonContactInput): PersonNormalizationResult<NormalizedPerson> {
  const nameError =
    personNameValidationMessage(input.firstName, "nombre") ||
    personNameValidationMessage(input.lastName, "apellido");

  if (nameError) {
    return { ok: false, error: nameError };
  }

  return {
    ok: true,
    value: {
      firstName: normalizePersonName(input.firstName),
      lastName: normalizePersonName(input.lastName),
      emails: normalizeEmailList(input.emails?.length ? input.emails : [input.email || ""]),
    },
  };
}

function customerMutationPatch(
  input: CustomerMutationInput,
  normalized: NormalizedPerson,
  phones: string[],
) {
  return {
    first_name: normalized.firstName,
    last_name: normalized.lastName,
    phones,
    email: normalized.emails[0] || "",
    emails: normalized.emails,
    street: input.street.trim(),
    house_number: input.houseNumber.trim(),
    neighborhood: input.neighborhood.trim(),
    city: input.city.trim(),
    state: input.state.trim(),
    postal_code: input.postalCode.trim(),
    address_reference: input.addressReference?.trim() || "",
    country: input.country?.trim() || "USA",
    ...geoAddressPatch(input),
  };
}

function recipientMutationPatch(
  input: RecipientMutationInput,
  normalized: NormalizedPerson,
  countryId: string,
) {
  return {
    country_id: countryId,
    first_name: normalized.firstName,
    last_name: normalized.lastName,
    phone: input.phone.trim(),
    email: normalized.emails[0] || "",
    emails: normalized.emails,
    country: input.country.trim(),
    street: input.street.trim(),
    house_number: input.houseNumber.trim(),
    neighborhood: input.neighborhood.trim(),
    city: input.city.trim(),
    state: input.state?.trim() || "",
    postal_code: input.postalCode.trim(),
    address_reference: input.addressReference?.trim() || "",
    ...geoAddressPatch(input),
  };
}

export function normalizeCustomerMutation(
  input: CustomerMutationInput,
): PersonNormalizationResult<NormalizedCustomerMutation> {
  const normalized = normalizePerson(input);
  if (!normalized.ok) {
    return normalized;
  }

  const phones = input.phones.map((phone) => phone.trim()).filter(Boolean);
  if (!phones.length) {
    return { ok: false, error: "Agrega al menos un telefono" };
  }

  return {
    ok: true,
    value: {
      ...normalized.value,
      phones,
      patch: customerMutationPatch(input, normalized.value, phones),
    },
  };
}

export function normalizeRecipientMutation(
  input: RecipientMutationInput,
  countryId: string,
): PersonNormalizationResult<NormalizedRecipientMutation> {
  const normalized = normalizePerson(input);
  if (!normalized.ok) {
    return normalized;
  }

  return {
    ok: true,
    value: {
      ...normalized.value,
      patch: recipientMutationPatch(input, normalized.value, countryId),
    },
  };
}
