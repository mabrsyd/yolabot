import { FastifyInstance, FastifyPluginAsync } from 'fastify';

export const healthRoutes: FastifyPluginAsync = (fastify: FastifyInstance): Promise<void> => {
  fastify.get('/live', async (_request, reply) => {
    return reply.status(200).send({
      status: 'alive',
      timestamp: new Date().toISOString(),
    });
  });

  fastify.get('/ready', async (_request, reply) => {
    // Pada Fase 1, pengecekan readiness dasar
    return reply.status(200).send({
      status: 'ready',
      checks: {
        server: 'operational',
      },
      timestamp: new Date().toISOString(),
    });
  });

  fastify.get('/', async (_request, reply) => {
    return reply.status(200).send({
      name: 'YolaBot API',
      status: 'ok',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    });
  });

  return Promise.resolve();
};

