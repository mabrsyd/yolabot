import { FastifyInstance, FastifyPluginOptions, FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from '../../shared/database/prisma.js';
import { AppError } from '../../shared/errors/app-error.js';
import { authGuard } from '../../shared/middlewares/auth-guard.js';
import { redis } from '../../shared/redis/redis.js';
import { verifyPassword } from '../../shared/utils/crypto.js';
import { deleteAccountSchema, updateProfileSchema } from './user.schema.js';

export function userRoutes(
  fastify: FastifyInstance,
  _opts: FastifyPluginOptions,
): Promise<void> {
  fastify.addHook('preHandler', authGuard);

  // 1. GET /v1/me (Ambil profil, preferensi, dan status identitas tertaut)
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const authUser = request.user;
    if (!authUser) throw new AppError(401, 'AUTH_REQUIRED', 'Autentikasi diperlukan.');

    const user = await prisma.user.findFirst({
      where: { id: authUser.id, deleted_at: null },
      include: {
        identities: {
          select: {
            provider: true,
            external_id: true,
            linked_at: true,
          },
        },
      },
    });

    if (!user) {
      throw new AppError(404, 'USER_NOT_FOUND', 'Pengguna tidak ditemukan.');
    }

    return reply.status(200).send({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        display_name: user.display_name,
        role: user.role,
        preferences: user.preferences,
        identities: user.identities,
      },
    });
  });

  // 2. PATCH /v1/me (Perbarui nama profil dan preferensi)
  fastify.patch('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const authUser = request.user;
    if (!authUser) throw new AppError(401, 'AUTH_REQUIRED', 'Autentikasi diperlukan.');

    const body = updateProfileSchema.parse(request.body);

    const updated = await prisma.user.update({
      where: { id: authUser.id },
      data: {
        display_name: body.display_name ?? undefined,
        preferences: body.preferences ?? undefined,
      },
      select: {
        id: true,
        display_name: true,
        preferences: true,
      },
    });

    return reply.status(200).send({
      success: true,
      data: {
        message: 'Profil berhasil diperbarui.',
        user: updated,
      },
    });
  });

  // 3. DELETE /v1/me (Hapus akun & data mandiri - Privacy Purge FR-024)
  fastify.delete('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const authUser = request.user;
    if (!authUser) throw new AppError(401, 'AUTH_REQUIRED', 'Autentikasi diperlukan.');

    const body = deleteAccountSchema.parse(request.body);

    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
    });

    if (!user || !user.password_hash) {
      throw new AppError(404, 'USER_NOT_FOUND', 'Pengguna tidak ditemukan.');
    }

    // Verifikasi konfirmasi kata sandi
    const isPasswordValid = await verifyPassword(body.password, user.password_hash);
    if (!isPasswordValid) {
      throw new AppError(401, 'INVALID_PASSWORD', 'Konfirmasi kata sandi tidak valid.');
    }

    // Lakukan soft-delete dan anonimisasi data sensitif
    await prisma.user.update({
      where: { id: user.id },
      data: {
        deleted_at: new Date(),
        status: 'deleted',
        email: `deleted_${user.id}@yolabot.local`,
      },
    });

    // Soft delete semua percakapan milik pengguna
    await prisma.conversation.updateMany({
      where: { user_id: user.id, deleted_at: null },
      data: { deleted_at: new Date() },
    });

    // Cabut sesi aktif di Redis
    const sessionId = request.cookies['session_id'];
    if (sessionId) {
      await redis.del(`session:${sessionId}`);
    }

    // Hapus session cookie
    void reply.clearCookie('session_id', { path: '/' });

    return reply.status(200).send({
      success: true,
      data: {
        message: 'Akun Anda telah dinonaktifkan dan seluruh riwayat sesi telah dicabut.',
      },
    });
  });

  return Promise.resolve();
}

