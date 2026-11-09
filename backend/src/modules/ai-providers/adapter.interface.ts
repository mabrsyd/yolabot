export interface GenerationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface GenerationParams {
  systemPrompt: string;
  messages: GenerationMessage[];
  temperature?: number;
  maxTokens?: number;
  correlationId?: string;
  abortSignal?: AbortSignal;
}

export interface StreamChunk {
  delta: string;
  finishReason?: 'stop' | 'length' | 'error' | null;
  tokenUsage?: {
    promptTokens: number;
    completionTokens: number;
  };
}

export interface GenerationResult {
  text: string;
  tokenIn: number;
  tokenOut: number;
  model: string;
}

/**
 * Antarmuka seragam Abstraksi Penyedia Model AI (Model Abstraction Layer)
 * Seluruh adapter vendor (Gemini, OpenAI, Anthropic, Self-hosted) wajib mengimplementasikan interface ini.
 */
export interface AIProviderAdapter {
  readonly providerId: string;
  readonly modelName: string;

  /**
   * Menghasilkan teks lengkap (non-streaming)
   */
  generate(params: GenerationParams): Promise<GenerationResult>;

  /**
   * Menghasilkan teks ber-streaming token demi token (AsyncIterable)
   */
  stream(params: GenerationParams): AsyncIterable<StreamChunk>;

  /**
   * Menghitung estimasi token untuk pengelolaan jendela konteks (sliding window)
   */
  countTokens(text: string): number;

  /**
   * Pemeriksaan kesehatan konektivitas ke API penyedia
   */
  healthCheck(): Promise<boolean>;
}

