import { describe, it, expect } from 'vitest';

// Test the linkifyMessage logic (same regex logic as the client utility)
function linkifyMessage(message: string, isCoachBubble: boolean = false): string {
  const urlRegex = /(https?:\/\/[^\s<>"']+|www\.[^\s<>"']+\.[^\s<>"']+)/gi;
  
  let result = message.replace(urlRegex, (url) => {
    let cleanUrl = url;
    const lastChar = cleanUrl[cleanUrl.length - 1];
    let trailing = '';
    if (['.', ',', ';', ':', '!'].includes(lastChar) && !cleanUrl.match(/\.\w+$/)) {
      trailing = lastChar;
      cleanUrl = cleanUrl.slice(0, -1);
    }
    
    const href = cleanUrl.startsWith('www.') ? `https://${cleanUrl}` : cleanUrl;
    const linkColor = isCoachBubble 
      ? 'color: #bfdbfe; text-decoration: underline;' 
      : 'color: #2563eb; text-decoration: underline;';
    
    return `<a href="${href}" target="_blank" rel="noopener noreferrer" style="${linkColor}">${cleanUrl}</a>${trailing}`;
  });
  
  result = result.replace(/\n/g, '<br />');
  
  return result;
}

describe('linkifyMessage', () => {
  it('should convert https URLs to clickable links', () => {
    const result = linkifyMessage('Check this out https://example.com/page');
    expect(result).toContain('<a href="https://example.com/page"');
    expect(result).toContain('target="_blank"');
    expect(result).toContain('rel="noopener noreferrer"');
    expect(result).toContain('>https://example.com/page</a>');
  });

  it('should convert http URLs to clickable links', () => {
    const result = linkifyMessage('Visit http://example.com');
    expect(result).toContain('<a href="http://example.com"');
  });

  it('should convert www URLs to clickable links with https prefix', () => {
    const result = linkifyMessage('Go to www.example.com');
    expect(result).toContain('<a href="https://www.example.com"');
    expect(result).toContain('>www.example.com</a>');
  });

  it('should handle multiple URLs in one message', () => {
    const result = linkifyMessage('Check https://one.com and https://two.com');
    expect(result).toContain('<a href="https://one.com"');
    expect(result).toContain('<a href="https://two.com"');
  });

  it('should preserve text around URLs', () => {
    const result = linkifyMessage('Before https://example.com after');
    expect(result).toContain('Before ');
    expect(result).toContain(' after');
  });

  it('should convert newlines to br tags', () => {
    const result = linkifyMessage('Line 1\nLine 2');
    expect(result).toContain('Line 1<br />Line 2');
  });

  it('should handle URLs with paths and query params', () => {
    const result = linkifyMessage('See https://example.com/path?q=test&page=1#section');
    expect(result).toContain('href="https://example.com/path?q=test&page=1#section"');
  });

  it('should use blue color for client bubble links', () => {
    const result = linkifyMessage('https://example.com', false);
    expect(result).toContain('color: #2563eb');
  });

  it('should use light blue color for coach bubble links', () => {
    const result = linkifyMessage('https://example.com', true);
    expect(result).toContain('color: #bfdbfe');
  });

  it('should handle messages with no URLs', () => {
    const result = linkifyMessage('Just a normal message');
    expect(result).toBe('Just a normal message');
    expect(result).not.toContain('<a');
  });

  it('should handle empty messages', () => {
    const result = linkifyMessage('');
    expect(result).toBe('');
  });

  it('should handle URLs at the start and end of message', () => {
    const result = linkifyMessage('https://start.com text https://end.com');
    expect(result).toContain('<a href="https://start.com"');
    expect(result).toContain('<a href="https://end.com"');
  });

  it('should handle URLs with file extensions', () => {
    const result = linkifyMessage('Download https://example.com/file.pdf');
    expect(result).toContain('href="https://example.com/file.pdf"');
  });
});
