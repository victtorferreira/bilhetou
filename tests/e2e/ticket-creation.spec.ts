import { test, expect } from '@playwright/test';

test('admin previews, discards, creates and exports a local batch without duplicate serials', async ({ page }, info) => {
  await page.goto('/admin/bilhetes');
  if (info.project.name === 'mobile') await page.setViewportSize({ width: 320, height: 740 });
  await page.getByLabel('Quantidade de bilhetes', { exact: true }).fill('0');
  await page.getByRole('button', { name: 'Gerar prévia', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('entre 1 e 1.000');
  await page.getByLabel('Quantidade de bilhetes', { exact: true }).fill('5');
  await page.getByLabel('Não repetir números entre os bilhetes da campanha').check();
  await page.getByRole('button', { name: 'Gerar prévia', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Prévia de 5 bilhete(s)' })).toBeVisible();
  await expect(page.getByText('1 de 3 · 50 registros', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Descartar e alterar' }).click();
  await expect(page.locator('.batch-preview')).toHaveCount(0);
  await page.getByRole('button', { name: 'Gerar prévia', exact: true }).click();
  await page.getByRole('button', { name: 'Adicionar 5 bilhete(s) ao estoque', exact: true }).click();
  await expect(page.locator('.batch-success')).toContainText('5 bilhete(s) criado(s)');
  await expect(page.getByText('1 de 3 · 55 registros', { exact: true })).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Baixar lote em CSV' }).click();
  expect((await download).suggestedFilename()).toBe('bilhetou-BIL-000001-5-bilhetes.csv');
  await page.reload();
  await page.getByLabel('Buscar no estoque demonstrativo').fill('BIL-');
  await expect(page.getByText('1 de 1 · 5 registros', { exact: true })).toBeVisible();
  await page.getByLabel('Quantidade de bilhetes', { exact: true }).fill('1');
  await page.getByRole('button', { name: 'Gerar prévia', exact: true }).click();
  await expect(page.locator('.batch-preview')).toContainText('BIL-000006');
});

test('API mode explains an unavailable endpoint and does not save locally', async ({ page }) => {
  await page.route('**/api/demo/ticket-batches/campaigns', route => route.fulfill({ status: 404, contentType: 'application/json', body: '{}' }));
  await page.goto('/admin/bilhetes');
  await page.getByRole('button', { name: 'API local · PostgreSQL', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('ENABLE_LOCAL_DEMO_TICKET_CREATION=true');
  await expect(page.getByText('1 de 3 · 50 registros', { exact: true })).toBeVisible();
});

test('API creates a batch in PostgreSQL and refreshes its paginated stock', async ({ page }, info) => {
  test.skip(!process.env.TEST_TICKET_API, 'Requires the local demo API and a disposable database.');
  await page.goto('/admin/bilhetes');
  if (info.project.name === 'mobile') await page.setViewportSize({ width: 320, height: 740 });
  await page.getByRole('button', { name: 'API local · PostgreSQL', exact: true }).click();
  await expect(page.locator('#api-campaign')).not.toHaveValue('');
  await expect(page.locator('.api-stock')).toContainText('registros no banco');
  await page.getByLabel('Quantidade de bilhetes', { exact: true }).fill('3');
  const prefix = `WEB${Date.now().toString(36)}`.toUpperCase();
  await page.getByLabel('Prefixo do serial', { exact: true }).fill(prefix);
  await page.getByLabel('Não repetir números entre os bilhetes da campanha').check();
  await page.getByRole('button', { name: 'Gerar prévia', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Prévia de 3 bilhete(s)' })).toBeVisible();
  await page.getByRole('button', { name: 'Adicionar 3 bilhete(s) ao estoque', exact: true }).click();
  await expect(page.locator('.batch-success')).toContainText('Gravados pela API no PostgreSQL.');
  await page.getByLabel('Buscar no estoque da API').fill(prefix);
  await expect(page.locator('.api-stock tbody tr')).toHaveCount(3);
  await expect(page.locator('.api-stock')).toContainText(`${prefix}-000001`);
  await expect(page.getByText('1 de 3 · 50 registros', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `artifacts/criacao-bilhetes-api-${info.project.name}.png`, fullPage: true });
});
