# Coding Standards & Engineering Guidelines

**Versi Dokumen:** 1.0  
**Tanggal:** 7 November 2026  
**Status:** Mandatory Engineering Standard (For Human & AI Coding Agents)  
**Bahasa Pemrograman:** TypeScript (Strict Mode)  
**Referensi:** PRD, TDD, NFR-009

---

## 1. General Principles & Mindset

1. **Simplicity Over Cleverness (KISS):** Pilih solusi yang paling mudah dipahami, dibaca, dan diuji. Hindari abstraksi berlebihan yang tidak diminta oleh spesifikasi.
2. **Explicit is Better than Implicit:** Hindari "magic code", implicit global state, atau dynamic runtime monkey-patching. Tipe data harus dideklarasikan secara gamblang (*strictly typed*).
3. **No Dead or Speculative Code (YAGNI):** Jangan membuat fitur, fungsi pembantu, atau konfigurasi spekulatif yang tidak terkait langsung dengan User Stories dan Tasks saat ini.
4. **Preserve Documentation & Comments:** Jangan pernah menghapus komentar dokumentasi teknis atau docstring yang sudah ada tanpa instruksi eksplisit.

---

## 2. Naming Conventions

| Elemen Kode | Format Penamaan | Contoh Benar | Contoh Salah |
| :--- | :--- | :--- | :--- |
| **Berkas Kode Sumber (Backend)** | `kebab-case.ts` | `context-builder.ts`, `auth.service.ts` | `contextBuilder.ts`, `Auth_Service.ts` |
| **Komponen React (Frontend)** | `PascalCase.tsx` | `ChatViewport.tsx`, `SidebarDrawer.tsx`| `chatViewport.tsx`, `sidebar_drawer.tsx` |
| **Class & Interface** | `PascalCase` | `AIProviderAdapter`, `ConversationService`| `aIProviderAdapter`, `I_Conversation` |
| **Function & Method** | `camelCase` | `streamText()`, `validateSession()` | `StreamText()`, `validate_session()` |
| **Variabel & Properti Objek** | `camelCase` | `conversationId`, `maxTokens` | `conversation_id`, `MaxTokens` |
| **Konstanta Global & Enums** | `UPPER_SNAKE_CASE` | `MAX_INPUT_CHARS`, `DEFAULT_TIMEOUT_MS` | `MaxInputChars`, `default_timeout` |
| **Kolom Database & JSON API** | `snake_case` | `user_id`, `created_at`, `token_in` | `userId`, `createdAt`, `tokenIn` |
| **URL Route Endpoint** | `kebab-case` jamak | `/v1/conversations/:id/messages` | `/v1/get_messages`, `/v1/conversation`|

---

## 3. Project & Folder Structure Conventions

```
backend/
├── src/
│   ├── app.ts                  # Entry point aplikasi Fastify
│   ├── config/                 # Skema & pembacaan env (Zod)
│   ├── modules/                # Modul domain modular (Feature-based folder)
│   │   ├── [domain]/           # Misal: auth, conversations, orchestrator
│   │   │   ├── [domain].controller.ts  # HTTP Route Handler & DTO Schema
│   │   │   ├── [domain].service.ts     # Core Business Logic murni
│   │   │   ├── [domain].repository.ts  # Database access (Prisma / SQL)
│   │   │   └── [domain].types.ts       # Interface & Type definitions
│   ├── shared/                 # Utilitas bersama lintas domain
│   │   ├── database/           # Prisma client instance
│   │   ├── errors/             # AppError & Custom Exceptions
│   │   ├── middlewares/        # Auth guard, rate limit, logging hook
│   │   └── utils/              # Tokenizer, crypto, sanitizer
│   └── tests/                  # Unit, Integration, & E2E tests

frontend/
├── src/
│   ├── assets/                 # Gambar statis, logo SVG
│   ├── components/             # Reusable UI components (Button, Modal, Input)
│   ├── features/               # Fitur modular (chat, auth, settings)
│   │   ├── chat/
│   │   │   ├── components/     # ChatViewport, Composer, MessageItem
│   │   │   ├── hooks/          # useChatStream, useConversations
│   │   │   └── chatStore.ts    # Zustand / TanStack Query slice
│   ├── hooks/                  # Custom React hooks bersama
│   ├── lib/                    # Axios/Fetch client, Markdown parser, Utils
│   └── routes/                 # Routing pages (AppRoutes.tsx)
```

---

## 4. Type Safety & Validation Rules

1. **Strict TypeScript (`tsconfig.json`):**
   - `"strict": true` wajib aktif.
   - Dilarang keras menggunakan tipe `any`. Jika tipe benar-benar dinamis, gunakan `unknown` disertai *type narrowing / guard*.
2. **Schema-Driven Validation (Fail Fast):**
   - Semua payload HTTP masukan (body, query params, headers) **wajib divalidasi** menggunakan library skema (seperti TypeBox / Zod) pada layer routing controller.
   - Business service hanya boleh menerima data yang telah terbukti valid secara tipe.
   ```typescript
   // Contoh Validasi Input yang Benar
   export const SendMessageSchema = z.object({
     content: z.string().trim().min(1, "Pesan tidak boleh kosong").max(4000, "Maksimal 4000 karakter")
   });
   export type SendMessageDTO = z.infer<typeof SendMessageSchema>;
   ```

---

## 5. Error Handling & Standard Exceptions

1. **Gunakan Kelas Kesalahan Terstandarisasi (`AppError`):**
   ```typescript
   export class AppError extends Error {
     constructor(
       public readonly statusCode: number,
       public readonly errorCode: string,
       message: string,
       public readonly details?: unknown
     ) {
       super(message);
       Object.setPrototypeOf(this, new.target.prototype);
     }
   }
   ```
2. **Pola Penanganan Galat:**
   - Dilarang membiarkan blok `catch` kosong (*swallowed exception*).
   - Dilarang membocorkan *stack trace* internal atau pesan error basis data mentah kepada klien.
   - Tangkap exception yang tidak tertangani pada *Global Error Handler* Fastify, cetak log bersama `correlation_id`, dan kembalikan skema error seragam dengan HTTP 500.

---

## 6. Frontend Component & React Guidelines

1. **Functional Components with Hooks Only:** Tidak boleh menggunakan React Class Components.
2. **Single Responsibility Principle:** Pisahkan logika pemanggilan data (*custom hooks*) dari komponen tampilan murni (*presentational components*).
3. **Optimasi Rendering Streaming:**
   - Token streaming diterima dalam frekuensi tinggi. Hindari melakukan re-render seluruh daftar riwayat percakapan.
   - Pisahkan komponen `StreamingMessageBubble` sebagai *memoized component* (`React.memo`) agar hanya gelembung pesan aktif yang ter-render ulang saat menerima delta token.
4. **Sanitasi Konten Dinamis:**
   - Dilarang menggunakan `dangerouslySetInnerHTML` tanpa melewati *sanitizer* tersertifikasi (`DOMPurify`).

---

## 7. Testing Standards & Coverage

1. **Unit Testing:**
   - Wajib untuk komponen logika murni: `context-builder`, `tokenizer`, `crypto`, `circuit-breaker`.
   - Menggunakan mocking untuk dependensi eksternal (Database, Redis, Network API).
   - Target *code coverage* minimal **70%** untuk modul domain inti (NFR-009).
2. **Integration Testing:**
   - Menguji interaksi controller dengan database uji (PostgreSQL container) dan Redis.
   - Verifikasi isolasi data: Pastikan User A tidak dapat membaca percakapan User B (ekspektasi HTTP 404).
3. **Deterministic Tests:**
   - Dilarang menyematkan delay waktu sembarang (`sleep(5000)`) dalam pengujian otomatis. Gunakan *event-driven assertions* atau timer mock.

