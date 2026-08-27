// Order fulfillment — idempotent provisioning of a paid order.
// Called by both the Stripe webhook and the success page (safe to run twice).
import {
  getOrder,
  getOrderItems,
  markOrderPaid,
  createDownloadToken,
  getDownloadTokensForItems,
} from "./shop";
import type { DownloadToken, OrderItem } from "@/types";

export interface OrderDownload {
  token: string;
  expires_at: string;
  item: OrderItem;
}

/**
 * Mark an order paid (if not already) and ensure exactly one download token
 * per order item exists. Idempotent: re-running returns the existing tokens.
 */
export function fulfillOrder(
  orderId: string,
  opts?: { paymentIntent?: string; amountTotalCents?: number; buyerEmail?: string }
): OrderDownload[] {
  const order = getOrder(orderId);
  if (!order) return [];

  if (order.status !== "paid") {
    markOrderPaid(orderId, opts?.paymentIntent, opts?.amountTotalCents, opts?.buyerEmail);
  }

  const items = getOrderItems(orderId);
  const existing = getDownloadTokensForItems(items.map((i) => i.id));
  const byItem = new Map<string, DownloadToken>();
  for (const t of existing) byItem.set(t.order_item_id, t);

  const downloads: OrderDownload[] = [];
  for (const item of items) {
    let tok = byItem.get(item.id);
    if (!tok) tok = createDownloadToken(item.id, { ttlHours: 72, maxDownloads: 5 });
    downloads.push({ token: tok.token, expires_at: tok.expires_at, item });
  }
  return downloads;
}
