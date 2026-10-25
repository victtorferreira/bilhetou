import { test, expect, type Page } from '@playwright/test';

// A long payload catches truncated selection and loss of leading zeros.
const pixCode = '00020101021226800014br.gov.bcb.pix2560pagamentos.example/pix/0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ52040000530398654043.005802BR5913LOJA BILHETOU6009SAO PAULO62070503***6304ABCD';

async function pendingPix(page: Page) {
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname;
    const session = { participant: { id: 'person', name: 'Maria Silva', phone: '98999999999', verification: 'unverified' }, campaign: null, availableCount: 0, selectedIds: [], selectedTickets: [], selectionKey: '', orders: [] };
    const checkout = { order: { id: 'order-1', totalCents: 300, quantity: 1, paymentRequired: true, paymentStatus: 'UNPAID' }, payment: { id: 'payment', status: 'PENDING', amountCents: 300, qrCode: pixCode, paidAt: null, lastError: null } };
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify(path.endsWith('/session') ? session : checkout) });
  });
  await page.goto('/pagamento/order-1');
  await expect(page.getByLabel('Pix Copia e Cola', { exact: true })).toHaveValue(pixCode);
}

test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

test('copies the entire Pix payload to the real browser clipboard', async ({ page }) => {
  await pendingPix(page);
  await page.getByRole('button', { name: 'Copiar código Pix', exact: true }).click();
  await expect(page.locator('#pix-copy-feedback')).toHaveText('Código Pix copiado.');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(pixCode);
});

for (const mode of ['missing', 'denied'] as const) {
  test(`copies with the browser compatibility path when Clipboard API is ${mode}`, async ({ page }) => {
    await page.addInitScript(mode => {
      const clipboard = navigator.clipboard;
      Object.defineProperty(window, '__readClipboard', { value: () => clipboard.readText() });
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: mode === 'missing' ? undefined : { writeText: () => Promise.reject(new DOMException('Blocked', 'NotAllowedError')) } });
    }, mode);
    await pendingPix(page);
    await page.getByRole('button', { name: 'Copiar código Pix', exact: true }).click();
    await expect(page.locator('#pix-copy-feedback')).toHaveText('Código Pix copiado.');
    const copied = await page.evaluate(() => (window as unknown as { __readClipboard: () => Promise<string> }).__readClipboard());
    expect(copied).toBe(pixCode);
  });
}

test('keeps the complete code selected and explains manual copy if all automatic paths are blocked', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: () => Promise.reject(new DOMException('Blocked', 'NotAllowedError')) } });
    document.execCommand = () => false;
  });
  await pendingPix(page);
  await page.getByRole('button', { name: 'Copiar código Pix', exact: true }).click();
  await expect(page.locator('#pix-copy-feedback')).toContainText('A cópia automática foi bloqueada.');
  await expect(page.locator('#pix-copy-feedback')).not.toContainText('Código Pix copiado.');
  const field = page.getByLabel('Pix Copia e Cola', { exact: true });
  await expect(field).toBeFocused();
  expect(await field.evaluate((field: HTMLTextAreaElement) => field.value.slice(field.selectionStart, field.selectionEnd))).toBe(pixCode);
  await page.getByRole('button', { name: 'Selecionar código', exact: true }).click();
  await expect(field).toBeFocused();
  expect(await field.evaluate((field: HTMLTextAreaElement) => [field.selectionStart, field.selectionEnd])).toEqual([0, pixCode.length]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
