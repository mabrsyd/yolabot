import { FastifyReply, FastifyRequest } from 'fastify';
import { AppError } from '../errors/app-error.js';
import { redis } from '../redis/redis.js';

export interface AuthenticatedUser {
  id: string;
  email: string | null;
  role: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthenticatedUser;
  }
}

export async function authGuard(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
  const sessionId = request.cookies['session_id'];

  if (!sessionId) {
    throw new AppError(401, 'AUTH_REQUIRED', 'Akses ditolak. Sesi autentikasi diperlukan.');
  }

  try {
    const sessionRaw = await redis.get(`session:${sessionId}`);

    if (!sessionRaw) {
      throw new AppError(
        401,
        'SESSION_EXPIRED',
        'Sesi Anda telah berakhir. Silakan masuk kembali.',
      );
    }

    const session = JSON.parse(sessionRaw) as {
      user_id: string;
      email: string | null;
      role: string;
    };

    request.user = {
      id: session.user_id,
      email: session.email,
      role: session.role,
    };
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(401, 'SESSION_INVALID', 'Gagal memverifikasi sesi autentikasi.');
  }
}

