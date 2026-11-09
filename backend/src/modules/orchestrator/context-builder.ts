import { AIProviderAdapter, GenerationMessage } from '../ai-providers/adapter.interface.js';

export interface RawChatMessage {
  role: string;
  content: string;
  created_at?: Date;
}

export interface BuildContextParams {
  systemPrompt?: string;
  historyMessages: RawChatMessage[];
  currentUserInput: string;
  adapter: AIProviderAdapter;
  modelContextLimit?: number;
  maxOutputTokens?: number;
}

export interface ContextBuildResult {
  systemPrompt: string;
  messages: GenerationMessage[];
  estimatedTokens: number;
}

export const DEFAULT_SYSTEM_PROMPT =
  'Kamu adalah YolaBot, asisten kecerdasan buatan serba guna (general-purpose AI assistant) yang cerdas, ramah, solutif, dan profesional. Bantu pengguna menyelesaikan tugas mereka dengan penjelasan yang terstruktur, akurat, dan mudah dipahami. Gunakan format Markdown (seperti daftar poin, cetak tebal, atau blok kode) untuk memperjelas jawaban.';

export class ContextBuilder {
  private static readonly DEFAULT_CONTEXT_LIMIT = 16384;
  private static readonly DEFAULT_OUTPUT_RESERVATION = 2048;

  /**
   * Merakit konteks percakapan dengan algoritma sliding-window berbasis anggaran token.
   * Aturan:
   * 1. System Prompt bersifat absolut & tidak boleh terpotong (never evicted).
   * 2. Pesan pengguna saat ini (current input) selalu disertakan dan dibungkus tag isolasi <user_input>.
   * 3. Riwayat pesan terdahulu dipilih secara terbalik (dari terbaru ke terlama) hingga batas anggaran token tercapai.
   */
  public static buildContext(params: BuildContextParams): ContextBuildResult {
    const {
      systemPrompt = DEFAULT_SYSTEM_PROMPT,
      historyMessages,
      currentUserInput,
      adapter,
      modelContextLimit = ContextBuilder.DEFAULT_CONTEXT_LIMIT,
      maxOutputTokens = ContextBuilder.DEFAULT_OUTPUT_RESERVATION,
    } = params;

    // 1. Hitung token system prompt & input pengguna saat ini
    const sysTokens = adapter.countTokens(systemPrompt) + 4;
    const sanitizedInput = `<user_input>\n${currentUserInput.trim()}\n</user_input>`;
    const userTokens = adapter.countTokens(sanitizedInput) + 4;

    // 2. Tentukan sisa anggaran token untuk riwayat pesan sebelumnya
    const remainingBudget = modelContextLimit - maxOutputTokens - sysTokens - userTokens;

    let usedHistoryTokens = 0;
    const selectedHistory: GenerationMessage[] = [];

    // 3. Iterasi riwayat dari pesan terbaru ke pesan terlama (reverse-chronological)
    const reversed = [...historyMessages].reverse();

    for (const msg of reversed) {
      if (msg.role !== 'user' && msg.role !== 'assistant' && msg.role !== 'system') {
        continue;
      }

      const msgTokens = adapter.countTokens(msg.content) + 4;
      if (usedHistoryTokens + msgTokens > remainingBudget) {
        // Anggaran habis, hentikan penambahan riwayat masa lalu
        break;
      }

      usedHistoryTokens += msgTokens;
      selectedHistory.push({
        role: msg.role,
        content: msg.content,
      });
    }

    // Kembalikan urutan riwayat ke urutan kronologis asli (lama -> baru)
    selectedHistory.reverse();

    // 4. Tambahkan pesan terkini pengguna di akhir
    const finalMessages: GenerationMessage[] = [
      ...selectedHistory,
      {
        role: 'user',
        content: sanitizedInput,
      },
    ];

    const totalEstimatedTokens = sysTokens + usedHistoryTokens + userTokens;

    return {
      systemPrompt,
      messages: finalMessages,
      estimatedTokens: totalEstimatedTokens,
    };
  }
}

