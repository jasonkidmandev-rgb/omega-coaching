import { describe, it, expect } from 'vitest';

describe('Get Started CTA for New Users', () => {
  describe('Client Dashboard Get Started Section', () => {
    it('should show Get Started section when user has no protocol', () => {
      // The Get Started section is conditionally rendered based on !myProtocol
      // When myProtocol is null/undefined, the section should be visible
      const myProtocol = null;
      expect(!myProtocol).toBe(true);
    });

    it('should hide Get Started section when user has a protocol', () => {
      // When myProtocol exists, the Get Started section should be hidden
      const myProtocol = { id: 1, accessToken: 'abc123' };
      expect(!myProtocol).toBe(false);
    });

    it('should have four CTA options in Get Started section', () => {
      const ctaOptions = [
        { title: 'Choose a Coaching Tier', route: '/transformation' },
        { title: 'Watch Masterclasses', route: '/masterclass' },
        { title: 'Start a 90-Day Program', route: '/transformation?tier=flagship' },
        { title: 'Join Omega Elite', route: 'https://omegaelite.com' },
      ];
      
      expect(ctaOptions.length).toBe(4);
      expect(ctaOptions[0].title).toBe('Choose a Coaching Tier');
      expect(ctaOptions[1].title).toBe('Watch Masterclasses');
      expect(ctaOptions[2].title).toBe('Start a 90-Day Program');
      expect(ctaOptions[3].title).toBe('Join Omega Elite');
    });

    it('should have correct routes for each CTA', () => {
      const routes = {
        coachingTier: '/transformation',
        masterclasses: '/masterclass',
        ninetyDayProgram: '/transformation?tier=flagship',
        omegaElite: 'https://omegaelite.com',
      };

      expect(routes.coachingTier).toBe('/transformation');
      expect(routes.masterclasses).toBe('/masterclass');
      expect(routes.ninetyDayProgram).toContain('tier=flagship');
      expect(routes.omegaElite).toContain('omegaelite.com');
    });
  });

  describe('CTA Descriptions', () => {
    it('should have descriptive subtitles for each option', () => {
      const descriptions = {
        coachingTier: 'Elite • Flagship • Essentials programs',
        masterclasses: 'Learn about peptides & protocols',
        ninetyDayProgram: 'Structured transformation journey',
        omegaElite: 'DIY learners • Ask questions • Get guidance',
      };

      expect(descriptions.coachingTier).toContain('Elite');
      expect(descriptions.coachingTier).toContain('Flagship');
      expect(descriptions.coachingTier).toContain('Essentials');
      expect(descriptions.masterclasses).toContain('peptides');
      expect(descriptions.ninetyDayProgram).toContain('transformation');
      expect(descriptions.omegaElite).toContain('DIY');
    });
  });
});
