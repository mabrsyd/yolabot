import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { env } from '../../config/env.js';
import {
  loginSchema,
  registerSchema,
  verifyEmailSchema,
} from './auth.schema.js';
import { AuthService } from './auth.service.js';

export const authRoutes: FastifyPluginAsync = (fastify: FastifyInstance): Promise<void> => {
  const authService = new AuthService();

  // POST /v1/auth/register
  fastify.post('/register', async (request, reply) => {
    const dto = registerSchema.parse(request.body);
    const result = await authService.register(dto);
    return reply.status(201).send({
      success: true,
      data: result,
      meta: {
        correlation_id: request.id,
        timestamp: new Date().toISOString(),
      },
    });
  });

  // POST /v1/auth/verify-email
  fastify.post('/verify-email', async (request, reply) => {
    const dto = verifyEmailSchema.parse(request.body);
    const result = await authService.verifyEmail(dto.token);
    return reply.status(200).send({
      success: true,
      data: result,
      meta: {
        correlation_id: request.id,
        timestamp: new Date().toISOString(),
      },
    });
  });

  // POST /v1/auth/login
  fastify.post('/login', async (request, reply) => {
    const dto = loginSchema.parse(request.body);
    const result = await authService.login(dto, request.ip);

    // Set HttpOnly, Secure, SameSite=Strict Session Cookie
    const isProd = env.NODE_ENV === 'production';
    void reply.setCookie('session_id', result.sessionId, {
      path: '/',
      httpOnly: true,
      secure: isProd,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60, // 7 hari
    });

    return reply.status(200).send({
      success: true,
      data: {
        user: result.user,
      },
      meta: {
        correlation_id: request.id,
        timestamp: new Date().toISOString(),
      },
    });
  });

  // POST /v1/auth/logout
  fastify.post('/logout', async (request, reply) => {
    const sessionId = request.cookies['session_id'];
    if (sessionId) {
      await authService.logout(sessionId);
    }

    void reply.clearCookie('session_id', {
      path: '/',
      httpOnly: true,
      sameSite: 'strict',
    });

    return reply.status(200).send({
      success: true,
      data: {
        message: 'Logout berhasil.',
      },
      meta: {
        correlation_id: request.id,
        timestamp: new Date().toISOString(),
      },
    });
  });

  return Promise.resolve();
};

