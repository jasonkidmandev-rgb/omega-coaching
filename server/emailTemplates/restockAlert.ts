import { getEmailBrandingSettings } from '../db';

export interface RestockAlertData {
  items: Array<{
    id: number;
    name: string;
    sku: string | null;
    quantity: number;
    categoryName: string;
    triggeredBy?: string; // e.g., "Protocol #60001 - Kellie"
  }>;
  threshold: number;
  adminName: string;
  customSubject?: string;
  customIntro?: string;
}

export async function generateRestockAlertEmail(data: RestockAlertData): Promise<{ subject: string; html: string }> {
  const branding = await getEmailBrandingSettings();

  const itemsHtml = data.items.map(item => `
    <tr style="background-color: ${item.quantity < 0 ? '#fff5f5' : '#fffbeb'};">
      <td style="padding: 10px 12px; border-bottom: 1px solid #fecaca; font-weight: 600;">${item.name}</td>
      <td style="padding: 10px 12px; border-bottom: 1px solid #fecaca; font-family: monospace; color: #666;">${item.sku || 'N/A'}</td>
      <td style="padding: 10px 12px; border-bottom: 1px solid #fecaca;">${item.categoryName}</td>
      <td style="padding: 10px 12px; border-bottom: 1px solid #fecaca; text-align: center; color: ${item.quantity < 0 ? '#dc2626' : '#f59e0b'}; font-weight: bold;">${item.quantity}</td>
      <td style="padding: 10px 12px; border-bottom: 1px solid #fecaca; font-size: 12px; color: #666;">${item.triggeredBy || ''}</td>
    </tr>
  `).join('');

  const negativeCount = data.items.filter(i => i.quantity < 0).length;
  const defaultSubject = `🔴 Restock Alert: ${data.items.length} item${data.items.length > 1 ? 's' : ''} below threshold (${data.threshold})`;
  const subject = data.customSubject
    ? data.customSubject.replace('{{count}}', data.items.length.toString()).replace('{{threshold}}', data.threshold.toString())
    : defaultSubject;

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
        <table width="700" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #dc2626, #b91c1c); padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">🔴 Restock Required</h1>
              <p style="color: #fecaca; margin: 10px 0 0; font-size: 14px;">
                ${data.items.length} item${data.items.length > 1 ? 's have' : ' has'} dropped below the restock threshold of ${data.threshold}
              </p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 30px;">
              <p style="color: #333; font-size: 16px; margin: 0 0 20px;">
                Hi ${data.adminName},
              </p>
              
              <p style="color: #333; font-size: 16px; margin: 0 0 25px;">
                ${data.customIntro || `The following inventory items have dropped below your configured restock threshold of <strong>${data.threshold}</strong> and need to be reordered:`}
              </p>
              
              ${negativeCount > 0 ? `
              <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 12px; margin-bottom: 20px;">
                <p style="color: #dc2626; margin: 0; font-size: 14px; font-weight: 600;">
                  ⚠️ ${negativeCount} item${negativeCount > 1 ? 's have' : ' has'} negative stock — these items were sold but are not physically in inventory.
                </p>
              </div>
              ` : ''}

              <table width="100%" cellpadding="0" cellspacing="0" style="border: 2px solid #dc2626; border-radius: 8px; overflow: hidden;">
                <thead>
                  <tr style="background-color: #fef2f2;">
                    <th style="padding: 12px; text-align: left; border-bottom: 1px solid #fecaca;">Item</th>
                    <th style="padding: 12px; text-align: left; border-bottom: 1px solid #fecaca;">SKU</th>
                    <th style="padding: 12px; text-align: left; border-bottom: 1px solid #fecaca;">Category</th>
                    <th style="padding: 12px; text-align: center; border-bottom: 1px solid #fecaca;">Stock</th>
                    <th style="padding: 12px; text-align: left; border-bottom: 1px solid #fecaca;">Triggered By</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                </tbody>
              </table>
              
              <div style="background-color: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 15px; margin-top: 20px;">
                <p style="color: #0369a1; margin: 0; font-size: 14px;">
                  <strong>💡 Tip:</strong> You can adjust the restock threshold and excluded categories in Admin Settings → Inventory Alerts.
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eee;">
              <p style="color: #666; font-size: 12px; margin: 0;">
                ${branding?.companyName || 'Omega Longevity'}<br>
                This is an automated restock alert. Configure in Admin Settings.
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
