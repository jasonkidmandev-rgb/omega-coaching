import { getEmailBrandingSettings } from '../db';

export interface ShippingNotificationData {
  customerName: string;
  customerEmail: string;
  orderId: number;
  trackingNumber: string;
  trackingCarrier: string;
  items: Array<{ name: string; quantity: number }>;
}

export async function generateShippingNotificationEmail(data: ShippingNotificationData): Promise<{ subject: string; html: string }> {
  const branding = await getEmailBrandingSettings();
  
  const carrierUrls: Record<string, string> = {
    'USPS': 'https://tools.usps.com/go/TrackConfirmAction?tLabels=',
    'UPS': 'https://www.ups.com/track?tracknum=',
    'FedEx': 'https://www.fedex.com/fedextrack/?trknbr=',
    'DHL': 'https://www.dhl.com/us-en/home/tracking/tracking-express.html?submit=1&tracking-id=',
    'Other': '',
  };
  
  const trackingUrl = carrierUrls[data.trackingCarrier] 
    ? `${carrierUrls[data.trackingCarrier]}${data.trackingNumber}`
    : '';

  const itemsList = data.items.map(item => 
    `<tr>
      <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${item.name}</td>
      <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
    </tr>`
  ).join('');

  const subject = `Your Order #${data.orderId} Has Shipped! 📦`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, ${branding?.primaryColor || '#f97316'}, ${branding?.secondaryColor || '#ea580c'}); padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">📦 Your Order Has Shipped!</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 30px;">
              <p style="color: #333; font-size: 16px; margin: 0 0 20px;">
                Hi ${data.customerName},
              </p>
              
              <p style="color: #333; font-size: 16px; margin: 0 0 20px;">
                Great news! Your order <strong>#${data.orderId}</strong> is on its way to you.
              </p>
              
              <!-- Tracking Info -->
              <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <h3 style="color: #333; margin: 0 0 15px; font-size: 18px;">Tracking Information</h3>
                <p style="color: #666; margin: 0 0 10px;">
                  <strong>Carrier:</strong> ${data.trackingCarrier}
                </p>
                <p style="color: #666; margin: 0 0 15px;">
                  <strong>Tracking Number:</strong> ${data.trackingNumber}
                </p>
                ${trackingUrl ? `
                <a href="${trackingUrl}" target="_blank" style="display: inline-block; background-color: ${branding?.primaryColor || '#f97316'}; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold;">
                  Track Your Package
                </a>
                ` : ''}
              </div>
              
              <!-- Order Items -->
              <h3 style="color: #333; margin: 20px 0 15px; font-size: 18px;">Items in Your Order</h3>
              <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #eee; border-radius: 8px;">
                <thead>
                  <tr style="background-color: #f8f9fa;">
                    <th style="padding: 12px; text-align: left; border-bottom: 2px solid #eee;">Item</th>
                    <th style="padding: 12px; text-align: center; border-bottom: 2px solid #eee;">Qty</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsList}
                </tbody>
              </table>
              
              <p style="color: #666; font-size: 14px; margin: 30px 0 0;">
                If you have any questions about your order, please don't hesitate to reach out.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eee;">
              <p style="color: #666; font-size: 12px; margin: 0;">
                ${branding?.companyName || 'Omega Longevity'}<br>
                ${branding?.footerText || 'Thank you for your order!'}
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

  return { subject, html };
}
