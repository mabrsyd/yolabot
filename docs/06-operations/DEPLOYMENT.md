# Deployment & Infrastructure Guide: Multi-Platform General-Purpose AI Assistant

**Versi Dokumen:** 1.0  
**Tanggal:** 7 November 2026  
**Status:** Approved Operations Baseline  
**Target Lingkungan:** Development, Staging, Production (Docker & Cloud VPS / PaaS)  
**Referensi:** PRD Section 50 (Deployment Considerations), NFR-002, NFR-004

---

## 1. Environments & Staging Strategy

Sistem memisahkan operasional menjadi 3 lingkungan independen:
1. **Development (Lokal):**
   - Menjalankan Fastify backend dengan `tsx watch` (Hot Reload) dan Frontend Vite dev server.
   - Database PostgreSQL dan Redis berjalan melalui Docker Compose lokal.
   - Telegram Bot berjalan menggunakan mode **Long Polling** atau Webhook via tunnel HTTPS lokal (misal: Cloudflare Tunnel / ngrok).
2. **Staging (Pre-Production):**
   - Lingkungan identik dengan produksi untuk pengujian E2E, uji beban performa (*load testing*), dan validasi stakeholder.
   - Terhubung dengan domain staging ber-HTTPS (`https://staging.assistant.domain`).
3. **Production:**
   - Lingkungan rilis publik dengan isolasi jaringan ketat (Private VPC).
   - Terhubung dengan domain resmi (`https://assistant.domain`), Cloudflare Edge SSL, dan Telegram Webhook dengan secret token.

---

## 2. Infrastructure Architecture & Docker Setup

Seluruh layanan aplikasi dikemas sebagai kontainer Docker yang ringan dan terisolasi.

### 2.1 File Docker Compose Orkestrasi Produksi (`docker-compose.prod.yml`)
```yaml
version: '3.8'

services:
  reverse-proxy:
    image: nginx:alpine
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - /etc/letsencrypt:/etc/letsencrypt:ro
    depends_on:
      - backend

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    restart: always
    environment:
      - NODE_ENV=production
    env_file:
      - .env.production
    expose:
      - "3000"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_started

  postgres:
    image: postgres:15-alpine
    restart: always
    environment:
      POSTGRES_DB: assistant_db
      POSTGRES_USER: assistant_user
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U assistant_user -d assistant_db"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    restart: always
    command: ["redis-server", "--appendonly", "yes", "--requirepass", "${REDIS_PASSWORD}"]
    volumes:
      - redisdata:/data

volumes:
  pgdata:
  redisdata:
```

### 2.2 Konfigurasi NGINX Penting (SSE Streaming & Webhook)
```nginx
server {
    listen 443 ssl http2;
    server_name api.assistant.domain;

    # SSL Certificates
    ssl_certificate /etc/letsencrypt/live/assistant.domain/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/assistant.domain/privkey.pem;

    location / {
        proxy_pass http://backend:3000;
        proxy_http_version 1.1;
        
        # Pengaturan Wajib SSE Streaming (Tanpa Buffering)
        proxy_set_header Connection '';
        proxy_buffering off;
        proxy_cache off;
        chunked_transfer_encoding on;
        proxy_read_timeout 120s;

        # Standard Headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 3. Environment Variables Reference

Contoh file konfigurasi template `.env.production`:

```ini
# Application
NODE_ENV=production
PORT=3000
APP_BASE_URL=https://assistant.domain
API_BASE_URL=https://api.assistant.domain

# Database (PostgreSQL)
DATABASE_URL=postgresql://assistant_user:SecretDBPass123@postgres:5432/assistant_db?schema=public

# In-Memory Cache (Redis)
REDIS_URL=redis://:SecretRedisPass123@redis:6379/0

# Security & Sessions
SESSION_SECRET=super_secret_cryptographic_random_string_min_32_chars
ARGON2_MEMORY_COST=65536
ARGON2_TIME_COST=3

# Primary AI Model API (Adapter A)
AI_PRIMARY_PROVIDER=openai
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxx
OPENAI_DEFAULT_MODEL=gpt-4o-mini

# Secondary AI Model API (Adapter B - Fallback)
AI_FALLBACK_PROVIDER=gemini
GEMINI_API_KEY=AIzaSyxxxxxxxxxxxxxxxxxxxx
GEMINI_DEFAULT_MODEL=gemini-1.5-flash

# Telegram Bot API
TELEGRAM_BOT_TOKEN=123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ
TELEGRAM_WEBHOOK_SECRET=telegram_webhook_secret_random_64_chars

# Transactional Email (Resend / SMTP)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
EMAIL_FROM="AI Assistant <no-reply@assistant.domain>"
```

---

## 4. Build & Continuous Deployment (CI/CD) Pipeline

Pipeline GitHub Actions / GitLab CI dikonfigurasi melalui 3 langkah:
1. **Lint & Test Stage:**
   - Menjalankan `npm run lint` dan `npm test -- --coverage`.
   - Menjalankan audit kerentanan paket dependensi (`npm audit`).
2. **Build Stage:**
   - Backend: Mengompilasi TypeScript ke JavaScript bersih di folder `dist/`.
   - Frontend: Membangun aset statis SPA (`npm run build` -> `dist/`).
   - Membuat image Docker dan mem-push ke Docker Container Registry.
3. **Deployment Stage (Zero-Downtime Rolling Update):**
   - Menjalankan migrasi database: `npx prisma migrate deploy`.
   - Memperbarui container backend secara bergantian (*rolling container restart*).
   - Memvalidasi endpoint `/health` sebelum mengalihkan seluruh traffic.

---

## 5. Rollback Strategy

Jika terjadi galat pasca-deployment produksi:
1. **Rollback Aplikasi Instan:**
   - Kembalikan tag image Docker ke versi stabil sebelumnya (`docker compose pull backend:previous && docker compose up -d backend`). Waktu eksekusi ≤ 60 detik.
2. **Rollback Skema Database:**
   - Seluruh migrasi database wajib backward-compatible (metode *expand and contract*). Hindari menghapus kolom lama sebelum rilis versi berikutnya tuntas.
   - Jika migrasi gagal, jalankan script migrasi turun (*down migration*) yang telah disiapkan di folder migrasi.

