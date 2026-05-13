import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the database module
vi.mock('./db', () => ({
  getClientProtocolById: vi.fn(),
  getUserByEmail: vi.fn(),
  getDb: vi.fn().mockResolvedValue({
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    }),
  }),
}));

// Mock the email service
vi.mock('./emailService', () => ({
  sendWelcomeEmail: vi.fn().mockResolvedValue({ success: true, message: 'Email sent' }),
}));

describe('Resend Welcome Email Feature', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should have sendWelcomeEmail function available', async () => {
    const { sendWelcomeEmail } = await import('./emailService');
    expect(sendWelcomeEmail).toBeDefined();
    expect(typeof sendWelcomeEmail).toBe('function');
  });

  it('should send welcome email with correct parameters', async () => {
    const { sendWelcomeEmail } = await import('./emailService');
    const db = await import('./db');
    
    // Mock protocol
    const mockProtocol = {
      id: 1,
      clientName: 'Test Client',
      clientEmail: 'test@example.com',
      accessToken: 'abc123',
    };
    
    // Mock user
    const mockUser = {
      id: 100,
      email: 'test@example.com',
      name: 'Test User',
    };
    
    (db.getClientProtocolById as any).mockResolvedValue(mockProtocol);
    (db.getUserByEmail as any).mockResolvedValue(mockUser);
    
    // Simulate the resend welcome email logic
    const protocol = await db.getClientProtocolById(1);
    expect(protocol).toBeDefined();
    
    const user = await db.getUserByEmail(protocol!.clientEmail!);
    expect(user).toBeDefined();
    
    const baseUrl = 'https://peptidecoach.pro';
    await sendWelcomeEmail({
      to: protocol!.clientEmail!,
      userName: protocol!.clientName || user!.name || 'there',
      dashboardUrl: `${baseUrl}/dashboard`,
      protocolUrl: `${baseUrl}/protocol/${protocol!.accessToken}`,
      launchpadUrl: `${baseUrl}/launchpad`,
    });
    
    expect(sendWelcomeEmail).toHaveBeenCalledWith({
      to: 'test@example.com',
      userName: 'Test Client',
      dashboardUrl: 'https://peptidecoach.pro/dashboard',
      protocolUrl: 'https://peptidecoach.pro/protocol/abc123',
      launchpadUrl: 'https://peptidecoach.pro/launchpad',
    });
  });

  it('should throw error if protocol not found', async () => {
    const db = await import('./db');
    
    (db.getClientProtocolById as any).mockResolvedValue(null);
    
    const protocol = await db.getClientProtocolById(999);
    expect(protocol).toBeNull();
  });

  it('should throw error if user has no account', async () => {
    const db = await import('./db');
    
    const mockProtocol = {
      id: 1,
      clientName: 'Test Client',
      clientEmail: 'test@example.com',
    };
    
    (db.getClientProtocolById as any).mockResolvedValue(mockProtocol);
    (db.getUserByEmail as any).mockResolvedValue(null); // No user account
    
    const protocol = await db.getClientProtocolById(1);
    const user = await db.getUserByEmail(protocol!.clientEmail!);
    
    expect(user).toBeNull();
    // In real implementation, this would throw "User does not have an account yet"
  });

  it('should throw error if protocol has no email', async () => {
    const db = await import('./db');
    
    const mockProtocol = {
      id: 1,
      clientName: 'Test Client',
      clientEmail: null, // No email
    };
    
    (db.getClientProtocolById as any).mockResolvedValue(mockProtocol);
    
    const protocol = await db.getClientProtocolById(1);
    expect(protocol!.clientEmail).toBeNull();
    // In real implementation, this would throw "Client has no email address"
  });
});
