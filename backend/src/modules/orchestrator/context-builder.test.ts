import assert from 'node:assert/strict';
import test, { describe } from 'node:test';
import { MockAIProviderAdapter } from '../ai-providers/mock-adapter.js';
import { ContextBuilder, DEFAULT_SYSTEM_PROMPT } from './context-builder.js';

describe('ContextBuilder Unit Tests', () => {
  const adapter = new MockAIProviderAdapter();

  test('buildContext: system prompt selalu disertakan dan input pengguna dibungkus user_input', () => {
    const result = ContextBuilder.buildContext({
      systemPrompt: DEFAULT_SYSTEM_PROMPT,
      historyMessages: [],
      currentUserInput: 'Apa itu kecerdasan buatan?',
      adapter,
    });

    assert.equal(result.systemPrompt, DEFAULT_SYSTEM_PROMPT);
    assert.equal(result.messages.length, 1);
    assert.equal(result.messages[0]?.role, 'user');
    assert.ok(
      result.messages[0]?.content.includes('<user_input>\nApa itu kecerdasan buatan?\n</user_input>'),
      'Input pengguna harus diisolasi dengan tag <user_input>',
    );
    assert.ok(result.estimatedTokens > 0, 'Estimasi token harus dihitung');
  });

  test('buildContext: menyertakan riwayat percakapan dalam urutan kronologis yang benar', () => {
    const history = [
      { role: 'user', content: 'Halo siapa kamu?' },
      { role: 'assistant', content: 'Halo! Saya YolaBot, asisten AI Anda.' },
      { role: 'user', content: 'Bisa bantu koding?' },
      { role: 'assistant', content: 'Tentu, saya bisa bantu berbagai bahasa pemrograman.' },
    ];

    const result = ContextBuilder.buildContext({
      systemPrompt: DEFAULT_SYSTEM_PROMPT,
      historyMessages: history,
      currentUserInput: 'Buatkan fungsi Fibonacci di TypeScript',
      adapter,
      modelContextLimit: 8192,
    });

    // 4 riwayat + 1 input pengguna baru = 5 messages
    assert.equal(result.messages.length, 5);
    assert.equal(result.messages[0]?.role, 'user');
    assert.equal(result.messages[0]?.content, 'Halo siapa kamu?');
    assert.equal(result.messages[1]?.role, 'assistant');
    assert.equal(result.messages[4]?.role, 'user');
    assert.ok(result.messages[4]?.content.includes('Fibonacci'));
  });

  test('buildContext: memotong riwayat terlama ketika melampaui batas anggaran token (sliding window)', () => {
    // Buat pesan riwayat yang panjang
    const history = [
      { role: 'user', content: 'Pesan kuno satu: ' + 'A'.repeat(500) },
      { role: 'assistant', content: 'Pesan kuno dua: ' + 'B'.repeat(500) },
      { role: 'user', content: 'Pesan baru tiga: ' + 'C'.repeat(50) },
      { role: 'assistant', content: 'Pesan baru empat: ' + 'D'.repeat(50) },
    ];

    // Batasi modelContextLimit agar anggaran sangat ketat (misal 400 token)
    const result = ContextBuilder.buildContext({
      systemPrompt: 'System',
      historyMessages: history,
      currentUserInput: 'Pesan input terkini',
      adapter,
      modelContextLimit: 300,
      maxOutputTokens: 100,
    });

    // Pesan kuno yang panjang harus terpotong, hanya pesan terbaru yang masuk
    assert.ok(result.messages.length < 5, 'Riwayat lama harus terpotong');
    assert.ok(
      result.messages[result.messages.length - 1]?.content.includes('Pesan input terkini'),
      'Pesan pengguna terkini harus selalu ada',
    );
  });
});

