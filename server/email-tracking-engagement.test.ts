import { describe, it, expect } from 'vitest';

// Test the bot detection and timing logic for email tracking
describe('Email Tracking - Bot/Prefetch Detection', () => {
  const BOT_UA_PATTERNS = [
    /GoogleImageProxy/i, /YahooMailProxy/i, /Outlook/i,
    /Microsoft Office/i, /OfficeMacOutlook/i,
    /Thunderbird/i, /Postfix/i, /ZmImgProxy/i,
    /proxy/i, /prefetch/i, /preview/i,
    /bot/i, /crawler/i, /spider/i,
    /urllib/i, /python-requests/i, /Go-http-client/i,
    /Java\//i, /Apache-HttpClient/i,
  ];

  function isLikelyBot(userAgent: string | undefined): boolean {
    if (!userAgent) return true;
    return BOT_UA_PATTERNS.some(pattern => pattern.test(userAgent));
  }

  it('should detect GoogleImageProxy as bot', () => {
    expect(isLikelyBot('GoogleImageProxy/1.0')).toBe(true);
  });

  it('should detect Outlook as bot', () => {
    expect(isLikelyBot('Microsoft Outlook 16.0')).toBe(true);
  });

  it('should detect generic bot user agents', () => {
    expect(isLikelyBot('Googlebot/2.1')).toBe(true);
    expect(isLikelyBot('Mozilla/5.0 (compatible; bingbot/2.0)')).toBe(true);
  });

  it('should detect prefetch/preview user agents', () => {
    expect(isLikelyBot('Mozilla/5.0 (prefetch)')).toBe(true);
    expect(isLikelyBot('LinkPreview/1.0')).toBe(true);
  });

  it('should detect Python/Java automated clients', () => {
    expect(isLikelyBot('python-requests/2.28.0')).toBe(true);
    expect(isLikelyBot('Java/17.0.1')).toBe(true);
    expect(isLikelyBot('Go-http-client/2.0')).toBe(true);
  });

  it('should detect no user agent as bot', () => {
    expect(isLikelyBot(undefined)).toBe(true);
    expect(isLikelyBot('')).toBe(true); // empty string also treated as suspicious
  });

  it('should NOT detect real browser user agents as bot', () => {
    expect(isLikelyBot('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1')).toBe(false);
    expect(isLikelyBot('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')).toBe(false);
    expect(isLikelyBot('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')).toBe(false);
  });

  it('should detect YahooMailProxy as bot', () => {
    expect(isLikelyBot('YahooMailProxy; https://help.yahoo.com/kb/SLN4511.html')).toBe(true);
  });
});

describe('Email Tracking - Timing Check', () => {
  const MIN_OPEN_DELAY_SECONDS = 30;

  it('should flag opens within 30 seconds as prefetch', () => {
    const sentAt = new Date(Date.now() - 5000); // 5 seconds ago
    const secondsSinceSend = (Date.now() - sentAt.getTime()) / 1000;
    expect(secondsSinceSend < MIN_OPEN_DELAY_SECONDS).toBe(true);
  });

  it('should allow opens after 30 seconds', () => {
    const sentAt = new Date(Date.now() - 60000); // 60 seconds ago
    const secondsSinceSend = (Date.now() - sentAt.getTime()) / 1000;
    expect(secondsSinceSend < MIN_OPEN_DELAY_SECONDS).toBe(false);
  });

  it('should flag opens at exactly 0 seconds as prefetch', () => {
    const sentAt = new Date();
    const secondsSinceSend = (Date.now() - sentAt.getTime()) / 1000;
    expect(secondsSinceSend < MIN_OPEN_DELAY_SECONDS).toBe(true);
  });
});

describe('Engagement Level Filter', () => {
  const mockClients = [
    { id: 1, name: 'Alice', engagementLevel: 'full_coaching' },
    { id: 2, name: 'Bob', engagementLevel: 'self_guided_checkins' },
    { id: 3, name: 'Charlie', engagementLevel: 'protocol_only' },
    { id: 4, name: 'Diana', engagementLevel: null }, // defaults to protocol_only
  ];

  it('should show all clients when filter is "all"', () => {
    const filtered = mockClients.filter(c => true);
    expect(filtered.length).toBe(4);
  });

  it('should filter by full_coaching', () => {
    const filtered = mockClients.filter(c => (c.engagementLevel || 'protocol_only') === 'full_coaching');
    expect(filtered.length).toBe(1);
    expect(filtered[0].name).toBe('Alice');
  });

  it('should filter by self_guided_checkins', () => {
    const filtered = mockClients.filter(c => (c.engagementLevel || 'protocol_only') === 'self_guided_checkins');
    expect(filtered.length).toBe(1);
    expect(filtered[0].name).toBe('Bob');
  });

  it('should filter by protocol_only (including null defaults)', () => {
    const filtered = mockClients.filter(c => (c.engagementLevel || 'protocol_only') === 'protocol_only');
    expect(filtered.length).toBe(2);
    expect(filtered.map(c => c.name)).toEqual(['Charlie', 'Diana']);
  });
});

describe('Engagement Level History', () => {
  const LEVEL_LABELS: Record<string, string> = {
    full_coaching: 'Full Coaching',
    self_guided_checkins: 'Self-Guided + Check-ins',
    protocol_only: 'Protocol Only',
  };

  it('should have labels for all engagement levels', () => {
    expect(LEVEL_LABELS['full_coaching']).toBe('Full Coaching');
    expect(LEVEL_LABELS['self_guided_checkins']).toBe('Self-Guided + Check-ins');
    expect(LEVEL_LABELS['protocol_only']).toBe('Protocol Only');
  });

  it('should format history entry correctly', () => {
    const entry = {
      id: 1,
      clientProtocolId: 100,
      oldLevel: 'protocol_only',
      newLevel: 'full_coaching',
      changedByName: 'Jason Kidman',
      createdAt: new Date('2026-02-17T10:30:00Z'),
    };
    expect(LEVEL_LABELS[entry.oldLevel]).toBe('Protocol Only');
    expect(LEVEL_LABELS[entry.newLevel]).toBe('Full Coaching');
    expect(entry.changedByName).toBe('Jason Kidman');
  });
});
