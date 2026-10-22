import { test, expect, type Page } from '@playwright/test';
import { participantApi } from './participant-api';

async function register(page: Page) {
  await page.goto('/');
  await page.getByLabel('Nome completo', { exact: true }).fill('Maria da Silva');
  await page.getByLabel('WhatsApp', { exact: true }).fill('98999999999');
  await page.getByRole('button', { name: 'CONTINUAR', exact: true }).click();
  await expect(page).toHaveURL(/\/bilhetes$/);
}
async function proceed(page: Page) {
  await page.locator(await page.locator('.selection-bar').isVisible() ? '.selection-bar' : '.selection-summary').getByRole('link', { name: 'PROSSEGUIR' }).click();
}
test.beforeEach(async ({ page }) => participantApi(page));

test('registers an order without claiming payment or showing trial content', async ({ page }) => {
  await register(page);
  await expect(page.locator('.large-stepper output')).toContainText('1');
  await proceed(page);
  await expect(page).toHaveURL(/\/resumo$/);
  await page.getByRole('link', { name: 'PROSSEGUIR', exact: true }).click();
  await expect(page).toHaveURL(/\/confirmar-pedido$/);
  await page.getByRole('button', { name: 'CONFIRMAR PEDIDO', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Pedido registrado!' })).toBeVisible();
  await expect(page.getByText('Pagamento não confirmado.', { exact: false })).toBeVisible();
  await expect(page.locator('.ticket-card')).toHaveCount(1);
  await expect(page.locator('.ticket-validation svg')).toHaveCount(1);
  await expect(page.locator('body')).not.toContainText(/demonstrativ|simulação|fictício|campanha de teste/i);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test('manual selection uses the server stock and preserves four-digit searches', async ({ page }) => {
  await register(page);
  await page.getByRole('button', { name: 'Escolher bilhetes', exact: true }).click();
  await expect(page.locator('.selection-ticket-grid .ticket-card')).toHaveCount(4);
  await page.getByLabel('Buscar bilhete por serial ou número').fill('1004');
  await expect(page.locator('.selection-ticket-grid .ticket-card')).toHaveCount(1);
  await expect(page.locator('.selection-ticket-grid')).toContainText('BIL-000002');
});
