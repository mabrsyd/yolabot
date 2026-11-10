import { OpenAIAdapter } from './openai-adapter.js';

/**
 * Adapter untuk Groq Cloud LPU Inference API.
 * Groq 100% kompatibel dengan OpenAI Chat Completions API format,
 * dengan endpoint di https://api.groq.com/openai/v1.
 */
export class GroqAdapter extends OpenAIAdapter {
  constructor(
    apiKey: string,
    modelName = 'openai/gpt-oss-120b',
    baseUrl = 'https://api.groq.com/openai/v1',
  ) {
    super(apiKey, modelName, baseUrl, 'groq');
  }
}

