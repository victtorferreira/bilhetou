import { test, expect } from '@playwright/test';

test('real Pix page creates and checks a persisted charge with no sandbox simulation action', async ({ page }) => {
  const charge = { id: '12345678-1234-4234-8234-123456789012', description: 'Produto da loja', amountCents: 200, environment: 'production', status: 'PENDING', brCode: '000201-real-pix-test', createdAt: '2026-10-23T12:00:00Z', expiresAt: '2030-01-01T12:00:00Z', paidAt: null, lastError: null, providerId: 'pix_char_e2e' };
  let exists = false;
  await page.route('**/api/**', async route => {
    const req = route.request();
    const path = new URL(req.url()).pathname;
    expect(req.headers().authorization).toBeUndefined();
    if (path.endsWith('/admin/session')) return route.fulfill({ json: { organizationId: 'org', actor: 'test' } });
    if (path.endsWith('/pix/configuration')) return route.fulfill({ json: { enabled: true, environment: 'production', minAmountCents: 100, maxAmountCents: 1000000 } });
    if (path.endsWith('/pix') && req.method() === 'GET') return route.fulfill({ json: exists ? [charge] : [] });
    if (path.endsWith('/pix') && req.method() === 'POST') {
      const body = req.postDataJSON();
      expect(body.amountCents).toBe(200); expect(body.description).toBe('Produto da loja');
      expect(body.requestKey).toMatch(/^[\da-f-]{36}$/);
      exists = true; return route.fulfill({ json: charge });
    }
    if (path.endsWith('/check')) { charge.status = 'PAID'; return route.fulfill({ json: charge }); }
    return route.fulfill({ json: charge });
  });
  await page.goto('/admin/pagamentos');
  await expect(page.getByText('PAGAMENTO REAL', { exact: true })).toBeVisible();
  await page.getByLabel('Descrição do produto ou serviço').fill('Produto da loja');
  await page.getByLabel('Valor (R$)').fill('2,00');
  await page.getByRole('button', { name: 'Gerar Pix real', exact: true }).click();
  await expect(page.getByLabel('Pix Copia e Cola', { exact: true })).toHaveValue('000201-real-pix-test');
  await expect(page.getByRole('button', { name: 'Simular pagamento', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Consultar pagamento', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Pagamento confirmado');
  await expect(page.getByLabel('Pix Copia e Cola', { exact: true })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('table')).toContainText('Produto da loja');
  await expect(page.getByRole('table')).toContainText('Pagamento confirmado');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('creation retry preserves request key and original amount after a network failure', async ({ page }) => {
  const requests: unknown[] = [];
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/admin/session')) return route.fulfill({ json: { organizationId: 'org' } });
    if (path.endsWith('/configuration')) return route.fulfill({ json: { enabled: true, environment: 'production', minAmountCents: 100, maxAmountCents: 1000000 } });
    if (route.request().method() === 'POST') {
      requests.push(route.request().postDataJSON());
      return route.fulfill({ status: 502, json: { message: 'Falha temporária' } });
    }
    return route.fulfill({ json: [] });
  });
  await page.goto('/admin/pagamentos');
  await page.getByLabel('Descrição do produto ou serviço').fill('Produto da loja');
  await page.getByRole('button', { name: 'Gerar Pix real', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Falha temporária');
  await expect(page.getByLabel('Valor (R$)')).toBeDisabled();
  await page.getByRole('button', { name: 'Consultar solicitação anterior', exact: true }).click();
  await expect.poll(() => requests.length).toBe(2);
  expect(requests[1]).toEqual(requests[0]);
});
