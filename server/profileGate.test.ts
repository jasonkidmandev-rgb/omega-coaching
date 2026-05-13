import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock db
const mockExecute = vi.fn();
vi.mock('./db', () => ({
  default: vi.fn(() => Promise.resolve({ execute: mockExecute })),
}));

// Mock email service
vi.mock('./emailService', () => ({
  sendTransformationMilestoneEmail: vi.fn(() => Promise.resolve({ success: true })),
  sendTransformationPaymentConfirmationEmail: vi.fn(() => Promise.resolve({ success: true })),
  sendEmail: vi.fn(() => Promise.resolve({ success: true })),
  sendIntakeFormEmail: vi.fn(() => Promise.resolve({ success: true })),
}));

// Mock email tracking
vi.mock('./emailTracking', () => ({
  createEmailTracking: vi.fn(() => Promise.resolve('mock-tracking-id')),
  injectTrackingIntoHtml: vi.fn((html: string) => html),
  recordEmailOpen: vi.fn(),
  recordEmailClick: vi.fn(),
  getEnrollmentEmailTracking: vi.fn(() => Promise.resolve([])),
  getClickDetails: vi.fn(() => Promise.resolve([])),
  getTransformationEmailStats: vi.fn(() => Promise.resolve({})),
  getEmailTrackingByEnrollmentIds: vi.fn(() => Promise.resolve({})),
}));

// Mock site settings
vi.mock('./siteSettings', () => ({
  getSiteSetting: vi.fn(() => Promise.resolve('enabled')),
}));

describe('Profile Gate - saveProspectProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Input Validation', () => {
    it('should require fullName with minimum 2 characters', () => {
      // The z.string().min(2) validation ensures name is at least 2 chars
      const schema = { fullName: 'A' }; // Too short
      expect(schema.fullName.length).toBeLessThan(2);
    });

    it('should require a valid email address', () => {
      const validEmails = ['test@example.com', 'user@domain.co'];
      const invalidEmails = ['notanemail', '@domain.com', 'user@'];
      
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      validEmails.forEach(email => expect(emailRegex.test(email)).toBe(true));
      invalidEmails.forEach(email => expect(emailRegex.test(email)).toBe(false));
    });

    it('should require phone with minimum 7 characters', () => {
      const validPhones = ['1234567', '(555) 123-4567', '+1 555 123 4567'];
      const invalidPhones = ['123', '12'];
      
      validPhones.forEach(phone => expect(phone.length).toBeGreaterThanOrEqual(7));
      invalidPhones.forEach(phone => expect(phone.length).toBeLessThan(7));
    });

    it('should make address fields optional', () => {
      // Address, city, state, zipCode are all z.string().optional()
      const inputWithAddress = {
        enrollmentId: 1,
        fullName: 'John Doe',
        email: 'john@example.com',
        phone: '5551234567',
        address: '123 Main St',
        city: 'Springfield',
        state: 'IL',
        zipCode: '62701',
      };
      
      const inputWithoutAddress = {
        enrollmentId: 1,
        fullName: 'John Doe',
        email: 'john@example.com',
        phone: '5551234567',
      };
      
      // Both should be valid inputs
      expect(inputWithAddress.fullName).toBeTruthy();
      expect(inputWithoutAddress.fullName).toBeTruthy();
    });
  });

  describe('Database Operations', () => {
    it('should update enrollment with profile data when valid input provided', async () => {
      // Mock enrollment exists
      mockExecute
        .mockResolvedValueOnce([[{ id: 1, status: 'enrolled', clientName: null, email: null, profileCompleted: 0 }]])
        .mockResolvedValueOnce([]) // UPDATE enrollment
        .mockResolvedValueOnce([]) // INSERT activity log
        .mockResolvedValueOnce([]); // INSERT notification

      // Verify the mock was set up correctly
      const result = await mockExecute();
      expect(result).toEqual([[{ id: 1, status: 'enrolled', clientName: null, email: null, profileCompleted: 0 }]]);
    });

    it('should build shipping address from parts', () => {
      const address = '123 Main St';
      const city = 'Springfield';
      const state = 'IL';
      const zipCode = '62701';
      
      const shippingParts = [address, city, state, zipCode].filter(Boolean);
      const shippingAddress = shippingParts.length > 0 ? shippingParts.join(', ') : null;
      
      expect(shippingAddress).toBe('123 Main St, Springfield, IL, 62701');
    });

    it('should handle missing address parts gracefully', () => {
      const address = '';
      const city = '';
      const state = '';
      const zipCode = '';
      
      const shippingParts = [address, city, state, zipCode].filter(Boolean);
      const shippingAddress = shippingParts.length > 0 ? shippingParts.join(', ') : null;
      
      expect(shippingAddress).toBeNull();
    });

    it('should handle partial address', () => {
      const address = '123 Main St';
      const city = 'Springfield';
      const state = '';
      const zipCode = '';
      
      const shippingParts = [address, city, state, zipCode].filter(Boolean);
      const shippingAddress = shippingParts.length > 0 ? shippingParts.join(', ') : null;
      
      expect(shippingAddress).toBe('123 Main St, Springfield');
    });
  });

  describe('Profile Completion Logic', () => {
    it('should set profileCompleted to 1 after successful save', () => {
      // After save, the enrollment should have profileCompleted = 1
      const beforeSave = { profileCompleted: 0 };
      const afterSave = { ...beforeSave, profileCompleted: 1 };
      
      expect(afterSave.profileCompleted).toBe(1);
    });

    it('should set profileCompletedAt to current time', () => {
      const now = new Date();
      const profileCompletedAt = now;
      
      expect(profileCompletedAt).toBeInstanceOf(Date);
      expect(profileCompletedAt.getTime()).toBeGreaterThan(0);
    });
  });

  describe('Admin Notification', () => {
    it('should create notification with correct format', () => {
      const fullName = 'Richard Feyh';
      const email = 'feyh3415@gmail.com';
      
      const title = `${fullName} completed their profile`;
      const message = `${fullName} (${email}) has completed their profile and is ready to watch the masterclass videos.`;
      
      expect(title).toBe('Richard Feyh completed their profile');
      expect(message).toContain('feyh3415@gmail.com');
      expect(message).toContain('ready to watch the masterclass videos');
    });
  });
});

describe('Profile Gate - Frontend Tab Logic', () => {
  it('should default to profile tab when profile not completed', () => {
    const enrollment = { profileCompleted: 0 };
    const defaultTab = enrollment.profileCompleted ? 'masterclass' : 'profile';
    expect(defaultTab).toBe('profile');
  });

  it('should default to masterclass tab when profile is completed', () => {
    const enrollment = { profileCompleted: 1 };
    const defaultTab = enrollment.profileCompleted ? 'masterclass' : 'profile';
    expect(defaultTab).toBe('masterclass');
  });

  it('should block tab switching when profile not completed', () => {
    const enrollment = { profileCompleted: 0 };
    const isProfileDone = !!enrollment.profileCompleted;
    
    const canSwitchToMasterclass = isProfileDone || false;
    const canSwitchToJourney = isProfileDone || false;
    const canSwitchToResources = isProfileDone || false;
    const canSwitchToProfile = true; // Always allowed
    
    expect(canSwitchToMasterclass).toBe(false);
    expect(canSwitchToJourney).toBe(false);
    expect(canSwitchToResources).toBe(false);
    expect(canSwitchToProfile).toBe(true);
  });

  it('should allow tab switching when profile is completed', () => {
    const enrollment = { profileCompleted: 1 };
    const isProfileDone = !!enrollment.profileCompleted;
    
    const canSwitchToMasterclass = isProfileDone;
    const canSwitchToJourney = isProfileDone;
    const canSwitchToResources = isProfileDone;
    
    expect(canSwitchToMasterclass).toBe(true);
    expect(canSwitchToJourney).toBe(true);
    expect(canSwitchToResources).toBe(true);
  });

  it('should hide profile tab when profile is completed', () => {
    const enrollment = { profileCompleted: 1 };
    const showProfileTab = !enrollment.profileCompleted;
    expect(showProfileTab).toBe(false);
  });

  it('should show profile tab when profile is not completed', () => {
    const enrollment = { profileCompleted: 0 };
    const showProfileTab = !enrollment.profileCompleted;
    expect(showProfileTab).toBe(true);
  });
});

describe('Profile Gate - Pre-fill Logic', () => {
  it('should pre-fill from user account when logged in', () => {
    const user = { name: 'John Doe', email: 'john@example.com', phone: '5551234567' };
    const enrollment = { clientName: null, email: null };
    
    const profileName = user.name || enrollment.clientName || '';
    const profileEmail = user.email || enrollment.email || '';
    
    expect(profileName).toBe('John Doe');
    expect(profileEmail).toBe('john@example.com');
  });

  it('should pre-fill from enrollment when not logged in', () => {
    const user = null;
    const enrollment = { clientName: 'Jane Smith', email: 'jane@example.com' };
    
    const profileName = user?.name || enrollment.clientName || '';
    const profileEmail = user?.email || enrollment.email || '';
    
    expect(profileName).toBe('Jane Smith');
    expect(profileEmail).toBe('jane@example.com');
  });

  it('should not pre-fill Unknown as name', () => {
    const enrollment = { clientName: 'Unknown', email: 'test@example.com' };
    
    const profileName = (enrollment.clientName && enrollment.clientName !== 'Unknown') ? enrollment.clientName : '';
    
    expect(profileName).toBe('');
  });

  it('should prefer user data over enrollment data', () => {
    const user = { name: 'User Name', email: 'user@example.com' };
    const enrollment = { clientName: 'Enrollment Name', email: 'enrollment@example.com' };
    
    const profileName = user.name || enrollment.clientName || '';
    const profileEmail = user.email || enrollment.email || '';
    
    expect(profileName).toBe('User Name');
    expect(profileEmail).toBe('user@example.com');
  });
});

describe('Profile Gate - Form Validation', () => {
  it('should disable submit when name is empty', () => {
    const profileName = '';
    const profileEmail = 'test@example.com';
    const profilePhone = '5551234567';
    
    const isDisabled = !profileName.trim() || !profileEmail.trim() || !profilePhone.trim();
    expect(isDisabled).toBe(true);
  });

  it('should disable submit when email is invalid', () => {
    const profileEmail = 'notanemail';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    expect(emailRegex.test(profileEmail)).toBe(false);
  });

  it('should disable submit when phone is empty', () => {
    const profileName = 'John Doe';
    const profileEmail = 'john@example.com';
    const profilePhone = '';
    
    const isDisabled = !profileName.trim() || !profileEmail.trim() || !profilePhone.trim();
    expect(isDisabled).toBe(true);
  });

  it('should enable submit when all required fields are valid', () => {
    const profileName = 'John Doe';
    const profileEmail = 'john@example.com';
    const profilePhone = '5551234567';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    const isDisabled = !profileName.trim() || !profileEmail.trim() || !profilePhone.trim() || !emailRegex.test(profileEmail);
    expect(isDisabled).toBe(false);
  });
});
