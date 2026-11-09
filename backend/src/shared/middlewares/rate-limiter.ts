import { FastifyReply, FastifyRequest } from 'fastify';
import { AppError } from '../errors/app-error.js';
import { redis } from '../redis/redis.js';

export interface RateLimitOptions {
  maxRequestsPerMinute?: number;
  dailyTokenQuota?: number;
}

const DEFAULT_MAX_REQUESTS = 30;
const DEFAULT_DAILY_TOKEN_QUOTA = 50000;

/**
 * Middleware Rate Limiter berbasis Redis sliding window & kuota token harian (FR-022)
 */
export function createRateLimiter(options?: RateLimitOptions) {
  const maxRequests = options?.maxRequestsPerMinute ?? DEFAULT_MAX_REQUESTS;
  const tokenQuota = options?.dailyTokenQuota ?? DEFAULT_DAILY_TOKEN_QUOTA;

  return async function rateLimitGuard(
    request: FastifyRequest,
    _reply: FastifyReply,
  ): Promise<void> {
    const identifier = request.user?.id ?? request.ip;
    const now = Math.floor(Date.now() / 1000);
    const minuteKey = `rate_limit:${identifier}:${Math.floor(now / 60)}`;

    try {
      // 1. Periksa batas request per menit
      const currentRequests = await redis.incr(minuteKey);
      if (currentRequests === 1) {
        await redis.expire(minuteKey, 65); // TTL 65 detik
      }

      if (currentRequests > maxRequests) {
        throw new AppError(
          429,
          'RATE_LIMIT_EXCEEDED',
          `Batas frekuensi permintaan terlampaui (maksimal ${maxRequests} permintaan per menit). Silakan coba lagi sebentar lagi.`,
        );
      }

      // 2. Jika pengguna terotentikasi, periksa kuota token harian
      if (request.user?.id) {
        const todayStr = new Date().toISOString().split('T')[0] ?? '';
        const quotaKey = `daily_tokens:${request.user.id}:${todayStr}`;
        const usedTokensRaw = await redis.get(quotaKey);
        const usedTokens = usedTokensRaw ? parseInt(usedTokensRaw, 10) : 0;

        if (usedTokens >= tokenQuota) {
          throw new AppError(
            429,
            'DAILY_QUOTA_EXCEEDED',
            `Anda telah mencapai batas kuota harian (${tokenQuota.toLocaleString('id-ID')} token). Kuota akan disegarkan pada pukul 00:00 UTC.`,
          );
        }
      }
    } catch (err) {
      if (err instanceof AppError) throw err;
      // Kegagalan Redis tidak boleh menghentikan aplikasi sepenuhnya jika degradasi
    }
  };
}

