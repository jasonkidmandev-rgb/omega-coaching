import { describe, it, expect } from 'vitest';

/**
 * Test the validation logic for the IntakeFormWizard.
 * This mirrors the getValidationErrors() function in the client component.
 */

// Replicate the SECTIONS keys from the component
const SECTION_KEYS = [
  'welcome',       // 1
  'financial',     // 2
  'waiver',        // 3
  'demographics',  // 4
  'healthProfile', // 5
  'healthMeds',    // 6
  'emergency',     // 7
  'lifestyle',     // 8
  'agreements',    // 9
];

function getValidationErrors(
  sectionKey: string,
  formData: Record<string, any>,
  signatures: Record<string, string>
): string[] {
  const errors: string[] = [];

  switch (sectionKey) {
    case 'financial':
      if (!signatures.financial) errors.push('Client Signature is required');
      break;
    case 'waiver':
      if (!signatures.waiver) errors.push('Consulting Waiver Signature is required');
      break;
    case 'agreements':
      if (!formData.privacy_acknowledged) errors.push('Privacy Disclosure acknowledgment is required');
      if (!signatures.collaboration) errors.push('Collaboration Agreement Signature is required');
      if (formData.isMinor) {
        if (!formData.parentGuardianName) errors.push('Parent/Guardian Name is required');
        if (!signatures.parentGuardian) errors.push('Parent/Guardian Signature is required');
      }
      break;
    case 'demographics':
      if (!formData.fullName?.trim()) errors.push('Full Name is required');
      if (!formData.dateOfBirth) errors.push('Date of Birth is required');
      if (!formData.sex) errors.push('Sex is required');
      if (!formData.email?.trim()) errors.push('Email is required');
      if (!formData.phone?.trim()) errors.push('Mobile Phone is required');
      break;
    case 'healthProfile':
      if (!formData.height?.trim()) errors.push('Height is required');
      if (!formData.currentWeight?.trim()) errors.push('Current Weight is required');
      if (!formData.peptideGoals || formData.peptideGoals.length === 0) errors.push('Please select at least one goal');
      if (!formData.primaryGoal?.trim()) errors.push('Primary goal is required');
      if (!formData.safetyScreenFlags || formData.safetyScreenFlags.length === 0) errors.push('Safety Screening is required');
      break;
    case 'healthMeds':
      if (!formData.currentMedications?.trim()) errors.push('Current medications are required (write "None" if not applicable)');
      if (!formData.medicalIssues?.trim()) errors.push('Medical conditions are required (write "None" if not applicable)');
      if (!formData.physicalActivityRoutine?.trim()) errors.push('Physical activity routine is required');
      break;
    case 'emergency':
      if (!formData.emergencyContactName?.trim()) errors.push('Emergency Contact Name is required');
      if (!formData.emergencyContactRelationship?.trim()) errors.push('Relationship is required');
      if (!formData.emergencyContactPhone?.trim()) errors.push('Emergency Contact Phone is required');
      break;
    case 'lifestyle':
      if (!formData.aggressivenessScale) errors.push('Synergistic aggressiveness scale is required');
      if (!formData.financialAggressivenessScale) errors.push('Financial aggressiveness scale is required');
      if (!formData.organizationalCapacityScale) errors.push('Organizational capacity scale is required');
      break;
    default:
      break;
  }
  return errors;
}

describe('Intake Form Validation', () => {
  describe('Step 4 - Demographics', () => {
    it('should return errors when all fields are empty', () => {
      const errors = getValidationErrors('demographics', {}, {});
      expect(errors).toHaveLength(5);
      expect(errors).toContain('Full Name is required');
      expect(errors).toContain('Date of Birth is required');
      expect(errors).toContain('Sex is required');
      expect(errors).toContain('Email is required');
      expect(errors).toContain('Mobile Phone is required');
    });

    it('should return no errors when all fields are filled', () => {
      const errors = getValidationErrors('demographics', {
        fullName: 'John Doe',
        dateOfBirth: '1990-01-01',
        sex: 'male',
        email: 'john@example.com',
        phone: '555-1234',
      }, {});
      expect(errors).toHaveLength(0);
    });

    it('should catch whitespace-only values', () => {
      const errors = getValidationErrors('demographics', {
        fullName: '   ',
        dateOfBirth: '1990-01-01',
        sex: 'male',
        email: '  ',
        phone: '  ',
      }, {});
      expect(errors).toHaveLength(3);
    });
  });

  describe('Step 5 - Health Profile', () => {
    it('should return errors when all fields are empty', () => {
      const errors = getValidationErrors('healthProfile', {}, {});
      expect(errors).toHaveLength(5);
      expect(errors).toContain('Height is required');
      expect(errors).toContain('Current Weight is required');
      expect(errors).toContain('Please select at least one goal');
      expect(errors).toContain('Primary goal is required');
      expect(errors).toContain('Safety Screening is required');
    });

    it('should return no errors when all fields are filled', () => {
      const errors = getValidationErrors('healthProfile', {
        height: '5\'10"',
        currentWeight: '185',
        peptideGoals: ['Fat loss'],
        primaryGoal: 'Fat loss',
        safetyScreenFlags: ['None of the above'],
      }, {});
      expect(errors).toHaveLength(0);
    });

    it('should catch empty arrays', () => {
      const errors = getValidationErrors('healthProfile', {
        height: '6',
        currentWeight: '185',
        peptideGoals: [],
        primaryGoal: 'Goals here',
        safetyScreenFlags: [],
      }, {});
      expect(errors).toHaveLength(2);
      expect(errors).toContain('Please select at least one goal');
      expect(errors).toContain('Safety Screening is required');
    });
  });

  describe('Step 6 - Health & Medications', () => {
    it('should return errors when all fields are empty', () => {
      const errors = getValidationErrors('healthMeds', {}, {});
      expect(errors).toHaveLength(3);
      expect(errors).toContain('Current medications are required (write "None" if not applicable)');
      expect(errors).toContain('Medical conditions are required (write "None" if not applicable)');
      expect(errors).toContain('Physical activity routine is required');
    });

    it('should return no errors when all fields are filled', () => {
      const errors = getValidationErrors('healthMeds', {
        currentMedications: 'None',
        medicalIssues: 'None',
        physicalActivityRoutine: 'Weight training 3x/week',
      }, {});
      expect(errors).toHaveLength(0);
    });

    it('should catch whitespace-only values', () => {
      const errors = getValidationErrors('healthMeds', {
        currentMedications: '  ',
        medicalIssues: '  ',
        physicalActivityRoutine: '  ',
      }, {});
      expect(errors).toHaveLength(3);
    });
  });

  describe('Step 7 - Emergency Contact', () => {
    it('should return errors when all fields are empty', () => {
      const errors = getValidationErrors('emergency', {}, {});
      expect(errors).toHaveLength(3);
      expect(errors).toContain('Emergency Contact Name is required');
      expect(errors).toContain('Relationship is required');
      expect(errors).toContain('Emergency Contact Phone is required');
    });

    it('should return no errors when all fields are filled', () => {
      const errors = getValidationErrors('emergency', {
        emergencyContactName: 'Jane Doe',
        emergencyContactRelationship: 'Spouse',
        emergencyContactPhone: '555-5678',
      }, {});
      expect(errors).toHaveLength(0);
    });
  });

  describe('Step 8 - Lifestyle', () => {
    it('should return errors when scales are not set', () => {
      const errors = getValidationErrors('lifestyle', {}, {});
      expect(errors).toHaveLength(3);
      expect(errors).toContain('Synergistic aggressiveness scale is required');
      expect(errors).toContain('Financial aggressiveness scale is required');
      expect(errors).toContain('Organizational capacity scale is required');
    });

    it('should return no errors when scales have values', () => {
      const errors = getValidationErrors('lifestyle', {
        aggressivenessScale: 5,
        financialAggressivenessScale: 3,
        organizationalCapacityScale: 7,
      }, {});
      expect(errors).toHaveLength(0);
    });
  });

  describe('Step 2 - Financial Agreement', () => {
    it('should require signature', () => {
      const errors = getValidationErrors('financial', {}, {});
      expect(errors).toHaveLength(1);
      expect(errors).toContain('Client Signature is required');
    });

    it('should pass with signature', () => {
      const errors = getValidationErrors('financial', {}, { financial: 'John Doe' });
      expect(errors).toHaveLength(0);
    });
  });

  describe('Step 3 - Waiver', () => {
    it('should require signature', () => {
      const errors = getValidationErrors('waiver', {}, {});
      expect(errors).toHaveLength(1);
      expect(errors).toContain('Consulting Waiver Signature is required');
    });

    it('should pass with signature', () => {
      const errors = getValidationErrors('waiver', {}, { waiver: 'John Doe' });
      expect(errors).toHaveLength(0);
    });
  });

  describe('Step 9 - Agreements', () => {
    it('should require privacy acknowledgment and collaboration signature', () => {
      const errors = getValidationErrors('agreements', {}, {});
      expect(errors).toHaveLength(2);
      expect(errors).toContain('Privacy Disclosure acknowledgment is required');
      expect(errors).toContain('Collaboration Agreement Signature is required');
    });

    it('should require parent/guardian info for minors', () => {
      const errors = getValidationErrors('agreements', { isMinor: true }, {});
      expect(errors).toHaveLength(4);
      expect(errors).toContain('Parent/Guardian Name is required');
      expect(errors).toContain('Parent/Guardian Signature is required');
    });

    it('should pass when all fields are filled for adults', () => {
      const errors = getValidationErrors('agreements', { privacy_acknowledged: true }, { collaboration: 'John Doe' });
      expect(errors).toHaveLength(0);
    });
  });

  describe('Steps without validation (welcome)', () => {
    it('should return no errors for welcome step', () => {
      const errors = getValidationErrors('welcome', {}, {});
      expect(errors).toHaveLength(0);
    });
  });
});
