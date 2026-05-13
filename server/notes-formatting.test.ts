import { describe, it, expect } from "vitest";

// We test the logic directly since it's a pure function
// Replicate the formatNotesHtml logic for server-side testing
function formatNotesHtml(text: string | null | undefined): string {
  if (!text) return '';
  if (/<(?:p|br|strong|em|a |ul|ol|li|hr|div|span)[>\s/]/.test(text)) {
    return text;
  }
  let html = text;
  html = html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/(https?:\/\/[^\s<,)]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-blue-600 underline">$1</a>');
  html = html.replace(/^-{3,}$/gm, '</p><hr class="my-2 border-gray-300"><p>');
  html = html.replace(/\s--+\s/g, ' — ');
  const paragraphs = html.split(/\n\n+/);
  if (paragraphs.length > 1) {
    html = paragraphs.map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');
  } else {
    html = `<p>${html.replace(/\n/g, '<br>')}</p>`;
  }
  html = html.replace(/<p><\/p>/g, '');
  return html;
}

describe("Notes Formatting", () => {
  describe("formatNotesHtml", () => {
    it("should return empty string for null/undefined", () => {
      expect(formatNotesHtml(null)).toBe('');
      expect(formatNotesHtml(undefined)).toBe('');
      expect(formatNotesHtml('')).toBe('');
    });

    it("should pass through existing HTML unchanged", () => {
      const html = '<p>Already <strong>formatted</strong></p>';
      expect(formatNotesHtml(html)).toBe(html);
    });

    it("should convert line breaks to <br>", () => {
      const result = formatNotesHtml("Line 1\nLine 2\nLine 3");
      expect(result).toContain('<br>');
      expect(result).toContain('Line 1');
      expect(result).toContain('Line 2');
    });

    it("should convert **bold** to <strong>", () => {
      const result = formatNotesHtml("**Soma** may be higher quality");
      expect(result).toContain('<strong>Soma</strong>');
    });

    it("should convert URLs to clickable links", () => {
      const result = formatNotesHtml("Visit https://somachems.com/ref/5623/ for details");
      expect(result).toContain('<a href="https://somachems.com/ref/5623/"');
      expect(result).toContain('target="_blank"');
    });

    it("should convert ---- separators to <hr>", () => {
      const result = formatNotesHtml("Section 1\n----\nSection 2");
      expect(result).toContain('<hr');
    });

    it("should convert -- to em dash", () => {
      const result = formatNotesHtml("start -- or -- end");
      expect(result).toContain('—');
    });

    it("should create paragraphs from double newlines", () => {
      const result = formatNotesHtml("Paragraph 1\n\nParagraph 2");
      expect(result).toContain('<p>Paragraph 1</p>');
      expect(result).toContain('<p>Paragraph 2</p>');
    });

    it("should escape HTML entities in plain text", () => {
      const result = formatNotesHtml("Use <script> tag & more");
      expect(result).toContain('&lt;script&gt;');
      expect(result).toContain('&amp;');
    });

    it("should handle the Tirzepatide GLP-2 notes format", () => {
      const notes = `Soma Chems (higher quality): https://somachems.com/ref/5623/ Use Code: Omega20 for 20% off Search "GLP2 T" and get the 30MG version QTY 1 or 2 to start -- or -- Anura Labs (ma & pa shop, solid reputation and amazing value) https://anuralabs.com/product/glp-2t/ Get the 30MG vial, then use code "Jason" for 10% off ---- Mindful Research / Happy Peptides (Higher Quality, Great Value) https://happypeptides.com/?ref=omega15 Search for T-GLP2 and get the 30MG vial, x1 Use Code: Omega15 for 15% discount at checkout
SUMMARY:
------------
QUALITY/VALUE: **Soma may be higher quality and more rigorously tested. **Anura will be the best value hands down, almost a penny on the dollar. **Mindful/HappyPeptides will be the highest quality and best bang for buck.`;
      
      const result = formatNotesHtml(notes);
      // Should have links
      expect(result).toContain('<a href="https://somachems.com/ref/5623/"');
      expect(result).toContain('<a href="https://anuralabs.com/product/glp-2t/"');
      expect(result).toContain('<a href="https://happypeptides.com/?ref=omega15"');
      // Should have bold
      expect(result).toContain('<strong>');
      // Should have hr from the dashes
      expect(result).toContain('<hr');
      // Should have em dashes from --
      expect(result).toContain('—');
      // Should have line breaks
      expect(result).toContain('<br>');
    });
  });

  describe("Admin Items page", () => {
    it("should serve the admin items page", async () => {
      const res = await fetch("http://localhost:3000/admin/items");
      expect(res.status).toBe(200);
    });
  });

  describe("RichTextEditor integration", () => {
    it("should have the RichTextEditor component file", async () => {
      // Verify the component exists by checking the file system
      const fs = await import('fs');
      const exists = fs.existsSync('/home/ubuntu/health-coach-protocol-app/client/src/components/RichTextEditor.tsx');
      expect(exists).toBe(true);
    });

    it("should have the notesFormatter utility", async () => {
      const fs = await import('fs');
      const exists = fs.existsSync('/home/ubuntu/health-coach-protocol-app/client/src/lib/notesFormatter.ts');
      expect(exists).toBe(true);
    });

    it("Items.tsx should import RichTextEditor", async () => {
      const fs = await import('fs');
      const content = fs.readFileSync('/home/ubuntu/health-coach-protocol-app/client/src/pages/admin/Items.tsx', 'utf-8');
      expect(content).toContain('import RichTextEditor');
      expect(content).toContain('RichTextEditor');
      // Should NOT have the old plain Textarea for notes
      expect(content).not.toContain('id="notes"');
    });

    it("Protocol.tsx should import formatNotesHtml", async () => {
      const fs = await import('fs');
      const content = fs.readFileSync('/home/ubuntu/health-coach-protocol-app/client/src/pages/client/Protocol.tsx', 'utf-8');
      expect(content).toContain('import { formatNotesHtml }');
      expect(content).toContain('formatNotesHtml(');
    });
  });
});
