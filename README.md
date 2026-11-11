# YolaBot 🤖
### Multi-Platform General-Purpose AI Assistant (Web Application & Telegram Bot)

[![Node.js](https://img.shields.io/badge/Node.js-v20+-green.svg?style=for-the-badge&logo=node.js)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-blue.svg?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Fastify](https://img.shields.io/badge/Fastify-v4+-black.svg?style=for-the-badge&logo=fastify)](https://fastify.dev/)
[![React](https://img.shields.io/badge/React-18+-61DAFB.svg?style=for-the-badge&logo=react)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC.svg?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791.svg?style=for-the-badge&logo=postgresql)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D.svg?style=for-the-badge&logo=redis)](https://redis.io/)
[![grammY](https://img.shields.io/badge/grammY-Telegram-2CA5E0.svg?style=for-the-badge&logo=telegram)](https://grammy.dev/)
[![Groq](https://img.shields.io/badge/Groq-LPU_Inference-F05A28.svg?style=for-the-badge)](https://groq.com/)

---

## 📌 1. Judul & Deskripsi Singkat

**YolaBot** adalah asisten kecerdasan buatan serba guna (*general-purpose AI assistant*) siap produksi yang dapat diakses secara simultan melalui dua antarmuka: **Web Application (SPA)** dan **Bot Telegram**.

### Masalah yang Diselesaikan:
1. **Keterikatan Vendor (Vendor Lock-in):** Sebagian besar sistem AI terikat kuat pada satu penyedia LLM. YolaBot mengimplementasikan **Model Abstraction Layer** yang netral vendor, memungkinkan penggantian instan antara Groq LPU, Google Gemini, OpenAI, maupun Mock Adapter melalui konfigurasi lingkungan tanpa merombak kode.
2. **Duplikasi Logika (Code Duplication):** Aplikasi Web dan Bot Telegram sering kali dibuat terpisah dengan aturan bisnis ganda. YolaBot mengadopsi arsitektur **Shared Backend (Modular Monolith)**, memastikan *context builder*, aturan bisnis, manajemen token, dan riwayat percakapan berjalan dari satu sumber kebenaran (*single source of truth*).
3. **Ketahanan Layanan Rendah:** Mengimplementasikan pola **Circuit Breaker & Fallback Router**; bila penyedia AI utama mengalami *rate limit* (HTTP 429) atau *downtime* (HTTP 5xx), beban inferensi otomatis dialihkan ke penyedia cadangan secara transparan.
4. **Keamanan & Isolasi Data:** Menegakkan isolasi data multi-tenant ketat (*zero-trust*) berbasis `user_id`, pertahanan *prompt injection* dengan pembatas `<user_input>`, serta perlindungan privasi obrolan pada log aplikasi.

### Sasaran Pengguna:
Pengembang perangkat lunak, tim operasional, maupun organisasi yang membutuhkan solusi asisten AI modular, berkecepatan tinggi, hemat biaya, dan mudah di-deploy di infrastruktur mandiri.

---

## ✨ 2. Fitur Utama

### 🌐 Aplikasi Web (React SPA)
- **Streaming Real-Time (SSE):** Pengiriman respons AI berbasis token instan menggunakan protokol *Server-Sent Events*.
- **Rich Markdown & Code Highlighting:** Format Markdown lengkap (tabel, list, blockquote) dan penyorotan kode dengan tombol salin satu-klik.
- **Kontrol Inferensi:** Dukungan penghentian generasi (*Stop Generation*) via `AbortController`, *Regenerate Response*, serta pengeditan prompt sebelumnya.
- **Manajemen Sesi Obrolan:** Riwayat obrolan di sidebar, pembuatan sesi baru, penghapusan lunak (*soft delete*), dan penamaan judul otomatis berbasis AI.
- **Desain Ergonomis & Responsif:** Tata letak fleksibel untuk Mobile, Tablet, dan Desktop dengan mode Gelap/Terang (*Dark/Light Mode*).
- **Autentikasi Aman:** Pendaftaran & login berbasis email/password dengan enkripsi Argon2id dan cookie sesi `HttpOnly SameSite=Strict`.

### 📱 Bot Telegram (grammY)
- **Auto-Provisioning Pengguna:** Pembuatan identitas otomatis saat pengguna menekan tombol `/start`.
- **Percakapan Kontekstual Multi-Turn:** Bot mengingat riwayat obrolan sebelumnya dengan batasan sliding window token yang cerdas.
- **Indikator Mengetik (*Typing Action*):** Status pengetikan aktif secara periodik selama proses inferensi berlangsung.
- **Perintah Terpadu:**
  - `/start` — Sambutan awal dan pendaftaran akun otomatis.
  - `/help` — Panduan penggunaan dan daftar perintah.
  - `/new` — Memulai sesi obrolan baru (reset riwayat obrolan aktif).
  - `/usage` — Informasi penggunaan token dan kuota harian.
  - `/link <KODE>` — Menautkan akun Telegram dengan akun Web.
- **Penolakan Pesan Non-Teks:** Edukasi ramah pengguna jika mengirim stiker, gambar, dokumen, atau audio pada fase MVP.

### 🔗 Penautan Akun (Account Linking)
- **Sinkronisasi Web & Telegram:** Menghubungkan akun Telegram dengan akun Web menggunakan kode OTP 6-karakter alfanumerik (masa berlaku 10 menit di Redis). Riwayat obrolan dan kuota token langsung tersinkronisasi.

### 🛡️ Keamanan & Tata Kelola AI
- **Isolasi Multi-Tenant:** Setiap kueri obrolan dan pesan terikat klausul `WHERE user_id = :id AND deleted_at IS NULL`.
- **Pertahanan Prompt Injection:** Input dibatasi maksimal 4.000 karakter dan dibungkus tag pembatas `<user_input>`.
- **Kerahasiaan Obrolan:** Log aplikasi (Pino) dilarang mencatat konten percakapan pengguna demi kepatuhan privasi.
- **Rate Limiting & Kuota:** Pembatasan frekuensi permintaan (60 req/menit via Redis) dan pencatatan akumulasi token harian.

---

## 🛠️ 3. Tech Stack

| Lapisan / Komponen | Teknologi | Keterangan & Versi |
| :--- | :--- | :--- |
| **Backend Runtime** | **Node.js** | LTS v20.x atau lebih baru (ES Modules) |
| **Backend Framework** | **Fastify** | v4.28+ (TypeScript Strict Mode) |
| **Frontend Framework** | **React** | v18.3+ dengan **Vite** v5 |
| **Styling & Icons** | **Tailwind CSS** + **Lucide React** | Antarmuka adaptif dengan token warna Zinc |
| **State Management** | **Zustand** + **TanStack Query** | Pengelolaan state sesi, tema, dan caching API |
| **Telegram Bot** | **grammY** | v1.23+ Framework bot Telegram modern |
| **Database Utama** | **PostgreSQL** | v15+ (Direkomendasikan v16 via Docker) |
| **ORM & Migrasi** | **Prisma ORM** | v5.14+ Pemetaan relasional type-safe deklaratif |
| **Cache & Sesi** | **Redis** (`ioredis`) | v7+ In-memory store untuk sesi, rate-limiting, & OTP |
| **Kriptografi & Hashing**| **Argon2id** (`@node-rs/argon2`) | Standar keamanan industri untuk penyimpanan kata sandi |
| **Validasi Skema** | **Zod** | Validasi variabel lingkungan dan payload request |
| **AI Providers** | **Groq LPU**, **Google Gemini**, **OpenAI** | Multi-adapter dengan fallback otomatis |

---

## 📋 4. Prasyarat / Persiapan

Sebelum menjalankan aplikasi, pastikan perangkat Anda telah memenuhi prasyarat berikut:

### Software Minimum:
- **Node.js:** `>= 20.14.0` (Gunakan LTS terbaru)
- **npm:** `>= 10.0.0`
- **Docker & Docker Compose:** Docker Engine `>= 24.x` (opsional jika PostgreSQL dan Redis sudah terpasang lokal)
- **Git:** `>= 2.40.0`

### Akun & Kunci API yang Dibutuhkan:
1. **Penyedia AI (Pilih salah satu atau lebih):**
   - **Groq API Key (Direkomendasikan - Sangat Cepat & Tersedia Gratis):** Dapatkan dari [Groq Console](https://console.groq.com/keys).
   - **Google Gemini API Key:** Dapatkan dari [Google AI Studio](https://aistudio.google.com/api_keys).
   - **OpenAI API Key:** Dapatkan dari [OpenAI Platform](https://platform.openai.com/api-keys).
2. **Telegram Bot Token (Opsional, untuk fitur Telegram):**
   - Buat bot baru melalui [@BotFather](https://t.me/BotFather) di Telegram untuk mendapatkan bot token.

### Sistem Operasi yang Didukung:
- Windows 10/11 (PowerShell, CMD, atau WSL2)
- Linux (Ubuntu 22.04+, Debian, Fedora, Arch)
- macOS (Sonoma, Ventura)

---

## 🚀 5. Instalasi

Ikuti langkah-langkah instalasi berikut secara berurutan:

### 1. Kloning Repositori
```bash
git clone https://github.com/mabrsyd/yolabot.git
cd yolabot
```

### 2. Jalankan Layanan Database & Cache (Docker Compose)
Pastikan Docker Desktop aktif, lalu jalankan PostgreSQL dan Redis di latar belakang:
```bash
docker compose up -d
```
*Periksa kesehatan container dengan menjalankan `docker ps`. Pastikan container `yolabot-postgres` dan `yolabot-redis` berstatus `healthy`.*

### 3. Setup & Instalasi Dependensi Backend
```bash
cd backend
npm install
```

Salin file contoh konfigurasi dan sesuaikan nilai environment variable:
```bash
# Windows PowerShell
copy .env.example .env

# Linux / macOS
cp .env.example .env
```

Jalankan sinkronisasi skema database dan seed data awal:
```bash
npx prisma generate
npx prisma migrate dev --name init
npm run db:seed
```

### 4. Setup & Instalasi Dependensi Frontend
Buka terminal baru, lalu masuk ke folder frontend:
```bash
cd ../frontend
npm install
```

---

## ⚙️ 6. Konfigurasi Environment Variables

Seluruh konfigurasi backend dikelola melalui file `backend/.env`. Konfigurasi divalidasi secara ketat saat server dinyalakan menggunakan **Zod** (`src/config/env.ts`).

### Daftar Variabel Lingkungan (`backend/.env`):

| Nama Variabel | Deskripsi / Fungsi | Contoh Nilai | Status |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | Mode lingkungan aplikasi | `development` / `production` / `test` | Wajib (default: `development`) |
| `PORT` | Port server HTTP backend | `3000` | Wajib (default: `3000`) |
| `HOST` | Alamat binding host backend | `0.0.0.0` | Wajib (default: `0.0.0.0`) |
| `APP_BASE_URL` | URL asal aplikasi web (CORS origin) | `http://localhost:5173` | Wajib (default: `http://localhost:5173`) |
| `API_BASE_URL` | URL dasar backend API | `http://localhost:3000` | Wajib (default: `http://localhost:3000`) |
| `DATABASE_URL` | Connection string PostgreSQL | `postgresql://postgres:postgres@localhost:5432/yolabot_db?schema=public` | **Wajib** |
| `REDIS_URL` | URL koneksi instance Redis | `redis://localhost:6379/0` | **Wajib** |
| `SESSION_SECRET` | Kunci enkripsi sesi (min. 32 karakter acak) | `super_secret_cryptographic_random_string_min_32_chars` | **Wajib** |
| `AI_PRIMARY_PROVIDER` | Penyedia AI utama | `groq` / `gemini` / `openai` / `mock` | Wajib (default: `groq`) |
| `GROQ_API_KEY` | API Key dari Groq Cloud Console | `gsk_xxxxxxxxxxxxxxxxxxxx` | Opsional (Wajib jika provider=groq) |
| `GROQ_DEFAULT_MODEL` | Nama model AI pada Groq | `openai/gpt-oss-120b` atau `llama-3.3-70b-versatile` | Opsional |
| `GROQ_BASE_URL` | Base URL endpoint Groq | `https://api.groq.com/openai/v1` | Opsional |
| `AI_FALLBACK_PROVIDER` | Penyedia AI cadangan (*Circuit Breaker*) | `gemini` / `openai` / `groq` / `mock` | Wajib (default: `gemini`) |
| `GEMINI_API_KEY` | API Key Google Gemini AI Studio | `AIzaSyxxxxxxxxxxxx` | Opsional (Wajib jika provider=gemini) |
| `GEMINI_DEFAULT_MODEL`| Nama model AI Google Gemini | `gemini-1.5-flash` | Opsional |
| `OPENAI_API_KEY` | API Key OpenAI Platform | `sk-proj-xxxxxxxxxxxx` | Opsional (Wajib jika provider=openai) |
| `OPENAI_DEFAULT_MODEL`| Nama model AI OpenAI | `gpt-4o-mini` | Opsional |
| `OPENAI_BASE_URL` | Base URL OpenAI API | `https://api.openai.com/v1` | Opsional |
| `TELEGRAM_BOT_TOKEN` | Token otentikasi bot Telegram | `123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ` | Opsional (Wajib jika bot aktif) |
| `TELEGRAM_WEBHOOK_SECRET`| Token verifikasi webhook Telegram | `webhook_secret_key_random_32_chars` | Opsional |
| `RESEND_API_KEY` | API Key pengiriman email verifikasi | `re_xxxxxxxxxxxx` | Opsional (fase MVP) |
| `EMAIL_FROM` | Alamat pengirim email sistem | `YolaBot <no-reply@yolabot.local>` | Opsional |

---

## 💻 7. Cara Menggunakan

### Menjalankan dalam Mode Pengembangan (Development)

Jalankan 3 terminal terpisah untuk menjalankan seluruh komponen aplikasi:

#### Terminal 1: Backend Server Fastify
```bash
cd backend
npm run dev
```
*Backend akan berjalan di `http://localhost:3000`.*

#### Terminal 2: Telegram Bot (Mode Polling Lokal)
```bash
cd backend
npm run dev:bot
```
*Bot Telegram akan terhubung langsung ke Telegram API melalui mode long-polling tanpa perlu tunneling webhook.*

#### Terminal 3: Frontend Web Vite
```bash
cd frontend
npm run dev
```
*Frontend akan aktif di `http://localhost:5173`. Buka URL ini pada browser Anda.*

---

### Menjalankan dalam Mode Produksi (Production Build)

```bash
# 1. Build & Jalankan Backend
cd backend
npm run build
npm run start

# 2. Build & Preview Frontend
cd ../frontend
npm run build
npm run preview
```

---

### Contoh Penggunaan Nyata & Format Data

#### 1. Memeriksa Status Kesehatan Server (Health Check)
```bash
curl -X GET http://localhost:3000/health
```
**Contoh Output Respons JSON:**
```json
{
  "status": "ok",
  "services": {
    "database": "up",
    "redis": "up"
  },
  "timestamp": "2026-11-11T08:00:00.000Z"
}
```

#### 2. Registrasi Akun Pengguna Baru
```bash
curl -X POST http://localhost:3000/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "PasswordKuat123!",
    "display_name": "Budi Santoso"
  }'
```

#### 3. Mengirim Pesan Chat Ber-Streaming (SSE)
```bash
curl -X POST http://localhost:3000/v1/conversations/{CONVERSATION_ID}/messages \
  -H "Content-Type: application/json" \
  -H "Cookie: session_id={SESSION_COOKIE}" \
  -d '{
    "content": "Tuliskan draf email penawaran kerja sama profesional."
  }'
```
**Contoh Aliran Event SSE (`text/event-stream`):**
```
event: session
data: {"message_id":"msg_123","conversation_id":"conv_456"}

event: token
data: {"delta":"Tentu"}

event: token
data: {"delta":", berikut"}

event: token
data: {"delta":" draf"}

event: done
data: {"finish_reason":"stop","token_in":45,"token_out":120}
```

---

## 📂 8. Struktur Direktori Proyek

```
d:/project/Chatbot-YAR/
├── .gitignore                         # Konfigurasi pengabaian Git (mengecualikan node_modules, .env, dist)
├── AGENTS.md                          # Aturan baku pengembang & AI coding agent (Single Source of Truth)
├── docker-compose.yml                 # Konfigurasi container PostgreSQL 16 & Redis 7
├── package.json                       # Konfigurasi root workspace
├── Product Requirements Document (PRD).md # Dokumen kebutuhan produk asli
├── README.md                          # Dokumentasi utama proyek ini
│
├── backend/                           # Shared Backend (Node.js + Fastify + TypeScript)
│   ├── .env.example                   # Template variabel lingkungan backend
│   ├── package.json                   # Dependensi backend & npm scripts
│   ├── prisma/                        # Skema database & migrasi
│   │   ├── schema.prisma              # Definisi 7 model database relasional
│   │   └── seed.ts                    # Inisialisasi System Prompt aktif ke database
│   ├── src/
│   │   ├── app.ts                     # Konfigurasi plugin Fastify, CORS, Cookie, & Error Handler
│   │   ├── server.ts                  # Entry point bootstrap server HTTP
│   │   ├── config/
│   │   │   └── env.ts                 # Validasi skema variabel lingkungan dengan Zod
│   │   ├── modules/                   # Arsitektur modular domain terisolasi
│   │   │   ├── ai-providers/          # Model Abstraction Layer (Groq, Gemini, OpenAI, Mock, Fallback)
│   │   │   ├── auth/                  # Layanan autentikasi, registrasi, login, logout, sesi
│   │   │   ├── conversations/         # CRUD percakapan, pencarian obrolan, pesan
│   │   │   ├── health/                # Endpoint status kesehatan database & Redis
│   │   │   ├── orchestrator/          # Context builder, dynamic prompt, streaming SSE, usage recorder
│   │   │   ├── telegram/              # Bot handler grammY, webhook, & script polling lokal
│   │   │   └── users/                 # Profil pengguna (/v1/me), preferensi, hapus akun
│   │   └── shared/                    # Utilitas bersama, middleware guard, DB & Redis client
│   └── tsconfig.json                  # Konfigurasi kompilasi TypeScript
│
├── frontend/                          # Web Application SPA (React + Vite + Tailwind CSS)
│   ├── index.html                     # Entry point dokumen HTML
│   ├── package.json                   # Dependensi frontend & npm scripts
│   ├── vite.config.ts                 # Konfigurasi bundler Vite & reverse proxy backend
│   └── src/
│       ├── App.tsx                    # Komponen root & konfigurasi React Router
│       ├── main.tsx                   # Inisialisasi React DOM
│       ├── components/                # Komponen antarmuka (ChatViewport, Composer, Sidebar, MessageBubble)
│       ├── pages/                     # Halaman tampilan (LoginPage, RegisterPage, ChatPage)
│       ├── stores/                    # Manajemen state global Zustand (auth-store, chat-store, theme-store)
│       └── lib/                       # Klien HTTP fetch, SSE parser, & utilitas CSS
│
└── docs/                              # Dokumentasi Teknis Lengkap & Standar Arsitektur
    ├── 01-product/                    # Overview produk, User Stories, User Flow
    ├── 02-technical/                  # TDD, Arsitektur Sistem, Skema Database ERD, API Spec, Security
    ├── 03-design/                     # UI/UX Specification, Design System
    ├── 04-ai/                         # AI Behavior, Model Strategy, AI Orchestration
    ├── 05-development/                # Roadmap pengembangan, Tasks breakdown, Coding standards, QA
    └── 06-operations/                 # Dokumen deployment Docker & panduan observabilitas
```

---

## 📐 9. Praktik Terbaik & Rekayasa Perangkat Lunak

### Konvensi Kode & Penamaan
- **Backend File:** `kebab-case.ts` (contoh: `context-builder.ts`, `fallback-router.ts`).
- **Frontend Komponen:** `PascalCase.tsx` (contoh: `ChatViewport.tsx`, `MessageBubble.tsx`).
- **Interface & Class:** `PascalCase` (contoh: `AIProviderAdapter`, `OrchestratorService`).
- **Database & API:** Kolom database dan atribut payload JSON wajib `snake_case` (contoh: `user_id`, `created_at`).
- **Strict TypeScript:** Dilarang menggunakan tipe `any`. Gunakan `unknown` dengan validasi Zod jika data bertipe dinamis.
- **YAGNI (No Speculative Coding):** Jangan mengimplementasikan fungsi di luar lingkup kebutuhan task yang sedang aktif.

### Alur Kerja Git & Pesan Commit
Proyek ini mengadopsi standar **Conventional Commits**:
- `feat: <deskripsi>` — Penambahan fitur bisnis baru.
- `fix: <deskripsi>` — Perbaikan bug atau error.
- `test: <deskripsi>` — Penambahan atau pembaruan unit/integration test.
- `docs: <deskripsi>` — Pembaruan berkas dokumentasi.
- `refactor: <deskripsi>` — Perapian kode tanpa mengubah fungsionalitas.

### Pengujian, Linting, & Pemformatan Kode
```bash
# Menjalankan seluruh pengujian unit backend (21 tests)
npm --prefix backend run test

# Menjalankan pemeriksaan linter ESLint
npm --prefix backend run lint

# Memperbaiki pelanggaran lint secara otomatis
npm --prefix backend run lint:fix

# Memformat kode dengan Prettier
npm --prefix backend run format

# Verifikasi build frontend
npm --prefix frontend run build
```

### Pedoman Keamanan (*Zero Secret Leakage*)
- **Jangan pernah meletakkan API Key, Secret Token, atau password database ke dalam git repository.** File `.env` sudah masuk ke `.gitignore`.
- Seluruh kueri pesan dan sesi obrolan wajib menyertakan filter `WHERE user_id = :id AND deleted_at IS NULL` untuk menjamin isolasi data pengguna secara absolut.
- Input pengguna dibatasi maksimal 4.000 karakter dan dibungkus tag `<user_input>` guna memitigasi serangan *Indirect Prompt Injection*.

---

## ❓ 10. Troubleshooting / FAQ

#### 1. Error: `connect: open //./pipe/docker_engine: The system cannot find the file specified`
- **Penyebab:** Docker Desktop belum dinyalakan di Windows/macOS.
- **Solusi:** Buka aplikasi **Docker Desktop**, tunggu hingga indikator berubah menjadi hijau (*Engine Running*), lalu jalankan kembali `docker compose up -d`.

#### 2. Error: `Koneksi ke Redis gagal (ECONNREFUSED 127.0.0.1:6379)`
- **Penyebab:** Container Redis belum aktif atau port 6379 diblokir oleh proses lain.
- **Solusi:** Periksa status container dengan `docker ps`. Jalankan `docker compose up -d redis` dan pastikan variabel `REDIS_URL=redis://localhost:6379/0` di `.env` sudah benar.

#### 3. Error Prisma: `Database connection failed` atau `Schema engine error`
- **Penyebab:** Layanan database PostgreSQL belum siap menerima koneksi saat migrasi dijalankan.
- **Solusi:** Tunggu beberapa detik hingga container PostgreSQL selesai inisialisasi, lalu jalankan:
  ```bash
  cd backend
  npx prisma migrate dev
  ```

#### 4. Error: `models/gemini-1.5-flash is not found for API version v1beta (404)`
- **Penyebab:** Akun/project Google AI Studio tertentu belum mengaktifkan model tersebut pada endpoint v1beta.
- **Solusi:** Beralih ke **Groq** sebagai provider utama. Pasang `AI_PRIMARY_PROVIDER=groq` dan masukkan `GROQ_API_KEY` Anda di `backend/.env`. Groq menyediakan model `openai/gpt-oss-120b` yang sangat cepat dan stabil.

#### 5. Bot Telegram Tidak Merespons Pesan di Lokal
- **Penyebab:** Bot dijalankan dalam mode webhook tanpa public URL HTTPS (ngrok/Cloudflare), atau script polling belum dijalankan.
- **Solusi:** Untuk pengembangan lokal, jalankan perintah long-polling di terminal backend:
  ```bash
  npm --prefix backend run dev:bot
  ```

#### 6. Respons Obrolan Web Mengembalikan Teks `[Mock Stream]`
- **Penyebab:** `GROQ_API_KEY`, `GEMINI_API_KEY`, atau `OPENAI_API_KEY` belum terisi di `backend/.env`, sehingga sistem menggunakan `MockAIProviderAdapter` secara otomatis agar server tetap dapat diuji.
- **Solusi:** Isi kunci API valid pada file `backend/.env`, simpan file, lalu restart server backend (`npm run dev`).

---

## 🤝 11. Kontribusi

Kami menyambut kontribusi dari komunitas pengembang! Untuk berkontribusi:

1. **Fork** repositori ini ke akun GitHub Anda.
2. Buat branch fitur baru dari branch `main`:
   ```bash
   git checkout -b feat/nama-fitur-anda
   ```
3. Lakukan perubahan kode dengan mematuhi panduan [AGENTS.md](AGENTS.md) dan standar penulisan kode proyek.
4. Pastikan seluruh pengujian dan linter lolos tanpa error:
   ```bash
   npm --prefix backend run test
   npm --prefix backend run lint
   npm --prefix frontend run build
   ```
5. Commit perubahan Anda dengan pesan Conventional Commit:
   ```bash
   git commit -m "feat: tambahkan fitur validasi sesi baru"
   ```
6. Push branch ke repositori fork Anda dan ajukan **Pull Request (PR)** dengan penjelasan teknis yang rinci.

---

## 📄 12. Lisensi & Kontak

### Lisensi
Proyek ini didistribusikan di bawah lisensi **ISC License** — silakan baca file package dan repositori untuk ketentuan hukum selengkapnya.

### Kontak & Dukungan
- **Repositori Resmi:** [https://github.com/mabrsyd/yolabot.git](https://github.com/mabrsyd/yolabot.git)
- **Dokumentasi Lengkap:** Folder [`docs/`](docs/)
- **Author / Lead Engineering:** TODO: Tambahkan kontak pengembang atau email tim pemelihara proyek (misal: `maintainer@yolabot.local`).
- **Telegram Bot Demo:** [@yolav1bot](https://t.me/yolav1bot) (Hubungi pengembang untuk akses bot live).

---

*Dikembangkan dengan standar rekayasa perangkat lunak modern untuk menghadirkan pengalaman asisten AI multi-platform yang aman, cepat, dan handal.*
