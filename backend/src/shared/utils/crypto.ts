import crypto from 'node:crypto';
import { hash, verify } from '@node-rs/argon2';

/**
 * Parameter keamanan Argon2id sesuai spesifikasi SECURITY.md
 * Memory Cost: 65536 KiB (64 MiB), Time Cost: 3 iterasi, Parallelism: 4 threads
 */
const ARGON2_OPTIONS = {
  memoryCost: 65536,
  timeCost: 3,
  outputLen: 32,
  parallelism: 4,
};

/**
 * Menghasilkan hash kata sandi yang aman menggunakan Argon2id
 */
export async function hashPassword(plainText: string): Promise<string> {
  return hash(plainText, ARGON2_OPTIONS);
}

/**
 * Memverifikasi kata sandi plaintext terhadap hash tersimpan
 */
export async function verifyPassword(plainText: string, storedHash: string): Promise<boolean> {
  try {
    return await verify(storedHash, plainText);
  } catch {
    return false;
  }
}

/**
 * Menghasilkan token acak berbatas waktu (misal: verifikasi email atau OTP)
 */
export function generateRandomToken(byteLength = 32): string {
  return crypto.randomBytes(byteLength).toString('hex');
}

/**
 * Melakukan hash satu arah (SHA-256) untuk token verifikasi sebelum disimpan di database
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Menghasilkan kode alfanumerik 6-karakter untuk penautan akun Telegram (/link)
 */
export function generateTelegramLinkCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Menghindari karakter ambigu O/0, I/1
  let code = '';
  const bytes = crypto.randomBytes(6);
  for (let i = 0; i < 6; i++) {
    const byte = bytes[i] ?? 0;
    const char = chars[byte % chars.length];
    code += char ?? 'X';
  }
  return code;
}

