export interface Participant {
  id: string;
  name: string;
  phone: string;
  verification: 'unverified';
}

export interface TicketEntry {
  id: string;
  campaignName?: string;
  issuedAt?: string;
  serial: string;
  numbers: string[];
  date: string;
  campaignId: string;
  status: 'Disponível' | 'Atribuído' | 'Conferido';
}

export interface Order {
  tickets: TicketEntry[];
  id: string;
  participantId: string;
  campaignId: string;
  ticketIds: string[];
  totalCents: number;
  createdAt: string;
  idempotencyKey: string;
  status: 'registered';
  paymentStatus: 'UNPAID' | 'PAID';
  paymentRequired?: boolean;
  quantity?: number;
}

export interface CampaignInfo {
  id: string;
  name: string;
  prizeCents: number | null;
  ticketPriceCents: number;
  drawDate: string;
  status: string;
}

export interface ParticipantSessionState {
  participant: Participant | null;
  campaign: CampaignInfo | null;
  selectedIds: string[];
  selectedTickets: TicketEntry[];
  selectionKey: string;
  availableCount: number;
  orders: Order[];
  initialized: boolean;
  loading: boolean;
  error: string;
}

export interface ConfirmOrderInput {
  participantId: string;
  ticketIds: string[];
  idempotencyKey: string;
}

// A real implementation must resolve identity through an OTP-verified server session.
export interface ParticipantService {
  register(name: string, phone: string, whatsappConsent?: boolean): Promise<Participant>;
}

export interface OrderService {
  confirm(input: ConfirmOrderInput): Promise<Order>;
}

export type SelectionMode = 'quantity' | 'manual';
