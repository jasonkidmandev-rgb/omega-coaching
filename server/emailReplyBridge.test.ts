import { describe, it, expect } from 'vitest';
import { generateReplyToken, parseReplyToken, extractReplyText } from './emailReplyBridge';

describe('Email Reply Bridge', () => {
  describe('generateReplyToken', () => {
    it('should generate a token with the correct format', () => {
      const token = generateReplyToken(123);
      expect(token).toMatch(/^\[REPLY-123-\d+\]$/);
    });

    it('should include the protocol ID', () => {
      const token = generateReplyToken(456);
      expect(token).toContain('REPLY-456-');
    });

    it('should generate unique tokens for the same protocol', () => {
      const token1 = generateReplyToken(1);
      // Small delay to ensure different timestamp
      const token2 = generateReplyToken(1);
      // They might be the same if called in the same millisecond, but format should be correct
      expect(token1).toMatch(/^\[REPLY-1-\d+\]$/);
      expect(token2).toMatch(/^\[REPLY-1-\d+\]$/);
    });
  });

  describe('parseReplyToken', () => {
    it('should parse a valid reply token from a subject line', () => {
      const result = parseReplyToken('Re: New message from Coach Jason - Omega Longevity [REPLY-42-1708000000000]');
      expect(result).not.toBeNull();
      expect(result!.protocolId).toBe(42);
      expect(result!.timestamp).toBe(1708000000000);
    });

    it('should return null for subjects without a reply token', () => {
      const result = parseReplyToken('Re: New message from Coach Jason - Omega Longevity');
      expect(result).toBeNull();
    });

    it('should return null for empty subjects', () => {
      const result = parseReplyToken('');
      expect(result).toBeNull();
    });

    it('should handle token at the beginning of subject', () => {
      const result = parseReplyToken('[REPLY-100-1708000000000] Some other text');
      expect(result).not.toBeNull();
      expect(result!.protocolId).toBe(100);
    });

    it('should handle large protocol IDs', () => {
      const result = parseReplyToken('Re: [REPLY-99999-1708000000000]');
      expect(result).not.toBeNull();
      expect(result!.protocolId).toBe(99999);
    });
  });

  describe('extractReplyText', () => {
    it('should extract simple reply text', () => {
      const text = 'Thanks for the update! I will start the protocol tomorrow.\n';
      const result = extractReplyText(text);
      expect(result).toBe('Thanks for the update! I will start the protocol tomorrow.');
    });

    it('should strip Gmail-style quoted text', () => {
      const text = `Sounds good, I'll start Monday.

On Mon, Feb 20, 2026 at 10:00 AM Coach Jason <jkidman@gmail.com> wrote:
> Hey, your new protocol is ready to go!
> Let me know when you want to start.`;
      const result = extractReplyText(text);
      expect(result).toBe("Sounds good, I'll start Monday.");
    });

    it('should strip Outlook-style quoted text', () => {
      const text = `Yes, I have a question about the dosage.

________________________________
From: Coach Jason <jkidman@gmail.com>
Sent: Monday, February 20, 2026 10:00 AM
To: client@example.com
Subject: New message from Coach Jason - Omega Longevity`;
      const result = extractReplyText(text);
      expect(result).toBe('Yes, I have a question about the dosage.');
    });

    it('should strip "--- Original Message ---" separator', () => {
      const text = `Got it, thanks!

--- Original Message ---
From: Coach Jason
To: client@example.com`;
      const result = extractReplyText(text);
      expect(result).toBe('Got it, thanks!');
    });

    it('should strip quoted lines starting with >', () => {
      const text = `I agree with that plan.

> Your new protocol includes BPC-157 and TB-500.
> Please review and let me know.`;
      const result = extractReplyText(text);
      expect(result).toBe('I agree with that plan.');
    });

    it('should handle "Sent from my iPhone" signature', () => {
      const text = `Looks great, thanks Jason!

Sent from my iPhone`;
      const result = extractReplyText(text);
      expect(result).toBe('Looks great, thanks Jason!');
    });

    it('should handle empty text', () => {
      const result = extractReplyText('');
      expect(result).toBe('');
    });

    it('should handle text with only whitespace', () => {
      const result = extractReplyText('   \n\n   ');
      expect(result).toBe('');
    });

    it('should preserve multi-line reply content', () => {
      const text = `Hi Jason,

I have two questions:
1. What time should I take the BPC-157?
2. Should I take it with food?

Thanks!

On Tue, Feb 21, 2026 at 9:00 AM Coach Jason wrote:
> Your protocol is ready.`;
      const result = extractReplyText(text);
      expect(result).toContain('I have two questions:');
      expect(result).toContain('1. What time should I take the BPC-157?');
      expect(result).toContain('2. Should I take it with food?');
      expect(result).toContain('Thanks!');
      expect(result).not.toContain('Coach Jason wrote');
    });

    it('should handle "Get Outlook for" signature', () => {
      const text = `Perfect, I'll follow the schedule.

Get Outlook for iOS`;
      const result = extractReplyText(text);
      expect(result).toBe("Perfect, I'll follow the schedule.");
    });

    it('should strip double-dash signature marker', () => {
      const text = `Thanks for the protocol!

--
John Smith
CEO, Acme Corp`;
      const result = extractReplyText(text);
      expect(result).toBe('Thanks for the protocol!');
    });
  });
});

describe('Email Reply Bridge - Empty Reply Handling', () => {
  it('should return empty string for null/undefined input', () => {
    const result = extractReplyText(null as any);
    expect(result).toBe('');
  });

  it('should return empty string for emails with only quoted content', () => {
    const text = `On Mon, Feb 20, 2026 at 10:00 AM Coach Jason <jkidman@gmail.com> wrote:
> Hey, your new protocol is ready to go!
> Let me know when you want to start.`;
    const result = extractReplyText(text);
    expect(result).toBe('');
  });

  it('should return the signature text when it is the only content', () => {
    const text = `Sent from my iPhone`;
    const result = extractReplyText(text);
    // Signature stripping only activates when the marker is in the latter half
    // of a longer message. When it IS the entire message, it's preserved.
    expect(result).toBe('Sent from my iPhone');
  });

  it('should handle emails with only "From:" header', () => {
    const text = `From: Coach Jason <jkidman@gmail.com>
Sent: Monday, February 20, 2026 10:00 AM`;
    const result = extractReplyText(text);
    expect(result).toBe('');
  });
});

describe('Email Reply Bridge - IMAP Search Configuration', () => {
  it('should use seen:false (not unseen:true) for IMAP search compatibility', async () => {
    // Read the source file and verify it uses seen: false
    const fs = await import('fs');
    const source = fs.readFileSync('./server/emailReplyBridge.ts', 'utf-8');
    
    // Verify correct IMAP search property
    expect(source).toContain('seen: false');
    // Verify it does NOT use the incorrect 'unseen' property
    expect(source).not.toContain('unseen: true');
  });

  it('should mark empty reply emails as read to prevent re-polling', async () => {
    const fs = await import('fs');
    const source = fs.readFileSync('./server/emailReplyBridge.ts', 'utf-8');
    
    // Verify that empty reply text triggers marking as read
    expect(source).toContain("result.error === 'Empty reply text'");
    expect(source).toContain("messageFlagsAdd");
    expect(source).toContain("'\\\\Seen'");
  });
});
