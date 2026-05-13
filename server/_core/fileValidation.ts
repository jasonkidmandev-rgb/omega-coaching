/**
 * File Upload Validation Utilities
 * Security measures for validating uploaded files
 */

// Allowed MIME types by category
export const ALLOWED_MIME_TYPES = {
  image: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  document: ['application/pdf'],
  audio: ['audio/mpeg', 'audio/wav', 'audio/webm', 'audio/mp4'],
  video: ['video/mp4', 'video/webm'],
} as const;

// Maximum file sizes by category (in bytes)
export const MAX_FILE_SIZES = {
  image: 10 * 1024 * 1024, // 10MB
  document: 25 * 1024 * 1024, // 25MB
  audio: 50 * 1024 * 1024, // 50MB
  video: 100 * 1024 * 1024, // 100MB
} as const;

// Magic bytes for file type verification
const MAGIC_BYTES: Record<string, number[][]> = {
  'image/jpeg': [[0xFF, 0xD8, 0xFF]],
  'image/png': [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]],
  'image/gif': [[0x47, 0x49, 0x46, 0x38, 0x37, 0x61], [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]],
  'image/webp': [[0x52, 0x49, 0x46, 0x46]], // RIFF header, WebP follows
  'application/pdf': [[0x25, 0x50, 0x44, 0x46]], // %PDF
  'audio/mpeg': [[0xFF, 0xFB], [0xFF, 0xFA], [0x49, 0x44, 0x33]], // MP3 or ID3
};

export type FileCategory = keyof typeof ALLOWED_MIME_TYPES;

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  mimeType?: string;
  size?: number;
}

/**
 * Extract MIME type from base64 data URL
 */
export function extractMimeType(base64Data: string): string | null {
  const match = base64Data.match(/^data:([^;]+);base64,/);
  return match ? match[1] : null;
}

/**
 * Extract raw base64 data without the data URL prefix
 */
export function extractBase64Data(base64Data: string): string {
  const match = base64Data.match(/^data:[^;]+;base64,(.+)$/);
  return match ? match[1] : base64Data;
}

/**
 * Calculate file size from base64 string
 */
export function calculateBase64Size(base64Data: string): number {
  const rawData = extractBase64Data(base64Data);
  // Base64 encodes 3 bytes as 4 characters
  const padding = (rawData.match(/=/g) || []).length;
  return Math.floor((rawData.length * 3) / 4) - padding;
}

/**
 * Verify file magic bytes match the claimed MIME type
 */
export function verifyMagicBytes(base64Data: string, claimedMimeType: string): boolean {
  const rawData = extractBase64Data(base64Data);
  const bytes = Buffer.from(rawData, 'base64');
  
  const expectedMagicBytes = MAGIC_BYTES[claimedMimeType];
  if (!expectedMagicBytes) {
    // No magic bytes defined for this type, skip verification
    return true;
  }
  
  return expectedMagicBytes.some(pattern => {
    return pattern.every((byte, index) => bytes[index] === byte);
  });
}

/**
 * Validate a file upload
 */
export function validateFileUpload(
  base64Data: string,
  category: FileCategory,
  options?: {
    maxSize?: number;
    allowedTypes?: string[];
  }
): FileValidationResult {
  // Extract MIME type
  const mimeType = extractMimeType(base64Data);
  if (!mimeType) {
    return { valid: false, error: 'Invalid file format: missing MIME type' };
  }
  
  // Check if MIME type is allowed for this category
  const allowedTypes = options?.allowedTypes || (ALLOWED_MIME_TYPES[category] as readonly string[]);
  if (!allowedTypes.includes(mimeType)) {
    return { 
      valid: false, 
      error: `File type '${mimeType}' is not allowed. Allowed types: ${allowedTypes.join(', ')}`,
      mimeType,
    };
  }
  
  // Calculate file size
  const size = calculateBase64Size(base64Data);
  const maxSize = options?.maxSize || MAX_FILE_SIZES[category];
  if (size > maxSize) {
    return { 
      valid: false, 
      error: `File size (${(size / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed size (${(maxSize / 1024 / 1024).toFixed(2)}MB)`,
      mimeType,
      size,
    };
  }
  
  // Verify magic bytes
  if (!verifyMagicBytes(base64Data, mimeType)) {
    return { 
      valid: false, 
      error: 'File content does not match the declared file type',
      mimeType,
      size,
    };
  }
  
  return { valid: true, mimeType, size };
}

/**
 * Sanitize filename to prevent path traversal attacks
 */
export function sanitizeFilename(filename: string): string {
  // Remove path separators and null bytes
  let sanitized = filename
    .replace(/[/\\]/g, '')
    .replace(/\0/g, '')
    .replace(/\.\./g, '');
  
  // Limit length
  if (sanitized.length > 255) {
    const ext = sanitized.split('.').pop() || '';
    const name = sanitized.slice(0, 255 - ext.length - 1);
    sanitized = `${name}.${ext}`;
  }
  
  // If empty after sanitization, generate a random name
  if (!sanitized || sanitized === '.') {
    sanitized = `file_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }
  
  return sanitized;
}

/**
 * Generate a secure random filename
 */
export function generateSecureFilename(originalFilename: string): string {
  const ext = originalFilename.split('.').pop()?.toLowerCase() || '';
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 10);
  return ext ? `${timestamp}_${random}.${ext}` : `${timestamp}_${random}`;
}
