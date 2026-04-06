import { jsPDF } from 'jspdf';
import { formatCurrency } from '@/lib/currency';

const BRAND = 'Bookly';

export interface PackagePurchaseReceiptInput {
  receiptRef: string;
  business: {
    name: string;
    address?: string | null;
    city?: string | null;
    phone?: string | null;
    email?: string | null;
  };
  customerName: string;
  packageName: string;
  sessions: number;
  purchasedAtIso: string;
  currencyCode: string;
  subtotal: number;
  taxPercent: number;
  taxAmount: number;
  total: number;
}

export function downloadPackagePurchaseReceiptPdf(input: PackagePurchaseReceiptInput) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const code = (input.currencyCode || 'USD').toUpperCase();

  doc.setFillColor(244, 244, 245);
  doc.rect(0, 0, pageW, pageH, 'F');

  const margin = 22;
  const contentW = pageW - margin * 2;
  let y = 28;
  const x = margin + 14;

  doc.setFillColor(255, 255, 255);
  doc.roundedRect(margin, 20, contentW, pageH - 40, 3, 3, 'F');
  doc.setDrawColor(228, 228, 231);
  doc.setLineWidth(0.25);
  doc.roundedRect(margin, 20, contentW, pageH - 40, 3, 3, 'S');

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
  doc.text('Package purchase receipt', x, y);
  y += 10;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(115, 115, 115);
  doc.text(`Reference: ${input.receiptRef}`, x, y);
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

  addHeading('Package');
  const purchased = new Date(input.purchasedAtIso).toLocaleString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
  addParagraph(
    [`Name: ${input.packageName}`, `Sessions included: ${input.sessions}`, `Purchased: ${purchased}`].join('\n'),
  );
  y += 4;

  addHeading('Amount');
  addParagraph(`Subtotal: ${formatCurrency(input.subtotal, code)}`);
  if (input.taxPercent > 0 && input.taxAmount > 0) {
    addParagraph(`Tax (${input.taxPercent}%): ${formatCurrency(input.taxAmount, code)}`);
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(23, 23, 23);
  addParagraph(`Total paid: ${formatCurrency(input.total, code)}`);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  y += 4;

  doc.setDrawColor(228, 228, 231);
  doc.line(x, y, x + contentW - 28, y);
  y += 8;
  addParagraph(
    'This is a summary of your package purchase for your records. It is not a tax invoice unless your business provides one separately.',
    8,
    [150, 150, 150],
  );
  addParagraph(`Generated through ${BRAND}.`, 8, [160, 160, 160]);

  const safe = input.receiptRef.replace(/[^a-zA-Z0-9-]/g, '');
  doc.save(`Package-receipt-${safe || 'purchase'}.pdf`);
}
