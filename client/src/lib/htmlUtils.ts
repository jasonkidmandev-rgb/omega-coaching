import DOMPurify from 'dompurify';
import { linkifyMessage } from '@/lib/linkify';

/**
 * Sanitize HTML for safe rendering in chat bubbles.
 * Allows basic formatting tags but strips scripts, styles, etc.
 */
export function sanitizeChatHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'del',
      'ul', 'ol', 'li', 'a', 'span',
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'style'],
  });
}

/**
 * Check if a message contains HTML tags (rich text).
 * Used to decide whether to run linkify (for plain text) or sanitize (for HTML).
 */
export function isHtmlMessage(message: string): boolean {
  return /<[a-z][\s\S]*>/i.test(message);
}

/**
 * Process a chat message for display:
 * - If it contains HTML (rich text), sanitize it
 * - If it's plain text, run linkify on it
 */
export function processMessageForDisplay(message: string, isCoachBubble: boolean): string {
  if (isHtmlMessage(message)) {
    return sanitizeChatHtml(message);
  }
  // Fall back to linkify for legacy plain text messages
  return linkifyMessage(message, isCoachBubble);
}
