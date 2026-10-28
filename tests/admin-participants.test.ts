import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getAdminParticipant, listAdminParticipants, listParticipantOrders, listParticipantTickets } from '../src/services/adminParticipants';

test('participant adapters preserve filters, pagination and authenticated cookies', async () => {
  const previous = globalThis.fetch;
  const calls: { url: URL; credentials?: RequestCredentials }[] = [];
  globalThis.fetch = async (input, init) => { calls.push({ url: new URL(String(input), 'http://localhost'), credentials: init?.credentials }); return new Response('{}'); };
  try {
    await listAdminParticipants({ page: 2, query: '(98) 99999-9999', activity: 'with_orders', campaignId: 'campaign' });
    assert.equal(calls[0].url.pathname, '/api/admin/participants');
    assert.equal(calls[0].url.searchParams.get('query'), '(98) 99999-9999');
    assert.equal(calls[0].url.searchParams.get('page'), '2'); assert.equal(calls[0].url.searchParams.get('campaignId'), 'campaign');
    await getAdminParticipant('person'); await listParticipantOrders('person', 3); await listParticipantTickets('person', 4);
    assert.equal(calls[1].url.pathname, '/api/admin/participants/person');
    assert.equal(calls[2].url.pathname + calls[2].url.search, '/api/admin/participants/person/orders?page=3');
    assert.equal(calls[3].url.pathname + calls[3].url.search, '/api/admin/participants/person/tickets?page=4');
    await listAdminParticipants({ page: 1, query: '', activity: 'all', campaignId: '' });
    assert.equal(calls[4].url.searchParams.get('campaignScope'), 'current');
    assert.equal(calls[4].url.searchParams.has('campaignId'), false);
    await listAdminParticipants({ page: 1, query: '', activity: 'all', campaignId: 'all' });
    assert.equal(calls[5].url.searchParams.get('campaignScope'), 'all');
    assert.equal(calls[5].url.searchParams.has('campaignId'), false);
    assert.ok(calls.every(call => call.credentials === 'include'));
  } finally { globalThis.fetch = previous; }
});
