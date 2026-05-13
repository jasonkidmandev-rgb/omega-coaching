/**
 * Server-side HTML to plain text conversion.
 * Used for email previews, push notification bodies, and in-app notification text.
 * No DOM dependency - works in Node.js.
 */

/**
 * Convert HTML to plain text by stripping tags and converting common elements.
 * Handles TipTap-generated HTML (paragraphs, lists, bold, italic, links, etc.)
 */
export function htmlToPlainText(html: string): string {
  if (!html) return '';
  
  // If it doesn't contain HTML tags, return as-is (plain text message)
  if (!/<[a-z][\s\S]*>/i.test(html)) {
    return html;
  }

  let text = html;

  // Convert <br> and <br/> to newlines
  text = text.replace(/<br\s*\/?>/gi, '\n');

  // Convert </p> to double newline (paragraph break)
  text = text.replace(/<\/p>/gi, '\n');

  // Convert list items to bullet points
  text = text.replace(/<li[^>]*>/gi, '• ');
  text = text.replace(/<\/li>/gi, '\n');

  // Extract link text with URL
  text = text.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '$2 ($1)');

  // Remove all remaining HTML tags
  text = text.replace(/<[^>]+>/g, '');

  // Decode common HTML entities
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  text = text.replace(/&nbsp;/g, ' ');

  // Clean up whitespace
  text = text.replace(/\n{3,}/g, '\n\n'); // Max 2 consecutive newlines
  text = text.replace(/[ \t]+/g, ' ');     // Collapse spaces
  text = text.replace(/^ +/gm, '');         // Trim leading spaces per line

  return text.trim();
}

/**
 * Strip HTML and truncate for use as a preview (e.g., push notifications, inbox preview).
 */
export function htmlToPreview(html: string, maxLength: number = 200): string {
  const text = htmlToPlainText(html);
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}
