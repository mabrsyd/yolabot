import crypto from 'node:crypto';
import fastifyCookie from '@fastify/cookie';
import fastifyCors from '@fastify/cors';
import fastifySensible from '@fastify/sensible';
import Fastify, { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { env } from './config/env.js';
import { authRoutes } from './modules/auth/auth.controller.js';
import {
  conversationRoutes,
  searchRoutes,
} from './modules/conversations/conversation.controller.js';
import { healthRoutes } from './modules/health/health.controller.js';
import { linkRoutes, telegramRoutes } from './modules/telegram/telegram.controller.js';
import { userRoutes } from './modules/users/user.controller.js';
import { AppError } from './shared/errors/app-error.js';

export async function buildApp(): Promise<FastifyInstance> {
  const isDevelopment = env.NODE_ENV === 'development';

  const fastify = Fastify({
    logger: isDevelopment
      ? {
          transport: {
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'HH:MM:ss Z',
              ignore: 'pid,hostname',
            },
          },
        }
      : {
          level: 'info',
          redact: {
            paths: [
              'req.headers.cookie',
              'req.headers.authorization',
              'req.body.password',
              'req.body.token',
            ],
            censor: '[REDACTED]',
          },
        },
    disableRequestLogging: false,
    requestIdHeader: 'x-correlation-id',
    genReqId: () => crypto.randomUUID(),
  });

  // Registrasi Plugin Inti
  await fastify.register(fastifySensible);
  await fastify.register(fastifyCors, {
    origin: [env.APP_BASE_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-ID', 'Accept'],
  });

  await fastify.register(fastifyCookie, {
    secret: env.SESSION_SECRET,
    hook: 'onRequest',
  });

  // Injeksi Correlation ID ke response header
  fastify.addHook('onSend', async (request: FastifyRequest, reply: FastifyReply) => {
    void reply.header('x-correlation-id', request.id);
  });

  // Registrasi Route Modul
  await fastify.register(healthRoutes, { prefix: '/health' });
  await fastify.register(authRoutes, { prefix: '/v1/auth' });
  await fastify.register(conversationRoutes, { prefix: '/v1/conversations' });
  await fastify.register(searchRoutes, { prefix: '/v1/search' });
  await fastify.register(telegramRoutes, { prefix: '/v1/telegram' });
  await fastify.register(linkRoutes, { prefix: '/v1/link' });
  await fastify.register(userRoutes, { prefix: '/v1/me' });

  // Root Welcome Endpoint
  fastify.get('/v1', async (_request, reply) => {
    return reply.status(200).send({
      success: true,
      data: {
        message: 'Selamat datang di API YolaBot (Multi-Platform AI Assistant)',
        version: '1.0.0',
        docs: '/docs',
      },
    });
  });

  // Global Error Handler (Uniform Error Envelope)
  fastify.setErrorHandler((error, request, reply) => {
    const correlationId = request.id;

    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        success: false,
        error: {
          code: error.errorCode,
          message: error.message,
          details: error.details,
        },
        meta: {
          correlation_id: correlationId,
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Fastify Schema Validation Error
    if (error.validation) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Data permintaan tidak valid',
          details: error.validation,
        },
        meta: {
          correlation_id: correlationId,
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Internal Server Error (Uncaught)
    request.log.error({ err: error, correlationId }, 'Unhandled server exception occurred');

    return reply.status(500).send({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message:
          env.NODE_ENV === 'production'
            ? 'Terjadi kesalahan internal pada server'
            : error.message,
      },
      meta: {
        correlation_id: correlationId,
        timestamp: new Date().toISOString(),
      },
    });
  });

  // 404 Not Found Handler
  fastify.setNotFoundHandler((request, reply) => {
    return reply.status(404).send({
      success: false,
      error: {
        code: 'RESOURCE_NOT_FOUND',
        message: `Rute ${request.method} ${request.url} tidak ditemukan`,
      },
      meta: {
        correlation_id: request.id,
        timestamp: new Date().toISOString(),
      },
    });
  });

  return fastify;
}

