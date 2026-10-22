import { apiRequest } from './api';

export interface ParticipantRow { id: string; name: string; phoneMasked: string; createdAt: string; orders: number; tickets: number }
export interface AdminPage<T> { items: T[]; total: number; page: number; totalPages: number }
export interface ParticipantsPage extends AdminPage<ParticipantRow> { summary: { participants: number; orders: number; tickets: number } }
export interface ParticipantDetail { id: string; name: string; phone: string; phoneMasked: string; createdAt: string; verification: 'unverified'; summary: { orders: number; tickets: number; orderValueCents: number } }
export interface ParticipantOrder { id: string; createdAt: string; quantity: number; totalCents: number; campaign: { id: string; name: string }; status: 'REGISTERED'; paymentStatus: 'UNPAID' }
export interface ParticipantTicket { id: string; serial: string; status: string; assignedAt: string | null; orderId: string; campaign: { id: string; name: string }; numbers: { value: string; position: number }[] }

export function listAdminParticipants(input: { page: number; query: string; activity: string; campaignId: string }) {
  const query = new URLSearchParams({ page: String(input.page), query: input.query, activity: input.activity });
  if (input.campaignId) query.set('campaignId', input.campaignId);
  return apiRequest<ParticipantsPage>(`/admin/participants?${query}`);
}
const path = (id: string) => `/admin/participants/${encodeURIComponent(id)}`;
export const getAdminParticipant = (id: string) => apiRequest<ParticipantDetail>(path(id));
export const listParticipantOrders = (id: string, page: number) => apiRequest<AdminPage<ParticipantOrder>>(`${path(id)}/orders?page=${page}`);
export const listParticipantTickets = (id: string, page: number) => apiRequest<AdminPage<ParticipantTicket>>(`${path(id)}/tickets?page=${page}`);
