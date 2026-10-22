import { apiRequest, ApiError } from './api';
import type { ConfirmDemoOrderInput, DemoSession } from '../types';

type ServerState = Omit<DemoSession, 'initialized' | 'loading' | 'error'>;
const empty: ServerState = { participant: null, campaign: null, availableCount: 0, selectedIds: [], selectedTickets: [], selectionKey: '', orders: [] };
let state: DemoSession = { ...empty, initialized: false, loading: true, error: '' };
const listeners = new Set<() => void>();
let pending: Promise<void> | null = null;

function publish(next: DemoSession) { state = next; listeners.forEach(listener => listener()); }
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
export const demoServices = {
  getSnapshot: () => state,
  subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
  refresh() {
    if (pending) return pending;
    publish({ ...state, loading: !state.initialized, error: '' });
    pending = apiRequest<ServerState>('/demo/session').then(accept).catch(error => {
      publish({ ...state, initialized: true, loading: false, error: error instanceof Error ? error.message : 'Backend unavailable.' });
    }).finally(() => { pending = null; });
    return pending;
  },
  participants: { async register(name: string, phone: string) {
    const next = await mutation('/demo/session', { name, phone });
    return next.participant!;
  } },
  select(ticketIds: string[]) { return mutation('/demo/participant/selection', { ticketIds }); },
  selectQuantity(quantity: number) { return mutation('/demo/participant/selection', { quantity }); },
  changeCampaign(campaignId: string) { return mutation('/demo/participant/campaign', { campaignId }); },
  orders: { async confirm(input: ConfirmDemoOrderInput) {
    const next = await mutation('/demo/participant/orders', { idempotencyKey: input.idempotencyKey });
    return next.orders.find(order => order.idempotencyKey === input.idempotencyKey)!;
  } },
  async endSession() { await apiRequest('/demo/session/logout', {}); accept(empty); },
};

// Remove the retired demo snapshot without importing its data into the database.
try { window.sessionStorage.removeItem('dia-de-sorte-demo-session-v1'); } catch { /* No browser storage is needed. */ }
