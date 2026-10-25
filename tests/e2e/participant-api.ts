import type { Page } from '@playwright/test';

// Browser-only fixtures; these are never imported by the application bundle.
export async function participantApi(page: Page, options: { zettpay?: boolean } = {}) {
  const campaign = { id: 'campaign', name: 'Campanha da comunidade', prizeCents: null, ticketPriceCents: 300, drawDate: 'Data a definir', status: 'OPEN' };
  const tickets = Array.from({ length: 4 }, (_, i) => ({ id: `ticket-${i}`, serial: `BIL-${String(i + 1).padStart(6, '0')}`, numbers: Array.from({ length: 4 }, (_, j) => String(1000 + i * 4 + j)), campaignId: campaign.id, campaignName: campaign.name, date: 'Data a definir', status: 'Disponível' }));
  let participant: { id: string; name: string; phone: string; verification: string } | null = null;
  let selectedIds: string[] = [];
  let key = 'selection-1';
  let sequence = 1;
  const orders: { id: string; participantId: string; campaignId: string; ticketIds: string[]; totalCents: number; createdAt: string; idempotencyKey: string; status: string; paymentStatus: string; paymentRequired?: boolean; quantity?: number; tickets: typeof tickets }[] = [];
  let pixCreated = false;
  const snapshot = () => ({ participant, campaign: participant ? campaign : null, selectedIds, selectedTickets: tickets.filter(t => selectedIds.includes(t.id)), availableCount: tickets.filter(t => !orders.some(o => o.ticketIds.includes(t.id))).length, selectionKey: key, orders: orders.map(order => options.zettpay && order.paymentStatus !== 'PAID' ? { ...order, ticketIds: [], tickets: [] } : order) });
  await page.route('**/api/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    let data: unknown;
    let status = 200;
    if (url.pathname.startsWith('/api/admin/')) { status = 401; data = { message: 'Entre com a credencial administrativa.' }; }
    else if (url.pathname.endsWith('/session') && request.method() === 'POST') {
      const input = request.postDataJSON(); participant = { id: 'person', name: input.name.trim().replace(/\s+/g, ' '), phone: input.phone.replace(/\D/g, ''), verification: 'unverified' }; data = snapshot();
    } else if (url.pathname.endsWith('/session')) data = snapshot();
    else if (url.pathname.endsWith('/selection')) {
      const input = request.postDataJSON(); selectedIds = input.ticketIds ?? tickets.filter(t => !orders.some(o => o.ticketIds.includes(t.id))).slice(0, input.quantity).map(t => t.id); key = `selection-${++sequence}`; data = snapshot();
    } else if (options.zettpay && /\/payment(\/check)?$/.test(url.pathname)) {
      const order = orders[0];
      if (url.pathname.endsWith('/check')) order.paymentStatus = 'PAID';
      else if (request.method() === 'POST') pixCreated = true;
      data = { order: { id: order.id, totalCents: order.totalCents, quantity: order.quantity, paymentRequired: true, paymentStatus: order.paymentStatus }, payment: pixCreated ? { id: 'payment', status: order.paymentStatus === 'PAID' ? 'PAID' : 'PENDING', amountCents: order.totalCents, qrCode: order.paymentStatus === 'PAID' ? null : '000201-pix-fixture', paidAt: null, lastError: null } : null };
    } else if (url.pathname.endsWith('/orders')) {
      const input = request.postDataJSON();
      if (!orders.some(o => o.idempotencyKey === input.idempotencyKey)) orders.unshift({ id: `order-${orders.length + 1}`, participantId: participant!.id, campaignId: campaign.id, ticketIds: [...selectedIds], totalCents: selectedIds.length * campaign.ticketPriceCents, createdAt: new Date().toISOString(), idempotencyKey: input.idempotencyKey, status: 'registered', paymentStatus: 'UNPAID', paymentRequired: options.zettpay ?? false, quantity: selectedIds.length, tickets: tickets.filter(t => selectedIds.includes(t.id)).map(t => ({ ...t, status: 'Atribuído' })) });
      selectedIds = []; key = `selection-${++sequence}`; data = snapshot();
    } else if (url.pathname.endsWith('/tickets')) {
      const query = url.searchParams.get('query')?.toLowerCase() || '';
      const items = tickets.filter(t => !orders.some(o => o.ticketIds.includes(t.id)) && (url.searchParams.get('selectedOnly') !== 'true' || selectedIds.includes(t.id)) && (t.serial.toLowerCase().includes(query) || t.numbers.includes(query)));
      data = { items, total: items.length, page: 1, totalPages: 1 };
    } else if (url.pathname.endsWith('/results')) data = [];
    else { status = 404; data = { message: 'Rota não encontrada.' }; }
    await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) });
  });
}
