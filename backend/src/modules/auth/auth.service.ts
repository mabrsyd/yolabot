import crypto from 'node:crypto';
import { prisma } from '../../shared/database/prisma.js';
import { AppError } from '../../shared/errors/app-error.js';
import { redis } from '../../shared/redis/redis.js';
import {
  hashPassword,
  hashToken,
  verifyPassword,
} from '../../shared/utils/crypto.js';
import { LoginDTO, RegisterDTO } from './auth.schema.js';

export class AuthService {
  /**
   * Mendaftarkan pengguna baru dengan email dan kata sandi (US-G01, FR-001)
   */
  async register(dto: RegisterDTO): Promise<{ userId?: string; message: string }> {
    const existingUser = await prisma.user.findFirst({
      where: {
        email: dto.email,
        deleted_at: null,
      },
    });

    // Mencegah user enumeration attack: tampilkan pesan netral jika email sudah terdaftar
    if (existingUser) {
      return {
        message: 'Jika email Anda valid, instruksi verifikasi akun telah dikirim ke email Anda.',
      };
    }

    const passwordHash = await hashPassword(dto.password);

    const newUser = await prisma.user.create({
      data: {
        email: dto.email,
        password_hash: passwordHash,
        display_name: dto.display_name,
        role: 'user',
        status: 'unverified',
        identities: {
          create: {
            provider: 'web',
            external_id: dto.email,
            metadata: {},
          },
        },
      },
    });

    // Generate token verifikasi email (valid 24 jam)
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashToken(verificationToken);

    // Simpan token hash di Redis dengan TTL 24 jam (86400 detik)
    try {
      await redis.set(`verify_email:${tokenHash}`, newUser.id, 'EX', 86400);
    } catch {
      // Jika redis belum aktif di dev, proses pembuatan user tetap berhasil
    }

    return {
      userId: newUser.id,
      message: 'Registrasi berhasil. Silakan verifikasi email Anda untuk mengaktifkan akun.',
    };
  }

  /**
   * Verifikasi token email aktivasi akun (AUTH-005)
   */
  async verifyEmail(rawToken: string): Promise<{ success: boolean; message: string }> {
    const tokenHash = hashToken(rawToken);
    const userId = await redis.get(`verify_email:${tokenHash}`);

    if (!userId) {
      throw new AppError(
        400,
        'INVALID_OR_EXPIRED_TOKEN',
        'Tautan verifikasi tidak valid atau telah kedaluwarsa. Silakan minta tautan baru.',
      );
    }

    await prisma.user.update({
      where: { id: userId },
      data: { status: 'active' },
    });

    // Hapus token setelah digunakan
    await redis.del(`verify_email:${tokenHash}`);

    return {
      success: true,
      message: 'Email berhasil diverifikasi. Akun Anda telah aktif, silakan masuk.',
    };
  }

  /**
   * Autentikasi masuk pengguna dan menerbitkan ID sesi aman (US-G02, FR-002)
   */
  async login(
    dto: LoginDTO,
    ipAddress?: string,
  ): Promise<{
    sessionId: string;
    user: { id: string; email: string | null; display_name: string; role: string };
  }> {
    // 1. Cek proteksi brute force di Redis (maks 5 percobaan gagal per IP/email)
    const rateLimitKey = `login_attempts:${dto.email}`;
    let attempts = 0;
    try {
      const current = await redis.get(rateLimitKey);
      attempts = current ? parseInt(current, 10) : 0;
    } catch {
      // fallback jika redis unavailable
    }

    if (attempts >= 5) {
      throw new AppError(
        429,
        'LOGIN_BRUTE_FORCE_LOCKED',
        'Terlalu banyak percobaan masuk yang gagal. Akun Anda terkunci sementara selama 15 menit.',
      );
    }

    // 2. Query user dari PostgreSQL
    const user = await prisma.user.findFirst({
      where: {
        email: dto.email,
        deleted_at: null,
      },
    });

    if (!user || !user.password_hash) {
      await this.recordFailedAttempt(rateLimitKey);
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Email atau kata sandi tidak valid.');
    }

    // 3. Verifikasi kata sandi dengan Argon2id
    const isPasswordValid = await verifyPassword(dto.password, user.password_hash);
    if (!isPasswordValid) {
      await this.recordFailedAttempt(rateLimitKey);
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Email atau kata sandi tidak valid.');
    }

    // 4. Periksa status akun
    if (user.status === 'suspended') {
      throw new AppError(
        403,
        'ACCOUNT_SUSPENDED',
        'Akun Anda telah dinonaktifkan karena melanggar ketentuan layanan.',
      );
    }

    // Reset percobaan login yang gagal jika sukses
    try {
      await redis.del(rateLimitKey);
    } catch {
      // ignore
    }

    // 5. Buat Sesi Baru di Redis (TTL 7 hari)
    const sessionId = crypto.randomBytes(32).toString('hex');
    const sessionData = {
      user_id: user.id,
      role: user.role,
      email: user.email,
      created_at: new Date().toISOString(),
      ip_address: ipAddress ?? 'unknown',
    };

    try {
      await redis.set(`session:${sessionId}`, JSON.stringify(sessionData), 'EX', 7 * 86400);
    } catch {
      // ignore
    }

    return {
      sessionId,
      user: {
        id: user.id,
        email: user.email,
        display_name: user.display_name,
        role: user.role,
      },
    };
  }

  /**
   * Menghapus sesi aktif dari Redis (Logout)
   */
  async logout(sessionId: string): Promise<void> {
    try {
      await redis.del(`session:${sessionId}`);
    } catch {
      // ignore
    }
  }

  private async recordFailedAttempt(key: string): Promise<void> {
    try {
      await redis.incr(key);
      await redis.expire(key, 900); // 15 menit
    } catch {
      // ignore
    }
  }
}

