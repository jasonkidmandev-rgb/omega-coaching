import nodemailer from "nodemailer";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

import { getSiteSetting } from './db';
import { logNotification } from './clientCorner/notificationHistoryRouter';
import { isStaging } from './_core/appEnv';

// Helper function to check if a notification type is enabled
async function isNotificationEnabled(notificationType: string): Promise<boolean> {
  const setting = await getSiteSetting(`notification_${notificationType}`);
  // Default to true if setting doesn't exist (backwards compatibility)
  return setting !== 'false';
}

// Email configuration - uses environment variables
// Resend HTTP API adapter — same sendMail() interface as nodemailer so all
// callers in this file work unchanged. Uses port 443 (HTTPS) so Railway's
// outbound SMTP port blocks are irrelevant.
const getTransporter = () => {
  const apiKey = process.env.RESEND_API_KEY || process.env.SMTP_PASS;
  const defaultFrom = process.env.SMTP_FROM || 'noreply@humanedge.health';

  if (!apiKey) {
    console.warn("[Email] No RESEND_API_KEY or SMTP_PASS set. Emails will be simulated.");
    return null;
  }

  // Normalize Resend `from` addresses. Handles:
  //   "Name" <email>               → Name <email>      (quoted display name)
  //   "Name" <Name <email>>        → Name <email>      (double-wrapped: template + full-address smtpFrom)
  //   "Name" <"Name" <email>>      → Name <email>      (env var with quotes + template wrap)
  const normalizeAddr = (addr: string): string => {
    const s = addr.trim();
    // Strip quoted display name: "Name" <email@domain>
    let m = s.match(/^"([^"]+)"\s*<([^>]+)>$/);
    if (m) return `${m[1]} <${m[2]}>`;
    // Fix double-wrap: "Name" <...anything...<email@domain>> — extract innermost email
    m = s.match(/^"([^"]+)"\s*<.+<([^@>]+@[^>]+)>>$/);
    if (m) return `${m[1]} <${m[2]}>`;
    return s;
  };

  return {
    sendMail: async (options: {
      from?: string;
      replyTo?: string;
      to: string | string[];
      subject: string;
      html?: string;
      text?: string;
      attachments?: Array<{ filename: string; content: Buffer | string; contentType?: string }>;
    }): Promise<{ messageId: string }> => {
      // Staging kill switch: never deliver real email from a test environment.
      if (isStaging()) {
        const to = Array.isArray(options.to) ? options.to.join(', ') : options.to;
        console.log(`[Email] STAGING — suppressed (not sent) | to: ${to} | subject: ${options.subject}`);
        return { messageId: 'staging-suppressed' };
      }
      const fromAddr = normalizeAddr(options.from || defaultFrom);
      console.log('[Email] Sending | from:', fromAddr, '| to:', Array.isArray(options.to) ? options.to.join(', ') : options.to);

      const body: Record<string, unknown> = {
        from: fromAddr,
        to: Array.isArray(options.to) ? options.to : [options.to],
        subject: options.subject,
        ...(options.html && { html: options.html }),
        ...(options.text && { text: options.text }),
        ...(options.replyTo && { reply_to: normalizeAddr(options.replyTo) }),
      };

      if (options.attachments?.length) {
        body.attachments = options.attachments.map(att => ({
          filename: att.filename,
          content: Buffer.isBuffer(att.content)
            ? att.content.toString('base64')
            : Buffer.from(att.content as string).toString('base64'),
        }));
      }

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ message: response.statusText }));
        const msg = (err as any).message || `Resend API error ${response.status}`;
        throw new Error(`${msg} [from: ${fromAddr}]`);
      }

      const data = await response.json() as { id: string };
      return { messageId: data.id };
    },
  };
};

interface ProtocolItem {
  id: number;
  categoryId: number;
  name: string;
  schedule: string | null;
  duration: string | null;
  price: string | null;
  affiliateCode: string | null;
}

interface Category {
  id: number;
  name: string;
}

interface ClientProtocolItem {
  protocolItemId: number;
  quantity: number;
  isIncluded: boolean;
  isRecommended: boolean;
  customSchedule: string | null;
  customDuration: string | null;
  customPrice: string | null;
}

interface Protocol {
  id: number;
  clientName: string;
  clientEmail: string | null;
  durationMonths: number;
  discountPercent: string | null;
  coachingPackage: string | null;
  coachingPrice: string | null;
  hidePricing?: boolean;
  coachNotes?: string | null;
  accessToken: string;
}

interface Requirement {
  id: number;
  text: string;
}

interface ProgramInfo {
  program?: { name: string };
  currentPhase?: { name: string; description: string | null; goals: string | null };
}

interface ProtocolSectionData {
  sectionType: string;
  content: any;
  isEnabled: boolean;
}

interface GeneratePdfParams {
  protocol: Protocol;
  protocolItems: ClientProtocolItem[];
  allItems: ProtocolItem[];
  categories: Category[];
  requirements: Requirement[];
  programInfo: ProgramInfo | null;
  protocolSections?: ProtocolSectionData[];
}

// Generate PDF buffer for email attachment
export function generateProtocolPdfBuffer(params: GeneratePdfParams): Buffer {
  const { protocol, protocolItems, allItems, categories, requirements, programInfo } = params;
  
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let yPos = 20;

  const checkPageBreak = (requiredSpace: number) => {
    if (yPos + requiredSpace > doc.internal.pageSize.getHeight() - 20) {
      doc.addPage();
      yPos = 20;
    }
  };

  // Title
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 64, 175);
  doc.text("Omega Longevity", pageWidth / 2, yPos, { align: "center" });
  yPos += 10;

  doc.setFontSize(16);
  doc.setTextColor(100, 100, 100);
  doc.text("Health Protocol", pageWidth / 2, yPos, { align: "center" });
  yPos += 15;

  // Client Info Box
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, yPos, pageWidth - margin * 2, 30, 3, 3, "F");

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text(`Client: ${protocol.clientName}`, margin + 5, yPos + 10);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text(`Duration: ${protocol.durationMonths} months`, margin + 5, yPos + 20);

  if (programInfo?.program) {
    doc.text(`Program: ${programInfo.program.name}`, pageWidth / 2, yPos + 10);
  }
  if (programInfo?.currentPhase) {
    doc.text(`Current Phase: ${programInfo.currentPhase.name}`, pageWidth / 2, yPos + 20);
  }

  yPos += 40;

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

  // Protocol Items by Category
  itemsByCategory.forEach((group) => {
    checkPageBreak(40);

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 64, 175);
    doc.text(group.category.name, margin, yPos);
    yPos += 8;

    const tableData: (string | number)[][] = [];
    const headers: string[] = protocol.hidePricing
      ? ["Item", "Qty", "Schedule", "Duration", "Affiliate Code"]
      : ["Item", "Qty", "Price", "Schedule", "Duration", "Affiliate Code"];

    group.items.forEach((item) => {
      const protocolItem = allItems.find((i) => i.id === item.protocolItemId);
      // Use snapshotName as fallback for deleted master items
      const itemName = protocolItem?.name || (item as any).snapshotName || `Item #${item.protocolItemId}`;
      if (!protocolItem && !(item as any).snapshotName) return;

      const schedule = item.customSchedule || protocolItem?.schedule || "-";
      const duration = item.customDuration || protocolItem?.duration || "-";
      const price = item.customPrice || protocolItem?.price || "0";
      const affiliateCode = protocolItem?.affiliateCode || "-";
      const recommended = item.isRecommended ? " ★" : "";

      if (protocol.hidePricing) {
        tableData.push([itemName + recommended, item.quantity, schedule, duration, affiliateCode]);
      } else {
        tableData.push([itemName + recommended, item.quantity, `$${parseFloat(price).toFixed(2)}`, schedule, duration, affiliateCode]);
      }
    });

    autoTable(doc, {
      startY: yPos,
      head: [headers],
      body: tableData,
      margin: { left: margin, right: margin },
      headStyles: { fillColor: [30, 64, 175], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 9 },
      bodyStyles: { fontSize: 9, textColor: [50, 50, 50] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;
  });

  // Protocol Sections (Periodization, Training Split, Program Guide)
  if (params.protocolSections && params.protocolSections.length > 0) {
    const enabledSections = params.protocolSections.filter(s => s.isEnabled);
    
    enabledSections.forEach((section) => {
      const sectionLabels: Record<string, string> = {
        periodization: "Periodization Overview",
        training_split: "Training Split Overview",
        program_guide: "Complete Program Guide",
      };
      const sectionTitle = sectionLabels[section.sectionType] || section.sectionType;
      
      checkPageBreak(40);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 64, 175);
      doc.text(sectionTitle, margin, yPos);
      yPos += 2;
      doc.setDrawColor(30, 64, 175);
      doc.setLineWidth(0.5);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 8;
      
      const content = section.content || {};
      
      if (section.sectionType === "periodization" && content.html) {
        // Strip HTML tags and render as text
        const plainText = content.html
          .replace(/<h2[^>]*>/gi, '\n## ')
          .replace(/<\/h2>/gi, '\n')
          .replace(/<h3[^>]*>/gi, '\n### ')
          .replace(/<\/h3>/gi, '\n')
          .replace(/<li[^>]*>/gi, '• ')
          .replace(/<\/li>/gi, '\n')
          .replace(/<br\s*\/?>/gi, '\n')
          .replace(/<p[^>]*>/gi, '')
          .replace(/<\/p>/gi, '\n')
          .replace(/<strong[^>]*>/gi, '')
          .replace(/<\/strong>/gi, '')
          .replace(/<em[^>]*>/gi, '')
          .replace(/<\/em>/gi, '')
          .replace(/<[^>]+>/g, '')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&nbsp;/g, ' ')
          .replace(/\n{3,}/g, '\n\n')
          .trim();
        
        const lines = plainText.split('\n');
        lines.forEach((line: string) => {
          if (!line.trim()) { yPos += 3; return; }
          checkPageBreak(10);
          if (line.startsWith('## ')) {
            doc.setFontSize(12);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(30, 64, 175);
            const wrapped = doc.splitTextToSize(line.replace('## ', ''), pageWidth - margin * 2);
            doc.text(wrapped, margin, yPos);
            yPos += wrapped.length * 6 + 3;
          } else if (line.startsWith('### ')) {
            doc.setFontSize(11);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(50, 50, 50);
            const wrapped = doc.splitTextToSize(line.replace('### ', ''), pageWidth - margin * 2);
            doc.text(wrapped, margin, yPos);
            yPos += wrapped.length * 5 + 2;
          } else {
            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(50, 50, 50);
            const wrapped = doc.splitTextToSize(line, pageWidth - margin * 2);
            doc.text(wrapped, margin, yPos);
            yPos += wrapped.length * 5 + 2;
          }
        });
        yPos += 5;
      }
      
      if (section.sectionType === "training_split") {
        const phases = content.phases || [];
        if (content.additionalNotes) {
          doc.setFontSize(10);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(50, 50, 50);
          const notesText = (content.additionalNotes || '')
            .replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
          if (notesText) {
            const wrapped = doc.splitTextToSize(notesText, pageWidth - margin * 2);
            doc.text(wrapped, margin, yPos);
            yPos += wrapped.length * 5 + 5;
          }
        }
        phases.forEach((phase: any) => {
          checkPageBreak(30);
          doc.setFontSize(12);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(30, 64, 175);
          doc.text(`${phase.name} (Weeks ${phase.weeks})`, margin, yPos);
          yPos += 7;
          
          if (phase.focus) {
            doc.setFontSize(10);
            doc.setFont("helvetica", "italic");
            doc.setTextColor(100, 100, 100);
            const wrapped = doc.splitTextToSize(`Focus: ${phase.focus}`, pageWidth - margin * 2);
            doc.text(wrapped, margin, yPos);
            yPos += wrapped.length * 5 + 3;
          }
          
          const weekDetails = phase.weekDetails || [];
          weekDetails.forEach((week: any) => {
            checkPageBreak(12);
            doc.setFontSize(9);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(50, 50, 50);
            doc.text(`Week ${week.week}:`, margin + 5, yPos);
            doc.setFont("helvetica", "normal");
            const wrapped = doc.splitTextToSize(week.adjustment || '', pageWidth - margin * 2 - 30);
            doc.text(wrapped, margin + 30, yPos);
            yPos += wrapped.length * 4.5 + 2;
          });
          yPos += 5;
        });
      }
      
      if (section.sectionType === "program_guide") {
        const tabs = content.tabs || {};
        const tabLabels: Record<string, string> = {
          training_split: "Training Split",
          warm_up_cool_down: "Warm Up & Cool Down",
          energetic_systems: "Energetic Systems",
          nutrition: "Nutrition",
          neuroplastic_drills: "Neuroplastic Drills",
          supplementation: "Supplementation",
          emf_quantum: "EMF & Quantum",
          lifestyle_circadian: "Lifestyle & Circadian",
          mentality_mindset: "Mentality & Mindset",
        };
        Object.entries(tabs).forEach(([key, html]: [string, any]) => {
          if (!html || typeof html !== 'string') return;
          const plainText = html
            .replace(/<h2[^>]*>/gi, '\n## ')
            .replace(/<\/h2>/gi, '\n')
            .replace(/<h3[^>]*>/gi, '\n### ')
            .replace(/<\/h3>/gi, '\n')
            .replace(/<li[^>]*>/gi, '• ')
            .replace(/<\/li>/gi, '\n')
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<p[^>]*>/gi, '')
            .replace(/<\/p>/gi, '\n')
            .replace(/<strong[^>]*>/gi, '')
            .replace(/<\/strong>/gi, '')
            .replace(/<em[^>]*>/gi, '')
            .replace(/<\/em>/gi, '')
            .replace(/<[^>]+>/g, '')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&nbsp;/g, ' ')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
          if (!plainText) return;
          
          checkPageBreak(20);
          doc.setFontSize(12);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(30, 64, 175);
          doc.text(tabLabels[key] || key, margin, yPos);
          yPos += 7;
          
          const lines = plainText.split('\n');
          lines.forEach((line: string) => {
            if (!line.trim()) { yPos += 2; return; }
            checkPageBreak(8);
            if (line.startsWith('## ') || line.startsWith('### ')) {
              doc.setFontSize(10);
              doc.setFont("helvetica", "bold");
              doc.setTextColor(50, 50, 50);
              const wrapped = doc.splitTextToSize(line.replace(/^#{2,3}\s/, ''), pageWidth - margin * 2);
              doc.text(wrapped, margin, yPos);
              yPos += wrapped.length * 5 + 2;
            } else {
              doc.setFontSize(9);
              doc.setFont("helvetica", "normal");
              doc.setTextColor(50, 50, 50);
              const wrapped = doc.splitTextToSize(line, pageWidth - margin * 2);
              doc.text(wrapped, margin, yPos);
              yPos += wrapped.length * 4.5 + 2;
            }
          });
          yPos += 5;
        });
      }
      
      yPos += 10;
    });
  }

  // Coach Notes Section
  if (protocol.coachNotes) {
    checkPageBreak(60);

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 64, 175);
    doc.text("Personalized Notes from Your Coach", margin, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(50, 50, 50);

    const notesLines = protocol.coachNotes.split('\n');
    notesLines.forEach((line) => {
      checkPageBreak(8);
      if (line.trim()) {
        const wrappedLines = doc.splitTextToSize(line, pageWidth - margin * 2 - 10);
        doc.text(wrappedLines, margin + 5, yPos);
        yPos += wrappedLines.length * 5 + 2;
      } else {
        yPos += 3;
      }
    });

    yPos += 10;
  }

  // Requirements Section
  if (requirements && requirements.length > 0) {
    checkPageBreak(40);

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 64, 175);
    doc.text("Requirements & Guidelines", margin, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(50, 50, 50);

    requirements.forEach((req) => {
      checkPageBreak(10);
      const lines = doc.splitTextToSize(`• ${req.text}`, pageWidth - margin * 2);
      doc.text(lines, margin, yPos);
      yPos += lines.length * 5 + 3;
    });

    yPos += 5;
  }

  // Partners Link Section
  checkPageBreak(30);
  
  doc.setFillColor(255, 247, 237); // Light orange background
  doc.setDrawColor(234, 88, 12); // Orange border
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, yPos, pageWidth - margin * 2, 25, 3, 3, "FD");
  
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(234, 88, 12);
  doc.text("Affiliate Partner Discounts", margin + 5, yPos + 10);
  
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  doc.text(
    "Visit our Partners page for exclusive discount codes: omegalongevity.com/partners",
    margin + 5,
    yPos + 18
  );
  
  yPos += 35;

  // Pricing Summary (only if not hidden)
  if (!protocol.hidePricing) {
    checkPageBreak(60);

    let subtotal = 0;
    includedItems.forEach((item) => {
      // Client-sourced items are bought by the client via our links — we never sell
      // them, so they must not be added to the emailed total (this mirrors the
      // protocol page, which is what actually drives the charge).
      if ((item as any).fulfillmentSource === "client") return;
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

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 64, 175);
    doc.text("Pricing Summary", margin, yPos);
    yPos += 10;

    doc.setFillColor(248, 250, 252);
    doc.roundedRect(margin, yPos, pageWidth - margin * 2, 50, 3, 3, "F");

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(50, 50, 50);

    const priceX = pageWidth - margin - 5;
    yPos += 10;

    doc.text("Products Subtotal:", margin + 5, yPos);
    doc.text(`$${subtotal.toFixed(2)}`, priceX, yPos, { align: "right" });
    yPos += 8;

    if (discount > 0) {
      doc.setTextColor(34, 197, 94);
      doc.text(`Discount (${discountPercent}%):`, margin + 5, yPos);
      doc.text(`-$${discount.toFixed(2)}`, priceX, yPos, { align: "right" });
      yPos += 8;
      doc.setTextColor(50, 50, 50);
    }

    if (coaching > 0 && protocol.coachingPackage) {
      doc.text(`${protocol.coachingPackage}:`, margin + 5, yPos);
      doc.text(`$${coaching.toFixed(2)}`, priceX, yPos, { align: "right" });
      yPos += 8;
    }

    doc.setFont("helvetica", "bold");
    doc.text("Total:", margin + 5, yPos);
    doc.text(`$${total.toFixed(2)}`, priceX, yPos, { align: "right" });
  } else {
    // Show only coaching fee for hidePricing protocols
    const coaching = parseFloat(protocol.coachingPrice || "0");
    if (coaching > 0 && protocol.coachingPackage) {
      checkPageBreak(40);

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 64, 175);
      doc.text("Coaching Fee", margin, yPos);
      yPos += 10;

      doc.setFillColor(248, 250, 252);
      doc.roundedRect(margin, yPos, pageWidth - margin * 2, 25, 3, 3, "F");

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      doc.text("Products are purchased separately through our affiliate partners.", margin + 5, yPos + 8);

      doc.setFont("helvetica", "bold");
      doc.setTextColor(50, 50, 50);
      doc.text(`${protocol.coachingPackage}:`, margin + 5, yPos + 18);
      doc.text(`$${coaching.toFixed(2)}`, pageWidth - margin - 5, yPos + 18, { align: "right" });
    }
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Generated on ${new Date().toLocaleDateString('en-US', { timeZone: 'America/Denver' })} | Page ${i} of ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: "center" }
    );
    doc.text(
      "Omega Longevity - omegalongevity.com",
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 5,
      { align: "center" }
    );
  }

  // Return as Buffer
  const pdfOutput = doc.output("arraybuffer");
  return Buffer.from(pdfOutput);
}

interface SendProtocolEmailParams {
  to: string;
  clientName: string;
  protocol: Protocol;
  protocolItems: ClientProtocolItem[];
  allItems: ProtocolItem[];
  categories: Category[];
  requirements: Requirement[];
  programInfo: ProgramInfo | null;
  protocolUrl: string;
  protocolSections?: ProtocolSectionData[];
}

// Send protocol link only (no PDF attachment)
export async function sendProtocolLink(params: {
  to: string;
  clientName: string;
  protocolUrl: string;
  programName?: string;
}): Promise<{ success: boolean; message: string }> {
  const { to, clientName, protocolUrl, programName } = params;

  const transporter = getTransporter();
  const smtpFrom = process.env.SMTP_FROM || "Omega Longevity <noreply@humanedge.health>";

  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #1e40af; margin-bottom: 5px;">Omega Longevity</h1>
        <p style="color: #6b7280; font-size: 14px;">Elite Level Health Optimization</p>
      </div>
      
      <p style="font-size: 16px; color: #374151;">Hi ${clientName},</p>
      
      <p style="font-size: 14px; color: #374151; line-height: 1.6;">
        Your personalized health protocol${programName ? ` for the <strong>${programName}</strong>` : ''} is ready for you to review!
      </p>
      
      <p style="font-size: 14px; color: #374151; line-height: 1.6;">
        Click the button below to view your complete protocol, including all recommended products, 
        dosing schedules, and exclusive affiliate discount codes.
      </p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${protocolUrl}" 
           style="display: inline-block; background-color: #ea580c; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
          View Your Protocol
        </a>
      </div>
      
      <p style="font-size: 14px; color: #374151; line-height: 1.6;">
        Once you've reviewed your protocol, you can approve it directly from the page. 
        If you have any questions, use the discussion feature on your protocol page to 
        communicate with your coach.
      </p>
      
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
      
      <p style="font-size: 12px; color: #9ca3af; text-align: center;">
        This email was sent by Omega Longevity.<br>
        If you didn't request this protocol, you can safely ignore this email.
      </p>
    </div>
  `;

  if (!transporter) {
    console.log("=== SIMULATED EMAIL (Protocol Link) ===");
    console.log(`To: ${to}`);
    console.log(`Subject: Your Health Protocol is Ready - Omega Longevity`);
    console.log(`Link: ${protocolUrl}`);
    console.log("========================");
    return { success: true, message: "Email simulated (SMTP not configured)" };
  }

  try {
    // Auto-inject email tracking
    let _trackedHtml_sendProtocolLink = emailHtml;
    try {
      const { createEmailTracking, injectTrackingIntoHtml } = await import('./emailTracking');
      const _baseUrl = process.env.VITE_APP_URL || 'https://www.humanedge.health';
      // @ts-ignore - auto-injected tracking code uses typeof checks for variable detection
      const _tid = await createEmailTracking({ emailType: 'sendProtocolLink', recipientEmail: to, recipientName: typeof clientName !== 'undefined' ? clientName : (typeof recipientName !== 'undefined' ? recipientName : (typeof userName !== 'undefined' ? userName : undefined)), subject: typeof subject !== 'undefined' ? subject : 'sendProtocolLink' });
      _trackedHtml_sendProtocolLink = injectTrackingIntoHtml(emailHtml, _tid, _baseUrl);
    } catch (_e) { /* tracking failed, send without */ }
    await transporter.sendMail({
      from: `"Omega Longevity" <${smtpFrom}>`,
      replyTo: "omega@omegalongevity.com",
      to,
      subject: `Your Health Protocol is Ready - Omega Longevity`,
      html: _trackedHtml_sendProtocolLink,
    });
    logEmailSentToHistory({ recipientEmail: to, recipientName: clientName, subject: 'Your Health Protocol is Ready', category: 'protocol', notificationType: 'protocol_link', status: 'sent' });
    return { success: true, message: "Protocol link sent successfully" };
  } catch (error) {
    console.error("Failed to send protocol link email:", error);
    return { success: false, message: `Failed to send email: ${error instanceof Error ? error.message : "Unknown error"}` };
  }
}

export async function sendProtocolEmail(params: SendProtocolEmailParams): Promise<{ success: boolean; message: string }> {
  // Check if protocol sent notifications are enabled
  const isEnabled = await isNotificationEnabled('protocol_sent');
  if (!isEnabled) {
    console.log('[Email] Protocol sent notification is disabled, skipping email');
    return { success: true, message: 'Email skipped - notification disabled in settings' };
  }

  const { to, clientName, protocol, protocolItems, allItems, categories, requirements, programInfo, protocolUrl, protocolSections } = params;

  const transporter = getTransporter();
  const smtpFrom = process.env.SMTP_FROM || "Omega Longevity <noreply@humanedge.health>";

  // Generate PDF
  const pdfBuffer = generateProtocolPdfBuffer({
    protocol,
    protocolItems,
    allItems,
    categories,
    requirements,
    programInfo,
    protocolSections,
  });

  const fileName = `${clientName.replace(/\s+/g, "_")}_Protocol_${new Date().toISOString().split("T")[0]}.pdf`;

  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #1e40af; margin-bottom: 5px;">Omega Longevity</h1>
        <p style="color: #6b7280; font-size: 14px;">Elite Level Health Optimization</p>
      </div>
      
      <p style="font-size: 16px; color: #374151;">Hi ${clientName},</p>
      
      <p style="font-size: 14px; color: #374151; line-height: 1.6;">
        Your personalized health protocol is attached to this email as a PDF document. 
        You can also view your protocol online at any time using the link below.
      </p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${protocolUrl}" 
           style="display: inline-block; background-color: #1e40af; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          View Protocol Online
        </a>
      </div>
      
      <p style="font-size: 14px; color: #374151; line-height: 1.6;">
        If you have any questions about your protocol, please don't hesitate to reach out through the 
        discussion feature on your protocol page or contact your coach directly.
      </p>
      
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
      
      <p style="font-size: 12px; color: #9ca3af; text-align: center;">
        This email was sent by Omega Longevity. Please do not reply directly to this email.
      </p>
    </div>
  `;

  if (!transporter) {
    // Simulate email sending when SMTP is not configured
    console.log("=== SIMULATED EMAIL ===");
    console.log(`To: ${to}`);
    console.log(`Subject: Your Health Protocol from Omega Longevity`);
    console.log(`Attachment: ${fileName} (${pdfBuffer.length} bytes)`);
    console.log("========================");
    
    return {
      success: true,
      message: "Email simulated (SMTP not configured). In production, configure SMTP_HOST, SMTP_USER, SMTP_PASS environment variables.",
    };
  }

  try {
    // Auto-inject email tracking
    let _trackedHtml_sendProtocolEmail = emailHtml;
    try {
      const { createEmailTracking, injectTrackingIntoHtml } = await import('./emailTracking');
      const _baseUrl = process.env.VITE_APP_URL || 'https://www.humanedge.health';
      // @ts-ignore - auto-injected tracking code uses typeof checks for variable detection
      const _tid = await createEmailTracking({ emailType: 'sendProtocolEmail', recipientEmail: to, recipientName: typeof clientName !== 'undefined' ? clientName : (typeof recipientName !== 'undefined' ? recipientName : (typeof userName !== 'undefined' ? userName : undefined)), subject: typeof subject !== 'undefined' ? subject : 'sendProtocolEmail' });
      _trackedHtml_sendProtocolEmail = injectTrackingIntoHtml(emailHtml, _tid, _baseUrl);
    } catch (_e) { /* tracking failed, send without */ }
    await transporter.sendMail({
      from: `"Omega Longevity" <${smtpFrom}>`,
      replyTo: "omega@omegalongevity.com",
      to,
      subject: `Your Health Protocol from Omega Longevity`,
      html: _trackedHtml_sendProtocolEmail,
      attachments: [
        {
          filename: fileName,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    });
    logEmailSentToHistory({ recipientEmail: to, recipientName: clientName, subject: 'Your Health Protocol from Omega Longevity', category: 'protocol', notificationType: 'protocol_email', status: 'sent' });

    return { success: true, message: `Protocol PDF sent to ${to}` };
  } catch (error) {
    console.error("Email sending error:", error);
    return { success: false, message: `Failed to send email: ${(error as Error).message}` };
  }
}


// Send notification when a high-discount coupon (>20%) is used
export async function sendHighDiscountCouponNotification(params: {
  adminEmails: string[];
  couponCode: string;
  discountPercent: number;
  clientName: string;
  clientEmail: string | null;
  protocolId: number;
  discountAmount: number;
}): Promise<{ success: boolean; message: string }> {
  const { adminEmails, couponCode, discountPercent, clientName, clientEmail, protocolId, discountAmount } = params;
  
  if (adminEmails.length === 0) {
    console.log("No admin emails configured for high-discount notification");
    return { success: false, message: "No admin emails configured" };
  }

  const transporter = getTransporter();
  const smtpFrom = process.env.SMTP_FROM || "noreply@humanedge.health";

  const subject = `⚠️ High-Discount Coupon Used: ${couponCode} (${discountPercent}% off)`;
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .alert-box { background: #FEF3C7; border: 2px solid #F59E0B; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
        .alert-title { color: #92400E; font-size: 18px; font-weight: bold; margin-bottom: 10px; }
        .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #E5E7EB; }
        .detail-label { color: #6B7280; }
        .detail-value { font-weight: 600; }
        .highlight { color: #DC2626; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="alert-box">
          <div class="alert-title">⚠️ High-Discount Coupon Alert</div>
          <p>A coupon with a discount greater than 20% has been applied to a client protocol.</p>
        </div>
        
        <h3>Coupon Details</h3>
        <div class="detail-row">
          <span class="detail-label">Coupon Code:</span>
          <span class="detail-value">${couponCode}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Discount Percentage:</span>
          <span class="detail-value highlight">${discountPercent}%</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Discount Amount:</span>
          <span class="detail-value">$${discountAmount.toFixed(2)}</span>
        </div>
        
        <h3>Client Details</h3>
        <div class="detail-row">
          <span class="detail-label">Client Name:</span>
          <span class="detail-value">${clientName}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Client Email:</span>
          <span class="detail-value">${clientEmail || 'Not provided'}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Protocol ID:</span>
          <span class="detail-value">#${protocolId}</span>
        </div>
        
        <p style="margin-top: 20px; color: #6B7280; font-size: 14px;">
          This is an automated notification. Please review this usage if necessary.
        </p>
      </div>
    </body>
    </html>
  `;

  if (!transporter) {
    console.log("=== HIGH-DISCOUNT COUPON NOTIFICATION (Simulated) ===");
    console.log(`To: ${adminEmails.join(', ')}`);
    console.log(`Subject: ${subject}`);
    console.log(`Coupon: ${couponCode}, Discount: ${discountPercent}%, Amount: $${discountAmount.toFixed(2)}`);
    console.log(`Client: ${clientName} (${clientEmail || 'No email'}), Protocol: #${protocolId}`);
    console.log("=== END NOTIFICATION ===");
    return { success: true, message: "Notification simulated (SMTP not configured)" };
  }

  try {
    // Auto-inject email tracking
    let _trackedHtml_sendHighDiscountCouponNotification = htmlContent;
    try {
      const { createEmailTracking, injectTrackingIntoHtml } = await import('./emailTracking');
      const _baseUrl = process.env.VITE_APP_URL || 'https://www.humanedge.health';
      // @ts-ignore - auto-injected tracking code uses typeof checks for variable detection
      const _tid = await createEmailTracking({ emailType: 'sendHighDiscountCouponNotification', recipientEmail: to, recipientName: typeof clientName !== 'undefined' ? clientName : (typeof recipientName !== 'undefined' ? recipientName : (typeof userName !== 'undefined' ? userName : undefined)), subject: typeof subject !== 'undefined' ? subject : 'sendHighDiscountCouponNotification' });
      _trackedHtml_sendHighDiscountCouponNotification = injectTrackingIntoHtml(htmlContent, _tid, _baseUrl);
    } catch (_e) { /* tracking failed, send without */ }
    await transporter.sendMail({
      from: `"Omega Longevity" <${smtpFrom}>`,
      replyTo: "omega@omegalongevity.com",
      to: adminEmails.join(', '),
      subject,
      html: _trackedHtml_sendHighDiscountCouponNotification,
    });
    logEmailSentToHistory({ recipientEmail: adminEmails.join(', '), recipientName: params.clientName, subject: subject, category: 'payment', notificationType: 'high_discount_coupon', status: 'sent' });

    return { success: true, message: `High-discount notification sent to ${adminEmails.length} admin(s)` };
  } catch (error) {
    console.error("Failed to send high-discount notification:", error);
    return { success: false, message: `Failed to send notification: ${error instanceof Error ? error.message : "Unknown error"}` };
  }
}


// Send protocol link with tracking pixel for email open tracking
// Helper function to wrap a URL with click tracking
function wrapLinkWithTracking(originalUrl: string, baseTrackingUrl: string, linkLabel: string): string {
  // The baseTrackingUrl is in format: https://domain.com/api/track/TOKEN
  // We need to convert it to: https://domain.com/api/track/click/TOKEN?redirect=...&label=...
  
  // Extract the token from the end of the URL
  const urlParts = baseTrackingUrl.split('/api/track/');
  if (urlParts.length !== 2) {
    // Fallback: just return the original URL if format is unexpected
    console.error('Unexpected tracking URL format:', baseTrackingUrl);
    return originalUrl;
  }
  
  const baseUrl = urlParts[0];
  const token = urlParts[1];
  
  // Encode the original URL and label
  const encodedUrl = encodeURIComponent(originalUrl);
  const encodedLabel = encodeURIComponent(linkLabel);
  
  // Build the click tracking URL with proper format
  return `${baseUrl}/api/track/click/${token}?redirect=${encodedUrl}&label=${encodedLabel}`;
}

export async function sendProtocolLinkWithTracking(params: {
  to: string;
  clientName: string;
  protocolUrl: string;
  programName?: string;
  trackingPixelUrl: string;
}): Promise<{ success: boolean; message: string }> {
  const { to, clientName, protocolUrl, programName, trackingPixelUrl } = params;

  const transporter = getTransporter();
  const smtpFrom = process.env.SMTP_FROM || "Omega Longevity <noreply@humanedge.health>";

  // Wrap the protocol URL with click tracking
  const trackedProtocolUrl = wrapLinkWithTracking(protocolUrl, trackingPixelUrl, 'View Your Protocol');

  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #1e40af; margin-bottom: 5px;">Omega Longevity</h1>
        <p style="color: #6b7280; font-size: 14px;">Elite Level Health Optimization</p>
      </div>
      
      <p style="font-size: 16px; color: #374151;">Hi ${clientName},</p>
      
      <p style="font-size: 14px; color: #374151; line-height: 1.6;">
        Your personalized health protocol${programName ? ` for the <strong>${programName}</strong>` : ''} is ready for you to review!
      </p>
      
      <p style="font-size: 14px; color: #374151; line-height: 1.6;">
        Click the button below to view your complete protocol, including all recommended products, 
        dosing schedules, and exclusive affiliate discount codes.
      </p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${trackedProtocolUrl}" 
           style="display: inline-block; background-color: #ea580c; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
          View Your Protocol
        </a>
      </div>
      
      <p style="font-size: 14px; color: #374151; line-height: 1.6;">
        Once you've reviewed your protocol, you can approve it directly from the page. 
        If you have any questions, use the discussion feature on your protocol page to 
        communicate with your coach.
      </p>
      
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
      
      <p style="font-size: 12px; color: #9ca3af; text-align: center;">
        This email was sent by Omega Longevity.<br>
        If you didn't request this protocol, you can safely ignore this email.
      </p>
      
      <!-- Tracking pixel for email open detection -->
      <img src="${trackingPixelUrl}" width="1" height="1" style="display:none;" alt="" />
    </div>
  `;

  if (!transporter) {
    console.log("=== SIMULATED EMAIL (Protocol Link with Tracking) ===");
    console.log(`To: ${to}`);
    console.log(`Subject: Your Health Protocol is Ready - Omega Longevity`);
    console.log(`Link: ${protocolUrl}`);
    console.log(`Tracking: ${trackingPixelUrl}`);
    console.log("========================");
    return { success: true, message: "Email simulated (SMTP not configured)" };
  }

  try {
    // Auto-inject email tracking
    let _trackedHtml_sendProtocolLinkWithTracking = emailHtml;
    try {
      const { createEmailTracking, injectTrackingIntoHtml } = await import('./emailTracking');
      const _baseUrl = process.env.VITE_APP_URL || 'https://www.humanedge.health';
      // @ts-ignore - auto-injected tracking code uses typeof checks for variable detection
      const _tid = await createEmailTracking({ emailType: 'sendProtocolLinkWithTracking', recipientEmail: to, recipientName: typeof clientName !== 'undefined' ? clientName : (typeof recipientName !== 'undefined' ? recipientName : (typeof userName !== 'undefined' ? userName : undefined)), subject: typeof subject !== 'undefined' ? subject : 'sendProtocolLinkWithTracking' });
      _trackedHtml_sendProtocolLinkWithTracking = injectTrackingIntoHtml(emailHtml, _tid, _baseUrl);
    } catch (_e) { /* tracking failed, send without */ }
    await transporter.sendMail({
      from: `"Omega Longevity" <${smtpFrom}>`,
      replyTo: "omega@omegalongevity.com",
      to,
      subject: `Your Health Protocol is Ready - Omega Longevity`,
      html: _trackedHtml_sendProtocolLinkWithTracking,
    });
    logEmailSentToHistory({ recipientEmail: to, recipientName: clientName, subject: 'Your Health Protocol is Ready', category: 'protocol', notificationType: 'protocol_link_tracked', status: 'sent' });
    return { success: true, message: "Protocol link sent successfully" };
  } catch (error) {
    console.error("Failed to send protocol link email:", error);
    return { success: false, message: `Failed to send email: ${error instanceof Error ? error.message : "Unknown error"}` };
  }
}

// Send notification to admin when client opens their protocol email
export async function sendClientOpenedNotification(params: {
  adminEmails: string[];
  clientName: string;
  clientEmail: string | null;
  protocolId: number;
  openedAt: Date;
}): Promise<{ success: boolean; message: string }> {
  const { adminEmails, clientName, clientEmail, protocolId, openedAt } = params;
  
  if (adminEmails.length === 0) {
    console.log("No admin emails configured for client opened notification");
    return { success: false, message: "No admin emails configured" };
  }

  const transporter = getTransporter();
  const smtpFrom = process.env.SMTP_FROM || "noreply@humanedge.health";

  const formattedDate = openedAt.toLocaleString('en-US', { timeZone: 'America/Denver',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  });

  const subject = `✅ ${clientName} opened their protocol email`;
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .success-box { background: #D1FAE5; border: 2px solid #10B981; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
        .success-title { color: #065F46; font-size: 18px; font-weight: bold; margin-bottom: 10px; }
        .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #E5E7EB; }
        .detail-label { color: #6B7280; }
        .detail-value { font-weight: 600; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="success-box">
          <div class="success-title">✅ Protocol Email Opened</div>
          <p>A client has opened their protocol email. They may be reviewing their protocol now.</p>
        </div>
        
        <h3>Client Details</h3>
        <div class="detail-row">
          <span class="detail-label">Client Name:</span>
          <span class="detail-value">${clientName}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Client Email:</span>
          <span class="detail-value">${clientEmail || 'Not provided'}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Protocol ID:</span>
          <span class="detail-value">#${protocolId}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Opened At:</span>
          <span class="detail-value">${formattedDate}</span>
        </div>
        
        <p style="margin-top: 20px; color: #6B7280; font-size: 14px;">
          This is an automated notification. The client may reach out with questions soon.
        </p>
      </div>
    </body>
    </html>
  `;

  if (!transporter) {
    console.log("=== CLIENT OPENED NOTIFICATION (Simulated) ===");
    console.log(`To: ${adminEmails.join(', ')}`);
    console.log(`Subject: ${subject}`);
    console.log(`Client: ${clientName} (${clientEmail || 'No email'}), Protocol: #${protocolId}`);
    console.log(`Opened At: ${formattedDate}`);
    console.log("=== END NOTIFICATION ===");
    return { success: true, message: "Notification simulated (SMTP not configured)" };
  }

  try {
    // Auto-inject email tracking
    let _trackedHtml_sendClientOpenedNotification = htmlContent;
    try {
      const { createEmailTracking, injectTrackingIntoHtml } = await import('./emailTracking');
      const _baseUrl = process.env.VITE_APP_URL || 'https://www.humanedge.health';
      // @ts-ignore - auto-injected tracking code uses typeof checks for variable detection
      const _tid = await createEmailTracking({ emailType: 'sendClientOpenedNotification', recipientEmail: to, recipientName: typeof clientName !== 'undefined' ? clientName : (typeof recipientName !== 'undefined' ? recipientName : (typeof userName !== 'undefined' ? userName : undefined)), subject: typeof subject !== 'undefined' ? subject : 'sendClientOpenedNotification' });
      _trackedHtml_sendClientOpenedNotification = injectTrackingIntoHtml(htmlContent, _tid, _baseUrl);
    } catch (_e) { /* tracking failed, send without */ }
    await transporter.sendMail({
      from: `"Omega Longevity" <${smtpFrom}>`,
      replyTo: "omega@omegalongevity.com",
      to: adminEmails.join(', '),
      subject,
      html: _trackedHtml_sendClientOpenedNotification,
    });
    logEmailSentToHistory({ recipientEmail: adminEmails.join(', '), recipientName: params.clientName, subject: subject, category: 'protocol', notificationType: 'client_opened_notification', status: 'sent' });

    return { success: true, message: `Client opened notification sent to ${adminEmails.length} admin(s)` };
  } catch (error) {
    console.error("Failed to send client opened notification:", error);
    return { success: false, message: `Failed to send notification: ${error instanceof Error ? error.message : "Unknown error"}` };
  }
}


// Send order confirmation email after successful payment
export async function sendOrderConfirmationEmail(params: {
  to: string;
  clientName: string;
  orderId: string;
  orderTotal: number;
  items: Array<{ name: string; quantity: number; price: number }>;
  protocolUrl?: string;
}): Promise<{ success: boolean; message: string }> {
  const { to, clientName, orderId, orderTotal, items, protocolUrl } = params;

  const transporter = getTransporter();
  const smtpFrom = process.env.SMTP_FROM || "Omega Longevity <noreply@humanedge.health>";

  const subject = `Order Confirmation - Omega Longevity #${orderId.slice(-8).toUpperCase()}`;

  // Format items list
  const itemsHtml = items.map(item => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #E5E7EB;">${item.name}</td>
      <td style="padding: 12px; border-bottom: 1px solid #E5E7EB; text-align: center;">${item.quantity}</td>
      <td style="padding: 12px; border-bottom: 1px solid #E5E7EB; text-align: right;">$${(item.price / 100).toFixed(2)}</td>
    </tr>
  `).join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Order Confirmation</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0f172a;">
      <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 30px;">
          <div style="background: linear-gradient(135deg, #ea580c 0%, #f97316 100%); padding: 30px; border-radius: 16px 16px 0 0;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">
              ✓ Order Confirmed
            </h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">
              Thank you for your purchase!
            </p>
          </div>
        </div>

        <!-- Main Content -->
        <div style="background-color: #1e293b; border-radius: 0 0 16px 16px; padding: 30px; color: #e2e8f0;">
          <p style="font-size: 16px; margin-bottom: 20px;">
            Hi <strong style="color: #f97316;">${clientName}</strong>,
          </p>
          
          <p style="font-size: 15px; line-height: 1.6; margin-bottom: 25px;">
            Your order has been successfully processed. Here's a summary of your purchase:
          </p>

          <!-- Order Details -->
          <div style="background-color: #0f172a; border-radius: 12px; padding: 20px; margin-bottom: 25px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid #334155;">
              <span style="color: #94a3b8;">Order ID:</span>
              <span style="color: #f97316; font-weight: 600;">#${orderId.slice(-8).toUpperCase()}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #94a3b8;">Date:</span>
              <span style="color: #e2e8f0;">${new Date().toLocaleDateString('en-US', { timeZone: 'America/Denver', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>
          </div>

          <!-- Items Table -->
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px; background-color: #0f172a; border-radius: 12px; overflow: hidden;">
            <thead>
              <tr style="background-color: #334155;">
                <th style="padding: 12px; text-align: left; color: #94a3b8; font-weight: 600;">Item</th>
                <th style="padding: 12px; text-align: center; color: #94a3b8; font-weight: 600;">Qty</th>
                <th style="padding: 12px; text-align: right; color: #94a3b8; font-weight: 600;">Price</th>
              </tr>
            </thead>
            <tbody style="color: #e2e8f0;">
              ${itemsHtml}
            </tbody>
            <tfoot>
              <tr style="background-color: #334155;">
                <td colspan="2" style="padding: 15px; text-align: right; font-weight: 700; color: #e2e8f0;">Total:</td>
                <td style="padding: 15px; text-align: right; font-weight: 700; color: #f97316; font-size: 18px;">$${(orderTotal / 100).toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>

          ${protocolUrl ? `
          <!-- Protocol Link -->
          <div style="text-align: center; margin-bottom: 25px;">
            <a href="${protocolUrl}" style="display: inline-block; background: linear-gradient(135deg, #ea580c 0%, #f97316 100%); color: #ffffff; text-decoration: none; padding: 14px 30px; border-radius: 8px; font-weight: 600; font-size: 16px;">
              View Your Protocol
            </a>
          </div>
          ` : ''}

          <!-- Next Steps -->
          <div style="background-color: #0f172a; border-radius: 12px; padding: 20px; border-left: 4px solid #f97316;">
            <h3 style="color: #f97316; margin: 0 0 10px 0; font-size: 16px;">What's Next?</h3>
            <ul style="color: #94a3b8; margin: 0; padding-left: 20px; line-height: 1.8;">
              <li>Your coach will be notified of your purchase</li>
              <li>You'll receive shipping/fulfillment details separately</li>
              <li>Questions? Reply to this email or contact your coach</li>
            </ul>
          </div>
        </div>

        <!-- Footer -->
        <div style="text-align: center; margin-top: 30px; color: #64748b; font-size: 13px;">
          <p style="margin: 0 0 10px 0;">
            <strong style="color: #f97316;">Omega Longevity</strong><br>
            Elite Level Health Optimization
          </p>
          <p style="margin: 0;">
            This is an automated confirmation email. Please do not reply directly.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  if (!transporter) {
    console.log("=== ORDER CONFIRMATION EMAIL (Simulated) ===");
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Client: ${clientName}`);
    console.log(`Order ID: ${orderId}`);
    console.log(`Total: $${(orderTotal / 100).toFixed(2)}`);
    console.log(`Items: ${items.length}`);
    console.log("=== END EMAIL ===");
    return { success: true, message: "Order confirmation simulated (SMTP not configured)" };
  }

  try {
    // Auto-inject email tracking
    let _trackedHtml_sendOrderConfirmationEmail = htmlContent;
    try {
      const { createEmailTracking, injectTrackingIntoHtml } = await import('./emailTracking');
      const _baseUrl = process.env.VITE_APP_URL || 'https://www.humanedge.health';
      // @ts-ignore - auto-injected tracking code uses typeof checks for variable detection
      const _tid = await createEmailTracking({ emailType: 'sendOrderConfirmationEmail', recipientEmail: to, recipientName: typeof clientName !== 'undefined' ? clientName : (typeof recipientName !== 'undefined' ? recipientName : (typeof userName !== 'undefined' ? userName : undefined)), subject: typeof subject !== 'undefined' ? subject : 'sendOrderConfirmationEmail' });
      _trackedHtml_sendOrderConfirmationEmail = injectTrackingIntoHtml(htmlContent, _tid, _baseUrl);
    } catch (_e) { /* tracking failed, send without */ }
    await transporter.sendMail({
      from: `"Omega Longevity" <${smtpFrom}>`,
      replyTo: "omega@omegalongevity.com",
      to,
      subject,
      html: _trackedHtml_sendOrderConfirmationEmail,
    });
    logEmailSentToHistory({ recipientEmail: to, recipientName: clientName, subject: subject, category: 'payment', notificationType: 'order_confirmation', status: 'sent' });

    return { success: true, message: `Order confirmation sent to ${to}` };
  } catch (error) {
    console.error("Failed to send order confirmation email:", error);
    return { success: false, message: `Failed to send confirmation: ${error instanceof Error ? error.message : "Unknown error"}` };
  }
}


// Send shipping notification email to client when packing slip status changes
export async function sendShippingNotification(params: {
  to: string;
  clientName: string;
  status: 'shipped' | 'complete' | 'partial';
  items: Array<{
    name: string;
    quantity: number;
    fulfilled: number;
    backordered: number;
  }>;
  trackingNumber?: string;
  trackingUrl?: string;
  notes?: string;
  protocolUrl?: string;
  siteUrl?: string;
}): Promise<{ success: boolean; message: string }> {
  // Check if shipment notifications are enabled
  const isEnabled = await isNotificationEnabled('shipment');
  if (!isEnabled) {
    console.log('[Email] Shipment notification is disabled, skipping email');
    return { success: true, message: 'Email skipped - notification disabled in settings' };
  }

  const { to, clientName, status, items, trackingNumber, trackingUrl, notes, protocolUrl, siteUrl: providedSiteUrl } = params;
  const siteUrl = providedSiteUrl || process.env.VITE_APP_URL || 'https://www.humanedge.health';

  const transporter = getTransporter();
  const smtpFrom = process.env.SMTP_FROM || "Omega Longevity <noreply@humanedge.health>";

  const statusConfig = {
    shipped: {
      title: "Your Order Has Shipped!",
      subtitle: "Your health optimization products are on their way",
      icon: "📦",
      color: "#3b82f6",
    },
    complete: {
      title: "Order Fulfilled",
      subtitle: "All items from your order have been shipped",
      icon: "✅",
      color: "#22c55e",
    },
    partial: {
      title: "Partial Shipment Update",
      subtitle: "Some items from your order have shipped",
      icon: "📬",
      color: "#f59e0b",
    },
  };

  const config = statusConfig[status];
  const subject = `${config.icon} ${config.title} - Omega Longevity`;

  const itemsHtml = items.map(item => {
    const statusBadge = item.backordered > 0 
      ? `<span style="background-color: #fef3c7; color: #92400e; padding: 2px 8px; border-radius: 4px; font-size: 12px;">Backordered: ${item.backordered}</span>`
      : item.fulfilled >= item.quantity
        ? `<span style="background-color: #dcfce7; color: #166534; padding: 2px 8px; border-radius: 4px; font-size: 12px;">Shipped</span>`
        : `<span style="background-color: #e0e7ff; color: #3730a3; padding: 2px 8px; border-radius: 4px; font-size: 12px;">Pending</span>`;
    
    return `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${item.name}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.fulfilled}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${statusBadge}</td>
      </tr>
    `;
  }).join('');

  const trackingHtml = trackingNumber ? `
    <div style="background-color: #f0f9ff; border-radius: 8px; padding: 16px; margin: 20px 0;">
      <p style="margin: 0 0 8px 0; font-weight: 600; color: #0369a1;">Tracking Information</p>
      <p style="margin: 0; color: #374151;">
        Tracking Number: <strong>${trackingNumber}</strong>
        ${trackingUrl ? `<br><a href="${trackingUrl}" style="color: #2563eb;">Track Your Package →</a>` : ''}
      </p>
    </div>
  ` : '';

  const notesHtml = notes ? `
    <div style="background-color: #fefce8; border-radius: 8px; padding: 16px; margin: 20px 0; border-left: 4px solid #eab308;">
      <p style="margin: 0 0 8px 0; font-weight: 600; color: #854d0e;">Note from Fulfillment Team</p>
      <p style="margin: 0; color: #374151;">${notes}</p>
    </div>
  ` : '';

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0F172A;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <!-- Header with Logo -->
        <div style="background: linear-gradient(135deg, #F97316 0%, #EA580C 100%); border-radius: 12px 12px 0 0; padding: 30px; text-align: center;">
          <div style="font-size: 48px; margin-bottom: 10px;">${config.icon}</div>
          <h1 style="color: white; margin: 0; font-size: 24px;">${config.title}</h1>
          <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0 0;">${config.subtitle}</p>
        </div>

        <!-- Content -->
        <div style="background-color: #1E293B; padding: 30px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <p style="color: #F8FAFC; font-size: 16px; margin: 0 0 20px 0;">
            Hi ${clientName},
          </p>

          <p style="color: #94A3B8; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
            ${status === 'shipped' ? "Great news! Your order has been shipped and is on its way to you." :
              status === 'complete' ? "All items from your order have been fulfilled and shipped." :
              "We've shipped part of your order. Some items are on backorder and will ship as soon as they're available."}
          </p>

          ${trackingNumber ? `
          <div style="background-color: rgba(34, 197, 94, 0.1); border: 1px solid #22C55E; border-radius: 8px; padding: 16px; margin: 20px 0; text-align: center;">
            <p style="margin: 0 0 8px 0; font-weight: 600; color: #22C55E;">📦 Tracking Information</p>
            <p style="margin: 0; color: #F8FAFC;">
              Tracking Number: <strong>${trackingNumber}</strong>
            </p>
            ${trackingUrl ? `<a href="${trackingUrl}" style="display: inline-block; background: #22C55E; color: white; padding: 10px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin-top: 12px;">Track Your Package</a>` : ''}
          </div>
          ` : ''}

          <!-- Items Table -->
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background-color: #0F172A; border-radius: 8px;">
            <thead>
              <tr style="background-color: rgba(249, 115, 22, 0.1);">
                <th style="padding: 12px; text-align: left; font-size: 12px; color: #F97316; text-transform: uppercase;">Item</th>
                <th style="padding: 12px; text-align: center; font-size: 12px; color: #F97316; text-transform: uppercase;">Qty</th>
                <th style="padding: 12px; text-align: center; font-size: 12px; color: #F97316; text-transform: uppercase;">Shipped</th>
                <th style="padding: 12px; text-align: right; font-size: 12px; color: #F97316; text-transform: uppercase;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${items.map(item => {
                const statusBadge = item.backordered > 0 
                  ? `<span style="background-color: rgba(251, 191, 36, 0.2); color: #FBBF24; padding: 2px 8px; border-radius: 4px; font-size: 12px;">Backordered: ${item.backordered}</span>`
                  : item.fulfilled >= item.quantity
                    ? `<span style="background-color: rgba(34, 197, 94, 0.2); color: #22C55E; padding: 2px 8px; border-radius: 4px; font-size: 12px;">Shipped</span>`
                    : `<span style="background-color: rgba(96, 165, 250, 0.2); color: #60A5FA; padding: 2px 8px; border-radius: 4px; font-size: 12px;">Pending</span>`;
                
                return `
                  <tr>
                    <td style="padding: 12px; border-bottom: 1px solid #334155; color: #F8FAFC;">${item.name}</td>
                    <td style="padding: 12px; border-bottom: 1px solid #334155; text-align: center; color: #94A3B8;">${item.quantity}</td>
                    <td style="padding: 12px; border-bottom: 1px solid #334155; text-align: center; color: #94A3B8;">${item.fulfilled}</td>
                    <td style="padding: 12px; border-bottom: 1px solid #334155; text-align: right;">${statusBadge}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>

          ${notes ? `
          <div style="background-color: rgba(251, 191, 36, 0.1); border-radius: 8px; padding: 16px; margin: 20px 0; border-left: 4px solid #FBBF24;">
            <p style="margin: 0 0 8px 0; font-weight: 600; color: #FBBF24;">Note from Fulfillment Team</p>
            <p style="margin: 0; color: #F8FAFC;">${notes}</p>
          </div>
          ` : ''}

          ${protocolUrl ? `
            <div style="text-align: center; margin: 30px 0;">
              <a href="${protocolUrl}" 
                 style="display: inline-block; background: linear-gradient(135deg, #F97316 0%, #EA580C 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                View Your Protocol
              </a>
            </div>
          ` : ''}
        </div>

        <!-- Platform Features -->
        <div style="background-color: #0F172A; padding: 25px; border-radius: 0 0 12px 12px;">
          <p style="color: #F97316; font-size: 14px; text-align: center; margin: 0 0 15px 0; font-weight: 600;">Explore Omega Longevity</p>
          <div style="text-align: center;">
            <a href="${siteUrl}/order" style="color: #94A3B8; text-decoration: none; margin: 0 10px; font-size: 12px;">Store</a>
            <a href="${siteUrl}/coaching-programs" style="color: #94A3B8; text-decoration: none; margin: 0 10px; font-size: 12px;">Coaching</a>
            <a href="${siteUrl}/partners" style="color: #94A3B8; text-decoration: none; margin: 0 10px; font-size: 12px;">Partners</a>
            <a href="${siteUrl}/launchpad#podcast" style="color: #94A3B8; text-decoration: none; margin: 0 10px; font-size: 12px;">Podcast</a>
          </div>
          <div style="text-align: center; margin-top: 15px;">
            <a href="https://instagram.com/omegalongevity" style="color: #94A3B8; text-decoration: none; margin: 0 8px; font-size: 12px;">Instagram</a>
            <a href="https://youtube.com/@omegalongevity" style="color: #94A3B8; text-decoration: none; margin: 0 8px; font-size: 12px;">YouTube</a>
          </div>
          <p style="color: #64748B; font-size: 11px; text-align: center; margin: 20px 0 0 0;">
            © ${new Date().getFullYear()} Omega Longevity. All rights reserved.<br>
            If you have questions about your order, please contact your coach.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  if (!transporter) {
    console.log("=== SHIPPING NOTIFICATION EMAIL (Simulated) ===");
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Status: ${status}`);
    console.log(`Items: ${items.length}`);
    console.log("=== END EMAIL ===");
    return { success: true, message: "Shipping notification simulated (SMTP not configured)" };
  }

  try {
    await transporter.sendMail({
      from: `"Omega Longevity" <${smtpFrom}>`,
      replyTo: "omega@omegalongevity.com",
      to,
      subject,
      html: htmlContent,
    });
    logEmailSentToHistory({ recipientEmail: to, recipientName: clientName, subject: subject, category: 'shipping', notificationType: 'shipping_notification', status: 'sent' });

    return { success: true, message: `Shipping notification sent to ${to}` };
  } catch (error) {
    console.error("Failed to send shipping notification email:", error);
    return { success: false, message: `Failed to send notification: ${error instanceof Error ? error.message : "Unknown error"}` };
  }
}


// Send follow-up reminder email for unapproved protocols
export async function sendFollowUpEmail(
  clientEmail: string,
  clientName: string,
  protocolUrl: string,
  followUpCount: number,
  branding?: {
    logoUrl?: string;
    companyName?: string;
    tagline?: string;
    primaryColor?: string;
    secondaryColor?: string;
    footerText?: string;
  }
): Promise<boolean> {
  const transporter = getTransporter();
  const smtpFrom = process.env.SMTP_FROM || "noreply@humanedge.health";

  const companyName = branding?.companyName || "Omega Longevity";
  const tagline = branding?.tagline || "Elite Level Health Optimization";
  const primaryColor = branding?.primaryColor || "#f97316";
  const secondaryColor = branding?.secondaryColor || "#1e293b";
  const footerText = branding?.footerText || `This email was sent by ${companyName}`;
  const logoUrl = branding?.logoUrl;

  // Customize message based on follow-up count
  let subject: string;
  let headline: string;
  let message: string;

  if (followUpCount === 1) {
    subject = `Reminder: Your Health Protocol is Waiting - ${companyName}`;
    headline = "Don't Forget Your Protocol!";
    message = `We noticed you haven't had a chance to review your personalized health protocol yet. Your customized plan is ready and waiting for you.`;
  } else if (followUpCount === 2) {
    subject = `Your Personalized Protocol Awaits - ${companyName}`;
    headline = "Your Health Journey Awaits";
    message = `Your personalized health protocol has been ready for a while now. We'd love to help you get started on your optimization journey.`;
  } else {
    subject = `Last Reminder: Review Your Protocol - ${companyName}`;
    headline = "We Miss You!";
    message = `It's been some time since we sent your personalized health protocol. If you have any questions or need help getting started, we're here for you.`;
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 40px 20px;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, ${secondaryColor} 0%, ${primaryColor} 100%); padding: 30px; text-align: center;">
                  <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">${companyName}</h1>
                  <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0; font-size: 14px;">${tagline}</p>
                </td>
              </tr>
              
              <!-- Content -->
              <tr>
                <td style="padding: 40px 30px;">
                  <h2 style="color: ${secondaryColor}; margin: 0 0 20px 0; font-size: 22px;">${headline}</h2>
                  <p style="color: #64748b; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                    Hi ${clientName},
                  </p>
                  <p style="color: #64748b; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                    ${message}
                  </p>
                  
                  <!-- CTA Button -->
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td align="center" style="padding: 20px 0;">
                        <a href="${protocolUrl}" style="display: inline-block; background-color: ${primaryColor}; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                          View Your Protocol
                        </a>
                      </td>
                    </tr>
                  </table>
                  
                  <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0;">
                    Once you've reviewed your protocol, you can approve it directly from the page. If you have any questions, use the Discussion feature on your protocol page to communicate with your coach.
                  </p>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="background-color: #f1f5f9; padding: 20px 30px; text-align: center;">
                  <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                    ${footerText}
                  </p>
                  <p style="color: #94a3b8; font-size: 12px; margin: 10px 0 0 0;">
                    If you didn't request this protocol, you can safely ignore this email.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  if (!transporter) {
    console.log(`[Email Simulated] Follow-up #${followUpCount} to ${clientEmail}: ${subject}`);
    return true;
  }

  try {
    // Auto-inject email tracking
    let _trackedHtml_sendFollowUpEmail = html;
    try {
      const { createEmailTracking, injectTrackingIntoHtml } = await import('./emailTracking');
      const _baseUrl = process.env.VITE_APP_URL || 'https://www.humanedge.health';
      // @ts-ignore - auto-injected tracking code uses typeof checks for variable detection
      const _tid = await createEmailTracking({ emailType: 'sendFollowUpEmail', recipientEmail: clientEmail, recipientName: typeof clientName !== 'undefined' ? clientName : (typeof recipientName !== 'undefined' ? recipientName : (typeof userName !== 'undefined' ? userName : undefined)), subject: typeof subject !== 'undefined' ? subject : 'sendFollowUpEmail' });
      _trackedHtml_sendFollowUpEmail = injectTrackingIntoHtml(html, _tid, _baseUrl);
    } catch (_e) { /* tracking failed, send without */ }
    await transporter.sendMail({
      from: `"${companyName}" <${smtpFrom}>`,
      replyTo: "omega@omegalongevity.com",
      to: clientEmail,
      subject,
      html,
    });
    logEmailSentToHistory({ recipientEmail: clientEmail, recipientName: clientName, subject: subject, category: 'protocol', notificationType: 'follow_up', status: 'sent' });
    console.log(`[Email Sent] Follow-up #${followUpCount} to ${clientEmail}`);
    return true;
  } catch (error) {
    console.error("[Email Error] Failed to send follow-up email:", error);
    return false;
  }
}

// Get protocols that need follow-up emails
export interface ProtocolForFollowUp {
  id: number;
  clientName: string;
  clientEmail: string;
  accessToken: string;
  sentAt: Date;
  lastFollowUpSentAt: Date | null;
  followUpCount: number;
}


// Send email notification when a team member is assigned to a subtask
export async function sendSubtaskAssignmentNotification(params: {
  to: string;
  teamMemberName: string;
  subtaskName: string;
  taskName: string;
  projectName: string;
  clientName: string;
  dueDate?: Date | null;
  assignedByName: string;
  projectUrl?: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const transporter = getTransporter();
  const smtpFrom = process.env.SMTP_FROM || "noreply@humanedge.health";
  const companyName = "Omega Longevity";
  
  const dueDateText = params.dueDate 
    ? `<p style="margin: 0 0 10px 0;"><strong>Due Date:</strong> ${new Date(params.dueDate).toLocaleDateString('en-US', { timeZone: 'America/Denver', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>`
    : '';
  
  const projectLinkText = params.projectUrl 
    ? `<p style="margin: 20px 0;"><a href="${params.projectUrl}" style="background-color: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Project</a></p>`
    : '';

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); padding: 30px; border-radius: 12px 12px 0 0;">
        <h1 style="color: #f97316; margin: 0; font-size: 24px;">New Task Assignment</h1>
      </div>
      
      <div style="background-color: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
        <p style="margin: 0 0 20px 0;">Hi ${params.teamMemberName},</p>
        
        <p style="margin: 0 0 20px 0;">You have been assigned a new subtask by <strong>${params.assignedByName}</strong>:</p>
        
        <div style="background-color: white; border: 1px solid #e2e8f0; border-left: 4px solid #f97316; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h2 style="margin: 0 0 10px 0; color: #1e293b; font-size: 18px;">${params.subtaskName}</h2>
          <p style="margin: 0 0 10px 0;"><strong>Task:</strong> ${params.taskName}</p>
          <p style="margin: 0 0 10px 0;"><strong>Project:</strong> ${params.projectName}</p>
          <p style="margin: 0 0 10px 0;"><strong>Client:</strong> ${params.clientName}</p>
          ${dueDateText}
        </div>
        
        ${projectLinkText}
        
        <p style="margin: 20px 0 0 0; color: #64748b; font-size: 14px;">
          This is an automated notification from ${companyName}.
        </p>
      </div>
    </body>
    </html>
  `;

  if (!transporter) {
    console.log("[Email] Simulated subtask assignment notification to:", params.to);
    console.log("[Email] Subtask:", params.subtaskName, "| Task:", params.taskName);
    return { success: true, messageId: "simulated-" + Date.now() };
  }

  try {
    // Auto-inject email tracking
    let _trackedHtml_sendSubtaskAssignmentNotification = htmlContent;
    try {
      const { createEmailTracking, injectTrackingIntoHtml } = await import('./emailTracking');
      const _baseUrl = process.env.VITE_APP_URL || 'https://www.humanedge.health';
      // @ts-ignore - auto-injected tracking code uses typeof checks for variable detection
      const _tid = await createEmailTracking({ emailType: 'sendSubtaskAssignmentNotification', recipientEmail: to, recipientName: typeof clientName !== 'undefined' ? clientName : (typeof recipientName !== 'undefined' ? recipientName : (typeof userName !== 'undefined' ? userName : undefined)), subject: typeof subject !== 'undefined' ? subject : 'sendSubtaskAssignmentNotification' });
      _trackedHtml_sendSubtaskAssignmentNotification = injectTrackingIntoHtml(htmlContent, _tid, _baseUrl);
    } catch (_e) { /* tracking failed, send without */ }
    const info = await transporter.sendMail({
      from: `"${companyName}" <${smtpFrom}>`,
      replyTo: "omega@omegalongevity.com",
      to: params.to,
      subject: `[Task Assignment] ${params.subtaskName} - ${params.projectName}`,
      html: _trackedHtml_sendSubtaskAssignmentNotification,
    });
    logEmailSentToHistory({ recipientEmail: params.to, recipientName: params.teamMemberName, subject: `[Task Assignment] ${params.subtaskName} - ${params.projectName}`, category: 'other', notificationType: 'subtask_assignment', status: 'sent' });
    
    console.log("[Email] Subtask assignment notification sent to:", params.to, "MessageId:", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error("[Email] Failed to send subtask assignment notification:", error.message);
    return { success: false, error: error.message };
  }
}


// ============ GENERIC EMAIL SENDING ============

/**
 * Generic email sending function for custom emails
 */
export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
  // Optional logging metadata
  _logCategory?: 'checkin' | 'protocol' | 'payment' | 'shipping' | 'inventory' | 'document' | 'welcome' | 'announcement' | 'digest' | 'other';
  _logType?: string;
  _logClientProtocolId?: number;
  _logRecipientName?: string;
  _logTriggeredBy?: 'system' | 'cron' | 'admin' | 'webhook';
  _skipLog?: boolean;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const transporter = getTransporter();
  const smtpFrom = process.env.SMTP_FROM || "noreply@humanedge.health";

  if (!transporter) {
    console.log("[Email] Simulated email to:", params.to);
    console.log("[Email] Subject:", params.subject);
    return { success: true, messageId: "simulated-" + Date.now() };
  }

  try {
    // Auto-inject email tracking
    let _trackedHtml_sendEmail = params.html;
    let _trackingId: string | undefined;
    try {
      const { createEmailTracking, injectTrackingIntoHtml } = await import('./emailTracking');
      const _baseUrl = process.env.VITE_APP_URL || 'https://www.humanedge.health';
      const _categoryToEmailType: Record<string, string> = {
        checkin: 'checkin', protocol: 'protocol_sent', payment: 'payment_reminder',
        welcome: 'welcome', announcement: 'announcement',
        shipping: 'other', inventory: 'other', document: 'other', digest: 'other', other: 'other',
      };
      const _emailType = _categoryToEmailType[params._logCategory || 'other'] || 'other';
      _trackingId = await createEmailTracking({ emailType: _emailType, recipientEmail: params.to, recipientName: params._logRecipientName, subject: params.subject });
      _trackedHtml_sendEmail = injectTrackingIntoHtml(params.html, _trackingId, _baseUrl);
    } catch (_e) { /* tracking failed, send without */ }
    const info = await transporter.sendMail({
      from: params.from || smtpFrom,
      replyTo: params.replyTo || process.env.SMTP_REPLY_TO || smtpFrom,
      to: params.to,
      subject: params.subject,
      html: _trackedHtml_sendEmail,
    });
    
    console.log("[Email] Email sent to:", params.to, "MessageId:", info.messageId);
    
    // Auto-log to notification history (with trackingId for open/click tracking)
    if (!params._skipLog) {
      logEmailSentToHistory({
        recipientEmail: params.to,
        recipientName: params._logRecipientName,
        subject: params.subject,
        category: params._logCategory || 'other',
        notificationType: params._logType || 'general_email',
        clientProtocolId: params._logClientProtocolId,
        triggeredBy: params._logTriggeredBy || 'system',
        status: 'sent',
        trackingId: _trackingId,
      });
    }
    
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error("[Email] Failed to send email:", error.message);
    
    // Log failed emails too
    if (!params._skipLog) {
      logEmailSentToHistory({
        recipientEmail: params.to,
        recipientName: params._logRecipientName,
        subject: params.subject,
        category: params._logCategory || 'other',
        notificationType: params._logType || 'general_email',
        clientProtocolId: params._logClientProtocolId,
        triggeredBy: params._logTriggeredBy || 'system',
        status: 'failed',
        errorMessage: error.message,
      });
    }
    
    return { success: false, error: error.message };
  }
}


// Send account creation invite email to a client
export async function sendAccountInviteEmail(params: {
  to: string;
  clientName: string;
  signupUrl: string;
  protocolUrl?: string;
  customMessage?: string;
}): Promise<{ success: boolean; message: string }> {
  const { to, clientName, signupUrl, protocolUrl, customMessage } = params;

  const transporter = getTransporter();
  const smtpFrom = process.env.SMTP_FROM || "Omega Longevity <noreply@humanedge.health>";

  const subject = "Create Your Omega Longevity Account";

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0f172a;">
      <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 30px;">
          <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 30px; border-radius: 16px 16px 0 0;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">
              Welcome to Omega Longevity
            </h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">
              Your personalized health optimization journey awaits
            </p>
          </div>
        </div>

        <!-- Main Content -->
        <div style="background-color: #1e293b; border-radius: 0 0 16px 16px; padding: 30px; color: #e2e8f0;">
          <p style="font-size: 16px; margin-bottom: 20px;">
            Hi <strong style="color: #3b82f6;">${clientName}</strong>,
          </p>
          
          <p style="font-size: 15px; line-height: 1.6; margin-bottom: 25px;">
            Your coach has invited you to create an account with Omega Longevity. 
            Creating an account gives you access to:
          </p>

          <!-- Benefits List -->
          <div style="background-color: #0f172a; border-radius: 12px; padding: 20px; margin-bottom: 25px;">
            <ul style="color: #e2e8f0; margin: 0; padding-left: 20px; line-height: 2;">
              <li>📋 Your personalized health protocol</li>
              <li>📊 Progress tracking with photos and journal</li>
              <li>💬 Direct communication with your coach</li>
              <li>🛒 Access to the Omega Store with member discounts</li>
              <li>📚 Educational resources and guides</li>
            </ul>
          </div>

          <!-- CTA Button -->
          <div style="text-align: center; margin: 30px 0;">
            <a href="${signupUrl}" style="display: inline-block; background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px;">
              Create My Account
            </a>
          </div>

          ${protocolUrl ? `
          <p style="font-size: 14px; color: #94a3b8; text-align: center; margin-bottom: 20px;">
            Or <a href="${protocolUrl}" style="color: #3b82f6; text-decoration: underline;">view your protocol</a> without creating an account
          </p>
          ` : ''}

          ${customMessage ? `
          <!-- Custom Message from Coach -->
          <div style="background-color: #0f172a; border-radius: 12px; padding: 20px; margin-bottom: 20px; border-left: 4px solid #f59e0b;">
            <h3 style="color: #f59e0b; margin: 0 0 10px 0; font-size: 16px;">📝 Message from Your Coach</h3>
            <p style="color: #e2e8f0; margin: 0; line-height: 1.6; white-space: pre-wrap;">${customMessage}</p>
          </div>
          ` : ''}

          <!-- What to Expect -->
          <div style="background-color: #0f172a; border-radius: 12px; padding: 20px; border-left: 4px solid #3b82f6;">
            <h3 style="color: #3b82f6; margin: 0 0 10px 0; font-size: 16px;">Quick & Easy Setup</h3>
            <p style="color: #94a3b8; margin: 0; line-height: 1.6;">
              Account creation takes less than 30 seconds. Simply click the button above 
              and sign in with your preferred method (Google, email, etc.).
            </p>
          </div>
        </div>

        <!-- Footer -->
        <div style="text-align: center; margin-top: 30px; color: #64748b; font-size: 13px;">
          <p style="margin: 0 0 10px 0;">
            <strong style="color: #3b82f6;">Omega Longevity</strong><br>
            Elite Level Health Optimization
          </p>
          <p style="margin: 0;">
            Questions? Reply to this email to reach your coach.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  if (!transporter) {
    console.log("=== ACCOUNT INVITE EMAIL (Simulated) ===");
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Client: ${clientName}`);
    console.log(`Signup URL: ${signupUrl}`);
    console.log("=== END EMAIL ===");
    return { success: true, message: "Account invite simulated (SMTP not configured)" };
  }

  try {
    // Auto-inject email tracking
    let _trackedHtml_sendAccountInviteEmail = htmlContent;
    try {
      const { createEmailTracking, injectTrackingIntoHtml } = await import('./emailTracking');
      const _baseUrl = process.env.VITE_APP_URL || 'https://www.humanedge.health';
      // @ts-ignore - auto-injected tracking code uses typeof checks for variable detection
      const _tid = await createEmailTracking({ emailType: 'sendAccountInviteEmail', recipientEmail: to, recipientName: typeof clientName !== 'undefined' ? clientName : (typeof recipientName !== 'undefined' ? recipientName : (typeof userName !== 'undefined' ? userName : undefined)), subject: typeof subject !== 'undefined' ? subject : 'sendAccountInviteEmail' });
      _trackedHtml_sendAccountInviteEmail = injectTrackingIntoHtml(htmlContent, _tid, _baseUrl);
    } catch (_e) { /* tracking failed, send without */ }
    await transporter.sendMail({
      from: `"Omega Longevity" <${smtpFrom}>`,
      replyTo: "omega@omegalongevity.com",
      to,
      subject,
      html: _trackedHtml_sendAccountInviteEmail,
    });
    logEmailSentToHistory({ recipientEmail: to, recipientName: clientName, subject: subject, category: 'welcome', notificationType: 'account_invite', status: 'sent' });

    return { success: true, message: `Account invite sent to ${to}` };
  } catch (error) {
    console.error("Failed to send account invite email:", error);
    return { success: false, message: `Failed to send invite: ${error instanceof Error ? error.message : "Unknown error"}` };
  }
}


// Send welcome email to new users after account creation
export async function sendWelcomeEmail(params: {
  to: string;
  userName: string;
  dashboardUrl: string;
  protocolUrl?: string;
  launchpadUrl: string;
}): Promise<{ success: boolean; message: string }> {
  // Check if welcome email notifications are enabled
  const isEnabled = await isNotificationEnabled('welcome_email');
  if (!isEnabled) {
    console.log('[Email] Welcome email notification is disabled, skipping email');
    return { success: true, message: 'Email skipped - notification disabled in settings' };
  }

  const { to, userName, dashboardUrl, protocolUrl, launchpadUrl } = params;

  const transporter = getTransporter();
  const smtpFrom = process.env.SMTP_FROM || "Omega Longevity <noreply@humanedge.health>";
  
  // Extract base URL from launchpadUrl for other links
  const baseUrl = launchpadUrl.replace('/launchpad', '');

  const subject = "Welcome to Omega Longevity";

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0f172a;">
      <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <!-- Header with Logo -->
        <div style="text-align: center; margin-bottom: 30px;">
          <div style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 30px; border-radius: 16px 16px 0 0;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">
              Welcome to Omega Longevity
            </h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 14px;">
              Elite Level Health Optimization
            </p>
          </div>
        </div>

        <!-- Main Content -->
        <div style="background-color: #1e293b; border-radius: 0 0 16px 16px; padding: 30px; color: #e2e8f0;">
          <p style="font-size: 16px; margin-bottom: 20px;">
            Hi ${userName},
          </p>
          
          <p style="font-size: 15px; line-height: 1.6; margin-bottom: 25px;">
            Thank you for joining Omega Longevity. Your account is now active and you have access to our full suite of health optimization resources.
          </p>

          <!-- Your Resources Section -->
          <div style="background-color: #0f172a; border-radius: 12px; padding: 20px; margin-bottom: 25px;">
            <h3 style="color: #f97316; margin: 0 0 15px 0; font-size: 16px;">Your Resources</h3>
            
            ${protocolUrl ? `
            <div style="margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid #334155;">
              <a href="${protocolUrl}" style="color: #f1f5f9; text-decoration: none; font-weight: 600; font-size: 14px;">Your Protocol</a>
              <p style="color: #94a3b8; margin: 5px 0 0 0; font-size: 13px;">View your personalized health protocol</p>
            </div>
            ` : ''}
            
            <div style="margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid #334155;">
              <a href="${dashboardUrl}" style="color: #f1f5f9; text-decoration: none; font-weight: 600; font-size: 14px;">Dashboard</a>
              <p style="color: #94a3b8; margin: 5px 0 0 0; font-size: 13px;">Track progress, upload photos, log daily wellness metrics</p>
            </div>
            
            <div style="margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid #334155;">
              <a href="${launchpadUrl}" style="color: #f1f5f9; text-decoration: none; font-weight: 600; font-size: 14px;">Launchpad</a>
              <p style="color: #94a3b8; margin: 5px 0 0 0; font-size: 13px;">Your central hub for all Omega resources</p>
            </div>
            
            <div>
              <a href="${baseUrl}/order" style="color: #f1f5f9; text-decoration: none; font-weight: 600; font-size: 14px;">Store</a>
              <p style="color: #94a3b8; margin: 5px 0 0 0; font-size: 13px;">Browse peptides and supplements</p>
            </div>
          </div>

          <!-- Explore Section -->
          <div style="background-color: #0f172a; border-radius: 12px; padding: 20px; margin-bottom: 25px;">
            <h3 style="color: #f97316; margin: 0 0 15px 0; font-size: 16px;">Explore</h3>
            
            <div style="margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid #334155;">
              <a href="${baseUrl}/launchpad" style="color: #f1f5f9; text-decoration: none; font-weight: 600; font-size: 14px;">Coaching & Programs</a>
              <p style="color: #94a3b8; margin: 5px 0 0 0; font-size: 13px;">Learn about our coaching services and program options</p>
            </div>
            
            <div style="margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid #334155;">
              <a href="${baseUrl}/launchpad" style="color: #f1f5f9; text-decoration: none; font-weight: 600; font-size: 14px;">Trusted Partners</a>
              <p style="color: #94a3b8; margin: 5px 0 0 0; font-size: 13px;">Our vetted network of health and wellness partners</p>
            </div>
            
            <div style="margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid #334155;">
              <a href="${baseUrl}/launchpad" style="color: #f1f5f9; text-decoration: none; font-weight: 600; font-size: 14px;">Peptide Cheat Sheet</a>
              <p style="color: #94a3b8; margin: 5px 0 0 0; font-size: 13px;">Quick reference guide for peptide protocols</p>
            </div>
            
            <div>
              <a href="https://www.youtube.com/@InsideOmega" style="color: #f1f5f9; text-decoration: none; font-weight: 600; font-size: 14px;">Inside Omega Podcast</a>
              <p style="color: #94a3b8; margin: 5px 0 0 0; font-size: 13px;">Listen to Jason & Lane discuss health optimization</p>
            </div>
          </div>

          <!-- CTA Button -->
          <div style="text-align: center; margin: 30px 0;">
            <a href="${launchpadUrl}" style="display: inline-block; background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 15px;">
              Get Started
            </a>
          </div>

          <!-- Support -->
          <div style="text-align: center; padding-top: 20px; border-top: 1px solid #334155;">
            <p style="color: #94a3b8; margin: 0; font-size: 13px;">
              Questions? Contact us at <a href="mailto:omega@omegalongevity.com" style="color: #f97316;">omega@omegalongevity.com</a>
            </p>
          </div>
        </div>

        <!-- Footer -->
        <div style="text-align: center; margin-top: 30px; color: #64748b; font-size: 12px;">
          <p style="margin: 0;">
            Omega Longevity<br>
            1098 W. South Jordan Pkwy #106, South Jordan, UT 84095
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  if (!transporter) {
    console.log("=== WELCOME EMAIL (Simulated) ===");
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`User: ${userName}`);
    console.log(`Dashboard: ${dashboardUrl}`);
    console.log("=== END EMAIL ===");
    return { success: true, message: "Welcome email simulated (SMTP not configured)" };
  }

  try {
    // Auto-inject email tracking
    let _trackedHtml_sendWelcomeEmail = htmlContent;
    try {
      const { createEmailTracking, injectTrackingIntoHtml } = await import('./emailTracking');
      const _baseUrl = process.env.VITE_APP_URL || 'https://www.humanedge.health';
      // @ts-ignore - auto-injected tracking code uses typeof checks for variable detection
      const _tid = await createEmailTracking({ emailType: 'sendWelcomeEmail', recipientEmail: to, recipientName: typeof clientName !== 'undefined' ? clientName : (typeof recipientName !== 'undefined' ? recipientName : (typeof userName !== 'undefined' ? userName : undefined)), subject: typeof subject !== 'undefined' ? subject : 'sendWelcomeEmail' });
      _trackedHtml_sendWelcomeEmail = injectTrackingIntoHtml(htmlContent, _tid, _baseUrl);
    } catch (_e) { /* tracking failed, send without */ }
    await transporter.sendMail({
      from: `"Omega Longevity" <${smtpFrom}>`,
      replyTo: "omega@omegalongevity.com",
      to,
      subject,
      html: _trackedHtml_sendWelcomeEmail,
    });
    logEmailSentToHistory({ recipientEmail: to, recipientName: userName, subject: subject, category: 'welcome', notificationType: 'welcome_email', status: 'sent' });

    return { success: true, message: `Welcome email sent to ${to}` };
  } catch (error) {
    console.error("Failed to send welcome email:", error);
    return { success: false, message: `Failed to send welcome email: ${error instanceof Error ? error.message : "Unknown error"}` };
  }
}


// Send custom announcement email to waiver holders
export async function sendWaiverAnnouncementEmail(params: {
  to: string;
  recipientName: string;
  subject: string;
  message: string;
}): Promise<{ success: boolean; message: string }> {
  const { to, recipientName, subject, message } = params;

  const transporter = getTransporter();
  const smtpFrom = process.env.SMTP_FROM || "Omega Longevity <noreply@humanedge.health>";

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0f172a;">
      <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 30px;">
          <div style="background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); padding: 30px; border-radius: 16px 16px 0 0;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">
              📢 Announcement from Omega Longevity
            </h1>
          </div>
        </div>

        <!-- Main Content -->
        <div style="background-color: #1e293b; border-radius: 0 0 16px 16px; padding: 30px; color: #e2e8f0;">
          <p style="font-size: 16px; margin-bottom: 20px;">
            Hi <strong style="color: #a855f7;">${recipientName}</strong>,
          </p>
          
          <!-- Message Content -->
          <div style="background-color: #0f172a; border-radius: 12px; padding: 25px; margin-bottom: 25px; border-left: 4px solid #a855f7;">
            <div style="color: #e2e8f0; font-size: 15px; line-height: 1.8; white-space: pre-wrap;">${message}</div>
          </div>

          <!-- Footer Note -->
          <p style="font-size: 14px; color: #94a3b8; text-align: center;">
            This message was sent to you as a valued member of the Omega Longevity community.
          </p>
        </div>

        <!-- Footer -->
        <div style="text-align: center; margin-top: 30px; color: #64748b; font-size: 13px;">
          <p style="margin: 0 0 10px 0;">
            <strong style="color: #a855f7;">Omega Longevity</strong><br>
            Elite Level Health Optimization
          </p>
          <p style="margin: 0;">
            Questions? Reply to this email to reach us.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  if (!transporter) {
    console.log("=== WAIVER ANNOUNCEMENT EMAIL (Simulated) ===");
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Recipient: ${recipientName}`);
    console.log(`Message: ${message}`);
    console.log("=== END EMAIL ===");
    return { success: true, message: "Announcement email simulated (SMTP not configured)" };
  }

  try {
    // Auto-inject email tracking
    let _trackedHtml_sendWaiverAnnouncementEmail = htmlContent;
    try {
      const { createEmailTracking, injectTrackingIntoHtml } = await import('./emailTracking');
      const _baseUrl = process.env.VITE_APP_URL || 'https://www.humanedge.health';
      // @ts-ignore - auto-injected tracking code uses typeof checks for variable detection
      const _tid = await createEmailTracking({ emailType: 'sendWaiverAnnouncementEmail', recipientEmail: to, recipientName: typeof clientName !== 'undefined' ? clientName : (typeof recipientName !== 'undefined' ? recipientName : (typeof userName !== 'undefined' ? userName : undefined)), subject: typeof subject !== 'undefined' ? subject : 'sendWaiverAnnouncementEmail' });
      _trackedHtml_sendWaiverAnnouncementEmail = injectTrackingIntoHtml(htmlContent, _tid, _baseUrl);
    } catch (_e) { /* tracking failed, send without */ }
    await transporter.sendMail({
      from: `"Omega Longevity" <${smtpFrom}>`,
      replyTo: "omega@omegalongevity.com",
      to,
      subject,
      html: _trackedHtml_sendWaiverAnnouncementEmail,
    });
    logEmailSentToHistory({ recipientEmail: to, recipientName: recipientName, subject: subject, category: 'announcement', notificationType: 'waiver_announcement', status: 'sent' });

    return { success: true, message: `Announcement sent to ${to}` };
  } catch (error) {
    console.error("Failed to send announcement email:", error);
    return { success: false, message: `Failed to send announcement: ${error instanceof Error ? error.message : "Unknown error"}` };
  }
}


// Send payment status notification email to client
export async function sendPaymentStatusNotification(params: {
  to: string;
  clientName: string;
  status: 'paid' | 'failed' | 'refunded';
  protocolName?: string;
  amount?: number;
  paymentMethod?: string;
  notes?: string;
  protocolUrl?: string;
}): Promise<{ success: boolean; message: string }> {
  const { to, clientName, status, protocolName, amount, paymentMethod, notes, protocolUrl } = params;

  const transporter = getTransporter();
  const smtpFrom = process.env.SMTP_FROM || "Omega Longevity <noreply@humanedge.health>";

  const statusConfig = {
    paid: {
      title: "Payment Confirmed!",
      subtitle: "Your payment has been successfully processed",
      icon: "✓",
      color: "#22c55e",
      headerGradient: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
      message: "Great news! Your payment has been confirmed and your protocol is now active. You can now access all your health optimization resources.",
      nextSteps: [
        "Your protocol is now active and ready to view",
        "Your coach has been notified of your payment",
        "Fulfillment of any physical items will begin shortly",
        "Questions? Use the Discussion feature on your protocol page"
      ]
    },
    failed: {
      title: "Payment Issue",
      subtitle: "There was a problem with your payment",
      icon: "⚠",
      color: "#ef4444",
      headerGradient: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
      message: "We encountered an issue processing your payment. Please review the details below and contact your coach if you need assistance.",
      nextSteps: [
        "Check your payment method and try again",
        "Contact your coach for alternative payment options",
        "If you believe this is an error, please reach out to us"
      ]
    },
    refunded: {
      title: "Refund Processed",
      subtitle: "Your refund has been initiated",
      icon: "↩",
      color: "#3b82f6",
      headerGradient: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
      message: "Your refund has been processed. Please allow 5-10 business days for the funds to appear in your account, depending on your payment method.",
      nextSteps: [
        "Refunds typically take 5-10 business days to process",
        "Check your original payment method for the refund",
        "Contact your coach if you have questions about your refund"
      ]
    }
  };

  const config = statusConfig[status];
  const subject = `${config.icon} ${config.title} - Omega Longevity`;

  const nextStepsHtml = config.nextSteps.map(step => `
    <li style="margin-bottom: 8px; color: #94a3b8;">${step}</li>
  `).join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${config.title}</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0f172a;">
      <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 30px;">
          <div style="background: ${config.headerGradient}; padding: 30px; border-radius: 16px 16px 0 0;">
            <div style="font-size: 48px; margin-bottom: 10px;">${config.icon}</div>
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">
              ${config.title}
            </h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">
              ${config.subtitle}
            </p>
          </div>
        </div>

        <!-- Main Content -->
        <div style="background-color: #1e293b; border-radius: 0 0 16px 16px; padding: 30px; color: #e2e8f0;">
          <p style="font-size: 16px; margin-bottom: 20px;">
            Hi <strong style="color: #f97316;">${clientName}</strong>,
          </p>
          
          <p style="font-size: 15px; line-height: 1.6; margin-bottom: 25px;">
            ${config.message}
          </p>

          <!-- Payment Details -->
          <div style="background-color: #0f172a; border-radius: 12px; padding: 20px; margin-bottom: 25px;">
            ${protocolName ? `
            <div style="display: flex; justify-content: space-between; margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid #334155;">
              <span style="color: #94a3b8;">Protocol:</span>
              <span style="color: #e2e8f0; font-weight: 600;">${protocolName}</span>
            </div>
            ` : ''}
            ${amount ? `
            <div style="display: flex; justify-content: space-between; margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid #334155;">
              <span style="color: #94a3b8;">Amount:</span>
              <span style="color: ${config.color}; font-weight: 600;">$${(amount / 100).toFixed(2)}</span>
            </div>
            ` : ''}
            ${paymentMethod ? `
            <div style="display: flex; justify-content: space-between; margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid #334155;">
              <span style="color: #94a3b8;">Payment Method:</span>
              <span style="color: #e2e8f0;">${paymentMethod}</span>
            </div>
            ` : ''}
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #94a3b8;">Date:</span>
              <span style="color: #e2e8f0;">${new Date().toLocaleDateString('en-US', { timeZone: 'America/Denver', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>
            ${notes ? `
            <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #334155;">
              <span style="color: #94a3b8;">Notes:</span>
              <p style="color: #e2e8f0; margin: 5px 0 0 0;">${notes}</p>
            </div>
            ` : ''}
          </div>

          ${protocolUrl && status === 'paid' ? `
          <!-- Protocol Link -->
          <div style="text-align: center; margin-bottom: 25px;">
            <a href="${protocolUrl}" style="display: inline-block; background: linear-gradient(135deg, #ea580c 0%, #f97316 100%); color: #ffffff; text-decoration: none; padding: 14px 30px; border-radius: 8px; font-weight: 600; font-size: 16px;">
              View Your Protocol
            </a>
          </div>
          ` : ''}

          <!-- Next Steps -->
          <div style="background-color: #0f172a; border-radius: 12px; padding: 20px; border-left: 4px solid ${config.color};">
            <h3 style="color: ${config.color}; margin: 0 0 10px 0; font-size: 16px;">What's Next?</h3>
            <ul style="margin: 0; padding-left: 20px; line-height: 1.8;">
              ${nextStepsHtml}
            </ul>
          </div>
        </div>

        <!-- Footer -->
        <div style="text-align: center; margin-top: 30px; color: #64748b; font-size: 13px;">
          <p style="margin: 0 0 10px 0;">
            <strong style="color: #f97316;">Omega Longevity</strong><br>
            Elite Level Health Optimization
          </p>
          <p style="margin: 0;">
            This is an automated notification. Please do not reply directly.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  if (!transporter) {
    console.log("=== PAYMENT STATUS EMAIL (Simulated) ===");
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Client: ${clientName}`);
    console.log(`Status: ${status}`);
    console.log(`Amount: ${amount ? `$${(amount / 100).toFixed(2)}` : 'N/A'}`);
    console.log("=== END EMAIL ===");
    return { success: true, message: `Payment ${status} notification simulated (SMTP not configured)` };
  }

  try {
    // Auto-inject email tracking
    let _trackedHtml_sendPaymentStatusNotification = htmlContent;
    try {
      const { createEmailTracking, injectTrackingIntoHtml } = await import('./emailTracking');
      const _baseUrl = process.env.VITE_APP_URL || 'https://www.humanedge.health';
      // @ts-ignore - auto-injected tracking code uses typeof checks for variable detection
      const _tid = await createEmailTracking({ emailType: 'sendPaymentStatusNotification', recipientEmail: to, recipientName: typeof clientName !== 'undefined' ? clientName : (typeof recipientName !== 'undefined' ? recipientName : (typeof userName !== 'undefined' ? userName : undefined)), subject: typeof subject !== 'undefined' ? subject : 'sendPaymentStatusNotification' });
      _trackedHtml_sendPaymentStatusNotification = injectTrackingIntoHtml(htmlContent, _tid, _baseUrl);
    } catch (_e) { /* tracking failed, send without */ }
    await transporter.sendMail({
      from: `"Omega Longevity" <${smtpFrom}>`,
      replyTo: "omega@omegalongevity.com",
      to,
      subject,
      html: _trackedHtml_sendPaymentStatusNotification,
    });
    logEmailSentToHistory({ recipientEmail: to, recipientName: clientName, subject: subject, category: 'payment', notificationType: 'payment_status', status: 'sent' });

    return { success: true, message: `Payment ${status} notification sent to ${to}` };
  } catch (error) {
    console.error(`Failed to send payment ${status} notification:`, error);
    return { success: false, message: `Failed to send notification: ${error instanceof Error ? error.message : "Unknown error"}` };
  }
}


/**
 * Send email notification to admin when a client completes their profile
 */
export async function sendProfileCompletionNotification(
  adminEmail: string,
  clientName: string,
  clientEmail: string,
  protocolName: string,
  clientEditUrl: string
): Promise<{ success: boolean; message: string }> {
  const transporter = getTransporter();
  const smtpFrom = process.env.SMTP_FROM || "noreply@humanedge.health";

  const subject = `🎉 Profile Complete: ${clientName} is Ready for Checkout`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0a0a0a;">
      <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 30px;">
          <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); border-radius: 50%; margin: 0 auto 15px; display: flex; align-items: center; justify-content: center;">
            <span style="font-size: 28px;">✓</span>
          </div>
          <h1 style="color: #22c55e; margin: 0; font-size: 24px; font-weight: 700;">
            Profile Complete!
          </h1>
        </div>

        <!-- Main Content -->
        <div style="background-color: #1e293b; border-radius: 16px; padding: 30px; color: #e2e8f0;">
          <p style="font-size: 16px; margin-bottom: 20px;">
            Great news! <strong style="color: #22c55e;">${clientName}</strong> has completed their profile and is now ready for checkout.
          </p>
          
          <!-- Client Details -->
          <div style="background-color: #0f172a; border-radius: 12px; padding: 20px; margin-bottom: 25px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid #334155;">
              <span style="color: #94a3b8;">Client Name:</span>
              <span style="color: #e2e8f0; font-weight: 600;">${clientName}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid #334155;">
              <span style="color: #94a3b8;">Email:</span>
              <span style="color: #e2e8f0;">${clientEmail}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #94a3b8;">Protocol:</span>
              <span style="color: #f97316; font-weight: 600;">${protocolName}</span>
            </div>
          </div>

          <!-- Action Button -->
          <div style="text-align: center; margin-bottom: 25px;">
            <a href="${clientEditUrl}" style="display: inline-block; background: linear-gradient(135deg, #ea580c 0%, #f97316 100%); color: #ffffff; text-decoration: none; padding: 14px 30px; border-radius: 8px; font-weight: 600; font-size: 16px;">
              View Client Details
            </a>
          </div>

          <!-- Next Steps -->
          <div style="background-color: #0f172a; border-radius: 12px; padding: 20px; border-left: 4px solid #22c55e;">
            <h3 style="color: #22c55e; margin: 0 0 10px 0; font-size: 16px;">Next Steps</h3>
            <ul style="margin: 0; padding-left: 20px; line-height: 1.8; color: #94a3b8;">
              <li>Review the client's shipping address</li>
              <li>If they paid externally, use "Record External Payment"</li>
              <li>Send them a payment reminder if needed</li>
            </ul>
          </div>
        </div>

        <!-- Footer -->
        <div style="text-align: center; margin-top: 30px; color: #64748b; font-size: 13px;">
          <p style="margin: 0 0 10px 0;">
            <strong style="color: #f97316;">Omega Longevity</strong><br>
            Elite Level Health Optimization
          </p>
          <p style="margin: 0;">
            This is an automated notification from your admin dashboard.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  if (!transporter) {
    console.log("=== PROFILE COMPLETION EMAIL (Simulated) ===");
    console.log(`To: ${adminEmail}`);
    console.log(`Subject: ${subject}`);
    console.log(`Client: ${clientName} (${clientEmail})`);
    console.log(`Protocol: ${protocolName}`);
    console.log("=== END EMAIL ===");
    return { success: true, message: `Profile completion notification simulated (SMTP not configured)` };
  }

  try {
    // Auto-inject email tracking
    let _trackedHtml_sendProfileCompletionNotification = htmlContent;
    try {
      const { createEmailTracking, injectTrackingIntoHtml } = await import('./emailTracking');
      const _baseUrl = process.env.VITE_APP_URL || 'https://www.humanedge.health';
      // @ts-ignore - auto-injected tracking code uses typeof checks for variable detection
      const _tid = await createEmailTracking({ emailType: 'sendProfileCompletionNotification', recipientEmail: to, recipientName: typeof clientName !== 'undefined' ? clientName : (typeof recipientName !== 'undefined' ? recipientName : (typeof userName !== 'undefined' ? userName : undefined)), subject: typeof subject !== 'undefined' ? subject : 'sendProfileCompletionNotification' });
      _trackedHtml_sendProfileCompletionNotification = injectTrackingIntoHtml(htmlContent, _tid, _baseUrl);
    } catch (_e) { /* tracking failed, send without */ }
    await transporter.sendMail({
      from: `"Omega Longevity" <${smtpFrom}>`,
      replyTo: "omega@omegalongevity.com",
      to: adminEmail,
      subject,
      html: _trackedHtml_sendProfileCompletionNotification,
    });
    logEmailSentToHistory({ recipientEmail: adminEmail, recipientName: undefined, subject: subject, category: 'other', notificationType: 'profile_completion', status: 'sent' });

    return { success: true, message: `Profile completion notification sent to ${adminEmail}` };
  } catch (error) {
    console.error(`Failed to send profile completion notification:`, error);
    return { success: false, message: `Failed to send notification: ${error instanceof Error ? error.message : "Unknown error"}` };
  }
}



// Send profile completion reminder email to a client
export async function sendProfileCompletionReminderEmail(params: {
  to: string;
  clientName: string;
  protocolUrl: string;
  missingFields: string[];
}): Promise<{ success: boolean; message: string }> {
  const { to, clientName, protocolUrl, missingFields } = params;

  const transporter = getTransporter();
  const smtpFrom = process.env.SMTP_FROM || "Omega Longevity <noreply@humanedge.health>";

  const subject = "Action Required: Complete Your Profile - Omega Longevity";

  const missingFieldsHtml = missingFields.map(field => `
    <li style="margin-bottom: 8px; color: #fbbf24;">
      <span style="color: #94a3b8;">${field}</span>
    </li>
  `).join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Complete Your Profile</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0a0a0a;">
      <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 30px;">
          <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; border-radius: 16px 16px 0 0;">
            <div style="font-size: 48px; margin-bottom: 10px;">📋</div>
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">
              Complete Your Profile
            </h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">
              Just a few more details needed
            </p>
          </div>
        </div>

        <!-- Main Content -->
        <div style="background-color: #1e293b; border-radius: 0 0 16px 16px; padding: 30px; color: #e2e8f0;">
          <p style="font-size: 16px; margin-bottom: 20px;">
            Hi <strong style="color: #f97316;">${clientName}</strong>,
          </p>
          
          <p style="font-size: 15px; line-height: 1.6; margin-bottom: 25px;">
            Your personalized health protocol is almost ready! To view pricing and proceed with checkout, please complete your profile by providing the following information:
          </p>

          <!-- Missing Fields -->
          <div style="background-color: #0f172a; border-radius: 12px; padding: 20px; margin-bottom: 25px; border-left: 4px solid #f59e0b;">
            <h3 style="color: #f59e0b; margin: 0 0 15px 0; font-size: 16px;">Missing Information:</h3>
            <ul style="margin: 0; padding-left: 20px; line-height: 1.8;">
              ${missingFieldsHtml}
            </ul>
          </div>

          <!-- CTA Button -->
          <div style="text-align: center; margin-bottom: 25px;">
            <a href="${protocolUrl}" style="display: inline-block; background: linear-gradient(135deg, #ea580c 0%, #f97316 100%); color: #ffffff; text-decoration: none; padding: 14px 30px; border-radius: 8px; font-weight: 600; font-size: 16px;">
              Complete My Profile
            </a>
          </div>

          <!-- Why Complete -->
          <div style="background-color: #0f172a; border-radius: 12px; padding: 20px;">
            <h3 style="color: #22c55e; margin: 0 0 10px 0; font-size: 16px;">Why is this needed?</h3>
            <ul style="margin: 0; padding-left: 20px; line-height: 1.8; color: #94a3b8;">
              <li>View your personalized pricing</li>
              <li>Ensure accurate shipping for your products</li>
              <li>Enable seamless checkout experience</li>
            </ul>
          </div>
        </div>

        <!-- Footer -->
        <div style="text-align: center; margin-top: 30px; color: #64748b; font-size: 13px;">
          <p style="margin: 0 0 10px 0;">
            <strong style="color: #f97316;">Omega Longevity</strong><br>
            Elite Level Health Optimization
          </p>
          <p style="margin: 0;">
            Questions? Reply to this email or contact your coach.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  if (!transporter) {
    console.log("=== PROFILE COMPLETION REMINDER EMAIL (Simulated) ===");
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Client: ${clientName}`);
    console.log(`Missing Fields: ${missingFields.join(', ')}`);
    console.log("=== END EMAIL ===");
    return { success: true, message: `Profile completion reminder simulated (SMTP not configured)` };
  }

  try {
    // Auto-inject email tracking
    let _trackedHtml_sendProfileCompletionReminderEmail = htmlContent;
    try {
      const { createEmailTracking, injectTrackingIntoHtml } = await import('./emailTracking');
      const _baseUrl = process.env.VITE_APP_URL || 'https://www.humanedge.health';
      // @ts-ignore - auto-injected tracking code uses typeof checks for variable detection
      const _tid = await createEmailTracking({ emailType: 'sendProfileCompletionReminderEmail', recipientEmail: to, recipientName: typeof clientName !== 'undefined' ? clientName : (typeof recipientName !== 'undefined' ? recipientName : (typeof userName !== 'undefined' ? userName : undefined)), subject: typeof subject !== 'undefined' ? subject : 'sendProfileCompletionReminderEmail' });
      _trackedHtml_sendProfileCompletionReminderEmail = injectTrackingIntoHtml(htmlContent, _tid, _baseUrl);
    } catch (_e) { /* tracking failed, send without */ }
    await transporter.sendMail({
      from: `"Omega Longevity" <${smtpFrom}>`,
      replyTo: "omega@omegalongevity.com",
      to,
      subject,
      html: _trackedHtml_sendProfileCompletionReminderEmail,
    });
    logEmailSentToHistory({ recipientEmail: to, recipientName: clientName, subject: subject, category: 'other', notificationType: 'profile_completion_reminder', status: 'sent' });

    return { success: true, message: `Profile completion reminder sent to ${to}` };
  } catch (error) {
    console.error(`Failed to send profile completion reminder:`, error);
    return { success: false, message: `Failed to send reminder: ${error instanceof Error ? error.message : "Unknown error"}` };
  }
}


/**
 * Send a payment reminder email to a client with a direct link to complete payment
 */
export async function sendPaymentReminderEmail(params: {
  to: string;
  clientName: string;
  totalAmount: number;
  paymentLink: string;
  paymentPortalLink: string;
  supportEmail: string;
}): Promise<{ success: boolean; message: string }> {
  const { to, clientName, totalAmount, paymentLink, paymentPortalLink, supportEmail } = params;

  const transporter = getTransporter();
  const smtpFrom = process.env.SMTP_FROM || "Omega Longevity <noreply@humanedge.health>";

  const subject = `Complete Your Payment - Omega Longevity`;
  const formattedAmount = `$${totalAmount.toFixed(2)}`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Payment Reminder</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0f172a;">
      <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 30px;">
          <div style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 30px; border-radius: 16px 16px 0 0;">
            <div style="font-size: 48px; margin-bottom: 10px;">💳</div>
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">
              Payment Reminder
            </h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">
              Complete your protocol payment
            </p>
          </div>
        </div>

        <!-- Main Content -->
        <div style="background-color: #1e293b; border-radius: 0 0 16px 16px; padding: 30px; color: #e2e8f0;">
          <p style="font-size: 16px; margin-bottom: 20px;">
            Hi <strong style="color: #f97316;">${clientName}</strong>,
          </p>
          
          <p style="font-size: 15px; line-height: 1.6; margin-bottom: 25px;">
            We noticed that your protocol payment is still pending. Please complete your payment to activate your protocol access.
          </p>

          <!-- Payment Amount -->
          <div style="background-color: #0f172a; border-radius: 12px; padding: 20px; margin-bottom: 25px; text-align: center;">
            <p style="color: #94a3b8; margin: 0 0 10px 0; font-size: 14px;">Amount Due</p>
            <p style="color: #22c55e; margin: 0; font-size: 36px; font-weight: 700;">${formattedAmount}</p>
          </div>

          <!-- CTA Button -->
          <div style="text-align: center; margin-bottom: 25px;">
            <a href="${paymentLink}" style="display: inline-block; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: 600;">
              Complete Payment Now
            </a>
          </div>

          <p style="font-size: 14px; color: #94a3b8; text-align: center; margin-bottom: 20px;">
            Or copy this link: <a href="${paymentLink}" style="color: #f97316;">${paymentLink}</a>
          </p>

          <!-- Help Section -->
          <div style="background-color: #0f172a; border-radius: 12px; padding: 20px; border-left: 4px solid #f97316;">
            <h3 style="color: #f97316; margin: 0 0 10px 0; font-size: 16px;">Need Help?</h3>
            <p style="margin: 0; color: #94a3b8; font-size: 14px;">
              If you have any questions about your payment or protocol, please contact us at 
              <a href="mailto:${supportEmail}" style="color: #f97316;">${supportEmail}</a>
            </p>
          </div>
        </div>

        <!-- Footer -->
        <div style="text-align: center; margin-top: 30px; color: #64748b; font-size: 13px;">
          <p style="margin: 0 0 10px 0;">
            <strong style="color: #f97316;">Omega Longevity</strong><br>
            Elite Level Health Optimization
          </p>
          <p style="margin: 0;">
            This is an automated reminder. Please do not reply directly.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  if (!transporter) {
    console.log("=== PAYMENT REMINDER EMAIL (Simulated) ===");
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Client: ${clientName}`);
    console.log(`Amount: ${formattedAmount}`);
    console.log(`Payment Link: ${paymentLink}`);
    console.log("=== END EMAIL ===");
    return { success: true, message: `Payment reminder simulated (SMTP not configured)` };
  }

  try {
    // Auto-inject email tracking
    let _trackedHtml_sendPaymentReminderEmail = htmlContent;
    try {
      const { createEmailTracking, injectTrackingIntoHtml } = await import('./emailTracking');
      const _baseUrl = process.env.VITE_APP_URL || 'https://www.humanedge.health';
      // @ts-ignore - auto-injected tracking code uses typeof checks for variable detection
      const _tid = await createEmailTracking({ emailType: 'sendPaymentReminderEmail', recipientEmail: to, recipientName: typeof clientName !== 'undefined' ? clientName : (typeof recipientName !== 'undefined' ? recipientName : (typeof userName !== 'undefined' ? userName : undefined)), subject: typeof subject !== 'undefined' ? subject : 'sendPaymentReminderEmail' });
      _trackedHtml_sendPaymentReminderEmail = injectTrackingIntoHtml(htmlContent, _tid, _baseUrl);
    } catch (_e) { /* tracking failed, send without */ }
    await transporter.sendMail({
      from: `"Omega Longevity" <${smtpFrom}>`,
      replyTo: supportEmail,
      to,
      subject,
      html: _trackedHtml_sendPaymentReminderEmail,
    });
    logEmailSentToHistory({ recipientEmail: to, recipientName: clientName, subject: subject, category: 'payment', notificationType: 'payment_reminder', status: 'sent' });

    return { success: true, message: `Payment reminder sent to ${to}` };
  } catch (error) {
    console.error(`Failed to send payment reminder:`, error);
    return { success: false, message: `Failed to send reminder: ${error instanceof Error ? error.message : "Unknown error"}` };
  }
}


/**
 * Send transformation milestone progress email to client
 * Triggered when client completes key milestones in their journey
 */
export async function sendTransformationMilestoneEmail(params: {
  to: string;
  clientName: string;
  milestone: 'enrolled' | 'coaching_paid' | 'intake_completed' | 'discovery_scheduled' | 'discovery_completed' | 'protocol_ready' | 'protocol_approved' | 'protocol_paid' | 'box_shipped' | 'box_delivered' | 'reconstitution_scheduled' | 'training_completed' | 'week3_review' | 'month3_final';
  nextStepTitle?: string;
  nextStepDescription?: string;
  dashboardUrl: string;
  enrollmentId?: number;
}): Promise<{ success: boolean; message: string }> {
  const { to, clientName, milestone, nextStepTitle, nextStepDescription, dashboardUrl, enrollmentId } = params;

  // Check if milestone notifications are enabled
  const isEnabled = await isNotificationEnabled('transformation_milestone');
  if (!isEnabled) {
    console.log(`[Email] Transformation milestone notifications disabled, skipping email to ${to}`);
    return { success: true, message: 'Milestone notifications disabled' };
  }

  const transporter = getTransporter();
  const smtpFrom = process.env.SMTP_FROM || "noreply@humanedge.health";
  const supportEmail = "omega@omegalongevity.com";

  // Milestone-specific content
  const milestoneContent: Record<string, { title: string; message: string; emoji: string }> = {
    enrolled: {
      title: "Welcome to Your Transformation!",
      message: "You've taken the first step toward elite-level health optimization. Your transformation journey starts now.",
      emoji: "\ud83c\udfaf"
    },
    coaching_paid: {
      title: "Payment Confirmed! 🎉",
      message: "Your coaching investment has been received. You're officially enrolled in the transformation program!",
      emoji: "💳"
    },
    intake_completed: {
      title: "Intake Form Received!",
      message: "Thank you for completing your intake form. We're reviewing your information to prepare for your strategy session.",
      emoji: "\ud83d\udcdd"
    },
    discovery_scheduled: {
      title: "Strategy Session Scheduled!",
      message: "Your strategy session has been booked. Get ready for a deep dive into your health goals and personalized protocol planning.",
      emoji: "\ud83d\udcc5"
    },
    discovery_completed: {
      title: "Strategy Session Complete! \ud83c\udf1f",
      message: "Great conversation! Your personalized protocol is now being prepared based on our discussion.",
      emoji: "🎯"
    },
    protocol_ready: {
      title: "Your Protocol is Ready! 📋",
      message: "Your customized protocol has been prepared and is ready for your review and approval.",
      emoji: "✨"
    },
    protocol_approved: {
      title: "Protocol Approved!",
      message: "Your personalized protocol has been approved. We're now preparing everything for your transformation.",
      emoji: "\ud83d\udc4d"
    },
    protocol_paid: {
      title: "Protocol Payment Confirmed!",
      message: "Your protocol payment has been received. Your peptide supply box is being prepared for shipment.",
      emoji: "\ud83d\udcb3"
    },
    box_shipped: {
      title: "Your Box Has Shipped! \ud83d\udce6",
      message: "Exciting news! Your peptide supply box is on its way. Track your delivery in your dashboard.",
      emoji: "🚚"
    },
    box_delivered: {
      title: "Your Box Has Arrived! 🎁",
      message: "Your peptide supply box has been delivered. Time to schedule your reconstitution training!",
      emoji: "📬"
    },
    reconstitution_scheduled: {
      title: "Training Session Scheduled!",
      message: "Your reconstitution training session has been booked. You'll learn proper preparation and administration techniques.",
      emoji: "\ud83d\udcc5"
    },
    training_completed: {
      title: "Training Complete - You're Ready! \ud83d\udcaa",
      message: "Congratulations! You've completed your reconstitution training. Your transformation journey officially begins!",
      emoji: "🚀"
    },
    week3_review: {
      title: "Week 3 Check-In Time! 📊",
      message: "You've completed 3 weeks of your transformation. Time for your progress review session!",
      emoji: "📈"
    },
    month3_final: {
      title: "Final Review - 90 Days Complete! 🏆",
      message: "Incredible achievement! You've completed your 90-day transformation. Let's review your results!",
      emoji: "🎊"
    }
  };

  const content = milestoneContent[milestone] || {
    title: "Milestone Achieved! 🎉",
    message: "You've reached an important milestone in your transformation journey.",
    emoji: "⭐"
  };

  const subject = `${content.emoji} ${content.title} - Omega Longevity`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc;">
      <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <!-- Header with Logo -->
        <!-- Main Content Card -->
        <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 16px; padding: 40px; color: #e2e8f0;">
          <!-- Milestone Badge -->
          <div style="text-align: center; margin-bottom: 25px;">
            <span style="font-size: 48px;">${content.emoji}</span>
          </div>

          <h1 style="color: #f97316; text-align: center; margin: 0 0 20px 0; font-size: 28px; font-weight: 700;">
            ${content.title}
          </h1>

          <p style="font-size: 16px; margin-bottom: 20px;">
            Hi <strong style="color: #f97316;">${clientName}</strong>,
          </p>
          
          <p style="font-size: 15px; line-height: 1.6; margin-bottom: 25px;">
            ${content.message}
          </p>

          ${nextStepTitle ? `
          <!-- Next Step Card -->
          <div style="background-color: #0f172a; border-radius: 12px; padding: 20px; margin-bottom: 25px; border-left: 4px solid #22c55e;">
            <h3 style="color: #22c55e; margin: 0 0 10px 0; font-size: 16px;">🎯 Next Step: ${nextStepTitle}</h3>
            <p style="margin: 0; color: #94a3b8; font-size: 14px;">
              ${nextStepDescription || 'Check your dashboard for details.'}
            </p>
          </div>
          ` : ''}

          <!-- CTA Button -->
          <div style="text-align: center; margin-bottom: 25px;">
            <a href="${dashboardUrl}" style="display: inline-block; background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: 600;">
              View Your Dashboard
            </a>
          </div>

          <!-- Progress Encouragement -->
          <div style="background-color: #0f172a; border-radius: 12px; padding: 20px; text-align: center;">
            <p style="margin: 0; color: #94a3b8; font-size: 14px;">
              🌟 Every step forward is progress. Keep going! 🌟
            </p>
          </div>
        </div>

        <!-- Footer -->
        <div style="text-align: center; margin-top: 30px; color: #64748b; font-size: 13px;">
          <p style="margin: 0 0 10px 0;">
            <strong style="color: #f97316;">Omega Longevity</strong><br>
            Elite Level Health Optimization
          </p>
          <p style="margin: 0 0 10px 0;">
            Questions? Contact us at <a href="mailto:${supportEmail}" style="color: #f97316;">${supportEmail}</a>
          </p>
          <p style="margin: 0;">
            This is an automated notification. Please do not reply directly.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  // Inject email tracking (pixel + link wrapping)
  let trackedHtml = htmlContent;
  let trackingId: string | null = null;
  try {
    const { createEmailTracking, injectTrackingIntoHtml } = await import('./emailTracking');
    const baseUrl = process.env.VITE_APP_URL || 'https://www.humanedge.health';
    trackingId = await createEmailTracking({
      enrollmentId: enrollmentId || undefined,
      emailType: 'transformation_milestone',
      recipientEmail: to,
      recipientName: clientName,
      subject,
    });
    trackedHtml = injectTrackingIntoHtml(htmlContent, trackingId, baseUrl);
  } catch (trackErr) {
    console.error('[EmailTracking] Failed to inject tracking into milestone email:', trackErr);
  }

  if (!transporter) {
    console.log("=== TRANSFORMATION MILESTONE EMAIL (Simulated) ===");
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Client: ${clientName}`);
    console.log(`Milestone: ${milestone}`);
    console.log(`TrackingId: ${trackingId}`);
    console.log("=== END EMAIL ===");
    return { success: true, message: `Milestone email simulated (SMTP not configured)` };
  }

  try {
    await transporter.sendMail({
      from: `"Omega Longevity" <${smtpFrom}>`,
      replyTo: supportEmail,
      to,
      subject,
      html: trackedHtml,
    });
    logEmailSentToHistory({ recipientEmail: to, recipientName: clientName, subject: subject, category: 'other', notificationType: 'transformation_milestone', status: 'sent' });

    return { success: true, message: `Milestone email sent to ${to}` };
  } catch (error) {
    console.error(`Failed to send milestone email:`, error);
    return { success: false, message: `Failed to send email: ${error instanceof Error ? error.message : "Unknown error"}` };
  }
}

/**
 * Send admin notification when client reaches a milestone
 */
export async function sendAdminMilestoneNotification(params: {
  adminEmails: string[];
  clientName: string;
  clientEmail: string;
  milestone: string;
  milestoneLabel: string;
}): Promise<{ success: boolean; message: string }> {
  const { adminEmails, clientName, clientEmail, milestone, milestoneLabel } = params;

  // Check if admin milestone notifications are enabled
  const isEnabled = await isNotificationEnabled('admin_transformation_milestone');
  if (!isEnabled) {
    console.log(`[Email] Admin milestone notifications disabled, skipping`);
    return { success: true, message: 'Admin milestone notifications disabled' };
  }

  const transporter = getTransporter();
  const smtpFrom = process.env.SMTP_FROM || "noreply@humanedge.health";

  const subject = `🎯 Client Milestone: ${clientName} - ${milestoneLabel}`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
    </head>
    <body style="margin: 0; padding: 20px; font-family: Arial, sans-serif; background-color: #f8fafc;">
      <div style="max-width: 500px; margin: 0 auto; background: white; border-radius: 12px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <h2 style="color: #f97316; margin: 0 0 20px 0;">🎯 Client Milestone Reached</h2>
        
        <div style="background: #f8fafc; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
          <p style="margin: 0 0 10px 0;"><strong>Client:</strong> ${clientName}</p>
          <p style="margin: 0 0 10px 0;"><strong>Email:</strong> ${clientEmail}</p>
          <p style="margin: 0;"><strong>Milestone:</strong> ${milestoneLabel}</p>
        </div>

        <p style="color: #64748b; font-size: 14px; margin: 0;">
          This client has reached a key milestone in their transformation journey.
        </p>
      </div>
    </body>
    </html>
  `;

  if (!transporter) {
    console.log("=== ADMIN MILESTONE NOTIFICATION (Simulated) ===");
    console.log(`To: ${adminEmails.join(', ')}`);
    console.log(`Client: ${clientName} (${clientEmail})`);
    console.log(`Milestone: ${milestoneLabel}`);
    console.log("=== END EMAIL ===");
    return { success: true, message: `Admin notification simulated` };
  }

  try {
    for (const adminEmail of adminEmails) {
      // Auto-inject email tracking
      let _trackedHtml_sendAdminMilestoneNotification = htmlContent;
      try {
        const { createEmailTracking, injectTrackingIntoHtml } = await import('./emailTracking');
        const _baseUrl = process.env.VITE_APP_URL || 'https://www.humanedge.health';
        // @ts-ignore - auto-injected tracking code uses typeof checks for variable detection
        const _tid = await createEmailTracking({ emailType: 'sendAdminMilestoneNotification', recipientEmail: to, recipientName: typeof clientName !== 'undefined' ? clientName : (typeof recipientName !== 'undefined' ? recipientName : (typeof userName !== 'undefined' ? userName : undefined)), subject: typeof subject !== 'undefined' ? subject : 'sendAdminMilestoneNotification' });
        _trackedHtml_sendAdminMilestoneNotification = injectTrackingIntoHtml(htmlContent, _tid, _baseUrl);
      } catch (_e) { /* tracking failed, send without */ }
      await transporter.sendMail({
        from: `"Omega Longevity System" <${smtpFrom}>`,
        to: adminEmail,
        subject,
        html: _trackedHtml_sendAdminMilestoneNotification,
      });
    logEmailSentToHistory({ recipientEmail: adminEmail, recipientName: undefined, subject: subject, category: 'other', notificationType: 'admin_milestone', status: 'sent' });
    }

    return { success: true, message: `Admin notifications sent` };
  } catch (error) {
    console.error(`Failed to send admin milestone notification:`, error);
    return { success: false, message: `Failed to send notification: ${error instanceof Error ? error.message : "Unknown error"}` };
  }
}


/**
 * Send transformation payment confirmation email to client
 */
export async function sendTransformationPaymentConfirmationEmail(params: {
  to: string;
  clientName: string;
  tier: "elite" | "flagship" | "essentials" | "advanced" | "recovery" | "immunity" | "longevity" | "mitochondria" | "functional_health_elite";
  amount: number;
  paymentMethod: string;
  promoCode?: string;
  discountAmount?: number;
  originalAmount?: number;
  baseUrl: string;
  enrollmentId?: number;
}): Promise<{ success: boolean; message: string }> {
  const { to, clientName, tier, amount, paymentMethod, promoCode, discountAmount, originalAmount, baseUrl, enrollmentId } = params;

  const transporter = getTransporter();
  const smtpFrom = process.env.SMTP_FROM || "Omega Longevity <noreply@humanedge.health>";

   const tierNames: Record<string, string> = {
    elite: "Elite Longevity Program",
    flagship: "Weight Loss & Physique Program",
    essentials: "Protocol Essentials Program",
    advanced: "Advanced Weight Loss & Physique Program",
    recovery: "Recovery, Healing & Inflammation Program",
    immunity: "Immunity & Healing Program",
    longevity: "Longevity & Bioregulators Program",
    mitochondria: "Mitochondria Restoration Program",
    functional_health_elite: "Functional Health Elite Program",
  };
  const tierDescriptions: Record<string, string> = {
    elite: "Our premium longevity program with comprehensive coaching, VIP support, and quarterly optimization sessions.",
    flagship: "Our signature 90-day transformation with weekly coaching calls, custom protocol design, and community access.",
    essentials: "Self-paced program with masterclass access, protocol templates, and email support.",
  };

  const nextSteps: Record<string, string[]> = {
    elite: [
      "Your coach will reach out within 24 hours to schedule your Elite Longevity consultation",
      "Complete the health goals form in your journey dashboard",
      "Prepare any questions about your longevity goals",
    ],
    flagship: [
      "Watch the required bioregulator training videos in your dashboard",
      "Complete the coaching waiver and health goals form",
      "Schedule your strategy session with your coach",
    ],
    essentials: [
      "Access your masterclass video library",
      "Download the protocol templates from the Resources tab",
      "Join the Omega Elite Community for peer support",
    ],
  };

  const subject = `🎉 Payment Confirmed - Welcome to ${tierNames[tier]}!`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8f9fa;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); padding: 40px 30px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">Payment Confirmed!</h1>
          <p style="color: #e0e7ee; margin: 10px 0 0 0; font-size: 16px;">Welcome to your transformation journey</p>
        </div>
        
        <!-- Main Content -->
        <div style="padding: 40px 30px;">
          <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
            Hi ${clientName},
          </p>
          
          <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
            Thank you for your payment! Your enrollment in the <strong>${tierNames[tier]}</strong> is now confirmed.
          </p>
          
          <!-- Payment Summary -->
          <div style="background-color: #f8f9fa; border-radius: 12px; padding: 25px; margin-bottom: 30px;">
            <h3 style="color: #1e3a5f; margin: 0 0 15px 0; font-size: 18px;">Payment Summary</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="color: #666; padding: 8px 0; font-size: 14px;">Program:</td>
                <td style="color: #333; padding: 8px 0; font-size: 14px; text-align: right; font-weight: 600;">${tierNames[tier]}</td>
              </tr>
              ${originalAmount && discountAmount ? `
              <tr>
                <td style="color: #666; padding: 8px 0; font-size: 14px;">Original Price:</td>
                <td style="color: #999; padding: 8px 0; font-size: 14px; text-align: right; text-decoration: line-through;">$${originalAmount.toLocaleString('en-US', { timeZone: 'America/Denver' })}</td>
              </tr>
              <tr>
                <td style="color: #666; padding: 8px 0; font-size: 14px;">Promo Code (${promoCode}):</td>
                <td style="color: #22c55e; padding: 8px 0; font-size: 14px; text-align: right; font-weight: 600;">-$${discountAmount.toLocaleString('en-US', { timeZone: 'America/Denver' })}</td>
              </tr>
              ` : ''}
              <tr>
                <td style="color: #666; padding: 8px 0; font-size: 14px;">Amount Paid:</td>
                <td style="color: #1e3a5f; padding: 8px 0; font-size: 18px; text-align: right; font-weight: 700;">$${amount.toLocaleString('en-US', { timeZone: 'America/Denver' })}</td>
              </tr>
              <tr>
                <td style="color: #666; padding: 8px 0; font-size: 14px;">Payment Method:</td>
                <td style="color: #333; padding: 8px 0; font-size: 14px; text-align: right;">${paymentMethod}</td>
              </tr>
            </table>
          </div>
          
          <!-- Program Description -->
          <div style="margin-bottom: 30px;">
            <h3 style="color: #1e3a5f; margin: 0 0 10px 0; font-size: 18px;">About Your Program</h3>
            <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 0;">
              ${tierDescriptions[tier]}
            </p>
          </div>
          
          <!-- Next Steps -->
          <div style="background-color: #fff8e6; border-radius: 12px; padding: 25px; margin-bottom: 30px; border-left: 4px solid #f59e0b;">
            <h3 style="color: #92400e; margin: 0 0 15px 0; font-size: 18px;">📋 Your Next Steps</h3>
            <ol style="color: #666; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
              ${(nextSteps[tier] ?? ['Your coach will reach out within 24 hours to schedule your onboarding consultation', 'Complete the health goals form in your journey dashboard', 'Prepare any questions about your health goals']).map(step => `<li>${step}</li>`).join('')}
            </ol>
          </div>
          
          <!-- CTA Button -->
          <div style="text-align: center; margin: 30px 0;">
            <a href="${baseUrl}/transformation" style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px;">
              View Your Program →
            </a>
          </div>
          
          <!-- Support -->
          <div style="background-color: #f0f9ff; border-radius: 12px; padding: 20px; text-align: center;">
            <p style="color: #0369a1; font-size: 14px; margin: 0;">
              Questions? Reach out to your coach at<br>
              <a href="mailto:omega@omegalongevity.com" style="color: #0284c7; font-weight: 600;">omega@omegalongevity.com</a>
            </p>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #1e3a5f; padding: 30px; text-align: center;">
          <p style="color: #94a3b8; font-size: 12px; margin: 0 0 10px 0;">
            © ${new Date().getFullYear()} Omega Longevity. All rights reserved.
          </p>
          <p style="color: #64748b; font-size: 11px; margin: 0;">
            This email was sent because you enrolled in a transformation program.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  // Inject email tracking
  let trackedHtml = htmlContent;
  try {
    const { createEmailTracking, injectTrackingIntoHtml } = await import('./emailTracking');
    const trackingId = await createEmailTracking({
      enrollmentId: enrollmentId || undefined,
      emailType: 'transformation_payment',
      recipientEmail: to,
      recipientName: clientName,
      subject,
    });
    trackedHtml = injectTrackingIntoHtml(htmlContent, trackingId, baseUrl);
  } catch (trackErr) {
    console.error('[EmailTracking] Failed to inject tracking into payment email:', trackErr);
  }

  if (!transporter) {
    console.log("=== TRANSFORMATION PAYMENT CONFIRMATION (Simulated) ===");
    console.log(`To: ${to}`);
    console.log(`Client: ${clientName}`);
    console.log(`Tier: ${tier}`);
    console.log(`Amount: $${amount}`);
    console.log("=== END EMAIL ===");
    return { success: true, message: `Payment confirmation email simulated` };
  }

  try {
    await transporter.sendMail({
      from: `"Omega Longevity" <${smtpFrom}>`,
      replyTo: "omega@omegalongevity.com",
      to,
      subject,
      html: trackedHtml,
    });
    logEmailSentToHistory({ recipientEmail: to, recipientName: clientName, subject: subject, category: 'payment', notificationType: 'transformation_payment_confirmation', status: 'sent' });

    console.log(`[Email] Transformation payment confirmation sent to ${to}`);
    return { success: true, message: `Payment confirmation email sent` };
  } catch (error) {
    console.error(`Failed to send transformation payment confirmation:`, error);
    return { success: false, message: `Failed to send email: ${error instanceof Error ? error.message : "Unknown error"}` };
  }
}

/**
 * Send admin notification when transformation payment is received
 */
export async function sendTransformationPaymentAdminNotification(params: {
  clientName: string;
  clientEmail: string;
  tier: "elite" | "flagship" | "essentials" | "advanced" | "recovery" | "immunity" | "longevity" | "mitochondria" | "functional_health_elite";
  amount: number;
  paymentMethod: string;
  promoCode?: string;
  discountAmount?: number;
  baseUrl: string;
}): Promise<{ success: boolean; message: string }> {
  const { clientName, clientEmail, tier, amount, paymentMethod, promoCode, discountAmount, baseUrl } = params;

  const transporter = getTransporter();
  const smtpFrom = process.env.SMTP_FROM || "Omega Longevity <noreply@humanedge.health>";
  const { getAdminEmails } = await import('./db');
  const adminEmails = await getAdminEmails();
  if (adminEmails.length === 0) {
    console.log('[TransformationPayment] No admin emails configured (all opted out)');
    return { success: false, message: 'No admin emails configured' };
  }

   const tierNames: Record<string, string> = {
    elite: "Elite Longevity Program ($15,000)",
    flagship: "Weight Loss & Physique ($3,000)",
    essentials: "Protocol Essentials ($1,000)",
    advanced: "Advanced Weight Loss & Physique ($4,500)",
    recovery: "Recovery, Healing & Inflammation ($3,000)",
    immunity: "Immunity & Healing ($3,000)",
    longevity: "Longevity & Bioregulators ($3,000)",
    mitochondria: "Mitochondria Restoration ($3,000)",
    functional_health_elite: "Functional Health Elite ($8,500)",
  };
  const subject = `💰 New Transformation Payment - ${clientName} (${tierNames[tier]})`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f8f9fa;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 30px;">
        <h2 style="color: #1e3a5f; margin: 0 0 20px 0;">🎉 New Transformation Payment Received!</h2>
        
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee; color: #666;">Client:</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">${clientName}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee; color: #666;">Email:</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee;"><a href="mailto:${clientEmail}">${clientEmail}</a></td>
          </tr>
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee; color: #666;">Program:</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">${tierNames[tier]}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee; color: #666;">Amount:</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold; color: #22c55e;">$${amount.toLocaleString('en-US', { timeZone: 'America/Denver' })}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee; color: #666;">Payment Method:</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">${paymentMethod}</td>
          </tr>
          ${promoCode ? `
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee; color: #666;">Promo Code:</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">${promoCode} (-$${discountAmount?.toLocaleString('en-US', { timeZone: 'America/Denver' }) || 0})</td>
          </tr>
          ` : ''}
        </table>
        

        
        <a href="${baseUrl}/admin/transformation-payments" style="display: inline-block; background-color: #1e3a5f; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold;">
          View in Admin Dashboard →
        </a>
      </div>
    </body>
    </html>
  `;

  if (!transporter) {
    console.log("=== ADMIN TRANSFORMATION PAYMENT NOTIFICATION (Simulated) ===");
    console.log(`To: ${adminEmails.join(', ')}`);
    console.log(`Client: ${clientName} (${clientEmail})`);
    console.log(`Tier: ${tier}, Amount: $${amount}`);
    console.log("=== END EMAIL ===");
    return { success: true, message: `Admin notification simulated` };
  }

  try {
    for (const adminEmail of adminEmails) {
      // Auto-inject email tracking
      let _trackedHtml_sendTransformationPaymentAdminNotification = htmlContent;
      try {
        const { createEmailTracking, injectTrackingIntoHtml } = await import('./emailTracking');
        const _baseUrl = process.env.VITE_APP_URL || 'https://www.humanedge.health';
        // @ts-ignore - auto-injected tracking code uses typeof checks for variable detection
        const _tid = await createEmailTracking({ emailType: 'sendTransformationPaymentAdminNotification', recipientEmail: to, recipientName: typeof clientName !== 'undefined' ? clientName : (typeof recipientName !== 'undefined' ? recipientName : (typeof userName !== 'undefined' ? userName : undefined)), subject: typeof subject !== 'undefined' ? subject : 'sendTransformationPaymentAdminNotification' });
        _trackedHtml_sendTransformationPaymentAdminNotification = injectTrackingIntoHtml(htmlContent, _tid, _baseUrl);
      } catch (_e) { /* tracking failed, send without */ }
      await transporter.sendMail({
        from: `"Omega Longevity System" <${smtpFrom}>`,
        to: adminEmail,
        subject,
        html: _trackedHtml_sendTransformationPaymentAdminNotification,
      });
    logEmailSentToHistory({ recipientEmail: adminEmail, recipientName: undefined, subject: subject, category: 'payment', notificationType: 'transformation_payment_admin', status: 'sent' });
    }

    return { success: true, message: `Admin notifications sent` };
  } catch (error) {
    console.error(`Failed to send admin transformation payment notification:`, error);
    return { success: false, message: `Failed to send notification: ${error instanceof Error ? error.message : "Unknown error"}` };
  }
}


/**
 * Send verification email to guest after transformation payment
 * This email contains a magic link to complete account setup
 */
export async function sendGuestEnrollmentVerificationEmail(params: {
  to: string;
  clientName: string;
  tier: "elite" | "flagship" | "essentials" | "advanced" | "recovery" | "immunity" | "longevity" | "mitochondria" | "functional_health_elite";
  authToken: string;
  enrollmentId: number;
  baseUrl: string;
}): Promise<{ success: boolean; message: string }> {
  const { to, clientName, tier, authToken, enrollmentId, baseUrl } = params;

  const transporter = getTransporter();
  const smtpFrom = process.env.SMTP_FROM || "Omega Longevity <noreply@humanedge.health>";

  const tierNames: Record<string, string> = {
    elite: "Elite Longevity Program",
    flagship: "Weight Loss & Physique Program",
    essentials: "Protocol Essentials Program",
    advanced: "Advanced Weight Loss & Physique Program",
    recovery: "Recovery, Healing & Inflammation Program",
    immunity: "Immunity & Healing Program",
    longevity: "Longevity & Bioregulators Program",
    mitochondria: "Mitochondria Restoration Program",
    functional_health_elite: "Functional Health Elite Program",
  };

  // Create the magic link URL
  const verificationUrl = `${baseUrl}/transformation/verify?token=${authToken}&enrollmentId=${enrollmentId}`;

  const subject = `Complete Your Account Setup - ${tierNames[tier]}`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8f9fa;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); padding: 40px 30px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">Complete Your Account</h1>
          <p style="color: #e0e7ee; margin: 10px 0 0 0; font-size: 16px;">One more step to access your program</p>
        </div>
        
        <!-- Main Content -->
        <div style="padding: 40px 30px;">
          <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
            Hi ${clientName},
          </p>
          
          <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
            Thank you for enrolling in the <strong>${tierNames[tier]}</strong>! Your payment has been received and your spot is secured.
          </p>
          
          <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
            To access your program dashboard and complete your intake forms, please click the button below to set up your account:
          </p>
          
          <!-- CTA Button -->
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 18px; font-weight: 600; box-shadow: 0 4px 15px rgba(245, 158, 11, 0.3);">
              Complete Account Setup
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 30px 0 20px 0; text-align: center;">
            Or copy and paste this link into your browser:
          </p>
          <p style="color: #1e3a5f; font-size: 12px; line-height: 1.6; margin: 0 0 30px 0; word-break: break-all; background-color: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center;">
            ${verificationUrl}
          </p>
          
          <!-- What's Next -->
          <div style="background-color: #f0fdf4; border-radius: 12px; padding: 25px; margin-bottom: 30px; border-left: 4px solid #22c55e;">
            <h3 style="color: #166534; margin: 0 0 15px 0; font-size: 18px;">✅ What Happens Next</h3>
            <ol style="color: #666; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
              <li>Click the button above to create your account</li>
              <li>Sign in with Google, Microsoft, or Apple</li>
              <li>Complete your intake forms and health questionnaire</li>
              <li>Your coach will reach out to schedule your first session</li>
            </ol>
          </div>
          
          <!-- Important Note -->
          <div style="background-color: #fff8e6; border-radius: 12px; padding: 20px; margin-bottom: 30px; border-left: 4px solid #f59e0b;">
            <p style="color: #92400e; font-size: 14px; line-height: 1.6; margin: 0;">
              <strong>⏰ Important:</strong> This link will expire in 24 hours. If you need a new link, please contact us at support@omegalongevity.com.
            </p>
          </div>
          
          <!-- Support -->
          <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 0;">
            If you have any questions or need assistance, don't hesitate to reach out to our team. We're here to support you on your transformation journey!
          </p>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #1e3a5f; padding: 30px; text-align: center;">
          <p style="color: #e0e7ee; font-size: 14px; margin: 0 0 10px 0;">
            Omega Longevity - Elite Health Optimization
          </p>
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">
            © ${new Date().getFullYear()} Omega Longevity. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  const textContent = `
Hi ${clientName},

Thank you for enrolling in the ${tierNames[tier]}! Your payment has been received and your spot is secured.

To access your program dashboard and complete your intake forms, please visit:
${verificationUrl}

WHAT HAPPENS NEXT:
1. Click the link above to create your account
2. Sign in with Google, Microsoft, or Apple
3. Complete your intake forms and health questionnaire
4. Your coach will reach out to schedule your first session

IMPORTANT: This link will expire in 24 hours. If you need a new link, please contact us at support@omegalongevity.com.

If you have any questions or need assistance, don't hesitate to reach out to our team.

Best regards,
The Omega Longevity Team
  `;

  if (!transporter) {
    console.log("=== GUEST ENROLLMENT VERIFICATION EMAIL (Simulated) ===");
    console.log(`To: ${to}`);
    console.log(`Client: ${clientName}`);
    console.log(`Tier: ${tier}`);
    console.log(`Verification URL: ${verificationUrl}`);
    console.log("=== END EMAIL ===");
    return { success: true, message: `Verification email simulated` };
  }

  try {
    // Auto-inject email tracking
    let _trackedHtml_sendGuestEnrollmentVerificationEmail = htmlContent;
    try {
      const { createEmailTracking, injectTrackingIntoHtml } = await import('./emailTracking');
      const _baseUrl = process.env.VITE_APP_URL || 'https://www.humanedge.health';
      // @ts-ignore - auto-injected tracking code uses typeof checks for variable detection
      const _tid = await createEmailTracking({ emailType: 'sendGuestEnrollmentVerificationEmail', recipientEmail: to, recipientName: typeof clientName !== 'undefined' ? clientName : (typeof recipientName !== 'undefined' ? recipientName : (typeof userName !== 'undefined' ? userName : undefined)), subject: typeof subject !== 'undefined' ? subject : 'sendGuestEnrollmentVerificationEmail' });
      _trackedHtml_sendGuestEnrollmentVerificationEmail = injectTrackingIntoHtml(htmlContent, _tid, _baseUrl);
    } catch (_e) { /* tracking failed, send without */ }
    await transporter.sendMail({
      from: smtpFrom,
      to,
      subject,
      html: _trackedHtml_sendGuestEnrollmentVerificationEmail,
      text: textContent,
    });
    logEmailSentToHistory({ recipientEmail: to, recipientName: undefined, subject: subject, category: 'welcome', notificationType: 'guest_enrollment_verification', status: 'sent' });

    console.log(`[Email] Guest enrollment verification sent to ${to}`);
    return { success: true, message: `Verification email sent to ${to}` };
  } catch (error) {
    console.error(`Failed to send guest enrollment verification email:`, error);
    return { success: false, message: `Failed to send verification email: ${error instanceof Error ? error.message : "Unknown error"}` };
  }
}


// Send welcome email to new client when admin creates their protocol
export async function sendNewClientWelcomeEmail(params: {
  to: string;
  clientName: string;
  protocolUrl: string;
  launchpadUrl: string;
  setPasswordUrl?: string;
}): Promise<{ success: boolean; message: string }> {
  const { to, clientName, protocolUrl, launchpadUrl } = params;

  // Check if this notification type is enabled
  const enabled = await isNotificationEnabled('new_client_welcome');
  if (!enabled) {
    console.log('[Email] New client welcome notification is disabled');
    return { success: true, message: 'Notification disabled' };
  }

  const transporter = getTransporter();
  const smtpFrom = process.env.SMTP_FROM || "Omega Longevity <noreply@humanedge.health>";
  const baseUrl = process.env.VITE_APP_URL || 'https://www.humanedge.health';

  const subject = "Welcome to Omega Longevity - Your Protocol is Ready!";

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0f172a;">
      <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <!-- Header with Logo -->
        <div style="text-align: center; margin-bottom: 30px;">
          <div style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 30px; border-radius: 16px 16px 0 0;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">
              🎉 Welcome to Omega Longevity!
            </h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">
              Your health optimization journey begins now
            </p>
          </div>
        </div>

        <!-- Main Content -->
        <div style="background-color: #1e293b; border-radius: 0 0 16px 16px; padding: 30px; color: #e2e8f0;">
          <p style="font-size: 18px; margin-bottom: 20px;">
            Hi ${clientName},
          </p>
          
          <p style="font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
            Great news! Your personalized health protocol has been created and is ready for you to review.
          </p>

          <!-- Protocol Ready Section -->
          <div style="background: linear-gradient(135deg, #065f46 0%, #047857 100%); border-radius: 12px; padding: 25px; margin-bottom: 25px; text-align: center;">
            <h3 style="color: #ffffff; margin: 0 0 15px 0; font-size: 18px;">✨ Your Protocol is Ready</h3>
            <p style="color: rgba(255,255,255,0.9); margin: 0 0 20px 0; font-size: 14px;">
              Click below to view your customized health optimization protocol
            </p>
            <a href="${protocolUrl}" style="display: inline-block; background-color: #ffffff; color: #047857; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 15px;">
              View Your Protocol
            </a>
          </div>

          <!-- How to Sign In Section -->
          <div style="background: linear-gradient(135deg, #1e40af 0%, #1d4ed8 100%); border-radius: 12px; padding: 25px; margin-bottom: 25px;">
            <h3 style="color: #ffffff; margin: 0 0 15px 0; font-size: 18px;">🔐 How to Sign In</h3>
            <p style="color: rgba(255,255,255,0.9); margin: 0 0 15px 0; font-size: 14px;">
              For the best experience, sign in using one of these options:
            </p>
            
            <div style="background-color: rgba(255,255,255,0.1); border-radius: 8px; padding: 15px; margin-bottom: 10px;">
              <p style="color: #ffffff; margin: 0; font-size: 14px;">
                <strong style="color: #fbbf24;">📧 Gmail Users:</strong> Click "Continue with Google"
              </p>
            </div>
            
            <div style="background-color: rgba(255,255,255,0.1); border-radius: 8px; padding: 15px; margin-bottom: 10px;">
              <p style="color: #ffffff; margin: 0; font-size: 14px;">
                <strong style="color: #fbbf24;">🍎 Apple/iCloud Users:</strong> Click "Continue with Apple"
              </p>
            </div>
            
            <div style="background-color: rgba(255,255,255,0.1); border-radius: 8px; padding: 15px;">
              <p style="color: #ffffff; margin: 0; font-size: 14px;">
                <strong style="color: #fbbf24;">📬 Outlook/Hotmail Users:</strong> Click "Continue with Microsoft"
              </p>
            </div>
            
            <p style="color: rgba(255,255,255,0.7); margin: 15px 0 0 0; font-size: 12px; font-style: italic;">
              💡 Tip: Use the sign-in option that matches your email provider for instant access!
            </p>
          </div>

          <!-- Alternative Login (Last Resort) -->
          <div style="background-color: #0f172a; border-radius: 12px; padding: 20px; margin-bottom: 25px; border: 1px solid #334155;">
            <h4 style="color: #94a3b8; margin: 0 0 10px 0; font-size: 14px;">Don't have Gmail, Apple, or Microsoft?</h4>
            <p style="color: #64748b; margin: 0; font-size: 13px; line-height: 1.5;">
              If your email isn't with one of the major providers above, you can still sign in by entering your email address and clicking "Continue". A login link will be sent to your inbox. 
              <strong style="color: #94a3b8;">Note:</strong> This method may take a few minutes and the email could land in your spam folder.
            </p>
          </div>

          <!-- What's Next Section -->
          <div style="background-color: #0f172a; border-radius: 12px; padding: 20px; margin-bottom: 25px;">
            <h3 style="color: #f97316; margin: 0 0 15px 0; font-size: 16px;">What's Next?</h3>
            
            <div style="margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid #334155;">
              <span style="color: #f97316; font-weight: bold;">1.</span>
              <span style="color: #f1f5f9; font-weight: 600; margin-left: 10px;">Review Your Protocol</span>
              <p style="color: #94a3b8; margin: 5px 0 0 25px; font-size: 13px;">Take a look at your personalized recommendations</p>
            </div>
            
            <div style="margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid #334155;">
              <span style="color: #f97316; font-weight: bold;">2.</span>
              <span style="color: #f1f5f9; font-weight: 600; margin-left: 10px;">Approve When Ready</span>
              <p style="color: #94a3b8; margin: 5px 0 0 25px; font-size: 13px;">Once you've reviewed, approve to get started</p>
            </div>
            
            <div>
              <span style="color: #f97316; font-weight: bold;">3.</span>
              <span style="color: #f1f5f9; font-weight: 600; margin-left: 10px;">Explore the Launchpad</span>
              <p style="color: #94a3b8; margin: 5px 0 0 25px; font-size: 13px;">Access all your resources in one place</p>
            </div>
          </div>

          <!-- Launchpad CTA -->
          <div style="text-align: center; margin: 30px 0;">
            <p style="color: #94a3b8; margin-bottom: 15px; font-size: 14px;">
              Access your dashboard, store, and more:
            </p>
            <a href="${launchpadUrl}" style="display: inline-block; background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 15px;">
              Go to Launchpad
            </a>
          </div>

          <!-- Support -->
          <div style="text-align: center; padding-top: 20px; border-top: 1px solid #334155;">
            <p style="color: #94a3b8; margin: 0; font-size: 13px;">
              Questions? Contact us at <a href="mailto:omega@omegalongevity.com" style="color: #f97316;">omega@omegalongevity.com</a>
            </p>
          </div>
        </div>

        <!-- Footer -->
        <div style="text-align: center; margin-top: 30px; color: #64748b; font-size: 12px;">
          <p style="margin: 0;">
            © ${new Date().getFullYear()} Omega Longevity. All rights reserved.
          </p>
          <p style="margin: 10px 0 0 0;">
            Elite Level Health Optimization
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  if (!transporter) {
    console.log("[Email] Simulated new client welcome email to:", to);
    console.log("[Email] Subject:", subject);
    return { success: true, message: `Welcome email simulated` };
  }

  try {
    // Auto-inject email tracking
    let _trackedHtml_sendNewClientWelcomeEmail = htmlContent;
    try {
      const { createEmailTracking, injectTrackingIntoHtml } = await import('./emailTracking');
      const _baseUrl = process.env.VITE_APP_URL || 'https://www.humanedge.health';
      // @ts-ignore - auto-injected tracking code uses typeof checks for variable detection
      const _tid = await createEmailTracking({ emailType: 'sendNewClientWelcomeEmail', recipientEmail: to, recipientName: typeof clientName !== 'undefined' ? clientName : (typeof recipientName !== 'undefined' ? recipientName : (typeof userName !== 'undefined' ? userName : undefined)), subject: typeof subject !== 'undefined' ? subject : 'sendNewClientWelcomeEmail' });
      _trackedHtml_sendNewClientWelcomeEmail = injectTrackingIntoHtml(htmlContent, _tid, _baseUrl);
    } catch (_e) { /* tracking failed, send without */ }
    await transporter.sendMail({
      from: smtpFrom,
      to,
      subject,
      html: _trackedHtml_sendNewClientWelcomeEmail,
    });
    logEmailSentToHistory({ recipientEmail: to, recipientName: clientName, subject: subject, category: 'welcome', notificationType: 'new_client_welcome', status: 'sent' });

    console.log(`[Email] New client welcome email sent to ${to}`);
    return { success: true, message: `Welcome email sent to ${to}` };
  } catch (error) {
    console.error(`Failed to send new client welcome email:`, error);
    return { success: false, message: `Failed to send welcome email: ${error instanceof Error ? error.message : "Unknown error"}` };
  }
}


/**
 * Send a dedicated "Complete Your Intake Form" email to a client after payment.
 * This provides a direct, prominent call-to-action to complete the intake form,
 * rather than burying it as a sub-step in a verification or milestone email.
 */
export async function sendIntakeFormEmail(params: {
  to: string;
  clientName: string;
  tier: string;
  enrollmentId: number;
  baseUrl: string;
  authToken?: string;
}): Promise<{ success: boolean; message: string }> {
  const { to, clientName, tier, enrollmentId, baseUrl, authToken } = params;

  // Check if milestone notifications are enabled (reuse same toggle)
  const isEnabled = await isNotificationEnabled('transformation_milestone');
  if (!isEnabled) {
    console.log(`[Email] Transformation milestone notifications disabled, skipping intake form email to ${to}`);
    return { success: true, message: 'Milestone notifications disabled' };
  }

  const transporter = getTransporter();
  const smtpFrom = process.env.SMTP_FROM || "noreply@humanedge.health";
  const supportEmail = "omega@omegalongevity.com";

  const tierNames: Record<string, string> = {
    elite: "Elite Longevity Program",
    flagship: "Weight Loss & Physique Program",
    essentials: "Protocol Essentials Program",
    advanced: "Advanced Weight Loss & Physique Program",
    recovery: "Recovery, Healing & Inflammation Program",
    immunity: "Immunity & Healing Program",
    longevity: "Longevity & Bioregulators Program",
    mitochondria: "Mitochondria Restoration Program",
    functional_health_elite: "Functional Health Elite Program",
  };

  // Build the intake form URL - if authToken is available, use magic link; otherwise use dashboard
  let intakeFormUrl: string;
  if (authToken) {
    intakeFormUrl = `${baseUrl}/transformation/verify?token=${authToken}&enrollmentId=${enrollmentId}&autoIntake=true`;
  } else {
    intakeFormUrl = `${baseUrl}/intake?enrollmentId=${enrollmentId}&openIntake=true`;
  }

  const subject = `📋 Action Required: Complete Your Intake Form - ${tierNames[tier] || 'Transformation Program'}`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc;">
      <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <!-- Header with Logo -->
        <!-- Main Content Card -->
        <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 16px; padding: 40px; color: #e2e8f0;">
          <!-- Icon -->
          <div style="text-align: center; margin-bottom: 25px;">
            <span style="font-size: 48px;">📋</span>
          </div>

          <h1 style="color: #f97316; text-align: center; margin: 0 0 20px 0; font-size: 26px; font-weight: 700;">
            Your Next Step: Complete Your Intake Form
          </h1>

          <p style="font-size: 16px; margin-bottom: 20px;">
            Hi <strong style="color: #f97316;">${clientName}</strong>,
          </p>
          
          <p style="font-size: 15px; line-height: 1.6; margin-bottom: 15px;">
            Your payment for the <strong style="color: #22c55e;">${tierNames[tier] || 'Transformation Program'}</strong> has been confirmed — thank you!
          </p>

          <p style="font-size: 15px; line-height: 1.6; margin-bottom: 25px;">
            Before we can schedule your strategy session, we need you to complete your intake form. This helps us understand your health history, goals, and any specific needs so we can prepare a personalized plan for you.
          </p>

          <!-- Prominent CTA -->
          <div style="text-align: center; margin: 30px 0;">
            <a href="${intakeFormUrl}" style="display: inline-block; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: #ffffff; text-decoration: none; padding: 18px 48px; border-radius: 10px; font-size: 18px; font-weight: 700; box-shadow: 0 4px 15px rgba(34, 197, 94, 0.3);">
              Complete Intake Form Now
            </a>
          </div>

          <!-- What the form covers -->
          <div style="background-color: #0f172a; border-radius: 12px; padding: 20px; margin-bottom: 25px; border-left: 4px solid #f97316;">
            <h3 style="color: #f97316; margin: 0 0 15px 0; font-size: 16px;">What the Intake Form Covers</h3>
            <ul style="margin: 0; padding-left: 20px; color: #94a3b8; font-size: 14px; line-height: 2;">
              <li>Personal health history and current conditions</li>
              <li>Your goals and what you want to achieve</li>
              <li>Current medications and supplements</li>
              <li>Lifestyle and activity level</li>
              <li>Required waivers and agreements</li>
            </ul>
          </div>

          <!-- Time estimate -->
          <div style="background-color: #0f172a; border-radius: 12px; padding: 20px; margin-bottom: 25px; border-left: 4px solid #22c55e;">
            <h3 style="color: #22c55e; margin: 0 0 10px 0; font-size: 16px;">⏱️ Takes About 10-15 Minutes</h3>
            <p style="margin: 0; color: #94a3b8; font-size: 14px; line-height: 1.5;">
              Your progress is auto-saved, so you can come back and finish later if needed. The more detail you provide, the better we can tailor your program.
            </p>
          </div>

          <!-- What happens next -->
          <div style="background-color: #0f172a; border-radius: 12px; padding: 20px; text-align: center;">
            <p style="margin: 0; color: #94a3b8; font-size: 14px; line-height: 1.6;">
              <strong style="color: #f1f5f9;">After you submit:</strong> Your coach will review your information and you'll be prompted to schedule your strategy session.
            </p>
          </div>
        </div>

        <!-- Second CTA (below the card) -->
        <div style="text-align: center; margin-top: 25px;">
          <a href="${intakeFormUrl}" style="color: #f97316; font-size: 15px; font-weight: 600; text-decoration: underline;">
            Click here to complete your intake form →
          </a>
        </div>

        <!-- Footer -->
        <div style="text-align: center; margin-top: 30px; color: #64748b; font-size: 13px;">
          <p style="margin: 0 0 10px 0;">
            <strong style="color: #f97316;">Omega Longevity</strong><br>
            Elite Level Health Optimization
          </p>
          <p style="margin: 0 0 10px 0;">
            Questions? Contact us at <a href="mailto:${supportEmail}" style="color: #f97316;">${supportEmail}</a>
          </p>
          <p style="margin: 0;">
            This is an automated notification. Please do not reply directly.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  // Inject email tracking
  let trackedHtml = htmlContent;
  let trackingId: string | null = null;
  try {
    const { createEmailTracking, injectTrackingIntoHtml } = await import('./emailTracking');
    trackingId = await createEmailTracking({
      enrollmentId,
      emailType: 'transformation_intake_form',
      recipientEmail: to,
      recipientName: clientName,
      subject,
    });
    trackedHtml = injectTrackingIntoHtml(htmlContent, trackingId, baseUrl);
  } catch (trackErr) {
    console.error('[EmailTracking] Failed to inject tracking into intake form email:', trackErr);
  }

  if (!transporter) {
    console.log("=== INTAKE FORM EMAIL (Simulated) ===");
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Client: ${clientName}`);
    console.log(`Enrollment: ${enrollmentId}`);
    console.log(`IntakeFormUrl: ${intakeFormUrl}`);
    console.log(`TrackingId: ${trackingId}`);
    console.log("=== END EMAIL ===");
    return { success: true, message: `Intake form email simulated (SMTP not configured)` };
  }

  try {
    await transporter.sendMail({
      from: `"Omega Longevity" <${smtpFrom}>`,
      replyTo: supportEmail,
      to,
      subject,
      html: trackedHtml,
    });
    logEmailSentToHistory({ recipientEmail: to, recipientName: clientName, subject: subject, category: 'other', notificationType: 'intake_form_email', status: 'sent' });

    console.log(`[Email] Intake form email sent to ${to} for enrollment ${enrollmentId}`);
    return { success: true, message: `Intake form email sent to ${to}` };
  } catch (error) {
    console.error(`Failed to send intake form email:`, error);
    return { success: false, message: `Failed to send email: ${error instanceof Error ? error.message : "Unknown error"}` };
  }
}


/**
 * Centralized helper to log any email send to the notification history table.
 * This is fire-and-forget — failures are logged but never block email delivery.
 */
export function logEmailSentToHistory(data: {
  recipientEmail: string;
  recipientName?: string;
  subject: string;
  category: 'checkin' | 'protocol' | 'payment' | 'shipping' | 'inventory' | 'document' | 'welcome' | 'announcement' | 'digest' | 'other';
  notificationType: string;
  clientProtocolId?: number | null;
  userId?: number;
  triggeredBy?: 'system' | 'cron' | 'admin' | 'webhook';
  triggeredByUserId?: number;
  status?: 'sent' | 'failed' | 'pending' | 'bounced';
  errorMessage?: string;
  previewText?: string;
  trackingId?: string;
}) {
  // Fire and forget - don't await, don't block
  logNotification({
    recipientEmail: data.recipientEmail,
    recipientName: data.recipientName,
    subject: data.subject,
    category: data.category,
    notificationType: data.notificationType,
    clientProtocolId: data.clientProtocolId ?? undefined,
    userId: data.userId,
    triggeredBy: data.triggeredBy || 'system',
    triggeredByUserId: data.triggeredByUserId,
    status: data.status || 'sent',
    errorMessage: data.errorMessage,
    previewText: data.previewText,
    trackingId: data.trackingId,
  }).catch(err => {
    console.error('[EmailService] Failed to log email to history:', err?.message || err);
  });
}

/**
 * Send an email with automatic open/click tracking.
 * Creates a tracking record, injects tracking pixel + link wrapping,
 * sends via transporter, and logs to notification history.
 */
export async function sendTrackedEmail(params: {
  to: string;
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
  recipientName?: string;
  category: 'checkin' | 'protocol' | 'payment' | 'shipping' | 'inventory' | 'document' | 'welcome' | 'announcement' | 'digest' | 'other';
  notificationType: string;
  emailType: string;
  clientProtocolId?: number | null;
  userId?: number;
  triggeredBy?: 'system' | 'cron' | 'admin' | 'webhook';
}): Promise<{ success: boolean; message: string; trackingId?: string }> {
  const transporter = getTransporter();
  const smtpFrom = process.env.SMTP_FROM || 'Omega Longevity <noreply@humanedge.health>';
  const baseUrl = process.env.VITE_APP_URL || 'https://www.humanedge.health';

  if (!transporter) {
    console.log(`[Email] Simulated tracked email to: ${params.to}, Subject: ${params.subject}`);
    return { success: true, message: 'Email simulated (SMTP not configured)' };
  }

  let trackingId: string | undefined;
  let trackedHtml = params.html;

  try {
    // Create tracking record and inject pixel/links
    const { createEmailTracking, injectTrackingIntoHtml } = await import('./emailTracking');
    trackingId = await createEmailTracking({
      clientProtocolId: params.clientProtocolId ?? undefined,
      userId: params.userId,
      emailType: params.emailType,
      recipientEmail: params.to,
      recipientName: params.recipientName,
      subject: params.subject,
    });
    trackedHtml = injectTrackingIntoHtml(params.html, trackingId, baseUrl);
  } catch (trackErr) {
    console.error('[EmailService] Failed to create tracking, sending without tracking:', trackErr);
  }

  try {
    await transporter.sendMail({
      from: params.from || `"Omega Longevity" <${smtpFrom}>`,
      replyTo: params.replyTo || 'omega@omegalongevity.com',
      to: params.to,
      subject: params.subject,
      html: trackedHtml,
    });

    logEmailSentToHistory({
      recipientEmail: params.to,
      recipientName: params.recipientName,
      subject: params.subject,
      category: params.category,
      notificationType: params.notificationType,
      clientProtocolId: params.clientProtocolId,
      userId: params.userId,
      triggeredBy: params.triggeredBy || 'system',
      status: 'sent',
      trackingId,
    });

    return { success: true, message: `Email sent to ${params.to}`, trackingId };
  } catch (error) {
    console.error(`[EmailService] Failed to send tracked email to ${params.to}:`, error);

    logEmailSentToHistory({
      recipientEmail: params.to,
      recipientName: params.recipientName,
      subject: params.subject,
      category: params.category,
      notificationType: params.notificationType,
      clientProtocolId: params.clientProtocolId,
      userId: params.userId,
      triggeredBy: params.triggeredBy || 'system',
      status: 'failed',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      trackingId,
    });

    return { success: false, message: `Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

// ============ CHAT MESSAGE EMAIL NOTIFICATIONS ============

/**
 * Send email notification to a client when their coach sends them a new message.
 */
export async function sendNewMessageEmailToClient(params: {
  to: string;
  clientName: string;
  coachName: string;
  messagePreview: string;
  protocolUrl: string;
  clientUserId?: number; // If client has a user account, check their per-user preferences
  clientProtocolId?: number; // Protocol ID for email reply threading
}): Promise<{ success: boolean; message: string }> {
  const { to, clientName, coachName, messagePreview, protocolUrl, clientUserId, clientProtocolId } = params;

  // Check global site-wide setting first
  const enabled = await isNotificationEnabled('new_message_email');
  if (!enabled) {
    console.log('[Email] New message email to client disabled via site settings');
    return { success: true, message: 'Notification disabled' };
  }

  // Check per-user preference if client has a user account
  if (clientUserId) {
    const { isUserEmailNotificationEnabled } = await import('./db');
    const userEnabled = await isUserEmailNotificationEnabled(clientUserId, 'new_message');
    if (!userEnabled) {
      console.log(`[Email] New message email to client ${to} disabled via per-user preference`);
      return { success: true, message: 'User opted out of message notifications' };
    }
  }

  const transporter = getTransporter();
  const smtpFrom = process.env.SMTP_FROM || "noreply@humanedge.health";
  const chatUrl = protocolUrl.includes('?') ? protocolUrl : `${protocolUrl}?tab=chat`;

  // Generate reply token for email reply bridge
  let replyToken = '';
  if (clientProtocolId) {
    const { generateReplyToken } = await import('./emailReplyBridge');
    replyToken = ' ' + generateReplyToken(clientProtocolId);
  }

  const truncatedPreview = messagePreview.length > 300 ? messagePreview.substring(0, 300) + '...' : messagePreview;

  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #1e40af; margin-bottom: 5px;">Omega Longevity</h1>
        <p style="color: #6b7280; font-size: 14px;">Elite Level Health Optimization</p>
      </div>
      <p style="font-size: 16px; color: #374151;">Hi ${clientName},</p>
      <p style="font-size: 14px; color: #374151; line-height: 1.6;">
        You have a new message from <strong>${coachName}</strong> on your health protocol.
      </p>
      <div style="background-color: #f9fafb; border-left: 4px solid #ea580c; padding: 16px; margin: 20px 0; border-radius: 4px;">
        <p style="font-size: 14px; color: #374151; margin: 0; font-style: italic;">
          "${truncatedPreview}"
        </p>
      </div>
      ${clientProtocolId ? `
      <div style="background-color: #f0f9ff; border: 1px solid #bae6fd; padding: 14px 16px; margin: 20px 0; border-radius: 8px; text-align: center;">
        <p style="font-size: 14px; color: #0369a1; margin: 0; font-weight: 600;">&#x1F4AC; Reply directly to this email</p>
        <p style="font-size: 13px; color: #0284c7; margin: 6px 0 0 0;">Your response will appear in your protocol chat automatically.</p>
      </div>
      ` : ''}
      <div style="text-align: center; margin: 30px 0;">
        <a href="${chatUrl}" style="display: inline-block; background-color: #ea580c; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">View Full Conversation</a>
      </div>
      <p style="font-size: 13px; color: #6b7280; line-height: 1.6; text-align: center;">You can also reply from your protocol page or simply reply to this email.</p>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
      <p style="font-size: 12px; color: #9ca3af; text-align: center;">This email was sent by Omega Longevity.</p>
    </div>
  `;

  if (!transporter) {
    console.log(`=== SIMULATED EMAIL (New Message to Client) === To: ${to}, Subject: New message from ${coachName}`);
    return { success: true, message: 'Email simulated (SMTP not configured)' };
  }

  try {
    let trackedHtml = emailHtml;
    try {
      const { createEmailTracking, injectTrackingIntoHtml } = await import('./emailTracking');
      const baseUrl = process.env.VITE_APP_URL || 'https://www.humanedge.health';
      const tid = await createEmailTracking({ emailType: 'new_message_to_client', recipientEmail: to, recipientName: clientName, subject: `New message from ${coachName}` });
      trackedHtml = injectTrackingIntoHtml(emailHtml, tid, baseUrl);
    } catch (_e) { /* tracking failed, send without */ }

    await transporter.sendMail({
      from: `"Omega Longevity" <${smtpFrom}>`,
      replyTo: process.env.GMAIL_IMAP_USER || 'omega@omegalongevity.com',
      to,
      subject: `New message from ${coachName} - Omega Longevity${replyToken}`,
      html: trackedHtml,
    });
    logEmailSentToHistory({ recipientEmail: to, recipientName: clientName, subject: `New message from ${coachName}`, category: 'other', notificationType: 'new_message_to_client', status: 'sent' });
    console.log(`[Email] New message notification sent to client ${to}`);
    return { success: true, message: 'Message notification sent to client' };
  } catch (error) {
    console.error('[Email] Failed to send new message notification to client:', error);
    return { success: false, message: `Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

/**
 * Send email notification to admins when a client sends a new message/comment.
 */
export async function sendNewMessageEmailToAdmins(params: {
  clientName: string;
  clientEmail: string;
  messagePreview: string;
  protocolId: number;
}): Promise<{ success: boolean; message: string }> {
  const { clientName, clientEmail, messagePreview, protocolId } = params;

  const enabled = await isNotificationEnabled('new_message_email');
  if (!enabled) {
    console.log('[Email] New message email to admins disabled via settings');
    return { success: true, message: 'Notification disabled' };
  }

  // Use per-user filtered admin emails - only admins who have 'new_message' enabled
  const { getAdminEmailsForNotificationType } = await import('./db');
  const adminEmails = await getAdminEmailsForNotificationType('new_message');
  if (adminEmails.length === 0) {
    console.warn('[Email] No admin emails found for new message notification (all opted out or none configured)');
    return { success: false, message: 'No admin emails configured' };
  }

  const transporter = getTransporter();
  const smtpFrom = process.env.SMTP_FROM || "noreply@humanedge.health";
  const baseUrl = process.env.VITE_APP_URL || 'https://www.humanedge.health';
  const protocolEditUrl = `${baseUrl}/admin/clients/${protocolId}?tab=comments`;
  const subject = `New message from ${clientName || 'Client'} on their protocol`;

  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #1e40af; margin-bottom: 5px;">Omega Longevity</h1>
        <p style="color: #6b7280; font-size: 14px;">Admin Notification</p>
      </div>
      <h2 style="color: #1e3a5f; font-size: 18px; margin-bottom: 16px;">New Client Message</h2>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <tr><td style="padding: 8px 12px; font-size: 14px; color: #6b7280; width: 100px;">Client:</td><td style="padding: 8px 12px; font-size: 14px; color: #374151; font-weight: bold;">${clientName || 'Unknown'}</td></tr>
        <tr><td style="padding: 8px 12px; font-size: 14px; color: #6b7280;">Email:</td><td style="padding: 8px 12px; font-size: 14px; color: #374151;">${clientEmail || 'N/A'}</td></tr>
      </table>
      <div style="background-color: #f9fafb; border-left: 4px solid #3b82f6; padding: 16px; margin: 20px 0; border-radius: 4px;">
        <p style="font-size: 13px; color: #6b7280; margin: 0 0 8px 0; font-weight: bold;">Message:</p>
        <p style="font-size: 14px; color: #374151; margin: 0; line-height: 1.6;">"${messagePreview.length > 500 ? messagePreview.substring(0, 500) + '...' : messagePreview}"</p>
      </div>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${protocolEditUrl}" style="display: inline-block; background-color: #1e40af; color: white; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px;">View Protocol & Reply</a>
      </div>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
      <p style="font-size: 12px; color: #9ca3af; text-align: center;">Admin notification from Omega Longevity Protocol Manager.</p>
    </div>
  `;

  if (!transporter) {
    console.log(`=== SIMULATED EMAIL (New Message to Admins) === To: ${adminEmails.join(', ')}, Client: ${clientName}`);
    return { success: true, message: 'Email simulated (SMTP not configured)' };
  }

  try {
    let trackedHtml = emailHtml;
    try {
      const { createEmailTracking, injectTrackingIntoHtml } = await import('./emailTracking');
      const tid = await createEmailTracking({ emailType: 'new_message_to_admin', recipientEmail: adminEmails[0], recipientName: 'Admin', subject });
      trackedHtml = injectTrackingIntoHtml(emailHtml, tid, baseUrl);
    } catch (_e) { /* tracking failed, send without */ }

    await transporter.sendMail({
      from: `"Omega Longevity" <${smtpFrom}>`,
      replyTo: 'omega@omegalongevity.com',
      to: adminEmails.join(', '),
      subject,
      html: trackedHtml,
    });
    logEmailSentToHistory({ recipientEmail: adminEmails.join(', '), recipientName: clientName, subject, category: 'other', notificationType: 'new_message_to_admin', status: 'sent' });
    console.log(`[Email] New message notification sent to admins: ${adminEmails.join(', ')}`);
    return { success: true, message: `Notification sent to ${adminEmails.length} admin(s)` };
  } catch (error) {
    console.error('[Email] Failed to send new message notification to admins:', error);
    return { success: false, message: `Failed to send notification: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}


// ============ CHECKOUT CONFIRMATION EMAIL ============

/**
 * Send checkout confirmation email after a client completes the transformation checkout flow.
 * Includes purchase summary, next steps, program roadmap, and strategy session link.
 */
export async function sendCheckoutConfirmationEmail(params: {
  to: string;
  clientName: string;
  planKey: string;
  planName: string;
  planPrice: number;
  paymentMethod: 'stripe' | 'paypal' | 'venmo' | 'manual' | 'other';
  intakeCompleted: boolean;
  discoveryScheduled: boolean;
  discoveryCalendlyUrl?: string;
  enrollmentId?: number;
  userId?: number;
}): Promise<{ success: boolean; message: string }> {
  try {
    const { generateCheckoutConfirmationHTML, getCheckoutConfirmationSubject } = await import('./emailTemplates/checkoutConfirmation');
    
    const data = {
      clientName: params.clientName,
      clientEmail: params.to,
      planKey: params.planKey as any,
      planName: params.planName,
      planPrice: params.planPrice,
      paymentMethod: params.paymentMethod,
      intakeCompleted: params.intakeCompleted,
      discoveryScheduled: params.discoveryScheduled,
      discoveryCalendlyUrl: params.discoveryCalendlyUrl,
      enrollmentId: params.enrollmentId,
    };

    const html = generateCheckoutConfirmationHTML(data);
    const subject = getCheckoutConfirmationSubject(data);

    const result = await sendTrackedEmail({
      to: params.to,
      subject,
      html,
      recipientName: params.clientName,
      category: 'welcome',
      notificationType: 'checkout_confirmation',
      emailType: 'checkout_confirmation',
      userId: params.userId,
      triggeredBy: 'system',
    });

    if (result.success) {
      console.log(`[Email] Checkout confirmation sent to ${params.to} for plan ${params.planKey}`);
    }

    return result;
  } catch (error) {
    console.error(`[Email] Failed to send checkout confirmation to ${params.to}:`, error);
    return { success: false, message: `Failed to send checkout confirmation: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}



/**
 * Send onboarding welcome email to client after coaching fee payment.
 * Includes Omega Elite signup instructions with promo code,
 * Peptide Pro app info with "WAIT for account" instructions,
 * and app download links.
 */
export async function sendOnboardingWelcomeEmail(params: {
  to: string;
  clientName: string;
  programName: string;
  tier: string;
  communityCode: string;
  communityAccessMonths: number;
  omegaEliteSignupUrl: string;
  peptideProSignupUrl: string;
  appStoreApple: string;
  appStoreGoogle: string;
  baseUrl?: string;
}): Promise<{ success: boolean; message: string }> {
  const {
    to, clientName, programName, tier, communityCode,
    communityAccessMonths, omegaEliteSignupUrl, peptideProSignupUrl,
    appStoreApple, appStoreGoogle,
  } = params;
  const siteUrl = params.baseUrl || process.env.VITE_APP_URL || 'https://www.humanedge.health';

  const transporter = getTransporter();
  const smtpFrom = process.env.SMTP_FROM || "Omega Longevity <noreply@humanedge.health>";

  const subject = `Welcome to ${programName} — Here's What to Do Next`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8f9fa;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); padding: 40px 30px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 600;">Welcome to ${programName}!</h1>
          <p style="color: #e0e7ee; margin: 10px 0 0 0; font-size: 15px;">Your onboarding is underway — here's what to do next</p>
        </div>

        <!-- Main Content -->
        <div style="padding: 35px 30px;">
          <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
            Hi ${clientName},
          </p>
          <p style="color: #333; font-size: 15px; line-height: 1.6; margin: 0 0 25px 0;">
            Your coaching fee has been confirmed and your program is being set up. While your coach builds your personalized protocol, there are two important things for you to do right now.
          </p>

          <!-- STEP 1: Omega Elite Community -->
          <div style="background-color: #f0f9ff; border-radius: 12px; padding: 25px; margin-bottom: 25px; border-left: 4px solid #0284c7;">
            <h3 style="color: #0369a1; margin: 0 0 12px 0; font-size: 18px;">Step 1: Join the Omega Elite Community</h3>
            <p style="color: #555; font-size: 14px; line-height: 1.6; margin: 0 0 12px 0;">
              Your program includes <strong>${communityAccessMonths} months</strong> of access to the Omega Elite community — a private group of people on the same journey, plus direct access to your coaching team.
            </p>
            <p style="color: #555; font-size: 14px; line-height: 1.6; margin: 0 0 15px 0;">
              Use the promo code below when signing up:
            </p>
            <div style="background-color: #ffffff; border: 2px dashed #0284c7; border-radius: 8px; padding: 12px; text-align: center; margin-bottom: 15px;">
              <span style="font-size: 20px; font-weight: 700; color: #0369a1; letter-spacing: 2px;">${communityCode}</span>
            </div>
            <div style="text-align: center;">
              <a href="${omegaEliteSignupUrl}" style="display: inline-block; background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 15px;">
                Sign Up for Omega Elite →
              </a>
            </div>
          </div>

          <!-- STEP 2: Peptide Pro — WAIT -->
          <div style="background-color: #fff8e6; border-radius: 12px; padding: 25px; margin-bottom: 25px; border-left: 4px solid #f59e0b;">
            <h3 style="color: #92400e; margin: 0 0 12px 0; font-size: 18px;">Step 2: Peptide Pro App — Please Wait</h3>
            <p style="color: #555; font-size: 14px; line-height: 1.6; margin: 0 0 12px 0;">
              You'll be using the <strong>Peptide Pro app</strong> to track your daily protocol once it's ready. However, <strong>your account needs to be created by our team first</strong>.
            </p>
            <div style="background-color: #fef3c7; border-radius: 8px; padding: 15px; margin-bottom: 12px;">
              <p style="color: #92400e; font-size: 14px; font-weight: 600; margin: 0;">
                ⏳ Please WAIT — do not try to create an account yet.
              </p>
              <p style="color: #92400e; font-size: 13px; margin: 8px 0 0 0;">
                We'll send you a separate email with your Peptide Pro login credentials once your account is set up. This usually happens within 1-2 business days.
              </p>
            </div>
            <p style="color: #555; font-size: 14px; line-height: 1.6; margin: 0 0 12px 0;">
              In the meantime, you can download the app so it's ready to go:
            </p>
            <div style="text-align: center;">
              <a href="${appStoreApple}" style="display: inline-block; background-color: #000000; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; font-size: 13px; margin: 0 5px 8px 5px;">
                Download for iPhone
              </a>
              <a href="${appStoreGoogle}" style="display: inline-block; background-color: #34a853; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; font-size: 13px; margin: 0 5px 8px 5px;">
                Download for Android
              </a>
            </div>
          </div>

          <!-- What's Happening Next -->
          <div style="background-color: #f8f9fa; border-radius: 12px; padding: 25px; margin-bottom: 25px;">
            <h3 style="color: #1e3a5f; margin: 0 0 12px 0; font-size: 18px;">What Happens Next</h3>
            <ol style="color: #555; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
              <li>Your coach is building your personalized protocol (typically 3-4 days)</li>
              <li>You'll receive your protocol for review and approval</li>
              <li>Once approved and paid, your supplies will be ordered and shipped</li>
              <li>We'll schedule your kickoff session when everything arrives</li>
            </ol>
          </div>

          <!-- Support -->
          <div style="background-color: #f0f9ff; border-radius: 12px; padding: 20px; text-align: center;">
            <p style="color: #0369a1; font-size: 14px; margin: 0;">
              Questions? Reach out anytime at<br>
              <a href="mailto:omega@omegalongevity.com" style="color: #0284c7; font-weight: 600;">omega@omegalongevity.com</a>
            </p>
          </div>
        </div>

        <!-- Footer -->
        <div style="background-color: #1e3a5f; padding: 25px; text-align: center;">
          <p style="color: #F97316; font-size: 13px; margin: 0 0 10px 0; font-weight: 600;">Explore Omega Longevity</p>
          <div style="margin-bottom: 10px;">
            <a href="${siteUrl}/order" style="color: #94A3B8; text-decoration: none; margin: 0 8px; font-size: 12px;">Store</a>
            <a href="${siteUrl}/coaching-programs" style="color: #94A3B8; text-decoration: none; margin: 0 8px; font-size: 12px;">Coaching</a>
            <a href="${siteUrl}/partners" style="color: #94A3B8; text-decoration: none; margin: 0 8px; font-size: 12px;">Partners</a>
            <a href="${siteUrl}/launchpad#podcast" style="color: #94A3B8; text-decoration: none; margin: 0 8px; font-size: 12px;">Podcast</a>
          </div>
          <p style="color: #64748b; font-size: 11px; margin: 0;">
            © ${new Date().getFullYear()} Omega Longevity. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  if (!transporter) {
    console.log("=== ONBOARDING WELCOME EMAIL (Simulated) ===");
    console.log(`To: ${to}`);
    console.log(`Client: ${clientName}`);
    console.log(`Program: ${programName} (${tier})`);
    console.log(`Community Code: ${communityCode}`);
    console.log("=== END EMAIL ===");
    return { success: true, message: "Onboarding welcome email simulated (SMTP not configured)" };
  }

  try {
    await transporter.sendMail({
      from: `"Omega Longevity" <${smtpFrom}>`,
      replyTo: "omega@omegalongevity.com",
      to,
      subject,
      html: htmlContent,
    });
    logEmailSentToHistory({ recipientEmail: to, recipientName: clientName, subject, category: 'onboarding', notificationType: 'onboarding_welcome', status: 'sent' });
    console.log(`[Email] Onboarding welcome email sent to ${to}`);
    return { success: true, message: `Onboarding welcome email sent to ${to}` };
  } catch (error) {
    console.error("Failed to send onboarding welcome email:", error);
    return { success: false, message: `Failed to send email: ${error instanceof Error ? error.message : "Unknown error"}` };
  }
}


/**
 * Send admin notification when a packing slip is signed/shipped.
 * Notifies Lisa (and other admins) that items have been shipped for a client.
 */
export async function sendAdminShippingNotification(params: {
  clientName: string;
  clientEmail: string;
  packingSlipId: number;
  status: 'shipped' | 'complete' | 'partial';
  itemCount: number;
  trackingNumber?: string;
  trackingCarrier?: string;
  trackingUrl?: string;
  fulfilledByName?: string;
}): Promise<{ success: boolean; message: string; sentTo: string[] }> {
  const { clientName, clientEmail, packingSlipId, status, itemCount, trackingNumber, trackingCarrier, trackingUrl, fulfilledByName } = params;

  const transporter = getTransporter();
  const smtpFrom = process.env.SMTP_FROM || "Omega Longevity <noreply@humanedge.health>";

  // Get admin emails
  const adminEmails = await getAdminEmails();
  if (adminEmails.length === 0) {
    return { success: false, message: "No admin emails found", sentTo: [] };
  }

  const statusLabels: Record<string, string> = {
    shipped: "Shipped",
    complete: "All Items Fulfilled & Shipped",
    partial: "Partial Shipment (some items backordered)",
  };

  const subject = `📦 Shipment Update: ${clientName} — ${statusLabels[status]}`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8f9fa;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); padding: 30px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 22px;">📦 Shipment Update</h1>
        </div>
        <div style="padding: 30px;">
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <tr><td style="color: #666; padding: 8px 0; font-size: 14px;">Client:</td><td style="color: #333; padding: 8px 0; font-size: 14px; text-align: right; font-weight: 600;">${clientName}</td></tr>
            <tr><td style="color: #666; padding: 8px 0; font-size: 14px;">Email:</td><td style="color: #333; padding: 8px 0; font-size: 14px; text-align: right;">${clientEmail}</td></tr>
            <tr><td style="color: #666; padding: 8px 0; font-size: 14px;">Packing Slip:</td><td style="color: #333; padding: 8px 0; font-size: 14px; text-align: right;">#${packingSlipId}</td></tr>
            <tr><td style="color: #666; padding: 8px 0; font-size: 14px;">Status:</td><td style="color: #333; padding: 8px 0; font-size: 14px; text-align: right; font-weight: 600;">${statusLabels[status]}</td></tr>
            <tr><td style="color: #666; padding: 8px 0; font-size: 14px;">Items:</td><td style="color: #333; padding: 8px 0; font-size: 14px; text-align: right;">${itemCount} item(s)</td></tr>
            ${fulfilledByName ? `<tr><td style="color: #666; padding: 8px 0; font-size: 14px;">Fulfilled By:</td><td style="color: #333; padding: 8px 0; font-size: 14px; text-align: right;">${fulfilledByName}</td></tr>` : ''}
            ${trackingNumber ? `<tr><td style="color: #666; padding: 8px 0; font-size: 14px;">Tracking:</td><td style="color: #333; padding: 8px 0; font-size: 14px; text-align: right;">${trackingCarrier || ''} ${trackingNumber}</td></tr>` : ''}
          </table>
          ${trackingUrl ? `<div style="text-align: center; margin: 20px 0;"><a href="${trackingUrl}" style="display: inline-block; background: #0284c7; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 14px;">Track Package →</a></div>` : ''}
        </div>
        <div style="background-color: #1e3a5f; padding: 20px; text-align: center;">
          <p style="color: #64748b; font-size: 11px; margin: 0;">© ${new Date().getFullYear()} Omega Longevity — Admin Notification</p>
        </div>
      </div>
    </body>
    </html>
  `;

  if (!transporter) {
    console.log("=== ADMIN SHIPPING NOTIFICATION (Simulated) ===");
    console.log(`To: ${adminEmails.join(', ')}`);
    console.log(`Client: ${clientName}, Status: ${status}`);
    console.log("=== END EMAIL ===");
    return { success: true, message: "Admin shipping notification simulated", sentTo: adminEmails };
  }

  try {
    await transporter.sendMail({
      from: `"Omega Longevity" <${smtpFrom}>`,
      to: adminEmails.join(', '),
      subject,
      html: htmlContent,
    });
    logEmailSentToHistory({ recipientEmail: adminEmails[0], recipientName: 'Admin', subject, category: 'shipping', notificationType: 'admin_shipping_notification', status: 'sent' });
    console.log(`[Email] Admin shipping notification sent to: ${adminEmails.join(', ')}`);
    return { success: true, message: "Admin shipping notification sent", sentTo: adminEmails };
  } catch (error) {
    console.error("Failed to send admin shipping notification:", error);
    return { success: false, message: `Failed: ${error instanceof Error ? error.message : "Unknown error"}`, sentTo: [] };
  }
}


/**
 * Send admin notification when a packing slip is marked as delivered.
 * Prompts Lisa to schedule the kickoff session.
 */
export async function sendAdminDeliveryNotification(params: {
  clientName: string;
  clientEmail: string;
  packingSlipId: number;
  trackingNumber?: string;
  deliveredAt: Date;
}): Promise<{ success: boolean; message: string; sentTo: string[] }> {
  const { clientName, clientEmail, packingSlipId, trackingNumber, deliveredAt } = params;

  const transporter = getTransporter();
  const smtpFrom = process.env.SMTP_FROM || "Omega Longevity <noreply@humanedge.health>";

  const adminEmails = await getAdminEmails();
  if (adminEmails.length === 0) {
    return { success: false, message: "No admin emails found", sentTo: [] };
  }

  const subject = `✅ Package Delivered: ${clientName} — Schedule Kickoff Session`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8f9fa;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <div style="background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); padding: 30px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 22px;">✅ Package Delivered!</h1>
          <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0 0; font-size: 14px;">Time to schedule the kickoff session</p>
        </div>
        <div style="padding: 30px;">
          <p style="color: #333; font-size: 15px; line-height: 1.6; margin: 0 0 20px 0;">
            <strong>${clientName}</strong>'s package has been delivered. It's time to reach out and schedule their kickoff session.
          </p>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <tr><td style="color: #666; padding: 8px 0; font-size: 14px;">Client:</td><td style="color: #333; padding: 8px 0; font-size: 14px; text-align: right; font-weight: 600;">${clientName}</td></tr>
            <tr><td style="color: #666; padding: 8px 0; font-size: 14px;">Email:</td><td style="color: #333; padding: 8px 0; font-size: 14px; text-align: right;">${clientEmail}</td></tr>
            <tr><td style="color: #666; padding: 8px 0; font-size: 14px;">Packing Slip:</td><td style="color: #333; padding: 8px 0; font-size: 14px; text-align: right;">#${packingSlipId}</td></tr>
            ${trackingNumber ? `<tr><td style="color: #666; padding: 8px 0; font-size: 14px;">Tracking:</td><td style="color: #333; padding: 8px 0; font-size: 14px; text-align: right;">${trackingNumber}</td></tr>` : ''}
            <tr><td style="color: #666; padding: 8px 0; font-size: 14px;">Delivered:</td><td style="color: #333; padding: 8px 0; font-size: 14px; text-align: right;">${deliveredAt.toLocaleDateString('en-US', { timeZone: 'America/Denver', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</td></tr>
          </table>
          <div style="background-color: #f0fdf4; border-radius: 12px; padding: 20px; border-left: 4px solid #16a34a;">
            <h3 style="color: #166534; margin: 0 0 8px 0; font-size: 16px;">Action Required</h3>
            <p style="color: #555; font-size: 14px; line-height: 1.6; margin: 0;">
              Reach out to ${clientName} to schedule their kickoff / reconstitution training session. A task has been automatically created in their project.
            </p>
          </div>
        </div>
        <div style="background-color: #1e3a5f; padding: 20px; text-align: center;">
          <p style="color: #64748b; font-size: 11px; margin: 0;">© ${new Date().getFullYear()} Omega Longevity — Admin Notification</p>
        </div>
      </div>
    </body>
    </html>
  `;

  if (!transporter) {
    console.log("=== ADMIN DELIVERY NOTIFICATION (Simulated) ===");
    console.log(`To: ${adminEmails.join(', ')}`);
    console.log(`Client: ${clientName}, Delivered: ${deliveredAt.toISOString()}`);
    console.log("=== END EMAIL ===");
    return { success: true, message: "Admin delivery notification simulated", sentTo: adminEmails };
  }

  try {
    await transporter.sendMail({
      from: `"Omega Longevity" <${smtpFrom}>`,
      to: adminEmails.join(', '),
      subject,
      html: htmlContent,
    });
    logEmailSentToHistory({ recipientEmail: adminEmails[0], recipientName: 'Admin', subject, category: 'delivery', notificationType: 'admin_delivery_notification', status: 'sent' });
    console.log(`[Email] Admin delivery notification sent to: ${adminEmails.join(', ')}`);
    return { success: true, message: "Admin delivery notification sent", sentTo: adminEmails };
  } catch (error) {
    console.error("Failed to send admin delivery notification:", error);
    return { success: false, message: `Failed: ${error instanceof Error ? error.message : "Unknown error"}`, sentTo: [] };
  }
}
