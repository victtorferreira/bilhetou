import { test, expect } from '@playwright/test';

const id = '6d156747-50ba-4c16-8b25-e60909473ed5';
const verification = {
  serial: 'BIL-000001', numbers: ['0000', '1234', '5678', '9999'], campaignName: 'Campanha das três cidades',
  drawAt: '2026-10-26T22:00:00Z', issuedAt: '2026-10-25T15:00:00Z',
  status: 'VALID', paymentStatus: 'PAID', checkedAt: '2026-10-26T16:00:00Z',
};

test('issued ticket links to its public verification page', async ({ page }) => {
  const ticket = { id, campaignId: 'campaign', campaignName: verification.campaignName, serial: verification.serial, numbers: verification.numbers, date: '26/10/2026', status: 'Atribuído' };
  await page.route('**/api/**', route => {
    if (route.request().url().endsWith('/verification')) return route.fulfill({ json: verification });
    return route.fulfill({ json: {
      participant: { id: 'person', name: 'Pessoa de teste', phone: '11999999999', verification: 'unverified' },
      campaign: { id: 'campaign', name: verification.campaignName, status: 'OPEN', drawDate: ticket.date, ticketPriceCents: 300, prizeCents: null },
      selectedIds: [], selectedTickets: [], availableCount: 0, selectionKey: 'key',
      orders: [{ id: 'order', participantId: 'person', campaignId: 'campaign', ticketIds: [id], tickets: [ticket], totalCents: 300, quantity: 1, paymentStatus: 'PAID', paymentRequired: true, createdAt: verification.issuedAt, status: 'registered', idempotencyKey: 'key' }],
    } });
  });
  await page.goto('/meus-bilhetes');
  const link = page.getByRole('link', { name: 'Conferir bilhete', exact: true });
  await expect(link).toHaveAttribute('href', new URL(`/conferir/${id}`, page.url()).href);
  await expect(page.locator('.ticket-validation svg')).toBeVisible();
  await expect(page.locator('.ticket-validation svg title')).toHaveText('QR Code do bilhete BIL-000001');
  await link.click();
  await expect(page.getByRole('heading', { name: 'Bilhete válido', exact: true })).toBeVisible();
});

test('QR destination works without login and refreshes the current ticket status', async ({ page }, testInfo) => {
  let cancelled = false, otherRequests = 0;
  await page.route('**/api/**', route => {
    if (!route.request().url().endsWith(`/tickets/${id}/verification`)) {
      otherRequests++; return route.fulfill({ status: 401, json: { message: 'Sem sessão' } });
    }
    return route.fulfill({ json: { ...verification, ...(cancelled ? { status: 'VOID' } : {}) } });
  });
  await page.goto(`/conferir/${id}`);
  await expect(page.getByRole('heading', { name: 'Bilhete válido', exact: true })).toBeVisible();
  await expect(page.getByLabel('Números registrados')).toContainText('0000');
  await expect(page.getByText('Campanha das três cidades', { exact: true })).toBeVisible();
  await expect(page.getByText('26/10/2026', { exact: true })).toBeVisible();
  await expect(page.getByText('Confirmado', { exact: true })).toBeVisible();
  await expect(page.locator('body')).toContainText('não comprova a titularidade');
  expect(otherRequests).toBe(0);
  await page.screenshot({ path: testInfo.outputPath('verification.png'), fullPage: true });
  cancelled = true;
  await page.getByRole('button', { name: 'Consultar novamente' }).click();
  await expect(page.getByRole('heading', { name: 'Bilhete cancelado', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Bilhete válido', exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

for (const [status, title] of [
  ['PENDING_PAYMENT', 'Pagamento não confirmado'], ['EXPIRED', 'Reserva expirada'],
  ['REVIEW_REQUIRED', 'Pagamento em conferência'], ['NOT_ISSUED', 'Bilhete não emitido'],
]) {
  test(`verification never confirms participation for ${status}`, async ({ page }) => {
    await page.route('**/api/**', route => route.fulfill({ json: { ...verification, status, paymentStatus: 'NOT_CONFIRMED' } }));
    await page.goto(`/conferir/${id}`);
    await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Bilhete válido', exact: true })).toHaveCount(0);
  });
}

test('missing tickets and connection errors never appear as valid tickets', async ({ page }) => {
  await page.route('**/api/**', route => route.fulfill({ status: 404, json: { message: 'Bilhete não encontrado' } }));
  await page.goto(`/conferir/${id}`);
  await expect(page.getByRole('alert')).toContainText('Bilhete não encontrado');
  await page.route('**/api/**', route => route.abort('failed'));
  await page.getByRole('button', { name: 'Consultar novamente' }).click();
  await expect(page.getByRole('alert')).toContainText('Não foi possível consultar');
  await expect(page.getByLabel('Números registrados')).toHaveCount(0);
});

test('invalid references are rejected without querying the API', async ({ page }) => {
  let requests = 0;
  await page.route('**/api/**', route => { requests++; return route.abort(); });
  await page.goto('/conferir/referencia-invalida');
  await expect(page.getByRole('alert')).toContainText('Bilhete não encontrado');
  expect(requests).toBe(0);
});
