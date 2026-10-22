import { test, expect, type Page } from '@playwright/test';

async function register(page: Page) {
  await page.goto('/');
  await page.getByLabel('Nome completo', { exact: true }).fill('  Maria   da Silva  ');
  await page.getByLabel('WhatsApp', { exact: true }).fill('98999999999');
  await page.getByRole('button', { name: 'CONTINUAR', exact: true }).click();
  await expect(page).toHaveURL(/\/bilhetes$/);
}

async function proceed(page: Page) {
  const mobile = await page.locator('.selection-bar').isVisible();
  await page.locator(mobile ? '.selection-bar' : '.selection-summary').getByRole('link', { name: 'PROSSEGUIR' }).click();
}

async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
}

test('registration is the first page, validates fields, and preserves dark mode', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Bem-vindo ao Bilhetou!/ })).toBeVisible();
  await expect(page.locator('a[href^="/admin"]')).toHaveCount(0);
  await page.getByRole('button', { name: 'CONTINUAR', exact: true }).click();
  await expect(page.getByText('Informe seu nome completo, com pelo menos dois nomes.')).toBeVisible();
  await page.getByLabel('Nome completo', { exact: true }).fill('Maria Silva');
  await page.getByLabel('WhatsApp', { exact: true }).fill('20999999999');
  await page.getByRole('button', { name: 'CONTINUAR', exact: true }).click();
  await expect(page.getByText(/Informe um WhatsApp válido/)).toBeVisible();
  const toggle = page.getByRole('button', { name: 'Modo escuro' });
  await toggle.click();
  const theme = await page.locator('html').getAttribute('data-theme');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme!);
  await noOverflow(page);
});

test('quantity checkout, back navigation, confirmation, QR and session restoration', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await register(page);
  await expect(page.getByRole('heading', { name: 'Olá, Maria! ✦' })).toBeVisible();
  await page.getByRole('button', { name: '5 bilhetes', exact: true }).click();
  await noOverflow(page);
  await proceed(page);
  await expect(page).toHaveURL(/\/resumo$/);
  await expect(page.getByText('Maria da Silva', { exact: true })).toBeVisible();
  await expect(page.getByText('(98) 9****-9999', { exact: true })).toBeVisible();
  await expect(page.locator('.ticket-card')).toHaveCount(5);
  await noOverflow(page);
  await page.getByRole('link', { name: 'Voltar e alterar' }).click();
  await expect(page.locator('.large-stepper output')).toContainText('5');
  await page.getByRole('button', { name: '10 bilhetes', exact: true }).click();
  await proceed(page);
  await page.getByRole('link', { name: 'PROSSEGUIR', exact: true }).click();
  await expect(page).toHaveURL(/\/pagamento$/);
  await expect(page.getByText('Esta é uma demonstração da plataforma. Nenhum pagamento será realizado.')).toBeVisible();
  await noOverflow(page);
  await page.getByRole('button', { name: 'CONFIRMAR SIMULAÇÃO', exact: true }).click();
  await expect(page).toHaveURL(/\/confirmacao$/);
  await expect(page.getByRole('heading', { name: 'Simulação concluída!' })).toBeVisible();
  await expect(page.locator('.ticket-card')).toHaveCount(10);
  await expect(page.locator('.ticket-validation svg')).toHaveCount(10);
  await noOverflow(page);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Simulação concluída!' })).toBeVisible();
  await page.getByRole('link', { name: /Visualizar meus bilhetes/ }).click();
  await expect(page).toHaveURL(/\/meus-bilhetes$/);
  await expect(page.locator('.ticket-card')).toHaveCount(10);
  const state = await page.evaluate(() => JSON.parse(sessionStorage.getItem('dia-de-sorte-demo-session-v1')!));
  expect(state.orders).toHaveLength(1);
  expect(new Set(state.orders[0].ticketIds).size).toBe(10);
  await page.getByRole('link', { name: 'Escolher mais bilhetes' }).click();
  await expect(page.getByText('40 disponíveis nesta sessão')).toBeVisible();
  await noOverflow(page);
  expect(errors).toEqual([]);
});

test('manual selection, pagination, filtering, empty guard and one ticket order', async ({ page }) => {
  await register(page);
  await page.getByRole('button', { name: 'Escolher bilhetes', exact: true }).click();
  await expect(page.locator('.selection-ticket-grid .ticket-card')).toHaveCount(12);
  await page.getByRole('button', { name: 'Remover DS-004829', exact: true }).click();
  const mobile = await page.locator('.selection-bar').isVisible();
  await expect(page.locator(mobile ? '.selection-bar' : '.selection-summary').getByRole('button')).toBeDisabled();
  await page.goto('/resumo');
  await expect(page).toHaveURL(/\/bilhetes$/);
  // A new selection page defaults to one ticket. Remove it before manual selection.
  await page.getByRole('button', { name: 'Escolher bilhetes', exact: true }).click();
  await page.getByRole('button', { name: 'Remover DS-004829', exact: true }).click();
  await page.getByRole('button', { name: 'Selecionar DS-004830', exact: true }).click();
  await page.getByRole('button', { name: 'Selecionar DS-004831', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Só selecionados' }).check();
  await expect(page.locator('.selection-ticket-grid .ticket-card')).toHaveCount(2);
  await page.getByRole('button', { name: 'Remover DS-004831', exact: true }).click();
  await expect(page.locator('.selection-ticket-grid .ticket-card')).toHaveCount(1);
  await page.getByRole('checkbox', { name: 'Só selecionados' }).uncheck();
  await page.getByRole('button', { name: 'Próxima página', exact: true }).click();
  await expect(page.getByText('Página 2 de 5')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Selecionar DS-004841' })).toBeVisible();
  await page.getByLabel('Buscar bilhete por serial ou número').fill('DS-004830');
  await expect(page.locator('.selection-ticket-grid .ticket-card')).toHaveCount(1);
  await noOverflow(page);
  await proceed(page);
  await expect(page.locator('.ticket-card')).toHaveCount(1);
  await page.getByRole('link', { name: 'PROSSEGUIR', exact: true }).click();
  await page.getByRole('button', { name: 'CONFIRMAR SIMULAÇÃO', exact: true }).click();
  await expect(page).toHaveURL(/\/confirmacao$/);
  await expect(page.locator('.ticket-card')).toHaveCount(1);
});

test('direct routes require registration, admin is separate, and CSV demo is preserved', async ({ page }) => {
  for (const route of ['/bilhetes', '/resumo', '/pagamento', '/confirmacao', '/meus-bilhetes', '/resultados']) {
    await page.goto(route);
    await expect(page).toHaveURL('http://127.0.0.1:5173/');
  }
  for (const route of ['/admin', '/admin/campanhas', '/admin/bilhetes', '/admin/vendedores', '/admin/participantes', '/admin/relatorios']) {
    await page.goto(route);
    await expect(page.getByText('Administração demonstrativa · sem acesso a dados reais')).toBeVisible();
    await expect(page.locator('.public-app')).toHaveCount(0);
    await noOverflow(page);
  }
  await page.goto('/admin/importacao');
  await page.locator('input[type="file"]').setInputFiles({ name: 'demo.csv', mimeType: 'text/csv', buffer: Buffer.from('serial,number1,number2,number3,number4\nCSV-0001,1111,2222,3333,4444') });
  await page.getByRole('button', { name: 'Importar na sessão demonstrativa' }).click();
  await expect(page.getByText('1 bilhete(s) importado(s) para a demonstração.')).toBeVisible();
  await page.goto('/');
  await expect(page.locator('a[href^="/admin"]')).toHaveCount(0);
});

test('new participant and new browser context cannot view another session tickets', async ({ page, browser }) => {
  await register(page);
  await proceed(page);
  await page.getByRole('link', { name: 'PROSSEGUIR', exact: true }).click();
  await page.getByRole('button', { name: 'CONFIRMAR SIMULAÇÃO', exact: true }).click();
  await expect(page).toHaveURL(/\/confirmacao$/);
  const otherContext = await browser.newContext();
  const otherPage = await otherContext.newPage();
  await otherPage.goto('http://127.0.0.1:5173/meus-bilhetes');
  await expect(otherPage).toHaveURL('http://127.0.0.1:5173/');
  await otherContext.close();
  await page.goto('/');
  await page.getByLabel('Nome completo', { exact: true }).fill('Outra Pessoa');
  await page.getByRole('button', { name: 'CONTINUAR', exact: true }).click();
  await page.getByRole('link', { name: 'Meus bilhetes', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Seus primeiros bilhetes esperam por você' })).toBeVisible();
});

test('small screens and dark theme stay readable throughout the flow', async ({ page }, testInfo) => {
  await page.goto('/');
  if (testInfo.project.name === 'mobile') {
    await page.setViewportSize({ width: 320, height: 740 });
  }
  await noOverflow(page);
  await page.screenshot({ path: `artifacts/cadastro-${testInfo.project.name}.png`, fullPage: true });
  await register(page);
  await page.screenshot({ path: `artifacts/selecao-${testInfo.project.name}.png`, fullPage: true });
  if (await page.locator('html').getAttribute('data-theme') !== 'dark') await page.getByRole('button', { name: 'Modo escuro' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await noOverflow(page);
  await proceed(page);
  await noOverflow(page);
  await page.getByRole('link', { name: 'PROSSEGUIR', exact: true }).click();
  await noOverflow(page);
  await page.getByRole('button', { name: 'CONFIRMAR SIMULAÇÃO', exact: true }).click();
  await expect(page).toHaveURL(/\/confirmacao$/);
  await noOverflow(page);
  await page.screenshot({ path: `artifacts/confirmacao-escuro-${testInfo.project.name}.png`, fullPage: true });
  await page.goto('/meus-bilhetes');
  await noOverflow(page);
  await page.goto('/resultados');
  await noOverflow(page);
  await page.goto('/admin');
  await noOverflow(page);
});
