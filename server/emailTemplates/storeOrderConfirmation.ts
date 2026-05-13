/**
 * Store Order Confirmation Email Template
 * Sent to customers after successful store purchase
 * Branded for Omega Longevity
 */

export interface StoreOrderItem {
  name: string;
  quantity: number;
  pricePerUnit: string;
  isDiscountable: boolean;
}

export interface StoreOrderConfirmationData {
  customerName: string;
  customerEmail: string;
  orderId: number;
  paypalOrderId?: string;
  items: StoreOrderItem[];
  subtotal: string;
  discountAmount: string;
  shippingFee?: string;
  total: string;
  paymentMethod: "paypal" | "venmo";
  orderDate: Date;
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
  cardBg: "#334155",
  text: "#F8FAFC",
  textMuted: "#94A3B8",
  success: "#22C55E",
  border: "#475569",
};

export function generateStoreOrderConfirmationHTML(data: StoreOrderConfirmationData): string {
  const formattedDate = data.orderDate.toLocaleDateString("en-US", { timeZone: 'America/Denver',
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const paymentMethodLabel = data.paymentMethod === "paypal" ? "PayPal" : "Venmo";
  const hasDiscount = parseFloat(data.discountAmount) > 0;
  const siteUrl = data.siteUrl || process.env.VITE_APP_URL || "https://peptidecoach.pro";

  const itemsHTML = data.items.map(item => {
    const lineTotal = (parseFloat(item.pricePerUnit) * item.quantity).toFixed(2);
    return `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid ${BRAND_COLORS.border}; color: ${BRAND_COLORS.text};">${item.name}</td>
      <td style="padding: 12px; border-bottom: 1px solid ${BRAND_COLORS.border}; text-align: center; color: ${BRAND_COLORS.text};">${item.quantity}</td>
      <td style="padding: 12px; border-bottom: 1px solid ${BRAND_COLORS.border}; text-align: right; color: ${BRAND_COLORS.text};">$${item.pricePerUnit}</td>
      <td style="padding: 12px; border-bottom: 1px solid ${BRAND_COLORS.border}; text-align: right; color: ${BRAND_COLORS.text};">$${lineTotal}</td>
    </tr>`;
  }).join("");

  const transactionIdSection = data.paypalOrderId 
    ? `<div class="detail-row">
        <span class="detail-label">Transaction ID:</span>
        <span class="detail-value">${data.paypalOrderId}</span>
       </div>` 
    : "";

  const discountSection = hasDiscount 
    ? `<div class="total-row discount-row">
        <span>Member Discount (10%):</span>
        <span>-$${data.discountAmount}</span>
       </div>` 
    : "";

  const shippingSection = data.shippingFee && parseFloat(data.shippingFee) > 0
    ? `<div class="total-row">
        <span class="detail-label">Shipping (Flat Rate):</span>
        <span class="detail-value">$${data.shippingFee}</span>
       </div>`
    : "";

  const venmoNote = data.paymentMethod === "venmo" 
    ? `<div class="venmo-note">
        <strong>Venmo Payment Note:</strong> Your Venmo payment has been recorded. Please allow 1-2 business days for final confirmation. We will begin processing your order once payment is received.
       </div>` 
    : "";

  const trackingSection = data.trackingNumber 
    ? `<div class="tracking-box">
        <h3>📦 Tracking Information</h3>
        <p><strong>Tracking Number:</strong> ${data.trackingNumber}</p>
        ${data.trackingUrl ? `<a href="${data.trackingUrl}" class="track-button">Track Your Package</a>` : ''}
       </div>` 
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Order Confirmation - Omega Store</title>
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
            border: 1px solid ${BRAND_COLORS.border};
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
        .header h1 {
            margin: 15px 0 0 0;
            font-size: 24px;
            font-weight: 600;
        }
        .header .subtitle {
            margin-top: 8px;
            font-size: 14px;
            opacity: 0.9;
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
        .order-box {
            background-color: ${BRAND_COLORS.cardBg};
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }
        .order-box h2 {
            margin: 0 0 15px 0;
            color: ${BRAND_COLORS.primary};
            font-size: 18px;
        }
        .detail-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid ${BRAND_COLORS.border};
        }
        .detail-row:last-child {
            border-bottom: none;
        }
        .detail-label {
            color: ${BRAND_COLORS.textMuted};
        }
        .detail-value {
            font-weight: 600;
            color: ${BRAND_COLORS.text};
        }
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            background-color: ${BRAND_COLORS.cardBg};
            border-radius: 8px;
            overflow: hidden;
        }
        .items-table th {
            background-color: ${BRAND_COLORS.border};
            padding: 12px;
            text-align: left;
            color: ${BRAND_COLORS.text};
            font-weight: 600;
        }
        .items-table th:nth-child(2),
        .items-table th:nth-child(3),
        .items-table th:nth-child(4) {
            text-align: center;
        }
        .items-table th:last-child {
            text-align: right;
        }
        .totals-box {
            background-color: ${BRAND_COLORS.cardBg};
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }
        .total-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            color: ${BRAND_COLORS.text};
        }
        .total-row.final {
            border-top: 2px solid ${BRAND_COLORS.primary};
            margin-top: 10px;
            padding-top: 15px;
        }
        .total-row.final .total-value {
            font-size: 24px;
            color: ${BRAND_COLORS.primary};
            font-weight: 700;
        }
        .discount-row {
            color: ${BRAND_COLORS.success};
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
        .venmo-note {
            background-color: rgba(251, 191, 36, 0.1);
            border: 1px solid #FBBF24;
            padding: 15px;
            margin: 20px 0;
            border-radius: 8px;
            font-size: 14px;
            color: #FCD34D;
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
            border: 1px solid ${BRAND_COLORS.border};
        }
        .feature-item a {
            color: ${BRAND_COLORS.text};
            text-decoration: none;
            font-size: 13px;
            font-weight: 500;
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
            border-top: 1px solid ${BRAND_COLORS.border};
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
            <h1>✓ Order Confirmed!</h1>
            <div class="subtitle">Thank you for your purchase from Omega Store</div>
        </div>

        <div class="content">
            <div class="greeting">
                <p>Hi ${data.customerName},</p>
                <p>Great news! Your order has been confirmed and is being processed. Here are your order details:</p>
            </div>

            <div class="order-box">
                <h2>Order Details</h2>
                <div class="detail-row">
                    <span class="detail-label">Order Number:</span>
                    <span class="detail-value">#${data.orderId}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Payment Method:</span>
                    <span class="detail-value">${paymentMethodLabel}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Order Date:</span>
                    <span class="detail-value">${formattedDate}</span>
                </div>
                ${transactionIdSection}
            </div>

            <h3 style="color: ${BRAND_COLORS.text}; margin-bottom: 10px;">Items Ordered</h3>
            <table class="items-table">
                <thead>
                    <tr>
                        <th>Item</th>
                        <th>Qty</th>
                        <th>Price</th>
                        <th>Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsHTML}
                </tbody>
            </table>

            <div class="totals-box">
                <div class="total-row">
                    <span class="detail-label">Subtotal:</span>
                    <span class="detail-value">$${data.subtotal}</span>
                </div>
                ${discountSection}
                ${shippingSection}
                <div class="total-row final">
                    <span class="detail-label" style="font-weight: 600;">Total Paid:</span>
                    <span class="total-value">$${data.total}</span>
                </div>
            </div>

            ${venmoNote}

            ${trackingSection}

            <div class="shipping-info">
                <h3>📦 Shipping Information</h3>
                <ul>
                    <li><strong>Estimated Delivery:</strong> 5-7 business days</li>
                    <li><strong>Shipping Schedule:</strong> We ship out on average twice a week</li>
                    <li>You will receive a shipping confirmation with tracking info once your order ships</li>
                    <li><strong>Expedited Shipping:</strong> Available upon special request. Email <a href="mailto:${data.supportEmail || "omega@omegalongevity.com"}" style="color: ${BRAND_COLORS.primary};">${data.supportEmail || "omega@omegalongevity.com"}</a> for urgent shipping needs</li>
                </ul>
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
                This email was sent to ${data.customerEmail}
            </p>
        </div>
    </div>
</body>
</html>`;
}

export function generateStoreOrderConfirmationText(data: StoreOrderConfirmationData): string {
  const formattedDate = data.orderDate.toLocaleDateString("en-US", { timeZone: 'America/Denver',
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const paymentMethodLabel = data.paymentMethod === "paypal" ? "PayPal" : "Venmo";
  const hasDiscount = parseFloat(data.discountAmount) > 0;
  const supportEmail = data.supportEmail || "support@omegalongevity.com";

  const itemsText = data.items.map(item => {
    const lineTotal = (parseFloat(item.pricePerUnit) * item.quantity).toFixed(2);
    return `  - ${item.name} x${item.quantity} @ $${item.pricePerUnit} = $${lineTotal}`;
  }).join("\n");

  let text = `OMEGA LONGEVITY - ORDER CONFIRMATION
=====================================

Hi ${data.customerName},

Great news! Your order has been confirmed and is being processed.

ORDER DETAILS
-------------
Order Number: #${data.orderId}
Payment Method: ${paymentMethodLabel}
Order Date: ${formattedDate}
`;

  if (data.paypalOrderId) {
    text += `Transaction ID: ${data.paypalOrderId}\n`;
  }

  text += `
ITEMS ORDERED
-------------
${itemsText}

ORDER TOTAL
-----------
Subtotal: $${data.subtotal}
`;

  if (hasDiscount) {
    text += `Member Discount (10%): -$${data.discountAmount}\n`;
  }

  text += `Total Paid: $${data.total}
`;

  if (data.paymentMethod === "venmo") {
    text += `
VENMO PAYMENT NOTE
Your Venmo payment has been recorded. Please allow 1-2 business days for final confirmation.
`;
  }

  if (data.trackingNumber) {
    text += `
TRACKING INFORMATION
--------------------
Tracking Number: ${data.trackingNumber}
${data.trackingUrl ? `Track your package: ${data.trackingUrl}` : ''}
`;
  }

  text += `
SHIPPING INFORMATION
--------------------
• Estimated Delivery: 5-7 business days
• Shipping Schedule: We ship out on average twice a week
• You will receive a shipping confirmation with tracking info once your order ships
• Expedited Shipping: Available upon special request. Email ${supportEmail} for urgent shipping needs

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
This email was sent to ${data.customerEmail}
`;

  return text;
}
