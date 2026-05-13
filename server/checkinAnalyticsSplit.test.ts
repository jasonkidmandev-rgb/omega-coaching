import { describe, it, expect } from 'vitest';

// Test the filtering and summary computation logic used in CheckinAnalytics

type EngagementLevel = 'full_coaching' | 'self_guided_checkins' | 'protocol_only';

function filterByEngagement<T extends { engagementLevel?: EngagementLevel | null }>(
  items: T[] | undefined,
  level: 'full_coaching' | 'self_guided_checkins'
): T[] {
  if (!items) return [];
  if (level === 'self_guided_checkins') {
    return items.filter(item => item.engagementLevel === 'self_guided_checkins');
  }
  // Full Coaching: includes full_coaching, protocol_only, null, undefined
  return items.filter(item => item.engagementLevel !== 'self_guided_checkins');
}

function computeSummary(checkins: Array<{
  status: string | null;
  overallScore: number | null;
  hasLowScore: boolean | null;
  sentAt: string | Date | null;
}>) {
  const total = checkins.length;
  const pending = checkins.filter(c => c.status === 'pending').length;
  const submitted = checkins.filter(c => c.status === 'submitted').length;
  const reviewed = checkins.filter(c => c.status === 'reviewed').length;
  const expired = checkins.filter(c => c.status === 'incomplete').length;
  const lowScore = checkins.filter(c => c.hasLowScore).length;
  const sent = checkins.filter(c => c.sentAt).length;
  const responded = submitted + reviewed;
  const responseRate = sent > 0 ? Math.round((responded / sent) * 100) : 0;
  const scored = checkins.filter(c => c.overallScore !== null);
  const avgScore = scored.length > 0
    ? Math.round(scored.reduce((sum, c) => sum + (c.overallScore || 0), 0) / scored.length * 10) / 10
    : 0;
  return { total, pending, submitted, reviewed, expired, lowScore, responseRate, avgScore, responded };
}

describe('Check-In Analytics Engagement Level Split', () => {
  const mockSchedules = [
    { clientProtocolId: 1, clientName: 'Alice', engagementLevel: 'full_coaching' as EngagementLevel },
    { clientProtocolId: 2, clientName: 'Bob', engagementLevel: 'full_coaching' as EngagementLevel },
    { clientProtocolId: 3, clientName: 'Charlie', engagementLevel: 'self_guided_checkins' as EngagementLevel },
    { clientProtocolId: 4, clientName: 'Diana', engagementLevel: 'protocol_only' as EngagementLevel },
    { clientProtocolId: 5, clientName: 'Eve', engagementLevel: 'self_guided_checkins' as EngagementLevel },
  ];

  const mockCheckins = [
    { id: 1, clientProtocolId: 1, status: 'reviewed', overallScore: 8, hasLowScore: false, sentAt: '2026-02-10', engagementLevel: 'full_coaching' as EngagementLevel },
    { id: 2, clientProtocolId: 1, status: 'submitted', overallScore: 7, hasLowScore: false, sentAt: '2026-02-17', engagementLevel: 'full_coaching' as EngagementLevel },
    { id: 3, clientProtocolId: 2, status: 'pending', overallScore: null, hasLowScore: false, sentAt: '2026-02-17', engagementLevel: 'full_coaching' as EngagementLevel },
    { id: 4, clientProtocolId: 3, status: 'reviewed', overallScore: 3, hasLowScore: true, sentAt: '2026-02-10', engagementLevel: 'self_guided_checkins' as EngagementLevel },
    { id: 5, clientProtocolId: 3, status: 'incomplete', overallScore: null, hasLowScore: false, sentAt: '2026-02-17', engagementLevel: 'self_guided_checkins' as EngagementLevel },
    { id: 6, clientProtocolId: 5, status: 'submitted', overallScore: 6, hasLowScore: false, sentAt: '2026-02-17', engagementLevel: 'self_guided_checkins' as EngagementLevel },
    { id: 7, clientProtocolId: 4, status: 'reviewed', overallScore: 9, hasLowScore: false, sentAt: '2026-02-10', engagementLevel: 'protocol_only' as EngagementLevel },
  ];

  describe('filterByEngagement', () => {
    it('filters schedules by full_coaching (includes full_coaching + protocol_only)', () => {
      const fc = filterByEngagement(mockSchedules, 'full_coaching');
      expect(fc).toHaveLength(3);
      expect(fc.map(s => s.clientName)).toEqual(['Alice', 'Bob', 'Diana']);
    });

    it('filters schedules by self_guided_checkins', () => {
      const sg = filterByEngagement(mockSchedules, 'self_guided_checkins');
      expect(sg).toHaveLength(2);
      expect(sg.map(s => s.clientName)).toEqual(['Charlie', 'Eve']);
    });

    it('protocol_only clients appear in full_coaching section', () => {
      const fc = filterByEngagement(mockSchedules, 'full_coaching');
      const protocolOnlyInFc = fc.filter(s => s.engagementLevel === 'protocol_only');
      expect(protocolOnlyInFc).toHaveLength(1);
      expect(protocolOnlyInFc[0].clientName).toBe('Diana');
    });

    it('returns empty array for undefined input', () => {
      const result = filterByEngagement(undefined, 'full_coaching');
      expect(result).toEqual([]);
    });

    it('returns empty array when no items match self_guided', () => {
      const items = [{ engagementLevel: 'protocol_only' as EngagementLevel }];
      const result = filterByEngagement(items, 'self_guided_checkins');
      expect(result).toEqual([]);
    });

    it('null/undefined engagement level goes to full_coaching', () => {
      const items = [
        { engagementLevel: null },
        { engagementLevel: undefined },
        { engagementLevel: 'full_coaching' as EngagementLevel },
      ];
      const fc = filterByEngagement(items, 'full_coaching');
      expect(fc).toHaveLength(3);
      const sg = filterByEngagement(items, 'self_guided_checkins');
      expect(sg).toHaveLength(0);
    });

    it('filters checkins by full_coaching (includes full_coaching + protocol_only)', () => {
      const fc = filterByEngagement(mockCheckins, 'full_coaching');
      expect(fc).toHaveLength(4); // 3 full_coaching + 1 protocol_only
      expect(fc.every(c => c.engagementLevel !== 'self_guided_checkins')).toBe(true);
    });

    it('filters checkins by self_guided_checkins', () => {
      const sg = filterByEngagement(mockCheckins, 'self_guided_checkins');
      expect(sg).toHaveLength(3);
      expect(sg.every(c => c.engagementLevel === 'self_guided_checkins')).toBe(true);
    });
  });

  describe('computeSummary', () => {
    it('computes correct summary for full_coaching checkins (includes protocol_only)', () => {
      const fcCheckins = filterByEngagement(mockCheckins, 'full_coaching');
      const summary = computeSummary(fcCheckins);
      expect(summary.total).toBe(4); // 3 full_coaching + 1 protocol_only
      expect(summary.pending).toBe(1);
      expect(summary.submitted).toBe(1);
      expect(summary.reviewed).toBe(2); // 1 fc + 1 protocol_only
      expect(summary.expired).toBe(0);
      expect(summary.lowScore).toBe(0);
      expect(summary.responded).toBe(3); // 1 submitted + 2 reviewed
      // 4 sent, 3 responded = 75%
      expect(summary.responseRate).toBe(75);
      // Scored: 8, 7, 9 => avg 8
      expect(summary.avgScore).toBe(8);
    });

    it('computes correct summary for self_guided_checkins', () => {
      const sgCheckins = filterByEngagement(mockCheckins, 'self_guided_checkins');
      const summary = computeSummary(sgCheckins);
      expect(summary.total).toBe(3);
      expect(summary.pending).toBe(0);
      expect(summary.submitted).toBe(1);
      expect(summary.reviewed).toBe(1);
      expect(summary.expired).toBe(1);
      expect(summary.lowScore).toBe(1);
      expect(summary.responded).toBe(2);
      // 3 sent, 2 responded = 67%
      expect(summary.responseRate).toBe(67);
      // Scored: 3 and 6 => avg 4.5
      expect(summary.avgScore).toBe(4.5);
    });

    it('handles empty checkins array', () => {
      const summary = computeSummary([]);
      expect(summary.total).toBe(0);
      expect(summary.pending).toBe(0);
      expect(summary.responseRate).toBe(0);
      expect(summary.avgScore).toBe(0);
    });

    it('handles checkins with no scores', () => {
      const noScoreCheckins = [
        { status: 'pending', overallScore: null, hasLowScore: false, sentAt: '2026-02-17' },
        { status: 'pending', overallScore: null, hasLowScore: false, sentAt: '2026-02-17' },
      ];
      const summary = computeSummary(noScoreCheckins);
      expect(summary.total).toBe(2);
      expect(summary.pending).toBe(2);
      expect(summary.avgScore).toBe(0);
      expect(summary.responseRate).toBe(0);
    });
  });

  describe('engagement level data integrity', () => {
    it('all checkins have an engagement level', () => {
      mockCheckins.forEach(c => {
        expect(c.engagementLevel).toBeDefined();
        expect(['full_coaching', 'self_guided_checkins', 'protocol_only']).toContain(c.engagementLevel);
      });
    });

    it('full coaching + self guided = total (no overlap)', () => {
      const fc = filterByEngagement(mockCheckins, 'full_coaching');
      const sg = filterByEngagement(mockCheckins, 'self_guided_checkins');
      expect(fc.length + sg.length).toBe(mockCheckins.length);
    });

    it('full coaching + self guided schedules = total schedules (no overlap)', () => {
      const fc = filterByEngagement(mockSchedules, 'full_coaching');
      const sg = filterByEngagement(mockSchedules, 'self_guided_checkins');
      expect(fc.length + sg.length).toBe(mockSchedules.length);
    });
  });
});
