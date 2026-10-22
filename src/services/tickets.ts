import { apiRequest } from './api';
import type { TicketEntry } from '../types';
export interface TicketQuery { query?: string; page?: number; selectedOnly?: boolean }
export interface TicketPage { items: TicketEntry[]; total: number; page: number; totalPages: number }
export interface TicketService { list(query: TicketQuery): Promise<TicketPage> }
export const ticketsService: TicketService = {
  list({ query = '', page = 1, selectedOnly = false }) {
    return apiRequest(`/demo/participant/tickets?page=${page}&query=${encodeURIComponent(query)}&selectedOnly=${selectedOnly}`);
  },
};
