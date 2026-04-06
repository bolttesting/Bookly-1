/** Subtotal after coupon discount (pre-tax). */
export function subtotalAfterCoupon(
  basePrice: number,
  appliedCoupon: {
    discountType: 'percentage' | 'fixed';
    discount: number;
  } | null,
): number {
  let sub = Math.max(0, Number(basePrice) || 0);
  if (!appliedCoupon) return sub;
  if (appliedCoupon.discountType === 'percentage') {
    sub = sub - (sub * appliedCoupon.discount) / 100;
  } else {
    sub = Math.max(0, sub - appliedCoupon.discount);
  }
  return Math.round(sub * 100) / 100;
}

/**
 * Tax on the discounted subtotal. Total is what the customer pays (subtotal + tax).
 */
export function computeCustomerBookingTax(
  subtotalAfterDiscount: number,
  taxPercent: number | null | undefined,
): { taxPercent: number; taxAmount: number; totalWithTax: number } {
  const p = Math.min(100, Math.max(0, Number(taxPercent) || 0));
  const sub = Math.max(0, Number(subtotalAfterDiscount) || 0);
  const rawTax = sub * (p / 100);
  const taxAmount = Math.round(rawTax * 100) / 100;
  const totalWithTax = Math.round((sub + taxAmount) * 100) / 100;
  return { taxPercent: p, taxAmount, totalWithTax };
}
