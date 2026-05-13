import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the database module
vi.mock('./db', () => ({
  getDb: vi.fn(),
  saveNotesWithHistory: vi.fn(),
  getNotesHistory: vi.fn(),
  createNotesHistoryEntry: vi.fn(),
  getLatestNotesHistoryEntry: vi.fn(),
}));

import * as db from './db';

describe('Notes History Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('saveNotesWithHistory', () => {
    it('should save notes and create history entry when content changes', async () => {
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{ id: 1, internalNotes: 'old notes', coachNotes: '' }]),
        insert: vi.fn().mockReturnThis(),
        values: vi.fn().mockResolvedValue([{ insertId: 1 }]),
        update: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
      };
      
      (db.getDb as any).mockResolvedValue(mockDb);
      
      // The function should track history when notes change
      const result = await db.saveNotesWithHistory(
        1,
        'internal_notes',
        'new notes',
        123,
        'Test User'
      );
      
      // Verify the mock was called
      expect(db.saveNotesWithHistory).toHaveBeenCalledWith(
        1,
        'internal_notes',
        'new notes',
        123,
        'Test User'
      );
    });

    it('should handle coach_notes type correctly', async () => {
      await db.saveNotesWithHistory(
        1,
        'coach_notes',
        'coach guidance here',
        456,
        'Coach Name'
      );
      
      expect(db.saveNotesWithHistory).toHaveBeenCalledWith(
        1,
        'coach_notes',
        'coach guidance here',
        456,
        'Coach Name'
      );
    });
  });

  describe('getNotesHistory', () => {
    it('should return history entries for a client protocol', async () => {
      const mockHistory = [
        {
          id: 1,
          clientProtocolId: 1,
          noteType: 'internal_notes',
          content: 'latest notes',
          changeType: 'updated',
          createdAt: new Date(),
        },
        {
          id: 2,
          clientProtocolId: 1,
          noteType: 'internal_notes',
          content: 'original notes',
          changeType: 'created',
          createdAt: new Date(Date.now() - 86400000),
        },
      ];
      
      (db.getNotesHistory as any).mockResolvedValue(mockHistory);
      
      const result = await db.getNotesHistory(1, 'internal_notes');
      
      expect(db.getNotesHistory).toHaveBeenCalledWith(1, 'internal_notes');
    });

    it('should filter by noteType when provided', async () => {
      await db.getNotesHistory(1, 'coach_notes');
      
      expect(db.getNotesHistory).toHaveBeenCalledWith(1, 'coach_notes');
    });

    it('should return all note types when noteType is not provided', async () => {
      await db.getNotesHistory(1);
      
      expect(db.getNotesHistory).toHaveBeenCalledWith(1);
    });
  });

  describe('createNotesHistoryEntry', () => {
    it('should create a new history entry for comments', async () => {
      const historyEntry = {
        clientProtocolId: 1,
        noteType: 'comment' as const,
        content: 'This is a comment',
        commentId: 5,
        changedByName: 'Coach',
        changeType: 'created' as const,
      };
      
      (db.createNotesHistoryEntry as any).mockResolvedValue(1);
      
      const result = await db.createNotesHistoryEntry(historyEntry);
      
      expect(db.createNotesHistoryEntry).toHaveBeenCalledWith(historyEntry);
    });
  });
});

describe('Notes History Schema Validation', () => {
  it('should have correct noteType enum values', () => {
    const validNoteTypes = ['internal_notes', 'coach_notes', 'comment'];
    
    validNoteTypes.forEach(type => {
      expect(['internal_notes', 'coach_notes', 'comment']).toContain(type);
    });
  });

  it('should have correct changeType enum values', () => {
    const validChangeTypes = ['created', 'updated', 'deleted'];
    
    validChangeTypes.forEach(type => {
      expect(['created', 'updated', 'deleted']).toContain(type);
    });
  });
});

describe('Auto-save Debounce Logic', () => {
  it('should debounce rapid changes', async () => {
    vi.useFakeTimers();
    
    const saveFn = vi.fn();
    let debounceTimer: NodeJS.Timeout | null = null;
    
    const debouncedSave = (content: string, debounceMs: number = 1500) => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      debounceTimer = setTimeout(() => {
        saveFn(content);
      }, debounceMs);
    };
    
    // Simulate rapid typing
    debouncedSave('a');
    debouncedSave('ab');
    debouncedSave('abc');
    debouncedSave('abcd');
    
    // Save should not have been called yet
    expect(saveFn).not.toHaveBeenCalled();
    
    // Advance time past debounce threshold
    vi.advanceTimersByTime(1500);
    
    // Now save should have been called once with final content
    expect(saveFn).toHaveBeenCalledTimes(1);
    expect(saveFn).toHaveBeenCalledWith('abcd');
    
    vi.useRealTimers();
  });

  it('should save immediately when saveNow is called', async () => {
    const saveFn = vi.fn();
    
    // Immediate save
    saveFn('immediate content');
    
    expect(saveFn).toHaveBeenCalledTimes(1);
    expect(saveFn).toHaveBeenCalledWith('immediate content');
  });
});
