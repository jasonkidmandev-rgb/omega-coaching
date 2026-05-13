/**
 * Payment Reminder Email Template
 * Sent to clients with pending payments
 * Branded with Omega Longevity design
 */

export interface PaymentReminderData {
  clientName: string;
  clientEmail: string;
  protocolName: string;
  amount: string;
  currency: string;
  daysOverdue: number;
  paymentLink?: string;
  paymentPortalLink?: string;
  supportEmail?: string;
  trackingId?: string; // For email open/click tracking
  trackingBaseUrl?: string; // Base URL for tracking endpoints
}

export function generatePaymentReminderHTML(data: PaymentReminderData): string {
  const urgency = data.daysOverdue >= 7 ? "urgent" : "standard";
  const baseUrl = process.env.VITE_APP_URL || 'https://peptidecoach.pro';
  const storeUrl = `${baseUrl}/order`;
  const launchpadUrl = `${baseUrl}/launchpad`;
  const podcastUrl = 'https://www.youtube.com/@InsideOmega';
  const supportEmail = data.supportEmail || 'omega@omegalongevity.com';

  const urgencyBadge = urgency === "urgent"
    ? `<div style="display: inline-block; background: #dc2626; color: white; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px;">Urgent</div>`
    : `<div style="display: inline-block; background: #f59e0b; color: white; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px;">Reminder</div>`;

  const urgencyMessage = urgency === "urgent"
    ? `<strong>Important:</strong> Your protocol access may be affected if payment is not received soon. Please complete your payment to maintain uninterrupted access.`
    : `<strong>Friendly Reminder:</strong> Please complete your payment at your earliest convenience to ensure continued access to your protocol.`;

  const paymentButton = data.paymentLink
    ? `<div style="text-align: center; margin: 28px 0;">
        <a href="${data.trackingId && data.trackingBaseUrl ? `${data.trackingBaseUrl}/api/track/click/${data.trackingId}?url=${encodeURIComponent(data.paymentLink)}&name=payment_button` : data.paymentLink}" style="display: inline-block; background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: white; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px;">Complete Payment Now</a>
      </div>`
    : '';

  const portalLink = data.paymentPortalLink
    ? `<div style="text-align: center; margin-bottom: 24px;">
        <a href="${data.paymentPortalLink}" style="color: #f97316; font-size: 14px; text-decoration: underline;">View Your Payment History</a>
      </div>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment Reminder</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0f172a;">
<div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">

<!-- Header with Logo -->
<div style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
  <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">Payment Reminder</h1>
  <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 14px;">Action needed for your protocol</p>
</div>

<!-- Main Content -->
<div style="background-color: #1e293b; padding: 30px; color: #e2e8f0;">
  <p style="font-size: 16px; margin: 0 0 16px; color: #e2e8f0;">Hi ${data.clientName},</p>
  <p style="color: #94a3b8; font-size: 14px; margin: 0 0 24px; line-height: 1.6;">We noticed that your payment for your protocol is still pending. Please complete your payment to continue your health optimization journey.</p>

  <!-- Payment Details Box -->
  <div style="background: #0f172a; border-radius: 12px; padding: 20px; margin-bottom: 24px; border: 1px solid #334155;">
    <div style="text-align: center; margin-bottom: 16px;">
      ${urgencyBadge}
    </div>
    <h3 style="color: #f97316; font-size: 14px; margin: 0 0 16px; text-transform: uppercase; letter-spacing: 0.5px; text-align: center;">Payment Details</h3>
    <div style="padding: 10px 0; border-bottom: 1px solid #334155; display: flex; justify-content: space-between;">
      <span style="color: #94a3b8; font-size: 14px;">Protocol</span>
      <span style="color: #f8fafc; font-size: 14px; font-weight: 600;">${data.protocolName}</span>
    </div>
    <div style="padding: 10px 0; border-bottom: 1px solid #334155; display: flex; justify-content: space-between;">
      <span style="color: #94a3b8; font-size: 14px;">Days Pending</span>
      <span style="color: ${urgency === 'urgent' ? '#ef4444' : '#fbbf24'}; font-size: 14px; font-weight: 600;">${data.daysOverdue} days</span>
    </div>
    <div style="text-align: center; margin-top: 20px;">
      <p style="color: #94a3b8; font-size: 12px; margin: 0 0 4px; text-transform: uppercase; letter-spacing: 0.5px;">Amount Due</p>
      <p style="color: #f8fafc; font-size: 32px; font-weight: 700; margin: 0;">${data.currency} ${data.amount}</p>
    </div>
  </div>

  <!-- Urgency Message -->
  <div style="background: ${urgency === 'urgent' ? 'rgba(220, 38, 38, 0.1)' : 'rgba(245, 158, 11, 0.1)'}; border-radius: 8px; padding: 16px; margin-bottom: 24px; border: 1px solid ${urgency === 'urgent' ? 'rgba(220, 38, 38, 0.3)' : 'rgba(245, 158, 11, 0.3)'};">
    <p style="color: ${urgency === 'urgent' ? '#fca5a5' : '#fcd34d'}; font-size: 14px; margin: 0; line-height: 1.5;">${urgencyMessage}</p>
  </div>

  <!-- CTA Button -->
  ${paymentButton}

  <!-- Payment Portal Link -->
  ${portalLink}

  <!-- Payment Methods -->
  <div style="background: #0f172a; border-radius: 12px; padding: 20px; margin-bottom: 24px; border: 1px solid #334155;">
    <h3 style="color: #f97316; font-size: 14px; margin: 0 0 12px; text-transform: uppercase; letter-spacing: 0.5px;">Payment Methods Accepted</h3>
    <div style="color: #e2e8f0; font-size: 14px; padding: 8px 0; border-bottom: 1px solid #334155;">PayPal</div>
    <div style="color: #e2e8f0; font-size: 14px; padding: 8px 0; border-bottom: 1px solid #334155;">Venmo (@jason-kidman)</div>
    <div style="color: #e2e8f0; font-size: 14px; padding: 8px 0;">Credit Card</div>
  </div>

  <!-- Explore Section -->
  <div style="background: #0f172a; border-radius: 12px; padding: 20px; margin-bottom: 24px; border: 1px solid #334155;">
    <h3 style="color: #f97316; font-size: 14px; margin: 0 0 15px; text-transform: uppercase; letter-spacing: 0.5px;">Explore</h3>
    <div style="margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid #334155;">
      <a href="${storeUrl}" style="color: #f1f5f9; text-decoration: none; font-weight: 600; font-size: 14px;">Store</a>
      <p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 12px;">Browse peptides and supplements</p>
    </div>
    <div style="margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid #334155;">
      <a href="${launchpadUrl}" style="color: #f1f5f9; text-decoration: none; font-weight: 600; font-size: 14px;">Coaching &amp; Programs</a>
      <p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 12px;">Your central hub for all Omega resources</p>
    </div>
    <div>
      <a href="${podcastUrl}" style="color: #f1f5f9; text-decoration: none; font-weight: 600; font-size: 14px;">Inside Omega Podcast</a>
      <p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 12px;">Listen to Jason &amp; Lane discuss health optimization</p>
    </div>
  </div>

  <!-- Support -->
  <div style="text-align: center; padding-top: 20px; border-top: 1px solid #334155;">
    <p style="color: #94a3b8; margin: 0; font-size: 13px;">Questions about your payment? Contact us at <a href="mailto:${supportEmail}" style="color: #f97316;">${supportEmail}</a></p>
  </div>
</div>

<!-- Footer -->
<div style="background-color: #0f172a; border-radius: 0 0 16px 16px; text-align: center; padding: 20px; color: #64748b; font-size: 12px;">
  <p style="margin: 0 0 8px;">Omega Longevity<br>1098 W. South Jordan Pkwy #106, South Jordan, UT 84095</p>
  <p style="margin: 0; color: #475569;">You're receiving this because you have a pending payment for your health optimization protocol.</p>
</div>

</div>
${data.trackingId && data.trackingBaseUrl ? `
<!-- Email open tracking pixel -->
<img src="${data.trackingBaseUrl}/api/track/open/${data.trackingId}" width="1" height="1" style="display:none;" alt="" />
` : ''}
</body>
</html>`;
}

export function generatePaymentReminderText(data: PaymentReminderData): string {
  const urgency = data.daysOverdue >= 7 ? "URGENT" : "REMINDER";

  return `
PAYMENT ${urgency}

Hi ${data.clientName},

We noticed that your payment for your protocol is still pending. Please complete your payment to continue your health optimization journey.

PAYMENT DETAILS
Protocol: ${data.protocolName}
Amount Due: ${data.currency} ${data.amount}
Days Pending: ${data.daysOverdue} days

${data.daysOverdue >= 7 ? `
IMPORTANT: Your protocol access may be affected if payment is not received soon. Please complete your payment to maintain uninterrupted access.
` : `
FRIENDLY REMINDER: Please complete your payment at your earliest convenience to ensure continued access to your protocol.
`}

${data.paymentLink ? `
Complete your payment here: ${data.paymentLink}
` : ""}

${data.paymentPortalLink ? `
View your payment history: ${data.paymentPortalLink}
` : ""}

PAYMENT METHODS ACCEPTED
- PayPal
- Venmo (@jason-kidman)
- Credit Card

NEED HELP?
If you have any questions about your payment, please reach out.
Email: ${data.supportEmail || 'omega@omegalongevity.com'}

---
Omega Longevity
1098 W. South Jordan Pkwy #106, South Jordan, UT 84095
This is an automated message. Please do not reply to this email.
  `;
}
