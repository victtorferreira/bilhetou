import { test, expect } from '@playwright/test';
import { participantApi } from './participant-api';

test('participant checkout asks for payer data, resumes pending Pix after reload and releases tickets after confirmation', async ({ page }) => {
  await participantApi(page, { zettpay: true });
  await page.goto('/');
  await page.getByLabel('Nome completo', { exact: true }).fill('Maria da Silva');
  await page.getByLabel('WhatsApp', { exact: true }).fill('98999999999');
  await page.getByRole('button', { name: 'CONTINUAR', exact: true }).click();
  await expect(page).toHaveURL(/\/bilhetes$/);
  await page.locator(await page.locator('.selection-bar').isVisible() ? '.selection-bar' : '.selection-summary').getByRole('link', { name: 'PROSSEGUIR' }).click();
  await page.getByRole('link', { name: 'PROSSEGUIR', exact: true }).click();
  await page.getByRole('button', { name: 'CONFIRMAR PEDIDO', exact: true }).click();
  await expect(page).toHaveURL(/\/pagamento\/order-1$/);
  await expect(page.getByRole('heading', { name: 'Dados do pagador' })).toBeVisible();
  await page.getByRole('link', { name: 'Voltar à minha área', exact: true }).click();
  await expect(page.locator('.ticket-card')).toHaveCount(0);
  await page.getByRole('link', { name: 'Pagar ou consultar Pix' }).click();
  const email = page.getByLabel('E-mail do pagador');
  const documentField = page.getByLabel('CPF ou CNPJ do pagador');
  await expect(email).toHaveAttribute('type', 'email');
  await expect(email).toHaveAttribute('inputmode', 'email');
  await expect(documentField).toHaveAttribute('type', 'text');
  await expect(documentField).toHaveAttribute('inputmode', 'numeric');
  await email.fill('test@example.com');
  await documentField.fill('04252011000110');
  await expect(documentField).toHaveValue('04.252.011/0001-10');
  await documentField.fill('11144477735');
  await expect(documentField).toHaveValue('111.444.777-35');
  for (const field of [email, documentField]) {
    const bounds = await field.boundingBox();
    expect(bounds?.height).toBeGreaterThanOrEqual(48);
    expect(await field.evaluate(element => getComputedStyle(element).fontSize)).toBe('16px');
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const paymentRequest = page.waitForRequest(request => request.method() === 'POST' && request.url().endsWith('/payment'));
  await page.getByRole('button', { name: 'Gerar Pix para pagamento', exact: true }).click();
  expect((await paymentRequest).postDataJSON()).toEqual({ payerEmail: 'test@example.com', payerDocument: '11144477735' });
  await expect(page.getByLabel('Pix Copia e Cola', { exact: true })).toHaveValue('000201-pix-fixture');
  await page.reload();
  await expect(page.getByLabel('Pix Copia e Cola', { exact: true })).toHaveValue('000201-pix-fixture');
  await expect(page.getByLabel('CPF ou CNPJ do pagador')).toHaveCount(0);
  await page.getByRole('button', { name: 'Consultar pagamento', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Pagamento confirmado!' })).toBeVisible();
  await page.getByRole('link', { name: 'Ver meus bilhetes', exact: true }).click();
  await expect(page.locator('.ticket-card')).toHaveCount(1);
  await expect(page.getByText('AGUARDANDO PAGAMENTO', { exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
