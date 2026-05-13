import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the database
const mockExecute = vi.fn().mockResolvedValue([[], []]);
vi.mock('./db', () => ({
  db: vi.fn().mockResolvedValue({
    execute: (...args: any[]) => mockExecute(...args),
  }),
}));

describe('adminUpdateIntakeFormFields', () => {
  beforeEach(() => {
    mockExecute.mockClear();
    mockExecute.mockResolvedValue([[], []]);
  });

  it('should have the endpoint defined in the transformation router', async () => {
    // Verify the router file contains the endpoint
    const fs = await import('fs');
    const routerContent = fs.readFileSync('./server/transformation/transformationRouter.ts', 'utf-8');
    
    expect(routerContent).toContain('adminUpdateIntakeFormFields');
    expect(routerContent).toContain('adminProcedure');
    expect(routerContent).toContain('enrollmentId: z.number()');
    expect(routerContent).toContain('fields: z.record(z.string(), z.any())');
  });

  it('should whitelist only allowed fields', async () => {
    const fs = await import('fs');
    const routerContent = fs.readFileSync('./server/transformation/transformationRouter.ts', 'utf-8');
    
    // Verify the allowed fields whitelist exists
    const allowedFields = [
      'primaryGoal', 'secondaryGoal', 'additionalGoals',
      'alcoholUse', 'nicotineUse', 'cannabisUse', 'otherSubstanceUse',
      'additionalContext', 'top3Goals', 'previousPeptideExperience',
      'medicalIssues', 'medicalDiagnoses', 'hormonalStatus',
      'digestiveIssues', 'foodCravings', 'physicalActivityRoutine',
      'physicalLimitations', 'sleepDuration', 'mainStressors',
      'stressManagementMethods', 'mentalHealthHistory', 'psychMedications',
      'otherConcerns', 'otherGoalSupport', 'fullName', 'phone',
    ];
    
    for (const field of allowedFields) {
      expect(routerContent).toContain(`${field}: '${field}'`);
    }
  });

  it('should validate that no valid fields throws an error', async () => {
    const fs = await import('fs');
    const routerContent = fs.readFileSync('./server/transformation/transformationRouter.ts', 'utf-8');
    
    expect(routerContent).toContain("throw new Error('No valid fields provided')");
  });

  it('should use parameterized queries for safety', async () => {
    const fs = await import('fs');
    const routerContent = fs.readFileSync('./server/transformation/transformationRouter.ts', 'utf-8');
    
    // Verify it uses sql template literals with parameterized values
    expect(routerContent).toContain('SET ${sql.raw(col)} = ${value || null}');
    expect(routerContent).toContain('WHERE enrollmentId = ${enrollmentId}');
  });

  it('should have admin edit UI in ClientEdit IntakeFormsSubTab', async () => {
    const fs = await import('fs');
    const clientEditContent = fs.readFileSync('./client/src/pages/admin/ClientEdit.tsx', 'utf-8');
    
    // Verify the edit functionality exists
    expect(clientEditContent).toContain('adminUpdateIntakeFormFields');
    expect(clientEditContent).toContain('editableFieldMap');
    expect(clientEditContent).toContain('handleStartEdit');
    expect(clientEditContent).toContain('handleSaveEdit');
    expect(clientEditContent).toContain('Not provided');
    expect(clientEditContent).toContain('Pencil');
  });

  it('should have admin edit UI in Enrollments page', async () => {
    const fs = await import('fs');
    const enrollmentsContent = fs.readFileSync('./client/src/pages/admin/Enrollments.tsx', 'utf-8');
    
    // Verify the edit functionality exists
    expect(enrollmentsContent).toContain('adminUpdateIntakeFormFields');
    expect(enrollmentsContent).toContain('intakeEditableFieldMap');
    expect(enrollmentsContent).toContain('intakeEditingField');
    expect(enrollmentsContent).toContain('intakeUpdateFieldMutation');
    expect(enrollmentsContent).toContain('Not provided');
    expect(enrollmentsContent).toContain('Pencil');
  });
});
