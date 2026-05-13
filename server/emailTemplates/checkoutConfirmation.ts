/**
 * Checkout Confirmation Email Template
 * Sent to clients after completing the transformation checkout flow
 * (payment + intake form + optional scheduling)
 * Branded for Omega Longevity / Peptide Coach
 */

export type CheckoutPlanType = 
  | 'coaching_20min' 
  | 'coaching_60min' 
  | 'essentials' 
  | 'flagship' 
  | 'advanced' 
  | 'recovery' 
  | 'immunity' 
  | 'longevity' 
  | 'mitochondria' 
  | 'functional_health_elite' 
  | 'elite';

export interface CheckoutConfirmationData {
  clientName: string;
  clientEmail: string;
  planKey: CheckoutPlanType;
  planName: string;
  planPrice: number;
  paymentMethod: 'paypal' | 'venmo' | 'other';
  intakeCompleted: boolean;
  discoveryScheduled: boolean;
  discoveryCalendlyUrl?: string;
  enrollmentId?: number;
}

// Plan metadata for email content
const PLAN_META: Record<string, {
  category: 'coaching_session' | 'essentials' | 'coached' | 'elite';
  duration?: string;
  sessionDuration?: string;
}> = {
  coaching_20min: { category: 'coaching_session', sessionDuration: '20 minutes' },
  coaching_60min: { category: 'coaching_session', sessionDuration: '60 minutes' },
  essentials: { category: 'essentials' },
  flagship: { category: 'coached', duration: '90 days' },
  advanced: { category: 'coached', duration: '90 days' },
  recovery: { category: 'coached', duration: '90 days' },
  immunity: { category: 'coached', duration: '90 days' },
  longevity: { category: 'coached', duration: '90 days' },
  mitochondria: { category: 'coached', duration: '90 days' },
  functional_health_elite: { category: 'elite', duration: '4 months' },
  elite: { category: 'elite', duration: '6 months' },
};

// Calendly URLs for strategy sessions
const CALENDLY_URLS: Record<string, string> = {
  default: 'https://calendly.com/jason-vigilanttechs/60-minute-strategy',
  functional_health_elite: 'https://calendly.com/jason-vigilanttechs/60-minute-strategy',
  elite: 'https://calendly.com/jason-vigilanttechs/2-hour-elite-longevity',
};

function getCalendlyUrl(planKey: string): string {
  return CALENDLY_URLS[planKey] || CALENDLY_URLS.default;
}

function getNextSteps(data: CheckoutConfirmationData): string[] {
  const meta = PLAN_META[data.planKey];
  if (!meta) return [];

  if (meta.category === 'coaching_session') {
    const steps: string[] = [];
    steps.push(`Your ${meta.sessionDuration} coaching session has been confirmed.`);
    if (!data.intakeCompleted) {
      steps.push('Complete your intake form before the session to help your coach prepare (optional but recommended).');
    } else {
      steps.push('Your intake form has been received — your coach will review it before your session.');
    }
    steps.push('You will receive a calendar invite with your session link and details.');
    steps.push('Come prepared with your top questions or concerns for the most productive session.');
    return steps;
  }

  if (meta.category === 'essentials') {
    return [
      'Your coach is now building your personalized peptide protocol.',
      'Expect delivery of your protocol within <strong>5 business days</strong>.',
      'You will receive an email notification when your protocol is ready to view.',
      'In the meantime, explore the free peptide masterclass to prepare for your journey.',
      'Need 1-on-1 support? You can book a coaching call anytime ($125/20 min or $350/hr).',
    ];
  }

  // Coached and Elite plans
  const steps: string[] = [];
  steps.push('Your coach is reviewing your intake form and preparing for your strategy session.');
  
  if (!data.discoveryScheduled) {
    const calendlyUrl = data.discoveryCalendlyUrl || getCalendlyUrl(data.planKey);
    const sessionLabel = (meta.category === 'elite') ? '2-hour deep-dive' : '60-minute strategy';
    steps.push(`<strong>Schedule your ${sessionLabel} session now:</strong> <a href="${calendlyUrl}" style="color: #f97316; text-decoration: underline;">${calendlyUrl}</a>`);
  } else {
    steps.push('Your strategy session is scheduled — check your calendar for the invite.');
  }

  steps.push(`Your personalized protocol will be designed during your ${meta.duration || '90-day'} program.`);
  steps.push('Access the free peptide masterclass anytime to deepen your knowledge.');
  
  if (meta.category === 'elite') {
    steps.push('As an Elite member, you have priority access to your coach throughout your program.');
  }

  return steps;
}

function getProgramRoadmap(data: CheckoutConfirmationData): string {
  const meta = PLAN_META[data.planKey];
  if (!meta) return '';

  if (meta.category === 'coaching_session') {
    return ''; // No roadmap for one-off sessions
  }

  if (meta.category === 'essentials') {
    return `
      <div style="background-color: #0f172a; border-radius: 12px; padding: 24px; margin: 24px 0;">
        <h3 style="color: #f97316; margin: 0 0 16px 0; font-size: 16px;">Your Protocol Essentials Timeline</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 10px 12px; border-bottom: 1px solid #1e293b; color: #22c55e; font-weight: 600; width: 100px; vertical-align: top;">Now</td>
            <td style="padding: 10px 12px; border-bottom: 1px solid #1e293b; color: #e2e8f0;">Payment confirmed &amp; intake form received</td>
          </tr>
          <tr>
            <td style="padding: 10px 12px; border-bottom: 1px solid #1e293b; color: #f97316; font-weight: 600; vertical-align: top;">Days 1-5</td>
            <td style="padding: 10px 12px; border-bottom: 1px solid #1e293b; color: #e2e8f0;">Your coach builds your personalized protocol</td>
          </tr>
          <tr>
            <td style="padding: 10px 12px; border-bottom: 1px solid #1e293b; color: #94a3b8; font-weight: 600; vertical-align: top;">Day 5</td>
            <td style="padding: 10px 12px; border-bottom: 1px solid #1e293b; color: #e2e8f0;">Protocol delivered — review &amp; begin your journey</td>
          </tr>
          <tr>
            <td style="padding: 10px 12px; color: #94a3b8; font-weight: 600; vertical-align: top;">Ongoing</td>
            <td style="padding: 10px 12px; color: #e2e8f0;">Self-guided check-ins &amp; optional coaching calls available</td>
          </tr>
        </table>
      </div>
    `;
  }

  // Coached and Elite plans
  const sessionLabel = (meta.category === 'elite') ? '2-hour deep-dive session' : '60-minute strategy session';
  const protocolPhase = (meta.category === 'elite') ? 'Comprehensive protocol design &amp; optimization' : 'Personalized protocol design';
  
  return `
    <div style="background-color: #0f172a; border-radius: 12px; padding: 24px; margin: 24px 0;">
      <h3 style="color: #f97316; margin: 0 0 16px 0; font-size: 16px;">Your ${meta.duration || '90-Day'} Program Roadmap</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 10px 12px; border-bottom: 1px solid #1e293b; color: #22c55e; font-weight: 600; width: 120px; vertical-align: top;">Now</td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #1e293b; color: #e2e8f0;">Payment confirmed &amp; intake form received</td>
        </tr>
        <tr>
          <td style="padding: 10px 12px; border-bottom: 1px solid #1e293b; color: #f97316; font-weight: 600; vertical-align: top;">This Week</td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #1e293b; color: #e2e8f0;">${sessionLabel} with your coach</td>
        </tr>
        <tr>
          <td style="padding: 10px 12px; border-bottom: 1px solid #1e293b; color: #94a3b8; font-weight: 600; vertical-align: top;">Week 1-2</td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #1e293b; color: #e2e8f0;">${protocolPhase}</td>
        </tr>
        <tr>
          <td style="padding: 10px 12px; border-bottom: 1px solid #1e293b; color: #94a3b8; font-weight: 600; vertical-align: top;">Week 3</td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #1e293b; color: #e2e8f0;">Progress check-in &amp; protocol adjustments</td>
        </tr>
        <tr>
          <td style="padding: 10px 12px; color: #94a3b8; font-weight: 600; vertical-align: top;">Ongoing</td>
          <td style="padding: 10px 12px; color: #e2e8f0;">Guided coaching, optimization &amp; final review</td>
        </tr>
      </table>
    </div>
  `;
}

export function generateCheckoutConfirmationHTML(data: CheckoutConfirmationData): string {
  const siteUrl = process.env.VITE_APP_URL || 'https://peptidecoach.pro';
  const supportEmail = 'omega@omegalongevity.com';
  const meta = PLAN_META[data.planKey];
  const nextSteps = getNextSteps(data);
  const roadmap = getProgramRoadmap(data);
  const paymentMethodLabel = data.paymentMethod === 'paypal' ? 'PayPal' : data.paymentMethod === 'venmo' ? 'Venmo' : 'Payment';
  const formattedDate = new Date().toLocaleDateString('en-US', { timeZone: 'America/Denver', year: 'numeric', month: 'long', day: 'numeric' });

  // Subject line helper
  const isSession = meta?.category === 'coaching_session';
  const isEssentials = meta?.category === 'essentials';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Enrollment Confirmed - Omega Longevity</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    
    <!-- Main Content Card -->
    <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 16px; overflow: hidden;">
      
      <!-- Orange Header Banner -->
      <div style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 28px 30px; text-align: center;">
        <div style="font-size: 36px; margin-bottom: 8px;">&#10003;</div>
        <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">
          ${isSession ? 'Session Confirmed!' : isEssentials ? 'Enrollment Confirmed!' : 'Welcome to Your Transformation!'}
        </h1>
      </div>

      <div style="padding: 30px;">
        <!-- Greeting -->
        <p style="color: #e2e8f0; font-size: 16px; margin: 0 0 8px 0;">
          Hi <strong style="color: #f97316;">${data.clientName}</strong>,
        </p>
        <p style="color: #94a3b8; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
          ${isSession 
            ? 'Your coaching session has been booked. Here are your details.' 
            : isEssentials 
              ? 'Thank you for enrolling in Protocol Essentials. Your personalized protocol is on its way.'
              : 'Congratulations on taking the first step toward elite-level health optimization. Here is everything you need to know about your program.'}
        </p>

        <!-- Purchase Summary Box -->
        <div style="background-color: rgba(34, 197, 94, 0.08); border: 1px solid rgba(34, 197, 94, 0.3); border-radius: 12px; padding: 20px; margin-bottom: 24px;">
          <h3 style="color: #22c55e; margin: 0 0 16px 0; font-size: 15px; font-weight: 600;">Purchase Summary</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #94a3b8; font-size: 14px;">Program</td>
              <td style="padding: 8px 0; color: #e2e8f0; font-size: 14px; font-weight: 600; text-align: right;">${data.planName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #94a3b8; font-size: 14px;">Amount Paid</td>
              <td style="padding: 8px 0; color: #22c55e; font-size: 18px; font-weight: 700; text-align: right;">$${data.planPrice.toLocaleString('en-US', { timeZone: 'America/Denver' })}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #94a3b8; font-size: 14px;">Payment Method</td>
              <td style="padding: 8px 0; color: #e2e8f0; font-size: 14px; text-align: right;">${paymentMethodLabel}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #94a3b8; font-size: 14px;">Date</td>
              <td style="padding: 8px 0; color: #e2e8f0; font-size: 14px; text-align: right;">${formattedDate}</td>
            </tr>
            ${data.intakeCompleted ? `
            <tr>
              <td style="padding: 8px 0; color: #94a3b8; font-size: 14px;">Intake Form</td>
              <td style="padding: 8px 0; color: #22c55e; font-size: 14px; text-align: right;">&#10003; Completed</td>
            </tr>` : ''}
          </table>
        </div>

        <!-- Next Steps -->
        <div style="background-color: #0f172a; border-radius: 12px; padding: 24px; margin-bottom: 24px; border-left: 4px solid #f97316;">
          <h3 style="color: #f97316; margin: 0 0 16px 0; font-size: 16px; font-weight: 600;">What Happens Next</h3>
          <table style="width: 100%; border-collapse: collapse;">
            ${nextSteps.map((step, i) => `
            <tr>
              <td style="padding: 8px 0; color: #f97316; font-weight: 700; font-size: 14px; width: 28px; vertical-align: top;">${i + 1}.</td>
              <td style="padding: 8px 0; color: #e2e8f0; font-size: 14px; line-height: 1.5;">${step}</td>
            </tr>`).join('')}
          </table>
        </div>

        <!-- Program Roadmap (if applicable) -->
        ${roadmap}

        <!-- CTA Button -->
        <div style="text-align: center; margin: 28px 0;">
          <a href="${siteUrl}/transformation" style="display: inline-block; background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: 600;">
            ${isSession ? 'View Your Dashboard' : 'View Your Program'}
          </a>
        </div>

        <!-- Platform Features -->
        <div style="background-color: #0f172a; border-radius: 12px; padding: 24px; margin-top: 24px;">
          <h3 style="color: #94a3b8; margin: 0 0 16px 0; font-size: 14px; text-align: center; text-transform: uppercase; letter-spacing: 1px;">Explore Omega Longevity</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="width: 50%; padding: 8px; text-align: center;">
                <a href="${siteUrl}/transformation/masterclass" style="color: #e2e8f0; text-decoration: none; font-size: 13px;">&#127891; Free Masterclass</a>
              </td>
              <td style="width: 50%; padding: 8px; text-align: center;">
                <a href="${siteUrl}/order" style="color: #e2e8f0; text-decoration: none; font-size: 13px;">&#128722; Omega Store</a>
              </td>
            </tr>
            <tr>
              <td style="width: 50%; padding: 8px; text-align: center;">
                <a href="${siteUrl}/peptide-cheat-sheet" style="color: #e2e8f0; text-decoration: none; font-size: 13px;">&#128203; Peptide Cheat Sheet</a>
              </td>
              <td style="width: 50%; padding: 8px; text-align: center;">
                <a href="${siteUrl}/launchpad#podcast" style="color: #e2e8f0; text-decoration: none; font-size: 13px;">&#127908; Inside Omega Podcast</a>
              </td>
            </tr>
          </table>
        </div>
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
      <p style="margin: 0; font-size: 11px; color: #475569;">
        &copy; ${new Date().getFullYear()} Omega Longevity. All rights reserved.<br>
        This email was sent to ${data.clientEmail}
      </p>
    </div>
  </div>
</body>
</html>
  `;
}

export function getCheckoutConfirmationSubject(data: CheckoutConfirmationData): string {
  const meta = PLAN_META[data.planKey];
  if (!meta) return '✓ Enrollment Confirmed - Omega Longevity';
  
  switch (meta.category) {
    case 'coaching_session':
      return `✓ Coaching Session Confirmed - ${data.planName} | Omega Longevity`;
    case 'essentials':
      return '✓ Protocol Essentials Enrollment Confirmed | Omega Longevity';
    case 'elite':
      return `✓ Welcome to ${data.planName} - Omega Longevity`;
    default:
      return `✓ ${data.planName} - Enrollment Confirmed | Omega Longevity`;
  }
}
