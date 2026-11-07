# System Architecture: Multi-Platform General-Purpose AI Assistant

**Versi Dokumen:** 1.0  
**Tanggal:** 7 November 2026  
**Status:** Approved Technical Baseline  
**Referensi:** PRD Section 36 (System Architecture), Section 37-39

---

## 1. High-Level Architecture Overview

Sistem mengadopsi pola **API-First Unified Backend Architecture**. Seluruh antarmuka pengguna—baik aplikasi Web Single-Page Application (SPA) maupun bot perpesanan Telegram—berkomunikasi dengan satu lapisan backend terpadu. Pendekatan ini menjamin bahwa seluruh aturan bisnis, perakitan prompt AI, pembatasan kuota (*rate limiting*), dan isolasi data diterapkan secara seragam dan konsisten.

```mermaid
graph TB
    subgraph Clients["Lapisan Klien & Saluran Masuk (Clients)"]
        WEB["Web Browser (React SPA)<br>Desktop / Tablet / Mobile"]
        TG_APP["Aplikasi Telegram<br>(Mobile / Desktop / Web)"]
    end

    subgraph EntryPoint["Lapisan Masuk & Keamanan (Edge / Gateway)"]
        CF["Reverse Proxy / Cloudflare Edge<br>(TLS 1.3, DDoS Guard, WAF)"]
        TG_SERVER["Telegram Cloud Server<br>(Bot API Webhook Delivery)"]
    end

    subgraph AppServer["Shared Backend (Node.js / Fastify Modular Monolith)"]
        API_GW["API Gateway & Router<br>(Auth Guard, Rate Limiter, Correlation ID)"]
        
        subgraph CoreServices["Modul Layanan Inti"]
            AUTH_SRV["Auth & Identity Service"]
            USER_SRV["User & Settings Service"]
            CONV_SRV["Conversation Service"]
            TELEGRAM_ADAPTER["Telegram Webhook Adapter"]
        end

        subgraph AI_Core["AI Orchestration Engine"]
            ORCHESTRATOR["AI Orchestrator"]
            PROMPT_MGR["Prompt Manager (DB Versioned)"]
            CTX_BUILDER["Context Builder (Sliding Window)"]
            ABSTRACTION["Model Abstraction Layer<br>(Fallback & Circuit Breaker)"]
        end
    end

    subgraph Adapters["Model Adapters"]
        ADAPT_A["Adapter A: Primary LLM API<br>(e.g., OpenAI / Gemini)"]
        ADAPT_B["Adapter B: Secondary LLM API<br>(Fallback Provider)"]
        ADAPT_SH["Adapter C: Self-Hosted LLM<br>(Post-MVP / Extensibility)"]
    end

    subgraph DataStorage["Lapisan Penyimpanan Data (Persistence & Cache)"]
        PG[("PostgreSQL 15+<br>Users, Identities, Conversations,<br>Messages, Prompts, Audit Logs")]
        REDIS[("Redis 7+<br>Sessions, Rate Limit Buckets,<br>Telegram Link Codes, Deduplication")]
    end

    subgraph ThirdParty["Layanan Eksternal Pihak Ketiga"]
        EXT_AI_A["Penyedia AI Primer"]
        EXT_AI_B["Penyedia AI Sekunder"]
        SMTP["Layanan Email Transaksional"]
    end

    %% Relasi Aliran
    WEB -->|HTTPS REST / SSE Streaming| CF
    TG_APP -->|Pesan Pengguna| TG_SERVER
    TG_SERVER -->|HTTPS Webhook POST| CF
    
    CF --> API_GW
    API_GW --> AUTH_SRV
    API_GW --> USER_SRV
    API_GW --> CONV_SRV
    API_GW --> TELEGRAM_ADAPTER

    TELEGRAM_ADAPTER -->|Internal Service Call| CONV_SRV
    TELEGRAM_ADAPTER -->|Internal Service Call| AUTH_SRV
    
    CONV_SRV --> ORCHESTRATOR
    ORCHESTRATOR --> PROMPT_MGR
    ORCHESTRATOR --> CTX_BUILDER
    ORCHESTRATOR --> ABSTRACTION

    ABSTRACTION --> ADAPT_A
    ABSTRACTION --> ADAPT_B
    ABSTRACTION -.-> ADAPT_SH

    ADAPT_A -->|HTTPS Streaming| EXT_AI_A
    ADAPT_B -->|HTTPS Streaming| EXT_AI_B
    AUTH_SRV -->|Kirim Token Verifikasi| SMTP

    AUTH_SRV --> PG
    USER_SRV --> PG
    CONV_SRV --> PG
    PROMPT_MGR --> PG

    API_GW --> REDIS
    TELEGRAM_ADAPTER --> REDIS
    AUTH_SRV --> REDIS
```

---

## 2. Component Architecture Breakdown

### 2.1 Web Frontend Architecture (React SPA)
Frontend Web dikembangkan sebagai Single-Page Application (SPA) yang sepenuhnya terpisah dari server backend:
- **Routing & Navigation:** Menggunakan *React Router* untuk memisahkan rute publik (`/login`, `/register`, `/verify-email`) dan rute terproteksi (`/chat`, `/chat/:conversationId`, `/settings`).
- **SSE Stream Consumer:** Menggunakan utilitas `fetch-event-source` untuk mengonsumsi Server-Sent Events (SSE) dari endpoint `POST /v1/conversations/:id/messages`. Menangani pemrosesan chunk per kata secara reaktif tanpa re-render berlebihan.
- **Markdown & Code Parser:** Komponen renderer menggunakan `react-markdown` yang dipadukan dengan plugin `remark-gfm` (tabel, task list) dan `rehype-highlight` / `rehype-prism` untuk pewarnaan blok kode. Seluruh keluaran disanitasi menggunakan `rehype-sanitize` untuk menangkal serangan XSS.
- **State Store:** 
  - *Server State:* `TanStack Query` mengelola caching daftar percakapan, pesan, dan status kuota.
  - *UI State:* `Zustand` menyimpan status sidebar (buka/tutup), modal konfirmasi, preferensi tema lokal, dan buffer input composer.

```mermaid
graph LR
    subgraph WebSPA["Arsitektur Klien Web (React SPA)"]
        UI["Antarmuka Chat & Composer"] --> ZUSTAND["Zustand UI Store<br>(Sidebar, Active Chat, Local Theme)"]
        UI --> REACT_QUERY["TanStack Query<br>(Cache Percakapan & Pesan)"]
        UI --> SSE_CLIENT["SSE Stream Client<br>(fetch-event-source)"]
        SSE_CLIENT --> SANITIZER["Sanitizer & Markdown Engine<br>(DOMPurify + PrismJS)"]
        SANITIZER --> UI
    end
    SSE_CLIENT -->|HTTP POST + SSE Stream| API_BACKEND["Fastify Backend API"]
```

---

### 2.2 Telegram Integration Architecture (Adapter Pattern)
Komponen Telegram Bot dirancang sebagai *adapter tipis* (*thin inbound/outbound adapter*):
- **Inbound Webhook Verification:** Memvalidasi header `X-Telegram-Bot-Api-Secret-Token`. Jika tidak cocok, request langsung ditolak (HTTP 403).
- **Idempotency Guard:** `update_id` dari setiap payload Telegram disimpan di Redis menggunakan perintah `SET update_id:<id> 1 EX 300 NX`. Jika update duplikat tiba akibat retry Telegram, request langsung dibalas HTTP 200 tanpa dieksekusi ulang.
- **Message Dispatcher:**
  - Perintah bot (`/start`, `/help`, `/new`, `/reset`, `/link`, `/usage`) diterjemahkan menjadi pemanggilan fungsi domain internal.
  - Pesan teks diteruskan ke `ConversationService.sendMessage()`.
  - Pesan non-teks langsung dibalas dengan pesan edukasi batas layanan tanpa memicu AI.
- **Outbound Chunking & Formatting:** Mengubah teks Markdown keluaran AI menjadi format Telegram HTML/MarkdownV2. Jika panjang melebihi 4.096 karakter, adapter memecah pesan berdasarkan jeda paragraf (`\n\n`) atau baris baru (`\n`) secara deterministik.

```mermaid
sequenceDiagram
    autonumber
    participant TG as Telegram Bot API
    participant ADAPT as Telegram Webhook Adapter
    participant REDIS as Redis Idempotency Cache
    participant CONV as Conversation Service
    participant ORCH as AI Orchestrator

    TG->>ADAPT: POST /v1/telegram/webhook (Payload Update)
    ADAPT->>ADAPT: Verifikasi Secret Token
    ADAPT->>REDIS: SET update_id:XYZ 1 EX 300 NX
    alt Update Duplikat
        REDIS-->>ADAPT: Key sudah ada
        ADAPT-->>TG: 200 OK (Abaikan)
    else Update Baru
        REDIS-->>ADAPT: OK
        ADAPT->>TG: sendChatAction("typing")
        ADAPT->>CONV: Dispatch User Message
        CONV->>ORCH: Execute Prompt Pipeline
        ORCH-->>CONV: Complete Assistant Response
        CONV-->>ADAPT: Return Message Text
        ADAPT->>ADAPT: Format HTML & Split Chunk (< 4096 char)
        ADAPT->>TG: sendMessage(chat_id, chunk_text)
        ADAPT-->>TG: 200 OK
    end
```

---

### 2.3 Backend Core & AI Orchestration Architecture
AI Orchestrator adalah gerbang tunggal pemanggilan model LLM:
1. **Sanitasi & Validasi Input:** Memastikan prompt tidak melebihi batas panjang karakter (4.000 karakter).
2. **Quota Check:** Memeriksa saldo kuota harian/bulanan di Redis.
3. **Prompt Manager:** Mengambil `system_prompt` versi aktif dari cache/DB.
4. **Context Builder (Sliding Window):**
   - Menghitung token pesan baru dan system prompt.
   - Mengambil pesan riwayat percakapan secara *reverse-chronological* (dari pesan terbaru ke terlama).
   - Menambahkan pesan riwayat selama total token tidak melampaui batas jendela konteks model (menyisakan cadangan 20% untuk output generasi).
5. **Model Abstraction & Circuit Breaker:**
   - Memilih adapter penyedia model aktif (Provider A).
   - Membuka stream ke API penyedia.
   - Jika terjadi network error, HTTP 5xx, atau timeout > 60 detik, router otomatis memutus sirkuit dan mengalihkan permintaan ke Adapter Provider B (Fallback).
6. **Persistence & Token Accounting:** Menyimpan teks akhir, menghitung konsumsi token aktual (input & output), dan mencatatnya ke tabel `messages` dan `usage_records`.

```mermaid
flowchart TD
    InMsg[DTO Permintaan Pesan] --> RateLimitGuard{Cek Kuota User di Redis}
    RateLimitGuard -- Habis --> QuotaErr[Tolak: HTTP 429 / Pesan Kuota Habis]
    RateLimitGuard -- Valid --> LoadSysPrompt[Ambil System Prompt Versi Aktif]
    
    LoadSysPrompt --> FetchHistory[Ambil Riwayat Percakapan dari DB]
    FetchHistory --> BuildContext[Context Builder: Hitung Token & Sliding Window]
    
    BuildContext --> DispatchModel[Model Abstraction Layer]
    
    subgraph AbstractionLayer["Model Abstraction Layer"]
        DispatchModel --> ProviderA[Adapter Primer: OpenAI / Gemini]
        ProviderA --> HealthCheckA{Respons Sukses?}
        HealthCheckA -- Ya --> StreamData[Stream Chunk Respons]
        HealthCheckA -- Gagal / Timeout 60s --> CircuitTrip[Picu Sirkuit Buka & Fallback]
        CircuitTrip --> ProviderB[Adapter Cadangan: Anthropic / Groq]
        ProviderB --> StreamData
    end
    
    StreamData --> SSEBroadcaster[Kirim ke Web via SSE / Buffer ke Telegram]
    StreamData --> PersistDB[Simpan Pesan ke DB + Catat Pemakaian Token]
```

---

## 4. Communication Flow & Protocols

| Saluran / Kanal Komunikasi | Protokol | Format Payload | Pola Interaksi |
| :--- | :--- | :--- | :--- |
| **Web Client ↔ API Backend** | HTTPS / TLS 1.3 | JSON (Request/Response) | REST API standar |
| **Web Chat ↔ AI Streaming** | HTTP/1.1 atau HTTP/2 | Server-Sent Events (`text/event-stream`) | Streaming searah (Server to Client) |
| **Telegram Cloud ↔ Backend** | HTTPS Webhook | JSON (Telegram Update Object) | Asynchronous Webhook Push |
| **Backend ↔ Database (Postgres)** | TCP (Port 5432) | Binary PostgreSQL Wire Protocol | Connection Pooling (Prisma/pgBouncer) |
| **Backend ↔ Cache (Redis)** | TCP (Port 6379) | RESP (REdis Serialization Protocol) | In-Memory KVS Operasi O(1) |
| **Backend ↔ External AI Providers** | HTTPS / TLS 1.3 | Server-Sent Events / JSON REST | Asynchronous HTTP Streaming |

---

## 5. Deployment Architecture (Production Target)

Arsitektur deployment dirancang berbasis kontainer Docker yang portabel, dapat dijalankan pada infrastruktur Cloud VPS (seperti AWS Lightsail, DigitalOcean, Hetzner) maupun layanan PaaS/Kubernetes.

```mermaid
graph TB
    subgraph Internet["Public Internet"]
        USER_BROWSER["Peramban Pengguna"]
        TG_CLOUD["Telegram Server"]
    end

    subgraph EdgeTier["Edge & Ingress Tier"]
        CLOUDFLARE["Cloudflare CDN & WAF<br>(SSL Termination, DDoS Protection)"]
    end

    subgraph ComputeTier["Container Application Host (Docker Compose / K8s)"]
        NGINX["NGINX Ingress Reverse Proxy<br>(Port 80/443 -> 3000, SSE Buffering OFF)"]
        
        subgraph AppInstances["Fastify App Cluster"]
            APP_1["Backend Instance 1<br>(Fastify + grammY + Prisma)"]
            APP_2["Backend Instance 2<br>(Fastify + grammY + Prisma)"]
        end
    end

    subgraph DataTier["Data Persistence Tier (Private Network / VPC)"]
        PG_DB[("PostgreSQL 15 RDS/Container<br>Port 5432 (Isolated)")]
        REDIS_CACHE[("Redis 7 In-Memory<br>Port 6379 (Isolated)")]
    end

    USER_BROWSER -->|HTTPS| CLOUDFLARE
    TG_CLOUD -->|HTTPS Webhook| CLOUDFLARE
    CLOUDFLARE -->|Encrypted Traffic| NGINX
    NGINX -->|Load Balancing| APP_1
    NGINX -->|Load Balancing| APP_2
    
    APP_1 --> PG_DB
    APP_1 --> REDIS_CACHE
    APP_2 --> PG_DB
    APP_2 --> REDIS_CACHE
```

### Konfigurasi Kritis NGINX untuk Streaming SSE:
Untuk mencegah NGINX melakukan *buffering* pada respon streaming token AI (yang dapat merusak pengalaman real-time pengguna), NGINX wajib dikonfigurasi dengan direktif:
```nginx
proxy_buffering off;
proxy_cache off;
proxy_set_header Connection '';
proxy_http_version 1.1;
chunked_transfer_encoding on;
proxy_read_timeout 120s;
```

