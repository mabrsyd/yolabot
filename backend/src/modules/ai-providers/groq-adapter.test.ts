import assert from 'node:assert/strict';
import test, { describe } from 'node:test';
import { createAdapter } from './adapter-factory.js';
import { GroqAdapter } from './groq-adapter.js';

describe('GroqAdapter & Factory Unit Tests', () => {
  test('GroqAdapter memiliki providerId groq dan baseUrl default yang tepat', () => {
    const adapter = new GroqAdapter('dummy_key');
    assert.equal(adapter.providerId, 'groq');
    assert.equal(adapter.modelName, 'openai/gpt-oss-120b');
  });

  test('countTokens: mengembalikan estimasi token berdasarkan rasio panjang string', () => {
    const adapter = new GroqAdapter('dummy_key');
    const tokens = adapter.countTokens('Halo dunia apa kabar');
    assert.ok(tokens > 0);
    assert.equal(tokens, Math.ceil('Halo dunia apa kabar'.length / 4));
  });

  test('createAdapter: mengembalikan MockAIProviderAdapter jika provider mock dipilih', () => {
    const adapter = createAdapter('mock');
    assert.equal(adapter.providerId, 'mock');
  });
});
