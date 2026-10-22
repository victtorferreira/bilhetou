// Swap this adapter for the NestJS API after server authentication is available.
// The server must enforce ownership, idempotency and exclusive assignment in a transaction.
import { demoServices } from './session';
export const demoOrdersService = demoServices.orders;
