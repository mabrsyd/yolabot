import { z } from 'zod';

// === Conversation Schemas ===

export const createConversationSchema = z.object({
  title: z.string().trim().max(150, 'Judul maksimal 150 karakter').optional(),
  source_platform: z.enum(['web', 'telegram']).default('web'),
});

export type CreateConversationDTO = z.infer<typeof createConversationSchema>;

export const updateConversationSchema = z.object({
  title: z.string().trim().min(1, 'Judul tidak boleh kosong').max(150, 'Judul maksimal 150 karakter'),
});

export type UpdateConversationDTO = z.infer<typeof updateConversationSchema>;

export const listConversationsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().uuid().optional(),
});

export type ListConversationsQuery = z.infer<typeof listConversationsQuerySchema>;

// === Message Schemas ===

export const sendMessageSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, 'Pesan tidak boleh kosong')
    .max(4000, 'Pesan maksimal 4.000 karakter'),
});

export type SendMessageDTO = z.infer<typeof sendMessageSchema>;

export const searchQuerySchema = z.object({
  q: z.string().trim().min(2, 'Kata kunci pencarian minimal 2 karakter').max(200),
});

export type SearchQuery = z.infer<typeof searchQuerySchema>;

