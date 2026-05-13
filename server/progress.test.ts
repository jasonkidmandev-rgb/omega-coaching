import { describe, it, expect } from 'vitest';
import { appRouter } from './routers';

describe('Progress Tracking Features', () => {
  describe('Progress Router in appRouter', () => {
    it('should have progress procedures available', () => {
      const procedures = appRouter._def.procedures;
      // Check for the flattened procedure names
      const procedureNames = Object.keys(procedures);
      
      // Progress router procedures should be prefixed with 'progress.'
      const progressProcedures = procedureNames.filter(name => name.startsWith('progress.'));
      expect(progressProcedures.length).toBeGreaterThan(0);
      
      // Check specific procedures
      expect(procedureNames).toContain('progress.uploadPhoto');
      expect(procedureNames).toContain('progress.getPhotos');
      expect(procedureNames).toContain('progress.deletePhoto');
      expect(procedureNames).toContain('progress.createNote');
      expect(procedureNames).toContain('progress.getNotes');
      expect(procedureNames).toContain('progress.deleteNote');
    });
  });

  describe('Database Functions', () => {
    it('should have progress photo functions', async () => {
      const db = await import('./db');
      expect(typeof db.createProgressPhoto).toBe('function');
      expect(typeof db.getProgressPhotosForUser).toBe('function');
      expect(typeof db.deleteProgressPhoto).toBe('function');
    });

    it('should have journey note functions', async () => {
      const db = await import('./db');
      expect(typeof db.createJourneyNote).toBe('function');
      expect(typeof db.getJourneyNotesForUser).toBe('function');
      expect(typeof db.deleteJourneyNote).toBe('function');
    });
  });

  describe('Schema Tables', () => {
    it('should have progressPhotos table', async () => {
      const schema = await import('../drizzle/schema');
      expect(schema.progressPhotos).toBeDefined();
      expect(schema.progressPhotos.userId).toBeDefined();
      expect(schema.progressPhotos.imageUrl).toBeDefined();
      expect(schema.progressPhotos.category).toBeDefined();
    });

    it('should have journeyNotes table', async () => {
      const schema = await import('../drizzle/schema');
      expect(schema.journeyNotes).toBeDefined();
      expect(schema.journeyNotes.userId).toBeDefined();
      expect(schema.journeyNotes.content).toBeDefined();
      expect(schema.journeyNotes.mood).toBeDefined();
    });
  });
});
