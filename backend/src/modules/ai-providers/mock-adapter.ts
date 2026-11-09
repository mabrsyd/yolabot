import {
  AIProviderAdapter,
  GenerationParams,
  GenerationResult,
  StreamChunk,
} from './adapter.interface.js';

export class MockAIProviderAdapter implements AIProviderAdapter {
  public readonly providerId = 'mock';
  public readonly modelName = 'mock-general-v1';

  async generate(params: GenerationParams): Promise<GenerationResult> {
    await Promise.resolve();
    const lastUserMessage =
      params.messages.filter((m) => m.role === 'user').pop()?.content ?? 'Halo';

    const text = `[Mock AI Response] Menanggapi: "${lastUserMessage}". Sistem beroperasi normal.`;
    const tokenIn = this.countTokens(lastUserMessage + params.systemPrompt);
    const tokenOut = this.countTokens(text);

    return {
      text,
      tokenIn,
      tokenOut,
      model: this.modelName,
    };
  }

  async *stream(params: GenerationParams): AsyncIterable<StreamChunk> {
    await Promise.resolve();
    const lastUserMessage =
      params.messages.filter((m) => m.role === 'user').pop()?.content ?? 'Halo';

    const responseText = `[Mock Stream] Menanggapi pertanyaan Anda: "${lastUserMessage}". Ini adalah simulasi respons streaming token per kata.`;
    const words = responseText.split(' ');

    for (let i = 0; i < words.length; i++) {
      if (params.abortSignal?.aborted) {
        yield { delta: '', finishReason: 'error' };
        return;
      }

      const word = words[i] ?? '';
      const isLast = i === words.length - 1;

      yield {
        delta: word + (isLast ? '' : ' '),
        finishReason: isLast ? 'stop' : null,
        tokenUsage: isLast
          ? {
              promptTokens: this.countTokens(lastUserMessage),
              completionTokens: this.countTokens(responseText),
            }
          : undefined,
      };
    }
  }

  countTokens(text: string): number {
    // Estimasi konservatif rata-rata ~4 karakter per token
    return Math.max(1, Math.ceil(text.length / 4));
  }

  async healthCheck(): Promise<boolean> {
    await Promise.resolve();
    return true;
  }
}

