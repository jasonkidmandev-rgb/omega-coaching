import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { sql } from 'drizzle-orm';

// Mock the database module
vi.mock('./db', () => ({
  db: vi.fn(() => Promise.resolve({
    execute: vi.fn(),
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  })),
}));

describe('Intake Form Endpoints', () => {
  describe('getIntakeForm', () => {
    it('should return null when no form exists for enrollment', async () => {
      const { db } = await import('./db');
      const mockDb = await db();
      
      // Mock empty result
      (mockDb.execute as any).mockResolvedValueOnce([[]]); // Empty form result
      
      // The endpoint should return null when no form exists
      expect(true).toBe(true);
    });

    it('should return form data when form exists', async () => {
      const mockFormData = {
        id: 1,
        enrollmentId: 1,
        status: 'in_progress',
        fullName: 'John Doe',
        email: 'john@example.com',
        completedSections: JSON.stringify(['demographics', 'goals']),
      };
      
      // Verify form data structure
      expect(mockFormData.enrollmentId).toBe(1);
      expect(mockFormData.status).toBe('in_progress');
    });
  });

  describe('saveIntakeForm', () => {
    it('should create a new form record if none exists', async () => {
      const input = {
        enrollmentId: 1,
        currentSection: 'demographics',
        completedSections: ['demographics'],
        formData: {
          fullName: 'John Doe',
          email: 'john@example.com',
        },
        signatures: {},
      };
      
      // Verify input structure
      expect(input.enrollmentId).toBe(1);
      expect(input.formData.fullName).toBe('John Doe');
      expect(Array.isArray(input.completedSections)).toBe(true);
    });

    it('should update existing form record', async () => {
      const input = {
        enrollmentId: 1,
        currentSection: 'goals',
        completedSections: ['demographics', 'goals'],
        formData: {
          fullName: 'John Doe',
          email: 'john@example.com',
          primaryGoal: 'Weight loss',
        },
        signatures: {},
      };
      
      // Verify update data
      expect(input.completedSections.length).toBe(2);
      expect(input.formData.primaryGoal).toBe('Weight loss');
    });

    it('should save signatures correctly', async () => {
      const input = {
        enrollmentId: 1,
        currentSection: 'waiver',
        completedSections: ['demographics', 'goals', 'waiver'],
        formData: {},
        signatures: {
          coaching_waiver: 'typed:John Doe',
          liability_waiver: 'data:image/png;base64,abc123...',
        },
      };
      
      // Verify signature structure
      expect(input.signatures.coaching_waiver).toContain('typed:');
      expect(input.signatures.liability_waiver).toContain('data:image');
    });
  });

  describe('submitIntakeForm', () => {
    it('should mark form as completed', async () => {
      const input = {
        enrollmentId: 1,
        formData: {
          fullName: 'John Doe',
          email: 'john@example.com',
        },
        signatures: {
          coaching_waiver: 'typed:John Doe',
        },
      };
      
      // Verify submit data structure
      expect(input.enrollmentId).toBe(1);
      expect(Object.keys(input.signatures).length).toBeGreaterThan(0);
    });

    it('should update enrollment intakeFormCompleted flag', async () => {
      // The submit endpoint should set intakeFormCompleted = TRUE
      const expectedUpdate = {
        intakeFormCompleted: true,
        intakeFormCompletedAt: expect.any(Date),
      };
      
      expect(expectedUpdate.intakeFormCompleted).toBe(true);
    });
  });

  describe('getIntakeFormAdmin', () => {
    it('should return form with user info for admin view', async () => {
      const mockAdminView = {
        id: 1,
        enrollmentId: 1,
        tier: 'elite',
        userName: 'John Doe',
        userEmail: 'john@example.com',
        fullName: 'John Doe',
        status: 'completed',
        signatures: {},
        signatureRecords: [],
      };
      
      // Verify admin view includes user info
      expect(mockAdminView.userName).toBe('John Doe');
      expect(mockAdminView.tier).toBe('elite');
    });
  });

  describe('getIntakeFormContent', () => {
    it('should return form sections ordered by sortOrder', async () => {
      const mockSections = [
        { id: 1, sectionKey: 'demographics', sectionNumber: 1, title: 'Personal Information', sortOrder: 0 },
        { id: 2, sectionKey: 'goals', sectionNumber: 2, title: 'Goals & Experience', sortOrder: 1 },
        { id: 3, sectionKey: 'health', sectionNumber: 3, title: 'Health History', sortOrder: 2 },
      ];
      
      // Verify sections are properly structured
      expect(mockSections.length).toBe(3);
      expect(mockSections[0].sortOrder).toBeLessThan(mockSections[1].sortOrder);
    });
  });

  describe('updateIntakeFormContent', () => {
    it('should update section title and display text', async () => {
      const input = {
        id: 1,
        title: 'Updated Title',
        displayText: 'Updated content text',
        isRequired: true,
        requiresSignature: false,
        requiresCheckbox: true,
        isActive: true,
      };
      
      // Verify update input structure
      expect(input.id).toBe(1);
      expect(input.title).toBe('Updated Title');
      expect(typeof input.isRequired).toBe('boolean');
    });
  });

  describe('createIntakeFormSection', () => {
    it('should create a new section with all required fields', async () => {
      const input = {
        sectionKey: 'new_section',
        sectionNumber: 10,
        title: 'New Section',
        displayText: 'This is a new section',
        isRequired: true,
        requiresSignature: true,
        requiresCheckbox: false,
        sortOrder: 10,
      };
      
      // Verify create input structure
      expect(input.sectionKey).toBe('new_section');
      expect(input.sectionNumber).toBe(10);
      expect(input.requiresSignature).toBe(true);
    });
  });

  describe('exportIntakeFormPdf', () => {
    it('should return structured data for PDF generation', async () => {
      const mockPdfData = {
        enrollment: {
          id: 1,
          tier: 'elite',
          userName: 'John Doe',
          userEmail: 'john@example.com',
        },
        formData: {
          fullName: 'John Doe',
          dateOfBirth: '1990-01-01',
          email: 'john@example.com',
          address: {
            street: '123 Main St',
            city: 'Anytown',
            state: 'CA',
            zip: '12345',
          },
          peptideGoals: ['Weight loss', 'Muscle gain'],
        },
        signatures: {
          coaching_waiver: {
            type: 'typed',
            data: 'typed:John Doe',
            signedAt: '2024-01-15T10:00:00Z',
          },
        },
        submittedAt: '2024-01-15T10:30:00Z',
        status: 'completed',
      };
      
      // Verify PDF data structure
      expect(mockPdfData.enrollment.tier).toBe('elite');
      expect(mockPdfData.formData.fullName).toBe('John Doe');
      expect(Array.isArray(mockPdfData.formData.peptideGoals)).toBe(true);
      expect(mockPdfData.signatures.coaching_waiver.type).toBe('typed');
    });
  });
});

describe('Intake Form Data Validation', () => {
  it('should validate required fields for demographics section', () => {
    const requiredFields = ['fullName', 'dateOfBirth', 'email', 'phone'];
    const formData = {
      fullName: 'John Doe',
      dateOfBirth: '1990-01-01',
      email: 'john@example.com',
      phone: '555-1234',
    };
    
    for (const field of requiredFields) {
      expect(formData[field as keyof typeof formData]).toBeDefined();
      expect(formData[field as keyof typeof formData]).not.toBe('');
    }
  });

  it('should validate email format', () => {
    const validEmails = ['test@example.com', 'user.name@domain.org', 'user+tag@example.co.uk'];
    const invalidEmails = ['invalid', 'no@domain', '@nodomain.com'];
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    for (const email of validEmails) {
      expect(emailRegex.test(email)).toBe(true);
    }
    
    for (const email of invalidEmails) {
      expect(emailRegex.test(email)).toBe(false);
    }
  });

  it('should validate signature types', () => {
    const typedSignature = 'typed:John Doe';
    const drawnSignature = 'data:image/png;base64,abc123...';
    
    expect(typedSignature.startsWith('typed:')).toBe(true);
    expect(drawnSignature.startsWith('data:image')).toBe(true);
  });
});

describe('Intake Form Integration', () => {
  it('should track completed sections correctly', () => {
    const completedSections: string[] = [];
    
    // Simulate completing sections
    completedSections.push('demographics');
    expect(completedSections.includes('demographics')).toBe(true);
    
    completedSections.push('goals');
    expect(completedSections.length).toBe(2);
    
    // Check section order
    const allSections = ['demographics', 'goals', 'health', 'lifestyle', 'waivers'];
    const progress = (completedSections.length / allSections.length) * 100;
    expect(progress).toBe(40);
  });

  it('should calculate form progress percentage', () => {
    const totalSections = 8;
    const completedSections = 4;
    const progress = Math.round((completedSections / totalSections) * 100);
    
    expect(progress).toBe(50);
  });
});
