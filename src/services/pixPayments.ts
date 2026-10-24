import { apiRequest } from './api';
export interface PixPayment {
  id: string; description: string; amountCents: number; environment: 'sandbox' | 'production';
  status: 'CREATING' | 'PENDING' | 'PAID' | 'EXPIRED' | 'CANCELLED' | 'FAILED' | 'UNKNOWN';
  createdAt: string; paidAt: string | null; lastError: string | null;
  providerId?: string | null; brCode?: string | null; expiresAt?: string | null;
}
export interface PixConfiguration { enabled: true; environment: 'sandbox' | 'production'; minAmountCents: number; maxAmountCents: number }
const path = '/admin/payments/pix';
export const pixPayments = {
  configuration: () => apiRequest<PixConfiguration>(`${path}/configuration`),
  list: () => apiRequest<PixPayment[]>(path),
  get: (id: string) => apiRequest<PixPayment>(`${path}/${encodeURIComponent(id)}`),
  create: (body: { requestKey: string; description: string; amountCents: number }) => apiRequest<PixPayment>(path, body),
  check: (id: string) => apiRequest<PixPayment>(`${path}/${encodeURIComponent(id)}/check`, {}),
};
