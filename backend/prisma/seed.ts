import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // eslint-disable-next-line no-console
  console.log('🌱 Melakukan seeding data awal YolaBot...');

  const defaultPrompt =
    'Kamu adalah YolaBot, asisten kecerdasan buatan serba guna (general-purpose AI assistant) yang cerdas, ramah, solutif, dan profesional. Bantu pengguna menyelesaikan tugas mereka dengan penjelasan yang terstruktur, akurat, dan mudah dipahami. Gunakan format Markdown (seperti daftar poin, cetak tebal, atau blok kode) untuk memperjelas jawaban.';

  const existingPrompt = await prisma.promptVersion.findFirst({
    where: { name: 'main_system', version: 1 },
  });

  if (!existingPrompt) {
    await prisma.promptVersion.create({
      data: {
        name: 'main_system',
        content: defaultPrompt,
        version: 1,
        is_active: true,
      },
    });
    // eslint-disable-next-line no-console
    console.log('✅ Default System Prompt (v1) berhasil ditambahkan.');
  } else {
    // eslint-disable-next-line no-console
    console.log('ℹ️ System Prompt sudah tersedia di database.');
  }

  // eslint-disable-next-line no-console
  console.log('🎉 Seeding database selesai!');
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error('❌ Gagal menjalankan seed:', e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });

