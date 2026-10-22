import { test, expect } from '@playwright/test';
import { participantApi } from './participant-api';

test('administrative stock requires a server session and shows no local creation mode', async ({ page }) => {
  await participantApi(page);
  await page.goto('/admin/bilhetes');
  await expect(page.getByRole('heading', { name: 'Acesso administrativo' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Gerar prévia' })).toHaveCount(0);
  await expect(page.locator('body')).not.toContainText(/demonstrativ|prévia local|campanha de teste/i);
});
test('anonymous participant cannot access private tickets', async ({ page }) => {
  await participantApi(page);
  await page.goto('/meus-bilhetes');
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { name: /Bem-vindo ao Bilhetou/ })).toBeVisible();
});
