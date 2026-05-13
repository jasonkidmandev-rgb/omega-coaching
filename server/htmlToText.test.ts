import { describe, it, expect } from 'vitest';
import { htmlToPlainText, htmlToPreview } from './htmlToText';

describe('htmlToPlainText', () => {
  it('returns plain text as-is', () => {
    expect(htmlToPlainText('Hello world')).toBe('Hello world');
  });

  it('returns empty string for empty input', () => {
    expect(htmlToPlainText('')).toBe('');
  });

  it('strips simple HTML tags', () => {
    expect(htmlToPlainText('<p>Hello <strong>world</strong></p>')).toBe('Hello world');
  });

  it('converts paragraphs to newlines', () => {
    const html = '<p>First paragraph</p><p>Second paragraph</p>';
    expect(htmlToPlainText(html)).toBe('First paragraph\nSecond paragraph');
  });

  it('converts bullet lists to bullet points', () => {
    const html = '<ul><li>Item one</li><li>Item two</li></ul>';
    const result = htmlToPlainText(html);
    expect(result).toContain('• Item one');
    expect(result).toContain('• Item two');
  });

  it('converts ordered lists', () => {
    const html = '<ol><li>First</li><li>Second</li></ol>';
    const result = htmlToPlainText(html);
    expect(result).toContain('• First');
    expect(result).toContain('• Second');
  });

  it('converts <br> to newlines', () => {
    expect(htmlToPlainText('Line one<br>Line two')).toBe('Line one\nLine two');
    expect(htmlToPlainText('Line one<br/>Line two')).toBe('Line one\nLine two');
    expect(htmlToPlainText('Line one<br />Line two')).toBe('Line one\nLine two');
  });

  it('extracts link text with URL', () => {
    const html = '<a href="https://example.com">Click here</a>';
    expect(htmlToPlainText(html)).toBe('Click here (https://example.com)');
  });

  it('decodes HTML entities', () => {
    // Entities are only decoded when HTML tags are present (triggering the HTML path)
    expect(htmlToPlainText('<p>&amp; &lt; &gt; &quot; &#39;</p>')).toBe('& < > " \'');
  });

  it('handles TipTap-generated rich text', () => {
    const html = '<p><strong>Bold</strong> and <em>italic</em> and <u>underline</u></p><ul><li>Point 1</li><li>Point 2</li></ul>';
    const result = htmlToPlainText(html);
    expect(result).toContain('Bold and italic and underline');
    expect(result).toContain('• Point 1');
    expect(result).toContain('• Point 2');
  });

  it('handles Word paste HTML with mso classes', () => {
    const html = '<p class="MsoNormal" style="mso-layout-grid-align:none"><span style="font-family:Calibri">Hello from Word</span></p>';
    const result = htmlToPlainText(html);
    expect(result).toBe('Hello from Word');
  });

  it('collapses excessive whitespace', () => {
    const html = '<p>  Hello  </p><p></p><p></p><p>World</p>';
    const result = htmlToPlainText(html);
    expect(result).not.toContain('\n\n\n');
  });
});

describe('htmlToPreview', () => {
  it('truncates long text', () => {
    const longHtml = '<p>' + 'A'.repeat(300) + '</p>';
    const result = htmlToPreview(longHtml, 200);
    expect(result.length).toBeLessThanOrEqual(203); // 200 + '...'
    expect(result.endsWith('...')).toBe(true);
  });

  it('does not truncate short text', () => {
    expect(htmlToPreview('<p>Short</p>', 200)).toBe('Short');
  });

  it('strips HTML before truncating', () => {
    const html = '<p><strong>Bold</strong> text here</p>';
    expect(htmlToPreview(html, 10)).toBe('Bold text ...');
  });
});
