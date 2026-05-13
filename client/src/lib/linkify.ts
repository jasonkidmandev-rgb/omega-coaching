/**
 * Convert URLs in a message string into clickable anchor tags.
 * Also converts newlines to <br /> tags.
 * 
 * @param message - The raw message text
 * @param isCoachBubble - Whether the message is in a coach (dark) bubble for styling
 * @returns HTML string with URLs wrapped in <a> tags and newlines as <br />
 */
export function linkifyMessage(message: string, isCoachBubble: boolean = false): string {
  // First escape any existing HTML to prevent XSS (the message is already set via dangerouslySetInnerHTML)
  // But since the existing code already uses dangerouslySetInnerHTML with raw message content,
  // we maintain the same behavior and just add URL detection on top.
  
  // URL regex that matches http(s) URLs and www. URLs
  const urlRegex = /(https?:\/\/[^\s<>"']+|www\.[^\s<>"']+\.[^\s<>"']+)/gi;
  
  // Replace URLs with anchor tags
  let result = message.replace(urlRegex, (url) => {
    // Clean trailing punctuation that's likely not part of the URL
    let cleanUrl = url;
    const trailingPunctuation = /[.,;:!?)]+$/;
    const trailingMatch = cleanUrl.match(trailingPunctuation);
    let trailing = '';
    if (trailingMatch) {
      // Only strip if it looks like sentence punctuation (single char at end)
      // But keep if it's part of a URL path
      const lastChar = cleanUrl[cleanUrl.length - 1];
      if (['.', ',', ';', ':', '!'].includes(lastChar) && !cleanUrl.match(/\.\w+$/)) {
        trailing = lastChar;
        cleanUrl = cleanUrl.slice(0, -1);
      }
    }
    
    const href = cleanUrl.startsWith('www.') ? `https://${cleanUrl}` : cleanUrl;
    const linkColor = isCoachBubble 
      ? 'color: #bfdbfe; text-decoration: underline;' 
      : 'color: #2563eb; text-decoration: underline;';
    
    return `<a href="${href}" target="_blank" rel="noopener noreferrer" style="${linkColor}">${cleanUrl}</a>${trailing}`;
  });
  
  // Replace newlines with <br /> tags
  result = result.replace(/\n/g, '<br />');
  
  return result;
}
