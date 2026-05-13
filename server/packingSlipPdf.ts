import PDFDocument from 'pdfkit';
import * as db from './db';

interface PackingSlipItem {
  id: number;
  protocolItemId: number;
  itemName: string;
  itemType: string;
  quantity: number;
  status: string;
  notes?: string | null;
}

export async function generatePackingSlipPdf(packingSlipId: number): Promise<Buffer> {
  const packingSlip = await db.getPackingSlipById(packingSlipId);
  if (!packingSlip) {
    throw new Error('Packing slip not found');
  }

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'LETTER' });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Header
    doc.fontSize(24).font('Helvetica-Bold').text('PACKING SLIP', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').text(`Slip #${packingSlip.id}`, { align: 'center' });
    doc.moveDown(1);

    // Client Information
    doc.fontSize(14).font('Helvetica-Bold').text('Client Information');
    doc.moveDown(0.3);
    doc.fontSize(10).font('Helvetica');
    doc.text(`Name: ${packingSlip.clientName}`);
    doc.text(`Email: ${packingSlip.clientEmail}`);
    doc.moveDown(1);

    // Shipping Address
    if (packingSlip.shippingStreet) {
      doc.fontSize(14).font('Helvetica-Bold').text('Ship To');
      doc.moveDown(0.3);
      doc.fontSize(10).font('Helvetica');
      doc.text(packingSlip.shippingName || packingSlip.clientName);
      doc.text(packingSlip.shippingStreet);
      if (packingSlip.shippingCity || packingSlip.shippingState || packingSlip.shippingZip) {
        doc.text(`${packingSlip.shippingCity || ''}, ${packingSlip.shippingState || ''} ${packingSlip.shippingZip || ''}`);
      }
      if (packingSlip.shippingCountry && packingSlip.shippingCountry !== 'USA') {
        doc.text(packingSlip.shippingCountry);
      }
      if (packingSlip.shippingPhone) {
        doc.text(`Phone: ${packingSlip.shippingPhone}`);
      }
      doc.moveDown(1);
    }

    // Tracking Information
    if (packingSlip.trackingNumber) {
      doc.fontSize(14).font('Helvetica-Bold').text('Tracking Information');
      doc.moveDown(0.3);
      doc.fontSize(10).font('Helvetica');
      doc.text(`Carrier: ${packingSlip.trackingCarrier || 'N/A'}`);
      doc.text(`Tracking #: ${packingSlip.trackingNumber}`);
      doc.moveDown(1);
    }

    // Items Table Header
    doc.fontSize(14).font('Helvetica-Bold').text('Items');
    doc.moveDown(0.5);

    // Table header
    const tableTop = doc.y;
    const col1 = 50;  // Item
    const col2 = 280; // Type
    const col3 = 360; // Qty
    const col4 = 410; // Status

    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('Item', col1, tableTop);
    doc.text('Type', col2, tableTop);
    doc.text('Qty', col3, tableTop);
    doc.text('Status', col4, tableTop);

    // Draw header line
    doc.moveTo(col1, tableTop + 15).lineTo(550, tableTop + 15).stroke();

    // Table rows
    let y = tableTop + 25;
    doc.font('Helvetica').fontSize(9);

    const items = packingSlip.items || [];
    for (const item of items) {
      // Check if we need a new page
      if (y > 700) {
        doc.addPage();
        y = 50;
      }

      // Truncate long item names
      const itemName = item.itemName.length > 40 ? item.itemName.substring(0, 37) + '...' : item.itemName;
      
      doc.text(itemName, col1, y, { width: 220 });
      doc.text(item.itemType || 'other', col2, y);
      doc.text(String(item.quantity), col3, y);
      
      // Status with color indication
      const statusText = item.status === 'fulfilled' ? '✓ Fulfilled' : 
                        item.status === 'backordered' ? '⚠ Backordered' : 
                        'Pending';
      doc.text(statusText, col4, y);

      y += 20;
    }

    // Summary
    doc.moveDown(2);
    const fulfilledCount = items.filter((i: PackingSlipItem) => i.status === 'fulfilled').length;
    const backorderedCount = items.filter((i: PackingSlipItem) => i.status === 'backordered').length;
    const pendingCount = items.length - fulfilledCount - backorderedCount;

    doc.fontSize(10).font('Helvetica-Bold');
    doc.text(`Total Items: ${items.length}`);
    doc.font('Helvetica');
    doc.text(`Fulfilled: ${fulfilledCount} | Backordered: ${backorderedCount} | Pending: ${pendingCount}`);

    // Signature section if signed
    if (packingSlip.signedAt) {
      doc.moveDown(2);
      doc.fontSize(12).font('Helvetica-Bold').text('Verified & Signed');
      doc.moveDown(0.3);
      doc.fontSize(10).font('Helvetica');
      doc.text(`Signed by: ${(packingSlip as any).signedBy || 'Unknown'}`);
      doc.text(`Date: ${new Date(packingSlip.signedAt).toLocaleString('en-US', { timeZone: 'America/Denver' })}`);
    }

    // Footer
    doc.fontSize(8).font('Helvetica');
    const footerY = doc.page.height - 50;
    doc.text(`Generated: ${new Date().toLocaleString('en-US', { timeZone: 'America/Denver' })}`, 50, footerY, { align: 'center' });

    doc.end();
  });
}

export async function generateBatchPackingSlipsPdf(packingSlipIds: number[]): Promise<Buffer> {
  const doc = new PDFDocument({ margin: 50, size: 'LETTER' });
  const chunks: Buffer[] = [];

  return new Promise(async (resolve, reject) => {
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    for (let i = 0; i < packingSlipIds.length; i++) {
      const packingSlip = await db.getPackingSlipById(packingSlipIds[i]);
      if (!packingSlip) continue;

      if (i > 0) {
        doc.addPage();
      }

      // Header
      doc.fontSize(24).font('Helvetica-Bold').text('PACKING SLIP', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica').text(`Slip #${packingSlip.id}`, { align: 'center' });
      doc.moveDown(1);

      // Client Information
      doc.fontSize(14).font('Helvetica-Bold').text('Client Information');
      doc.moveDown(0.3);
      doc.fontSize(10).font('Helvetica');
      doc.text(`Name: ${packingSlip.clientName}`);
      doc.text(`Email: ${packingSlip.clientEmail}`);
      doc.moveDown(1);

      // Shipping Address
      if (packingSlip.shippingStreet) {
        doc.fontSize(14).font('Helvetica-Bold').text('Ship To');
        doc.moveDown(0.3);
        doc.fontSize(10).font('Helvetica');
        doc.text(packingSlip.shippingName || packingSlip.clientName);
        doc.text(packingSlip.shippingStreet);
        if (packingSlip.shippingCity || packingSlip.shippingState || packingSlip.shippingZip) {
          doc.text(`${packingSlip.shippingCity || ''}, ${packingSlip.shippingState || ''} ${packingSlip.shippingZip || ''}`);
        }
        if (packingSlip.shippingCountry && packingSlip.shippingCountry !== 'USA') {
          doc.text(packingSlip.shippingCountry);
        }
        if (packingSlip.shippingPhone) {
          doc.text(`Phone: ${packingSlip.shippingPhone}`);
        }
        doc.moveDown(1);
      }

      // Items Table Header
      doc.fontSize(14).font('Helvetica-Bold').text('Items');
      doc.moveDown(0.5);

      // Table header
      const tableTop = doc.y;
      const col1 = 50;
      const col2 = 280;
      const col3 = 360;
      const col4 = 410;

      doc.fontSize(10).font('Helvetica-Bold');
      doc.text('Item', col1, tableTop);
      doc.text('Type', col2, tableTop);
      doc.text('Qty', col3, tableTop);
      doc.text('Status', col4, tableTop);

      doc.moveTo(col1, tableTop + 15).lineTo(550, tableTop + 15).stroke();

      let y = tableTop + 25;
      doc.font('Helvetica').fontSize(9);

      const items = packingSlip.items || [];
      for (const item of items) {
        if (y > 700) {
          doc.addPage();
          y = 50;
        }

        const itemName = item.itemName.length > 40 ? item.itemName.substring(0, 37) + '...' : item.itemName;
        
        doc.text(itemName, col1, y, { width: 220 });
        doc.text(item.itemType || 'other', col2, y);
        doc.text(String(item.quantity), col3, y);
        
        const statusText = item.status === 'fulfilled' ? '✓ Fulfilled' : 
                          item.status === 'backordered' ? '⚠ Backordered' : 
                          'Pending';
        doc.text(statusText, col4, y);

        y += 20;
      }

      // Summary
      doc.moveDown(2);
      const fulfilledCount = items.filter((i: PackingSlipItem) => i.status === 'fulfilled').length;
      doc.fontSize(10).font('Helvetica-Bold');
      doc.text(`Total Items: ${items.length} | Fulfilled: ${fulfilledCount}`);

      // Signature if signed
      if (packingSlip.signedAt) {
        doc.moveDown(1);
        doc.fontSize(10).font('Helvetica');
        doc.text(`Signed by: ${(packingSlip as any).signedBy || 'Unknown'} on ${new Date(packingSlip.signedAt).toLocaleDateString('en-US', { timeZone: 'America/Denver' })}`);
      }

      // Page number
      doc.fontSize(8).font('Helvetica');
      doc.text(`Page ${i + 1} of ${packingSlipIds.length}`, 50, doc.page.height - 30, { align: 'center' });
    }

    doc.end();
  });
}
