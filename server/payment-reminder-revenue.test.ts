import { describe, it, expect } from 'vitest';
import { paymentHistoryRouter } from './payment/historyRouter';
import * as paymentReminderCron from './cron/paymentReminderCron';

describe('Payment Reminder and Revenue Features', () => {
  describe('Payment Reminder Cron', () => {
    it('should export startPaymentReminderCron function', () => {
      expect(typeof paymentReminderCron.startPaymentReminderCron).toBe('function');
    });

    it('should export stopPaymentReminderCron function', () => {
      expect(typeof paymentReminderCron.stopPaymentReminderCron).toBe('function');
    });

    it('should export triggerPaymentReminderJob function for manual triggering', () => {
      expect(typeof paymentReminderCron.triggerPaymentReminderJob).toBe('function');
    });

    it('should export getLastPaymentReminderCronRun function', () => {
      expect(typeof paymentReminderCron.getLastPaymentReminderCronRun).toBe('function');
    });
  });

  describe('Payment History Router - Revenue Features', () => {
    it('should have getHistory procedure', () => {
      expect(paymentHistoryRouter._def.procedures).toHaveProperty('getHistory');
    });

    it('should have getSummary procedure with revenue data', () => {
      expect(paymentHistoryRouter._def.procedures).toHaveProperty('getSummary');
    });

    it('should have getPendingFollowups procedure with amounts', () => {
      expect(paymentHistoryRouter._def.procedures).toHaveProperty('getPendingFollowups');
    });

    it('should have getMethodBreakdown procedure with revenue', () => {
      expect(paymentHistoryRouter._def.procedures).toHaveProperty('getMethodBreakdown');
    });

    it('should have getMonthlyTrends procedure with revenue', () => {
      expect(paymentHistoryRouter._def.procedures).toHaveProperty('getMonthlyTrends');
    });
  });

  describe('Payment Reminder Email Template', () => {
    it('should have payment reminder email templates', async () => {
      const templates = await import('./emailTemplates/paymentReminder');
      expect(typeof templates.generatePaymentReminderHTML).toBe('function');
      expect(typeof templates.generatePaymentReminderText).toBe('function');
    });

    it('should generate HTML with payment details', async () => {
      const { generatePaymentReminderHTML } = await import('./emailTemplates/paymentReminder');
      const html = generatePaymentReminderHTML({
        clientName: 'Test Client',
        clientEmail: 'test@example.com',
        protocolName: 'Test Protocol',
        amount: '500.00',
        currency: 'USD',
        daysOverdue: 3,
        paymentLink: 'https://example.com/pay',
        supportEmail: 'support@example.com',
      });
      
      expect(html).toContain('Test Client');
      expect(html).toContain('500.00');
      expect(html).toContain('3 days');
      expect(html).toContain('https://example.com/pay');
    });

    it('should show urgent styling for 7+ days overdue', async () => {
      const { generatePaymentReminderHTML } = await import('./emailTemplates/paymentReminder');
      const html = generatePaymentReminderHTML({
        clientName: 'Test Client',
        clientEmail: 'test@example.com',
        protocolName: 'Test Protocol',
        amount: '500.00',
        currency: 'USD',
        daysOverdue: 7,
      });
      
      expect(html).toContain('Urgent');
    });

    it('should generate text version', async () => {
      const { generatePaymentReminderText } = await import('./emailTemplates/paymentReminder');
      const text = generatePaymentReminderText({
        clientName: 'Test Client',
        clientEmail: 'test@example.com',
        protocolName: 'Test Protocol',
        amount: '500.00',
        currency: 'USD',
        daysOverdue: 3,
      });
      
      expect(text).toContain('Test Client');
      expect(text).toContain('500.00');
    });
  });
});
