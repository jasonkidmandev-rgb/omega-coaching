/**
 * Payment Confirmation Email Template
 * Sent to clients after successful payment
 * Branded for Omega Longevity
 */

export interface PaymentConfirmationData {
  clientName: string;
  clientEmail: string;
  orderId?: string;
  amount: string;
  currency: string;
  paymentMethod: "paypal" | "venmo" | "other";
  protocolName: string;
  paymentDate: Date;
  nextSteps?: string;
  supportEmail?: string;
  siteUrl?: string;
  trackingNumber?: string;
  trackingUrl?: string;
}

// Omega Longevity brand colors
const BRAND_COLORS = {
  primary: "#F97316", // Orange
  primaryDark: "#EA580C",
  background: "#0F172A", // Dark navy
  backgroundLight: "#1E293B",
  text: "#F8FAFC",
  textMuted: "#94A3B8",
  success: "#22C55E",
  accent: "#F97316",
};

export function generatePaymentConfirmationHTML(data: PaymentConfirmationData): string {
  const formattedDate = data.paymentDate.toLocaleDateString("en-US", { timeZone: 'America/Denver',
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const paymentMethodLabel = data.paymentMethod === "paypal" ? "PayPal" : data.paymentMethod === "venmo" ? "Venmo" : "Payment";
  const siteUrl = data.siteUrl || process.env.VITE_APP_URL || "https://peptidecoach.pro";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment Confirmation - Omega Longevity</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: ${BRAND_COLORS.text};
            background-color: ${BRAND_COLORS.background};
            margin: 0;
            padding: 20px;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: ${BRAND_COLORS.backgroundLight};
            border-radius: 12px;
            overflow: hidden;
            border: 1px solid #334155;
        }
        .header {
            background: linear-gradient(135deg, ${BRAND_COLORS.primary} 0%, ${BRAND_COLORS.primaryDark} 100%);
            color: white;
            padding: 30px 20px;
            text-align: center;
        }
        .logo {
            margin-bottom: 15px;
        }
        .logo img {
            height: 50px;
            width: auto;
        }
        .logo-text {
            font-size: 24px;
            font-weight: 700;
            letter-spacing: 1px;
        }
        .header h1 {
            margin: 15px 0 0 0;
            font-size: 24px;
            font-weight: 600;
        }
        .content {
            padding: 30px 25px;
        }
        .greeting {
            font-size: 16px;
            margin-bottom: 25px;
            color: ${BRAND_COLORS.text};
        }
        .greeting p {
            margin: 0 0 10px 0;
        }
        .confirmation-box {
            background-color: rgba(34, 197, 94, 0.1);
            border: 1px solid ${BRAND_COLORS.success};
            padding: 20px;
            margin: 20px 0;
            border-radius: 8px;
        }
        .confirmation-box h2 {
            margin: 0 0 15px 0;
            color: ${BRAND_COLORS.success};
            font-size: 18px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .detail-row {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px solid #334155;
        }
        .detail-row:last-child {
            border-bottom: none;
        }
        .detail-label {
            font-weight: 500;
            color: ${BRAND_COLORS.textMuted};
        }
        .detail-value {
            font-weight: 600;
            color: ${BRAND_COLORS.text};
        }
        .amount {
            font-size: 28px;
            color: ${BRAND_COLORS.success};
            font-weight: 700;
            text-align: center;
            margin: 20px 0;
        }
        .shipping-info {
            background-color: rgba(249, 115, 22, 0.1);
            border: 1px solid ${BRAND_COLORS.primary};
            padding: 20px;
            margin: 20px 0;
            border-radius: 8px;
        }
        .shipping-info h3 {
            margin: 0 0 15px 0;
            color: ${BRAND_COLORS.primary};
            font-size: 16px;
        }
        .shipping-info ul {
            margin: 0;
            padding-left: 20px;
            color: ${BRAND_COLORS.text};
        }
        .shipping-info li {
            margin-bottom: 8px;
        }
        .next-steps {
            background-color: rgba(59, 130, 246, 0.1);
            border: 1px solid #3B82F6;
            padding: 20px;
            margin: 20px 0;
            border-radius: 8px;
        }
        .next-steps h3 {
            margin: 0 0 15px 0;
            color: #60A5FA;
            font-size: 16px;
        }
        .next-steps ul {
            margin: 0;
            padding-left: 20px;
            color: ${BRAND_COLORS.text};
        }
        .next-steps li {
            margin-bottom: 8px;
        }
        .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, ${BRAND_COLORS.primary} 0%, ${BRAND_COLORS.primaryDark} 100%);
            color: white !important;
            padding: 14px 35px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
        }
        .venmo-note {
            background-color: rgba(251, 191, 36, 0.1);
            border: 1px solid #FBBF24;
            padding: 15px;
            margin: 20px 0;
            border-radius: 8px;
            font-size: 14px;
            color: #FCD34D;
        }
        .tracking-box {
            background-color: rgba(34, 197, 94, 0.1);
            border: 1px solid ${BRAND_COLORS.success};
            padding: 20px;
            margin: 20px 0;
            border-radius: 8px;
            text-align: center;
        }
        .tracking-box h3 {
            margin: 0 0 15px 0;
            color: ${BRAND_COLORS.success};
            font-size: 16px;
        }
        .tracking-box p {
            margin: 0 0 15px 0;
            color: ${BRAND_COLORS.text};
        }
        .track-button {
            display: inline-block;
            background: ${BRAND_COLORS.success};
            color: white !important;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
        }
        .platform-features {
            background-color: ${BRAND_COLORS.background};
            padding: 25px;
            margin-top: 30px;
            border-radius: 8px;
        }
        .platform-features h3 {
            margin: 0 0 20px 0;
            color: ${BRAND_COLORS.primary};
            font-size: 16px;
            text-align: center;
        }
        .feature-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
        }
        .feature-item {
            text-align: center;
            padding: 15px 10px;
            background-color: ${BRAND_COLORS.backgroundLight};
            border-radius: 8px;
            border: 1px solid #334155;
        }
        .feature-item a {
            color: ${BRAND_COLORS.text};
            text-decoration: none;
            font-size: 13px;
            font-weight: 500;
        }
        .feature-item a:hover {
            color: ${BRAND_COLORS.primary};
        }
        .feature-icon {
            font-size: 24px;
            margin-bottom: 8px;
        }
        .footer {
            background-color: ${BRAND_COLORS.background};
            padding: 25px;
            text-align: center;
            font-size: 12px;
            color: ${BRAND_COLORS.textMuted};
            border-top: 1px solid #334155;
        }
        .footer p {
            margin: 5px 0;
        }
        .footer a {
            color: ${BRAND_COLORS.primary};
            text-decoration: none;
        }
        .social-links {
            margin: 15px 0;
        }
        .social-links a {
            display: inline-block;
            margin: 0 8px;
            color: ${BRAND_COLORS.textMuted};
            text-decoration: none;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>✓ Payment Confirmed</h1>
        </div>

        <div class="content">
            <div class="greeting">
                <p>Hi ${data.clientName},</p>
                <p>Great news! We've received your payment and your protocol is now active. Thank you for trusting Omega Longevity with your health optimization journey.</p>
            </div>

            <div class="confirmation-box">
                <h2>✓ Payment Details</h2>
                <div class="detail-row">
                    <span class="detail-label">Protocol:</span>
                    <span class="detail-value">${data.protocolName}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Payment Method:</span>
                    <span class="detail-value">${paymentMethodLabel}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Date:</span>
                    <span class="detail-value">${formattedDate}</span>
                </div>
                ${data.orderId ? `<div class="detail-row">
                    <span class="detail-label">Order ID:</span>
                    <span class="detail-value">${data.orderId}</span>
                </div>` : ""}
                <div class="amount">$${data.amount} ${data.currency}</div>
            </div>

            ${data.paymentMethod === "venmo" ? `
            <div class="venmo-note">
                <strong>Venmo Payment Note:</strong> Your Venmo payment has been recorded. Please allow 1-2 business days for final confirmation. We'll notify you once it's fully processed.
            </div>
            ` : ""}

            ${data.trackingNumber ? `
            <div class="tracking-box">
                <h3>📦 Tracking Information</h3>
                <p><strong>Tracking Number:</strong> ${data.trackingNumber}</p>
                ${data.trackingUrl ? `<a href="${data.trackingUrl}" class="track-button">Track Your Package</a>` : ''}
            </div>
            ` : ''}

            <div class="shipping-info">
                <h3>📦 Shipping Information</h3>
                <ul>
                    <li><strong>Estimated Delivery:</strong> 5-7 business days</li>
                    <li><strong>Shipping Schedule:</strong> We ship out on average twice a week</li>
                    ${!data.trackingNumber ? '<li>You will receive tracking information once your order ships</li>' : ''}
                    <li><strong>Expedited Shipping:</strong> Available upon special request. Email ${data.supportEmail || "support@omegalongevity.com"} for urgent shipping needs</li>
                </ul>
            </div>

            <div class="next-steps">
                <h3>🚀 What's Next?</h3>
                <ul>
                    <li>Your personalized protocol is now active and ready to view</li>
                    <li>Follow the recommended dosing schedule for optimal results</li>
                    <li>Track your progress and reach out with any questions</li>
                    <li>Check out our resources below to maximize your results</li>
                </ul>
            </div>

            ${data.nextSteps ? `<p style="margin: 20px 0; color: ${BRAND_COLORS.text};">${data.nextSteps}</p>` : ""}

            <div style="text-align: center; margin: 30px 0;">
                <a href="${siteUrl}/protocol" class="cta-button">View Your Protocol</a>
            </div>

            <div class="platform-features">
                <h3>Explore Omega Longevity</h3>
                <div class="feature-grid">
                    <div class="feature-item">
                        <div class="feature-icon">🛒</div>
                        <a href="${siteUrl}/order">Omega Store</a>
                    </div>
                    <div class="feature-item">
                        <div class="feature-icon">🎯</div>
                        <a href="${siteUrl}/coaching-programs">Coaching & Programs</a>
                    </div>
                    <div class="feature-item">
                        <div class="feature-icon">🤝</div>
                        <a href="${siteUrl}/partners">Trusted Partners</a>
                    </div>
                    <div class="feature-item">
                        <div class="feature-icon">📋</div>
                        <a href="${siteUrl}/peptide-cheat-sheet">Peptide Cheat Sheet</a>
                    </div>
                </div>
                <div style="text-align: center; margin-top: 20px;">
                    <div class="feature-item" style="display: inline-block; padding: 15px 30px;">
                        <div class="feature-icon">🎙️</div>
                        <a href="${siteUrl}/launchpad#podcast">Inside Omega Podcast</a>
                    </div>
                </div>
            </div>
        </div>

        <div class="footer">
            <p><strong>Questions? We're here to help.</strong></p>
            <p>Email: <a href="mailto:${data.supportEmail || "support@omegalongevity.com"}">${data.supportEmail || "support@omegalongevity.com"}</a></p>
            
            <div class="social-links">
                <a href="https://instagram.com/omegalongevity">Instagram</a> |
                <a href="https://youtube.com/@omegalongevity">YouTube</a>
            </div>
            
            <p style="margin-top: 20px; font-size: 11px; color: #64748B;">
                © ${new Date().getFullYear()} Omega Longevity. All rights reserved.<br>
                This email was sent to ${data.clientEmail}
            </p>
        </div>
    </div>
</body>
</html>
  `;
}

export function generatePaymentConfirmationText(data: PaymentConfirmationData): string {
  const formattedDate = data.paymentDate.toLocaleDateString("en-US", { timeZone: 'America/Denver',
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const paymentMethodLabel = data.paymentMethod === "paypal" ? "PayPal" : data.paymentMethod === "venmo" ? "Venmo" : "Payment";
  const supportEmail = data.supportEmail || "support@omegalongevity.com";

  return `
OMEGA LONGEVITY - PAYMENT CONFIRMATION
======================================

Hi ${data.clientName},

Great news! We've received your payment and your protocol is now active. Thank you for trusting Omega Longevity with your health optimization journey.

PAYMENT DETAILS
---------------
Protocol: ${data.protocolName}
Payment Method: ${paymentMethodLabel}
Date: ${formattedDate}
${data.orderId ? `Order ID: ${data.orderId}\n` : ""}Amount: $${data.amount} ${data.currency}

${data.paymentMethod === "venmo" ? `
VENMO PAYMENT NOTE
Your Venmo payment has been recorded. Please allow 1-2 business days for final confirmation.
` : ""}

${data.trackingNumber ? `TRACKING INFORMATION
--------------------
Tracking Number: ${data.trackingNumber}
${data.trackingUrl ? `Track your package: ${data.trackingUrl}` : ''}

` : ''}SHIPPING INFORMATION
--------------------
• Estimated Delivery: 5-7 business days
• Shipping Schedule: We ship out on average twice a week
${!data.trackingNumber ? '• You will receive tracking information once your order ships\n' : ''}• Expedited Shipping: Available upon special request. Email ${supportEmail} for urgent shipping needs

WHAT'S NEXT?
------------
• Your personalized protocol is now active and ready to view
• Follow the recommended dosing schedule for optimal results
• Track your progress and reach out with any questions
• Check out our resources to maximize your results

${data.nextSteps ? `${data.nextSteps}\n` : ""}

EXPLORE OMEGA LONGEVITY
-----------------------
• Omega Store - Shop supplements and supplies
• Coaching & Programs - Level up your optimization
• Trusted Partners - Vetted vendors and resources
• Peptide Cheat Sheet - Quick reference guide
• Inside Omega Podcast - Expert interviews and insights

NEED HELP?
----------
Email: ${supportEmail}

---
© ${new Date().getFullYear()} Omega Longevity. All rights reserved.
This email was sent to ${data.clientEmail}
  `;
}
