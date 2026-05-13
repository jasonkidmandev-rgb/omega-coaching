import { describe, it, expect } from 'vitest';

// Test profile completion logic
describe('Profile Completion Logic', () => {
  const isProfileComplete = (profile: {
    clientName?: string | null;
    clientEmail?: string | null;
    clientPhone?: string | null;
    shippingName?: string | null;
    shippingStreet?: string | null;
    shippingCity?: string | null;
    shippingState?: string | null;
    shippingZip?: string | null;
  }) => {
    return !!(
      profile.clientName &&
      profile.clientEmail &&
      profile.shippingStreet &&
      profile.shippingCity &&
      profile.shippingState &&
      profile.shippingZip
    );
  };

  it('should return true for complete profile', () => {
    const completeProfile = {
      clientName: 'John Doe',
      clientEmail: 'john@example.com',
      clientPhone: '555-1234',
      shippingName: 'John Doe',
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
      clientPhone: '555-1234',
      shippingName: 'John Doe',
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

  it('should return false when shipping state is missing', () => {
    const incompleteProfile = {
      clientName: 'John Doe',
      clientEmail: 'john@example.com',
      shippingStreet: '123 Main St',
      shippingCity: 'Los Angeles',
      shippingState: null,
      shippingZip: '90210',
    };
    expect(isProfileComplete(incompleteProfile)).toBe(false);
  });

  it('should return false when shipping zip is missing', () => {
    const incompleteProfile = {
      clientName: 'John Doe',
      clientEmail: 'john@example.com',
      shippingStreet: '123 Main St',
      shippingCity: 'Los Angeles',
      shippingState: 'CA',
      shippingZip: '',
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

  it('should return false when client email is missing', () => {
    const incompleteProfile = {
      clientName: 'John Doe',
      clientEmail: null,
      shippingStreet: '123 Main St',
      shippingCity: 'Los Angeles',
      shippingState: 'CA',
      shippingZip: '90210',
    };
    expect(isProfileComplete(incompleteProfile)).toBe(false);
  });
});

// Test external payment method options
describe('External Payment Methods', () => {
  const EXTERNAL_PAYMENT_METHODS = [
    { value: 'venmo_direct', label: 'Venmo (Direct)' },
    { value: 'cash', label: 'Cash' },
    { value: 'check', label: 'Check' },
    { value: 'zelle', label: 'Zelle' },
    { value: 'paypal_direct', label: 'PayPal (Direct)' },
    { value: 'other', label: 'Other' },
  ];

  it('should have all required payment methods', () => {
    expect(EXTERNAL_PAYMENT_METHODS.length).toBe(6);
    expect(EXTERNAL_PAYMENT_METHODS.map(m => m.value)).toContain('venmo_direct');
    expect(EXTERNAL_PAYMENT_METHODS.map(m => m.value)).toContain('cash');
    expect(EXTERNAL_PAYMENT_METHODS.map(m => m.value)).toContain('check');
    expect(EXTERNAL_PAYMENT_METHODS.map(m => m.value)).toContain('zelle');
    expect(EXTERNAL_PAYMENT_METHODS.map(m => m.value)).toContain('paypal_direct');
    expect(EXTERNAL_PAYMENT_METHODS.map(m => m.value)).toContain('other');
  });

  it('should have labels for all payment methods', () => {
    EXTERNAL_PAYMENT_METHODS.forEach(method => {
      expect(method.label).toBeTruthy();
      expect(method.label.length).toBeGreaterThan(0);
    });
  });
});

// Test payment notes formatting
describe('Payment Notes Formatting', () => {
  const formatPaymentNotes = (
    paymentMethod: string,
    reference: string,
    amount: string,
    notes: string
  ) => {
    const EXTERNAL_PAYMENT_METHODS = [
      { value: 'venmo_direct', label: 'Venmo (Direct)' },
      { value: 'cash', label: 'Cash' },
      { value: 'check', label: 'Check' },
      { value: 'zelle', label: 'Zelle' },
      { value: 'paypal_direct', label: 'PayPal (Direct)' },
      { value: 'other', label: 'Other' },
    ];
    
    const methodLabel = EXTERNAL_PAYMENT_METHODS.find(m => m.value === paymentMethod)?.label || paymentMethod;
    const noteParts = [
      `Payment Method: ${methodLabel}`,
      reference ? `Reference: ${reference}` : null,
      amount ? `Amount: $${amount}` : null,
      notes ? `Notes: ${notes}` : null,
    ].filter(Boolean);
    return noteParts.join(' | ');
  };

  it('should format notes with all fields', () => {
    const result = formatPaymentNotes('venmo_direct', '@johndoe', '250.00', 'Verified via Venmo app');
    expect(result).toBe('Payment Method: Venmo (Direct) | Reference: @johndoe | Amount: $250.00 | Notes: Verified via Venmo app');
  });

  it('should format notes without reference', () => {
    const result = formatPaymentNotes('cash', '', '100.00', 'Paid in person');
    expect(result).toBe('Payment Method: Cash | Amount: $100.00 | Notes: Paid in person');
  });

  it('should format notes without amount', () => {
    const result = formatPaymentNotes('check', 'Check #1234', '', '');
    expect(result).toBe('Payment Method: Check | Reference: Check #1234');
  });

  it('should format notes with only payment method', () => {
    const result = formatPaymentNotes('other', '', '', '');
    expect(result).toBe('Payment Method: Other');
  });
});

// Test shipping verification requirement
describe('Shipping Verification', () => {
  it('should require shipping verification before recording payment', () => {
    const canRecordPayment = (shippingVerified: boolean, isProfileComplete: boolean) => {
      // Payment can only be recorded if shipping is verified
      return shippingVerified;
    };

    expect(canRecordPayment(false, true)).toBe(false);
    expect(canRecordPayment(true, true)).toBe(true);
    expect(canRecordPayment(false, false)).toBe(false);
    expect(canRecordPayment(true, false)).toBe(true); // Verification checkbox overrides profile check
  });
});
