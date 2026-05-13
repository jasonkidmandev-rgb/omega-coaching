// Omega Longevity brand colors
const BRAND_COLORS = {
  primary: "#F97316", // Orange
  primaryDark: "#EA580C",
  background: "#0F172A", // Dark navy
  backgroundLight: "#1E293B",
  cardBg: "#334155",
  text: "#F8FAFC",
  textMuted: "#94A3B8",
  success: "#22C55E",
  border: "#475569",
};

export interface DeliveryNotificationData {
  customerName: string;
  customerEmail: string;
  orderId: string;
  items: Array<{
    name: string;
    quantity: number;
  }>;
  deliveryDate: Date;
  trackingNumber?: string;
  trackingUrl?: string;
  supportEmail?: string;
  siteUrl?: string;
}

export function generateDeliveryNotificationHTML(data: DeliveryNotificationData): string {
  const siteUrl = data.siteUrl || 'https://peptidecoach.pro';
  const supportEmail = data.supportEmail || 'support@omegalongevity.com';
  const deliveryDateStr = data.deliveryDate.toLocaleDateString('en-US', { timeZone: 'America/Denver',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const itemsHtml = data.items.map(item => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid ${BRAND_COLORS.border}; color: ${BRAND_COLORS.text};">${item.name}</td>
      <td style="padding: 12px; border-bottom: 1px solid ${BRAND_COLORS.border}; text-align: center; color: ${BRAND_COLORS.textMuted};">${item.quantity}</td>
      <td style="padding: 12px; border-bottom: 1px solid ${BRAND_COLORS.border}; text-align: right;">
        <span style="background-color: rgba(34, 197, 94, 0.2); color: ${BRAND_COLORS.success}; padding: 2px 8px; border-radius: 4px; font-size: 12px;">Delivered</span>
      </td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Your Package Has Been Delivered!</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: ${BRAND_COLORS.background};">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <!-- Header with Logo -->
        <div style="background: linear-gradient(135deg, ${BRAND_COLORS.primary} 0%, ${BRAND_COLORS.primaryDark} 100%); border-radius: 12px 12px 0 0; padding: 30px; text-align: center;">
          <div style="font-size: 48px; margin-bottom: 10px;">✅</div>
          <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 700;">Your Package Has Been Delivered!</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px;">Your health optimization products have arrived</p>
        </div>
        
        <!-- Main Content -->
        <div style="background-color: ${BRAND_COLORS.backgroundLight}; padding: 30px;">
          <p style="color: ${BRAND_COLORS.text}; font-size: 16px; margin: 0 0 20px 0;">
            Hi ${data.customerName},
          </p>
          
          <p style="color: ${BRAND_COLORS.textMuted}; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
            Great news! Your package has been delivered. We hope you're excited to start your health optimization journey with Omega Longevity!
          </p>
          
          <!-- Delivery Confirmation Box -->
          <div style="background-color: rgba(34, 197, 94, 0.1); border: 1px solid ${BRAND_COLORS.success}; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
            <p style="margin: 0 0 8px 0; font-weight: 600; color: ${BRAND_COLORS.success}; font-size: 16px;">✅ Delivered Successfully</p>
            <p style="margin: 0; color: ${BRAND_COLORS.textMuted}; font-size: 14px;">Delivered on ${deliveryDateStr}</p>
            ${data.trackingNumber ? `
              <p style="margin: 12px 0 0 0; color: ${BRAND_COLORS.text}; font-size: 13px;">
                Tracking: <strong>${data.trackingNumber}</strong>
              </p>
            ` : ''}
          </div>
          
          <!-- Order Details -->
          <div style="margin: 25px 0;">
            <h2 style="color: ${BRAND_COLORS.primary}; font-size: 16px; margin: 0 0 15px 0; font-weight: 600;">📦 Delivered Items</h2>
            <table style="width: 100%; border-collapse: collapse; background-color: ${BRAND_COLORS.background}; border-radius: 8px; overflow: hidden;">
              <thead>
                <tr style="background-color: rgba(249, 115, 22, 0.1);">
                  <th style="padding: 12px; text-align: left; font-size: 12px; color: ${BRAND_COLORS.primary}; text-transform: uppercase; font-weight: 600;">Item</th>
                  <th style="padding: 12px; text-align: center; font-size: 12px; color: ${BRAND_COLORS.primary}; text-transform: uppercase; font-weight: 600;">Qty</th>
                  <th style="padding: 12px; text-align: right; font-size: 12px; color: ${BRAND_COLORS.primary}; text-transform: uppercase; font-weight: 600;">Status</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>
          </div>
          
          <!-- Order Reference -->
          <div style="background-color: ${BRAND_COLORS.background}; border-radius: 8px; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; color: ${BRAND_COLORS.textMuted}; font-size: 13px;">
              <strong style="color: ${BRAND_COLORS.text};">Order Reference:</strong> ${data.orderId}
            </p>
          </div>
          
          <!-- Getting Started Section -->
          <div style="background-color: rgba(249, 115, 22, 0.1); border-radius: 8px; padding: 20px; margin: 25px 0;">
            <h3 style="color: ${BRAND_COLORS.primary}; font-size: 15px; margin: 0 0 12px 0; font-weight: 600;">🚀 Getting Started</h3>
            <p style="color: ${BRAND_COLORS.textMuted}; font-size: 13px; line-height: 1.6; margin: 0 0 12px 0;">
              Ready to begin? Here are some helpful resources:
            </p>
            <ul style="margin: 0; padding-left: 20px; color: ${BRAND_COLORS.textMuted}; font-size: 13px; line-height: 1.8;">
              <li>Check your protocol for dosing instructions</li>
              <li>Visit the <a href="${siteUrl}/peptide-cheat-sheet" style="color: ${BRAND_COLORS.primary}; text-decoration: none;">Peptide Cheat Sheet</a> for quick reference</li>
              <li>Join our <a href="${siteUrl}/launchpad#podcast" style="color: ${BRAND_COLORS.primary}; text-decoration: none;">Inside Omega Podcast</a> for tips and insights</li>
            </ul>
          </div>
          
          <!-- Need Help Section -->
          <div style="text-align: center; margin: 25px 0;">
            <p style="color: ${BRAND_COLORS.textMuted}; font-size: 13px; margin: 0 0 12px 0;">
              Questions about your order or products?
            </p>
            <a href="mailto:${supportEmail}" style="display: inline-block; background-color: ${BRAND_COLORS.primary}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">
              Contact Support
            </a>
          </div>
        </div>
        
        <!-- Platform Features -->
        <div style="background-color: ${BRAND_COLORS.background}; padding: 25px; border-radius: 0 0 12px 12px;">
          <p style="color: ${BRAND_COLORS.primary}; font-size: 14px; text-align: center; margin: 0 0 15px 0; font-weight: 600;">
            Explore Omega Longevity
          </p>
          <div style="text-align: center;">
            <a href="${siteUrl}/order" style="color: ${BRAND_COLORS.textMuted}; text-decoration: none; margin: 0 10px; font-size: 12px;">Omega Store</a>
            <span style="color: ${BRAND_COLORS.border};">|</span>
            <a href="${siteUrl}/coaching-programs" style="color: ${BRAND_COLORS.textMuted}; text-decoration: none; margin: 0 10px; font-size: 12px;">Coaching & Programs</a>
            <span style="color: ${BRAND_COLORS.border};">|</span>
            <a href="${siteUrl}/partners" style="color: ${BRAND_COLORS.textMuted}; text-decoration: none; margin: 0 10px; font-size: 12px;">Trusted Partners</a>
          </div>
          <div style="text-align: center; margin-top: 12px;">
            <a href="${siteUrl}/peptide-cheat-sheet" style="color: ${BRAND_COLORS.textMuted}; text-decoration: none; margin: 0 10px; font-size: 12px;">Peptide Cheat Sheet</a>
            <span style="color: ${BRAND_COLORS.border};">|</span>
            <a href="${siteUrl}/launchpad#podcast" style="color: ${BRAND_COLORS.textMuted}; text-decoration: none; margin: 0 10px; font-size: 12px;">Inside Omega Podcast</a>
          </div>
          
          <!-- Social Links -->
          <div style="text-align: center; margin-top: 20px;">
            <a href="https://www.instagram.com/omegalongevity" style="color: ${BRAND_COLORS.textMuted}; text-decoration: none; margin: 0 8px; font-size: 12px;">Instagram</a>
            <a href="https://www.youtube.com/@OmegaLongevity" style="color: ${BRAND_COLORS.textMuted}; text-decoration: none; margin: 0 8px; font-size: 12px;">YouTube</a>
            <a href="https://www.facebook.com/omegalongevity" style="color: ${BRAND_COLORS.textMuted}; text-decoration: none; margin: 0 8px; font-size: 12px;">Facebook</a>
          </div>
          
          <!-- Footer -->
          <p style="color: ${BRAND_COLORS.border}; font-size: 11px; text-align: center; margin: 20px 0 0 0;">
            © ${new Date().getFullYear()} Omega Longevity. All rights reserved.<br />
            Elite Level Health Optimization
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function generateDeliveryNotificationText(data: DeliveryNotificationData): string {
  const siteUrl = data.siteUrl || 'https://peptidecoach.pro';
  const supportEmail = data.supportEmail || 'support@omegalongevity.com';
  const deliveryDateStr = data.deliveryDate.toLocaleDateString('en-US', { timeZone: 'America/Denver',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const itemsList = data.items.map(item => `  - ${item.name} (Qty: ${item.quantity}) - Delivered`).join('\n');

  return `
YOUR PACKAGE HAS BEEN DELIVERED!
================================

Hi ${data.customerName},

Great news! Your package has been delivered. We hope you're excited to start your health optimization journey with Omega Longevity!

DELIVERY CONFIRMATION
---------------------
Status: ✅ Delivered Successfully
Delivered on: ${deliveryDateStr}
${data.trackingNumber ? `Tracking Number: ${data.trackingNumber}` : ''}

DELIVERED ITEMS
---------------
${itemsList}

Order Reference: ${data.orderId}

GETTING STARTED
---------------
Ready to begin? Here are some helpful resources:
- Check your protocol for dosing instructions
- Visit the Peptide Cheat Sheet: ${siteUrl}/peptide-cheat-sheet
- Listen to the Inside Omega Podcast: ${siteUrl}/launchpad#podcast

NEED HELP?
----------
Questions about your order or products?
Contact us at: ${supportEmail}

EXPLORE OMEGA LONGEVITY
-----------------------
Omega Store: ${siteUrl}/order
Coaching & Programs: ${siteUrl}/coaching-programs
Trusted Partners: ${siteUrl}/partners
Peptide Cheat Sheet: ${siteUrl}/peptide-cheat-sheet
Inside Omega Podcast: ${siteUrl}/launchpad#podcast

Follow us:
Instagram: https://www.instagram.com/omegalongevity
YouTube: https://www.youtube.com/@OmegaLongevity
Facebook: https://www.facebook.com/omegalongevity

---
© ${new Date().getFullYear()} Omega Longevity. All rights reserved.
Elite Level Health Optimization
  `.trim();
}
