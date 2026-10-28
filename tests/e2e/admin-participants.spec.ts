import { test, expect, type Page } from '@playwright/test';

const id = '00000000-0000-4000-8000-000000000001';
const campaign = { id: '00000000-0000-4000-8000-100000000001', name: 'Campanha da comunidade', status: 'OPEN', ticketPriceCents: 300, _count: { tickets: 1 } };
const people = Array.from({ length: 21 }, (_, i) => ({ id: `00000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`, name: i ? `Participante ${String(i + 1).padStart(2, '0')}` : 'Maria Silva', phoneMasked: '(98) 9****-9999', createdAt: '2026-10-22T12:00:00Z', orders: i ? 0 : 1, tickets: i ? 0 : 1 }));

async function participantRoutes(page: Page, failFirstList = false) {
  let failRequests = failFirstList;
  await page.route('**/api/admin/**', async route => {
    const url = new URL(route.request().url());
    const send = (data: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) });
    if (url.pathname === '/api/admin/session') return send({ organizationId: 'organization', actor: 'operator' });
    if (url.pathname === '/api/admin/campaigns') return send([campaign]);
    if (url.pathname === '/api/admin/participants') {
      if (failRequests) return send({ message: 'Falha temporária na consulta.' }, 503);
      let filtered = people.filter(p => p.name.toLowerCase().includes((url.searchParams.get('query') || '').toLowerCase()));
      if (url.searchParams.get('activity') === 'with_orders') filtered = filtered.filter(p => p.orders);
      if (url.searchParams.get('activity') === 'without_orders') filtered = filtered.filter(p => !p.orders);
      const page = Math.min(Number(url.searchParams.get('page') || 1), Math.max(1, Math.ceil(filtered.length / 20)));
      return send({ campaignScope: { mode: 'current', active: true, campaign }, items: filtered.slice((page - 1) * 20, page * 20), total: filtered.length, page, totalPages: Math.max(1, Math.ceil(filtered.length / 20)), summary: { participants: filtered.length, orders: filtered.reduce((sum, p) => sum + p.orders, 0), tickets: filtered.reduce((sum, p) => sum + p.tickets, 0) } });
    }
    if (url.pathname === `/api/admin/participants/${id}`) return send({ ...people[0], phone: '98999999999', verification: 'unverified', summary: { orders: 1, tickets: 1, orderValueCents: 300 } });
    if (url.pathname.endsWith('/orders')) return send({ items: [{ id: 'order-1', createdAt: '2026-10-22T12:00:00Z', quantity: 1, totalCents: 300, campaign, status: 'REGISTERED', paymentStatus: 'UNPAID' }], page: 1, totalPages: 1, total: 1 });
    if (url.pathname.endsWith('/tickets')) return send({ items: [{ id: 'ticket-1', serial: 'BIL-000001', status: 'ASSIGNED', assignedAt: '2026-10-22T12:00:00Z', orderId: 'order-1', campaign, numbers: ['0038', '1123', '6789', '9876'].map((value, i) => ({ value, position: i + 1 })) }], page: 1, totalPages: 1, total: 1 });
    return send({ message: 'Rota não encontrada.' }, 404);
  });
  return () => { failRequests = false; };
}

test('participants page searches, filters and paginates without exposing complete contact in list', async ({ page }) => {
  await participantRoutes(page);
  await page.goto('/admin/participantes');
  await expect(page.getByRole('heading', { name: 'Participantes', exact: true })).toBeVisible();
  await expect(page.locator('.admin-table tbody tr')).toHaveCount(20);
  await expect(page.locator('body')).not.toContainText('Esta funcionalidade ainda não está disponível.');
  await expect(page.locator('body')).not.toContainText('(98) 99999-9999');
  await page.getByRole('button', { name: 'Próxima página: Participantes', exact: true }).click();
  await expect(page.locator('.admin-table tbody tr')).toHaveCount(1);
  await page.getByLabel('Buscar participante por nome ou WhatsApp').fill('Maria');
  await page.getByRole('button', { name: 'Buscar participantes', exact: true }).click();
  await expect(page.locator('.admin-table tbody tr')).toHaveCount(1);
  await expect(page.locator('.admin-table')).toContainText('Maria Silva');
  await page.getByRole('combobox', { name: 'Pedidos', exact: true }).selectOption('without_orders');
  await expect(page.getByRole('heading', { name: 'Nenhum participante encontrado' })).toBeVisible();
});

test('participant detail shows authorized contact, orders and linked ticket numbers', async ({ page }) => {
  await participantRoutes(page);
  await page.goto('/admin/participantes');
  await page.getByRole('button', { name: 'Ver detalhes de Maria Silva', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Maria Silva', exact: true })).toBeVisible();
  await expect(page.getByText('WhatsApp: (98) 99999-9999', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Abrir WhatsApp' })).toHaveAttribute('href', 'https://wa.me/5598999999999');
  await expect(page.locator('.admin-table')).toContainText('Não confirmado');
  await page.getByRole('button', { name: 'Bilhetes', exact: true }).click();
  await expect(page.locator('.admin-table')).toContainText('BIL-000001');
  await expect(page.locator('.admin-table')).toContainText('0038');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Voltar aos participantes', exact: true }).click();
  await expect(page.locator('.admin-table tbody tr')).toHaveCount(20);
});

test('participant list reports an API failure and can retry', async ({ page }) => {
  const recover = await participantRoutes(page, true);
  await page.goto('/admin/participantes');
  await expect(page.getByRole('alert')).toContainText('Falha temporária na consulta.');
  recover();
  await page.getByRole('button', { name: 'Atualizar participantes', exact: true }).click();
  await expect(page.locator('.admin-table tbody tr')).toHaveCount(20);
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('new campaign starts at zero and previous campaign and full history remain available', async ({ page }) => {
  await participantRoutes(page);
  const previous = { ...campaign, id: '00000000-0000-4000-8000-100000000002', name: 'Campanha anterior', status: 'CLOSED' };
  await page.route('**/api/admin/campaigns', route => route.fulfill({ json: [campaign, previous] }));
  await page.route('**/api/admin/participants?*', route => {
    const params = new URL(route.request().url()).searchParams;
    const all = params.get('campaignScope') === 'all';
    const old = params.get('campaignId') === previous.id;
    const count = all || old ? 1 : 0;
    return route.fulfill({ json: {
      campaignScope: { mode: all ? 'all' : old ? 'campaign' : 'current', active: !old && !all, campaign: all ? null : old ? previous : campaign },
      items: [{ ...people[0], orders: count, tickets: count }], total: 1, page: 1, totalPages: 1,
      summary: { participants: 1, orders: count, tickets: count },
    } });
  });
  await page.goto('/admin/participantes');
  await expect(page.getByText(`Exibindo a campanha atual: ${campaign.name}.`, { exact: true })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Bilhetes nesta campanha' })).toBeVisible();
  await expect(page.locator('.admin-table tbody tr').first().locator('td').nth(4)).toHaveText('0');
  await page.getByRole('combobox', { name: 'Campanha', exact: true }).selectOption(previous.id);
  await expect(page.getByText(`Exibindo a campanha selecionada: ${previous.name}.`, { exact: true })).toBeVisible();
  await expect(page.locator('.admin-table tbody tr').first().locator('td').nth(4)).toHaveText('1');
  await page.getByRole('combobox', { name: 'Campanha', exact: true }).selectOption('all');
  await expect(page.getByRole('columnheader', { name: 'Bilhetes no histórico' })).toBeVisible();
  await page.getByRole('combobox', { name: 'Campanha', exact: true }).selectOption('');
  await expect(page.locator('.admin-table tbody tr').first().locator('td').nth(4)).toHaveText('0');
  await page.getByRole('button', { name: 'Ver detalhes de Maria Silva', exact: true }).click();
  await expect(page.getByText('O valor dos pedidos não representa pagamento confirmado.', { exact: false })).toContainText('todas as campanhas');
  await expect(page.locator('.admin-table tbody tr')).toHaveCount(1);
});

test('ended campaign retains counts and clearly reports that no campaign is active', async ({ page }) => {
  await participantRoutes(page);
  await page.route('**/api/admin/participants?*', route => route.fulfill({ json: {
    campaignScope: { mode: 'current', active: false, campaign },
    items: [people[0]], total: 1, page: 1, totalPages: 1,
    summary: { participants: 1, orders: 1, tickets: 1 },
  } }));
  await page.goto('/admin/participantes');
  await expect(page.getByText(`Sem campanha ativa. Exibindo a última campanha: ${campaign.name}.`, { exact: true })).toBeVisible();
  await expect(page.locator('.admin-table tbody tr').first().locator('td').nth(4)).toHaveText('1');
});
