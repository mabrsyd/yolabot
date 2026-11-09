import {
  AIProviderAdapter,
  GenerationParams,
  GenerationResult,
  StreamChunk,
} from './adapter.interface.js';

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerConfig {
  failureThreshold?: number; // Jumlah kegagalan berturut-turut untuk membuka sirkuit (default: 3)
  cooldownPeriodMs?: number; // Durasi sirkuit tetap OPEN sebelum uji coba HALF_OPEN (default: 30000 ms)
}

export class FallbackRouter implements AIProviderAdapter {
  private primary: AIProviderAdapter;
  private secondary: AIProviderAdapter;
  private state: CircuitState = 'CLOSED';
  private consecutiveFailures = 0;
  private lastFailureTime = 0;
  private readonly failureThreshold: number;
  private readonly cooldownPeriodMs: number;

  constructor(
    primary: AIProviderAdapter,
    secondary: AIProviderAdapter,
    config?: CircuitBreakerConfig,
  ) {
    this.primary = primary;
    this.secondary = secondary;
    this.failureThreshold = config?.failureThreshold ?? 3;
    this.cooldownPeriodMs = config?.cooldownPeriodMs ?? 30000;
  }

  public get providerId(): string {
    return this.isPrimaryAvailable() ? this.primary.providerId : this.secondary.providerId;
  }

  public get modelName(): string {
    return this.isPrimaryAvailable() ? this.primary.modelName : this.secondary.modelName;
  }

  public getCircuitState(): CircuitState {
    this.updateCircuitState();
    return this.state;
  }

  private updateCircuitState(): void {
    if (this.state === 'OPEN') {
      const now = Date.now();
      if (now - this.lastFailureTime >= this.cooldownPeriodMs) {
        this.state = 'HALF_OPEN';
      }
    }
  }

  private isPrimaryAvailable(): boolean {
    this.updateCircuitState();
    return this.state !== 'OPEN';
  }

  private recordSuccess(): void {
    this.state = 'CLOSED';
    this.consecutiveFailures = 0;
  }

  private recordFailure(): void {
    this.consecutiveFailures++;
    this.lastFailureTime = Date.now();
    if (this.consecutiveFailures >= this.failureThreshold || this.state === 'HALF_OPEN') {
      this.state = 'OPEN';
    }
  }

  async generate(params: GenerationParams): Promise<GenerationResult> {
    if (this.isPrimaryAvailable()) {
      try {
        const result = await this.primary.generate(params);
        this.recordSuccess();
        return result;
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('⚠️ [FallbackRouter] Primary provider gagal, beralih ke fallback:', err);
        this.recordFailure();
        // Fallback otomatis ke penyedia sekunder
        return await this.secondary.generate(params);
      }
    }

    // Sirkuit OPEN: Langsung alihkan ke penyedia sekunder
    return await this.secondary.generate(params);
  }

  async *stream(params: GenerationParams): AsyncIterable<StreamChunk> {
    if (this.isPrimaryAvailable()) {
      try {
        const primaryStream = this.primary.stream(params);
        for await (const chunk of primaryStream) {
          yield chunk;
        }
        this.recordSuccess();
        return;
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('⚠️ [FallbackRouter] Primary stream gagal, beralih ke fallback:', err);
        this.recordFailure();
        // Fallback otomatis ke stream penyedia sekunder
        const fallbackStream = this.secondary.stream(params);
        for await (const chunk of fallbackStream) {
          yield chunk;
        }
        return;
      }
    }

    // Sirkuit OPEN: Langsung streaming melalui penyedia sekunder
    const fallbackStream = this.secondary.stream(params);
    for await (const chunk of fallbackStream) {
      yield chunk;
    }
  }

  countTokens(text: string): number {
    return this.primary.countTokens(text);
  }

  async healthCheck(): Promise<boolean> {
    const primaryHealth = await this.primary.healthCheck();
    if (primaryHealth) return true;
    return await this.secondary.healthCheck();
  }
}

