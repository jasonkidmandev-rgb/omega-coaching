import { getEmailBrandingSettings } from '../db';

export interface LowStockAlertData {
  items: Array<{
    id: number;
    name: string;
    sku: string | null;
    quantity: number;
    lowStockThreshold: number;
    categoryName: string;
  }>;
  adminName: string;
}

export async function generateLowStockAlertEmail(data: LowStockAlertData): Promise<{ subject: string; html: string }> {
  const branding = await getEmailBrandingSettings();
  
  const criticalItems = data.items.filter(i => i.quantity === 0);
  const lowItems = data.items.filter(i => i.quantity > 0);

  const criticalItemsHtml = criticalItems.length > 0 ? `
    <div style="margin-bottom: 30px;">
      <h3 style="color: #dc2626; margin: 0 0 15px; font-size: 18px;">🚨 Out of Stock (${criticalItems.length} items)</h3>
      <table width="100%" cellpadding="0" cellspacing="0" style="border: 2px solid #dc2626; border-radius: 8px; overflow: hidden;">
        <thead>
          <tr style="background-color: #fef2f2;">
            <th style="padding: 12px; text-align: left; border-bottom: 1px solid #fecaca;">Item</th>
            <th style="padding: 12px; text-align: left; border-bottom: 1px solid #fecaca;">SKU</th>
            <th style="padding: 12px; text-align: left; border-bottom: 1px solid #fecaca;">Category</th>
            <th style="padding: 12px; text-align: center; border-bottom: 1px solid #fecaca;">Stock</th>
          </tr>
        </thead>
        <tbody>
          ${criticalItems.map(item => `
            <tr style="background-color: #fff5f5;">
              <td style="padding: 10px 12px; border-bottom: 1px solid #fecaca; font-weight: 600;">${item.name}</td>
              <td style="padding: 10px 12px; border-bottom: 1px solid #fecaca; font-family: monospace; color: #666;">${item.sku || 'N/A'}</td>
              <td style="padding: 10px 12px; border-bottom: 1px solid #fecaca;">${item.categoryName}</td>
              <td style="padding: 10px 12px; border-bottom: 1px solid #fecaca; text-align: center; color: #dc2626; font-weight: bold;">0</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  ` : '';

  const lowItemsHtml = lowItems.length > 0 ? `
    <div style="margin-bottom: 30px;">
      <h3 style="color: #f59e0b; margin: 0 0 15px; font-size: 18px;">⚠️ Low Stock (${lowItems.length} items)</h3>
      <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #fcd34d; border-radius: 8px; overflow: hidden;">
        <thead>
          <tr style="background-color: #fffbeb;">
            <th style="padding: 12px; text-align: left; border-bottom: 1px solid #fcd34d;">Item</th>
            <th style="padding: 12px; text-align: left; border-bottom: 1px solid #fcd34d;">SKU</th>
            <th style="padding: 12px; text-align: left; border-bottom: 1px solid #fcd34d;">Category</th>
            <th style="padding: 12px; text-align: center; border-bottom: 1px solid #fcd34d;">Stock</th>
            <th style="padding: 12px; text-align: center; border-bottom: 1px solid #fcd34d;">Threshold</th>
          </tr>
        </thead>
        <tbody>
          ${lowItems.map(item => `
            <tr>
              <td style="padding: 10px 12px; border-bottom: 1px solid #fef3c7;">${item.name}</td>
              <td style="padding: 10px 12px; border-bottom: 1px solid #fef3c7; font-family: monospace; color: #666;">${item.sku || 'N/A'}</td>
              <td style="padding: 10px 12px; border-bottom: 1px solid #fef3c7;">${item.categoryName}</td>
              <td style="padding: 10px 12px; border-bottom: 1px solid #fef3c7; text-align: center; color: #f59e0b; font-weight: bold;">${item.quantity}</td>
              <td style="padding: 10px 12px; border-bottom: 1px solid #fef3c7; text-align: center; color: #666;">${item.lowStockThreshold}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  ` : '';

  const subject = `⚠️ Low Stock Alert: ${data.items.length} items need attention`;

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
            <td style="background: linear-gradient(135deg, ${branding?.primaryColor || '#f97316'}, ${branding?.secondaryColor || '#ea580c'}); padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">📦 Inventory Low Stock Alert</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 30px;">
              <p style="color: #333; font-size: 16px; margin: 0 0 20px;">
                Hi ${data.adminName},
              </p>
              
              <p style="color: #333; font-size: 16px; margin: 0 0 25px;">
                The following inventory items are running low and may need to be reordered:
              </p>
              
              ${criticalItemsHtml}
              ${lowItemsHtml}
              
              <div style="background-color: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 15px; margin-top: 20px;">
                <p style="color: #0369a1; margin: 0; font-size: 14px;">
                  <strong>💡 Tip:</strong> You can update low stock thresholds for individual items in the Inventory Management page to customize when you receive alerts.
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eee;">
              <p style="color: #666; font-size: 12px; margin: 0;">
                ${branding?.companyName || 'Omega Longevity'}<br>
                This is an automated inventory alert.
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
