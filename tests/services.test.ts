import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDemoServices, sessionKey, seedTickets } from '../src/services/session';
import { normalizeName, validateName, validatePhone } from '../src/lib/format';
import { campaign } from '../src/data/campaign';
import { createTicketCreationService, prepareTicketBatch } from '../src/services/ticketCreation';

function setup() {
  const values = new Map<string, string>();
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); }, removeItem: (key: string) => { values.delete(key); } };
  let id = 0;
  const services = createDemoServices(storage, () => `test-${++id}`, () => new Date('2026-10-20T15:00:00Z'));
  return { services, storage };
}

async function register(services: ReturnType<typeof createDemoServices>) { return services.participants.register('  Maria   da Silva  ', '(98) 99999-9999'); }

function inputFor(services: ReturnType<typeof createDemoServices>) {
  const state = services.getSnapshot();
  return { participantId: state.participant!.id, ticketIds: [...state.selectedIds], idempotencyKey: state.selectionKey };
}

test('validates names, Brazilian mobile length and valid DDD', () => {
  assert.equal(normalizeName('  Maria   da Silva '), 'Maria da Silva');
  assert.equal(validateName('Maria'), false);
  assert.equal(validateName('123 Silva'), false);
  assert.equal(validateName('João D’Ávila'), true);
  assert.equal(validatePhone('(98) 99999-9999'), true);
  assert.equal(validatePhone('(20) 99999-9999'), false);
  assert.equal(validatePhone('(98) 89999-9999'), false);
  assert.equal(validatePhone('9899999999'), false);
});

test('rejects invalid registration and unauthenticated selection', async () => {
  const { services } = setup();
  await assert.rejects(services.participants.register('Maria', '98999999999'));
  await assert.rejects(services.participants.register('Maria Silva', '20999999999'));
  assert.throws(() => services.select(['DS-004829']));
});

test('normalizes and restores only the current participant session', async () => {
  const { services, storage } = setup();
  const person = await register(services);
  assert.equal(person.name, 'Maria da Silva');
  assert.equal(person.phone, '98999999999');
  assert.equal(person.verification, 'demo-unverified');
  assert.equal((await register(services)).id, person.id);
  assert.equal(createDemoServices(storage).getSnapshot().participant?.id, person.id);
});

test('same phone with a different name never recovers another participant orders', async () => {
  const { services } = setup();
  const person = await register(services);
  services.select(['DS-004829']);
  await services.orders.confirm(inputFor(services));
  const other = await services.participants.register('Outra Pessoa', person.phone);
  assert.notEqual(other.id, person.id);
  assert.equal(services.getSnapshot().orders.length, 0);
  assert.equal(services.getSnapshot().selectedIds.length, 0);
});

test('uses the preserved predefined stock and rejects unknown or duplicate tickets', async () => {
  const { services } = setup();
  await register(services);
  assert.equal(services.available().length, 50);
  assert.deepEqual(services.available()[0].numbers, ['8993', '6488', '3980', '1477']);
  assert.throws(() => services.select(['UNKNOWN']));
  assert.throws(() => services.select(['DS-004829', 'DS-004829']));
  services.select(seedTickets.slice(0, 20).map(ticket => ticket.serial));
  assert.equal(services.getSnapshot().selectedIds.length, 20);
});

test('rejects empty, forged ownership and stale order requests', async () => {
  const { services } = setup();
  await register(services);
  await assert.rejects(services.orders.confirm(inputFor(services)));
  services.select(['DS-004829']);
  const stale = inputFor(services);
  await assert.rejects(services.orders.confirm({ ...stale, participantId: 'another-person' }));
  services.select(['DS-004830']);
  await assert.rejects(services.orders.confirm(stale));
  assert.equal(services.getSnapshot().orders.length, 0);
});

test('confirmation assigns tickets once, updates availability and persists the order', async () => {
  const { services, storage } = setup();
  await register(services);
  services.select(['DS-004829', 'DS-004830']);
  const order = await services.orders.confirm(inputFor(services));
  assert.equal(order.totalCents, 400);
  assert.equal(order.createdAt, '2026-10-20T15:00:00.000Z');
  assert.equal(services.available().length, 48);
  assert.deepEqual(services.getSnapshot().selectedIds, []);
  assert.throws(() => services.select(['DS-004829']));
  const restored = createDemoServices(storage);
  assert.deepEqual(restored.getSnapshot().orders, [order]);
  assert.equal(restored.available().length, 48);
});

test('simultaneous duplicate confirmation is idempotent in this page', async () => {
  const { services } = setup();
  await register(services);
  services.select(['DS-004829']);
  const input = inputFor(services);
  const [a, b] = await Promise.all([services.orders.confirm(input), services.orders.confirm(input)]);
  assert.equal(a.id, b.id);
  assert.equal(services.getSnapshot().orders.length, 1);
  await assert.rejects(services.orders.confirm({ ...input, ticketIds: ['DS-004830'] }));
});

test('a changed selection cannot reuse a completed order key', async () => {
  const { services } = setup();
  await register(services);
  services.select(['DS-004829']);
  const first = inputFor(services);
  await services.orders.confirm(first);
  services.select(['DS-004830']);
  await assert.rejects(services.orders.confirm({ ...inputFor(services), idempotencyKey: first.idempotencyKey }));
});

test('rejects duplicate and malformed CSV records atomically', () => {
  const { services } = setup();
  const imported = { serial: 'DEMO-CSV-1', numbers: ['0001', '0002', '0003', '0004'], campaignId: campaign.id, date: '20/10/2026', status: 'Disponível' as const };
  assert.throws(() => services.importTickets([imported, imported]));
  assert.equal(services.catalog().length, 50);
  assert.throws(() => services.importTickets([{ ...imported, numbers: ['123'] }]));
  services.importTickets([imported]);
  assert.equal(services.available().length, 51);
  assert.throws(() => services.importTickets([imported]));
});

test('corrupt storage is discarded without exposing stale participant data', () => {
  const { storage } = setup();
  storage.setItem(sessionKey, '{not json');
  assert.equal(createDemoServices(storage).getSnapshot().participant, null);
  storage.setItem(sessionKey, JSON.stringify({ version: 1, orders: [], selectedIds: [], importedTickets: [], participant: { id: 'x', name: 1 }, selectionKey: 'x' }));
  assert.equal(createDemoServices(storage).getSnapshot().participant, null);
});

test('blocked storage falls back to memory and flags the limitation', async () => {
  const services = createDemoServices({ getItem() { throw Error(); }, setItem() { throw Error(); }, removeItem() { throw Error(); } });
  await register(services);
  services.select(['DS-004829']);
  await services.orders.confirm(inputFor(services));
  assert.equal(services.getSnapshot().orders.length, 1);
  assert.equal(services.getSnapshot().storageWarning, true);
});

test('ending the session removes participant and assigned tickets', async () => {
  const { services, storage } = setup();
  await register(services);
  services.select(['DS-004829']);
  await services.orders.confirm(inputFor(services));
  services.endSession();
  const restored = createDemoServices(storage).getSnapshot();
  assert.equal(restored.participant, null);
  assert.deepEqual(restored.orders, []);
});

test('ticket batches have sequential unique serials and four distinct padded numbers', () => {
  const batch = prepareTicketBatch({ quantity: 1000, prefix: ' bil ', uniqueNumbers: false }, seedTickets, () => 0);
  assert.equal(batch.tickets.length, 1000);
  assert.equal(batch.tickets[0].serial, 'BIL-000001');
  assert.equal(batch.tickets[999].serial, 'BIL-001000');
  assert.equal(new Set(batch.tickets.map(ticket => ticket.serial)).size, 1000);
  for (const ticket of batch.tickets) {
    assert.equal(new Set(ticket.numbers).size, 4);
    assert.ok(ticket.numbers.every(number => /^\d{4}$/.test(number)));
  }
});

test('a preview does not change stock; confirmation persists and makes tickets selectable', async () => {
  const { services, storage } = setup();
  const creator = createTicketCreationService(services, () => 0);
  const draft = await creator.preview({ quantity: 5, prefix: 'BIL', uniqueNumbers: false });
  assert.equal(services.available().length, 50);
  await creator.confirm(draft);
  assert.equal(services.available().length, 55);
  assert.equal(createDemoServices(storage).available().length, 55);
  await assert.rejects(creator.confirm(draft));
  assert.equal(services.available().length, 55);
  const next = await creator.preview({ quantity: 1, prefix: 'BIL', uniqueNumbers: false });
  assert.equal(next.tickets[0].serial, 'BIL-000006');
  await register(services);
  services.select(draft.tickets.map(ticket => ticket.serial));
  const order = await services.orders.confirm(inputFor(services));
  assert.equal(order.ticketIds.length, 5);
});

test('unique-number rule excludes all existing numbers and duplicates across the batch', () => {
  const draft = prepareTicketBatch({ quantity: 100, prefix: 'BIL', uniqueNumbers: true }, seedTickets, () => 0);
  const numbers = draft.tickets.flatMap(ticket => ticket.numbers);
  const existing = new Set(seedTickets.flatMap(ticket => ticket.numbers));
  assert.equal(new Set(numbers).size, 400);
  assert.ok(numbers.every(number => !existing.has(number)));
});

test('rejects invalid quantities, prefixes and serial overflow', () => {
  const base = { quantity: 1, prefix: 'BIL', uniqueNumbers: false };
  for (const quantity of [0, -1, 1.5, 1001, NaN, Infinity]) assert.throws(() => prepareTicketBatch({ ...base, quantity }, seedTickets));
  for (const prefix of ['', '123', 'BIL TEST', 'A'.repeat(13), '=CMD']) assert.throws(() => prepareTicketBatch({ ...base, prefix }, seedTickets));
  assert.throws(() => prepareTicketBatch(base, [{ ...seedTickets[0], serial: 'BIL-999999' }]));
});

test('exhausted number space fails promptly without generating or saving partial batches', () => {
  const occupied = Array.from({ length: 2500 }, (_, index) => ({
    ...seedTickets[0], serial: `FILLED-${index}`, numbers: Array.from({ length: 4 }, (_, j) => String(index * 4 + j).padStart(4, '0')),
  }));
  assert.throws(() => prepareTicketBatch({ quantity: 1, prefix: 'BIL', uniqueNumbers: true }, occupied), /apenas 0/);
});

test('confirmation revalidates serial and unique-number conflicts against current stock', async () => {
  const { services } = setup();
  const creator = createTicketCreationService(services, () => 0);
  const first = await creator.preview({ quantity: 1, prefix: 'ONE', uniqueNumbers: true });
  const second = await creator.preview({ quantity: 1, prefix: 'TWO', uniqueNumbers: true });
  await creator.confirm(first);
  await assert.rejects(creator.confirm(second), /estoque mudou/);
  assert.equal(services.catalog().length, 51);
  const malformed = { tickets: [{ ...seedTickets[0], serial: 'BIL-000001', numbers: ['0000', '0000', '0001', '0002'] }], uniqueNumbers: false };
  await assert.rejects(creator.confirm(malformed), /distintos/);
});

test('generated and CSV tickets share the additional-stock limit', async () => {
  const { services } = setup();
  const creator = createTicketCreationService(services, () => 0);
  for (let i = 0; i < 5; i++) await creator.confirm(await creator.preview({ quantity: 1000, prefix: 'BIL', uniqueNumbers: false }));
  assert.equal(services.catalog().length, 5050);
  await assert.rejects(creator.preview({ quantity: 1, prefix: 'BIL', uniqueNumbers: false }), /5.000/);
});
