import { describe, it, expect } from 'vitest';
// Imports the REAL function. This file previously defined its own copy of the regex
// logic and tested that, which meant it could not fail no matter what the app did — and
// the copy had already drifted from `client/src/lib/linkify.ts` (the real one strips a
// wider set of trailing punctuation, `/[.,;:!?)]+$/`). Testing a stale copy is worse than
// having no test: it reports green about code that no longer exists.
import { linkifyMessage } from '@/lib/linkify';

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
