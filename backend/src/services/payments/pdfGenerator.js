import PDFDocument from 'pdfkit';
import { FINANCIAL_OWNER_TYPES, normalizeFinancialOwnerType } from './ownership.js';

/**
 * Draw a clean, print-friendly PDF invoice to the output stream.
 */
export function generateInvoicePDF(invoice, stream) {
  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  doc.pipe(stream);

  // Core color theme
  const primaryColor = '#0EA5E9'; // Clean sky blue
  const textColor = '#1E293B'; // Dark Slate
  const lightText = '#64748B'; // Muted Slate
  const border = '#E2E8F0'; // Light Slate border

  // 1. Header (Brand and invoice reference)
  doc.fillColor(primaryColor).fontSize(20).font('Helvetica-Bold').text('SERENE APPS', 50, 50);
  doc.fillColor(lightText).fontSize(9).font('Helvetica').text('Premium Dental Care & Teledentistry Platform', 50, 72);

  doc.fillColor(textColor).fontSize(16).font('Helvetica-Bold').text('OFFICIAL INVOICE', 350, 50, { align: 'right' });
  doc.fillColor(lightText).fontSize(10).font('Helvetica').text(`Invoice Ref: ${invoice.reference || 'INV-' + invoice.id}`, 350, 72, { align: 'right' });

  // Border separator
  doc.moveTo(50, 95).lineTo(545, 95).strokeColor(border).stroke();

  // 2. Billing details (Patient vs Provider grid)
  let y = 115;
  doc.fillColor(primaryColor).fontSize(11).font('Helvetica-Bold').text('PATIENT INFO', 50, y);
  doc.fillColor(textColor).fontSize(10).font('Helvetica').text(`Name: ${invoice.patient?.name || 'N/A'}`, 50, y + 20);
  doc.text(`Email: ${invoice.patient?.email || 'N/A'}`, 50, y + 35);
  doc.text(`Phone: ${invoice.patient?.phone_number || 'N/A'}`, 50, y + 50);

  doc.fillColor(primaryColor).fontSize(11).font('Helvetica-Bold').text('PROVIDER INFO', 320, y);
  doc.fillColor(textColor).fontSize(10).font('Helvetica');
  if (normalizeFinancialOwnerType(invoice.ownerType) === FINANCIAL_OWNER_TYPES.CLINIC && invoice.ownerClinic) {
    doc.text(`Clinic: ${invoice.ownerClinic.legalName}`, 320, y + 20);
    doc.text(`Email: ${invoice.ownerClinic.email || 'N/A'}`, 320, y + 35);
    doc.text(`Phone: ${invoice.ownerClinic.phone || 'N/A'}`, 320, y + 50);
  } else {
    doc.text(`Dentist: drg. ${invoice.appointment?.dentist?.name || 'Dentist'}`, 320, y + 20);
    doc.text(`Email: ${invoice.appointment?.dentist?.email || 'N/A'}`, 320, y + 35);
  }

  // Border separator
  doc.moveTo(50, 195).lineTo(545, 195).strokeColor(border).stroke();

  // 3. Invoice meta status
  y = 210;
  doc.fillColor(lightText).fontSize(9).text('Issued Date:', 50, y);
  doc.fillColor(textColor).fontSize(9).font('Helvetica-Bold').text(invoice.issuedAt ? new Date(invoice.issuedAt).toLocaleDateString('id-ID', { dateStyle: 'long' }) : 'N/A', 115, y);

  doc.fillColor(lightText).font('Helvetica').text('Due Date:', 50, y + 15);
  doc.fillColor(textColor).font('Helvetica-Bold').text(invoice.dueAt ? new Date(invoice.dueAt).toLocaleDateString('id-ID', { dateStyle: 'long' }) : 'N/A', 115, y + 15);

  const status = (invoice.paymentIntent?.status || 'pending').toUpperCase();
  doc.fillColor(lightText).font('Helvetica').text('Payment Status:', 320, y);
  doc.fillColor(status === 'SETTLED' || status === 'PAID' ? '#10B981' : '#F59E0B').font('Helvetica-Bold').text(status, 410, y);

  doc.fillColor(lightText).font('Helvetica').text('Channel Method:', 320, y + 15);
  const paymentMethodStr = invoice.paymentSnapshot?.paymentMethod || invoice.paymentIntent?.providerResponse?.payment_type || 'Online Transfer';
  doc.fillColor(textColor).font('Helvetica-Bold').text(String(paymentMethodStr).toUpperCase(), 410, y + 15);

  // Border separator
  doc.moveTo(50, 245).lineTo(545, 245).strokeColor(border).stroke();

  // 4. Line Items Table
  y = 265;
  doc.fillColor(primaryColor).fontSize(10).font('Helvetica-Bold').text('Item Description', 50, y);
  doc.text('Qty', 320, y, { align: 'right' });
  doc.text('Unit Price', 410, y, { align: 'right' });
  doc.text('Total', 500, y, { align: 'right' });

  doc.moveTo(50, 280).lineTo(545, 280).strokeColor(border).stroke();

  let currentY = 295;
  const lineItems = invoice.items || [];
  doc.fillColor(textColor).fontSize(9).font('Helvetica');

  if (lineItems.length === 0) {
    doc.text('Dental Consultation Service', 50, currentY);
    doc.text('1', 320, currentY, { align: 'right' });
    doc.text(`${Number(invoice.total).toLocaleString('id-ID')} IDR`, 410, currentY, { align: 'right' });
    doc.text(`${Number(invoice.total).toLocaleString('id-ID')} IDR`, 500, currentY, { align: 'right' });
    currentY += 20;
  } else {
    for (const item of lineItems) {
      doc.text(item.description, 50, currentY);
      doc.text(String(item.quantity), 320, currentY, { align: 'right' });
      doc.text(`${Number(item.unitPrice).toLocaleString('id-ID')} IDR`, 410, currentY, { align: 'right' });
      doc.text(`${Number(item.total).toLocaleString('id-ID')} IDR`, 500, currentY, { align: 'right' });
      currentY += 20;
    }
  }

  doc.moveTo(50, currentY).lineTo(545, currentY).strokeColor(border).stroke();
  currentY += 15;

  // 5. Total Calculations summary
  doc.fillColor(lightText).font('Helvetica').text('Subtotal:', 350, currentY, { align: 'right' });
  doc.fillColor(textColor).font('Helvetica-Bold').text(`${Number(invoice.subtotal).toLocaleString('id-ID')} IDR`, 500, currentY, { align: 'right' });
  currentY += 15;

  if (invoice.discount > 0) {
    doc.fillColor(lightText).font('Helvetica').text('Discount:', 350, currentY, { align: 'right' });
    doc.fillColor('#EF4444').font('Helvetica-Bold').text(`-${Number(invoice.discount).toLocaleString('id-ID')} IDR`, 500, currentY, { align: 'right' });
    currentY += 15;
  }

  if (invoice.tax > 0) {
    doc.fillColor(lightText).font('Helvetica').text('Tax:', 350, currentY, { align: 'right' });
    doc.fillColor(textColor).font('Helvetica-Bold').text(`${Number(invoice.tax).toLocaleString('id-ID')} IDR`, 500, currentY, { align: 'right' });
    currentY += 15;
  }

  doc.fillColor(primaryColor).font('Helvetica-Bold').text('Total Paid Amount:', 350, currentY, { align: 'right' });
  doc.text(`${Number(invoice.total).toLocaleString('id-ID')} IDR`, 500, currentY, { align: 'right' });
  currentY += 45;

  // 6. Signature / QR code verification block
  doc.moveTo(50, currentY).lineTo(545, currentY).strokeColor(border).stroke();
  currentY += 15;

  doc.fillColor(textColor).fontSize(8).font('Helvetica-Bold').text('DIGITAL VERIFICATION STATEMENT', 50, currentY);
  doc.fillColor(lightText).font('Helvetica').text('This invoice was generated electronically and is certified by SereneApps. Scan the secure seal below to check database integrity.', 50, currentY + 12, { width: 280 });

  // Draw verified badge QR look-alike
  doc.strokeColor(primaryColor).rect(380, currentY, 65, 65).stroke();
  doc.fillColor(primaryColor).fontSize(6).font('Helvetica-Bold').text('VERIFIED', 382, currentY + 10, { width: 61, align: 'center' });
  doc.fillColor(textColor).fontSize(4).text('ORDER ID: ' + (invoice.paymentIntent?.providerOrderId || 'N/A'), 382, currentY + 22, { width: 61, align: 'center' });
  doc.text('INTENT ID: ' + (invoice.paymentIntentId?.toString() || 'N/A'), 382, currentY + 32, { width: 61, align: 'center' });

  // Closing greeting
  doc.fillColor(lightText).fontSize(8).font('Helvetica-Oblique').text('Wishing you good health and bright smiles!', 50, currentY + 52);

  doc.end();
}
