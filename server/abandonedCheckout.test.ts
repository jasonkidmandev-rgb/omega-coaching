import { describe, it, expect } from 'vitest';
import { generateAbandonedCheckoutEmail } from './emailTemplates/abandonedCheckoutRecovery';

describe('Abandoned Checkout Recovery Email', () => {
  const baseData = {
    clientName: 'John Smith',
    planName: 'Protocol Essentials',
    planPrice: 750,
    planKey: 'essentials',
    checkoutUrl: 'https://peptidecoach.pro/transformation/checkout?plan=essentials',
  };

  it('should generate valid HTML email', () => {
    const html = generateAbandonedCheckoutEmail(baseData);
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('</html>');
  });

  it('should include the client first name in greeting', () => {
    const html = generateAbandonedCheckoutEmail(baseData);
    expect(html).toContain('Hey John');
  });

  it('should include the plan name', () => {
    const html = generateAbandonedCheckoutEmail(baseData);
    expect(html).toContain('Protocol Essentials');
  });

  it('should include the plan price', () => {
    const html = generateAbandonedCheckoutEmail(baseData);
    expect(html).toContain('$750');
  });

  it('should include the checkout URL in the CTA button', () => {
    const html = generateAbandonedCheckoutEmail(baseData);
    expect(html).toContain('href="https://peptidecoach.pro/transformation/checkout?plan=essentials"');
  });

  it('should include plan-specific benefits for essentials', () => {
    const html = generateAbandonedCheckoutEmail(baseData);
    expect(html).toContain('Peptide Coach Self-Guided Check-ins');
    expect(html).toContain('Protocol delivered within 5 business days');
  });

  it('should include plan-specific benefits for flagship coaching', () => {
    const html = generateAbandonedCheckoutEmail({
      ...baseData,
      planKey: 'flagship',
      planName: 'Weight Loss & Physique',
      planPrice: 3000,
    });
    expect(html).toContain('90-day coaching');
    expect(html).toContain('Weekly 1-on-1 coaching sessions');
  });

  it('should include plan-specific benefits for elite plans', () => {
    const html = generateAbandonedCheckoutEmail({
      ...baseData,
      planKey: 'functional_health_elite',
      planName: 'Functional Health Elite',
      planPrice: 8500,
    });
    expect(html).toContain('4-month functional health transformation');
    expect(html).toContain('2-hour elite strategy session');
  });

  it('should include plan-specific benefits for coaching sessions', () => {
    const html = generateAbandonedCheckoutEmail({
      ...baseData,
      planKey: 'coaching_20min',
      planName: 'Targeted Focus Call',
      planPrice: 125,
    });
    expect(html).toContain('20-minute focused 1-on-1 session');
    expect(html).toContain('Dosing adjustments');
  });

  it('should include the $75 strategy session link for questions', () => {
    const html = generateAbandonedCheckoutEmail(baseData);
    expect(html).toContain('$75 Strategy Session');
    expect(html).toContain('calendly.com/omegalongevity/75-strategy-session');
  });

  it('should include Omega Longevity branding', () => {
    const html = generateAbandonedCheckoutEmail(baseData);
    expect(html).toContain('Omega Longevity');
    expect(html).toContain('Peptide Coach Pro');
    expect(html).toContain('peptidecoach.pro');
  });

  it('should include the CTA button text', () => {
    const html = generateAbandonedCheckoutEmail(baseData);
    expect(html).toContain('Complete Your Checkout');
  });

  it('should handle single-name clients', () => {
    const html = generateAbandonedCheckoutEmail({
      ...baseData,
      clientName: 'Jason',
    });
    expect(html).toContain('Hey Jason');
  });

  it('should handle "there" as fallback name', () => {
    const html = generateAbandonedCheckoutEmail({
      ...baseData,
      clientName: 'there',
    });
    expect(html).toContain('Hey there');
  });

  it('should format large prices with commas', () => {
    const html = generateAbandonedCheckoutEmail({
      ...baseData,
      planPrice: 15000,
      planKey: 'elite',
      planName: 'Elite Longevity',
    });
    expect(html).toContain('$15,000');
  });

  it('should include the branded header text (logo removed)', () => {
    const html = generateAbandonedCheckoutEmail(baseData);
    expect(html).toContain('Omega Longevity');
  });
});
