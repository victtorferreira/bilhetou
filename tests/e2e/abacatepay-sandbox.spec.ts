import { test, expect } from '@playwright/test';

test('administrator creates a sandbox Pix and sees payment confirmed after simulation', async ({ page }) => {
  let paid = false;
  let creates = 0;
  await page.route('**/api/**', async route => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    expect(request.headers().authorization).toBeUndefined();
    let body: unknown = {};
    if (path === '/api/admin/session') body = { organizationId: 'test-org', actor: 'test' };
    else if (path.endsWith('/sandbox') && request.method() === 'GET') body = { enabled: true, environment: 'sandbox', amountCents: 200 };
    else if (path.endsWith('/sandbox') && request.method() === 'POST') {
      creates++;
      body = { id: 'pix_char_e2e', status: 'PENDING', amountCents: 200, devMode: true, brCode: '000201-sandbox-test', expiresAt: '2030-01-01T12:00:00Z', token: 'signed-test-reference' };
    } else if (path.endsWith('/sandbox/simulate')) {
      expect(request.postDataJSON()).toEqual({ token: 'signed-test-reference' });
      paid = true;
      body = { id: 'pix_char_e2e', status: 'PAID', devMode: true };
    } else if (path.endsWith('/sandbox/check')) body = { id: 'pix_char_e2e', status: paid ? 'PAID' : 'PENDING', devMode: true };
    else { await route.fulfill({ status: 404, json: { message: 'Unexpected API call' } }); return; }
    await route.fulfill({ json: body });
  });
  await page.goto('/admin/pagamentos-teste');
  await expect(page.getByRole('heading', { name: 'Teste de pagamento Pix' })).toBeVisible();
  await page.getByRole('button', { name: 'Gerar Pix de teste de R$ 2,00' }).click();
  await expect(page.getByText('Aguardando simulação', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Pix Copia e Cola de teste')).toHaveValue('000201-sandbox-test');
  await expect(page.locator('.sandbox-qr svg')).toBeVisible();
  await page.getByRole('button', { name: 'Simular pagamento', exact: true }).click();
  await expect(page.getByText('Pagamento simulado confirmado', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Simular pagamento', exact: true })).toBeDisabled();
  expect(creates).toBe(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('disabled sandbox explains configuration and offers no payment actions', async ({ page }) => {
  await page.route('**/api/**', async route => {
    if (new URL(route.request().url()).pathname === '/api/admin/session') await route.fulfill({ json: { organizationId: 'org' } });
    else await route.fulfill({ status: 503, json: { message: 'Teste AbacatePay desativado.' } });
  });
  await page.goto('/admin/pagamentos-teste');
  await expect(page.getByRole('alert')).toContainText('Teste AbacatePay desativado.');
  await expect(page.getByRole('button', { name: 'Gerar Pix de teste de R$ 2,00' })).toHaveCount(0);
});
