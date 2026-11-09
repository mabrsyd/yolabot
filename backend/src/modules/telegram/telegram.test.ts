import assert from 'node:assert/strict';
import test, { describe } from 'node:test';
import { TelegramService } from './telegram.service.js';

describe('TelegramService Utility Tests', () => {
  test('splitMessage: tidak memecah pesan jika panjangnya di bawah batas maksimal', () => {
    const text = 'Halo ini adalah pesan pendek dari Telegram.';
    const chunks = TelegramService.splitMessage(text, 100);

    assert.equal(chunks.length, 1);
    assert.equal(chunks[0], text);
  });

  test('splitMessage: memecah pesan panjang pada batas baris baru (newline) secara rapi', () => {
    const paragraph1 = 'Paragraf pertama yang cukup panjang untuk dites.';
    const paragraph2 = 'Paragraf kedua kelanjutan penjelasan teknis yang mendalam.';
    const fullText = `${paragraph1}\n\n${paragraph2}`;

    // Batasi panjang agar harus pecah antar paragraf
    const chunks = TelegramService.splitMessage(fullText, 60);

    assert.equal(chunks.length, 2);
    assert.equal(chunks[0], paragraph1);
    assert.equal(chunks[1], paragraph2);
  });

  test('splitMessage: memecah string tanpa spasi jika terpaksa melampaui batas', () => {
    const longString = 'A'.repeat(150);
    const chunks = TelegramService.splitMessage(longString, 50);

    assert.equal(chunks.length, 3);
    assert.equal(chunks[0]?.length, 50);
    assert.equal(chunks[1]?.length, 50);
    assert.equal(chunks[2]?.length, 50);
  });
});

