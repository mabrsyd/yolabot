import { TelegramService } from './telegram.service.js';

async function startPolling() {
  const telegramService = TelegramService.getInstance();
  const bot = telegramService.getBot();

  if (!bot) {
    // eslint-disable-next-line no-console
    console.error('❌ TELEGRAM_BOT_TOKEN belum dikonfigurasi di file .env');
    process.exit(1);
  }

  try {
    // Pastikan webhook lama dibersihkan agar long-polling dapat menerima update
    await bot.api.deleteWebhook({ drop_pending_updates: true });

    const me = await bot.api.getMe();
    // eslint-disable-next-line no-console
    console.log(`🤖 Telegram Bot aktif via Long Polling: @${me.username} (${me.first_name})`);
    // eslint-disable-next-line no-console
    console.log('⚡ Siap menerima pesan dari Telegram...');

    await bot.start({
      onStart: (info) => {
        // eslint-disable-next-line no-console
        console.log(`Bot @${info.username} siap melayani pengguna.`);
      },
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('❌ Gagal menjalankan Telegram Bot polling:', err);
    process.exit(1);
  }
}

void startPolling();

