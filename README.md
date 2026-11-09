# YolaBot 🤖
### Multi-Platform General-Purpose AI Assistant (Web Application & Telegram Bot)

[![Node.js](https://img.shields.io/badge/Node.js-v20+-green.svg?style=for-the-badge&logo=node.js)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-blue.svg?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Fastify](https://img.shields.io/badge/Fastify-v4+-black.svg?style=for-the-badge&logo=fastify)](https://fastify.dev/)
[![React](https://img.shields.io/badge/React-18+-61DAFB.svg?style=for-the-badge&logo=react)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC.svg?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-336791.svg?style=for-the-badge&logo=postgresql)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7+-DC382D.svg?style=for-the-badge&logo=redis)](https://redis.io/)
[![grammY](https://img.shields.io/badge/grammY-Telegram-2CA5E0.svg?style=for-the-badge&logo=telegram)](https://grammy.dev/)

---

## 📌 Tentang YolaBot

**YolaBot** adalah asisten kecerdasan buatan serba guna (*general-purpose AI assistant*) yang dapat diakses secara simultan melalui dua platform utama: **Aplikasi Web Interaktif (SPA)** dan **Bot Perpesanan Telegram**.

Dibangun di atas arsitektur **Shared Backend (Modular Monolith)** terpadu, YolaBot memastikan seluruh aturan bisnis, perakitan konteks AI, riwayat obrolan multi-turn, dan pembatasan kuota (*rate limiting*) berjalan secara konsisten di kedua platform tanpa duplikasi kode.

YolaBot menggunakan pendekatan **Vendor-Neutral AI Abstraction Layer**, sehingga sistem dapat dengan mudah berganti penyedia model LLM (OpenAI, Google Gemini, Anthropic Claude, atau model lokal/self-hosted) murni melalui konfigurasi tanpa merombak logika bisnis aplikasi.

---

## ✨ Fitur Utama

### 🌐 1. Aplikasi Web (Web Application SPA)
- **Chat Interaktif Ber-Streaming:** Penerimaan token respons AI secara langsung menggunakan protokol *Server-Sent Events (SSE)*.
- **Rendering Kaya (Rich Markdown):** Mendukung pemformatan teks Markdown lengkap, tabel, dan blok kode dengan pewarnaan sintaks (*syntax highlighting*).
- **Alat Produktivitas Kode:** Tombol salin satu-klik untuk jawaban teks maupun blok kode pemrograman.
- **Manajemen Sesi Obrolan:** Pembuatan sesi baru, riwayat percakapan di sidebar, penggantian nama judul otomatis & manual, serta penghapusan percakapan (*soft delete*).
- **Fitur Kontrol Chat:** Tombol *Stop Generation* (menghentikan streaming), *Regenerate Response*, dan *Edit & Resend Prompt*.
- **Desain Modern & Responsif:** Antarmuka ergonomis untuk Desktop, Tablet, dan Ponsel (breakpoint minimal 360 px), dilengkapi mode **Tema Gelap & Terang (Dark/Light Mode)**.
- **Keamanan Privasi:** Autentikasi berbasis email & password dengan enkripsi Argon2id dan cookie sesi `HttpOnly SameSite=Strict`.

### 📱 2. Bot Telegram
- **Auto-Provisioning Identitas:** Pendaftaran instan berdasarkan Telegram ID saat menekan `/start`.
- **Percakapan Kontekstual Multi-Turn:** Bot memahami konteks percakapan sebelumnya layaknya berbicara di web.
- **Indikator Mengetik (*Typing Status*):** Status pengetikan aktif selama proses inferensi AI berlangsung.
- **Perintah Bot Terintegrasi:** `/start`, `/help`, `/new` (reset konteks), `/usage` (cek sisa kuota), dan `/link` (penautan akun).
- **Account Linking (Web-Telegram):** Sinkronisasi riwayat percakapan dan kuota antara akun Telegram dan akun Web menggunakan kode OTP 6-karakter (valid 10 menit).
- **Penanganan Pesan Non-Teks:** Penolakan ramah dan edukatif jika pengguna mengirim foto, audio, atau dokumen pada fase MVP.

### 🛡️ 3. Keamanan & Tata Kelola AI
- **Isolasi Data Pengguna Mutlak (*Zero-Trust*):** Setiap kueri diproteksi kepemilikan `user_id`. Pengguna dilarang keras mengakses percakapan milik pengguna lain.
- **Pertahanan Terhadap Prompt Injection:** Pemisahan instruksi sistem dari masukan pengguna menggunakan pembatas tag `<user_input>`.
- **Kerahasiaan Percakapan (*Conversation Privacy*):** Log aplikasi dilarang mencatat isi pesan teks percakapan pengguna.
- **Rate Limiting & Kuota Terpadu:** Pembatasan frekuensi permintaan per menit (Sliding Window) dan kuota token harian berbasis Redis.
- **Multi-Provider Fallback:** Peralihan otomatis ke penyedia model cadangan jika penyedia utama mengalami gangguan/timeout (*Circuit Breaker*).

---

## 🏛️ Arsitektur Sistem

YolaBot mengadopsi pola arsitektur **API-First Unified Modular Monolith**:

```
+-------------------------------------------------------------------------+
|                          SALURAN PENGGUNA                               |
|        [ Web Browser (React SPA) ]       [ Aplikasi Telegram ]          |
+------------------------------------+------------------------------------+
                                     |
                                     v
+-------------------------------------------------------------------------+
|                     REVERSE PROXY & EDGE SECURITY                       |
|               Cloudflare SSL / NGINX Ingress Proxy                      |
+------------------------------------+------------------------------------+
                                     |
                                     v
+-------------------------------------------------------------------------+
|                  SHARED BACKEND (Node.js + Fastify)                     |
|                                                                         |
|  +--------------------+  +-------------------+  +--------------------+  |
|  | Auth & User Srv    |  | Conversation Srv  |  | Telegram Adapter   |  |
|  +--------------------+  +---------+---------+  +---------+----------+  |
|                                    |                      |             |
|                                    +----------+-----------+             |
|                                               |                         |
|                                               v                         |
|                             +-----------------------------------+       |
|                             |        AI Orchestrator Engine     |       |
|                             |  - Dynamic System Prompt Manager  |       |
|                             |  - Context Builder Sliding Window |       |
|                             |  - Model Abstraction Layer        |       |
|                             +-----------------+-----------------+       |
+-----------------------------------------------|-------------------------+
                                                |
               +--------------------------------+----------------+
               |                                                 |
               v                                                 v
+-------------------------------+               +-------------------------------+
|     PENYIMPANAN DATA          |               |       PENYEDIA MODEL AI       |
|  - PostgreSQL 15+ (Persisten) |               |  - Provider Primer (Gemini/OAI)
|  - Redis 7+ (Cache & Kuota)   |               |  - Provider Fallback (Claude) |
+-------------------------------+               |  - Self-Hosted LLM (Opsional) |
                                                +-------------------------------+
```

---

## 🛠️ Tumpukan Teknologi (Tech Stack)

| Komponen | Teknologi | Keterangan & Alasan Pemilihan |
| :--- | :--- | :--- |
| **Backend Runtime** | **Node.js (LTS v20+)** | I/O asinkron non-blocking berkecepatan tinggi. |
| **Backend Framework**| **Fastify (TypeScript Strict)** | Performa tinggi, latensi rendah, native support untuk SSE streaming. |
| **Frontend Framework**| **React 18+ (Vite + TypeScript)**| Single-Page Application responsif dengan rendering komponen instan. |
| **Styling & UI Kit** | **Tailwind CSS + Radix UI + Lucide**| Antarmuka modern, aksesibel (WCAG 2.1 AA), dan bertema Gelap/Terang. |
| **Telegram Framework**| **grammY (TypeScript)** | Framework modern bot Telegram dengan tipe data ketat dan efisien. |
| **Database Utama** | **PostgreSQL 15+** | Database relasional ACID dengan indeks pencarian teks GIN Trigram. |
| **ORM / Migrasi** | **Prisma ORM** | Type-safe database client dan skema migrasi deklaratif. |
| **Cache & Rate Limit** | **Redis 7+ (`ioredis`)** | In-memory key-value store untuk kuota token, sesi, dan OTP penautan. |
| **Keamanan Kredensial**| **Argon2id (`@node-rs/argon2`)** | Algoritma hashing kata sandi terkuat standar industri. |
| **Model AI Primer** | **Google Gemini / OpenAI API** | Inferensi cerdas dengan pemahaman Bahasa Indonesia yang fasih. |

---

## 📁 Struktur Direktori Proyek

```
yolabot/
├── .gitignore                    # Konfigurasi pengecualian Git
├── AGENTS.md                     # Pedoman operasional AI Coding Agent & Developer
├── Product Requirements Document (PRD).md # PRD Asli (Single Source of Truth)
├── README.md                     # Dokumentasi utama proyek ini
│
├── docs/                         # Pusat Dokumentasi Lengkap
│   ├── TRACEABILITY-MATRIX.md    # Matriks penelusuran persyaratan dari PRD ke Test
│   ├── DOCUMENTATION-REVIEW.md   # Laporan evaluasi & kesiapan teknis proyek
│   ├── 01-product/               # Visi produk, User Stories, & User Flow Mermaid
│   ├── 02-technical/             # TDD, Arsitektur Sistem, Skema Database ERD, API, Keamanan
│   ├── 03-design/                # Spesifikasi UI/UX Web, State Antarmuka, Design System
│   ├── 04-ai/                    # Perilaku AI, Strategi Multi-Provider, Pipeline Orkestrasi
│   ├── 05-development/           # Roadmap pengembangan, 32 Granular Tasks, Coding Standards, QA
│   └── 06-operations/            # Panduan Deployment Docker/NGINX & Observabilitas Monitoring
│
├── backend/                      # Kode Sumber Backend (Fastify + TypeScript)
│   ├── package.json
│   ├── tsconfig.json
│   └── src/                      # Modul internal backend
│
└── frontend/                     # Kode Sumber Frontend (React + Vite) [Fase 2]
```

---

## 📚 Indeks Dokumentasi Resmi

Seluruh keputusan teknis, arsitektur, dan alur kerja telah didokumentasikan secara menyeluruh di dalam folder `docs/`:

- 📋 **Spesifikasi Produk:**
  - [PRODUCT-OVERVIEW.md](docs/01-product/PRODUCT-OVERVIEW.md) — Visi produk, sasaran terukur, dan batasan cakupan MVP.
  - [USER-STORIES.md](docs/01-product/USER-STORIES.md) — Cerita pengguna berdasarkan peran (Tamu, Pengguna, Admin).
  - [USER-FLOW.md](docs/01-product/USER-FLOW.md) — Diagram alur visual Mermaid untuk seluruh perjalanan pengguna.
- ⚙️ **Arsitektur & Spesifikasi Teknis:**
  - [TDD.md](docs/02-technical/TDD.md) — Dokumen desain teknis dan catatan keputusan arsitektur (TDR).
  - [SYSTEM-ARCHITECTURE.md](docs/02-technical/SYSTEM-ARCHITECTURE.md) — Blueprint arsitektur tingkat tinggi dan komponen backend.
  - [DATABASE-ERD.md](docs/02-technical/DATABASE-ERD.md) — Skema database lengkap (DDL), ERD, indeks, dan aturan retensi.
  - [API-SPECIFICATION.md](docs/02-technical/API-SPECIFICATION.md) — Kontrak 21 endpoint REST API dan streaming SSE.
  - [SECURITY.md](docs/02-technical/SECURITY.md) — Protokol keamanan, isolasi multi-tenant, dan mitigasi prompt injection.
- 🎨 **Desain & Antarmuka:**
  - [UI-UX-SPECIFICATION.md](docs/03-design/UI-UX-SPECIFICATION.md) — Perilaku layout, state loading/empty/error, dan aksesibilitas.
  - [DESIGN-SYSTEM.md](docs/03-design/DESIGN-SYSTEM.md) — Token warna (Zinc & Indigo), tipografi, dan panduan komponen.
- 🧠 **Kecerdasan Buatan (AI Engine):**
  - [AI-BEHAVIOR.md](docs/04-ai/AI-BEHAVIOR.md) — Kepribadian asisten, batasan keras anti-halusinasi, dan System Prompt v1.0.
  - [MODEL-STRATEGY.md](docs/04-ai/MODEL-STRATEGY.md) — Abstraksi multi-provider, circuit breaker, dan kesiapan self-hosted LLM.
  - [AI-ORCHESTRATION.md](docs/04-ai/AI-ORCHESTRATION.md) — Siklus permintaan, context builder sliding window, dan profil spesialisasi.
- 🚀 **Rencana Pengembangan & Operasional:**
  - [DEVELOPMENT-ROADMAP.md](docs/05-development/DEVELOPMENT-ROADMAP.md) — Fase rilis, milestone keberhasilan, dan Definition of Done.
  - [TASKS.md](docs/05-development/TASKS.md) — Daftar 32 task pekerjaan granular yang siap dieksekusi.
  - [CODING-STANDARDS.md](docs/05-development/CODING-STANDARDS.md) — Standar penulisan kode TypeScript dan penanganan error.
  - [TEST-PLAN.md](docs/05-development/TEST-PLAN.md) — Rencana pengujian kualitas, piramida tes, dan matriks penerimaan MVP.
  - [DEPLOYMENT.md](docs/06-operations/DEPLOYMENT.md) — Konfigurasi Docker, NGINX reverse-proxy, dan pipeline CI/CD.
  - [MONITORING.md](docs/06-operations/MONITORING.md) — Logging terstruktur Pino, metrik Prometheus, dan health checks.

---

## 🚀 Panduan Memulai (Quick Start)

### Prasyarat Sistem
- **Node.js:** v20.x atau lebih baru
- **PostgreSQL:** v15+ (Port default: `5432`)
- **Redis:** v7+ (Port default: `6379`)
- **Git**

### 1. Kloning Repositori
```bash
git clone https://github.com/mabrsyd/yolabot.git
cd yolabot
```

### 2. Konfigurasi Lingkungan Backend
Masuk ke direktori backend dan siapkan file konfigurasi environment:
```bash
cd backend
cp .env.example .env
```

Sesuaikan nilai variabel lingkungan pada file `.env`:
```ini
NODE_ENV=development
PORT=3000

# Basis Data
DATABASE_URL="postgresql://postgres:password@localhost:5432/yolabot_db?schema=public"

# Cache & Sesi
REDIS_URL="redis://localhost:6379"
SESSION_SECRET="ganti_dengan_kunci_acak_minimal_32_karakter"

# Model AI (Pilih salah satu atau keduanya)
OPENAI_API_KEY="sk-proj-xxxxxxxxxxxxxxxxxxxx"
GEMINI_API_KEY="AIzaSyxxxxxxxxxxxxxxxxxxxx"

# Bot Telegram
TELEGRAM_BOT_TOKEN="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
TELEGRAM_WEBHOOK_SECRET="kunci_rahasia_webhook_telegram"
```

### 3. Instalasi Dependensi & Menjalankan Backend
```bash
npm install
npm run dev
```
Server backend akan aktif di `http://localhost:3000` dengan endpoint pemeriksaan kesehatan di `http://localhost:3000/health`.

---

## 🧑‍💻 Pedoman Kontribusi & AI Coding Agent

Bagi pengembang maupun **AI coding agent** yang berkontribusi pada repositori ini, wajib mematuhi pedoman kerja pada [AGENTS.md](AGENTS.md):
1. **Baca Sebelum Menulis:** Pahami dokumen arsitektur terkait di `docs/` sebelum mengubah atau membuat kode baru.
2. **Kepatuhan Terhadap Scope:** Dilarang mengarang kebutuhan bisnis atau menambahkan dependensi yang tidak tercantum dalam spesifikasi.
3. **Isolasi Data Pengguna:** Setiap kueri database wajib menyertakan filter `user_id`.
4. **Zero Secret Leakage:** Dilarang mengekspos kunci API atau token ke repositori publik.
5. **Uji Otomatis:** Setiap penambahan logika bisnis wajib disertai unit test atau integration test yang deterministik.

---

## 📄 Lisensi

Proyek ini dilisensikan di bawah lisensi **MIT License** — lihat berkas lisensi untuk informasi selengkapnya.

---

*Dikembangkan dengan standar rekayasa perangkat lunak modern untuk menghadirkan pengalaman asisten AI terbaik.*

