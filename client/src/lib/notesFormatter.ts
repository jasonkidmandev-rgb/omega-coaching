/**
 * Convert plain text with markdown-like formatting to HTML.
 * Handles: line breaks, **bold**, URLs, ---- separators, -- dashes
 * 
 * If the text already contains HTML tags, it's returned as-is.
 */
export function formatNotesHtml(text: string | null | undefined): string {
  if (!text) return '';
  
  // If it already looks like HTML (has tags), return as-is
  if (/<(?:p|br|strong|em|a |ul|ol|li|hr|div|span)[>\s/]/.test(text)) {
    return text;
  }

  let html = text;
  
  // Escape HTML entities first
  html = html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  
  // Convert **bold** to <strong>
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  
  // Convert URLs to clickable links
  html = html.replace(/(https?:\/\/[^\s<,)]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-blue-600 underline">$1</a>');
  
  // Convert ---- or more dashes on their own line to <hr>
  html = html.replace(/^-{3,}$/gm, '</p><hr class="my-2 border-gray-300"><p>');
  
  // Convert " -- " or " ---- " inline separators to an em dash
  html = html.replace(/\s--+\s/g, ' — ');
  
  // Split into paragraphs on double newlines
  const paragraphs = html.split(/\n\n+/);
  if (paragraphs.length > 1) {
    html = paragraphs.map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');
  } else {
    // Single block — convert single newlines to <br>
    html = `<p>${html.replace(/\n/g, '<br>')}</p>`;
  }
  
  // Clean up empty paragraphs that might result from hr conversion
  html = html.replace(/<p><\/p>/g, '');
  
  return html;
}
