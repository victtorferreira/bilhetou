import { apiRequest, ApiError } from './api';
import type { ConfirmOrderInput, ParticipantSessionState } from '../types';

type ServerState = Omit<ParticipantSessionState, 'initialized' | 'loading' | 'error'>;
const empty: ServerState = { participant: null, campaign: null, availableCount: 0, selectedIds: [], selectedTickets: [], selectionKey: '', orders: [] };
let state: ParticipantSessionState = { ...empty, initialized: false, loading: true, error: '' };
const listeners = new Set<() => void>();
let pending: Promise<void> | null = null;

function publish(next: ParticipantSessionState) { state = next; listeners.forEach(listener => listener()); }
function accept(data: ServerState) { publish({ ...data, initialized: true, loading: false, error: '' }); }
async function mutation(path: string, body: unknown) {
  try { const next = await apiRequest<ServerState>(path, body); accept(next); return next; }
  catch (error) {
    if (error instanceof ApiError && error.status === 401) accept(empty);
    throw error;
  }
}

// Only a view cache lives in memory. PostgreSQL is the sole data source.
// The opaque session identifier is managed by the browser as an HTTP-only cookie.
export const participantServices = {
  getSnapshot: () => state,
  subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
  refresh() {
    if (pending) return pending;
    publish({ ...state, loading: !state.initialized, error: '' });
    pending = apiRequest<ServerState>('/participant/session').then(async data => {
      // One release of compatibility restores cookies issued under the former path.
      if (!data.participant) {
        try { const legacy = await apiRequest<ServerState>('/demo/session'); if (legacy.participant) return legacy; } catch { /* No legacy session to restore. */ }
      }
      return data;
    }).then(accept).catch(error => {
      publish({ ...state, initialized: true, loading: false, error: error instanceof Error ? error.message : 'Backend unavailable.' });
    }).finally(() => { pending = null; });
    return pending;
  },
  participants: { async register(name: string, phone: string) {
    const next = await mutation('/participant/session', { name, phone });
    return next.participant!;
  } },
  select(ticketIds: string[]) { return mutation('/participant/selection', { ticketIds }); },
  selectQuantity(quantity: number) { return mutation('/participant/selection', { quantity }); },
  changeCampaign(campaignId: string) { return mutation('/participant/campaign', { campaignId }); },
  orders: { async confirm(input: ConfirmOrderInput) {
    const next = await mutation('/participant/orders', { idempotencyKey: input.idempotencyKey });
    return next.orders.find(order => order.idempotencyKey === input.idempotencyKey)!;
  } },
  async endSession() { await apiRequest('/participant/session/logout', {}); accept(empty); },
};
