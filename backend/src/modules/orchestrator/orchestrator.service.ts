import { env } from '../../config/env.js';
import { prisma } from '../../shared/database/prisma.js';
import { AppError } from '../../shared/errors/app-error.js';
import { AIProviderAdapter } from '../ai-providers/adapter.interface.js';
import { createAdapter } from '../ai-providers/adapter-factory.js';
import { FallbackRouter } from '../ai-providers/fallback-router.js';
import { ContextBuilder } from './context-builder.js';
import { PromptManager } from './prompt-manager.js';

export interface StreamCallbacks {
  onSession: (messageId: string, conversationId: string) => void;
  onToken: (delta: string) => void;
  onDone: (finishReason: string, tokenIn: number, tokenOut: number) => void;
  onError: (error: Error) => void;
}

export class OrchestratorService {
  private static instance: OrchestratorService;
  private readonly primaryAdapter: AIProviderAdapter;
  private readonly activeGenerations: Map<string, AbortController> = new Map();

  private constructor() {
    const primary = createAdapter(env.AI_PRIMARY_PROVIDER);
    const secondary = createAdapter(env.AI_FALLBACK_PROVIDER);

    this.primaryAdapter = new FallbackRouter(primary, secondary);
  }

  public static getInstance(): OrchestratorService {
    if (!OrchestratorService.instance) {
      OrchestratorService.instance = new OrchestratorService();
    }
    return OrchestratorService.instance;
  }

  /**
   * Menghentikan generasi inferensi AI yang sedang berjalan pada percakapan tertentu.
   */
  public stopGeneration(conversationId: string): boolean {
    const controller = this.activeGenerations.get(conversationId);
    if (controller) {
      controller.abort();
      this.activeGenerations.delete(conversationId);
      return true;
    }
    return false;
  }

  /**
   * Mengalirkan respon pesan (streaming inference) dari AI model ke pengguna melalui SSE.
   */
  public async streamMessage(
    userId: string,
    conversationId: string,
    userContent: string,
    callbacks: StreamCallbacks,
  ): Promise<void> {
    // 1. Verifikasi kepemilikan dan integritas percakapan (Multi-Tenant Isolation)
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        user_id: userId,
        deleted_at: null,
      },
    });

    if (!conversation) {
      throw new AppError(404, 'CONVERSATION_NOT_FOUND', 'Percakapan tidak ditemukan.');
    }

    // 2. Simpan pesan pengguna ke database
    const userTokens = this.primaryAdapter.countTokens(userContent);
    const userMessage = await prisma.message.create({
      data: {
        conversation_id: conversationId,
        role: 'user',
        content: userContent,
        status: 'complete',
        token_in: userTokens,
        token_out: 0,
      },
    });

    // 3. Ambil riwayat percakapan sebelumnya untuk windowing context
    const history = await prisma.message.findMany({
      where: {
        conversation_id: conversationId,
        id: { not: userMessage.id },
        status: { in: ['complete', 'incomplete'] },
      },
      orderBy: { created_at: 'asc' },
      take: 50,
      select: {
        role: true,
        content: true,
        created_at: true,
      },
    });

    // 4. Bangun konteks dengan dynamic prompt & algoritma sliding window
    const systemPrompt = await PromptManager.getActiveSystemPrompt();
    const context = ContextBuilder.buildContext({
      systemPrompt,
      historyMessages: history,
      currentUserInput: userContent,
      adapter: this.primaryAdapter,
    });

    // 5. Buat placeholder pesan assistant di database dengan status 'incomplete'
    const assistantMessage = await prisma.message.create({
      data: {
        conversation_id: conversationId,
        role: 'assistant',
        content: '',
        status: 'incomplete',
        model: this.primaryAdapter.modelName,
        token_in: context.estimatedTokens,
        token_out: 0,
      },
    });

    // 6. Buat AbortController untuk pengelolaan penghentian generasi
    const abortController = new AbortController();
    this.activeGenerations.set(conversationId, abortController);

    // Kirim event session awal ke client
    callbacks.onSession(assistantMessage.id, conversationId);

    let fullResponseText = '';
    let finalFinishReason = 'stop';
    let tokenUsagePrompt: number | undefined;
    let tokenUsageCandidates: number | undefined;

    try {
      // 7. Mulai streaming dari adapter AI
      const stream = this.primaryAdapter.stream({
        systemPrompt: context.systemPrompt,
        messages: context.messages,
        abortSignal: abortController.signal,
      });

      for await (const chunk of stream) {
        if (chunk.delta) {
          fullResponseText += chunk.delta;
          callbacks.onToken(chunk.delta);
        }

        if (chunk.finishReason) {
          finalFinishReason = chunk.finishReason;
        }

        if (chunk.tokenUsage) {
          tokenUsagePrompt = chunk.tokenUsage.promptTokens;
          tokenUsageCandidates = chunk.tokenUsage.completionTokens;
        }
      }

      // 8. Tentukan metrik token akhir
      const tokenOut = tokenUsageCandidates ?? this.primaryAdapter.countTokens(fullResponseText);
      const tokenIn = tokenUsagePrompt ?? context.estimatedTokens;

      // 9. Perbarui status pesan assistant di database menjadi 'complete'
      await prisma.message.update({
        where: { id: assistantMessage.id },
        data: {
          content: fullResponseText,
          status: 'complete',
          token_in: tokenIn,
          token_out: tokenOut,
        },
      });

      // 10. Perbarui timestamp updated_at percakapan
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { updated_at: new Date() },
      });

      // 11. Catat pemakaian kuota token harian (UsageRecord)
      await this.recordUsage(userId, tokenIn, tokenOut);

      // Notifikasi event done ke client
      callbacks.onDone(finalFinishReason, tokenIn, tokenOut);

      // 12. Picu pembuatan judul otomatis secara asinkron jika ini percakapan awal
      if (conversation.title === 'Percakapan Baru' || history.length === 0) {
        void this.generateTitle(conversationId, userContent);
      }
    } catch (err: unknown) {
      const isAborted = abortController.signal.aborted;
      const finalStatus = isAborted ? 'incomplete' : 'failed';
      const tokenOut = this.primaryAdapter.countTokens(fullResponseText);
      const tokenIn = context.estimatedTokens;

      // Simpan teks parsial jika generasi dihentikan pengguna
      await prisma.message.update({
        where: { id: assistantMessage.id },
        data: {
          content: fullResponseText,
          status: finalStatus,
          token_in: tokenIn,
          token_out: tokenOut,
        },
      });

      if (isAborted) {
        callbacks.onDone('abort', tokenIn, tokenOut);
      } else {
        callbacks.onError(err instanceof Error ? err : new Error(String(err)));
      }
    } finally {
      this.activeGenerations.delete(conversationId);
    }
  }

  /**
   * Menghasilkan judul percakapan secara otomatis (maksimal 5 kata) menggunakan AI.
   */
  public async generateTitle(conversationId: string, firstMessage: string): Promise<void> {
    try {
      const prompt = `Buatlah judul percakapan yang sangat ringkas (maksimal 5 kata, tanpa tanda kutip, tanpa kata "Percakapan") yang merangkum topik ini: "${firstMessage.slice(0, 200)}"`;

      const result = await this.primaryAdapter.generate({
        systemPrompt: 'Kamu adalah asisten perangkum judul. Jawab hanya dengan judul tanpa teks pembuka atau penutup.',
        messages: [{ role: 'user', content: prompt }],
      });

      let cleanTitle = result.text.trim().replace(/^["']|["']$/g, '');
      if (cleanTitle.length > 150) {
        cleanTitle = cleanTitle.slice(0, 147) + '...';
      }

      if (cleanTitle.length > 0) {
        await prisma.conversation.update({
          where: { id: conversationId },
          data: { title: cleanTitle },
        });
      }
    } catch {
      // Pembuatan judul otomatis bersifat non-kritis; kegagalan tidak memutus alur
    }
  }

  /**
   * Mencatat dan mengakumulasi agregasi penggunaan token harian per pengguna.
   */
  private async recordUsage(userId: string, tokenIn: number, tokenOut: number): Promise<void> {
    try {
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);

      await prisma.usageRecord.upsert({
        where: {
          usage_user_period_unique: {
            user_id: userId,
            period_date: today,
          },
        },
        update: {
          total_tokens: { increment: tokenIn + tokenOut },
          total_requests: { increment: 1 },
        },
        create: {
          user_id: userId,
          period_date: today,
          total_tokens: tokenIn + tokenOut,
          total_requests: 1,
        },
      });
    } catch {
      // Pencatatan metrik tidak boleh memutus respon ke pengguna
    }
  }
}

