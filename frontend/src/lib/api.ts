export interface ApiUser {
  id: string;
  email: string | null;
  display_name: string;
  role: string;
}

export interface ConversationItem {
  id: string;
  title: string;
  source_platform: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  status?: 'complete' | 'incomplete' | 'failed';
  model?: string;
  created_at?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

const BASE_URL = '';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers ?? {});
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include', // Kirim cookie session_id otomatis
  });

  const data = (await response.json()) as ApiResponse<T>;

  if (!response.ok || !data.success) {
    const errorMsg = data.error?.message || `Terjadi kesalahan (HTTP ${response.status})`;
    const error = new Error(errorMsg);
    (error as unknown as { code?: string }).code = data.error?.code;
    throw error;
  }

  return data.data;
}

export const api = {
  // Auth
  register: (body: { email: string; password: string; display_name: string }) =>
    request<{ user_id: string; email: string; message: string }>('/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  login: (body: { email: string; password: string }) =>
    request<{ user: ApiUser }>('/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  verifyEmail: (token: string) =>
    request<{ message: string }>('/v1/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token }),
    }),

  logout: () =>
    request<{ message: string }>('/v1/auth/logout', {
      method: 'POST',
    }),

  // Conversations
  listConversations: (limit = 30, cursor?: string) => {
    const params = new URLSearchParams({ limit: String(limit) });
    if (cursor) params.set('cursor', cursor);
    return request<{
      items: ConversationItem[];
      pagination: { has_more: boolean; next_cursor: string | null };
    }>(`/v1/conversations?${params.toString()}`);
  },

  createConversation: (title?: string) =>
    request<{ id: string; title: string; created_at: string }>('/v1/conversations', {
      method: 'POST',
      body: JSON.stringify({ title, source_platform: 'web' }),
    }),

  getConversation: (id: string) => request<ConversationItem>(`/v1/conversations/${id}`),

  updateConversation: (id: string, title: string) =>
    request<{ id: string; title: string }>(`/v1/conversations/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ title }),
    }),

  deleteConversation: (id: string) =>
    request<{ message: string }>(`/v1/conversations/${id}`, {
      method: 'DELETE',
    }),

  getMessages: (conversationId: string) =>
    request<{ conversation_id: string; title: string; messages: ChatMessage[] }>(
      `/v1/conversations/${conversationId}/messages`,
    ),

  stopGeneration: (conversationId: string) =>
    request<{ message: string }>(`/v1/conversations/${conversationId}/stop`, {
      method: 'POST',
    }),

  search: (query: string) =>
    request<{
      results: Array<{
        conversation_id: string;
        title: string;
        matched_snippet: string;
        updated_at: string;
      }>;
    }>(`/v1/search?q=${encodeURIComponent(query)}`),
};

