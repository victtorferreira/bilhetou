import { test, expect } from '@playwright/test';
import { participantApi } from './participant-api';

async function register(page: import('@playwright/test').Page) {
  await participantApi(page, { zettpay: true });
  await page.goto('/');
  await page.getByLabel('Nome completo', { exact: true }).fill('Maria Silva');
  await page.getByLabel('WhatsApp', { exact: true }).fill('98999999999');
  await page.getByRole('button', { name: 'CONTINUAR', exact: true }).click();
  await expect(page).toHaveURL(/\/bilhetes$/);
}

test('expired reservation hides a stale Pix and offers no new charge', async ({ page }) => {
  await register(page);
  await page.route('**/api/participant/orders/security-order/payment', route => route.fulfill({ json: {
    order: { id: 'security-order', totalCents: 300, quantity: 1, paymentRequired: true, paymentStatus: 'EXPIRED', reservationExpiresAt: new Date(0).toISOString(), reservationExpired: true },
    payment: { id: 'payment', status: 'PENDING', amountCents: 300, qrCode: '000201-expired-code', lastError: null },
  } }));
  await page.goto('/pagamento/security-order');
  await expect(page.getByRole('heading', { name: 'Reserva expirada', exact: true })).toBeVisible();
  await expect(page.getByLabel('Pix Copia e Cola', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Gerar Pix para pagamento' })).toHaveCount(0);
});

test('paid late order asks for support without announcing ticket release', async ({ page }) => {
  await register(page);
  await page.route('**/api/participant/orders/security-order/payment', route => route.fulfill({ json: {
    order: { id: 'security-order', totalCents: 300, quantity: 1, paymentRequired: true, paymentStatus: 'REVIEW_REQUIRED', reservationExpiresAt: new Date(0).toISOString(), reservationExpired: true },
    payment: { id: 'payment', status: 'PAID', amountCents: 300, qrCode: null, lastError: null },
  } }));
  await page.goto('/pagamento/security-order');
  await expect(page.getByRole('heading', { name: 'Pagamento em conferência', exact: true })).toBeVisible();
  await expect(page.getByRole('alert')).toContainText('reembolso');
  await expect(page.getByRole('link', { name: 'Ver meus bilhetes', exact: true })).toHaveCount(0);
  await expect(page.getByLabel('Pix Copia e Cola', { exact: true })).toHaveCount(0);
});

test('Pix disappears locally at the deadline even when provider checks fail', async ({ page }) => {
  await register(page);
  await page.route('**/api/participant/orders/security-order/payment', route => route.fulfill({ json: {
    order: { id: 'security-order', totalCents: 300, quantity: 1, paymentRequired: true, paymentStatus: 'UNPAID', reservationExpiresAt: new Date(Date.now() + 1500).toISOString(), reservationExpired: false },
    payment: { id: 'payment', status: 'PENDING', amountCents: 300, qrCode: '000201-about-to-expire', lastError: null },
  } }));
  await page.route('**/api/participant/orders/security-order/payment/check', route => route.fulfill({ status: 503, json: { message: 'Consulta indisponível.' } }));
  await page.goto('/pagamento/security-order');
  await expect(page.getByLabel('Pix Copia e Cola', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Pix Copia e Cola', { exact: true })).toHaveCount(0, { timeout: 5000 });
  await expect(page.getByRole('heading', { name: 'Reserva expirada', exact: true })).toBeVisible();
});
