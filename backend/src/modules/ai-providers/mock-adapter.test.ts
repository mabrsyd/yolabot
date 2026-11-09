import assert from 'node:assert/strict';
import test, { describe } from 'node:test';
import { MockAIProviderAdapter } from './mock-adapter.js';

describe('MockAIProviderAdapter Tests', () => {
  const adapter = new MockAIProviderAdapter();

  test('healthCheck mengembalikan true', async () => {
    const isHealthy = await adapter.healthCheck();
    assert.equal(isHealthy, true);
  });

  test('countTokens menghitung estimasi token berdasarkan rasio karakter', () => {
    const text = 'Halo dunia, ini adalah pengujian token sederhana.';
    const count = adapter.countTokens(text);
    assert.ok(count > 0);
    assert.equal(count, Math.ceil(text.length / 4));
  });

  test('generate menghasilkan teks dan metadata penggunaan token', async () => {
    const result = await adapter.generate({
      systemPrompt: 'System prompt',
      messages: [{ role: 'user', content: 'Siapakah kamu?' }],
    });

    assert.ok(result.text.includes('Siapakah kamu?'));
    assert.ok(result.tokenIn > 0);
    assert.ok(result.tokenOut > 0);
    assert.equal(result.model, adapter.modelName);
  });

  test('stream mengalirkan chunk secara asinkron dengan event stop pada token akhir', async () => {
    const stream = adapter.stream({
      systemPrompt: 'System prompt',
      messages: [{ role: 'user', content: 'Tes stream' }],
    });

    let accumulatedText = '';
    let reachedFinish = false;

    for await (const chunk of stream) {
      if (chunk.delta) {
        accumulatedText += chunk.delta;
      }
      if (chunk.finishReason === 'stop') {
        reachedFinish = true;
        assert.ok(chunk.tokenUsage, 'Chunk terakhir harus memuat tokenUsage');
      }
    }

    assert.ok(accumulatedText.length > 0);
    assert.equal(reachedFinish, true);
  });

  test('stream merespons sinyal abort dengan benar', async () => {
    const abortController = new AbortController();
    abortController.abort(); // Langsung batalkan

    const stream = adapter.stream({
      systemPrompt: 'System prompt',
      messages: [{ role: 'user', content: 'Tes abort' }],
      abortSignal: abortController.signal,
    });

    for await (const chunk of stream) {
      assert.equal(chunk.finishReason, 'error');
      break;
    }
  });
});

