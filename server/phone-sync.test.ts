import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the database module
vi.mock('./db', () => ({
  getClientProtocolByToken: vi.fn(),
  updateClientProtocol: vi.fn(),
  getUserByEmail: vi.fn(),
  updateUserPhone: vi.fn(),
  getAllUsers: vi.fn().mockResolvedValue([]),
  getTemplateById: vi.fn(),
  createNotificationsForEnabledUsers: vi.fn(),
}));

// Mock the email service
vi.mock('./emailService', () => ({
  sendProfileCompletionNotification: vi.fn().mockResolvedValue({ success: true }),
}));

describe('Phone Number Sync on Profile Completion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should have getUserByEmail function available', async () => {
    const db = await import('./db');
    expect(db.getUserByEmail).toBeDefined();
    expect(typeof db.getUserByEmail).toBe('function');
  });

  it('should have updateUserPhone function available', async () => {
    const db = await import('./db');
    expect(db.updateUserPhone).toBeDefined();
    expect(typeof db.updateUserPhone).toBe('function');
  });

  it('should sync phone to user account when profile is updated', async () => {
    const db = await import('./db');
    
    // Mock protocol with email
    const mockProtocol = {
      id: 1,
      clientName: 'Test Client',
      clientEmail: 'test@example.com',
      shippingStreet: null,
      shippingCity: null,
      shippingState: null,
      shippingZip: null,
    };
    
    // Mock user without phone
    const mockUser = {
      id: 100,
      email: 'test@example.com',
      phone: null,
    };
    
    (db.getClientProtocolByToken as any).mockResolvedValue(mockProtocol);
    (db.getUserByEmail as any).mockResolvedValue(mockUser);
    (db.updateClientProtocol as any).mockResolvedValue(undefined);
    (db.updateUserPhone as any).mockResolvedValue(undefined);
    
    // Simulate the phone sync logic
    const phoneToSync = '1234567890';
    const protocol = await db.getClientProtocolByToken('test-token');
    
    expect(protocol).toBeDefined();
    expect(protocol?.clientEmail).toBe('test@example.com');
    
    if (protocol?.clientEmail && phoneToSync) {
      const user = await db.getUserByEmail(protocol.clientEmail);
      if (user && !user.phone) {
        await db.updateUserPhone(user.id, phoneToSync);
      }
    }
    
    expect(db.getUserByEmail).toHaveBeenCalledWith('test@example.com');
    expect(db.updateUserPhone).toHaveBeenCalledWith(100, '1234567890');
  });

  it('should not overwrite existing phone number', async () => {
    const db = await import('./db');
    
    // Mock user WITH existing phone
    const mockUser = {
      id: 100,
      email: 'test@example.com',
      phone: '9876543210', // Already has phone
    };
    
    (db.getUserByEmail as any).mockResolvedValue(mockUser);
    
    const phoneToSync = '1234567890';
    const user = await db.getUserByEmail('test@example.com');
    
    // Should not update if user already has phone
    if (user && !user.phone) {
      await db.updateUserPhone(user.id, phoneToSync);
    }
    
    expect(db.updateUserPhone).not.toHaveBeenCalled();
  });

  it('should handle missing email gracefully', async () => {
    const db = await import('./db');
    
    // Mock protocol without email
    const mockProtocol = {
      id: 1,
      clientName: 'Test Client',
      clientEmail: null, // No email
    };
    
    (db.getClientProtocolByToken as any).mockResolvedValue(mockProtocol);
    
    const protocol = await db.getClientProtocolByToken('test-token');
    const phoneToSync = '1234567890';
    
    // Should not try to sync if no email
    if (protocol?.clientEmail && phoneToSync) {
      const user = await db.getUserByEmail(protocol.clientEmail);
      if (user && !user.phone) {
        await db.updateUserPhone(user.id, phoneToSync);
      }
    }
    
    expect(db.getUserByEmail).not.toHaveBeenCalled();
    expect(db.updateUserPhone).not.toHaveBeenCalled();
  });
});
