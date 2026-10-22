import type { TicketEntry } from '../types';
import type { TicketCreationService } from './ticketCreation';

import { apiRequest } from './api';

export interface ApiCampaign { id: string; name: string; status: string; ticketPriceCents: number; prizeCents?: number; drawAt?: string | null; _count: { tickets: number } }
interface ApiTicket { id: string; serial: string; numbers: string[] }
export interface ApiStockPage { items: { id: string; serial: string; status: string; campaign: string; participant: string | null; createdAt: string; numbers: { position: number; value: string }[] }[]; total: number; page: number; totalPages: number }

const request = <T>(path: string, body?: unknown) => apiRequest<T>(`/admin${path}`, body);

export const listApiCampaigns = () => request<ApiCampaign[]>('/campaigns');
export const listApiStock = (campaignId: string, page = 1, query = '') => request<ApiStockPage>(`/campaigns/${encodeURIComponent(campaignId)}/tickets?page=${page}&query=${encodeURIComponent(query)}`);

export function createApiTicketService(campaignId: string): TicketCreationService {
  function mapTickets(tickets: ApiTicket[]): TicketEntry[] {
    return tickets.map(ticket => ({ id: ticket.id, serial: ticket.serial, numbers: ticket.numbers, campaignId, date: 'Não definida', status: 'Disponível' }));
  }
  return {
    async preview(input) {
      const result = await request<{ token: string; campaignId: string; expiresAt: string; tickets: ApiTicket[] }>('/ticket-batches/preview', { ...input, campaignId });
      return { tickets: mapTickets(result.tickets), uniqueNumbers: true, api: { token: result.token, campaignId: result.campaignId, expiresAt: result.expiresAt } };
    },
    async confirm(draft) {
      if (!draft.api || draft.api.campaignId !== campaignId) throw new Error('Gere uma prévia para a campanha selecionada.');
      const result = await request<{ tickets: ApiTicket[] }>('/ticket-batches/confirm', { token: draft.api.token });
      return mapTickets(result.tickets);
    },
  };
}

export interface AdminDashboard { tickets: number; available: number; assigned: number; campaigns: number; orders: number; participants: number }
export const getAdminDashboard = () => request<AdminDashboard>('/dashboard');
export const importApiTickets = (campaignId: string, rows: { serial: string; numbers: string[]; line?: number }[]) => request<ImportReport>(`/campaigns/${encodeURIComponent(campaignId)}/tickets/import`, { rows });

export interface ImportReport { total: number; valid: number; created: number; rejected: number; duplicateNumbers: string[]; errors: { line: number; serial: string; reasons: string[] }[] }
export interface TicketStatistics { possible: number; used: number; available: number; tickets: number; remainingTickets: number }
export const getTicketStatistics = (id: string) => request<TicketStatistics>(`/campaigns/${encodeURIComponent(id)}/ticket-statistics`);
