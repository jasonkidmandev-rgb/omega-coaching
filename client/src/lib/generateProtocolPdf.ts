import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import QRCode from "qrcode";

type ProtocolItem = {
  id: number;
  categoryId: number;
  name: string;
  schedule: string | null;
  duration: string | null;
  price: string | null;
  defaultQty: number | null;
  purpose: string | null;
  notes: string | null;
  affiliateUrl: string | null;
  affiliateCode: string | null;
  itemType: string;
  isActive: boolean;
  sortOrder: number;
};

type Category = {
  id: number;
  name: string;
  description: string | null;
  sortOrder: number;
};

type ClientProtocolItem = {
  id: number;
  protocolItemId: number;
  quantity: number;
  isIncluded: boolean;
  isRecommended: boolean;
  customSchedule: string | null;
  customDuration: string | null;
  customPrice: string | null;
  customNotes: string | null;
  /** 'client' = the client sources this themselves via our link; we never bill for it. */
  fulfillmentSource?: string | null;
};

/** Items the client buys themselves are shown as "Purchase Separately" and excluded
 *  from every total — matching the client-facing protocol page. */
function isClientSourced(item: ClientProtocolItem): boolean {
  return (item as any).fulfillmentSource === "client";
}

type Protocol = {
  id: number;
  clientName: string;
  clientEmail: string | null;
  status: string;
  durationMonths: number;
  discountPercent: string | null;
  coachingPackage: string | null;
  coachingPrice: string | null;
  hidePricing?: boolean;
  coachNotes?: string | null;
  accessToken?: string;
};

type Requirement = {
  id: number;
  text: string;
};

type ProgramInfo = {
  program?: {
    name: string;
  };
  currentPhase?: {
    name: string;
    description: string | null;
    goals: string | null;
  };
} | null;

interface GeneratePdfParams {
  protocol: Protocol;
  protocolItems: ClientProtocolItem[];
  allItems: ProtocolItem[];
  categories: Category[];
  requirements: Requirement[];
  programInfo: ProgramInfo;
}

// Helper function to strip HTML tags and decode entities
function stripHtml(html: string): string {
  let text = html.replace(/<[^>]*>/g, '');
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  text = text.replace(/\s+/g, ' ').trim();
  return text;
}

// Professional color palette
const COLORS = {
  // Primary brand colors
  navy: [30, 58, 95] as [number, number, number],
  navyLight: [45, 74, 111] as [number, number, number],
  orange: [232, 121, 47] as [number, number, number],
  orangeLight: [245, 158, 95] as [number, number, number],
  
  // Text colors
  textDark: [31, 41, 55] as [number, number, number],
  textMedium: [75, 85, 99] as [number, number, number],
  textLight: [156, 163, 175] as [number, number, number],
  
  // Background colors
  white: [255, 255, 255] as [number, number, number],
  cream: [254, 252, 248] as [number, number, number],
  grayLight: [249, 250, 251] as [number, number, number],
  grayMedium: [243, 244, 246] as [number, number, number],
  
  // Utility colors
  green: [16, 185, 129] as [number, number, number],
  greenLight: [209, 250, 229] as [number, number, number],
  border: [229, 231, 235] as [number, number, number],
  gold: [180, 142, 58] as [number, number, number],
};

export async function generateProtocolPdf({
  protocol,
  protocolItems,
  allItems,
  categories,
  requirements,
  programInfo,
}: GeneratePdfParams): Promise<void> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 18;
  const contentWidth = pageWidth - margin * 2;
  let yPos = 0;

  // Generate QR code for protocol link
  let qrCodeDataUrl = "";
  if (protocol.accessToken) {
    const protocolUrl = `${window.location.origin}/protocol/${protocol.accessToken}`;
    try {
      qrCodeDataUrl = await QRCode.toDataURL(protocolUrl, {
        width: 200,
        margin: 1,
        color: { dark: "#1e3a5f", light: "#ffffff" }
      });
    } catch (e) {
      console.error("QR code generation failed:", e);
    }
  }

  // Helper function to add new page if needed
  const checkPageBreak = (requiredSpace: number) => {
    if (yPos + requiredSpace > pageHeight - 30) {
      doc.addPage();
      yPos = 25;
    }
  };

  // Pre-load logo as base64 data URL, and measure it so we can draw it at its true
  // aspect ratio. It was previously forced into a fixed 50x11mm box while the asset
  // is ~8.5:1, which squashed the wordmark to ~54% of its width on every PDF.
  let logoDataUrl = "";
  let logoAspect = 778 / 92; // fallback: intrinsic size of the current logo asset
  try {
    const logoResponse = await fetch("/omega-longevity-logo.png");
    const logoBlob = await logoResponse.blob();
    logoDataUrl = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(logoBlob);
    });
    const dims = await new Promise<{ w: number; h: number }>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
      img.onerror = reject;
      img.src = logoDataUrl;
    });
    if (dims.w > 0 && dims.h > 0) logoAspect = dims.w / dims.h;
  } catch (e) {
    console.error("Logo loading failed:", e);
  }
  
  // ========== HEADER ==========
  const drawHeader = () => {
    // Navy header bar
    doc.setFillColor(...COLORS.navy);
    doc.rect(0, 0, pageWidth, 42, "F");
    
    // Orange accent line at bottom of header
    doc.setFillColor(...COLORS.orange);
    doc.rect(0, 42, pageWidth, 2, "F");
    
    // Add logo image or fallback to text
    if (logoDataUrl) {
      try {
        // Draw at the logo's real proportions (never stretched); width is capped so
        // it stays inside the header bar.
        const logoW = 70;
        const logoH = logoW / logoAspect;
        doc.addImage(logoDataUrl, "PNG", margin, 12, logoW, logoH);
      } catch (e) {
        // Fallback to text if logo fails
        doc.setFontSize(24);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...COLORS.white);
        doc.text("OMEGA", margin, 20);
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...COLORS.orange);
        doc.text("LONGEVITY", margin, 28);
      }
    } else {
      doc.setFontSize(24);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...COLORS.white);
      doc.text("OMEGA", margin, 20);
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...COLORS.orange);
      doc.text("LONGEVITY", margin, 28);
    }
    
    // Tagline
    doc.setFontSize(7);
    doc.setTextColor(200, 200, 200);
    doc.text("ELITE HEALTH OPTIMIZATION", margin, 36);
    
    // Right side - Document info
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.white);
    doc.text("PERSONALIZED PROTOCOL", pageWidth - margin, 16, { align: "right" });
    
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(200, 200, 200);
    const dateStr = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    doc.text(dateStr, pageWidth - margin, 24, { align: "right" });
    
    // Duration badge
    doc.setFillColor(...COLORS.orange);
    const durationText = `${protocol.durationMonths}-MONTH`;
    const badgeWidth = 35;
    doc.roundedRect(pageWidth - margin - badgeWidth, 30, badgeWidth, 8, 2, 2, "F");
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.white);
    doc.text(durationText, pageWidth - margin - badgeWidth / 2, 35.5, { align: "center" });
    
    yPos = 52;
  };

  // ========== CLIENT INFO CARD ==========
  const drawClientInfo = () => {
    // Client card with gradient effect
    doc.setFillColor(...COLORS.grayLight);
    doc.roundedRect(margin, yPos, contentWidth, 38, 3, 3, "F");
    
    // Left accent bar
    doc.setFillColor(...COLORS.orange);
    doc.roundedRect(margin, yPos, 4, 38, 2, 2, "F");
    
    // "Prepared For" label
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.textLight);
    doc.text("PREPARED EXCLUSIVELY FOR", margin + 14, yPos + 10);
    
    // Client name
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.navy);
    doc.text(protocol.clientName, margin + 14, yPos + 24);
    
    // Client email if available
    if (protocol.clientEmail) {
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...COLORS.textMedium);
      doc.text(protocol.clientEmail, margin + 14, yPos + 32);
    }
    
    // QR Code on right side
    if (qrCodeDataUrl) {
      try {
        doc.addImage(qrCodeDataUrl, "PNG", pageWidth - margin - 32, yPos + 3, 28, 28);
        doc.setFontSize(5);
        doc.setTextColor(...COLORS.textLight);
        doc.text("SCAN FOR ONLINE ACCESS", pageWidth - margin - 18, yPos + 35, { align: "center" });
      } catch (e) {
        console.error("Failed to add QR code to PDF:", e);
      }
    }
    
    // Program info if available
    if (programInfo?.currentPhase) {
      const rightX = qrCodeDataUrl ? pageWidth - margin - 45 : pageWidth - margin - 12;
      doc.setFontSize(6);
      doc.setTextColor(...COLORS.textLight);
      doc.text("CURRENT PHASE", rightX, yPos + 10, { align: "right" });
      
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...COLORS.navy);
      doc.text(programInfo.currentPhase.name, rightX, yPos + 18, { align: "right" });
    }
    
    yPos += 48;
  };

  // ========== SECTION HEADER ==========
  const drawSectionHeader = (title: string, icon?: string) => {
    checkPageBreak(20);
    yPos += 6;
    
    // Section title with navy background pill
    doc.setFillColor(...COLORS.navy);
    const titleWidth = doc.getTextWidth(title) * 0.35 + 16;
    doc.roundedRect(margin, yPos - 4, Math.max(titleWidth, 50), 10, 3, 3, "F");
    
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.white);
    doc.text(title.toUpperCase(), margin + 6, yPos + 2);
    
    yPos += 14;
  };

  // ========== BUILD PDF ==========
  drawHeader();
  drawClientInfo();

  // Get included items grouped by category
  const includedItems = protocolItems.filter((item) => item.isIncluded);
  const itemsByCategory = categories
    .map((cat) => ({
      category: cat,
      items: includedItems.filter((item) => {
        const protocolItem = allItems.find((i) => i.id === item.protocolItemId);
        return protocolItem?.categoryId === cat.id;
      }),
    }))
    .filter((group) => group.items.length > 0);

  // ========== PROTOCOL ITEMS ==========
  if (itemsByCategory.length > 0) {
    drawSectionHeader("Your Protocol Items");

    itemsByCategory.forEach((group) => {
      checkPageBreak(45);

      // Category name - elegant style
      doc.setFillColor(...COLORS.orangeLight);
      doc.setDrawColor(...COLORS.orange);
      doc.setLineWidth(0.5);
      const catText = group.category.name;
      const catWidth = doc.getTextWidth(catText) * 0.4 + 14;
      doc.roundedRect(margin, yPos - 3, Math.max(catWidth, 45), 9, 2, 2, "FD");
      
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...COLORS.navy);
      doc.text(catText, margin + 5, yPos + 3);
      yPos += 12;

      // Build table data with purposes
      const tableData: (string | { content: string; styles?: any })[][] = [];
      const headers = protocol.hidePricing
        ? ["Item & Purpose", "Qty", "Schedule", "Duration", "Code"]
        : ["Item & Purpose", "Qty", "Price", "Schedule", "Duration", "Code"];

      group.items.forEach((item) => {
        const protocolItem = allItems.find((i) => i.id === item.protocolItemId);
        if (!protocolItem) return;

        const schedule = item.customSchedule || protocolItem.schedule || "-";
        const duration = item.customDuration || protocolItem.duration || "-";
        const price = item.customPrice || protocolItem.price || "0";
        const affiliateCode = protocolItem.affiliateCode || "-";
        const purpose = protocolItem.purpose ? stripHtml(protocolItem.purpose) : "";

        // Product name with SKU
        const sku = (protocolItem as any).sku;
        const rawName = protocolItem.name.replace(/[^\w\s\-\+\.\/\(\)]/g, '');
        const productName = sku ? `${rawName} · ${sku}` : rawName;
        const nameWithPurpose = purpose 
          ? `${productName}\n${purpose.substring(0, 60)}${purpose.length > 60 ? '...' : ''}`
          : productName;

        if (protocol.hidePricing) {
          tableData.push([
            nameWithPurpose,
            item.quantity.toString(),
            schedule,
            duration,
            affiliateCode,
          ]);
        } else {
          tableData.push([
            nameWithPurpose,
            item.quantity.toString(),
            // The client sources these themselves via our link — never show a price
            // for them (and they're excluded from the totals below).
            isClientSourced(item) ? "Purchase Separately" : `$${parseFloat(price).toFixed(2)}`,
            schedule,
            duration,
            affiliateCode,
          ]);
        }
      });

      // Professional table styling
      autoTable(doc, {
        startY: yPos,
        head: [headers],
        body: tableData,
        margin: { left: margin, right: margin },
        headStyles: {
          fillColor: COLORS.navy,
          textColor: COLORS.white,
          fontStyle: "bold",
          fontSize: 7,
          cellPadding: 4,
          halign: "left",
        },
        bodyStyles: {
          fontSize: 8,
          textColor: COLORS.textDark,
          cellPadding: 4,
          lineColor: COLORS.border,
          lineWidth: 0.2,
        },
        alternateRowStyles: {
          fillColor: COLORS.grayLight,
        },
        columnStyles: protocol.hidePricing
          ? {
              0: { cellWidth: 60, fontStyle: "normal" },
              1: { cellWidth: 12, halign: "center", fontStyle: "bold" },
              2: { cellWidth: 40 },
              3: { cellWidth: 28 },
              4: { cellWidth: 25, halign: "center", textColor: COLORS.orange, fontStyle: "bold" },
            }
          : {
              0: { cellWidth: 50, fontStyle: "normal" },
              1: { cellWidth: 10, halign: "center", fontStyle: "bold" },
              2: { cellWidth: 18, halign: "right", textColor: COLORS.green, fontStyle: "bold" },
              3: { cellWidth: 35 },
              4: { cellWidth: 25 },
              5: { cellWidth: 22, halign: "center", textColor: COLORS.orange, fontStyle: "bold" },
            },
        styles: {
          overflow: "linebreak",
          font: "helvetica",
          cellPadding: { top: 3, right: 3, bottom: 3, left: 3 },
        },
        didParseCell: (data) => {
          // Style the purpose text differently (smaller, gray)
          if (data.section === 'body' && data.column.index === 0) {
            const cellText = String(data.cell.raw);
            if (cellText.includes('\n')) {
              data.cell.styles.fontSize = 7;
            }
          }
        },
      });

      yPos = (doc as any).lastAutoTable.finalY + 10;
    });
  }

  // ========== COACH NOTES ==========
  if (protocol.coachNotes) {
    drawSectionHeader("Notes from Your Coach");

    let cleanNotes = protocol.coachNotes
      .replace(/<\/p><p>/gi, '\n\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<p>/gi, '')
      .replace(/<\/p>/gi, '')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();

    const notesLines = cleanNotes.split('\n').filter(line => line.trim());
    const estimatedHeight = Math.min(notesLines.length * 6 + 18, 80);
    checkPageBreak(estimatedHeight);

    // Elegant notes card
    doc.setFillColor(...COLORS.cream);
    doc.setDrawColor(...COLORS.gold);
    doc.setLineWidth(1);
    doc.roundedRect(margin, yPos, contentWidth, estimatedHeight, 4, 4, "FD");
    
    // Gold accent bar
    doc.setFillColor(...COLORS.gold);
    doc.roundedRect(margin, yPos, 4, estimatedHeight, 2, 2, "F");

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.textDark);

    let notesY = yPos + 10;
    notesLines.forEach((line) => {
      if (line.trim()) {
        const wrappedLines = doc.splitTextToSize(line.trim(), contentWidth - 20);
        doc.text(wrappedLines, margin + 12, notesY);
        notesY += wrappedLines.length * 4.5 + 2;
      }
    });

    yPos += estimatedHeight + 8;
  }

  // ========== RECOMMENDATIONS ==========
  if (requirements && requirements.length > 0) {
    drawSectionHeader("Recommendations & Guidelines");

    checkPageBreak(requirements.length * 12 + 10);
    
    // Light background for recommendations
    const recHeight = requirements.length * 10 + 8;
    doc.setFillColor(...COLORS.grayLight);
    doc.roundedRect(margin, yPos, contentWidth, recHeight, 3, 3, "F");

    let recY = yPos + 8;
    requirements.forEach((req, index) => {
      // Numbered bullet
      doc.setFillColor(...COLORS.navy);
      doc.circle(margin + 8, recY - 1, 3, "F");
      doc.setFontSize(6);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...COLORS.white);
      doc.text((index + 1).toString(), margin + 8, recY + 0.5, { align: "center" });
      
      // Recommendation text
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...COLORS.textDark);
      
      const lines = doc.splitTextToSize(req.text, contentWidth - 25);
      doc.text(lines, margin + 16, recY);
      recY += lines.length * 4 + 6;
    });

    yPos += recHeight + 8;
  }

  // ========== PARTNER DISCOUNTS CTA ==========
  checkPageBreak(28);
  
  doc.setFillColor(...COLORS.navy);
  doc.roundedRect(margin, yPos, contentWidth, 22, 4, 4, "F");
  
  // Orange accent
  doc.setFillColor(...COLORS.orange);
  doc.roundedRect(margin + contentWidth - 60, yPos, 60, 22, 4, 4, "F");
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.white);
  doc.text("Partner Discounts Available", margin + 12, yPos + 10);
  
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text("Visit omegalongevity.com/partners for exclusive codes", margin + 12, yPos + 17);
  
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("SAVE NOW", margin + contentWidth - 30, yPos + 13, { align: "center" });
  
  yPos += 30;

  // ========== PRICING SUMMARY ==========
  if (!protocol.hidePricing) {
    drawSectionHeader("Investment Summary");

    let subtotal = 0;
    includedItems.forEach((item) => {
      // Client-sourced items are bought by the client through our links — we never
      // sell them, so they must not land in the subtotal/total. (Previously they
      // were billed here, inflating the client's total and contradicting the
      // "Purchase Separately" shown on the protocol page.)
      if (isClientSourced(item)) return;
      const protocolItem = allItems.find((i) => i.id === item.protocolItemId);
      if (protocolItem) {
        const price = item.customPrice || protocolItem.price || "0";
        subtotal += parseFloat(price) * item.quantity;
      }
    });

    const discountPercent = parseFloat(protocol.discountPercent || "0");
    const discount = (subtotal * discountPercent) / 100;
    const coaching = parseFloat(protocol.coachingPrice || "0");
    const total = subtotal - discount + coaching;
    const ccFee = total * 0.035;

    checkPageBreak(75);

    // Professional pricing card
    doc.setFillColor(...COLORS.white);
    doc.setDrawColor(...COLORS.navy);
    doc.setLineWidth(1);
    doc.roundedRect(margin, yPos, contentWidth, 65, 4, 4, "FD");
    
    // Header bar
    doc.setFillColor(...COLORS.navy);
    doc.roundedRect(margin, yPos, contentWidth, 12, 4, 4, "F");
    doc.rect(margin, yPos + 6, contentWidth, 6, "F");
    
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.white);
    doc.text("YOUR INVESTMENT", margin + 10, yPos + 8);

    const priceX = pageWidth - margin - 12;
    let priceY = yPos + 22;

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");

    // Products Subtotal
    doc.setTextColor(...COLORS.textMedium);
    doc.text("Products Subtotal", margin + 10, priceY);
    doc.setTextColor(...COLORS.textDark);
    doc.text(`$${subtotal.toFixed(2)}`, priceX, priceY, { align: "right" });
    priceY += 9;

    // Discount
    if (discountPercent > 0) {
      doc.setFillColor(...COLORS.greenLight);
      doc.roundedRect(margin + 8, priceY - 4, contentWidth - 16, 8, 2, 2, "F");
      doc.setTextColor(...COLORS.green);
      doc.setFont("helvetica", "bold");
      doc.text(`VIP Discount (${discountPercent}%)`, margin + 10, priceY);
      doc.text(`-$${discount.toFixed(2)}`, priceX, priceY, { align: "right" });
      doc.setFont("helvetica", "normal");
      priceY += 10;
    }

    // Coaching
    if (coaching > 0) {
      doc.setTextColor(...COLORS.textMedium);
      doc.text(`Coaching: ${protocol.coachingPackage || "Package"}`, margin + 10, priceY);
      doc.setTextColor(...COLORS.textDark);
      doc.text(`$${coaching.toFixed(2)}`, priceX, priceY, { align: "right" });
      priceY += 9;
    }

    // Divider
    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.5);
    doc.line(margin + 10, priceY, priceX, priceY);
    priceY += 8;

    // Total - highlighted
    doc.setFillColor(...COLORS.orange);
    doc.roundedRect(margin + 8, priceY - 5, contentWidth - 16, 12, 3, 3, "F");
    
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.white);
    doc.text("TOTAL", margin + 12, priceY + 3);
    doc.text(`$${total.toFixed(2)}`, priceX - 2, priceY + 3, { align: "right" });
    priceY += 12;

    // CC Fee note
    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.textLight);
    doc.text(
      `* 3.5% processing fee ($${ccFee.toFixed(2)}) applies to card payments.`,
      margin + 10,
      priceY
    );

    yPos += 75;
  } else {
    // Coaching fee only
    const coaching = parseFloat(protocol.coachingPrice || "0");
    if (coaching > 0) {
      drawSectionHeader("Coaching Investment");

      checkPageBreak(35);

      doc.setFillColor(...COLORS.grayLight);
      doc.roundedRect(margin, yPos, contentWidth, 28, 4, 4, "F");

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...COLORS.textMedium);
      doc.text(protocol.coachingPackage || "Coaching Package", margin + 12, yPos + 12);

      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...COLORS.orange);
      doc.text(`$${coaching.toFixed(2)}`, pageWidth - margin - 12, yPos + 14, { align: "right" });

      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...COLORS.textLight);
      doc.text(
        "Products purchased separately through affiliate partners",
        margin + 12,
        yPos + 22
      );

      yPos += 38;
    }
  }

  // ========== FOOTER ON ALL PAGES ==========
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    
    // Footer bar
    doc.setFillColor(...COLORS.navy);
    doc.rect(0, pageHeight - 14, pageWidth, 14, "F");
    
    // Orange accent
    doc.setFillColor(...COLORS.orange);
    doc.rect(0, pageHeight - 14, pageWidth, 1.5, "F");
    
    // Footer text
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.white);
    doc.text("OMEGA LONGEVITY", margin, pageHeight - 5);
    
    doc.setFont("helvetica", "normal");
    doc.text("omegalongevity.com", pageWidth / 2, pageHeight - 5, { align: "center" });
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 5, { align: "right" });
  }

  // Save the PDF
  const fileName = `${protocol.clientName.replace(/\s+/g, "_")}_Protocol_${
    new Date().toISOString().split("T")[0]
  }.pdf`;
  doc.save(fileName);
}
