/**
 * Email Reply Bridge
 * 
 * Polls Gmail via IMAP for client replies to protocol chat notification emails,
 * parses the reply content, and creates protocol comments automatically.
 * 
 * How it works:
 * 1. When a coach sends a message, the notification email includes a unique
 *    reply token in the subject line: [REPLY-{protocolId}-{commentId}]
 * 2. This service polls Gmail IMAP for unread emails that match reply patterns
 * 3. It extracts the reply text (stripping quoted content), identifies the protocol,
 *    and creates a comment as the client
 * 4. The email UID is stored in the database (emailUid column) to prevent re-processing
 *    across server restarts
 */

import { ImapFlow, type FetchMessageObject } from 'imapflow';
import { simpleParser, type ParsedMail } from 'mailparser';

// Reply token format: REPLY-{protocolId}-{timestamp}
const REPLY_TOKEN_REGEX = /\[REPLY-(\d+)-(\d+)\]/;

// Generate a reply token for a protocol
export function generateReplyToken(protocolId: number): string {
  return `[REPLY-${protocolId}-${Date.now()}]`;
}

// Parse a reply token from a subject line
export function parseReplyToken(subject: string): { protocolId: number; timestamp: number } | null {
  const match = subject.match(REPLY_TOKEN_REGEX);
  if (!match) return null;
  return {
    protocolId: parseInt(match[1], 10),
    timestamp: parseInt(match[2], 10),
  };
}

/**
 * Extract the actual reply text from an email, stripping quoted content.
 * Handles common email client reply patterns.
 */
export function extractReplyText(text: string): string {
  if (!text) return '';

  // Split into lines
  const lines = text.split('\n');
  const replyLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Stop at common reply markers
    if (/^On .+ wrote:$/i.test(trimmed)) break;
    if (/^-{3,}\s*Original Message\s*-{3,}$/i.test(trimmed)) break;
    if (/^-{3,}\s*Forwarded message\s*-{3,}$/i.test(trimmed)) break;
    if (/^From:\s/i.test(trimmed)) break;
    if (/^Sent:\s/i.test(trimmed)) break;
    if (/^>/.test(trimmed)) break; // Quoted text
    if (/^_{3,}$/.test(trimmed)) break; // Outlook separator
    // Gmail "On Mon, Jan 1, 2026 at 12:00 PM" pattern
    if (/^On\s+(Mon|Tue|Wed|Thu|Fri|Sat|Sun)/i.test(trimmed)) break;
    // "wrote:" at end of line (continuation of "On ... wrote:")
    if (/wrote:\s*$/i.test(trimmed) && replyLines.length > 0) {
      // Check if previous line started with "On"
      const prevLine = replyLines[replyLines.length - 1].trim();
      if (/^On\s/i.test(prevLine)) {
        replyLines.pop(); // Remove the "On..." line
        break;
      }
    }

    replyLines.push(line);
  }

  // Clean up: trim trailing empty lines and whitespace
  let result = replyLines.join('\n').trim();

  // Remove any email signature markers
  const sigMarkers = ['Sent from my iPhone', 'Sent from my iPad', 'Sent from Gmail', 'Get Outlook for'];
  for (const marker of sigMarkers) {
    const idx = result.lastIndexOf(marker);
    if (idx > 0 && idx > result.length * 0.5) {
      // Only strip if the marker is in the latter half of the message
      result = result.substring(0, idx).trim();
    }
  }

  // Handle "-- " or "--" signature separator (must be on its own line)
  const sigLines = result.split('\n');
  for (let i = sigLines.length - 1; i >= 0; i--) {
    const trimmedLine = sigLines[i].trim();
    if (trimmedLine === '--' || trimmedLine === '-- ') {
      // Only strip if it's in the latter portion of the message
      if (i > 0) {
        result = sigLines.slice(0, i).join('\n').trim();
        break;
      }
    }
  }

  return result;
}

/**
 * Create an IMAP client connected to Gmail
 */
function createImapClient(): ImapFlow | null {
  const user = process.env.GMAIL_IMAP_USER;
  const pass = process.env.GMAIL_IMAP_APP_PASSWORD;

  if (!user || !pass) {
    console.log('[EmailReplyBridge] Gmail IMAP credentials not configured');
    return null;
  }

  return new ImapFlow({
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    auth: { user, pass },
    logger: false,
  });
}

/**
 * Check if an email UID has already been processed (persisted in database)
 */
async function isUidAlreadyProcessed(uid: number): Promise<boolean> {
  try {
    const db = await import('./db');
    return await db.isEmailUidProcessed(String(uid));
  } catch (e) {
    console.warn('[EmailReplyBridge] Failed to check emailUid dedup:', e);
    return false;
  }
}

/**
 * Process a single email message and create a protocol comment if it's a valid reply
 */
async function processReplyEmail(
  parsed: ParsedMail,
  uid: number,
): Promise<{ processed: boolean; protocolId?: number; error?: string }> {
  try {
    const subject = parsed.subject || '';
    const token = parseReplyToken(subject);

    if (!token) {
      return { processed: false, error: 'No reply token found in subject' };
    }

    const { protocolId } = token;

    // Extract the reply text
    const rawText = parsed.text || '';
    const replyText = extractReplyText(rawText);

    if (!replyText || replyText.length < 1) {
      console.log(`[EmailReplyBridge] Empty reply from email UID ${uid}, skipping`);
      return { processed: false, error: 'Empty reply text' };
    }

    // Get sender email
    const senderEmail = parsed.from?.value?.[0]?.address;
    if (!senderEmail) {
      return { processed: false, error: 'No sender email found' };
    }

    // Look up the protocol
    const db = await import('./db');
    const protocol = await db.getClientProtocolById(protocolId);

    if (!protocol) {
      console.warn(`[EmailReplyBridge] Protocol ${protocolId} not found for reply from ${senderEmail}`);
      return { processed: false, error: `Protocol ${protocolId} not found` };
    }

    // Verify the sender matches the client email (case-insensitive)
    if (!protocol.clientEmail || protocol.clientEmail.toLowerCase() !== senderEmail.toLowerCase()) {
      console.warn(`[EmailReplyBridge] Sender ${senderEmail} doesn't match protocol client ${protocol.clientEmail}`);
      return { processed: false, error: 'Sender email mismatch' };
    }

    // Create the comment WITH emailUid for deduplication
    const comment = await db.createProtocolComment({
      clientProtocolId: protocolId,
      authorType: 'client',
      authorName: protocol.clientName || 'Client',
      message: `📧 ${replyText}`,
      emailUid: String(uid),
    });

    console.log(`[EmailReplyBridge] Created comment ${comment.id} on protocol ${protocolId} from ${senderEmail} (emailUid=${uid})`);

    // Track in notes history
    try {
      await db.createNotesHistoryEntry({
        clientProtocolId: protocolId,
        noteType: 'comment',
        content: `[Email Reply] ${replyText}`,
        commentId: comment.id,
        changedByName: protocol.clientName || 'Client (via email)',
        changeType: 'created',
      });
    } catch (e) {
      console.warn('[EmailReplyBridge] Failed to track comment history:', e);
    }

    // Send notification to admins about the new client message
    try {
      const { sendNewMessageEmailToAdmins } = await import('./emailService');
      await sendNewMessageEmailToAdmins({
        clientName: protocol.clientName || 'Client',
        clientEmail: senderEmail,
        messagePreview: `[Email Reply] ${replyText}`,
        protocolId: protocol.id,
      });
    } catch (e) {
      console.warn('[EmailReplyBridge] Failed to notify admins:', e);
    }

    // Also create in-app notification for admins
    try {
      await db.createNotificationsForEnabledUsers(
        'client_comment',
        `Email Reply from ${protocol.clientName || 'Client'}`,
        `${protocol.clientName || 'A client'} replied via email: "${replyText.substring(0, 100)}${replyText.length > 100 ? '...' : ''}"`,
        protocolId,
      );
    } catch (e) {
      console.warn('[EmailReplyBridge] Failed to create in-app notification:', e);
    }

    return { processed: true, protocolId };
  } catch (error) {
    console.error('[EmailReplyBridge] Error processing reply email:', error);
    return { processed: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Poll Gmail IMAP for new reply emails and process them
 */
export async function pollForReplies(): Promise<{
  checked: number;
  processed: number;
  errors: number;
}> {
  const stats = { checked: 0, processed: 0, errors: 0 };

  const client = createImapClient();
  if (!client) {
    return stats;
  }

  try {
    await client.connect();

    // Open All Mail - Gmail threads replies to sent messages there, not always in INBOX
    const lock = await client.getMailboxLock('[Gmail]/All Mail');

    try {
      // Search for UNSEEN emails with our reply token pattern in subject
      const messages = await client.search({
        seen: false,
        subject: 'REPLY-',
        since: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
      }, { uid: true });

      if (!messages || messages.length === 0) {
        console.log('[EmailReplyBridge] No emails with REPLY- in subject found in All Mail');
        return stats;
      }

      console.log(`[EmailReplyBridge] Found ${messages.length} emails with REPLY- in [Gmail]/All Mail (last 7 days). UIDs: ${messages.slice(0, 20).join(', ')}`);

      // Process each message (limit to 50 per poll to avoid timeouts)
      const toProcess = messages.slice(0, 50);

      for (const uid of toProcess) {
        stats.checked++;

        try {
          // *** DATABASE-BACKED DEDUPLICATION ***
          // Check the database FIRST before even fetching the email content
          const alreadyProcessed = await isUidAlreadyProcessed(uid);
          if (alreadyProcessed) {
            continue; // Skip - already in database
          }

          // Fetch the full message
          const message = await client.fetchOne(uid, { source: true }, { uid: true });
          if (!message || !('source' in message) || !message.source) continue;

          // Parse the email
          const parsed = await simpleParser(message.source);

          // Check if subject contains our reply token
          const subject = parsed.subject || '';
          const senderAddr = parsed.from?.value?.[0]?.address || 'unknown';
          const gmailUser = process.env.GMAIL_IMAP_USER || '';
          // Skip our own sent messages (we only want replies FROM clients)
          if (senderAddr.toLowerCase() === gmailUser.toLowerCase()) {
            continue;
          }
          
          if (!REPLY_TOKEN_REGEX.test(subject)) {
            continue;
          }
          
          console.log(`[EmailReplyBridge] Processing reply UID ${uid}: from=${senderAddr} subject="${subject.substring(0, 80)}"`);

          // Process the reply
          const result = await processReplyEmail(parsed, uid);

          if (result.processed) {
            stats.processed++;
            // Mark as read
            try { await client.messageFlagsAdd(uid, ['\\Seen'], { uid: true }); } catch (_) { /* All Mail may not support flags */ }
            console.log(`[EmailReplyBridge] Successfully processed email UID ${uid} (protocol ${result.protocolId})`);
          } else if (result.error) {
            stats.errors++;
            console.log(`[EmailReplyBridge] Skipped email UID ${uid}: ${result.error}`);
            // Mark permanently-skippable emails as read so they don't get re-polled every cycle
            if (result.error === 'Empty reply text' || result.error === 'No sender email') {
              try { await client.messageFlagsAdd(uid, ['\\Seen'], { uid: true }); } catch (_) { /* ignore */ }
            }
          }
        } catch (msgError) {
          stats.errors++;
          console.error(`[EmailReplyBridge] Error processing email UID ${uid}:`, msgError);
        }
      }
    } finally {
      lock.release();
    }

    await client.logout();
  } catch (error) {
    console.error('[EmailReplyBridge] IMAP connection error:', error);
    try { await client.logout(); } catch (_) { /* ignore */ }
  }

  console.log(`[EmailReplyBridge] Poll complete: checked=${stats.checked}, processed=${stats.processed}, errors=${stats.errors}`);
  return stats;
}

// ============ POLLING INTERVAL MANAGEMENT ============

let pollInterval: ReturnType<typeof setInterval> | null = null;
const DEFAULT_POLL_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes

/**
 * Start the email reply polling service
 */
export function startEmailReplyPolling(intervalMs?: number): void {
  const user = process.env.GMAIL_IMAP_USER;
  const pass = process.env.GMAIL_IMAP_APP_PASSWORD;

  if (!user || !pass) {
    console.log('[EmailReplyBridge] Gmail IMAP not configured, email reply bridge disabled');
    return;
  }

  if (pollInterval) {
    console.log('[EmailReplyBridge] Polling already running, restarting...');
    stopEmailReplyPolling();
  }

  const interval = intervalMs || DEFAULT_POLL_INTERVAL_MS;
  console.log(`[EmailReplyBridge] Starting email reply polling every ${interval / 1000}s`);

  // Run immediately on start
  pollForReplies().catch(err => {
    console.error('[EmailReplyBridge] Initial poll failed:', err);
  });

  // Then run on interval
  pollInterval = setInterval(() => {
    pollForReplies().catch(err => {
      console.error('[EmailReplyBridge] Poll failed:', err);
    });
  }, interval);
}

/**
 * Stop the email reply polling service
 */
export function stopEmailReplyPolling(): void {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
    console.log('[EmailReplyBridge] Email reply polling stopped');
  }
}

/**
 * Get the current status of the email reply bridge
 */
export function getEmailReplyBridgeStatus(): {
  enabled: boolean;
  imapConfigured: boolean;
  pollingActive: boolean;
  imapUser: string | null;
} {
  const user = process.env.GMAIL_IMAP_USER || null;
  const pass = process.env.GMAIL_IMAP_APP_PASSWORD;

  return {
    enabled: !!(user && pass),
    imapConfigured: !!(user && pass),
    pollingActive: pollInterval !== null,
    imapUser: user,
  };
}
