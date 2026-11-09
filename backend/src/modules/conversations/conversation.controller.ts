import { FastifyInstance, FastifyPluginOptions, FastifyReply, FastifyRequest } from 'fastify';
import { AppError } from '../../shared/errors/app-error.js';
import { authGuard } from '../../shared/middlewares/auth-guard.js';
import { OrchestratorService } from '../orchestrator/orchestrator.service.js';
import {
  createConversationSchema,
  listConversationsQuerySchema,
  searchQuerySchema,
  sendMessageSchema,
  updateConversationSchema,
} from './conversation.schema.js';
import { ConversationService } from './conversation.service.js';

export function conversationRoutes(
  fastify: FastifyInstance,
  _opts: FastifyPluginOptions,
): Promise<void> {
  const conversationService = ConversationService.getInstance();
  const orchestrator = OrchestratorService.getInstance();

  // Terapkan authGuard ke seluruh endpoint percakapan
  fastify.addHook('preHandler', authGuard);

  // 1. GET /v1/conversations (Daftar percakapan dengan cursor pagination)
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user;
    if (!user) throw new AppError(401, 'AUTH_REQUIRED', 'Autentikasi diperlukan.');

    const query = listConversationsQuerySchema.parse(request.query);
    const result = await conversationService.listConversations(user.id, query);

    return reply.status(200).send({
      success: true,
      data: result,
    });
  });

  // 2. POST /v1/conversations (Buat percakapan baru)
  fastify.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user;
    if (!user) throw new AppError(401, 'AUTH_REQUIRED', 'Autentikasi diperlukan.');

    const body = createConversationSchema.parse(request.body ?? {});
    const result = await conversationService.createConversation(user.id, body);

    return reply.status(201).send({
      success: true,
      data: result,
    });
  });

  // 3. GET /v1/conversations/:id (Detail percakapan)
  fastify.get('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user;
    if (!user) throw new AppError(401, 'AUTH_REQUIRED', 'Autentikasi diperlukan.');

    const { id } = request.params as { id: string };
    const result = await conversationService.getConversation(user.id, id);

    return reply.status(200).send({
      success: true,
      data: result,
    });
  });

  // 4. PATCH /v1/conversations/:id (Ubah judul percakapan)
  fastify.patch('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user;
    if (!user) throw new AppError(401, 'AUTH_REQUIRED', 'Autentikasi diperlukan.');

    const { id } = request.params as { id: string };
    const body = updateConversationSchema.parse(request.body);
    const result = await conversationService.updateConversation(user.id, id, body);

    return reply.status(200).send({
      success: true,
      data: result,
    });
  });

  // 5. DELETE /v1/conversations/:id (Soft delete percakapan)
  fastify.delete('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user;
    if (!user) throw new AppError(401, 'AUTH_REQUIRED', 'Autentikasi diperlukan.');

    const { id } = request.params as { id: string };
    await conversationService.deleteConversation(user.id, id);

    return reply.status(200).send({
      success: true,
      data: {
        message: 'Percakapan berhasil dihapus.',
      },
    });
  });

  // 6. GET /v1/conversations/:id/messages (Riwayat pesan percakapan)
  fastify.get('/:id/messages', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user;
    if (!user) throw new AppError(401, 'AUTH_REQUIRED', 'Autentikasi diperlukan.');

    const { id } = request.params as { id: string };
    const result = await conversationService.getMessages(user.id, id);

    return reply.status(200).send({
      success: true,
      data: result,
    });
  });

  // 7. POST /v1/conversations/:id/messages (Kirim pesan dengan streaming response via SSE)
  fastify.post('/:id/messages', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user;
    if (!user) throw new AppError(401, 'AUTH_REQUIRED', 'Autentikasi diperlukan.');

    const { id: conversationId } = request.params as { id: string };
    const body = sendMessageSchema.parse(request.body);

    // Set header SSE (Server-Sent Events)
    reply.raw.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    reply.raw.setHeader('Cache-Control', 'no-cache, no-transform');
    reply.raw.setHeader('Connection', 'keep-alive');
    reply.raw.setHeader('X-Accel-Buffering', 'no');
    reply.raw.flushHeaders?.();

    // Hentikan generasi jika client memutuskan koneksi HTTP di tengah jalan
    request.raw.on('close', () => {
      orchestrator.stopGeneration(conversationId);
    });

    await orchestrator.streamMessage(user.id, conversationId, body.content, {
      onSession: (messageId, convId) => {
        reply.raw.write(
          `event: session\ndata: ${JSON.stringify({ message_id: messageId, conversation_id: convId })}\n\n`,
        );
      },
      onToken: (delta) => {
        reply.raw.write(`event: token\ndata: ${JSON.stringify({ delta })}\n\n`);
      },
      onDone: (finishReason, tokenIn, tokenOut) => {
        reply.raw.write(
          `event: done\ndata: ${JSON.stringify({ finish_reason: finishReason, token_in: tokenIn, token_out: tokenOut })}\n\n`,
        );
        reply.raw.end();
      },
      onError: (error) => {
        reply.raw.write(
          `event: error\ndata: ${JSON.stringify({ message: error.message || 'Terjadi kesalahan sistem inferensi AI.' })}\n\n`,
        );
        reply.raw.end();
      },
    });
  });

  // 8. POST /v1/conversations/:id/stop (Hentikan inferensi streaming yang sedang berlangsung)
  fastify.post('/:id/stop', (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user;
    if (!user) throw new AppError(401, 'AUTH_REQUIRED', 'Autentikasi diperlukan.');

    const { id: conversationId } = request.params as { id: string };
    orchestrator.stopGeneration(conversationId);

    return reply.status(200).send({
      success: true,
      data: {
        message: 'Generasi dihentikan. Pesan parsial telah disimpan.',
      },
    });
  });

  return Promise.resolve();
}

/**
 * Endpoint pencarian global percakapan dan pesan (/v1/search)
 */
export function searchRoutes(
  fastify: FastifyInstance,
  _opts: FastifyPluginOptions,
): Promise<void> {
  const conversationService = ConversationService.getInstance();

  fastify.addHook('preHandler', authGuard);

  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user;
    if (!user) throw new AppError(401, 'AUTH_REQUIRED', 'Autentikasi diperlukan.');

    const query = searchQuerySchema.parse(request.query);
    const results = await conversationService.searchConversations(user.id, query.q);

    return reply.status(200).send({
      success: true,
      data: {
        results,
      },
    });
  });

  return Promise.resolve();
}

