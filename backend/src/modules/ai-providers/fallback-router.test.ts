import assert from 'node:assert/strict';
import test, { describe } from 'node:test';
import {
  AIProviderAdapter,
  GenerationParams,
  GenerationResult,
  StreamChunk,
} from './adapter.interface.js';
import { FallbackRouter } from './fallback-router.js';
import { MockAIProviderAdapter } from './mock-adapter.js';

class FailingAdapter implements AIProviderAdapter {
  public readonly providerId = 'failing-mock';
  public readonly modelName = 'failing-v1';

  async generate(_params: GenerationParams): Promise<GenerationResult> {
    await Promise.resolve();
    throw new Error('Simulasi Provider Error HTTP 503 Service Unavailable');
  }

  // eslint-disable-next-line require-yield
  async *stream(_params: GenerationParams): AsyncIterable<StreamChunk> {
    await Promise.resolve();
    throw new Error('Simulasi Streaming Error');
  }

  countTokens(text: string): number {
    return text.length;
  }

  async healthCheck(): Promise<boolean> {
    await Promise.resolve();
    return false;
  }
}

describe('FallbackRouter & Circuit Breaker Unit Tests', () => {
  test('generate: otomatis fallback ke secondary adapter jika primary gagal', async () => {
    const failingPrimary = new FailingAdapter();
    const healthySecondary = new MockAIProviderAdapter();

    const router = new FallbackRouter(failingPrimary, healthySecondary, {
      failureThreshold: 2,
    });

    const result = await router.generate({
      systemPrompt: 'System',
      messages: [{ role: 'user', content: 'Tes Fallback' }],
    });

    // Harus berhasil menanggapi melalui secondary tanpa error ke caller
    assert.ok(result.text.includes('Tes Fallback'));
    assert.equal(result.model, healthySecondary.modelName);
  });

  test('circuit breaker: beralih ke status OPEN setelah melampaui failure threshold', async () => {
    const failingPrimary = new FailingAdapter();
    const healthySecondary = new MockAIProviderAdapter();

    const router = new FallbackRouter(failingPrimary, healthySecondary, {
      failureThreshold: 2,
      cooldownPeriodMs: 1000,
    });

    assert.equal(router.getCircuitState(), 'CLOSED');

    // Kegagalan ke-1
    await router.generate({ systemPrompt: 'Sys', messages: [] });
    assert.equal(router.getCircuitState(), 'CLOSED');

    // Kegagalan ke-2 -> Membuka sirkuit (OPEN)
    await router.generate({ systemPrompt: 'Sys', messages: [] });
    assert.equal(router.getCircuitState(), 'OPEN');
  });

  test('stream: otomatis mengalirkan chunk dari secondary adapter jika primary stream gagal', async () => {
    const failingPrimary = new FailingAdapter();
    const healthySecondary = new MockAIProviderAdapter();

    const router = new FallbackRouter(failingPrimary, healthySecondary);

    const stream = router.stream({
      systemPrompt: 'System',
      messages: [{ role: 'user', content: 'Tes Stream Fallback' }],
    });

    let collected = '';
    for await (const chunk of stream) {
      collected += chunk.delta;
    }

    assert.ok(collected.includes('Tes Stream Fallback'));
  });
});

