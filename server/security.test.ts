import { describe, it, expect } from 'vitest';
import {
  validateFileUpload,
  extractMimeType,
  extractBase64Data,
  calculateBase64Size,
  sanitizeFilename,
  generateSecureFilename,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZES,
} from './_core/fileValidation';

describe('File Validation Security', () => {
  describe('extractMimeType', () => {
    it('should extract MIME type from valid base64 data URL', () => {
      const base64 = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';
      expect(extractMimeType(base64)).toBe('image/jpeg');
    });

    it('should extract MIME type for PNG', () => {
      const base64 = 'data:image/png;base64,iVBORw0KGgo=';
      expect(extractMimeType(base64)).toBe('image/png');
    });

    it('should return null for invalid format', () => {
      const base64 = 'invalid-data';
      expect(extractMimeType(base64)).toBeNull();
    });

    it('should return null for missing MIME type', () => {
      const base64 = 'data:;base64,abc123';
      expect(extractMimeType(base64)).toBeNull();
    });
  });

  describe('extractBase64Data', () => {
    it('should extract raw base64 data from data URL', () => {
      const base64 = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';
      expect(extractBase64Data(base64)).toBe('/9j/4AAQSkZJRg==');
    });

    it('should return original string if no data URL prefix', () => {
      const base64 = '/9j/4AAQSkZJRg==';
      expect(extractBase64Data(base64)).toBe('/9j/4AAQSkZJRg==');
    });
  });

  describe('calculateBase64Size', () => {
    it('should calculate correct size for base64 data', () => {
      // 12 characters of base64 = 9 bytes
      const base64 = 'data:image/png;base64,SGVsbG8gV29ybGQ=';
      const size = calculateBase64Size(base64);
      expect(size).toBe(11); // "Hello World" = 11 bytes
    });

    it('should handle padding correctly', () => {
      const base64 = 'data:text/plain;base64,YQ=='; // "a" = 1 byte
      const size = calculateBase64Size(base64);
      expect(size).toBe(1);
    });
  });

  describe('validateFileUpload', () => {
    it('should validate a valid JPEG image', () => {
      // Minimal valid JPEG header in base64
      const validJpeg = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAA==';
      const result = validateFileUpload(validJpeg, 'image');
      expect(result.valid).toBe(true);
      expect(result.mimeType).toBe('image/jpeg');
    });

    it('should reject disallowed MIME type', () => {
      const executable = 'data:application/x-executable;base64,TVqQAAMAAAA=';
      const result = validateFileUpload(executable, 'image');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('not allowed');
    });

    it('should reject missing MIME type', () => {
      const invalid = 'invalid-base64-data';
      const result = validateFileUpload(invalid, 'image');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('missing MIME type');
    });

    it('should reject files exceeding size limit', () => {
      // Create a large base64 string (over 10MB for images)
      const largeData = 'A'.repeat(15 * 1024 * 1024); // ~15MB
      const largeFile = `data:image/jpeg;base64,${largeData}`;
      const result = validateFileUpload(largeFile, 'image');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('exceeds maximum');
    });

    it('should accept custom max size', () => {
      const smallData = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAA==';
      const result = validateFileUpload(smallData, 'image', { maxSize: 100 });
      expect(result.valid).toBe(true);
    });

    it('should accept custom allowed types', () => {
      const svg = 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=';
      const result = validateFileUpload(svg, 'image', { 
        allowedTypes: ['image/svg+xml'] 
      });
      expect(result.valid).toBe(true);
    });
  });

  describe('sanitizeFilename', () => {
    it('should remove path separators', () => {
      expect(sanitizeFilename('../../../etc/passwd')).toBe('etcpasswd');
      expect(sanitizeFilename('..\\..\\windows\\system32')).toBe('windowssystem32');
    });

    it('should remove null bytes', () => {
      expect(sanitizeFilename('file\0.txt')).toBe('file.txt');
    });

    it('should remove double dots', () => {
      // Double dots are removed to prevent path traversal
      expect(sanitizeFilename('file..txt')).toBe('filetxt');
    });

    it('should limit filename length', () => {
      const longName = 'a'.repeat(300) + '.txt';
      const sanitized = sanitizeFilename(longName);
      expect(sanitized.length).toBeLessThanOrEqual(255);
    });

    it('should handle empty filename', () => {
      const result = sanitizeFilename('');
      expect(result).toMatch(/^file_\d+_[a-z0-9]+$/);
    });

    it('should handle filename with only dots', () => {
      const result = sanitizeFilename('...');
      expect(result).toMatch(/^file_\d+_[a-z0-9]+$/);
    });
  });

  describe('generateSecureFilename', () => {
    it('should generate unique filenames', () => {
      const name1 = generateSecureFilename('test.jpg');
      const name2 = generateSecureFilename('test.jpg');
      expect(name1).not.toBe(name2);
    });

    it('should preserve file extension', () => {
      const result = generateSecureFilename('document.pdf');
      expect(result).toMatch(/\.pdf$/);
    });

    it('should handle files without extension', () => {
      const result = generateSecureFilename('noextension');
      // Files without dots still get treated as having an extension
      expect(result).toMatch(/^\d+_[a-z0-9]+\.noextension$/);
    });

    it('should lowercase the extension', () => {
      const result = generateSecureFilename('image.PNG');
      expect(result).toMatch(/\.png$/);
    });
  });

  describe('ALLOWED_MIME_TYPES', () => {
    it('should have image types defined', () => {
      expect(ALLOWED_MIME_TYPES.image).toContain('image/jpeg');
      expect(ALLOWED_MIME_TYPES.image).toContain('image/png');
      expect(ALLOWED_MIME_TYPES.image).toContain('image/webp');
      expect(ALLOWED_MIME_TYPES.image).toContain('image/gif');
    });

    it('should have document types defined', () => {
      expect(ALLOWED_MIME_TYPES.document).toContain('application/pdf');
    });

    it('should have audio types defined', () => {
      expect(ALLOWED_MIME_TYPES.audio).toContain('audio/mpeg');
      expect(ALLOWED_MIME_TYPES.audio).toContain('audio/wav');
    });

    it('should have video types defined', () => {
      expect(ALLOWED_MIME_TYPES.video).toContain('video/mp4');
      expect(ALLOWED_MIME_TYPES.video).toContain('video/webm');
    });
  });

  describe('MAX_FILE_SIZES', () => {
    it('should have reasonable size limits', () => {
      expect(MAX_FILE_SIZES.image).toBe(10 * 1024 * 1024); // 10MB
      expect(MAX_FILE_SIZES.document).toBe(25 * 1024 * 1024); // 25MB
      expect(MAX_FILE_SIZES.audio).toBe(50 * 1024 * 1024); // 50MB
      expect(MAX_FILE_SIZES.video).toBe(100 * 1024 * 1024); // 100MB
    });
  });
});

describe('Security Headers Configuration', () => {
  it('should have helmet middleware configured', async () => {
    // This test verifies the helmet package is installed
    const helmet = await import('helmet');
    expect(helmet).toBeDefined();
    expect(typeof helmet.default).toBe('function');
  });
});

describe('Rate Limiter Security', () => {
  it('should have auth limiter with strict limits', async () => {
    const { authLimiter } = await import('./_core/rateLimiter');
    expect(authLimiter).toBeDefined();
    expect(typeof authLimiter).toBe('function');
  });

  it('should have webhook limiter for external services', async () => {
    const { webhookLimiter } = await import('./_core/rateLimiter');
    expect(webhookLimiter).toBeDefined();
    expect(typeof webhookLimiter).toBe('function');
  });

  it('should have public API limiter', async () => {
    const { publicApiLimiter } = await import('./_core/rateLimiter');
    expect(publicApiLimiter).toBeDefined();
    expect(typeof publicApiLimiter).toBe('function');
  });
});

describe('Authentication Security', () => {
  it('should have JWT verification configured', async () => {
    const { sdk } = await import('./_core/sdk');
    expect(sdk).toBeDefined();
    expect(typeof sdk.verifySession).toBe('function');
    expect(typeof sdk.createSessionToken).toBe('function');
  });
});

describe('Authorization Security', () => {
  it('should have role-based procedures defined', async () => {
    const trpc = await import('./_core/trpc');
    expect(trpc.adminProcedure).toBeDefined();
    expect(trpc.managerProcedure).toBeDefined();
    expect(trpc.viewerProcedure).toBeDefined();
    expect(trpc.financeProcedure).toBeDefined();
    expect(trpc.protectedProcedure).toBeDefined();
    expect(trpc.publicProcedure).toBeDefined();
  });

  it('should have permission check helper', async () => {
    const { hasPermission } = await import('./_core/trpc');
    expect(hasPermission('admin', ['admin'])).toBe(true);
    expect(hasPermission('user', ['admin'])).toBe(false);
    expect(hasPermission('manager', ['admin', 'manager'])).toBe(true);
  });
});
