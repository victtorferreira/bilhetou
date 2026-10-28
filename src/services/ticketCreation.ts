import type { TicketEntry } from '../types';
export const maxBatchSize = 2500;
export interface CreateTicketsInput { quantity: number; prefix: string; uniqueNumbers: boolean }
export interface TicketBatchDraft {
  tickets: TicketEntry[];
  uniqueNumbers: boolean;
  api: { token: string; campaignId: string; expiresAt: string };
}
export interface TicketCreationService {
  preview(input: CreateTicketsInput): Promise<TicketBatchDraft>;
  confirm(draft: TicketBatchDraft): Promise<TicketEntry[]>;
}
