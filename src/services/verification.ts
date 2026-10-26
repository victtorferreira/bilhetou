import { apiRequest } from './api';

export interface TicketVerification {
  serial: string;
  numbers: string[];
  campaignName: string;
  drawAt: string | null;
  issuedAt: string | null;
  status: 'VALID' | 'VOID' | 'NOT_ISSUED' | 'EXPIRED' | 'REVIEW_REQUIRED' | 'PENDING_PAYMENT';
  paymentStatus: 'PAID' | 'NOT_REQUIRED' | 'NOT_CONFIRMED';
  checkedAt: string;
}

export function verifyTicket(id: string) {
  return apiRequest<TicketVerification>(`/tickets/${encodeURIComponent(id)}/verification`);
}
