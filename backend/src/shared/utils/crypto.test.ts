import assert from 'node:assert/strict';
import test, { describe } from 'node:test';
import {
  generateRandomToken,
  generateTelegramLinkCode,
  hashPassword,
  hashToken,
  verifyPassword,
} from './crypto.js';

describe('Crypto Utility Tests', () => {
  test('hashPassword & verifyPassword: hash valid password and verify correctly', async () => {
    const password = 'SecretPassword123!';
    const hashed = await hashPassword(password);

    assert.ok(hashed.startsWith('$argon2id$'), 'Hash harus berformat Argon2id');

    const isValid = await verifyPassword(password, hashed);
    assert.equal(isValid, true, 'Kata sandi benar harus lolos verifikasi');

    const isWrong = await verifyPassword('WrongPassword456!', hashed);
    assert.equal(isWrong, false, 'Kata sandi salah harus ditolak');
  });

  test('generateRandomToken: menghasilkan token heksadesimal dengan panjang yang sesuai', () => {
    const token = generateRandomToken(32);
    assert.equal(typeof token, 'string');
    assert.equal(token.length, 64, '32 byte hex harus memiliki 64 karakter');
  });

  test('hashToken: menghasilkan SHA-256 hash konsisten', () => {
    const rawToken = 'test-token-123';
    const hash1 = hashToken(rawToken);
    const hash2 = hashToken(rawToken);

    assert.equal(hash1, hash2, 'Hash token harus deterministik');
    assert.equal(hash1.length, 64, 'SHA-256 hex harus memiliki 64 karakter');
  });

  test('generateTelegramLinkCode: menghasilkan 6 karakter alfanumerik yang mudah dibaca', () => {
    const code = generateTelegramLinkCode();
    assert.equal(code.length, 6, 'Kode harus 6 karakter');
    // Memastikan tidak mengandung karakter ambigu (O, 0, I, 1)
    assert.match(code, /^[2-9A-HJ-NP-Z]{6}$/, 'Kode tidak boleh memuat karakter membingungkan');
  });
});
