import { jsPDF } from 'jspdf';
import { formatCurrency } from '@/lib/currency';

const BRAND = 'Bookly';

export type AppointmentPaymentStatus =
  | 'pending'
  | 'paid'
  | 'partial'
  | 'refunded'
  | 'failed'
  | string
  | null
  | undefined;

export interface BookingConfirmationPaymentRow {
  amount: number;
  currency?: string | null;
  payment_method?: string | null;
  status?: string | null;
  stripe_charge_id?: string | null;
  stripe_payment_intent_id?: string | null;
}

export interface BookingConfirmationPdfInput {
  /** Short reference shown on the document */
  bookingRef: string;
  business: {
    name: string;
    address?: string | null;
    city?: string | null;
    phone?: string | null;
    email?: string | null;
  };
  customerName: string;
  serviceName: string;
  startTimeIso: string;
  endTimeIso?: string | null;
  staffName?: string | null;
  locationLine?: string | null;
  appointmentStatus: string;
  /** Service total from appointment (tax-inclusive when business charges tax) */
  servicePrice: number | null | undefined;
  currencyCode: string;
  paymentStatus: AppointmentPaymentStatus;
  payment?: BookingConfirmationPaymentRow | null;
  /** When set, PDF lists subtotal, tax, and total before payment status lines */
  priceBreakdown?: {
    subtotal: number;
    taxAmount: number;
    taxPercent: number;
    total: number;
  } | null;
}

function formatWhenLine(startIso: string, endIso?: string | null) {
  const start = new Date(startIso);
  const dateStr = start.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const startT = start.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  if (!endIso) return `${dateStr} at ${startT}`;
  const end = new Date(endIso);
  const endT = end.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `${dateStr}, ${startT} – ${endT}`;
}

function toNum(v: unknown): number {
  if (typeof v === 'number' && !isNaN(v)) return v;
  if (typeof v === 'string') {
    const n = parseFloat(v);
    return !isNaN(n) ? n : NaN;
  }
  return NaN;
}

function isPaidOnline(p: BookingConfirmationPaymentRow | null | undefined): boolean {
  if (!p) return false;
  if (p.stripe_charge_id || p.stripe_payment_intent_id) return true;
  const m = (p.payment_method || '').toLowerCase();
  return m === 'card' || m.includes('stripe');
}

function priceLinesFromBreakdown(input: BookingConfirmationPdfInput): string[] {
  const b = input.priceBreakdown;
  if (!b) return [];
  const code = (input.currencyCode || 'USD').toUpperCase();
  if (b.taxPercent > 0 && b.taxAmount > 0) {
    return [
      `Subtotal: ${formatCurrency(b.subtotal, code)}`,
      `Tax (${b.taxPercent}%): ${formatCurrency(b.taxAmount, code)}`,
      `Total: ${formatCurrency(b.total, code)}`,
    ];
  }
  return [`Total: ${formatCurrency(b.total, code)}`];
}

function paymentNarrative(input: BookingConfirmationPdfInput): { title: string; lines: string[] } {
  const code = (input.currencyCode || 'USD').toUpperCase();
  const total = input.priceBreakdown
    ? toNum(input.priceBreakdown.total)
    : toNum(input.servicePrice);
  const hasPrice = !isNaN(total) && total > 0;
  const status = (input.paymentStatus || 'pending').toLowerCase();
  const breakdownHead = priceLinesFromBreakdown(input);

  if (!hasPrice) {
    return {
      title: 'Payment',
      lines: ['No payment is due for this booking.'],
    };
  }

  const totalStr = formatCurrency(total, code);

  if (status === 'refunded') {
    return {
      title: 'Payment',
      lines: [...breakdownHead, ...(breakdownHead.length ? [] : [`Total: ${totalStr}`]), 'Status: Refunded.'],
    };
  }

  if (status === 'failed') {
    return {
      title: 'Payment',
      lines: [
        ...breakdownHead,
        ...(breakdownHead.length ? [] : [`Total: ${totalStr}`]),
        'Status: Payment failed — contact the business if you need help.',
      ],
    };
  }

  if (status === 'paid') {
    const p = input.payment;
    const paidAmt = p ? toNum(p.amount) : NaN;
    const recorded =
      p && !isNaN(paidAmt)
        ? formatCurrency(paidAmt, (p.currency || code).toUpperCase())
        : totalStr;
    const online = isPaidOnline(p);
    const confirmLine = !p
      ? 'Payment received — confirmed on your booking record.'
      : online
        ? 'Payment received — confirmed (paid online).'
        : 'Payment received — confirmed by the business.';
    return {
      title: 'Payment',
      lines: [
        ...breakdownHead,
        ...(breakdownHead.length ? [] : [`Service total: ${totalStr}`]),
        `Amount recorded: ${recorded}`,
        confirmLine,
      ],
    };
  }

  if (status === 'partial') {
    const p = input.payment;
    const partialAmt = p ? toNum(p.amount) : NaN;
    const recorded = p && !isNaN(partialAmt) ? formatCurrency(partialAmt, (p.currency || code).toUpperCase()) : null;
    const online = isPaidOnline(p);
    const lines = [
      ...breakdownHead,
      ...(breakdownHead.length ? [] : [`Service total: ${totalStr}`]),
    ];
    if (recorded) lines.push(`Amount recorded so far: ${recorded}`);
    lines.push(
      online
        ? 'Partial payment received — confirmed online. Any balance is due per the business.'
        : 'Partial payment recorded by the business. Any balance is due per the business.',
    );
    return { title: 'Payment', lines };
  }

  // pending (or unknown)
  return {
    title: 'Payment',
    lines: [
      ...breakdownHead,
      ...(breakdownHead.length ? [] : [`Service total: ${totalStr}`]),
      'Payment not yet confirmed by the business.',
      'If you already paid, it may take a short time to appear. Contact the business with this confirmation if needed.',
    ],
  };
}

export function downloadBookingConfirmationPdf(input: BookingConfirmationPdfInput) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  doc.setFillColor(244, 244, 245);
  doc.rect(0, 0, pageW, pageH, 'F');

  const margin = 22;
  const contentW = pageW - margin * 2;
  let y = 28;

  doc.setFillColor(255, 255, 255);
  doc.roundedRect(margin, 20, contentW, pageH - 40, 3, 3, 'F');
  doc.setDrawColor(228, 228, 231);
  doc.setLineWidth(0.25);
  doc.roundedRect(margin, 20, contentW, pageH - 40, 3, 3, 'S');

  const x = margin + 14;
  y = 32;

  const addParagraph = (text: string, fontSize = 9, color: [number, number, number] = [82, 82, 82]) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(fontSize);
    doc.setTextColor(...color);
    const maxW = contentW - 28;
    for (const block of text.split('\n')) {
      const lines = doc.splitTextToSize(block.trim() || ' ', maxW);
      for (const line of lines) {
        if (y > pageH - 24) {
          doc.addPage();
          y = 20;
        }
        doc.text(line, x, y);
        y += fontSize * 0.45 + 1.2;
      }
    }
  };

  const addHeading = (text: string) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(23, 23, 23);
    if (y > pageH - 30) {
      doc.addPage();
      y = 20;
    }
    doc.text(text, x, y);
    y += 8;
  };

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(23, 23, 23);
  doc.text('Booking confirmation', x, y);
  y += 10;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(115, 115, 115);
  doc.text(`Reference: ${input.bookingRef}`, x, y);
  y += 12;

  addHeading('Business');
  addParagraph(
    [
      input.business.name,
      [input.business.address, input.business.city].filter(Boolean).join(', ') || null,
      input.business.phone ? `Phone: ${input.business.phone}` : null,
      input.business.email ? `Email: ${input.business.email}` : null,
    ]
      .filter(Boolean)
      .join('\n'),
  );
  y += 4;

  addHeading('Customer');
  addParagraph(input.customerName || '—');
  y += 4;

  addHeading('Appointment');
  addParagraph(
    [
      `Service: ${input.serviceName}`,
      `When: ${formatWhenLine(input.startTimeIso, input.endTimeIso)}`,
      input.staffName ? `Staff: ${input.staffName}` : null,
      input.locationLine ? `Location: ${input.locationLine}` : null,
      `Booking status: ${input.appointmentStatus}`,
    ]
      .filter(Boolean)
      .join('\n'),
  );
  y += 4;

  const pay = paymentNarrative(input);
  addHeading(pay.title);
  for (const line of pay.lines) {
    addParagraph(line);
  }

  y += 6;
  doc.setDrawColor(228, 228, 231);
  doc.line(x, y, x + contentW - 28, y);
  y += 8;
  addParagraph(
    'This document is a booking summary for your records. It is not a tax invoice unless your business provides one separately.',
    8,
    [150, 150, 150],
  );
  y += 2;
  addParagraph(`Generated through ${BRAND}.`, 8, [160, 160, 160]);

  const safe = input.bookingRef.replace(/[^a-zA-Z0-9-]/g, '');
  doc.save(`Booking-confirmation-${safe || 'booking'}.pdf`);
}
