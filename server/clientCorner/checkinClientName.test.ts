import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Check-in Client Name Display', () => {
  const checkinRouterSource = readFileSync(
    join(__dirname, 'checkinRouter.ts'),
    'utf-8'
  );

  const checkinManagementSource = readFileSync(
    join(__dirname, '../../client/src/pages/admin/CheckinManagement.tsx'),
    'utf-8'
  );

  describe('Backend: checkin.list query', () => {
    it('should join with clientProtocols table', () => {
      // The list query should LEFT JOIN with clientProtocols
      expect(checkinRouterSource).toContain(
        'leftJoin(clientProtocols, eq(checkins.clientProtocolId, clientProtocols.id))'
      );
    });

    it('should select clientName from clientProtocols', () => {
      // The list query select should include clientName
      expect(checkinRouterSource).toContain('clientName: clientProtocols.clientName');
    });
  });

  describe('Backend: schedules.getAllEnabled query', () => {
    it('should join with clientProtocols table', () => {
      expect(checkinRouterSource).toContain(
        'leftJoin(clientProtocols, eq(checkinSchedules.clientProtocolId, clientProtocols.id))'
      );
    });

    it('should select clientName from clientProtocols in getAllEnabled', () => {
      // The getAllEnabled select should include clientName
      // Find the getAllEnabled section specifically
      const getAllEnabledIdx = checkinRouterSource.indexOf('getAllEnabled');
      const nextRouterIdx = checkinRouterSource.indexOf('getBulkStatus', getAllEnabledIdx);
      const getAllEnabledSection = checkinRouterSource.substring(getAllEnabledIdx, nextRouterIdx);
      
      expect(getAllEnabledSection).toContain('clientName: clientProtocols.clientName');
    });
  });

  describe('Frontend: CheckinManagement displays clientName', () => {
    it('should access clientName for check-in list items', () => {
      // The frontend should use clientName from the response
      expect(checkinManagementSource).toContain('.clientName');
    });

    it('should have fallback to Client #ID when clientName is missing', () => {
      // Should have a fallback pattern
      expect(checkinManagementSource).toContain('Client #');
    });

    it('should use clientName in the history tab (All Check-ins)', () => {
      // The history tab should display clientName
      expect(checkinManagementSource).toContain(
        '(checkin as any).clientName || `Client #${checkin.clientProtocolId}`'
      );
    });

    it('should use clientName in the schedules tab (Active Schedules)', () => {
      // The schedules tab should display clientName
      expect(checkinManagementSource).toContain(
        '(schedule as any).clientName || `Client #${schedule.clientProtocolId}`'
      );
    });
  });

  describe('Backend: checkin.get query', () => {
    it('should fetch clientName for individual check-in view', () => {
      // The get query should also fetch clientName for the review page
      const getIdx = checkinRouterSource.indexOf('get: adminProcedure');
      const nextSectionIdx = checkinRouterSource.indexOf('submit:', getIdx);
      const getSection = checkinRouterSource.substring(getIdx, nextSectionIdx);
      
      expect(getSection).toContain('clientName');
    });
  });

  describe('CheckinReview back button navigation', () => {
    const checkinReviewSource = readFileSync(
      join(__dirname, '../../client/src/pages/admin/CheckinReview.tsx'),
      'utf-8'
    );

    it('should navigate back to /admin/checkins (not /admin/operations)', () => {
      expect(checkinReviewSource).toContain("'/admin/checkins'");
      expect(checkinReviewSource).not.toContain("'/admin/operations'");
    });

    it('should have a back button with ArrowLeft icon', () => {
      expect(checkinReviewSource).toContain('ArrowLeft');
      expect(checkinReviewSource).toContain('Back');
    });
  });
});
