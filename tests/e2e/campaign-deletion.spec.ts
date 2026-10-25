import { test, expect, type Page } from '@playwright/test';

const campaign = { id: '00000000-0000-4000-8000-100000000001', name: 'Campanha antiga', status: 'CLOSED', ticketPriceCents: 300, closesAt: '2026-01-01T12:00:00Z', _count: { tickets: 100 } };

async function campaignRoutes(page: Page, failFirst = false) {
  let deleted = false;
  let attempts = 0;
  await page.route('**/api/admin/**', async route => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const send = (data: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) });
    if (path === '/api/admin/session') return send({ organizationId: 'organization', actor: 'operator' });
    if (path === '/api/admin/campaigns') return send(deleted ? [] : [campaign]);
    if (path === `/api/admin/campaigns/${campaign.id}` && request.method() === 'DELETE') {
      attempts++;
      if (failFirst && attempts === 1) return send({ message: 'Falha temporária ao excluir.' }, 503);
      deleted = true;
      return send({ id: campaign.id, deleted: true });
    }
    return send({ message: 'Rota não encontrada.' }, 404);
  });
  return () => attempts;
}

test('campaign deletion requires confirmation, supports cancel and persists after reload', async ({ page }) => {
  const attempts = await campaignRoutes(page);
  await page.goto('/admin/campanhas');
  await page.getByRole('button', { name: 'Excluir campanha Campanha antiga', exact: true }).click();
  const confirmation = page.getByRole('group', { name: 'Confirmar exclusão de Campanha antiga' });
  await expect(confirmation).toContainText('preservados no histórico');
  expect(attempts()).toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await confirmation.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await expect(confirmation).toHaveCount(0);
  expect(attempts()).toBe(0);
  await page.getByRole('button', { name: 'Excluir campanha Campanha antiga', exact: true }).click();
  await confirmation.getByRole('button', { name: 'Confirmar exclusão', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('excluída');
  await expect(page.getByRole('heading', { name: campaign.name, exact: true })).toHaveCount(0);
  expect(attempts()).toBe(1);
  await page.reload();
  await expect(page.getByText('Nenhuma campanha cadastrada no servidor.')).toBeVisible();
});

test('a failed deletion preserves the campaign and allows retry', async ({ page }) => {
  const attempts = await campaignRoutes(page, true);
  await page.goto('/admin/campanhas');
  await page.getByRole('button', { name: 'Excluir campanha Campanha antiga', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmar exclusão', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Falha temporária ao excluir.');
  await expect(page.getByRole('heading', { name: campaign.name, exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Confirmar exclusão', exact: true }).click();
  await expect(page.getByRole('heading', { name: campaign.name, exact: true })).toHaveCount(0);
  expect(attempts()).toBe(2);
});
