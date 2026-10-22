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

test('admin login preserves its cookie across verification, dashboard and reload', async ({ page }) => {
  let dashboardRequests = 0;
  await page.route('**/api/admin/**', async route => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const authenticated = (await request.allHeaders()).cookie?.includes('bilhetou_admin=browser-session');
    const json = (body: unknown, status = 200, headers: Record<string, string> = {}) => route.fulfill({ status, contentType: 'application/json', headers, body: JSON.stringify(body) });
    if (path === '/api/admin/session' && request.method() === 'POST') return json({ authenticated: true }, 201, { 'set-cookie': 'bilhetou_admin=browser-session; HttpOnly; SameSite=Strict; Path=/api/admin' });
    if (!authenticated) return json({ message: 'Entre com a credencial administrativa.' }, 401);
    if (path === '/api/admin/session') return json({ organizationId: 'organization', actor: 'operator' });
    if (path === '/api/admin/dashboard') { dashboardRequests++; return json({ tickets: 10, available: 10, assigned: 0, campaigns: 1, orders: 0, participants: 1 }); }
    if (path.endsWith('/logout')) return json({ authenticated: false }, 201, { 'set-cookie': 'bilhetou_admin=; HttpOnly; Path=/api/admin; Max-Age=0' });
    return json({ message: 'Rota não encontrada.' }, 404);
  });
  await page.goto('/admin');
  await page.getByLabel('Credencial', { exact: true }).fill('a'.repeat(40));
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Visão geral' })).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Visão geral' })).toBeVisible();
  expect(dashboardRequests).toBeGreaterThanOrEqual(2);
  await page.getByRole('button', { name: 'Sair da administração' }).click();
  await expect(page.getByRole('heading', { name: 'Acesso administrativo' })).toBeVisible();
});

test('successful credential response without a usable session does not open the dashboard', async ({ page }) => {
  let dashboardRequests = 0;
  await page.route('**/api/admin/**', async route => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path === '/api/admin/dashboard') dashboardRequests++;
    const login = path === '/api/admin/session' && request.method() === 'POST';
    await route.fulfill({ status: login ? 201 : 401, contentType: 'application/json', body: JSON.stringify(login ? { authenticated: true } : { message: 'Entre com a credencial administrativa.' }) });
  });
  await page.goto('/admin');
  await page.getByLabel('Credencial', { exact: true }).fill('a'.repeat(40));
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Entre com a credencial administrativa.');
  await expect(page.getByRole('heading', { name: 'Acesso administrativo' })).toBeVisible();
  expect(dashboardRequests).toBe(0);
});
