# Traceability Matrix: Multi-Platform General-Purpose AI Assistant

**Versi Dokumen:** 1.0  
**Tanggal:** 7 November 2026  
**Status:** Approved Engineering Baseline  
**Tujuan:** Menjamin konsistensi penuh dan keterlacakan dari Kebutuhan Bisnis (PRD) hingga Kode dan Uji Coba

---

## 1. Functional Requirements Traceability Matrix

Matriks di bawah menghubungkan secara presisi:  
**PRD Functional Requirement (FR) → User Story → Fitur / Modul → API Endpoint → Database Entity → Dev Task → Test Case**

| PRD Req ID & Nama | User Story | Fitur / Komponen | API Endpoint | Entitas Database | Dev Task ID | Test Case ID |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **FR-001** Registrasi Akun | US-G01 | Modul Auth & Email Verification | `POST /v1/auth/register`<br>`POST /v1/auth/verify-email` | `users`<br>`identities` | TSK-1-05<br>TSK-1-06<br>TSK-1-07 | `API-INT-01`<br>`UI-01` |
| **FR-002** Login & Logout | US-G02 | Manajemen Sesi & Cookie | `POST /v1/auth/login`<br>`POST /v1/auth/logout` | `users`<br>Redis Session | TSK-1-08<br>TSK-1-09 | `API-INT-01`<br>`SEC-TEST-04` |
| **FR-003** Profil & Pengaturan | US-U12 | Pengaturan Tema & Bahasa | `GET /v1/me`<br>`PATCH /v1/me` | `users.preferences` | TSK-2-07<br>TSK-2-09 | `UI-05` |
| **FR-004** Chat Streaming Web | US-U01 | Conversation Service & SSE | `POST /v1/conversations/:id/messages` | `conversations`<br>`messages` | TSK-2-03<br>TSK-2-04<br>TSK-2-10 | `API-INT-03`<br>`UI-03` |
| **FR-005** Percakapan Baru | US-U02 | Inisiasi Sesi & Isolasi Konteks | `POST /v1/conversations` | `conversations` | TSK-2-01<br>TSK-2-09 | `API-INT-02`<br>`UI-02` |
| **FR-006** Riwayat & Multi-Sesi | US-U03 | Sidebar Riwayat Percakapan | `GET /v1/conversations`<br>`GET /v1/conversations/:id/messages` | `conversations`<br>`messages` | TSK-2-01<br>TSK-2-02<br>TSK-2-09 | `API-INT-02`<br>`UI-02` |
| **FR-007** Judul Otomatis & Edit | US-U04 | Background Title Worker | `PATCH /v1/conversations/:id` | `conversations.title` | TSK-2-01<br>TSK-2-06 | `API-INT-02` |
| **FR-008** Pencarian Percakapan | US-U05 | Search Engine Trigram GIN | `GET /v1/search?q=` | `conversations`<br>`messages` | TSK-2-01 | `API-INT-02` |
| **FR-009** Hapus Percakapan | US-U06 | Soft Delete & Modal Dialog | `DELETE /v1/conversations/:id` | `conversations.deleted_at` | TSK-2-01<br>TSK-2-09 | `API-INT-02`<br>`SEC-TEST-01` |
| **FR-010** Render Markdown & Kode | US-U07 | Markdown & Syntax Highlighter | Client-Side Renderer | N/A (Frontend) | TSK-2-11 | `UI-04`<br>`SEC-TEST-02` |
| **FR-011** Salin Teks & Kode | US-U08 | Clipboard Copy Utility | Client-Side Utility | N/A (Frontend) | TSK-2-11 | `UI-04` |
| **FR-012** Regenerate Respons | US-U09 | Re-execute Context Prompt | `POST /v1/messages/:id/regenerate` | `messages` | TSK-2-04 | `API-INT-03` |
| **FR-013** Edit Prompt Pengguna | US-U10 | Inline Edit & Re-prompt | `POST /v1/conversations/:id/messages` | `messages` | TSK-2-04<br>TSK-2-10 | `API-INT-03` |
| **FR-014** Hentikan Streaming | US-U11 | AbortController Signal | `POST /v1/conversations/:id/stop` | `messages.status` | TSK-2-05<br>TSK-2-12 | `API-INT-03` |
| **FR-015** Tema & Responsif | US-U12 | Tailwind Theme Engine | Client-Side Theme Engine | `users.preferences` | TSK-2-07 | `UI-05` |
| **FR-016** Telegram Start & ID | US-T01 | Telegram Webhook Provisioning | `POST /v1/telegram/webhook` | `users`<br>`identities` | TSK-3-01<br>TSK-3-03 | `TG-01` |
| **FR-017** Telegram Multi-Turn | US-T02 | Shared Orchestrator Dispatcher | `POST /v1/telegram/webhook` | `conversations`<br>`messages` | TSK-3-04 | `TG-01`<br>`TG-04` |
| **FR-018** Perintah Dasar Bot | US-T04 | grammY Command Router | `POST /v1/telegram/webhook` | N/A (Router) | TSK-3-03 | `TG-02` |
| **FR-019** Indikator Mengetik | US-T03 | Telegram Chat Action | `POST /v1/telegram/webhook` | N/A (Bot Action) | TSK-3-04 | `TG-01` |
| **FR-020** Account Linking | US-T05 | OTP Link Code Engine | `POST /v1/link/telegram-code`<br>`POST /v1/telegram/webhook` | `identities`<br>Redis OTP Link | TSK-3-06<br>TSK-3-07 | `TG-05` |
| **FR-021** Tangani Non-Teks TG | US-T06 | Non-Text Message Interceptor | `POST /v1/telegram/webhook` | N/A (Fast Filter) | TSK-3-05 | `TG-04` |
| **FR-022** Rate Limit & Kuota | US-X01 | Redis Sliding Window / Bucket | Seluruh Endpoint & `GET /v1/usage` | `usage_records`<br>Redis Quota | TSK-4-03 | `API-INT-04`<br>`TG-03` |
| **FR-023** Penanganan Error AI | US-A02 | Circuit Breaker & Fallback | Model Abstraction Layer | `messages.status` | TSK-4-01<br>TSK-4-02 | `AI-BENCH` |
| **FR-024** Hapus Akun Mandiri | US-X02 | Privacy Data Anonymizer & Purge | `DELETE /v1/me` | `users.deleted_at`<br>`audit_logs` | TSK-4-06 | `API-INT-01` |
| **FR-025** Konfigurasi Prompt | US-A01 | Dynamic Prompt Versioning | `GET/POST /v1/admin/prompts` | `prompt_versions`<br>`audit_logs` | TSK-4-05 | `API-INT-02` |
| **FR-026** Panel Admin Dasar | US-A02 | Operational Metrics & Suspend | Internal Admin Routes | `users.status`<br>`audit_logs` | TSK-4-04<br>TSK-4-06 | `SEC-TEST-01` |

---

## 2. Non-Functional Requirements Traceability Matrix

| NFR ID & Kategori | Target Spesifikasi | Strategi Implementasi & Komponen | Dokumen Acuan | Verifikasi / Pengujian |
| :--- | :--- | :--- | :--- | :--- |
| **NFR-001** Performa | TTFT p95 ≤ 3.0 detik; Pemuatan halaman ≤ 3s | Server-Sent Events, Fastify non-blocking, Vite SPA ringan | TDD Section 1<br>SYSTEM-ARCH Sec 2.1 | Performance Load Test (k6) |
| **NFR-002** Skalabilitas | Stateless backend, 100 concurrent users | Redis Session Store, Connection Pooling Prisma | TDD Section 8<br>DEPLOYMENT Sec 2 | Stress Load Testing |
| **NFR-003** Ketersediaan | Uptime bulanan ≥ 99.0% | Multi-provider AI Fallback, Docker auto-restart | MODEL-STRATEGY Sec 4<br>DEPLOYMENT Sec 1 | Uptime Monitoring Probe |
| **NFR-004** Keamanan | TLS 1.3, Argon2id, 0 API Key Client Leak | HttpOnly Cookie, Zod Sanitasi, Environment Secrets | SECURITY Sec 1, 2, 4 | SAST, Pentest, Secret Scanner |
| **NFR-005** Privasi | Zero cross-user data access | Row-level tenant filter `user_id`, 404 on breach | SECURITY Sec 3.2 | `SEC-TEST-01` Automated Suite |
| **NFR-006** Keandalan | Operasi idempoten webhook Telegram | Redis Deduplication Key (`update_id`) TTL 5 menit | TDD Sec 4.5<br>SYSTEM-ARCH Sec 2.2 | `API-INT-05` Webhook Test |
| **NFR-007** Kompatibilitas | Chrome, Edge, Firefox, Safari | Standar ES2022, Autoprefixer CSS, Semantic HTML | CODING-STANDARDS Sec 6 | Cross-Browser Playwright Test |
| **NFR-008** Aksesibilitas | WCAG 2.1 AA (Kontras 4.5:1, Keyboard a11y) | Radix UI Primitives, Focus Rings, ARIA Live Region | UI-UX-SPEC Sec 6 | Axe Accessibility Audit |
| **NFR-009** Maintainability| Cakupan uji logika inti ≥ 70% | Vitest Unit Test, Strict TypeScript, Modular Monolith | CODING-STANDARDS Sec 7<br>TEST-PLAN Sec 1 | Vitest Coverage Report |
| **NFR-010** Observabilitas | Correlation ID, JSON Pino Logs, Prometheus | Fastify Correlation Hook, Zero-PII Log Redaction | MONITORING Sec 1, 2 | Log Verification Test |
| **NFR-011** Portabilitas AI| Ganti provider AI murni via konfigurasi | `AIProviderAdapter` Pattern & Fallback Router | MODEL-STRATEGY Sec 1, 3 | Adapter Swap Automated Test |
| **NFR-012** Lokalisasi | Antarmuka & respons Bahasa Indonesia & Inggris | System Prompt Bilingual, i18n Dictionary Client | AI-BEHAVIOR Sec 3.2 | Golden Test Set Evaluation |

