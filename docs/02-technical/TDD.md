# Technical Design Document (TDD): Multi-Platform General-Purpose AI Assistant

**Versi Dokumen:** 1.0  
**Tanggal:** 7 November 2026  
**Status:** Approved Technical Baseline  
**Penulis:** Senior Software Architect & Technical Documentation Engineer  
**Referensi:** PRD Section 36 s.d. 45

---

## 1. Technical Overview

Sistem **Multi-Platform General-Purpose AI Assistant** dirancang sebagai ekosistem terpadu (*unified architecture*) yang menyajikan layanan asisten AI generatif percakapan (*conversational AI*) ke dua platform antarmuka: **Web Application (SPA)** dan **Telegram Bot**.

Untuk mencegah duplikasi kode, inkonsistensi respons, dan kompleksitas pemeliharaan yang berlebihan, seluruh *business logic*, manajemen percakapan, pembatasan kuota (*rate limiting*), dan integrasi model AI dipusatkan pada satu **Shared Backend**. Telegram Bot Adapter dan Web Client beroperasi sebagai lapisan konsumsi tipis (*thin client/adapter layer*) yang berkomunikasi dengan modul inti backend melalui kontrak antarmuka internal yang seragam.

---

## 2. Technology Stack

Pilihan teknologi dipilih berdasarkan kriteria keandalan, kesederhanaan operasional (*operational simplicity*), dukungan ekosistem streaming I/O asinkron berkecepatan tinggi, serta kemudahan *vibe coding* dan *type safety* lintas lapisan.

| Komponen | Pilihan Teknologi | Alasan Pemilihan & Pertimbangan Teknis |
| :--- | :--- | :--- |
| **Backend Runtime** | **Node.js (LTS v20+)** | I/O asinkron non-blocking sangat efisien untuk menangani ratusan koneksi streaming SSE simultan; ekosistem TypeScript yang matang. |
| **Backend Framework** | **Fastify (TypeScript)** | Memiliki overhead latency terendah dibanding Express, dukungan skema validasi bawaan via JSON Schema (Ajv/TypeBox), dan integrasi native untuk Server-Sent Events. |
| **Frontend Framework** | **React (v18+) + Vite + TypeScript** | Single-Page Application (SPA) yang cepat, rendering virtual DOM efisien saat menerima potongan stream token teks, tanpa beban server-side rendering monolitik. |
| **Styling & UI Kit** | **Tailwind CSS + Radix UI Primitives + Lucide Icons** | Utility-first CSS dengan desain responsif murni, komponen aksesibel (WCAG AA), mode tema gelap/terang mudah diimplementasikan, tanpa bloat library berat. |
| **State & Data Fetching** | **TanStack Query (React Query) + Zustand** | Manajemen state server (cache, revalidation) terpisah rapi dari client UI state (sidebar toggle, composer status). |
| **Telegram Framework** | **grammY (TypeScript)** | Framework bot Telegram paling modern, ringan, 100% type-safe, memiliki abstraksi middleware yang modular, dan efisien dalam menangani webhook. |
| **Database Utama** | **PostgreSQL (v15+)** | Database relasional ACID untuk menjamin integritas referensial entitas pengguna, identitas, sesi, dan pesan; indeks B-Tree dan GIN untuk pencarian teks. |
| **ORM / Query Builder** | **Prisma ORM / Drizzle ORM** | Type-safe database queries, skema deklaratif, dan migrasi terversi yang dapat diulang secara deterministik (BE-006). |
| **In-Memory Cache & KVS** | **Redis (v7+)** | Penyimpanan hitungan *rate limiting* berkecepatan tinggi (Token Bucket / Sliding Window), penampung token OTP penautan Telegram (TTL 10 menit), dan session blacklisting. |
| **AI LLM Client & Protocol** | **Native Fetch / REST SDKs (OpenAI SDK / Gemini SDK)** | Standar REST / SSE API dengan *Adapter Pattern* kustom untuk abstraksi vendor multi-provider. |
| **Keamanan Kredensial** | **Argon2id (via `@node-rs/argon2`)** | Algoritma *password hashing* standar industri tahan serangan GPU/ASIC brute-force (AUTH-001). |

---

## 3. Architecture Principles

1. **Modular Monolith First:** Menghindari fragmentasi *microservices* pada fase MVP. Sistem dibangun sebagai satu aplikasi monolitik modular dengan *strict boundary separation* antar-domain (Auth, User, Conversation, Orchestrator, Telegram Adapter). Setiap modul dapat dipisahkan menjadi microservice independen di masa depan tanpa mengubah API kontrak publik.
2. **Platform-Agnostic Core Business Logic:** Layanan inti (*Conversation Service* dan *AI Orchestrator*) tidak memiliki kesadaran (*unaware*) apakah permintaan datang dari peramban Web atau pesan Telegram. Seluruh permintaan dinormalisasi ke DTO (*Data Transfer Object*) standar.
3. **Vendor-Neutral AI Abstraction:** Orkestrator hanya berbicara dengan interface `ModelProviderAdapter`. Penggantian penyedia model AI (misal dari Provider A ke Provider B) dilakukan murni melalui konfigurasi *environment* atau tabel konfigurasi tanpa menyentuh *core domain logic*.
4. **Stateless Backend Tier:** Backend tidak menyimpan status sesi obrolan di memori proses (RAM). Status disimpan terdesentralisasi di Redis dan PostgreSQL, memungkinkan *horizontal scaling* mulus di balik Load Balancer.
5. **Zero Trust & Data Isolation:** Setiap operasi baca/tulis ke entitas percakapan dan pesan wajib memverifikasi bahwa `conversation.user_id === authenticated_user.id`.

---

## 4. Module Design & Component Breakdown

```
src/
├── app.ts                  # Inisialisasi Fastify App & Plugin Registry
├── config/                 # Manajemen Environment & Validasi Konfigurasi (Zod)
├── modules/
│   ├── auth/               # Registrasi, Login, Verifikasi Email, Token/Session
│   ├── users/              # Manajemen Profil, Pengaturan Tema/Bahasa, Hapus Akun
│   ├── conversations/      # CRUD Percakapan, Riwayat, Pencarian Pesan
│   ├── orchestrator/       # AI Orchestrator, Context Builder, Token Calculator
│   ├── ai-providers/       # Model Abstraction Layer & Provider Adapters
│   │   ├── adapter.interface.ts
│   │   ├── openai-adapter.ts
│   │   ├── gemini-adapter.ts
│   │   └── fallback-router.ts
│   ├── telegram/           # Webhook Handler, Command Dispatcher, Message Formatter
│   └── rate-limiter/       # Redis-based Quota & Rate Limiting Guard
├── shared/
│   ├── database/           # Prisma Client / Database Connection Pool
│   ├── redis/              # Redis Client Wrapper
│   ├── errors/             # Standard App Exceptions & Error Handler
│   ├── middlewares/        # Auth Guard, Audit Logger, Correlation ID
│   └── utils/              # Sanitizer, Tokenizer, Crypto Helper
```

### 4.1 Modul Auth & Identity
- Menangani registrasi pengguna baru, verifikasi email token (24 jam), dan proses login.
- Mengelola entitas `identities` yang memetakan relasi 1:N (satu `User` dapat memiliki identitas Web `email` dan identitas Telegram `telegram_id`).
- Menerbitkan session cookie `HttpOnly` untuk Web dan memverifikasi token OTP penautan Telegram via Redis.

### 4.2 Modul Conversation & Message
- Mengelola daur hidup sesi percakapan: inisialisasi, perubahan judul, *soft delete* (`deleted_at`), dan kueri riwayat berbasis kursor.
- Menjalankan pencarian teks efisien menggunakan indeks PostgreSQL (GIN index pada judul dan konten pesan).
- Menjalankan *job background* asinkron untuk auto-generate judul percakapan menggunakan model LLM berbiaya rendah setelah turn pertama tuntas.

### 4.3 Modul AI Orchestrator & Context Builder
- Menerima DTO permintaan dari Conversation Service.
- Mengambil *system prompt* aktif dari Prompt Manager (berdasarkan versi aktif di DB).
- Menghitung anggaran token (*token budget*) menggunakan tokenizer lokal:
  $$\text{Budget Tersedia} = \text{MaxContextWindow} - \text{MaxOutputReservation} - \text{SystemPromptTokens}$$
- Menerapkan algoritma *sliding window* mundur (*reverse chronological traversal*) untuk memilih pesan riwayat yang muat ke dalam anggaran token.
- Menginjeksi pesan baru pengguna dengan pembungkus pelindung (*prompt injection guard*).

### 4.4 Modul AI Providers (Model Abstraction Layer)
- Mengimplementasikan pola *Adapter Design Pattern*.
- Interface terpadu:
  ```typescript
  export interface AIProviderAdapter {
    readonly providerId: string;
    generateText(params: PromptPayload): Promise<GenerationResult>;
    streamText(params: PromptPayload): AsyncIterable<StreamChunk>;
    estimateTokens(text: string): number;
  }
  ```
- Dilengkapi mekanisme *Circuit Breaker* dan *Fallback Router* jika penyedia utama mengalami HTTP 500, 503, atau batas waktu koneksi (*timeout 60 detik*).

### 4.5 Modul Telegram Adapter
- Berjalan sebagai Fastify route plugin: `POST /v1/telegram/webhook`.
- Memverifikasi header keamanan: `X-Telegram-Bot-Api-Secret-Token`.
- Mengimplementasikan deduplikasi pesan idempoten berdasarkan `update_id` melalui Redis NX cache (TTL 5 menit).
- Menerjemahkan update Telegram menjadi eksekusi perintah bot atau memicu aliran percakapan teks ke AI Orchestrator.
- Memformat keluaran respons Markdown menjadi struktur Telegram HTML / MarkdownV2 dan memotongnya jika melebihi 4.096 karakter.

---

## 5. Design Patterns Applied

1. **Adapter Pattern:** Digunakan pada lapisan AI Provider (`OpenAIAdapter`, `GeminiAdapter`, `SelfHostedAdapter`) sehingga orkestrator tidak bergantung pada SDK vendor tertentu.
2. **Strategy Pattern:** Digunakan pada *Context Truncation Strategy* (Sliding Window Strategy pada MVP, Summarization Strategy pada Post-MVP).
3. **Repository Pattern:** Abstraksi akses basis data dari *business service* untuk mempermudah unit testing dengan database mock/in-memory.
4. **Middleware Pattern:** Penanganan otentikasi, verifikasi peran, audit logging, penegakan *rate limiting*, dan injeksi `X-Correlation-ID` pada setiap siklus request-response.
5. **Circuit Breaker & Fallback:** Menjamin keandalan panggilan API eksternal saat terjadi degradasi performa pada vendor AI pihak ketiga.

---

## 6. Technical Decisions Record (TDR)

### TDR-01: Pendekatan Backend Bersama (Shared Monolith vs Microservices)
- **Keputusan:** Menggunakan **Modular Monolith** dengan single codebase backend TypeScript.
- **Konsekuensi Positif:** Kompleksitas deployment sangat rendah, latensi komunikasi antar-modul zero-network overhead, konsistensi data terjamin via transaksi database ACID, dan biaya infrastruktur hemat.
- **Mitigasi Risiko:** Batas modul dijaga ketat tanpa sirkular dependensi agar siap dipecah menjadi microservices jika skala sistem telah membutuhkan tim terpisah.

### TDR-02: Protokol Streaming Web (Server-Sent Events vs WebSockets)
- **Keputusan:** Menggunakan **Server-Sent Events (SSE)** melalui HTTP untuk antarmuka Web Chat.
- **Konsekuensi Positif:** SSE adalah protokol satu arah (*server-to-client*) di atas HTTP standar yang secara native didukung peramban via `EventSource` / `fetch-event-source`, sangat andal melalui proxy/load balancer modern, mendukung *auto-reconnect*, dan jauh lebih sederhana daripada WebSocket yang membutuhkan manajemen koneksi bi-directional stateful.
- **Pertimbangan:** Interaksi chat pengguna adalah request-response (pengguna kirim HTTP POST, server membalas dengan stream token). Tidak dibutuhkan channel bi-directional konstan.

### TDR-03: Strategi Streaming Telegram Bot
- **Keputusan:** Pada tahap MVP, respons Telegram dikirimkan **sekaligus (*complete buffer*)** setelah inferensi LLM selesai, dengan status `sendChatAction(action="typing")` aktif selama proses.
- **Konsekuensi Positif:** Mencegah pelanggaran Telegram Rate Limit (Telegram membatasi edit pesan maksimal ~1-3 edit per detik per chat). Fitur simulasi streaming via periodic `editMessageText` ditunda ke Post-MVP (FR-017, FR-019).

### TDR-04: Penyimpanan Sesi & Otentikasi Web
- **Keputusan:** Menggunakan **Signed, HttpOnly, Secure, SameSite=Lax Session Cookies** yang divalidasi ke Redis.
- **Konsekuensi Positif:** Mengeliminasi celah XSS (karena JavaScript di peramban tidak dapat membaca cookie HttpOnly) dibanding menyimpan JWT di `localStorage`. Pembatalan sesi (*revocation/logout*) dapat dilakukan secara instan di Redis.

---

## 7. Dependencies & External Services

| Service / Dependency | Peran & Kegunaan | Alternatif Cadangan |
| :--- | :--- | :--- |
| **Primary LLM API** | Generasi teks inferensi cerdas bahasa Indonesia & Inggris | Vendor komersial terkemuka (OpenAI GPT-4o / Gemini 1.5 Pro) |
| **Secondary LLM API** | Fallback otomatis jika vendor utama timeout/down | Alternatif terkemuka (Anthropic Claude 3.5 Sonnet / Groq Llama 3) |
| **Telegram Bot API** | Saluran distribusi interaksi perpesanan Telegram | Webhook HTTPS publik resmi Telegram |
| **Transactional Email** | Pengiriman tautan verifikasi email registrasi | Resend / Amazon SES / SendGrid |
| **PostgreSQL Host** | Basis data utama transaksi data persisten | Managed Cloud PostgreSQL (AWS RDS / Supabase / Neon) |
| **Redis Host** | Cache cepat untuk rate-limit, OTP, dan sesi | Managed Redis (Upstash / Redis Enterprise / AWS ElastiCache) |

---

## 8. Scalability Considerations

1. **Stateless Scale-Out:** Service backend Fastify dapat di-deploy dalam beberapa container di balik NGINX / Cloudflare Load Balancer. Karena status sesi disimpan di Redis dan obrolan di Postgres, penambahan kapasitas dilakukan dengan menambah replica container.
2. **Database Read/Write Segregation (Post-MVP Ready):** Kueri riwayat percakapan yang padat baca (*read-heavy*) dapat diarahkan ke read replica PostgreSQL jika volume pengguna melonjak.
3. **Queue-Based Asynchronous Jobs:** Tugas sekunder yang tidak memblokir respon percakapan (seperti pembuatan judul otomatis, penghitungan analitik token agregat, dan audit log archiving) diproses menggunakan background worker via Redis Queue (BullMQ).
4. **Streaming Connection Saturation:** Mengoptimalkan batas *file descriptor* Linux (ulimit) dan konfigurasi keep-alive HTTP untuk menampung ribuan koneksi stream SSE terbuka secara bersamaan tanpa kehabisan soket TCP.

