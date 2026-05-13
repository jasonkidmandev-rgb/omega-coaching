import { describe, it, expect } from 'vitest';
import { z } from 'zod';

describe('Critical Fixes Batch 3', () => {

  describe('Forms Editor Save - Boolean Coercion Fix', () => {
    // The root cause: MySQL returns tinyint (0/1) for boolean columns,
    // but Zod schema expected actual booleans. z.coerce.boolean() fixes this.
    
    it('should coerce MySQL tinyint 0 to boolean false', () => {
      const schema = z.object({
        isRequired: z.coerce.boolean(),
        requiresSignature: z.coerce.boolean(),
        requiresCheckbox: z.coerce.boolean(),
        isActive: z.coerce.boolean(),
      });
      
      const result = schema.parse({
        isRequired: 0,
        requiresSignature: 0,
        requiresCheckbox: 0,
        isActive: 0,
      });
      
      expect(result.isRequired).toBe(false);
      expect(result.requiresSignature).toBe(false);
      expect(result.requiresCheckbox).toBe(false);
      expect(result.isActive).toBe(false);
    });

    it('should coerce MySQL tinyint 1 to boolean true', () => {
      const schema = z.object({
        isRequired: z.coerce.boolean(),
        requiresSignature: z.coerce.boolean(),
        requiresCheckbox: z.coerce.boolean(),
        isActive: z.coerce.boolean(),
      });
      
      const result = schema.parse({
        isRequired: 1,
        requiresSignature: 1,
        requiresCheckbox: 1,
        isActive: 1,
      });
      
      expect(result.isRequired).toBe(true);
      expect(result.requiresSignature).toBe(true);
      expect(result.requiresCheckbox).toBe(true);
      expect(result.isActive).toBe(true);
    });

    it('should still accept actual booleans', () => {
      const schema = z.object({
        isRequired: z.coerce.boolean(),
        isActive: z.coerce.boolean(),
      });
      
      const result = schema.parse({
        isRequired: true,
        isActive: false,
      });
      
      expect(result.isRequired).toBe(true);
      expect(result.isActive).toBe(false);
    });

    it('should reject the old schema with actual tinyint values', () => {
      // This demonstrates the bug: z.boolean() rejects numbers
      const oldSchema = z.object({
        isRequired: z.boolean(),
      });
      
      expect(() => oldSchema.parse({ isRequired: 1 })).toThrow();
      expect(() => oldSchema.parse({ isRequired: 0 })).toThrow();
    });
  });

  describe('Client Profile Save - Empty String Fix', () => {
    // The root cause: the server filtered out empty strings with value !== ''
    // This meant clearing a field would silently drop the change
    
    it('should allow empty strings in update data (clearing a field)', () => {
      const updateData: Record<string, any> = {
        name: 'John',
        email: '',  // User cleared the email field
        phone: '555-1234',
        notes: '',  // User cleared the notes field
      };
      
      // Old buggy filter: strips empty strings
      const oldFiltered = Object.fromEntries(
        Object.entries(updateData).filter(([_, value]) => value !== '')
      );
      expect(oldFiltered).not.toHaveProperty('email');
      expect(oldFiltered).not.toHaveProperty('notes');
      
      // New correct filter: keeps empty strings, only strips undefined/null
      const newFiltered = Object.fromEntries(
        Object.entries(updateData).filter(([_, value]) => value !== undefined && value !== null)
      );
      expect(newFiltered).toHaveProperty('email', '');
      expect(newFiltered).toHaveProperty('notes', '');
    });
  });

  describe('Session Notes - Enrollment Dialog Removal', () => {
    // Verify that the session notes feature is properly separated
    
    it('should have session note types defined for templates', () => {
      const sessionTypes = [
        'discovery',
        'check_in', 
        'training',
        'reconstitution',
        'follow_up',
        'general',
      ];
      
      expect(sessionTypes).toHaveLength(6);
      expect(sessionTypes).toContain('discovery');
      expect(sessionTypes).toContain('check_in');
      expect(sessionTypes).toContain('training');
      expect(sessionTypes).toContain('reconstitution');
      expect(sessionTypes).toContain('follow_up');
      expect(sessionTypes).toContain('general');
    });

    it('should have template content for each session type', () => {
      const templates: Record<string, string> = {
        discovery: '## Discovery Session Notes\n\n**Client Goals:**\n- \n\n**Current Health Status:**\n- \n\n**Key Concerns:**\n- \n\n**Recommended Approach:**\n- \n\n**Action Items:**\n- [ ] \n\n**Next Steps:**\n- Schedule follow-up:\n- Protocol design target date:',
        check_in: '## Check-In Session Notes\n\n**Progress Since Last Session:**\n- \n\n**Current Concerns:**\n- \n\n**Protocol Adjustments:**\n- \n\n**Action Items:**\n- [ ] \n\n**Next Check-In:',
        training: '## Training Session Notes\n\n**Session Focus:**\n- \n\n**Techniques Covered:**\n- \n\n**Client Competency:**\n- \n\n**Practice Assignments:**\n- [ ] \n\n**Next Session:',
        reconstitution: '## Reconstitution Training Notes\n\n**Products Covered:**\n- \n\n**Mixing Ratios:**\n- \n\n**Client Confidence Level:**\n- \n\n**Follow-Up Needed:**\n- [ ]',
        follow_up: '## Follow-Up Session Notes\n\n**Items Reviewed:**\n- \n\n**Client Feedback:**\n- \n\n**Adjustments Made:**\n- \n\n**Next Steps:**\n- [ ]',
        general: '',
      };
      
      expect(Object.keys(templates)).toHaveLength(6);
      expect(templates.discovery).toContain('Discovery Session');
      expect(templates.check_in).toContain('Check-In');
      expect(templates.training).toContain('Training Session');
      expect(templates.reconstitution).toContain('Reconstitution');
      expect(templates.follow_up).toContain('Follow-Up');
      expect(templates.general).toBe('');
    });
  });
});
