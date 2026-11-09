# Development Tasks Breakdown: Multi-Platform General-Purpose AI Assistant

**Versi Dokumen:** 1.0  
**Tanggal:** 7 November 2026  
**Status:** Approved Task Backlog (Ready for Implementation)  
**Referensi:** PRD, TDD, User Stories, API Specification, Roadmap

---

## 1. Ikhtisar Struktur Task

Task dirancang secara modular dan berukuran terukur (*bite-sized*) agar dapat dieksekusi secara presisi oleh **AI coding agent** maupun pengembang manusia.

**Format Task ID:** `TSK-<Fase>-<Nomor>`  
**Status Nilai:** `[ ] To Do`, `[/] In Progress`, `[x] Done`

---

## 2. Rincian Task Berdasarkan Fase Pengembangan

### FASE 1: Fondasi Arsitektur, Basis Data & Autentikasi

#### Epic 1.1: Project Setup & Core Configuration
- [x] **TSK-1-01: Inisialisasi Repositori & Tooling Backend**
  - **Deskripsi:** Inisialisasi project Node.js Fastify dengan TypeScript, ESLint, Prettier, dan file konfigurasi `tsconfig.json` ketat (*strict mode*).
  - **Dependensi:** Tidak ada
  - **Prioritas:** Must Have
  - **Acceptance Criteria:** `npm run build` dan `npm run lint` berjalan sukses tanpa error.
  - **Ref:** BE-001, CODING-STANDARDS.md

- [x] **TSK-1-02: Konfigurasi Environment & Zod Validation**
  - **Deskripsi:** Buat modul `src/config/env.ts` untuk memuat dan memvalidasi seluruh environment variable (`DATABASE_URL`, `REDIS_URL`, `PORT`, `SESSION_SECRET`) menggunakan Zod.
  - **Dependensi:** TSK-1-01
  - **Prioritas:** Must Have
  - **Acceptance Criteria:** Server menolak *startup* dan menampilkan pesan kesalahan jelas jika variabel lingkungan wajib tidak terdefinisi.
  - **Ref:** BE-005, SEC-001

- [/] **TSK-1-03: Setup Prisma ORM & Skema Database Baseline**
  - **Deskripsi:** Definisikan skema Prisma berdasarkan `DATABASE-ERD.md` (tabel `users`, `identities`, `conversations`, `messages`, `usage_records`, `prompt_versions`, `audit_logs`) dan buat migrasi inisial.
  - **Dependensi:** TSK-1-02
  - **Prioritas:** Must Have
  - **Acceptance Criteria:** File migrasi SQL tercipta dan berhasil dieksekusi ke PostgreSQL lokal; relasi foreign key dan index terpasang.
  - **Ref:** DB-001, DB-002, BE-006

- [x] **TSK-1-04: Setup Koneksi Redis Client**
  - **Deskripsi:** Buat wrapper koneksi Redis (`ioredis`) dengan reconnect handler dan utilitas helper (get, set, expire, del).
  - **Dependensi:** TSK-1-02
  - **Prioritas:** Must Have
  - **Acceptance Criteria:** Koneksi Redis terverifikasi dengan ping/pong pada log startup backend.
  - **Ref:** TDD Section 2

#### Epic 1.2: Modul Autentikasi & Akun
- [x] **TSK-1-05: Modul Password Hashing (Argon2id)**
  - **Deskripsi:** Buat utilitas kriptografi `src/shared/utils/crypto.ts` untuk fungsi `hashPassword(plain)` dan `verifyPassword(plain, hash)` menggunakan `@node-rs/argon2`.
  - **Dependensi:** TSK-1-01
  - **Prioritas:** Must Have
  - **Acceptance Criteria:** Unit test memverifikasi string acak menghasilkan hash Argon2id yang valid dan dapat diverifikasi kembali; timing attack resistance.
  - **Ref:** AUTH-001, FR-001

- [x] **TSK-1-06: Endpoint Registrasi Akun Pengguna**
  - **Deskripsi:** Implementasikan `POST /v1/auth/register` dengan validasi email RFC 5322, password minimal 8 karakter, dan pembuatan entitas user berstatus `unverified`.
  - **Dependensi:** TSK-1-03, TSK-1-05
  - **Prioritas:** Must Have
  - **Acceptance Criteria:** Mengembalikan HTTP 201 Created; jika email duplikat, kembalikan respons netral pencegah enumerasi (US-G01).
  - **Ref:** FR-001, API-SPEC Section 2.1

- [x] **TSK-1-07: Layanan Verifikasi Email (Mock / SMTP)**
  - **Deskripsi:** Buat logic pengiriman token verifikasi email (SHA-256 hash di database, valid 24 jam) dan endpoint `POST /v1/auth/verify-email`.
  - **Dependensi:** TSK-1-06
  - **Prioritas:** Must Have
  - **Acceptance Criteria:** Token yang valid mengubah status pengguna menjadi `active`; token kadaluarsa ditolak (HTTP 400).
  - **Ref:** AUTH-005, US-G01

- [x] **TSK-1-08: Endpoint Login & Manajemen Cookie Sesi**
  - **Deskripsi:** Implementasikan `POST /v1/auth/login` dan `POST /v1/auth/logout`. Menerbitkan session ID di Redis dan mengirimkan HttpOnly SameSite=Strict cookie ke klien.
  - **Dependensi:** TSK-1-04, TSK-1-05
  - **Prioritas:** Must Have
  - **Acceptance Criteria:** Login sukses mengeset cookie; proteksi brute-force mengunci akun setelah 5 kali gagal; logout menghapus sesi dari Redis.
  - **Ref:** FR-002, AUTH-002, AUTH-004

- [x] **TSK-1-09: Middleware Auth Guard & Context Extractor**
  - **Deskripsi:** Buat Fastify plugin/hook untuk memvalidasi cookie sesi pada setiap route terproteksi dan menginjeksi `request.user` ke Fastify context.
  - **Dependensi:** TSK-1-08
  - **Prioritas:** Must Have
  - **Acceptance Criteria:** Request tanpa cookie sesi valid pada route terproteksi otomatis ditolak dengan HTTP 401 Unauthorized.
  - **Ref:** AUTH-003, SEC-002

#### Epic 1.3: Abstraksi Model AI Pertama
- [x] **TSK-1-10: Desain Interface `AIProviderAdapter`**
  - **Deskripsi:** Definisikan TypeScript interface standar untuk adapter LLM (`generate`, `stream`, `countTokens`, `healthCheck`).
  - **Dependensi:** TSK-1-01
  - **Prioritas:** Must Have
  - **Acceptance Criteria:** Interface diekspor di `src/modules/ai-providers/adapter.interface.ts`.
  - **Ref:** TDD Section 4.4, MODEL-STRATEGY Section 1

- [x] **TSK-1-11: Implementasi Adapter Model AI Primer**
  - **Deskripsi:** Buat class adapter untuk penyedia utama (OpenAI SDK atau Google Gemini SDK) yang mengimplementasikan metode streaming token (AsyncIterable).
  - **Dependensi:** TSK-1-10
  - **Prioritas:** Must Have
  - **Acceptance Criteria:** Unit/integration test dengan mock API memverifikasi chunk teks diterima secara bertahap dan metadata token dilaporkan.
  - **Ref:** FR-004, OBJ-03

---

### FASE 2: Inti Percakapan (Conversation Core) & Web Chat UI

#### Epic 2.1: Conversation Management Service
- [x] **TSK-2-01: CRUD Endpoint Percakapan**
  - **Deskripsi:** Implementasikan `GET /v1/conversations` (cursor pagination), `POST /v1/conversations`, `PATCH /v1/conversations/:id`, dan `DELETE /v1/conversations/:id` (soft delete).
  - **Dependensi:** TSK-1-09
  - **Prioritas:** Must Have
  - **Acceptance Criteria:** Seluruh kueri memfilter kepemilikan `user_id`; percakapan yang di-soft-delete mengembalikan HTTP 404 (US-U03, US-U06).
  - **Ref:** FR-005, FR-006, FR-009

- [x] **TSK-2-02: Endpoint Pengambilan Riwayat Pesan**
  - **Deskripsi:** Implementasikan `GET /v1/conversations/:id/messages` untuk memuat riwayat obrolan dalam urutan kronologis.
  - **Dependensi:** TSK-2-01
  - **Prioritas:** Must Have
  - **Acceptance Criteria:** Kueri memanfaatkan index `idx_messages_conversation_created` dan merespons ≤ 2.0 detik untuk 100 pesan.
  - **Ref:** FR-006, NFR-001

- [x] **TSK-2-03: Context Builder & Algoritma Sliding Window**
  - **Deskripsi:** Bangun modul `src/modules/orchestrator/context-builder.ts` yang merakit System Prompt + pesan riwayat mundur hingga batas token model.
  - **Dependensi:** TSK-1-10, TSK-2-02
  - **Prioritas:** Must Have
  - **Acceptance Criteria:** Unit test memverifikasi akumulasi token tidak melebihi alokasi dan System Prompt tidak pernah terbuang.
  - **Ref:** FR-017, AI-BEHAVIOR Section 4

- [x] **TSK-2-04: Endpoint Streaming Pesan (SSE)**
  - **Deskripsi:** Implementasikan `POST /v1/conversations/:id/messages` yang menerima prompt pengguna, memanggil AI Orchestrator, dan mengalirkan chunk SSE (`text/event-stream`).
  - **Dependensi:** TSK-1-11, TSK-2-03
  - **Prioritas:** Must Have
  - **Acceptance Criteria:** Event stream mengirimkan event `session`, `token`, dan `done`; teks lengkap tersimpan di DB setelah selesai.
  - **Ref:** FR-004, RH-001, API-SPEC Section 4.4

- [x] **TSK-2-05: Fitur Stop Generation & Simpan Parsial**
  - **Deskripsi:** Implementasikan `POST /v1/conversations/:id/stop` untuk membatalkan sinyal AbortController pada panggilan model LLM dan menandai status pesan `incomplete`.
  - **Dependensi:** TSK-2-04
  - **Prioritas:** Should Have
  - **Acceptance Criteria:** Eksekusi inferensi dihentikan dalam ≤ 2.0 detik setelah endpoint dipanggil (US-U11).
  - **Ref:** FR-014, RH-003

- [x] **TSK-2-06: Asynchronous Title Generation**
  - **Deskripsi:** Buat background job pembuat judul percakapan otomatis (≤ 5 kata) setelah turn pesan pertama tuntas.
  - **Dependensi:** TSK-2-04
  - **Prioritas:** Should Have
  - **Acceptance Criteria:** Judul terbarui di DB tanpa memblokir respons obrolan utama; fallback ke potongan pesan pertama jika gagal.
  - **Ref:** FR-007, BE-004

#### Epic 2.2: Frontend Web Application (React SPA)
- [x] **TSK-2-07: Inisialisasi Vite + React + Tailwind CSS**
  - **Deskripsi:** Setup project SPA frontend dengan TypeScript, Tailwind CSS, Radix UI Primitives, dan Lucide Icons.
  - **Dependensi:** Tidak ada (dapat paralel)
  - **Prioritas:** Must Have
  - **Acceptance Criteria:** Tema gelap/terang (Dark Mode) berfungsi dengan class `dark` pada elemen root HTML.
  - **Ref:** DESIGN-SYSTEM.md, WEB-001

- [x] **TSK-2-08: Halaman Autentikasi (Login & Registrasi UI)**
  - **Deskripsi:** Buat tampilan antarmuka form Login, Register, dan Notifikasi Verifikasi Email dengan validasi input ramah pengguna.
  - **Dependensi:** TSK-2-07
  - **Prioritas:** Must Have
  - **Acceptance Criteria:** Form terhubung dengan endpoint auth backend; menampilkan pesan error generik saat kredensial salah.
  - **Ref:** US-G01, US-G02

- [x] **TSK-2-09: Komponen Sidebar Riwayat Obrolan**
  - **Deskripsi:** Bangun komponen Sidebar: tombol "Chat Baru", daftar percakapan terkelompok waktu, pop-up edit judul dan hapus, serta menu profil pengguna di footer.
  - **Dependensi:** TSK-2-01, TSK-2-07
  - **Prioritas:** Must Have
  - **Acceptance Criteria:** Sidebar responsif (tetap pada desktop ≥ 1024px, drawer modal pada mobile < 1024px).
  - **Ref:** UI-UX-SPEC Section 3.1

- [x] **TSK-2-10: Komponen Viewport Percakapan & SSE Stream Consumer**
  - **Deskripsi:** Bangun area chat yang mengonsumsi stream SSE via `fetch-event-source`, merender token bertahap, auto-scroll ke bawah, dan indikator cursor blink.
  - **Dependensi:** TSK-2-04, TSK-2-07
  - **Prioritas:** Must Have
  - **Acceptance Criteria:** TTFT terukur lancar di UI; user scroll ke atas menjeda auto-scroll dan memunculkan tombol "Scroll to bottom".
  - **Ref:** US-U01, UI-UX-SPEC Section 3.2

- [x] **TSK-2-11: Renderer Markdown, Syntax Highlighting & Tombol Salin**
  - **Deskripsi:** Integrasikan `react-markdown`, `remark-gfm`, dan `rehype-highlight` dengan pembersih HTML sanitasi (DOMPurify). Buat tombol "Salin Kode" satu klik.
  - **Dependensi:** TSK-2-10
  - **Prioritas:** Must Have
  - **Acceptance Criteria:** Kode terformat rapi dengan latar kontras; tombol salin memindahkan teks ke clipboard dan menampilkan tooltip "Tersalin!".
  - **Ref:** FR-010, FR-011, US-U07, US-U08

- [x] **TSK-2-12: Komponen Composer Input & Tombol Stop**
  - **Deskripsi:** Buat input textarea auto-expanding (1-6 baris), shortcut Enter (kirim) dan Shift+Enter (baris baru), serta transisi dinamis tombol Kirim ke tombol Stop.
  - **Dependensi:** TSK-2-05, TSK-2-10
  - **Prioritas:** Must Have
  - **Acceptance Criteria:** Tombol kirim nonaktif saat input kosong; berganti menjadi tombol Stop saat respons sedang ber-streaming.
  - **Ref:** UI-UX-SPEC Section 3.3

---

### FASE 3: Integrasi Telegram Bot & Sinkronisasi Akun

#### Epic 3.1: Telegram Webhook & Handler
- [x] **TSK-3-01: Setup grammY Framework & Route Webhook**
  - **Deskripsi:** Buat route `POST /v1/telegram/webhook` yang memvalidasi header rahasia `X-Telegram-Bot-Api-Secret-Token`.
  - **Dependensi:** TSK-1-02
  - **Prioritas:** Must Have
  - **Acceptance Criteria:** Request tanpa token rahasia valid ditolak HTTP 403; request valid dibalas HTTP 200 instan.
  - **Ref:** TGB-001, SECURITY Section 7

- [x] **TSK-3-02: Idempotency Guard Telegram Update**
  - **Deskripsi:** Simpan `update_id` Telegram di Redis (`SET update_id:<id> 1 EX 300 NX`).
  - **Dependensi:** TSK-1-04, TSK-3-01
  - **Prioritas:** Must Have
  - **Acceptance Criteria:** Update ID yang sama diabaikan agar bot tidak memproses pesan berulang saat terjadi network retry Telegram.
  - **Ref:** TGB-003, NFR-006

- [x] **TSK-3-03: Perintah Bot Dasar (/start, /help, /new, /usage)**
  - **Deskripsi:** Daftarkan handler perintah bot: `/start` (auto-register user Telegram), `/help` (bantuan), `/new` (reset konteks sesi), `/usage` (cek kuota token).
  - **Dependensi:** TSK-3-01
  - **Prioritas:** Must Have
  - **Acceptance Criteria:** Setiap perintah memberikan respons teks ≤ 2.0 detik; `/new` membersihkan riwayat obrolan aktif (US-T01, US-T04).
  - **Ref:** FR-016, FR-018

- [x] **TSK-3-04: Penanganan Pesan Teks & Typing Action**
  - **Deskripsi:** Teruskan pesan teks Telegram ke *Conversation Service*, picu `sendChatAction(action="typing")`, format balasan ke HTML, dan pecah pesan jika > 4.096 karakter.
  - **Dependensi:** TSK-2-04, TSK-3-01
  - **Prioritas:** Must Have
  - **Acceptance Criteria:** Bot merespons dengan konteks multi-turn; pesan panjang terpecah di batas paragraf tanpa terpotong acak (US-T02, US-T03).
  - **Ref:** FR-017, FR-019, TGB-004

- [x] **TSK-3-05: Penolakan Ramah Pesan Non-Teks**
  - **Deskripsi:** Deteksi input foto, audio, stiker, atau dokumen, lalu balas dengan pesan edukasi batas layanan MVP tanpa memanggil AI.
  - **Dependensi:** TSK-3-01
  - **Prioritas:** Must Have
  - **Acceptance Criteria:** Mengirim pesan edukasi ramah; tidak ada token AI yang dikonsumsi (US-T06).
  - **Ref:** FR-021, BR-005

#### Epic 3.2: Account Linking (Web - Telegram)
- [x] **TSK-3-06: Endpoint Pembuatan Kode Penautan Web**
  - **Deskripsi:** Implementasikan `POST /v1/link/telegram-code` yang menghasilkan kode 6 karakter acak dan menyimpannya di Redis (TTL 600 detik).
  - **Dependensi:** TSK-1-09
  - **Prioritas:** Should Have
  - **Acceptance Criteria:** Mengembalikan kode dan instruksi penautan yang valid selama 10 menit (US-T05).
  - **Ref:** FR-020, API-SPEC Section 5.2

- [x] **TSK-3-07: Eksekusi Perintah `/link <KODE>` di Telegram**
  - **Deskripsi:** Implementasikan verifikasi kode di bot Telegram untuk memetakan `telegram_id` ke akun Web di tabel `identities`.
  - **Dependensi:** TSK-3-06
  - **Prioritas:** Should Have
  - **Acceptance Criteria:** Setelah sukses, pesan yang dibuat di Telegram dapat diakses di Web; kuota dihitung terpadu (US-T05, BR-004).
  - **Ref:** FR-020, AUTH-007

---

### FASE 4: Pengerasan Sistem, Keamanan, & Observabilitas

#### Epic 4.1: Multi-Provider Fallback & Rate Limiting
- [x] **TSK-4-01: Implementasi Adapter Model AI Sekunder (Fallback)**
  - **Deskripsi:** Buat class adapter kedua (misal: Anthropic Claude atau Groq/Gemini) yang mengimplementasikan `AIProviderAdapter`.
  - **Dependensi:** TSK-1-10
  - **Prioritas:** Must Have
  - **Acceptance Criteria:** Dua adapter model siap pakai dapat dipertukarkan tanpa mengubah core business logic (OBJ-03).
  - **Ref:** FR-023, MODEL-STRATEGY Section 2

- [x] **TSK-4-02: Circuit Breaker & Automatic Fallback Router**
  - **Deskripsi:** Buat router yang otomatis mengalihkan permintaan ke Adapter Sekunder jika Adapter Primer mengalami HTTP 5xx atau timeout 60 detik.
  - **Dependensi:** TSK-1-11, TSK-4-01
  - **Prioritas:** Must Have
  - **Acceptance Criteria:** Jika mock provider utama gagal, sistem otomatis menyelesaikan respons melalui provider kedua tanpa kegagalan ke pengguna.
  - **Ref:** FR-023, MODEL-STRATEGY Section 4

- [x] **TSK-4-03: Penegakan Rate Limiting & Kuota Token Harian di Redis**
  - **Deskripsi:** Buat middleware guard yang melacak jumlah token harian pengguna dan batasan request per menit (sliding window).
  - **Dependensi:** TSK-1-04
  - **Prioritas:** Must Have
  - **Acceptance Criteria:** Pengguna yang melampaui kuota harian (50.000 token) ditolak dengan HTTP 429 dan info waktu reset (US-X01).
  - **Ref:** FR-022, TK-002, TK-004

#### Epic 4.2: Keamanan, Audit & Observabilitas
- [x] **TSK-4-04: Structured Logging & Correlation ID Tracing**
  - **Deskripsi:** Konfigurasikan logger (Pino) dengan injeksi `X-Correlation-ID` pada setiap baris log. Redaksi otomatis token dan data kredensial; larang logging isi pesan percakapan.
  - **Dependensi:** TSK-1-01
  - **Prioritas:** Must Have
  - **Acceptance Criteria:** Log tercetak dalam format JSON terstruktur tanpa memuat teks prompt atau jawaban percakapan.
  - **Ref:** MON-001, SECURITY Section 8

- [x] **TSK-4-05: Dynamic Prompt Configuration via Database**
  - **Deskripsi:** Implementasikan pembacaan System Prompt dari tabel `prompt_versions` dengan mekanisme caching Redis lokal.
  - **Dependensi:** TSK-1-03
  - **Prioritas:** Should Have
  - **Acceptance Criteria:** Mengubah status `is_active` di database langsung mengubah system prompt pada percakapan baru tanpa restart server (US-A01).
  - **Ref:** FR-025, PM-001

- [x] **TSK-4-06: Endpoint Hapus Akun & Data Mandiri (Privacy Purge)**
  - **Deskripsi:** Implementasikan `DELETE /v1/me` dengan proteksi konfirmasi password, soft-delete, dan anonimisasi email.
  - **Dependensi:** TSK-1-08
  - **Prioritas:** Must Have
  - **Acceptance Criteria:** Akun dinonaktifkan seketika; sesi dicabut di Redis; pengguna tidak dapat login kembali (US-X02).
  - **Ref:** FR-024, BR-006

