import { jsPDF } from 'jspdf';
import type { PlatformSubscriptionInvoice } from '@/hooks/usePlatformSubscriptionInvoices';
import { formatCurrency } from '@/lib/currency';

const ISSUER = 'Bookly';

export function downloadSubscriptionInvoicePdf(invoice: PlatformSubscriptionInvoice) {
  const doc = new jsPDF();
  const code = invoice.currency.toUpperCase();
  const line = (cents: number) => formatCurrency(cents / 100, code);

  let y = 16;
  doc.setFontSize(18);
  doc.text('Subscription invoice', 14, y);
  y += 10;
  doc.setFontSize(10);
  doc.text(`${ISSUER} — platform subscription`, 14, y);
  y += 14;

  doc.setFontSize(11);
  doc.text(`Invoice # ${invoice.id}`, 14, y);
  y += 7;
  doc.setFontSize(10);
  doc.text(`Paid: ${new Date(invoice.paid_at).toLocaleString()}`, 14, y);
  y += 6;
  doc.text(
    `Billing period: ${new Date(invoice.billing_period_start).toLocaleDateString()} — ${new Date(invoice.billing_period_end).toLocaleDateString()}`,
    14,
    y,
  );
  y += 12;

  doc.setFont('helvetica', 'bold');
  doc.text('Business', 14, y);
  doc.setFont('helvetica', 'normal');
  y += 6;
  doc.text(invoice.business_name || '—', 14, y);
  y += 10;

  doc.setFont('helvetica', 'bold');
  doc.text('Account', 14, y);
  doc.setFont('helvetica', 'normal');
  y += 6;
  doc.text(invoice.account_name || '—', 14, y);
  y += 6;
  doc.text(invoice.account_email || '—', 14, y);
  y += 12;

  doc.setFont('helvetica', 'bold');
  doc.text('Plan', 14, y);
  doc.setFont('helvetica', 'normal');
  y += 6;
  doc.text(invoice.plan_name, 14, y);
  y += 12;

  doc.setFont('helvetica', 'bold');
  doc.text('Amounts', 14, y);
  doc.setFont('helvetica', 'normal');
  y += 6;
  doc.text(`Subtotal: ${line(invoice.subtotal_cents)}`, 14, y);
  y += 6;
  doc.text(`Tax (${invoice.tax_percent}%): ${line(invoice.tax_amount_cents)}`, 14, y);
  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.text(`Total: ${line(invoice.total_cents)}`, 14, y);
  y += 10;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text('This invoice is for your Bookly subscription billed by the platform.', 14, y);
  doc.setTextColor(0);

  doc.save(`bookly-subscription-${invoice.id.slice(0, 8)}.pdf`);
}
