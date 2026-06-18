/**
 * orderStore.ts
 * Persistent order storage using Supabase.
 * Falls back to in-memory Map if SUPABASE_URL/SUPABASE_SERVICE_KEY are not set.
 *
 * Ciclo de vida de una orden:
 *   pending  → pago creado en MP, esperando confirmación
 *   approved → webhook de MP confirmó el pago
 *   failed   → pago rechazado o expirado
 *
 * Supabase table schema (create via SQL editor):
 *
 *   CREATE TABLE IF NOT EXISTS orders (
 *     order_id        TEXT PRIMARY KEY,
 *     preference_id   TEXT NOT NULL,
 *     mp_payment_id   TEXT,
 *     status          TEXT NOT NULL DEFAULT 'pending',
 *     plan            TEXT NOT NULL,
 *     amount          INTEGER NOT NULL,
 *     case_data_json  TEXT NOT NULL,
 *     document_url    TEXT,
 *     created_at      BIGINT NOT NULL,
 *     paid_at         BIGINT
 *   );
 *
 *   CREATE INDEX idx_orders_preference_id ON orders(preference_id);
 *   CREATE INDEX idx_orders_status ON orders(status);
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

export type OrderStatus = 'pending' | 'approved' | 'failed';

export interface Order {
  orderId:       string;
  preferenceId:  string;
  mpPaymentId?:  string;
  status:        OrderStatus;
  plan:          'single' | 'monthly';
  amount:        number;
  caseDataJson:  string;
  documentUrl?:  string;
  createdAt:     number;
  paidAt?:       number;
}

// ─── Supabase client (singleton) ──────────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL ?? '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY ?? '';
const USE_SUPABASE = !!(SUPABASE_URL && SUPABASE_KEY);

let supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
  if (!supabase) {
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false },
    });
  }
  return supabase;
}

// ─── Row ↔ Order mapping ──────────────────────────────────────────────────────
interface OrderRow {
  order_id:       string;
  preference_id:  string;
  mp_payment_id:  string | null;
  status:         string;
  plan:           string;
  amount:         number;
  case_data_json: string;
  document_url:   string | null;
  created_at:     number;
  paid_at:        number | null;
}

function rowToOrder(row: OrderRow): Order {
  return {
    orderId:      row.order_id,
    preferenceId: row.preference_id,
    mpPaymentId:  row.mp_payment_id ?? undefined,
    status:       row.status as OrderStatus,
    plan:         row.plan as 'single' | 'monthly',
    amount:       row.amount,
    caseDataJson: row.case_data_json,
    documentUrl:  row.document_url ?? undefined,
    createdAt:    row.created_at,
    paidAt:       row.paid_at ?? undefined,
  };
}

function orderToRow(order: Order): OrderRow {
  return {
    order_id:       order.orderId,
    preference_id:  order.preferenceId,
    mp_payment_id:  order.mpPaymentId ?? null,
    status:         order.status,
    plan:           order.plan,
    amount:         order.amount,
    case_data_json: order.caseDataJson,
    document_url:   order.documentUrl ?? null,
    created_at:     order.createdAt,
    paid_at:        order.paidAt ?? null,
  };
}

// ─── In-memory fallback (for local dev without Supabase) ──────────────────────
declare global {
  // eslint-disable-next-line no-var
  var __orderStore: Map<string, Order> | undefined;
}

const memoryStore: Map<string, Order> = global.__orderStore ?? new Map();
global.__orderStore = memoryStore;

// ─── Public API ───────────────────────────────────────────────────────────────

export async function saveOrder(order: Order): Promise<void> {
  if (!USE_SUPABASE) {
    memoryStore.set(order.orderId, order);
    return;
  }

  const { error } = await getSupabase()
    .from('orders')
    .upsert(orderToRow(order), { onConflict: 'order_id' });

  if (error) {
    console.error('[orderStore] saveOrder error:', error.message);
    // Fallback to memory so the request doesn't fail
    memoryStore.set(order.orderId, order);
  }
}

export async function getOrderByOrderId(orderId: string): Promise<Order | undefined> {
  if (!USE_SUPABASE) {
    return memoryStore.get(orderId);
  }

  const { data, error } = await getSupabase()
    .from('orders')
    .select('*')
    .eq('order_id', orderId)
    .single();

  if (error || !data) {
    // Try memory fallback
    return memoryStore.get(orderId);
  }

  return rowToOrder(data as OrderRow);
}

export async function getOrderByPreferenceId(preferenceId: string): Promise<Order | undefined> {
  if (!USE_SUPABASE) {
    for (const order of memoryStore.values()) {
      if (order.preferenceId === preferenceId) return order;
    }
    return undefined;
  }

  const { data, error } = await getSupabase()
    .from('orders')
    .select('*')
    .eq('preference_id', preferenceId)
    .single();

  if (error || !data) {
    // Try memory fallback
    for (const order of memoryStore.values()) {
      if (order.preferenceId === preferenceId) return order;
    }
    return undefined;
  }

  return rowToOrder(data as OrderRow);
}

export async function updateOrder(orderId: string, patch: Partial<Order>): Promise<Order | null> {
  if (!USE_SUPABASE) {
    const order = memoryStore.get(orderId);
    if (!order) return null;
    const updated = { ...order, ...patch };
    memoryStore.set(orderId, updated);
    return updated;
  }

  // Build the partial row update
  const rowPatch: Partial<OrderRow> = {};
  if (patch.status !== undefined)      rowPatch.status = patch.status;
  if (patch.mpPaymentId !== undefined) rowPatch.mp_payment_id = patch.mpPaymentId;
  if (patch.paidAt !== undefined)      rowPatch.paid_at = patch.paidAt;
  if (patch.documentUrl !== undefined) rowPatch.document_url = patch.documentUrl;

  const { data, error } = await getSupabase()
    .from('orders')
    .update(rowPatch)
    .eq('order_id', orderId)
    .select()
    .single();

  if (error || !data) {
    console.error('[orderStore] updateOrder error:', error?.message);
    // Fallback to memory
    const order = memoryStore.get(orderId);
    if (!order) return null;
    const updated = { ...order, ...patch };
    memoryStore.set(orderId, updated);
    return updated;
  }

  const updated = rowToOrder(data as OrderRow);
  // Keep memory in sync
  memoryStore.set(orderId, updated);
  return updated;
}
