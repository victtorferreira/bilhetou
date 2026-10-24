import { apiRequest } from './api';

export type SandboxStatus = 'PENDING' | 'PAID' | 'EXPIRED' | 'CANCELLED';
export interface SandboxCharge {
  id: string; status: SandboxStatus; amountCents: number; devMode: true;
  brCode: string; expiresAt: string; token: string;
}
const path = '/admin/payments/abacatepay/sandbox';
export const abacatepaySandbox = {
  configuration: () => apiRequest<{ enabled: true; environment: 'sandbox'; amountCents: number }>(path),
  create: () => apiRequest<SandboxCharge>(path, {}),
  check: (token: string) => apiRequest<Pick<SandboxCharge, 'id' | 'status' | 'devMode'>>(`${path}/check`, { token }),
  simulate: (token: string) => apiRequest<Pick<SandboxCharge, 'id' | 'status' | 'devMode'>>(`${path}/simulate`, { token }),
};
