export type InvoiceNumberReservation = {
  reservationToken: string;
  invoiceNumber: string;
  sequence: number;
  expiresAt: string;
};

export function createInvoiceReservationToken() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `invoice-reservation-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
