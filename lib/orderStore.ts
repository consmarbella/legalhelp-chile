/**
 * orderStore.ts
 * Almacén en memoria de órdenes de pago.
 * En producción reemplazar por Supabase/Postgres.
 *
 * Ciclo de vida de una orden:
 *   pending  → pago creado en MP, esperando confirmación
 *   approved → webhook de MP confirmó el pago
 *   failed   → pago rechazado o expirado
 */

export type OrderStatus = 'pending' | 'approved' | 'failed';

export interface Order {
  orderId:       string;        // UUID interno
  preferenceId:  string;        // ID de la preferencia en MP
  mpPaymentId?:  string;        // ID del pago real en MP (llega por webhook)
  status:        OrderStatus;
  plan:          'single' | 'monthly';
  amount:        number;        // CLP
  caseDataJson:  string;        // JSON con los datos del caso (para generar el doc después)
  documentUrl?:  string;        // URL del PDF generado (cuando esté listo)
  createdAt:     number;
  paidAt?:       number;
}

// Singleton global (sobrevive hot-reload en dev)
declare global {
  // eslint-disable-next-line no-var
  var __orderStore: Map<string, Order> | undefined;
}

const store: Map<string, Order> = global.__orderStore ?? new Map();
global.__orderStore = store;

export function saveOrder(order: Order): void {
  store.set(order.orderId, order);
}

export function getOrderByOrderId(orderId: string): Order | undefined {
  return store.get(orderId);
}

export function getOrderByPreferenceId(preferenceId: string): Order | undefined {
  for (const order of store.values()) {
    if (order.preferenceId === preferenceId) return order;
  }
  return undefined;
}

export function updateOrder(orderId: string, patch: Partial<Order>): Order | null {
  const order = store.get(orderId);
  if (!order) return null;
  const updated = { ...order, ...patch };
  store.set(orderId, updated);
  return updated;
}
