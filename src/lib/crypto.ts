// src/lib/crypto.ts
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12; // 96-bit IV — NIST recommendation for GCM
const IV_HEX_LENGTH = IV_BYTES * 2; // 24 hex chars
const AUTH_TAG_BYTES = 16;
const AUTH_TAG_HEX_LENGTH = AUTH_TAG_BYTES * 2; // 32 hex chars

function getKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY?.trim();
  if (!hex || hex.length !== 64) {
    throw new Error(
      "ENCRYPTION_KEY must be a 64-character hex string. " +
        "Generate with: openssl rand -hex 32"
    );
  }
  return Buffer.from(hex, "hex");
}

/**
 * Encrypts a plaintext string using AES-256-GCM.
 * Returns a colon-delimited string: `iv:authTag:ciphertext` (all hex-encoded).
 * Each call produces a different output due to the random IV.
 */
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return [
    iv.toString("hex"),
    authTag.toString("hex"),
    encrypted.toString("hex"),
  ].join(":");
}

/**
 * Decrypts a value previously produced by `encrypt()`.
 * Throws if the format is invalid or the auth tag doesn't match (tampered value).
 */
export function decrypt(ciphertext: string): string {
  const parts = ciphertext.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted value: expected iv:authTag:ciphertext");
  }
  const [ivHex, authTagHex, encryptedHex] = parts;
  const key = getKey();
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const encrypted = Buffer.from(encryptedHex, "hex");
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString(
    "utf8"
  );
}

/**
 * Returns true if `value` matches the `iv:authTag:ciphertext` format
 * produced by `encrypt()`. Use this to guard against decrypting plaintext
 * values stored before encryption was introduced.
 */
export function isEncrypted(value: string): boolean {
  const parts = value.split(":");
  return (
    parts.length === 3 &&
    parts[0].length === IV_HEX_LENGTH &&
    parts[1].length === AUTH_TAG_HEX_LENGTH
  );
}
