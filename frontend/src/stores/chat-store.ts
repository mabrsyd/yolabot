import { create } from 'zustand';
import { api, ChatMessage, ConversationItem } from '../lib/api';

interface ChatState {
  conversations: ConversationItem[];
  activeConversationId: string | null;
  messages: ChatMessage[];
  isLoadingList: boolean;
  isLoadingMessages: boolean;
  isStreaming: boolean;
  streamingMessageId: string | null;
  error: string | null;

  // Actions
  fetchConversations: () => Promise<void>;
  selectConversation: (id: string) => Promise<void>;
  startNewConversation: () => void;
  updateConversationTitle: (id: string, newTitle: string) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  stopGeneration: () => Promise<void>;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  activeConversationId: null,
  messages: [],
  isLoadingList: false,
  isLoadingMessages: false,
  isStreaming: false,
  streamingMessageId: null,
  error: null,

  fetchConversations: async () => {
    set({ isLoadingList: true });
    try {
      const data = await api.listConversations();
      set({ conversations: data.items, isLoadingList: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Gagal memuat daftar obrolan',
        isLoadingList: false,
      });
    }
  },

  selectConversation: async (id: string) => {
    if (get().activeConversationId === id) return;

    set({ activeConversationId: id, isLoadingMessages: true, error: null });
    try {
      const data = await api.getMessages(id);
      set({ messages: data.messages, isLoadingMessages: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Gagal memuat pesan',
        isLoadingMessages: false,
      });
    }
  },

  startNewConversation: () => {
    set({
      activeConversationId: null,
      messages: [],
      error: null,
      isStreaming: false,
      streamingMessageId: null,
    });
  },

  updateConversationTitle: async (id: string, newTitle: string) => {
    try {
      await api.updateConversation(id, newTitle);
      set((state) => ({
        conversations: state.conversations.map((c) =>
          c.id === id ? { ...c, title: newTitle } : c,
        ),
      }));
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Gagal mengubah judul' });
    }
  },

  deleteConversation: async (id: string) => {
    try {
      await api.deleteConversation(id);
      set((state) => {
        const nextList = state.conversations.filter((c) => c.id !== id);
        const nextActive = state.activeConversationId === id ? null : state.activeConversationId;
        return {
          conversations: nextList,
          activeConversationId: nextActive,
          messages: state.activeConversationId === id ? [] : state.messages,
        };
      });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Gagal menghapus percakapan' });
    }
  },

  sendMessage: async (content: string) => {
    const trimmed = content.trim();
    if (!trimmed || get().isStreaming) return;

    let convId = get().activeConversationId;

    // 1. Jika belum ada percakapan aktif, buat percakapan baru di backend
    if (!convId) {
      try {
        const newConv = await api.createConversation();
        convId = newConv.id;
        set((state) => ({
          activeConversationId: convId,
          conversations: [
            {
              id: newConv.id,
              title: newConv.title,
              source_platform: 'web',
              created_at: newConv.created_at,
              updated_at: newConv.created_at,
            },
            ...state.conversations,
          ],
        }));
      } catch (err) {
        set({
          error: err instanceof Error ? err.message : 'Gagal memulai percakapan baru',
        });
        return;
      }
    }

    // 2. Tambahkan pesan user secara optimistik
    const tempUserMsgId = `temp-user-${Date.now()}`;
    const userMsg: ChatMessage = {
      id: tempUserMsgId,
      role: 'user',
      content: trimmed,
      created_at: new Date().toISOString(),
    };

    set((state) => ({
      messages: [...state.messages, userMsg],
      isStreaming: true,
      error: null,
    }));

    // 3. Mulai request SSE ke backend
    try {
      const response = await fetch(`/v1/conversations/${convId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        credentials: 'include',
        body: JSON.stringify({ content: trimmed }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      if (!response.body) {
        throw new Error('Response body tidak mendukung streaming.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let currentEvent = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (trimmedLine.startsWith('event:')) {
            currentEvent = trimmedLine.replace('event:', '').trim();
          } else if (trimmedLine.startsWith('data:')) {
            const dataStr = trimmedLine.replace('data:', '').trim();
            if (!dataStr) continue;

            try {
              const parsed = JSON.parse(dataStr) as Record<string, unknown>;

              if (currentEvent === 'session') {
                const messageId = String(parsed['message_id']);
                set((state) => ({
                  streamingMessageId: messageId,
                  messages: [
                    ...state.messages,
                    {
                      id: messageId,
                      role: 'assistant',
                      content: '',
                      status: 'incomplete',
                    },
                  ],
                }));
              } else if (currentEvent === 'token') {
                const delta = String(parsed['delta'] ?? '');
                set((state) => {
                  const activeId = state.streamingMessageId;
                  if (!activeId) return state;

                  return {
                    messages: state.messages.map((m) =>
                      m.id === activeId ? { ...m, content: m.content + delta } : m,
                    ),
                  };
                });
              } else if (currentEvent === 'done') {
                set((state) => {
                  const activeId = state.streamingMessageId;
                  return {
                    isStreaming: false,
                    streamingMessageId: null,
                    messages: state.messages.map((m) =>
                      m.id === activeId ? { ...m, status: 'complete' } : m,
                    ),
                  };
                });
                // Segarkan daftar percakapan untuk mengambil judul otomatis terbaru
                void get().fetchConversations();
              } else if (currentEvent === 'error') {
                set({
                  isStreaming: false,
                  streamingMessageId: null,
                  error: String(parsed['message'] ?? 'Terjadi kesalahan pada respon AI'),
                });
              }
            } catch {
              // Abaikan baris data SSE yang tidak valid
            }
          }
        }
      }
    } catch (err) {
      set({
        isStreaming: false,
        streamingMessageId: null,
        error: err instanceof Error ? err.message : 'Koneksi terputus saat streaming pesan.',
      });
    }
  },

  stopGeneration: async () => {
    const convId = get().activeConversationId;
    if (!convId || !get().isStreaming) return;

    try {
      await api.stopGeneration(convId);
    } catch {
      // Abaikan jika sudah terhenti
    } finally {
      set((state) => ({
        isStreaming: false,
        streamingMessageId: null,
        messages: state.messages.map((m) =>
          m.id === state.streamingMessageId ? { ...m, status: 'incomplete' } : m,
        ),
      }));
    }
  },
}));
