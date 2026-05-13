/**
 * Abandoned Checkout Recovery Email Template
 * Sent to users who started the checkout flow but didn't complete payment within 24 hours.
 * Designed to be warm, non-pushy, and conversion-focused.
 */

export interface AbandonedCheckoutEmailData {
  clientName: string;
  planName: string;
  planPrice: number;
  planKey: string;
  checkoutUrl: string;
}

function getPlanBenefits(planKey: string): string[] {
  const benefits: Record<string, string[]> = {
    essentials: [
      "Personalized peptide protocol designed for your goals",
      "Peptide Coach Self-Guided Check-ins",
      "Full access to the Peptide Education Masterclass",
      "Protocol delivered within 5 business days",
    ],
    flagship: [
      "Personalized peptide protocol + 90-day coaching",
      "Weekly 1-on-1 coaching sessions",
      "Full access to the Peptide Education Masterclass",
      "Discovery & program review session",
    ],
    advanced: [
      "Advanced peptide protocol + 90-day coaching",
      "Weekly 1-on-1 coaching sessions",
      "Full access to the Peptide Education Masterclass",
      "Discovery & program review session",
    ],
    recovery: [
      "Recovery-focused peptide protocol + 90-day coaching",
      "Weekly 1-on-1 coaching sessions",
      "Full access to the Peptide Education Masterclass",
      "Discovery & program review session",
    ],
    immunity: [
      "Immunity-focused peptide protocol + 90-day coaching",
      "Weekly 1-on-1 coaching sessions",
      "Full access to the Peptide Education Masterclass",
      "Discovery & program review session",
    ],
    longevity: [
      "Longevity peptide protocol + 90-day coaching",
      "Weekly 1-on-1 coaching sessions",
      "Full access to the Peptide Education Masterclass",
      "Discovery & program review session",
    ],
    mitochondria: [
      "Mitochondrial optimization protocol + 90-day coaching",
      "Weekly 1-on-1 coaching sessions",
      "Full access to the Peptide Education Masterclass",
      "Discovery & program review session",
    ],
    functional_health_elite: [
      "Elite 4-month functional health transformation",
      "Bi-weekly deep-dive coaching sessions",
      "Full access to the Peptide Education Masterclass",
      "2-hour elite strategy session",
    ],
    elite: [
      "Premium 6-month longevity transformation",
      "Bi-weekly deep-dive coaching sessions",
      "Full access to the Peptide Education Masterclass",
      "2-hour elite strategy session",
    ],
    coaching_20min: [
      "20-minute focused 1-on-1 session",
      "Quick answers to protocol questions",
      "Dosing adjustments & troubleshooting",
    ],
    coaching_60min: [
      "60-minute comprehensive 1-on-1 session",
      "Full protocol review & optimization",
      "Custom peptide stack recommendations",
    ],
  };
  return benefits[planKey] || benefits.flagship;
}

export function generateAbandonedCheckoutEmail(data: AbandonedCheckoutEmailData): string {
  const { clientName, planName, planPrice, planKey, checkoutUrl } = data;
  const benefits = getPlanBenefits(planKey);
  const firstName = clientName.split(" ")[0] || "there";

  const benefitsHtml = benefits
    .map(
      (b) => `
      <tr>
        <td style="padding: 6px 0; font-size: 15px; color: #334155; line-height: 1.5;">
          <span style="color: #D97706; font-weight: bold; margin-right: 8px;">&#10003;</span> ${b}
        </td>
      </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your ${planName} is waiting</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f1f5f9;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.07);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); padding: 32px 40px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">Omega Longevity</h1>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 40px;">
              <h1 style="margin: 0 0 16px 0; font-size: 24px; color: #1e293b; font-weight: 700;">
                Hey ${firstName}, you were so close!
              </h1>
              <p style="margin: 0 0 24px 0; font-size: 16px; color: #475569; line-height: 1.6;">
                We noticed you started exploring the <strong style="color: #1e293b;">${planName}</strong> but didn't finish checking out. No worries — your spot is still available and we saved your progress.
              </p>

              <!-- Plan Summary Card -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #fefce8; border: 1px solid #fde68a; border-radius: 8px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td>
                          <p style="margin: 0 0 4px 0; font-size: 13px; color: #92400e; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Your Selected Plan</p>
                          <p style="margin: 0 0 4px 0; font-size: 20px; color: #1e293b; font-weight: 700;">${planName}</p>
                          <p style="margin: 0; font-size: 24px; color: #D97706; font-weight: 800;">$${planPrice.toLocaleString('en-US', { timeZone: 'America/Denver' })}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Benefits -->
              <p style="margin: 0 0 12px 0; font-size: 16px; color: #1e293b; font-weight: 600;">Here's what's included:</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 28px;">
                ${benefitsHtml}
              </table>

              <!-- CTA Button -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 8px 0 24px 0;">
                    <a href="${checkoutUrl}" style="display: inline-block; background: linear-gradient(135deg, #D97706 0%, #B45309 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 17px; font-weight: 700; letter-spacing: 0.3px;">
                      Complete Your Checkout &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 16px 0; font-size: 14px; color: #64748b; line-height: 1.6; text-align: center;">
                Your checkout takes less than 2 minutes to complete.
              </p>

              <!-- Divider -->
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />

              <!-- Questions section -->
              <p style="margin: 0 0 8px 0; font-size: 15px; color: #1e293b; font-weight: 600;">Have questions?</p>
              <p style="margin: 0; font-size: 14px; color: #64748b; line-height: 1.6;">
                We're here to help. Reply to this email or book a 
                <a href="https://calendly.com/jason-vigilanttechs/20-minute-consult-95" style="color: #D97706; text-decoration: underline;">Free Consultation</a> 
                to discuss your goals with a coach before committing.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 24px 40px; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0 0 8px 0; font-size: 12px; color: #94a3b8; text-align: center;">
                Omega Longevity | Peptide Coach Pro
              </p>
              <p style="margin: 0; font-size: 12px; color: #94a3b8; text-align: center;">
                You're receiving this because you started a checkout at 
                <a href="https://peptidecoach.pro" style="color: #D97706;">peptidecoach.pro</a>.
                If this wasn't you, you can safely ignore this email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
