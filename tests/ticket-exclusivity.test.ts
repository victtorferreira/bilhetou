import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { apiRequest } from '../src/services/api';
import { createApiTicketService, importApiTickets, listApiStock, getTicketStatistics } from '../src/services/ticketCreationApi';

test('Vercel proxies API requests before applying the SPA fallback', () => {
  const config = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
  assert.deepEqual(config.rewrites[0], { source: '/api/:path*', destination: 'https://bilhetou-backend.onrender.com/api/:path*' });
  assert.deepEqual(config.rewrites[1], { source: '/(.*)', destination: '/index.html' });
});
test('non-JSON hosting errors explain the API routing problem', async () => {
  const previous = globalThis.fetch;
  globalThis.fetch = async () => new Response('<html>Not found</html>', { status: 404 });
  try { await assert.rejects(apiRequest('/demo/session'), /encaminhamento \/api na Vercel/); }
  finally { globalThis.fetch = previous; }
});

test('creation uses authenticated admin endpoints, carries leading zeros and requires matching campaign', async () => {
  const previous = globalThis.fetch;
  const calls: { url: string; options?: RequestInit }[] = [];
  globalThis.fetch = async (input, options) => {
    calls.push({ url: String(input), options });
    return new Response(JSON.stringify({ token: 'signed', campaignId: 'campaign', expiresAt: '2026-12-01', tickets: [{ id: 'ticket', serial: 'DS1', numbers: ['0038','1123','6789','9876'] }] }), { status: 200 });
  };
  try {
    const service = createApiTicketService('campaign');
    const draft = await service.preview({ quantity: 1, prefix: 'DS', uniqueNumbers: true });
    assert.equal(draft.tickets[0].numbers[0], '0038');
    assert.match(calls[0].url, /\/admin\/ticket-batches\/preview$/);
    assert.equal(calls[0].options?.credentials, 'include');
    await service.confirm(draft);
    assert.match(calls[1].url, /\/admin\/ticket-batches\/confirm$/);
    await assert.rejects(createApiTicketService('other').confirm(draft));
    assert.equal(calls.length, 2);
  } finally { globalThis.fetch = previous; }
});

test('stock number search, import line numbers and statistics go to selected campaign', async () => {
  const previous = globalThis.fetch;
  const calls: { url: string; body: unknown }[] = [];
  globalThis.fetch = async (input, options) => {
    calls.push({ url: String(input), body: options?.body ? JSON.parse(String(options.body)) : undefined });
    return new Response(JSON.stringify({ created: 0, rejected: 1, errors: [{ line: 15, serial: 'DS1', reasons: ['duplicate'] }] }), { status: 200 });
  };
  try {
    await listApiStock('campaign', 1, '0038');
    assert.match(calls[0].url, /campaigns\/campaign\/tickets\?page=1&query=0038$/);
    const report = await importApiTickets('campaign', [{ serial: 'DS1', numbers: ['0038','1123','6789','9876'], line: 15 }]);
    assert.equal(report.errors[0].line, 15);
    assert.match(calls[1].url, /campaigns\/campaign\/tickets\/import$/);
    assert.equal((calls[1].body as { rows: { line: number }[] }).rows[0].line, 15);
    await getTicketStatistics('campaign');
    assert.match(calls[2].url, /campaigns\/campaign\/ticket-statistics$/);
  } finally { globalThis.fetch = previous; }
});
