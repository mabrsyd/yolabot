import { z } from 'zod';

export const updateProfileSchema = z.object({
  display_name: z.string().trim().min(1).max(100).optional(),
  preferences: z
    .object({
      theme: z.enum(['light', 'dark', 'system']).optional(),
      language: z.enum(['id', 'en']).optional(),
    })
    .optional(),
});

export type UpdateProfileDTO = z.infer<typeof updateProfileSchema>;

export const deleteAccountSchema = z.object({
  password: z.string().min(1, 'Konfirmasi kata sandi diperlukan untuk menghapus akun'),
});

export type DeleteAccountDTO = z.infer<typeof deleteAccountSchema>;

