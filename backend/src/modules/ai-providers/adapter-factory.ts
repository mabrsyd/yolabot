import { env } from '../../config/env.js';
import { AIProviderAdapter } from './adapter.interface.js';
import { GeminiAdapter } from './gemini-adapter.js';
import { GroqAdapter } from './groq-adapter.js';
import { MockAIProviderAdapter } from './mock-adapter.js';
import { OpenAIAdapter } from './openai-adapter.js';

export type ProviderType = 'gemini' | 'openai' | 'groq' | 'mock';

/**
 * Factory terpusat untuk menginstansiasi AIProviderAdapter berdasarkan konfigurasi lingkungan.
 * Mendukung Groq LPU, OpenAI, Google Gemini, dan Mock AI Provider.
 */
export function createAdapter(provider: ProviderType): AIProviderAdapter {
  switch (provider) {
    case 'groq':
      if (env.GROQ_API_KEY && env.GROQ_API_KEY.trim().length > 0) {
        return new GroqAdapter(env.GROQ_API_KEY, env.GROQ_DEFAULT_MODEL, env.GROQ_BASE_URL);
      }
      return new MockAIProviderAdapter();

    case 'gemini':
      if (env.GEMINI_API_KEY && env.GEMINI_API_KEY.trim().length > 0) {
        return new GeminiAdapter(env.GEMINI_API_KEY, env.GEMINI_DEFAULT_MODEL);
      }
      return new MockAIProviderAdapter();

    case 'openai':
      if (env.OPENAI_API_KEY && env.OPENAI_API_KEY.trim().length > 0) {
        return new OpenAIAdapter(
          env.OPENAI_API_KEY,
          env.OPENAI_DEFAULT_MODEL,
          env.OPENAI_BASE_URL,
        );
      }
      return new MockAIProviderAdapter();

    case 'mock':
    default:
      return new MockAIProviderAdapter();
  }
}

