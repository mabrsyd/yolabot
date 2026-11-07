# API Specification: Multi-Platform General-Purpose AI Assistant

**Versi Dokumen:** 1.0  
**Tanggal:** 7 November 2026  
**Status:** Approved Technical Baseline  
**Base URL:** `https://api.assistant.domain/v1` (Production) / `http://localhost:3000/v1` (Development)  
**Referensi:** PRD Section 40 (API Requirements)

---

## 1. API Conventions & Standards

1. **Protocol:** RESTful API over HTTPS (TLS 1.3) untuk operasi standar, dan **Server-Sent Events (SSE)** via HTTP streaming untuk generasi token percakapan.
2. **Format Data:** JSON (`application/json; charset=utf-8`) untuk semua payload permintaan dan respons normal. Format `text/event-stream` untuk endpoint streaming.
3. **Penamaan:** 
   - URL path menggunakan pola `kebab-case` jamak (misal: `/v1/conversations`).
   - JSON keys pada request body dan response menggunakan format `snake_case`.
4. **Header Wajib:**
   - `Content-Type: application/json`
   - `X-Correlation-ID: <UUID>` (Dibuat otomatis oleh klien atau di-inject oleh gateway untuk *distributed tracing*).
5. **Autentikasi:**
   - Klien Web: Sesi berbasis HttpOnly Secure Cookie (`session_id`).
   - Telegram Webhook: Header otentikasi rahasia `X-Telegram-Bot-Api-Secret-Token`.
6. **Skema Respons Standar:**
   ```json
   {
     "success": true,
     "data": { ... },
     "meta": {
       "correlation_id": "c1f7b824-3f11-4c12-8854-9405d4b533cb",
       "timestamp": "2026-11-07T11:45:00.000Z"
     }
   }
   ```
7. **Skema Respons Galat Standar (Uniform Error Envelope):**
   ```json
   {
     "success": false,
     "error": {
       "code": "RATE_LIMIT_EXCEEDED",
       "message": "Kuota token harian Anda telah habis. Kuota akan direset pada pukul 00:00 UTC.",
       "details": {
         "reset_at": "2026-11-08T00:00:00.000Z",
         "current_usage": 50000,
         "limit": 50000
       }
     },
     "meta": {
       "correlation_id": "c1f7b824-3f11-4c12-8854-9405d4b533cb",
       "timestamp": "2026-11-07T11:45:00.000Z"
     }
   }
   ```

---

## 2. Authentication & Account Endpoints

### 2.1 POST `/auth/register`
Mendaftarkan akun pengguna baru dengan email dan password.
- **Auth:** Publik
- **Request Body:**
  ```json
  {
    "email": "user@example.com",
    "password": "Password123!",
    "display_name": "Budi Santoso"
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "data": {
      "user_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
      "email": "user@example.com",
      "status": "unverified",
      "message": "Registrasi berhasil. Silakan periksa email Anda untuk verifikasi."
    }
  }
  ```

### 2.2 POST `/auth/verify-email`
Verifikasi token email aktivasi akun.
- **Auth:** Publik
- **Request Body:**
  ```json
  {
    "token": "7a3f89e2-45bc-4882-a912-cf478a48b812"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "status": "active",
      "message": "Email berhasil diverifikasi. Silakan masuk."
    }
  }
  ```

### 2.3 POST `/auth/login`
Autentikasi kredensial pengguna dan menerbitkan session cookie.
- **Auth:** Publik
- **Request Body:**
  ```json
  {
    "email": "user@example.com",
    "password": "Password123!"
  }
  ```
- **Set-Cookie Header:** `session_id=<token>; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=604800`
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "user": {
        "id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
        "email": "user@example.com",
        "display_name": "Budi Santoso",
        "role": "user"
      }
    }
  }
  ```

### 2.4 POST `/auth/logout`
Mencabut sesi aktif pengguna dari Redis dan menghapus cookie.
- **Auth:** Session Cookie Wajib
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "message": "Logout berhasil."
    }
  }
  ```

---

## 3. User Profile & Settings Endpoints

### 3.1 GET `/me`
Mengambil profil pengguna saat ini, status penautan Telegram, dan preferensi antarmuka.
- **Auth:** Sesi Pengguna
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
      "email": "user@example.com",
      "display_name": "Budi Santoso",
      "role": "user",
      "preferences": {
        "theme": "dark",
        "language": "id"
      },
      "identities": [
        { "provider": "web", "external_id": "user@example.com", "linked_at": "2026-11-01T10:00:00.000Z" },
        { "provider": "telegram", "external_id": "987654321", "linked_at": "2026-11-05T14:20:00.000Z" }
      ]
    }
  }
  ```

### 3.2 PATCH `/me`
Memperbarui nama profil dan preferensi UI.
- **Auth:** Sesi Pengguna
- **Request Body:**
  ```json
  {
    "display_name": "Budi S.",
    "preferences": {
      "theme": "light",
      "language": "en"
    }
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "message": "Profil berhasil diperbarui."
    }
  }
  ```

### 3.3 DELETE `/me`
Menghapus seluruh akun dan data riwayat pengguna (Soft-Delete & GDPR/UU PDP Compliance).
- **Auth:** Sesi Pengguna (Wajib menyertakan konfirmasi kata sandi)
- **Request Body:**
  ```json
  {
    "password": "Password123!"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "message": "Akun Anda telah dinonaktifkan dan dijadwalkan untuk pembersihan permanen dalam 30 hari."
    }
  }
  ```

---

## 4. Conversation Endpoints

### 4.1 GET `/conversations`
Mengambil daftar sesi percakapan milik pengguna aktif (Paginasi berbasis kursor).
- **Auth:** Sesi Pengguna
- **Query Params:**
  - `limit`: Integer (Default: 20, Max: 100)
  - `cursor`: UUID (ID percakapan terakhir untuk paginasi)
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "items": [
        {
          "id": "2d1a3c5e-6b8f-4d9e-1a2b-3c4d5e6f7a8b",
          "title": "Analisis Kode Golang Concurrency",
          "source_platform": "web",
          "created_at": "2026-11-07T08:10:00.000Z",
          "updated_at": "2026-11-07T08:15:30.000Z"
        }
      ],
      "pagination": {
        "has_more": true,
        "next_cursor": "2d1a3c5e-6b8f-4d9e-1a2b-3c4d5e6f7a8b"
      }
    }
  }
  ```

### 4.2 POST `/conversations`
Membuat wadah percakapan baru secara manual (opsional, dapat dibuat otomatis pada pesan pertama).
- **Auth:** Sesi Pengguna
- **Request Body:**
  ```json
  {
    "title": "Percakapan Baru"
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "data": {
      "id": "2d1a3c5e-6b8f-4d9e-1a2b-3c4d5e6f7a8b",
      "title": "Percakapan Baru",
      "created_at": "2026-11-07T08:10:00.000Z"
    }
  }
  ```

### 4.3 GET `/conversations/{id}/messages`
Memuat seluruh riwayat pesan pada sesi percakapan tertentu.
- **Auth:** Sesi Pengguna (Isolasi data: mengembalikan 404 jika bukan milik pengguna aktif)
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "conversation_id": "2d1a3c5e-6b8f-4d9e-1a2b-3c4d5e6f7a8b",
      "title": "Analisis Kode Golang Concurrency",
      "messages": [
        {
          "id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
          "role": "user",
          "content": "Jelaskan konsep Goroutine dan Channel pada Go!",
          "created_at": "2026-11-07T08:10:15.000Z"
        },
        {
          "id": "f9e8d7c6-b5a4-3210-fedc-ba9876543210",
          "role": "assistant",
          "content": "Goroutine adalah thread ringan yang dikelola oleh Go runtime...",
          "status": "complete",
          "model": "gpt-4o",
          "created_at": "2026-11-07T08:10:18.000Z"
        }
      ]
    }
  }
  ```

### 4.4 POST `/conversations/{id}/messages` (Streaming Response via SSE)
Mengirim pesan prompt baru dan menerima respons bertahap (*token streaming*).
- **Auth:** Sesi Pengguna
- **Headers:** `Accept: text/event-stream`
- **Request Body:**
  ```json
  {
    "content": "Tuliskan contoh kodenya!"
  }
  ```
- **Response Headers:**
  - `Content-Type: text/event-stream`
  - `Cache-Control: no-cache`
  - `Connection: keep-alive`
- **Stream Event Payload Flow:**
  ```
  event: session
  data: {"message_id": "f9e8d7c6-b5a4-3210-fedc-ba9876543210", "conversation_id": "2d1a3c5e-6b8f-4d9e-1a2b-3c4d5e6f7a8b"}

  event: token
  data: {"delta": "Berikut "}

  event: token
  data: {"delta": "adalah contoh kodenya:\n\n```go\npackage main..."}

  event: done
  data: {"finish_reason": "stop", "token_in": 45, "token_out": 210}
  ```

### 4.5 POST `/conversations/{id}/stop`
Menghentikan proses inferensi streaming yang sedang berlangsung.
- **Auth:** Sesi Pengguna
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "message": "Generasi dihentikan. Pesan parsial telah disimpan."
    }
  }
  ```

### 4.6 PATCH `/conversations/{id}`
Mengubah judul percakapan.
- **Auth:** Sesi Pengguna
- **Request Body:**
  ```json
  {
    "title": "Panduan Lengkap Goroutine"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "id": "2d1a3c5e-6b8f-4d9e-1a2b-3c4d5e6f7a8b",
      "title": "Panduan Lengkap Goroutine"
    }
  }
  ```

### 4.7 DELETE `/conversations/{id}`
Menghapus percakapan (Soft-Delete).
- **Auth:** Sesi Pengguna
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "message": "Percakapan berhasil dihapus."
    }
  }
  ```

---

## 5. Utility, Search & Integration Endpoints

### 5.1 GET `/search?q={query}`
Mencari kata kunci pada judul dan isi pesan milik pengguna aktif (FR-008).
- **Auth:** Sesi Pengguna
- **Query Params:** `q`: String (Min 2 karakter)
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "results": [
        {
          "conversation_id": "2d1a3c5e-6b8f-4d9e-1a2b-3c4d5e6f7a8b",
          "title": "Panduan Lengkap Goroutine",
          "matched_snippet": "...konsep *Goroutine* dan Channel pada Go...",
          "updated_at": "2026-11-07T08:15:30.000Z"
        }
      ]
    }
  }
  ```

### 5.2 POST `/link/telegram-code`
Menghasilkan kode acak 6 digit sekali pakai untuk menautkan akun Web ke bot Telegram (FR-020).
- **Auth:** Sesi Pengguna
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "code": "TG-89A2",
      "expires_in_seconds": 600,
      "bot_username": "MyAIAssistantBot",
      "instructions": "Buka bot di Telegram dan kirim perintah: /link TG-89A2"
    }
  }
  ```

### 5.3 POST `/telegram/webhook`
Endpoint penerima update dari Telegram Cloud Server (TGB-001).
- **Auth:** Validasi Header `X-Telegram-Bot-Api-Secret-Token: <SECRET_STRING>`
- **Request Body:** Objek Update Telegram resmi (`update_id`, `message`, dsb.)
- **Response (200 OK):** `{"ok": true}` (Wajib merespons instan < 3 detik agar Telegram tidak me-retry).

### 5.4 GET `/usage`
Melihat status kuota token dan batasan permintaan pengguna (FR-022, TK-004).
- **Auth:** Sesi Pengguna
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "period": "daily",
      "tokens_used_today": 12450,
      "tokens_limit_daily": 50000,
      "tokens_remaining": 37550,
      "requests_count_today": 24,
      "reset_time_utc": "2026-11-08T00:00:00.000Z"
    }
  }
  ```

---

## 6. HTTP Status Codes & Error Code Registry

| HTTP Status | Error Code | Arti & Tindakan |
| :--- | :--- | :--- |
| **400 Bad Request** | `INVALID_INPUT` | Parameter atau payload JSON tidak valid skemanya. |
| **401 Unauthorized** | `AUTH_REQUIRED` / `SESSION_EXPIRED` | Sesi tidak ditemukan atau telah kedaluwarsa. |
| **403 Forbidden** | `FORBIDDEN_ACCESS` | Mencoba mengakses data pengguna lain atau Telegram webhook secret salah. |
| **404 Not Found** | `RESOURCE_NOT_FOUND` | ID percakapan atau pesan tidak ditemukan (atau telah di-soft-delete). |
| **429 Too Many Requests** | `RATE_LIMIT_EXCEEDED` / `QUOTA_EXHAUSTED` | Melebihi batasan per menit (sliding window) atau kuota token harian habis. |
| **500 Internal Error** | `SERVER_ERROR` | Kesalahan tidak terduga pada backend (Correlation ID dicatat untuk investigasi). |
| **503 Service Unavailable** | `AI_PROVIDER_UNAVAILABLE` | Seluruh penyedia AI (primer & fallback) mengalami downtime atau timeout > 60s. |

