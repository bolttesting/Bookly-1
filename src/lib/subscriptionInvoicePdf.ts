import { jsPDF } from 'jspdf';
import type { PlatformSubscriptionInvoice } from '@/hooks/usePlatformSubscriptionInvoices';
import { formatCurrency } from '@/lib/currency';
import {
  subscriptionInvoiceDisplayId,
  subscriptionInvoiceIsPaidCheckout,
  subscriptionInvoicePaymentMethodLabel,
} from '@/lib/subscriptionInvoiceDisplay';

const BRAND = 'Bookly';

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

export function downloadSubscriptionInvoicePdf(invoice: PlatformSubscriptionInvoice) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const code = invoice.currency.toUpperCase();
  const totalStr = formatCurrency(invoice.total_cents / 100, code);
  const line = (cents: number) => formatCurrency(cents / 100, code);
  const paidCheckout = subscriptionInvoiceIsPaidCheckout(invoice);

  doc.setFillColor(244, 244, 245);
  doc.rect(0, 0, pageW, pageH, 'F');

  const cardX = 22;
  const cardW = pageW - 44;
  const cardH = 132;
  const cardY = 28;
  const padL = 16;
  const padR = 16;
  const valueX = cardX + cardW - padR;

  doc.setFillColor(255, 255, 255);
  doc.roundedRect(cardX, cardY, cardW, cardH, 3, 3, 'F');
  doc.setDrawColor(228, 228, 231);
  doc.setLineWidth(0.25);
  doc.roundedRect(cardX, cardY, cardW, cardH, 3, 3, 'S');

  const cx = cardX + cardW / 2;
  let y = cardY + 14;

  doc.setFillColor(229, 231, 235);
  doc.roundedRect(cx - 8, y - 6, 16, 18, 1.5, 1.5, 'F');
  doc.setFillColor(34, 197, 94);
  doc.circle(cx + 5, y + 6, 3.2, 'F');
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.35);
  doc.line(cx + 3.2, y + 5.8, cx + 4.6, y + 7.4);
  doc.line(cx + 4.6, y + 7.4, cx + 7.2, y + 4.2);
  doc.setDrawColor(0, 0, 0);

  y += 22;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(115, 115, 115);
  doc.text(paidCheckout ? 'Invoice paid' : 'Subscription invoice', cx, y, { align: 'center' });
  y += 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(23, 23, 23);
  doc.text(totalStr, cx, y, { align: 'center' });
  y += 14;

  const labelX = cardX + padL;
  const rowH = 6;

  const row = (label: string, value: string) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(115, 115, 115);
    doc.text(label, labelX, y);
    doc.setTextColor(23, 23, 23);
    doc.text(value, valueX, y, { align: 'right', maxWidth: cardW - padL - padR - 50 });
    y += rowH;
  };

  row('Invoice number', subscriptionInvoiceDisplayId(invoice.id));
  y += 1;
  row('Payment date', fmtDate(invoice.paid_at));
  y += 1;
  row('Payment method', subscriptionInvoicePaymentMethodLabel(invoice));
  y += 6;

  doc.setFontSize(8.5);
  doc.setTextColor(150, 150, 150);
  doc.text(
    `${invoice.plan_name} · ${fmtDate(invoice.billing_period_start)} — ${fmtDate(invoice.billing_period_end)}`,
    labelX,
    y,
    { maxWidth: cardW - padL - padR },
  );
  y += 5;
  doc.text(invoice.business_name || '—', labelX, y, { maxWidth: cardW - padL - padR });
  y += 5;
  if (invoice.account_email) {
    doc.text(invoice.account_email, labelX, y, { maxWidth: cardW - padL - padR });
    y += 5;
  }

  y += 5;
  doc.setDrawColor(228, 228, 231);
  doc.line(labelX, y, valueX, y);
  y += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(82, 82, 82);
  doc.text('Subtotal', labelX, y);
  doc.text(line(invoice.subtotal_cents), valueX, y, { align: 'right' });
  y += rowH;
  doc.text(`Tax (${invoice.tax_percent}%)`, labelX, y);
  doc.text(line(invoice.tax_amount_cents), valueX, y, { align: 'right' });
  y += rowH + 2;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(23, 23, 23);
  doc.text('Total', labelX, y);
  doc.text(totalStr, valueX, y, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(160, 160, 160);
  doc.text(`Issued by ${BRAND} — platform subscription`, pageW / 2, pageH - 16, { align: 'center' });
  doc.text('Thank you for your business.', pageW / 2, pageH - 11, { align: 'center' });

  const safeName = subscriptionInvoiceDisplayId(invoice.id).replace(/[^A-Z0-9-]/g, '');
  doc.save(`Invoice-${safeName}.pdf`);
}
