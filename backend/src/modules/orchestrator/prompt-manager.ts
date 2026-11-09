import { prisma } from '../../shared/database/prisma.js';
import { redis } from '../../shared/redis/redis.js';
import { DEFAULT_SYSTEM_PROMPT } from './context-builder.js';

export class PromptManager {
  private static readonly CACHE_KEY = 'prompt:active:main_system';
  private static readonly CACHE_TTL_SECONDS = 300; // 5 menit

  /**
   * Mengambil System Prompt aktif dari cache Redis atau database PostgreSQL (FR-025)
   */
  public static async getActiveSystemPrompt(): Promise<string> {
    try {
      // 1. Cek cache in-memory Redis
      const cached = await redis.get(PromptManager.CACHE_KEY);
      if (cached && cached.trim().length > 0) {
        return cached;
      }

      // 2. Query dari basis data PostgreSQL
      const activePromptRecord = await prisma.promptVersion.findFirst({
        where: {
          name: 'main_system',
          is_active: true,
        },
        orderBy: { version: 'desc' },
        select: { content: true },
      });

      if (activePromptRecord?.content) {
        // Simpan ke Redis cache
        await redis.set(
          PromptManager.CACHE_KEY,
          activePromptRecord.content,
          'EX',
          PromptManager.CACHE_TTL_SECONDS,
        );
        return activePromptRecord.content;
      }
    } catch {
      // Abaikan kegagalan database/cache dan fallback ke konstanta default
    }

    return DEFAULT_SYSTEM_PROMPT;
  }

  /**
   * Mengosongkan cache prompt di Redis ketika prompt diperbarui
   */
  public static async invalidatePromptCache(): Promise<void> {
    try {
      await redis.del(PromptManager.CACHE_KEY);
    } catch {
      // Ignore
    }
  }
}

