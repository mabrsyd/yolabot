import { FastifyInstance, FastifyPluginOptions, FastifyReply, FastifyRequest } from 'fastify';
import { Update } from 'grammy/types';
import { env } from '../../config/env.js';
import { AppError } from '../../shared/errors/app-error.js';
import { authGuard } from '../../shared/middlewares/auth-guard.js';
import { generateTelegramLinkCode } from '../../shared/utils/crypto.js';
import { redis } from '../../shared/redis/redis.js';
import { TelegramService } from './telegram.service.js';

export function telegramRoutes(
  fastify: FastifyInstance,
  _opts: FastifyPluginOptions,
): Promise<void> {
  const telegramService = TelegramService.getInstance();
  const bot = telegramService.getBot();

  // POST /v1/telegram/webhook
  fastify.post('/webhook', async (request: FastifyRequest, reply: FastifyReply) => {
    // 1. Verifikasi Secret Token Webhook (SECURITY.md)
    if (env.TELEGRAM_WEBHOOK_SECRET) {
      const secretHeader = request.headers['x-telegram-bot-api-secret-token'];
      if (secretHeader !== env.TELEGRAM_WEBHOOK_SECRET) {
        throw new AppError(403, 'WEBHOOK_FORBIDDEN', 'Token rahasia webhook tidak valid.');
      }
    }

    if (!bot) {
      return reply.status(200).send({ ok: true, status: 'bot_disabled' });
    }

    const update = request.body as Update;

    // 2. Proteksi Idempotensi Telegram Update (Deduplikasi via Redis)
    if (update && typeof update.update_id === 'number') {
      const isDuplicate = await telegramService.isUpdateAlreadyProcessed(update.update_id);
      if (isDuplicate) {
        // Balas 200 OK langsung agar Telegram tidak me-retry update duplikat ini
        return reply.status(200).send({ ok: true, note: 'duplicate_skipped' });
      }
    }

    // 3. Proses update melalui grammY engine secara non-blocking
    void bot.handleUpdate(update);

    // Telegram mewajibkan respons HTTP 200 secepatnya
    return reply.status(200).send({ ok: true });
  });

  return Promise.resolve();
}

/**
 * Endpoint penautan akun Web ke Telegram (/v1/link)
 */
export function linkRoutes(
  fastify: FastifyInstance,
  _opts: FastifyPluginOptions,
): Promise<void> {
  fastify.addHook('preHandler', authGuard);

  // POST /v1/link/telegram-code
  fastify.post('/telegram-code', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user;
    if (!user) throw new AppError(401, 'AUTH_REQUIRED', 'Autentikasi diperlukan.');

    const code = generateTelegramLinkCode();
    const redisKey = `telegram_link:${code}`;

    // Simpan kode di Redis berbatas waktu 600 detik (10 menit)
    await redis.set(redisKey, user.id, 'EX', 600);

    return reply.status(200).send({
      success: true,
      data: {
        code,
        expires_in_seconds: 600,
        instructions: `Kirimkan perintah /link ${code} ke bot Telegram YolaBot untuk menautkan akun.`,
      },
    });
  });

  return Promise.resolve();
}

