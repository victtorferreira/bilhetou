import { apiRequest } from './api';
export interface ZettpayCheckout {
  order: { id: string; totalCents: number; quantity: number; paymentRequired: boolean; paymentStatus: 'UNPAID' | 'PAID' | 'EXPIRED' | 'REVIEW_REQUIRED'; reservationExpiresAt?: string | null; reservationExpired?: boolean };
  payment: { id: string; status: 'CREATING' | 'PENDING' | 'PAID' | 'UNKNOWN'; amountCents: number; qrCode: string | null; paidAt: string | null; lastError: string | null } | null;
}
const path = (orderId: string) => `/participant/orders/${encodeURIComponent(orderId)}/payment`;
export const zettpayCheckout = {
  get: (orderId: string) => apiRequest<ZettpayCheckout>(path(orderId)),
  create: (orderId: string, payerEmail: string, payerDocument: string) => apiRequest<ZettpayCheckout>(path(orderId), { payerEmail, payerDocument }),
  check: (orderId: string) => apiRequest<ZettpayCheckout>(`${path(orderId)}/check`, {}),
};
