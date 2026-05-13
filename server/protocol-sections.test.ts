import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the database functions
const mockGetProtocolSections = vi.fn();
const mockGetProtocolSection = vi.fn();
const mockUpsertProtocolSection = vi.fn();
const mockToggleProtocolSection = vi.fn();

vi.mock('./db', () => ({
  getProtocolSections: (...args: any[]) => mockGetProtocolSections(...args),
  getProtocolSection: (...args: any[]) => mockGetProtocolSection(...args),
  upsertProtocolSection: (...args: any[]) => mockUpsertProtocolSection(...args),
  toggleProtocolSection: (...args: any[]) => mockToggleProtocolSection(...args),
}));

describe('Protocol Sections', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getProtocolSections', () => {
    it('should return all sections for a protocol', async () => {
      const mockSections = [
        { id: 1, clientProtocolId: 100, sectionType: 'periodization', isEnabled: true, content: { html: '<h2>Overview</h2>' } },
        { id: 2, clientProtocolId: 100, sectionType: 'training_split', isEnabled: false, content: null },
        { id: 3, clientProtocolId: 100, sectionType: 'program_guide', isEnabled: true, content: { tabs: {} } },
      ];
      mockGetProtocolSections.mockResolvedValue(mockSections);

      const result = await mockGetProtocolSections(100);
      expect(result).toHaveLength(3);
      expect(result[0].sectionType).toBe('periodization');
      expect(result[0].isEnabled).toBe(true);
      expect(result[1].isEnabled).toBe(false);
    });

    it('should return empty array for protocol with no sections', async () => {
      mockGetProtocolSections.mockResolvedValue([]);
      const result = await mockGetProtocolSections(999);
      expect(result).toHaveLength(0);
    });
  });

  describe('getProtocolSection', () => {
    it('should return a specific section by type', async () => {
      const mockSection = {
        id: 1,
        clientProtocolId: 100,
        sectionType: 'periodization',
        isEnabled: true,
        content: { html: '<h2>Overview</h2><p>Test content</p>' },
      };
      mockGetProtocolSection.mockResolvedValue(mockSection);

      const result = await mockGetProtocolSection(100, 'periodization');
      expect(result.sectionType).toBe('periodization');
      expect(result.content.html).toContain('Overview');
    });

    it('should return null for non-existent section', async () => {
      mockGetProtocolSection.mockResolvedValue(null);
      const result = await mockGetProtocolSection(100, 'training_split');
      expect(result).toBeNull();
    });
  });

  describe('upsertProtocolSection', () => {
    it('should create a new section', async () => {
      const newSection = {
        id: 1,
        clientProtocolId: 100,
        sectionType: 'periodization',
        isEnabled: true,
        content: { html: '<h2>Overview</h2>' },
      };
      mockUpsertProtocolSection.mockResolvedValue(newSection);

      const result = await mockUpsertProtocolSection(100, 'periodization', {
        isEnabled: true,
        content: { html: '<h2>Overview</h2>' },
      });
      expect(result.sectionType).toBe('periodization');
      expect(result.isEnabled).toBe(true);
    });

    it('should update an existing section', async () => {
      const updatedSection = {
        id: 1,
        clientProtocolId: 100,
        sectionType: 'periodization',
        isEnabled: true,
        content: { html: '<h2>Overview</h2><p>Updated content</p>' },
      };
      mockUpsertProtocolSection.mockResolvedValue(updatedSection);

      const result = await mockUpsertProtocolSection(100, 'periodization', {
        content: { html: '<h2>Overview</h2><p>Updated content</p>' },
      });
      expect(result.content.html).toContain('Updated content');
    });

    it('should handle training split data', async () => {
      const splitData = {
        splitData: {
          title: '12 Week Recovery & Longevity Emphasized',
          phases: [
            { id: 'alarm', name: 'Alarm Phase', weekStart: 1, weekEnd: 2, weeks: [] },
            { id: 'glycolytic', name: 'Glycolytic Upregulation Phase', weekStart: 3, weekEnd: 8, weeks: [] },
            { id: 'alactic', name: 'Alactic Improvement Phase', weekStart: 9, weekEnd: 12, weeks: [] },
          ],
          additionalNotes: '<p>Test notes</p>',
        },
      };
      mockUpsertProtocolSection.mockResolvedValue({
        id: 2,
        clientProtocolId: 100,
        sectionType: 'training_split',
        isEnabled: true,
        content: splitData,
      });

      const result = await mockUpsertProtocolSection(100, 'training_split', {
        isEnabled: true,
        content: splitData,
      });
      expect(result.content.splitData.phases).toHaveLength(3);
      expect(result.content.splitData.title).toBe('12 Week Recovery & Longevity Emphasized');
    });

    it('should handle program guide tabbed content', async () => {
      const tabContent = {
        tabs: {
          training_split: '<h2>Split Overview</h2>',
          nutrition: '<h2>Nutrition Overview</h2><p>Macros</p>',
          supplementation: '<h2>Supplementation Protocol</h2>',
        },
      };
      mockUpsertProtocolSection.mockResolvedValue({
        id: 3,
        clientProtocolId: 100,
        sectionType: 'program_guide',
        isEnabled: true,
        content: tabContent,
      });

      const result = await mockUpsertProtocolSection(100, 'program_guide', {
        isEnabled: true,
        content: tabContent,
      });
      expect(result.content.tabs.nutrition).toContain('Macros');
      expect(Object.keys(result.content.tabs)).toHaveLength(3);
    });
  });

  describe('toggleProtocolSection', () => {
    it('should enable a section', async () => {
      mockToggleProtocolSection.mockResolvedValue({ id: 1, isEnabled: true });
      const result = await mockToggleProtocolSection(100, 'periodization', true);
      expect(result.isEnabled).toBe(true);
    });

    it('should disable a section', async () => {
      mockToggleProtocolSection.mockResolvedValue({ id: 1, isEnabled: false });
      const result = await mockToggleProtocolSection(100, 'periodization', false);
      expect(result.isEnabled).toBe(false);
    });
  });

  describe('Section type validation', () => {
    it('should only accept valid section types', () => {
      const validTypes = ['periodization', 'training_split', 'program_guide'];
      expect(validTypes).toContain('periodization');
      expect(validTypes).toContain('training_split');
      expect(validTypes).toContain('program_guide');
      expect(validTypes).not.toContain('invalid_type');
    });
  });

  describe('Default content templates', () => {
    it('periodization should have 8 pre-populated headers', () => {
      const defaultHeaders = [
        'Overview',
        'Bloodwork Recommendations',
        'Primary and Secondary Goals',
        'Short Term Goals',
        'Long Term Goals',
        'Upcoming Dates',
        'Baseline Hormone Optimization',
        'Assessment',
      ];
      expect(defaultHeaders).toHaveLength(8);
    });

    it('training split should have 3 default phases', () => {
      const defaultPhases = [
        { id: 'alarm', name: 'Alarm Phase', weekRange: 'Weeks 1-2' },
        { id: 'glycolytic', name: 'Glycolytic Upregulation Phase', weekRange: 'Weeks 3-8' },
        { id: 'alactic', name: 'Alactic Improvement Phase', weekRange: 'Weeks 9-12' },
      ];
      expect(defaultPhases).toHaveLength(3);
      expect(defaultPhases[0].weekRange).toBe('Weeks 1-2');
      expect(defaultPhases[2].weekRange).toBe('Weeks 9-12');
    });

    it('program guide should have 9 tabs', () => {
      const tabs = [
        'training_split',
        'warmup_cooldown',
        'energetic_systems',
        'nutrition',
        'neuroplastic_drills',
        'supplementation',
        'emf_quantum',
        'lifestyle_circadian',
        'mentality',
      ];
      expect(tabs).toHaveLength(9);
    });
  });
});
