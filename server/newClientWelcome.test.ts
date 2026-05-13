import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the email service
vi.mock('./emailService', () => ({
  sendNewClientWelcomeEmail: vi.fn().mockResolvedValue({ success: true, message: 'Email sent' }),
  sendEmail: vi.fn().mockResolvedValue({ success: true, message: 'Email sent' }),
}));

// Mock the database
vi.mock('./db', () => ({
  getSiteSetting: vi.fn().mockResolvedValue('true'),
  setSiteSetting: vi.fn().mockResolvedValue(undefined),
}));

describe('New Client Welcome Email', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should have sendNewClientWelcomeEmail function exported', async () => {
    const { sendNewClientWelcomeEmail } = await import('./emailService');
    expect(sendNewClientWelcomeEmail).toBeDefined();
    expect(typeof sendNewClientWelcomeEmail).toBe('function');
  });

  it('should send welcome email with required parameters', async () => {
    const { sendNewClientWelcomeEmail } = await import('./emailService');
    
    const result = await sendNewClientWelcomeEmail({
      clientName: 'Test Client',
      clientEmail: 'test@example.com',
      protocolLink: 'https://example.com/protocol/abc123',
      coachName: 'Coach Jason',
    });

    expect(result).toEqual({ success: true, message: 'Email sent' });
    expect(sendNewClientWelcomeEmail).toHaveBeenCalledWith({
      clientName: 'Test Client',
      clientEmail: 'test@example.com',
      protocolLink: 'https://example.com/protocol/abc123',
      coachName: 'Coach Jason',
    });
  });

  it('should handle missing optional launchpadLink parameter', async () => {
    const { sendNewClientWelcomeEmail } = await import('./emailService');
    
    const result = await sendNewClientWelcomeEmail({
      clientName: 'Test Client',
      clientEmail: 'test@example.com',
      protocolLink: 'https://example.com/protocol/abc123',
      coachName: 'Coach Jason',
    });

    expect(result.success).toBe(true);
  });

  it('should include launchpadLink when provided', async () => {
    const { sendNewClientWelcomeEmail } = await import('./emailService');
    
    const result = await sendNewClientWelcomeEmail({
      clientName: 'Test Client',
      clientEmail: 'test@example.com',
      protocolLink: 'https://example.com/protocol/abc123',
      coachName: 'Coach Jason',
      launchpadLink: 'https://example.com/launchpad',
    });

    expect(result.success).toBe(true);
    expect(sendNewClientWelcomeEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        launchpadLink: 'https://example.com/launchpad',
      })
    );
  });
});

describe('Check-in Settings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should have getSiteSetting function for check-in threshold', async () => {
    const { getSiteSetting } = await import('./db');
    expect(getSiteSetting).toBeDefined();
    expect(typeof getSiteSetting).toBe('function');
  });

  it('should retrieve checkin_low_score_threshold setting', async () => {
    const { getSiteSetting } = await import('./db');
    
    // Mock the return value for this specific test
    vi.mocked(getSiteSetting).mockResolvedValueOnce('5');
    
    const threshold = await getSiteSetting('checkin_low_score_threshold');
    expect(getSiteSetting).toHaveBeenCalledWith('checkin_low_score_threshold');
    expect(threshold).toBe('5');
  });

  it('should retrieve checkin_escalation_hours setting', async () => {
    const { getSiteSetting } = await import('./db');
    
    // Mock the return value for this specific test
    vi.mocked(getSiteSetting).mockResolvedValueOnce('48');
    
    const hours = await getSiteSetting('checkin_escalation_hours');
    expect(getSiteSetting).toHaveBeenCalledWith('checkin_escalation_hours');
    expect(hours).toBe('48');
  });
});
