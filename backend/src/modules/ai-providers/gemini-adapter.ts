import { AppError } from '../../shared/errors/app-error.js';
import {
  AIProviderAdapter,
  GenerationParams,
  GenerationResult,
  StreamChunk,
} from './adapter.interface.js';

export class GeminiAdapter implements AIProviderAdapter {
  public readonly providerId = 'gemini';
  public readonly modelName: string;
  private readonly apiKey: string;
  private readonly baseUrl = 'https://generativelanguage.googleapis.com/v1';

  constructor(apiKey: string, modelName = 'gemini-1.5-flash') {
    this.apiKey = apiKey;
    this.modelName = modelName;
  }

  async generate(params: GenerationParams): Promise<GenerationResult> {
    const url = `${this.baseUrl}/models/${this.modelName}:generateContent?key=${encodeURIComponent(this.apiKey)}`;
    const payload = this.formatPayload(params);

    try {
      let response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': this.apiKey,
        },
        body: JSON.stringify(payload),
        signal: params.abortSignal,
      });

      // Jika v1 menghasilkan 404, coba fallback ke v1beta dengan gemini-1.5-flash-latest
      if (response.status === 404) {
        const fallbackUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${encodeURIComponent(this.apiKey)}`;
        response = await fetch(fallbackUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': this.apiKey,
          },
          body: JSON.stringify(payload),
          signal: params.abortSignal,
        });
      }

      if (!response.ok) {
        const errorText = await response.text();
        // eslint-disable-next-line no-console
        console.error(`❌ [Gemini generateContent Error ${response.status}]:`, errorText);
        throw new AppError(
          response.status === 429 ? 429 : 502,
          'GEMINI_API_ERROR',
          `Gemini API returned error (${response.status}): ${errorText}`,
        );
      }

      const data = (await response.json()) as {
        candidates?: Array<{
          content?: { parts?: Array<{ text?: string }> };
        }>;
        usageMetadata?: {
          promptTokenCount?: number;
          candidatesTokenCount?: number;
        };
      };

      const candidate = data.candidates?.[0];
      const text = candidate?.content?.parts?.[0]?.text ?? '';
      const tokenIn = data.usageMetadata?.promptTokenCount ?? this.countTokens(params.systemPrompt);
      const tokenOut = data.usageMetadata?.candidatesTokenCount ?? this.countTokens(text);

      return {
        text,
        tokenIn,
        tokenOut,
        model: this.modelName,
      };
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new AppError(503, 'AI_PROVIDER_UNAVAILABLE', 'Gagal memanggil API Gemini.');
    }
  }

  async *stream(params: GenerationParams): AsyncIterable<StreamChunk> {
    const url = `${this.baseUrl}/models/${this.modelName}:streamGenerateContent?alt=sse&key=${encodeURIComponent(this.apiKey)}`;
    const payload = this.formatPayload(params);

    let response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': this.apiKey,
      },
      body: JSON.stringify(payload),
      signal: params.abortSignal,
    });

    // Jika v1 menghasilkan 404, coba fallback ke v1beta dengan gemini-1.5-flash-latest
    if (response.status === 404) {
      const fallbackUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:streamGenerateContent?alt=sse&key=${encodeURIComponent(this.apiKey)}`;
      response = await fetch(fallbackUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': this.apiKey,
        },
        body: JSON.stringify(payload),
        signal: params.abortSignal,
      });
    }

    if (!response.ok || !response.body) {
      const errorText = await response.text().catch(() => '');
      // eslint-disable-next-line no-console
      console.error(`❌ [Gemini streamGenerateContent Error ${response.status}]:`, errorText);
      throw new AppError(
        response.status === 429 ? 429 : 502,
        'GEMINI_STREAM_ERROR',
        `Gagal membuka koneksi stream Gemini (${response.status}): ${errorText}`,
      );
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const readResult = await reader.read();
        if (readResult.done) break;

        if (readResult.value) {
          buffer += decoder.decode(readResult.value as Uint8Array, { stream: true });
        }
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data: ')) continue;
          const jsonStr = trimmed.slice(6);
          if (jsonStr === '[DONE]') {
            yield { delta: '', finishReason: 'stop' };
            return;
          }

          try {
            const parsed = JSON.parse(jsonStr) as {
              candidates?: Array<{
                content?: { parts?: Array<{ text?: string }> };
                finishReason?: string;
              }>;
              usageMetadata?: {
                promptTokenCount?: number;
                candidatesTokenCount?: number;
              };
            };

            const delta = parsed.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
            const finishReason = parsed.candidates?.[0]?.finishReason === 'STOP' ? 'stop' : null;

            yield {
              delta,
              finishReason,
              tokenUsage: parsed.usageMetadata
                ? {
                    promptTokens: parsed.usageMetadata.promptTokenCount ?? 0,
                    completionTokens: parsed.usageMetadata.candidatesTokenCount ?? 0,
                  }
                : undefined,
            };
          } catch {
            // Abaikan parse error per chunk kecil
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  countTokens(text: string): number {
    return Math.max(1, Math.ceil(text.length / 4));
  }

  async healthCheck(): Promise<boolean> {
    await Promise.resolve();
    return Boolean(this.apiKey);
  }

  private formatPayload(params: GenerationParams) {
    const contents = params.messages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    return {
      contents,
      systemInstruction: {
        parts: [{ text: params.systemPrompt }],
      },
      generationConfig: {
        temperature: params.temperature ?? 0.7,
        maxOutputTokens: params.maxTokens ?? 2048,
      },
    };
  }
}

