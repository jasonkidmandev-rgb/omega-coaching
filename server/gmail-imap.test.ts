import { describe, it, expect } from 'vitest';
import { ImapFlow } from 'imapflow';

describe('Gmail IMAP Credentials', () => {
  it('should connect to Gmail IMAP with app password', async () => {
    const user = process.env.GMAIL_IMAP_USER;
    const pass = process.env.GMAIL_IMAP_APP_PASSWORD;

    expect(user).toBeTruthy();
    expect(pass).toBeTruthy();

    const client = new ImapFlow({
      host: 'imap.gmail.com',
      port: 993,
      secure: true,
      auth: {
        user: user!,
        pass: pass!,
      },
      logger: false,
    });

    try {
      await client.connect();
      // If we get here, credentials are valid
      expect(client.usable).toBe(true);
      
      // Quick check: list mailboxes to confirm access
      const mailboxes = await client.list();
      expect(mailboxes.length).toBeGreaterThan(0);
      
      await client.logout();
    } catch (error: any) {
      // If connection fails, the credentials are invalid
      throw new Error(`Gmail IMAP connection failed: ${error.message}`);
    }
  }, 30000); // 30 second timeout for network operation
});
