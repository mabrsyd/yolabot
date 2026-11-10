import { AppError } from '../../shared/errors/app-error.js';
import {
  AIProviderAdapter,
  GenerationParams,
  GenerationResult,
  StreamChunk,
} from './adapter.interface.js';

export class OpenAIAdapter implements AIProviderAdapter {
  public readonly providerId: string;
  public readonly modelName: string;
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(
    apiKey: string,
    modelName = 'gpt-4o-mini',
    baseUrl = 'https://api.openai.com/v1',
    providerId = 'openai',
  ) {
    this.apiKey = apiKey;
    this.modelName = modelName;
    this.baseUrl = baseUrl;
    this.providerId = providerId;
  }

  async generate(params: GenerationParams): Promise<GenerationResult> {
    const url = `${this.baseUrl}/chat/completions`;
    const payload = this.formatPayload(params, false);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(payload),
        signal: params.abortSignal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new AppError(
          response.status === 429 ? 429 : 502,
          `${this.providerId.toUpperCase()}_API_ERROR`,
          `${this.providerId.toUpperCase()} API error (${response.status}): ${errorText}`,
        );
      }

      const data = (await response.json()) as {
        choices?: Array<{
          message?: { content?: string };
        }>;
        usage?: {
          prompt_tokens?: number;
          completion_tokens?: number;
        };
      };

      const text = data.choices?.[0]?.message?.content ?? '';
      const tokenIn = data.usage?.prompt_tokens ?? this.countTokens(params.systemPrompt + text);
      const tokenOut = data.usage?.completion_tokens ?? this.countTokens(text);

      return {
        text,
        tokenIn,
        tokenOut,
        model: this.modelName,
      };
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new AppError(
        502,
        `${this.providerId.toUpperCase()}_CONNECTION_ERROR`,
        `Koneksi ke ${this.providerId} gagal: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  async *stream(params: GenerationParams): AsyncIterable<StreamChunk> {
    const url = `${this.baseUrl}/chat/completions`;
    const payload = this.formatPayload(params, true);

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(payload),
        signal: params.abortSignal,
      });
    } catch (err) {
      throw new AppError(
        502,
        `${this.providerId.toUpperCase()}_CONNECTION_ERROR`,
        `Gagal memulai stream ke ${this.providerId}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new AppError(
        response.status === 429 ? 429 : 502,
        `${this.providerId.toUpperCase()}_API_ERROR`,
        `${this.providerId.toUpperCase()} streaming error (${response.status}): ${errorText}`,
      );
    }

    if (!response.body) {
      throw new AppError(502, `${this.providerId.toUpperCase()}_STREAM_ERROR`, `${this.providerId} response body is null`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    try {
      while (true) {
        const readResult = await reader.read();
        if (readResult.done) break;

        buffer += decoder.decode(readResult.value as Uint8Array, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith(':')) continue;

          if (trimmed.startsWith('data:')) {
            const dataStr = trimmed.replace('data:', '').trim();
            if (dataStr === '[DONE]') {
              yield { delta: '', finishReason: 'stop' };
              return;
            }

            try {
              const parsed = JSON.parse(dataStr) as {
                choices?: Array<{
                  delta?: { content?: string };
                  finish_reason?: 'stop' | 'length' | null;
                }>;
                usage?: {
                  prompt_tokens?: number;
                  completion_tokens?: number;
                };
              };

              const delta = parsed.choices?.[0]?.delta?.content ?? '';
              const finish = parsed.choices?.[0]?.finish_reason ?? null;
              const usage = parsed.usage
                ? {
                    promptTokens: parsed.usage.prompt_tokens ?? 0,
                    completionTokens: parsed.usage.completion_tokens ?? 0,
                  }
                : undefined;

              if (delta || finish || usage) {
                yield {
                  delta,
                  finishReason: finish,
                  tokenUsage: usage,
                };
              }
            } catch {
              // Abaikan parsing line yang tidak lengkap
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  countTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  async healthCheck(): Promise<boolean> {
    await Promise.resolve();
    return Boolean(this.apiKey && this.apiKey.length > 0);
  }

  private formatPayload(params: GenerationParams, stream: boolean) {
    const messages = [
      { role: 'system', content: params.systemPrompt },
      ...params.messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    ];

    return {
      model: this.modelName,
      messages,
      temperature: params.temperature ?? 0.7,
      max_tokens: params.maxTokens ?? 2048,
      stream,
      stream_options: stream ? { include_usage: true } : undefined,
    };
  }
}
