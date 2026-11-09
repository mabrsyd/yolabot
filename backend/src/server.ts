import { buildApp } from './app.js';
import { env } from './config/env.js';

async function startServer(): Promise<void> {
  const app = await buildApp();

  try {
    const address = await app.listen({
      port: env.PORT,
      host: env.HOST,
    });
    app.log.info(`🚀 YolaBot Backend Server aktif di: ${address}`);
    app.log.info(`🩺 Health check live di: ${address}/health/live`);
  } catch (err) {
    app.log.error(err, '❌ Gagal memulai server');
    process.exit(1);
  }

  // Graceful Shutdown
  const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];
  for (const signal of signals) {
    process.on(signal, () => {
      app.log.info(`Menerima sinyal ${signal}, mematikan server secara graceful...`);
      void app.close().then(() => {
        app.log.info('Server berhasil dimatikan dengan aman.');
        process.exit(0);
      });
    });
  }
}

void startServer();

