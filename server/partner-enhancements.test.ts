import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the database module
vi.mock('./db', () => ({
  getAllAffiliatePartners: vi.fn(),
  createAffiliatePartner: vi.fn(),
  updateAffiliatePartner: vi.fn(),
  trackPartnerClick: vi.fn(),
}));

import * as db from './db';

describe('Partner Enhancements', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Partner Logo and Testimonial Fields', () => {
    it('should create partner with logo URL and testimonial', async () => {
      const mockPartner = {
        name: 'Test Partner',
        description: 'Test description',
        url: 'https://example.com',
        code: 'TEST10',
        discountText: '10% off',
        logoUrl: 'https://example.com/logo.png',
        testimonial: 'Great partner, highly recommend!',
        category: 'peptides' as const,
        isFeatured: true,
        isActive: true,
        sortOrder: 1,
      };

      vi.mocked(db.createAffiliatePartner).mockResolvedValue(1);

      const result = await db.createAffiliatePartner(mockPartner);
      
      expect(db.createAffiliatePartner).toHaveBeenCalledWith(mockPartner);
      expect(result).toBe(1);
    });

    it('should update partner with logo URL and testimonial', async () => {
      const updateData = {
        logoUrl: 'https://example.com/new-logo.png',
        testimonial: 'Updated testimonial text',
      };

      vi.mocked(db.updateAffiliatePartner).mockResolvedValue(undefined);

      await db.updateAffiliatePartner(1, updateData);
      
      expect(db.updateAffiliatePartner).toHaveBeenCalledWith(1, updateData);
    });

    it('should return partners with logo and testimonial fields', async () => {
      const mockPartners = [
        {
          id: 1,
          name: 'Limitless Biotech',
          logoUrl: 'https://example.com/limitless-logo.png',
          testimonial: 'Premium quality peptides',
          category: 'peptides',
          isActive: true,
        },
        {
          id: 2,
          name: 'Nootropics Depot',
          logoUrl: null,
          testimonial: null,
          category: 'nootropics',
          isActive: true,
        },
      ];

      vi.mocked(db.getAllAffiliatePartners).mockResolvedValue(mockPartners as any);

      const result = await db.getAllAffiliatePartners(true);
      
      expect(result).toHaveLength(2);
      expect(result[0].logoUrl).toBe('https://example.com/limitless-logo.png');
      expect(result[0].testimonial).toBe('Premium quality peptides');
      expect(result[1].logoUrl).toBeNull();
      expect(result[1].testimonial).toBeNull();
    });
  });

  describe('Partner Click Tracking', () => {
    it('should track partner click with user agent', async () => {
      vi.mocked(db.trackPartnerClick).mockResolvedValue({ success: true });

      const result = await db.trackPartnerClick(1, 'Mozilla/5.0 Test Browser');
      
      expect(db.trackPartnerClick).toHaveBeenCalledWith(1, 'Mozilla/5.0 Test Browser');
      expect(result).toEqual({ success: true });
    });

    it('should track partner click without user agent', async () => {
      vi.mocked(db.trackPartnerClick).mockResolvedValue({ success: true });

      const result = await db.trackPartnerClick(2, undefined);
      
      expect(db.trackPartnerClick).toHaveBeenCalledWith(2, undefined);
      expect(result).toEqual({ success: true });
    });
  });

  describe('Partner Categories', () => {
    it('should support all partner categories', async () => {
      const categories = ['peptides', 'supplements', 'nootropics', 'tools', 'health', 'other'];
      
      for (const category of categories) {
        const mockPartner = {
          name: `${category} Partner`,
          url: 'https://example.com',
          category: category as any,
        };

        vi.mocked(db.createAffiliatePartner).mockResolvedValue(1);
        
        await db.createAffiliatePartner(mockPartner);
        
        expect(db.createAffiliatePartner).toHaveBeenCalledWith(
          expect.objectContaining({ category })
        );
      }
    });
  });
});
