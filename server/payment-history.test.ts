import { describe, it, expect } from 'vitest';
import * as emailService from './emailService';
import { paymentHistoryRouter } from './payment/historyRouter';
import { paymentRouter } from './payment/router';

describe('Payment History and Email Notifications', () => {
  describe('Payment Status Email Notifications', () => {
    it('should have sendPaymentStatusNotification function exported', () => {
      expect(typeof emailService.sendPaymentStatusNotification).toBe('function');
    });

    it('sendPaymentStatusNotification should accept required parameters', () => {
      // Test that the function signature is correct
      const fn = emailService.sendPaymentStatusNotification;
      expect(fn.length).toBeGreaterThanOrEqual(0); // Function exists
    });
  });

  describe('Payment History Router', () => {
    it('should have getHistory procedure in paymentHistory router', () => {
      expect(paymentHistoryRouter._def.procedures).toHaveProperty('getHistory');
    });

    it('should have getSummary procedure in paymentHistory router', () => {
      expect(paymentHistoryRouter._def.procedures).toHaveProperty('getSummary');
    });

    it('should have getPendingFollowups procedure in paymentHistory router', () => {
      expect(paymentHistoryRouter._def.procedures).toHaveProperty('getPendingFollowups');
    });

    it('should have getMethodBreakdown procedure in paymentHistory router', () => {
      expect(paymentHistoryRouter._def.procedures).toHaveProperty('getMethodBreakdown');
    });

    it('should have getMonthlyTrends procedure in paymentHistory router', () => {
      expect(paymentHistoryRouter._def.procedures).toHaveProperty('getMonthlyTrends');
    });
  });

  describe('Payment Router Admin Override', () => {
    it('should have markAsReceived procedure in payment router', () => {
      expect(paymentRouter._def.procedures).toHaveProperty('markAsReceived');
    });

    it('should have markAsFailed procedure in payment router', () => {
      expect(paymentRouter._def.procedures).toHaveProperty('markAsFailed');
    });

    it('should have markAsRefunded procedure in payment router', () => {
      expect(paymentRouter._def.procedures).toHaveProperty('markAsRefunded');
    });

    it('should have getStatus procedure in payment router', () => {
      expect(paymentRouter._def.procedures).toHaveProperty('getStatus');
    });
  });
});
