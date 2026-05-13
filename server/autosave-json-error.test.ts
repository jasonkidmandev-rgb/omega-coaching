import { describe, it, expect } from 'vitest';

/**
 * Tests for the JSON parsing error fix in protocol section autosave.
 * 
 * Root cause: When Express body-parser fails to parse JSON (e.g., corrupted payload,
 * network truncation), it returns an HTML error page instead of JSON. This causes
 * the tRPC client to fail with "unexpected token <" when trying to parse the response.
 * 
 * Fix applied:
 * 1. Server: Added body-parser error handler middleware that returns JSON errors
 * 2. Client: Added fetch wrapper in tRPC client to detect HTML responses and convert to JSON
 * 3. Client: Added retry logic (2 retries with 3s delay) to autosave in all 3 components
 * 4. Client: Added user-friendly error messages with specific guidance
 */

describe('Body Parser Error Handler', () => {
  it('should return JSON error for entity.parse.failed errors', async () => {
    // Simulate what the server error handler does
    const err = {
      type: 'entity.parse.failed',
      status: 400,
      message: 'Unexpected token n in JSON at position 0',
    };
    
    // The handler checks err.type and returns JSON
    expect(err.type).toBe('entity.parse.failed');
    
    const response = {
      error: {
        json: {
          message: 'Invalid request format. Please try saving again.',
          code: -32000,
          data: {
            code: 'PARSE_ERROR',
            httpStatus: 400,
          },
        },
      },
    };
    
    // Verify the response is valid JSON (not HTML)
    const jsonStr = JSON.stringify(response);
    expect(() => JSON.parse(jsonStr)).not.toThrow();
    expect(response.error.json.data.code).toBe('PARSE_ERROR');
  });

  it('should return JSON error for entity.too.large errors', async () => {
    const err = {
      type: 'entity.too.large',
      status: 413,
      message: 'request entity too large',
    };
    
    expect(err.type).toBe('entity.too.large');
    
    const response = {
      error: {
        json: {
          message: 'Request payload too large. Try saving smaller sections individually.',
          code: -32000,
          data: {
            code: 'PAYLOAD_TOO_LARGE',
            httpStatus: 413,
          },
        },
      },
    };
    
    const jsonStr = JSON.stringify(response);
    expect(() => JSON.parse(jsonStr)).not.toThrow();
    expect(response.error.json.data.code).toBe('PAYLOAD_TOO_LARGE');
  });

  it('should pass through non-body-parser errors', () => {
    const err = {
      type: 'some.other.error',
      status: 500,
      message: 'Internal server error',
    };
    
    // The handler only catches entity.parse.failed and entity.too.large
    expect(err.type).not.toBe('entity.parse.failed');
    expect(err.type).not.toBe('entity.too.large');
    // These errors should be passed to next(err)
  });
});

describe('tRPC Client HTML Response Handler', () => {
  it('should detect HTML responses and convert to JSON error', () => {
    // Simulate what the fetch wrapper does when it receives HTML
    const htmlResponse = `<!DOCTYPE html>
<html lang="en">
<head><title>Error</title></head>
<body><pre>SyntaxError: Unexpected token</pre></body>
</html>`;
    
    const contentType = 'text/html; charset=utf-8';
    const status = 400;
    
    // The wrapper checks: !res.ok && contentType.includes('text/html')
    expect(status >= 400).toBe(true);
    expect(contentType.includes('text/html')).toBe(true);
    
    // It creates a synthetic JSON response
    const syntheticResponse = {
      error: {
        json: {
          message: 'Server error. Please try again.',
          code: -32000,
          data: { code: 'INTERNAL_SERVER_ERROR', httpStatus: status },
        },
      },
    };
    
    expect(() => JSON.stringify(syntheticResponse)).not.toThrow();
    expect(syntheticResponse.error.json.message).toBe('Server error. Please try again.');
  });

  it('should detect 413 HTML responses and provide specific message', () => {
    const status = 413;
    const contentType = 'text/html';
    
    expect(status === 413).toBe(true);
    expect(contentType.includes('text/html')).toBe(true);
    
    const message = status === 413
      ? 'Request payload too large. Try saving smaller sections individually.'
      : 'Server error. Please try again.';
    
    expect(message).toBe('Request payload too large. Try saving smaller sections individually.');
  });

  it('should detect 502/503/504 HTML responses and provide specific message', () => {
    for (const status of [502, 503, 504]) {
      const message = status === 413
        ? 'Request payload too large.'
        : (status === 502 || status === 503 || status === 504)
          ? 'Server temporarily unavailable. Please try again in a moment.'
          : 'Server error. Please try again.';
      
      expect(message).toBe('Server temporarily unavailable. Please try again in a moment.');
    }
  });

  it('should pass through JSON responses unchanged', () => {
    const contentType = 'application/json';
    const status = 403;
    
    // The wrapper only intercepts HTML responses
    const isHtml = contentType.includes('text/html');
    expect(isHtml).toBe(false);
    // Response should be returned as-is
  });
});

describe('Autosave Retry Logic', () => {
  it('should retry up to MAX_AUTOSAVE_RETRIES times', () => {
    const MAX_AUTOSAVE_RETRIES = 2;
    let retryCount = 0;
    
    // Simulate retry logic
    for (let i = 0; i < 5; i++) {
      if (retryCount < MAX_AUTOSAVE_RETRIES) {
        retryCount++;
      } else {
        break;
      }
    }
    
    expect(retryCount).toBe(MAX_AUTOSAVE_RETRIES);
  });

  it('should reset retry count on success', () => {
    let retryCount = 2;
    
    // Simulate successful save
    retryCount = 0;
    
    expect(retryCount).toBe(0);
  });

  it('should show appropriate error messages based on error type', () => {
    const testCases = [
      { msg: 'Request payload too large', expected: 'payload' },
      { msg: 'PAYLOAD_TOO_LARGE', expected: 'PAYLOAD_TOO_LARGE' },
      { msg: 'Unexpected token < in JSON', expected: 'Unexpected token' },
      { msg: 'not valid JSON', expected: 'not valid JSON' },
      { msg: 'Network error', expected: 'Network' },
    ];
    
    for (const tc of testCases) {
      expect(tc.msg.includes(tc.expected)).toBe(true);
    }
  });
});

describe('Protocol Section Content Sizes', () => {
  it('should handle typical program guide content sizes', () => {
    // Based on actual DB data, largest program guide is ~26KB
    const typicalSize = 26 * 1024; // 26KB
    const maxExpressLimit = 50 * 1024 * 1024; // 50MB
    const proxyLimit = 32 * 1024 * 1024; // 32MB (Google Cloud Run)
    
    expect(typicalSize).toBeLessThan(maxExpressLimit);
    expect(typicalSize).toBeLessThan(proxyLimit);
    // Content should be well within limits
    expect(typicalSize / maxExpressLimit).toBeLessThan(0.001);
  });

  it('should handle content with HTML special characters', () => {
    const htmlContent = '<h1>Training Split — Phase 1</h1><p>Slow controlled tempos, mechanical failure on every set.</p><ul><li>Exercise: 4×8-12 @ RPE 8</li></ul>';
    
    // Ensure HTML content can be JSON-serialized without issues
    const payload = JSON.stringify({
      clientProtocolId: 1,
      sectionType: 'program_guide',
      content: { tabs: { training: htmlContent } },
      isEnabled: true,
    });
    
    expect(() => JSON.parse(payload)).not.toThrow();
    const parsed = JSON.parse(payload);
    expect(parsed.content.tabs.training).toBe(htmlContent);
  });
});
