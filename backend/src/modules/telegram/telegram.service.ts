import { Bot, Context } from 'grammy';
import { env } from '../../config/env.js';
import { prisma } from '../../shared/database/prisma.js';
import { redis } from '../../shared/redis/redis.js';
import { AIProviderAdapter } from '../ai-providers/adapter.interface.js';
import { createAdapter } from '../ai-providers/adapter-factory.js';
import { FallbackRouter } from '../ai-providers/fallback-router.js';
import { ContextBuilder } from '../orchestrator/context-builder.js';

export class TelegramService {
  private static instance: TelegramService;
  private bot: Bot | null = null;
  private aiAdapter: AIProviderAdapter;

  private constructor() {
    const primary = createAdapter(env.AI_PRIMARY_PROVIDER);
    const secondary = createAdapter(env.AI_FALLBACK_PROVIDER);
    this.aiAdapter = new FallbackRouter(primary, secondary);

    if (env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_BOT_TOKEN.trim().length > 0) {
      this.bot = new Bot(env.TELEGRAM_BOT_TOKEN);
      this.registerHandlers();
    }
  }

  public static getInstance(): TelegramService {
    if (!TelegramService.instance) {
      TelegramService.instance = new TelegramService();
    }
    return TelegramService.instance;
  }

  public getBot(): Bot | null {
    return this.bot;
  }

  /**
   * Memeriksa idempotensi Telegram update menggunakan Redis NX (TTL 5 menit)
   */
  public async isUpdateAlreadyProcessed(updateId: number): Promise<boolean> {
    const key = `update_id:${updateId}`;
    const result = await redis.set(key, '1', 'EX', 300, 'NX');
    return result === null; // Jika null, berarti key sudah pernah diset (duplikat)
  }

  /**
   * Memecah pesan panjang menjadi beberapa potongan pesan aman (maks 4.000 karakter)
   * dengan memotong pada batas baris/paragraf agar tampilan rapi.
   */
  public static splitMessage(text: string, maxLen = 4000): string[] {
    if (text.length <= maxLen) return [text];

    const chunks: string[] = [];
    let remaining = text;

    while (remaining.length > 0) {
      if (remaining.length <= maxLen) {
        chunks.push(remaining);
        break;
      }

      // Cari pemisah paragraf terdekat sebelum batas maxLen
      let splitIndex = remaining.lastIndexOf('\n\n', maxLen);
      if (splitIndex === -1 || splitIndex < maxLen / 2) {
        // Cari pemisah baris tunggal
        splitIndex = remaining.lastIndexOf('\n', maxLen);
      }
      if (splitIndex === -1 || splitIndex < maxLen / 2) {
        // Cari pemisah spasi
        splitIndex = remaining.lastIndexOf(' ', maxLen);
      }
      if (splitIndex === -1) {
        splitIndex = maxLen;
      }

      chunks.push(remaining.slice(0, splitIndex).trim());
      remaining = remaining.slice(splitIndex).trim();
    }

    return chunks;
  }

  /**
   * Menemukan atau membuat User berdasarkan Telegram ID
   */
  private async getOrCreateTelegramUser(telegramId: string, displayName: string): Promise<string> {
    // 1. Cari identitas yang sudah tertaut
    const existingIdentity = await prisma.identity.findUnique({
      where: {
        provider_external_id_unique: {
          provider: 'telegram',
          external_id: telegramId,
        },
      },
    });

    if (existingIdentity) {
      return existingIdentity.user_id;
    }

    // 2. Buat user baru otomatis
    const newUser = await prisma.user.create({
      data: {
        display_name: displayName,
        status: 'active',
        identities: {
          create: {
            provider: 'telegram',
            external_id: telegramId,
            metadata: { display_name: displayName },
          },
        },
      },
    });

    return newUser.id;
  }

  /**
   * Mendapatkan atau membuat percakapan aktif untuk platform Telegram
   */
  private async getActiveTelegramConversation(userId: string): Promise<string> {
    const existing = await prisma.conversation.findFirst({
      where: {
        user_id: userId,
        source_platform: 'telegram',
        deleted_at: null,
      },
      orderBy: { updated_at: 'desc' },
    });

    if (existing) {
      return existing.id;
    }

    const created = await prisma.conversation.create({
      data: {
        user_id: userId,
        title: 'Telegram Chat',
        source_platform: 'telegram',
      },
    });

    return created.id;
  }

  private registerHandlers(): void {
    if (!this.bot) return;

    // 1. Handler Perintah /start
    this.bot.command('start', async (ctx: Context) => {
      const from = ctx.from;
      if (!from) return;

      const telegramId = String(from.id);
      const name = from.first_name || 'Pengguna';
      await this.getOrCreateTelegramUser(telegramId, name);

      const welcomeMessage =
        `Halo, ${name}! 👋\n\n` +
        `Selamat datang di *YolaBot*, asisten kecerdasan buatan serba guna Anda.\n\n` +
        `Kirimkan pertanyaan atau topik apa pun langsung ke sini. Saya siap membantu!\n\n` +
        `*Daftar Perintah:* \n` +
        `/new - Mulai topik percakapan baru\n` +
        `/usage - Cek pemakaian kuota token harian\n` +
        `/link <kode> - Tautkan akun Telegram ini dengan akun Web Anda\n` +
        `/help - Panduan bantuan`;

      await ctx.reply(welcomeMessage, { parse_mode: 'Markdown' });
    });

    // 2. Handler Perintah /help
    this.bot.command('help', async (ctx: Context) => {
      const helpText =
        `🤖 *Panduan Penggunaan YolaBot*\n\n` +
        `• Cukup ketikkan pesan Anda untuk mengobrol dengan asisten AI.\n` +
        `• Gunakan /new jika ingin berpindah topik tanpa membawa riwayat sebelumnya.\n` +
        `• Gunakan /usage untuk memantau agregat konsumsi token Anda.\n` +
        `• Gunakan /link <KODE> untuk sinkronisasi riwayat obrolan dengan aplikasi Web YolaBot.\n\n` +
        `*Catatan:* Pada versi MVP saat ini, YolaBot hanya memproses pesan teks.`;

      await ctx.reply(helpText, { parse_mode: 'Markdown' });
    });

    // 3. Handler Perintah /new (Reset Konteks Percakapan)
    this.bot.command('new', async (ctx: Context) => {
      const from = ctx.from;
      if (!from) return;

      const userId = await this.getOrCreateTelegramUser(String(from.id), from.first_name);

      // Buat percakapan baru segar
      await prisma.conversation.create({
        data: {
          user_id: userId,
          title: 'Telegram Chat Baru',
          source_platform: 'telegram',
        },
      });

      await ctx.reply(
        '🔄 *Konteks percakapan telah direset!*\nSilakan ajukan pertanyaan atau topik baru Anda.',
        { parse_mode: 'Markdown' },
      );
    });

    // 4. Handler Perintah /usage (Cek Kuota Harian)
    this.bot.command('usage', async (ctx: Context) => {
      const from = ctx.from;
      if (!from) return;

      const userId = await this.getOrCreateTelegramUser(String(from.id), from.first_name);

      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);

      const usage = await prisma.usageRecord.findUnique({
        where: {
          usage_user_period_unique: {
            user_id: userId,
            period_date: today,
          },
        },
      });

      const totalTokens = usage?.total_tokens ?? 0;
      const totalRequests = usage?.total_requests ?? 0;

      const usageMessage =
        `📊 *Statistik Pemakaian Hari Ini*\n\n` +
        `• Total Permintaan: *${totalRequests}* kali\n` +
        `• Total Token: *${totalTokens.toLocaleString('id-ID')}* token\n\n` +
        `Kuota harian Anda disegarkan setiap pukul 00:00 UTC.`;

      await ctx.reply(usageMessage, { parse_mode: 'Markdown' });
    });

    // 5. Handler Perintah /link <KODE> (Penautan Akun Web)
    this.bot.command('link', async (ctx: Context) => {
      const from = ctx.from;
      if (!from) return;

      const text = ctx.message?.text ?? '';
      const parts = text.trim().split(/\s+/);
      const code = parts[1]?.toUpperCase();

      if (!code || code.length !== 6) {
        await ctx.reply(
          '❌ Format salah. Gunakan perintah: `/link <KODE>`\n\nContoh: `/link 7X9K2P`\nKode 6-karakter dapat diperoleh dari menu Pengaturan Web YolaBot.',
          { parse_mode: 'Markdown' },
        );
        return;
      }

      // Periksa kode di Redis
      const redisKey = `telegram_link:${code}`;
      const webUserId = await redis.get(redisKey);

      if (!webUserId) {
        await ctx.reply(
          '⚠️ Kode penautan tidak valid atau sudah kadaluarsa (berlaku 10 menit). Silakan buat kode baru di Web.',
        );
        return;
      }

      const telegramId = String(from.id);

      try {
        // Tautkan Telegram ID ke akun webUser
        await prisma.identity.upsert({
          where: {
            provider_external_id_unique: {
              provider: 'telegram',
              external_id: telegramId,
            },
          },
          update: {
            user_id: webUserId,
          },
          create: {
            user_id: webUserId,
            provider: 'telegram',
            external_id: telegramId,
            metadata: { display_name: from.first_name },
          },
        });

        // Hapus kode sekali pakai dari Redis
        await redis.del(redisKey);

        await ctx.reply(
          '✅ *Akun berhasil ditautkan!*\n\nSekarang riwayat obrolan dan kuota Anda terintegrasi penuh antara Telegram dan Web.',
          { parse_mode: 'Markdown' },
        );
      } catch {
        await ctx.reply('❌ Terjadi kesalahan saat menautkan akun. Silakan coba kembali.');
      }
    });

    // 6. Handler Penolakan Ramah Pesan Non-Teks (FR-021)
    this.bot.on(
      [':photo', ':voice', ':audio', ':document', ':sticker', ':video'],
      async (ctx: Context) => {
        await ctx.reply(
          '💡 *Pemberitahuan:*\n\n' +
            'Saat ini YolaBot versi MVP hanya mendukung pesan dalam bentuk teks. ' +
            'Dukungan gambar, suara, dan dokumen akan hadir pada pembaruan mendatang.\n\n' +
            'Silakan ketikkan pertanyaan Anda dalam bentuk teks!',
          { parse_mode: 'Markdown' },
        );
      },
    );

    // 7. Handler Pesan Teks Utama (AI Generation)
    this.bot.on('message:text', async (ctx: Context) => {
      const from = ctx.from;
      const userText = ctx.message?.text?.trim();
      if (!from || !userText) return;

      const telegramId = String(from.id);
      const userId = await this.getOrCreateTelegramUser(telegramId, from.first_name);
      const conversationId = await this.getActiveTelegramConversation(userId);

      // Kirim typing action
      await ctx.replyWithChatAction('typing');

      try {
        // Simpan user message ke DB
        const userTokens = this.aiAdapter.countTokens(userText);
        const userMsg = await prisma.message.create({
          data: {
            conversation_id: conversationId,
            role: 'user',
            content: userText,
            status: 'complete',
            token_in: userTokens,
            token_out: 0,
          },
        });

        // Ambil riwayat
        const history = await prisma.message.findMany({
          where: {
            conversation_id: conversationId,
            id: { not: userMsg.id },
            status: 'complete',
          },
          orderBy: { created_at: 'asc' },
          take: 30,
          select: { role: true, content: true },
        });

        // Bangun konteks dengan sliding window
        const context = ContextBuilder.buildContext({
          historyMessages: history,
          currentUserInput: userText,
          adapter: this.aiAdapter,
        });

        // Generate teks lengkap (non-streaming untuk Telegram sesuai TDR-03)
        const result = await this.aiAdapter.generate({
          systemPrompt: context.systemPrompt,
          messages: context.messages,
        });

        // Simpan balasan asisten ke DB
        await prisma.message.create({
          data: {
            conversation_id: conversationId,
            role: 'assistant',
            content: result.text,
            status: 'complete',
            model: result.model,
            token_in: result.tokenIn,
            token_out: result.tokenOut,
          },
        });

        // Perbarui updated_at percakapan
        await prisma.conversation.update({
          where: { id: conversationId },
          data: { updated_at: new Date() },
        });

        // Catat kuota penggunaan
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);
        await prisma.usageRecord.upsert({
          where: {
            usage_user_period_unique: {
              user_id: userId,
              period_date: today,
            },
          },
          update: {
            total_tokens: { increment: result.tokenIn + result.tokenOut },
            total_requests: { increment: 1 },
          },
          create: {
            user_id: userId,
            period_date: today,
            total_tokens: result.tokenIn + result.tokenOut,
            total_requests: 1,
          },
        });

        // Pecah pesan jika > 4.000 karakter
        const chunks = TelegramService.splitMessage(result.text, 4000);
        for (const chunk of chunks) {
          try {
            await ctx.reply(chunk, { parse_mode: 'Markdown' });
          } catch {
            // Jika parsing Markdown gagal (karena sintaks tidak tertutup), fallback ke teks biasa
            await ctx.reply(chunk);
          }
        }
      } catch (err) {
        await ctx.reply(
          '⚠️ Maaf, terjadi kendala saat memproses respons AI. Silakan coba kembali dalam beberapa saat.',
        );
      }
    });
  }
}

