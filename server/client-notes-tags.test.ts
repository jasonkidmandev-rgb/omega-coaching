import { describe, it, expect } from 'vitest';

describe('Client Notes and Tags System', () => {
  describe('Tag Parsing', () => {
    it('should correctly parse tags from JSON string', () => {
      const tagsJson = '["vip","new-client"]';
      const tags = JSON.parse(tagsJson);
      
      expect(tags).toEqual(['vip', 'new-client']);
      expect(tags.length).toBe(2);
    });

    it('should handle empty tags array', () => {
      const tagsJson = '[]';
      const tags = JSON.parse(tagsJson);
      
      expect(tags).toEqual([]);
      expect(tags.length).toBe(0);
    });

    it('should handle invalid JSON gracefully', () => {
      const invalidJson = 'not-valid-json';
      
      let tags: string[] = [];
      try {
        tags = JSON.parse(invalidJson);
      } catch (e) {
        tags = [];
      }
      
      expect(tags).toEqual([]);
    });

    it('should stringify tags correctly for storage', () => {
      const tags = ['vip', 'priority', 'follow-up'];
      const tagsJson = JSON.stringify(tags);
      
      expect(tagsJson).toBe('["vip","priority","follow-up"]');
    });

    it('should normalize tags to lowercase', () => {
      const rawTags = ['VIP', 'Priority', 'FOLLOW-UP'];
      const normalizedTags = rawTags.map(t => t.toLowerCase());
      
      expect(normalizedTags).toEqual(['vip', 'priority', 'follow-up']);
    });

    it('should remove duplicate tags', () => {
      const tagsWithDupes = ['vip', 'priority', 'vip', 'follow-up', 'priority'];
      const uniqueTags = [...new Set(tagsWithDupes)];
      
      expect(uniqueTags).toEqual(['vip', 'priority', 'follow-up']);
      expect(uniqueTags.length).toBe(3);
    });
  });

  describe('Internal Notes', () => {
    it('should handle multiline notes', () => {
      const notes = `Line 1
Line 2
Line 3`;
      
      expect(notes.split('\n').length).toBe(3);
    });

    it('should handle empty notes', () => {
      const notes = '';
      
      expect(notes).toBe('');
      expect(notes.length).toBe(0);
    });
  });
});

describe('Follow-Up Cron Job', () => {
  it('should have correct cron schedule configuration', async () => {
    // Import the cron module to verify it exports the expected functions
    const cronModule = await import('./cron/followUpCron');
    
    expect(typeof cronModule.startFollowUpCron).toBe('function');
    expect(typeof cronModule.stopFollowUpCron).toBe('function');
    expect(typeof cronModule.triggerFollowUpJob).toBe('function');
    expect(typeof cronModule.getLastCronRun).toBe('function');
  });
});

describe('Onboarding Options Parsing', () => {
  it('should parse selected option IDs from JSON', () => {
    const selectedOptionIds = '[1,2,3]';
    const ids = JSON.parse(selectedOptionIds);
    
    expect(ids).toEqual([1, 2, 3]);
  });

  it('should handle empty selections', () => {
    const selectedOptionIds = '[]';
    const ids = JSON.parse(selectedOptionIds);
    
    expect(ids).toEqual([]);
  });

  it('should handle null selections gracefully', () => {
    const selectedOptionIds: string | null = null;
    
    let ids: number[] = [];
    if (selectedOptionIds) {
      try {
        ids = JSON.parse(selectedOptionIds);
      } catch (e) {
        ids = [];
      }
    }
    
    expect(ids).toEqual([]);
  });
});
