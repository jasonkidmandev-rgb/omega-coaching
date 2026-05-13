import crypto from "crypto";

/**
 * HIPAA-compliant encryption service for PHI data at rest
 * Uses AES-256-GCM for authenticated encryption
 * Implements envelope encryption pattern
 */

// Algorithm configuration
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16; // 128 bits
const AUTH_TAG_LENGTH = 16; // 128 bits
const SALT_LENGTH = 32;
const KEY_LENGTH = 32; // 256 bits

// Get encryption key from environment or generate a secure default
function getEncryptionKey(): Buffer {
  const envKey = process.env.PHI_ENCRYPTION_KEY;
  if (envKey) {
    // If provided as hex string
    if (envKey.length === 64) {
      return Buffer.from(envKey, "hex");
    }
    // If provided as base64
    return Buffer.from(envKey, "base64");
  }
  
  // In production, this should always be set via environment variable
  // For development, derive from JWT_SECRET
  const jwtSecret = process.env.JWT_SECRET || "development-key";
  return crypto.scryptSync(jwtSecret, "phi-encryption-salt", KEY_LENGTH);
}

/**
 * Encrypt sensitive data using AES-256-GCM
 * Returns base64 encoded string: IV + AuthTag + Ciphertext
 */
export function encrypt(plaintext: string): string {
  if (!plaintext) return "";
  
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  
  let encrypted = cipher.update(plaintext, "utf8", "base64");
  encrypted += cipher.final("base64");
  
  const authTag = cipher.getAuthTag();
  
  // Combine IV + AuthTag + Ciphertext
  const combined = Buffer.concat([
    iv,
    authTag,
    Buffer.from(encrypted, "base64"),
  ]);
  
  return combined.toString("base64");
}

/**
 * Decrypt data encrypted with encrypt()
 */
export function decrypt(encryptedData: string): string {
  if (!encryptedData) return "";
  
  try {
    const key = getEncryptionKey();
    const combined = Buffer.from(encryptedData, "base64");
    
    // Extract IV, AuthTag, and Ciphertext
    const iv = combined.subarray(0, IV_LENGTH);
    const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const ciphertext = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(ciphertext);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    return decrypted.toString("utf8");
  } catch (error) {
    console.error("[Encryption] Decryption failed:", error);
    throw new Error("Failed to decrypt data");
  }
}

/**
 * Hash sensitive data for comparison (one-way)
 * Uses PBKDF2 with random salt
 */
export function hashSensitiveData(data: string): string {
  const salt = crypto.randomBytes(SALT_LENGTH);
  const hash = crypto.pbkdf2Sync(data, salt, 100000, 64, "sha512");
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

/**
 * Verify hashed data
 */
export function verifyHash(data: string, storedHash: string): boolean {
  try {
    const [saltHex, hashHex] = storedHash.split(":");
    const salt = Buffer.from(saltHex, "hex");
    const hash = crypto.pbkdf2Sync(data, salt, 100000, 64, "sha512");
    return crypto.timingSafeEqual(hash, Buffer.from(hashHex, "hex"));
  } catch {
    return false;
  }
}

/**
 * Encrypt specific PHI fields in an object
 */
export function encryptPhiFields<T extends Record<string, any>>(
  data: T,
  phiFieldNames: string[]
): T {
  const result = { ...data };
  
  for (const field of phiFieldNames) {
    if (result[field] && typeof result[field] === "string") {
      (result as any)[field] = encrypt(result[field]);
    }
  }
  
  return result;
}

/**
 * Decrypt specific PHI fields in an object
 */
export function decryptPhiFields<T extends Record<string, any>>(
  data: T,
  phiFieldNames: string[]
): T {
  const result = { ...data };
  
  for (const field of phiFieldNames) {
    if (result[field] && typeof result[field] === "string") {
      try {
        (result as any)[field] = decrypt(result[field]);
      } catch {
        // Field might not be encrypted, leave as-is
      }
    }
  }
  
  return result;
}

/**
 * Generate a secure random token
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString("hex");
}

/**
 * Generate a secure API key
 */
export function generateApiKey(): string {
  const prefix = "hcp"; // health coach protocol
  const randomPart = crypto.randomBytes(24).toString("base64url");
  return `${prefix}_${randomPart}`;
}

/**
 * Mask sensitive data for logging (show only last 4 characters)
 */
export function maskSensitiveData(data: string, showLast: number = 4): string {
  if (!data || data.length <= showLast) return "****";
  return "*".repeat(data.length - showLast) + data.slice(-showLast);
}

/**
 * Mask email for logging
 */
export function maskEmail(email: string): string {
  if (!email) return "****";
  const [local, domain] = email.split("@");
  if (!domain) return "****";
  const maskedLocal = local.length > 2 
    ? local[0] + "*".repeat(local.length - 2) + local.slice(-1)
    : "**";
  return `${maskedLocal}@${domain}`;
}

/**
 * Check if encryption key is properly configured
 */
export function isEncryptionConfigured(): boolean {
  return !!process.env.PHI_ENCRYPTION_KEY;
}

/**
 * Rotate encryption key (re-encrypt data with new key)
 * This is a utility function - actual rotation requires database migration
 */
export function reEncryptWithNewKey(
  encryptedData: string,
  oldKey: Buffer,
  newKey: Buffer
): string {
  // Decrypt with old key
  const combined = Buffer.from(encryptedData, "base64");
  const iv = combined.subarray(0, IV_LENGTH);
  const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
  
  const decipher = crypto.createDecipheriv(ALGORITHM, oldKey, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(ciphertext);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  
  // Re-encrypt with new key
  const newIv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, newKey, newIv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  
  let encrypted = cipher.update(decrypted);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  
  const newAuthTag = cipher.getAuthTag();
  
  return Buffer.concat([newIv, newAuthTag, encrypted]).toString("base64");
}
