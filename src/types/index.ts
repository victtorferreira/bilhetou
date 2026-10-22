export interface Participant {
  id: string;
  name: string;
  phone: string;
  verification: 'demo-unverified';
}

export interface TicketEntry {
  id: string;
  campaignName?: string;
  issuedAt?: string;
  serial: string;
  numbers: string[];
  date: string;
  campaignId: string;
  status: 'Disponível' | 'Demonstrativo' | 'Conferido';
}

export interface DemoOrder {
  tickets: TicketEntry[];
  id: string;
  participantId: string;
  campaignId: string;
  ticketIds: string[];
  totalCents: number;
  createdAt: string;
  idempotencyKey: string;
  status: 'demo-confirmed';
}

export interface CampaignInfo {
  id: string;
  name: string;
  prizeCents: number;
  ticketPriceCents: number;
  drawDate: string;
  status: string;
}

export interface DemoSession {
  participant: Participant | null;
  campaign: CampaignInfo | null;
  selectedIds: string[];
  selectedTickets: TicketEntry[];
  selectionKey: string;
  availableCount: number;
  orders: DemoOrder[];
  initialized: boolean;
  loading: boolean;
  error: string;
}

export interface ConfirmDemoOrderInput {
  participantId: string;
  ticketIds: string[];
  idempotencyKey: string;
}

// A real implementation must resolve identity through an OTP-verified server session.
export interface ParticipantService {
  register(name: string, phone: string): Promise<Participant>;
}

export interface DemoOrderService {
  confirm(input: ConfirmDemoOrderInput): Promise<DemoOrder>;
}

export type SelectionMode = 'quantity' | 'manual';
