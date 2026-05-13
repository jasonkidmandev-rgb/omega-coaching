import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the database functions
vi.mock('./db', () => ({
  getUserFavoritePeptides: vi.fn(),
  getUserFavoritePeptideIds: vi.fn(),
  addFavoritePeptide: vi.fn(),
  removeFavoritePeptide: vi.fn(),
  isPeptideFavorited: vi.fn(),
}));

import * as db from './db';

describe('Favorite Peptides Feature', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getUserFavoritePeptides', () => {
    it('should return empty array when user has no favorites', async () => {
      vi.mocked(db.getUserFavoritePeptides).mockResolvedValue([]);
      
      const result = await db.getUserFavoritePeptides(1);
      
      expect(result).toEqual([]);
      expect(db.getUserFavoritePeptides).toHaveBeenCalledWith(1);
    });

    it('should return favorites with peptide data', async () => {
      const mockFavorites = [
        {
          id: 1,
          peptideId: 10,
          createdAt: new Date(),
          peptide: {
            id: 10,
            name: 'BPC-157',
            description: 'Healing peptide',
            dosage: '250mcg',
            frequency: 'Daily',
          },
        },
      ];
      vi.mocked(db.getUserFavoritePeptides).mockResolvedValue(mockFavorites);
      
      const result = await db.getUserFavoritePeptides(1);
      
      expect(result).toHaveLength(1);
      expect(result[0].peptide.name).toBe('BPC-157');
    });
  });

  describe('getUserFavoritePeptideIds', () => {
    it('should return array of peptide IDs', async () => {
      vi.mocked(db.getUserFavoritePeptideIds).mockResolvedValue([1, 5, 10, 15]);
      
      const result = await db.getUserFavoritePeptideIds(1);
      
      expect(result).toEqual([1, 5, 10, 15]);
    });

    it('should return empty array when no favorites', async () => {
      vi.mocked(db.getUserFavoritePeptideIds).mockResolvedValue([]);
      
      const result = await db.getUserFavoritePeptideIds(1);
      
      expect(result).toEqual([]);
    });
  });

  describe('addFavoritePeptide', () => {
    it('should add a peptide to favorites', async () => {
      vi.mocked(db.addFavoritePeptide).mockResolvedValue({ id: 1, userId: 1, peptideId: 10 });
      
      const result = await db.addFavoritePeptide(1, 10);
      
      expect(result).toEqual({ id: 1, userId: 1, peptideId: 10 });
      expect(db.addFavoritePeptide).toHaveBeenCalledWith(1, 10);
    });

    it('should return existing favorite if already favorited', async () => {
      const existingFavorite = { id: 5, userId: 1, peptideId: 10 };
      vi.mocked(db.addFavoritePeptide).mockResolvedValue(existingFavorite);
      
      const result = await db.addFavoritePeptide(1, 10);
      
      expect(result).toEqual(existingFavorite);
    });
  });

  describe('removeFavoritePeptide', () => {
    it('should remove a peptide from favorites', async () => {
      vi.mocked(db.removeFavoritePeptide).mockResolvedValue(undefined);
      
      await db.removeFavoritePeptide(1, 10);
      
      expect(db.removeFavoritePeptide).toHaveBeenCalledWith(1, 10);
    });
  });

  describe('isPeptideFavorited', () => {
    it('should return true when peptide is favorited', async () => {
      vi.mocked(db.isPeptideFavorited).mockResolvedValue(true);
      
      const result = await db.isPeptideFavorited(1, 10);
      
      expect(result).toBe(true);
    });

    it('should return false when peptide is not favorited', async () => {
      vi.mocked(db.isPeptideFavorited).mockResolvedValue(false);
      
      const result = await db.isPeptideFavorited(1, 10);
      
      expect(result).toBe(false);
    });
  });

  describe('Toggle Favorite Logic', () => {
    it('should add favorite when not already favorited', async () => {
      vi.mocked(db.isPeptideFavorited).mockResolvedValue(false);
      vi.mocked(db.addFavoritePeptide).mockResolvedValue({ id: 1, userId: 1, peptideId: 10 });
      
      const isFavorited = await db.isPeptideFavorited(1, 10);
      expect(isFavorited).toBe(false);
      
      if (!isFavorited) {
        await db.addFavoritePeptide(1, 10);
      }
      
      expect(db.addFavoritePeptide).toHaveBeenCalledWith(1, 10);
      expect(db.removeFavoritePeptide).not.toHaveBeenCalled();
    });

    it('should remove favorite when already favorited', async () => {
      vi.mocked(db.isPeptideFavorited).mockResolvedValue(true);
      vi.mocked(db.removeFavoritePeptide).mockResolvedValue(undefined);
      
      const isFavorited = await db.isPeptideFavorited(1, 10);
      expect(isFavorited).toBe(true);
      
      if (isFavorited) {
        await db.removeFavoritePeptide(1, 10);
      }
      
      expect(db.removeFavoritePeptide).toHaveBeenCalledWith(1, 10);
      expect(db.addFavoritePeptide).not.toHaveBeenCalled();
    });
  });
});
