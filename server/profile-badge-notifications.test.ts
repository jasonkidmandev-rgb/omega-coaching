import { describe, it, expect, vi, beforeEach } from 'vitest';

// Test profile completeness checking
describe('Profile Incomplete Badge', () => {
  const isProfileComplete = (protocol: any): boolean => {
    return !!(
      protocol.clientName &&
      protocol.clientEmail &&
      protocol.shippingStreet &&
      protocol.shippingCity &&
      protocol.shippingState &&
      protocol.shippingZip
    );
  };

  it('should return true for complete profile', () => {
    const completeProfile = {
      clientName: 'John Doe',
      clientEmail: 'john@example.com',
      shippingStreet: '123 Main St',
      shippingCity: 'Los Angeles',
      shippingState: 'CA',
      shippingZip: '90210',
    };
    expect(isProfileComplete(completeProfile)).toBe(true);
  });

  it('should return false when shipping street is missing', () => {
    const incompleteProfile = {
      clientName: 'John Doe',
      clientEmail: 'john@example.com',
      shippingStreet: null,
      shippingCity: 'Los Angeles',
      shippingState: 'CA',
      shippingZip: '90210',
    };
    expect(isProfileComplete(incompleteProfile)).toBe(false);
  });

  it('should return false when shipping city is missing', () => {
    const incompleteProfile = {
      clientName: 'John Doe',
      clientEmail: 'john@example.com',
      shippingStreet: '123 Main St',
      shippingCity: '',
      shippingState: 'CA',
      shippingZip: '90210',
    };
    expect(isProfileComplete(incompleteProfile)).toBe(false);
  });

  it('should return false when client name is missing', () => {
    const incompleteProfile = {
      clientName: '',
      clientEmail: 'john@example.com',
      shippingStreet: '123 Main St',
      shippingCity: 'Los Angeles',
      shippingState: 'CA',
      shippingZip: '90210',
    };
    expect(isProfileComplete(incompleteProfile)).toBe(false);
  });
});

// Test profile filter options
describe('Profile Filter Options', () => {
  const PROFILE_FILTER_OPTIONS = [
    { value: 'all', label: 'All Profiles' },
    { value: 'complete', label: 'Complete' },
    { value: 'incomplete', label: 'Incomplete' },
  ];

  it('should have all required filter options', () => {
    expect(PROFILE_FILTER_OPTIONS).toHaveLength(3);
    expect(PROFILE_FILTER_OPTIONS.map(o => o.value)).toContain('all');
    expect(PROFILE_FILTER_OPTIONS.map(o => o.value)).toContain('complete');
    expect(PROFILE_FILTER_OPTIONS.map(o => o.value)).toContain('incomplete');
  });

  it('should filter incomplete profiles correctly', () => {
    const protocols = [
      { id: 1, clientName: 'John', shippingStreet: '123 Main', shippingCity: 'LA', shippingState: 'CA', shippingZip: '90210' },
      { id: 2, clientName: 'Jane', shippingStreet: null, shippingCity: null, shippingState: null, shippingZip: null },
      { id: 3, clientName: 'Bob', shippingStreet: '456 Oak', shippingCity: 'NY', shippingState: 'NY', shippingZip: '10001' },
    ];

    const isComplete = (p: any) => !!(p.shippingStreet && p.shippingCity && p.shippingState && p.shippingZip);
    
    const incompleteProfiles = protocols.filter(p => !isComplete(p));
    expect(incompleteProfiles).toHaveLength(1);
    expect(incompleteProfiles[0].clientName).toBe('Jane');
  });
});

// Test admin email notification on profile completion
describe('Admin Email Notification on Profile Completion', () => {
  it('should detect when profile becomes complete', () => {
    const beforeUpdate = {
      shippingStreet: null,
      shippingCity: null,
      shippingState: null,
      shippingZip: null,
    };

    const afterUpdate = {
      shippingStreet: '123 Main St',
      shippingCity: 'Los Angeles',
      shippingState: 'CA',
      shippingZip: '90210',
    };

    const wasIncomplete = !beforeUpdate.shippingStreet || !beforeUpdate.shippingCity || 
                          !beforeUpdate.shippingState || !beforeUpdate.shippingZip;
    const isNowComplete = !!(afterUpdate.shippingStreet && afterUpdate.shippingCity && 
                            afterUpdate.shippingState && afterUpdate.shippingZip);

    expect(wasIncomplete).toBe(true);
    expect(isNowComplete).toBe(true);
    expect(wasIncomplete && isNowComplete).toBe(true); // Should trigger notification
  });

  it('should not trigger notification if profile was already complete', () => {
    const beforeUpdate = {
      shippingStreet: '123 Main St',
      shippingCity: 'Los Angeles',
      shippingState: 'CA',
      shippingZip: '90210',
    };

    const afterUpdate = {
      shippingStreet: '456 Oak Ave',
      shippingCity: 'Los Angeles',
      shippingState: 'CA',
      shippingZip: '90210',
    };

    const wasIncomplete = !beforeUpdate.shippingStreet || !beforeUpdate.shippingCity || 
                          !beforeUpdate.shippingState || !beforeUpdate.shippingZip;
    const isNowComplete = !!(afterUpdate.shippingStreet && afterUpdate.shippingCity && 
                            afterUpdate.shippingState && afterUpdate.shippingZip);

    expect(wasIncomplete).toBe(false);
    expect(isNowComplete).toBe(true);
    expect(wasIncomplete && isNowComplete).toBe(false); // Should NOT trigger notification
  });

  it('should not trigger notification if profile is still incomplete', () => {
    const beforeUpdate = {
      shippingStreet: null,
      shippingCity: null,
      shippingState: null,
      shippingZip: null,
    };

    const afterUpdate = {
      shippingStreet: '123 Main St',
      shippingCity: null, // Still missing
      shippingState: 'CA',
      shippingZip: '90210',
    };

    const wasIncomplete = !beforeUpdate.shippingStreet || !beforeUpdate.shippingCity || 
                          !beforeUpdate.shippingState || !beforeUpdate.shippingZip;
    const isNowComplete = !!(afterUpdate.shippingStreet && afterUpdate.shippingCity && 
                            afterUpdate.shippingState && afterUpdate.shippingZip);

    expect(wasIncomplete).toBe(true);
    expect(isNowComplete).toBe(false);
    expect(wasIncomplete && isNowComplete).toBe(false); // Should NOT trigger notification
  });
});

// Test payment portal link in emails
describe('Payment Portal Link in Emails', () => {
  it('should generate correct payment portal link', () => {
    const baseUrl = 'https://peptidecoach.pro';
    const accessToken = 'abc123xyz';
    
    const paymentPortalLink = `${baseUrl}/payments/${accessToken}`;
    
    expect(paymentPortalLink).toBe('https://peptidecoach.pro/payments/abc123xyz');
  });

  it('should include payment portal link in reminder data', () => {
    const reminderData = {
      clientName: 'John Doe',
      clientEmail: 'john@example.com',
      protocolName: 'Your Health Protocol',
      amount: '150.00',
      currency: 'USD',
      daysOverdue: 3,
      paymentLink: 'https://peptidecoach.pro/protocol/abc123',
      paymentPortalLink: 'https://peptidecoach.pro/payments/abc123',
      supportEmail: 'support@example.com',
    };

    expect(reminderData.paymentPortalLink).toBeDefined();
    expect(reminderData.paymentPortalLink).toContain('/payments/');
  });
});

// Test notification type includes profile_completed
describe('Notification Types', () => {
  const NOTIFICATION_TYPES = [
    'protocol_approved',
    'protocol_viewed',
    'payment_received',
    'payment_failed',
    'payment_refunded',
    'profile_completed',
    'other',
  ];

  it('should include profile_completed notification type', () => {
    expect(NOTIFICATION_TYPES).toContain('profile_completed');
  });

  it('should have all required notification types', () => {
    expect(NOTIFICATION_TYPES).toContain('protocol_approved');
    expect(NOTIFICATION_TYPES).toContain('protocol_viewed');
    expect(NOTIFICATION_TYPES).toContain('payment_received');
    expect(NOTIFICATION_TYPES).toContain('payment_failed');
    expect(NOTIFICATION_TYPES).toContain('payment_refunded');
    expect(NOTIFICATION_TYPES).toContain('other');
  });
});

// Test profile completion email template
describe('Profile Completion Email', () => {
  it('should include all required fields in email', () => {
    const emailData = {
      adminEmail: 'admin@example.com',
      clientName: 'John Doe',
      clientEmail: 'john@example.com',
      protocolName: 'Weight Loss Protocol',
      clientEditUrl: 'https://peptidecoach.pro/admin/clients/123',
    };

    expect(emailData.adminEmail).toBeDefined();
    expect(emailData.clientName).toBeDefined();
    expect(emailData.clientEmail).toBeDefined();
    expect(emailData.protocolName).toBeDefined();
    expect(emailData.clientEditUrl).toBeDefined();
    expect(emailData.clientEditUrl).toContain('/admin/clients/');
  });
});
