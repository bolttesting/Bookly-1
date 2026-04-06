import type { PlatformSubscriptionInvoice } from '@/hooks/usePlatformSubscriptionInvoices';

/** Short, human-friendly id for receipts (not the raw UUID). */
export function subscriptionInvoiceDisplayId(id: string): string {
  const compact = id.replace(/-/g, '');
  return `BKLY-${compact.slice(0, 12).toUpperCase()}`;
}

export function subscriptionInvoiceIsPaidCheckout(inv: PlatformSubscriptionInvoice): boolean {
  return Boolean(inv.stripe_checkout_session_id);
}

export function subscriptionInvoicePaymentMethodLabel(inv: PlatformSubscriptionInvoice): string {
  if (inv.receipt_url || inv.stripe_checkout_session_id) {
    return 'Card';
  }
  return 'No charge (free plan)';
}
