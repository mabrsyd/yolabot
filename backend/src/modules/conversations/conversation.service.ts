import { prisma } from '../../shared/database/prisma.js';
import { AppError } from '../../shared/errors/app-error.js';
import {
  CreateConversationDTO,
  ListConversationsQuery,
  UpdateConversationDTO,
} from './conversation.schema.js';

export interface ConversationItem {
  id: string;
  title: string;
  source_platform: string;
  created_at: Date;
  updated_at: Date;
}

export interface ListConversationsResponse {
  items: ConversationItem[];
  pagination: {
    has_more: boolean;
    next_cursor: string | null;
  };
}

export interface MessageItem {
  id: string;
  role: string;
  content: string;
  status: string;
  model: string | null;
  created_at: Date;
}

export interface GetMessagesResponse {
  conversation_id: string;
  title: string;
  messages: MessageItem[];
}

export interface SearchResultItem {
  conversation_id: string;
  title: string;
  matched_snippet: string;
  updated_at: Date;
}

export class ConversationService {
  private static instance: ConversationService;

  private constructor() {}

  public static getInstance(): ConversationService {
    if (!ConversationService.instance) {
      ConversationService.instance = new ConversationService();
    }
    return ConversationService.instance;
  }

  /**
   * Membuat wadah percakapan baru untuk pengguna aktif.
   */
  public async createConversation(
    userId: string,
    data: CreateConversationDTO,
  ): Promise<{ id: string; title: string; created_at: Date }> {
    const conversation = await prisma.conversation.create({
      data: {
        user_id: userId,
        title: data.title ?? 'Percakapan Baru',
        source_platform: data.source_platform,
      },
      select: {
        id: true,
        title: true,
        created_at: true,
      },
    });

    return conversation;
  }

  /**
   * Mengambil daftar percakapan milik pengguna dengan paginasi berbasis kursor.
   */
  public async listConversations(
    userId: string,
    query: ListConversationsQuery,
  ): Promise<ListConversationsResponse> {
    const limit = query.limit;
    const cursor = query.cursor;

    const items = await prisma.conversation.findMany({
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0,
      where: {
        user_id: userId,
        deleted_at: null,
      },
      orderBy: {
        updated_at: 'desc',
      },
      select: {
        id: true,
        title: true,
        source_platform: true,
        created_at: true,
        updated_at: true,
      },
    });

    const hasMore = items.length > limit;
    const resultItems = hasMore ? items.slice(0, limit) : items;
    const nextCursor = hasMore && resultItems.length > 0 ? (resultItems[resultItems.length - 1]?.id ?? null) : null;

    return {
      items: resultItems,
      pagination: {
        has_more: hasMore,
        next_cursor: nextCursor,
      },
    };
  }

  /**
   * Mengambil satu percakapan milik pengguna dengan pengecekan kepemilikan ketat.
   */
  public async getConversation(userId: string, conversationId: string): Promise<ConversationItem> {
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        user_id: userId,
        deleted_at: null,
      },
      select: {
        id: true,
        title: true,
        source_platform: true,
        created_at: true,
        updated_at: true,
      },
    });

    if (!conversation) {
      throw new AppError(404, 'CONVERSATION_NOT_FOUND', 'Percakapan tidak ditemukan.');
    }

    return conversation;
  }

  /**
   * Mengubah judul percakapan.
   */
  public async updateConversation(
    userId: string,
    conversationId: string,
    data: UpdateConversationDTO,
  ): Promise<{ id: string; title: string }> {
    // Pastikan percakapan eksis dan dimiliki pengguna
    await this.getConversation(userId, conversationId);

    const updated = await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        title: data.title,
        updated_at: new Date(),
      },
      select: {
        id: true,
        title: true,
      },
    });

    return updated;
  }

  /**
   * Menghapus percakapan menggunakan Soft-Delete (deleted_at).
   */
  public async deleteConversation(userId: string, conversationId: string): Promise<void> {
    // Pastikan percakapan eksis dan dimiliki pengguna
    await this.getConversation(userId, conversationId);

    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        deleted_at: new Date(),
      },
    });
  }

  /**
   * Mengambil riwayat pesan lengkap dari sebuah percakapan.
   */
  public async getMessages(userId: string, conversationId: string): Promise<GetMessagesResponse> {
    const conversation = await this.getConversation(userId, conversationId);

    const messages = await prisma.message.findMany({
      where: {
        conversation_id: conversationId,
      },
      orderBy: {
        created_at: 'asc',
      },
      select: {
        id: true,
        role: true,
        content: true,
        status: true,
        model: true,
        created_at: true,
      },
    });

    return {
      conversation_id: conversation.id,
      title: conversation.title,
      messages,
    };
  }

  /**
   * Mencari kata kunci pada judul percakapan dan konten pesan pengguna.
   */
  public async searchConversations(userId: string, queryText: string): Promise<SearchResultItem[]> {
    const trimmed = queryText.trim();
    if (trimmed.length < 2) {
      return [];
    }

    // Ambil percakapan yang judulnya cocok atau memiliki pesan yang cocok
    const conversations = await prisma.conversation.findMany({
      where: {
        user_id: userId,
        deleted_at: null,
        OR: [
          {
            title: {
              contains: trimmed,
              mode: 'insensitive',
            },
          },
          {
            messages: {
              some: {
                content: {
                  contains: trimmed,
                  mode: 'insensitive',
                },
              },
            },
          },
        ],
      },
      orderBy: {
        updated_at: 'desc',
      },
      take: 20,
      include: {
        messages: {
          where: {
            content: {
              contains: trimmed,
              mode: 'insensitive',
            },
          },
          take: 1,
          select: {
            content: true,
          },
        },
      },
    });

    return conversations.map((conv) => {
      let snippet = conv.title;
      const matchedMessage = conv.messages[0];
      if (matchedMessage) {
        const idx = matchedMessage.content.toLowerCase().indexOf(trimmed.toLowerCase());
        const start = Math.max(0, idx - 40);
        const end = Math.min(matchedMessage.content.length, idx + trimmed.length + 40);
        const rawSnippet = matchedMessage.content.slice(start, end).replace(/\s+/g, ' ');
        snippet = `...${rawSnippet}...`;
      }

      return {
        conversation_id: conv.id,
        title: conv.title,
        matched_snippet: snippet,
        updated_at: conv.updated_at,
      };
    });
  }
}

