import { z } from 'zod';

export const registerSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Format alamat email tidak valid'),
  password: z
    .string()
    .min(8, 'Kata sandi minimal 8 karakter')
    .regex(/[A-Za-z]/, 'Kata sandi wajib memuat minimal 1 huruf')
    .regex(/[0-9]/, 'Kata sandi wajib memuat minimal 1 angka'),
  display_name: z
    .string()
    .trim()
    .min(2, 'Nama tampilan minimal 2 karakter')
    .max(100, 'Nama tampilan maksimal 100 karakter')
    .default('Pengguna'),
});

export type RegisterDTO = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Format alamat email tidak valid'),
  password: z.string().min(1, 'Kata sandi wajib diisi'),
});

export type LoginDTO = z.infer<typeof loginSchema>;

export const verifyEmailSchema = z.object({
  token: z.string().trim().min(1, 'Token verifikasi wajib disertakan'),
});

export type VerifyEmailDTO = z.infer<typeof verifyEmailSchema>;

