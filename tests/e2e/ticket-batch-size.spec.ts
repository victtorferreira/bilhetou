import { test, expect } from '@playwright/test';

test('admin can preview and confirm a full campaign of 2500 tickets in one batch', async ({ page }) => {
  const campaignId = '00000000-0000-4000-8000-100000000001';
  const tickets = Array.from({ length: 2500 }, (_, i) => ({
    id: `ticket-${i}`, serial: `BIL-${String(i + 1).padStart(6, '0')}`,
    numbers: Array.from({ length: 4 }, (_, j) => String(i * 4 + j).padStart(4, '0')),
  }));
  let confirmed = false;
  await page.route('**/api/admin/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/session')) return route.fulfill({ json: { organizationId: 'org', actor: 'admin' } });
    if (path.endsWith('/campaigns')) return route.fulfill({ json: [{ id: campaignId, name: 'Campanha', status: 'OPEN', ticketPriceCents: 300, _count: { tickets: 0 } }] });
    if (path.endsWith('/preview')) {
      expect(route.request().postDataJSON()).toMatchObject({ campaignId, quantity: 2500, uniqueNumbers: true });
      return route.fulfill({ json: { campaignId, token: 'signed-preview', expiresAt: '2099-01-01', tickets } });
    }
    if (path.endsWith('/confirm')) {
      expect(route.request().postDataJSON()).toEqual({ token: 'signed-preview' });
      confirmed = true;
      return route.fulfill({ json: { tickets, created: 2500 } });
    }
    if (path.endsWith('/ticket-statistics')) return route.fulfill({ json: { possible: 10000, used: confirmed ? 10000 : 0, available: confirmed ? 0 : 10000, tickets: confirmed ? 2500 : 0, remainingTickets: confirmed ? 0 : 2500 } });
    if (path.endsWith('/tickets')) return route.fulfill({ json: { items: [], total: confirmed ? 2500 : 0, page: 1, totalPages: confirmed ? 125 : 1 } });
    return route.fulfill({ status: 404, json: { message: 'Rota não encontrada.' } });
  });
  await page.goto('/admin/bilhetes');
  const quantity = page.getByLabel('Quantidade de bilhetes', { exact: true });
  await expect(quantity).toBeEnabled();
  await expect(quantity).toHaveAttribute('max', '2500');
  await quantity.fill('2500');
  await page.getByRole('button', { name: 'Gerar prévia', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Prévia de 2500 bilhete(s)' })).toBeVisible();
  await expect(page.locator('.batch-preview tbody tr')).toHaveCount(10);
  await page.getByRole('button', { name: 'Adicionar 2500 bilhete(s) ao estoque', exact: true }).click();
  await expect(page.getByText('2500 bilhete(s) criado(s) e adicionado(s) ao estoque.', { exact: true })).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
});
