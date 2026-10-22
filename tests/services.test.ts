import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeName, validateName, validatePhone } from '../src/lib/format';
import { participantServices } from '../src/services/session';
import { ticketsService } from '../src/services/tickets';

test('validates full names and Brazilian mobile numbers', () => {
  assert.equal(normalizeName('  Maria   da Silva '), 'Maria da Silva');
  assert.equal(validateName('Maria'), false);
  assert.equal(validateName('123 Silva'), false);
  assert.equal(validateName('João D’Ávila'), true);
  for (const phone of ['(20) 99999-9999', '(98) 89999-9999', '9899999999']) assert.equal(validatePhone(phone), false);
  assert.equal(validatePhone('(98) 99999-9999'), true);
});

test('participant state and mutations use server sessions, with no identity supplied for order confirmation', async () => {
  const previous = globalThis.fetch;
  const calls: { path: string; body?: Record<string, unknown>; credentials?: RequestCredentials }[] = [];
  const person = { id: 'person', name: 'Maria Silva', phone: '98999999999', verification: 'unverified' };
  const state = { participant: person, campaign: { id: 'campaign', name: 'Campanha', prizeCents: null, ticketPriceCents: 300, drawDate: 'Data a definir', status: 'OPEN' }, availableCount: 1, selectedIds: [], selectedTickets: [], selectionKey: 'selection-key', orders: [] as Record<string, unknown>[] };
  globalThis.fetch = async (input, options) => {
    const path = String(input);
    calls.push({ path, body: options?.body ? JSON.parse(String(options.body)) : undefined, credentials: options?.credentials });
    if (path.endsWith('/orders')) state.orders = [{ id: 'order', participantId: 'person', idempotencyKey: 'selection-key', status: 'registered', paymentStatus: 'UNPAID', tickets: [] }];
    return new Response(JSON.stringify(state), { status: 200 });
  };
  try {
    await participantServices.refresh();
    assert.equal(participantServices.getSnapshot().participant?.id, 'person');
    assert.match(calls[0].path, /\/participant\/session$/);
    await participantServices.selectQuantity(1);
    assert.deepEqual(calls[1].body, { quantity: 1 });
    const order = await participantServices.orders.confirm({ participantId: 'forged', ticketIds: ['forged'], idempotencyKey: 'selection-key' });
    assert.deepEqual(calls[2].body, { idempotencyKey: 'selection-key' });
    assert.equal(order.status, 'registered'); assert.equal(order.paymentStatus, 'UNPAID');
    assert.ok(calls.every(call => call.credentials === 'include'));
  } finally { globalThis.fetch = previous; }
});

test('stock search preserves leading zeros and scopes selected tickets on server', async () => {
  const previous = globalThis.fetch;
  let url = '';
  globalThis.fetch = async input => { url = String(input); return new Response(JSON.stringify({ items: [], total: 0, page: 1, totalPages: 1 })); };
  try {
    await ticketsService.list({ query: '0038', page: 2, selectedOnly: true });
    assert.match(url, /\/participant\/tickets\?page=2&query=0038&selectedOnly=true$/);
  } finally { globalThis.fetch = previous; }
});
