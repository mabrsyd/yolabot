# User Flow: Multi-Platform General-Purpose AI Assistant

**Versi Dokumen:** 1.0  
**Tanggal:** 7 November 2026  
**Status:** Approved Baseline  
**Referensi:** PRD Section 15, Section 46, Section 20

---

## 1. Ikhtisar Alur Pengguna

Dokumen ini merinci seluruh alur interaksi pengguna (*user flows*) dan diagram alur (*state transitions*) pada platform Web dan bot Telegram, mencakup jalur utama (*happy path*), jalur alternatif, serta skenario penanganan galat (*error handling*).

---

## 2. Alur Registrasi, Verifikasi, dan Login (Web)

Pengguna baru harus membuat akun dan memverifikasi email sebelum dapat menggunakan layanan obrolan di aplikasi Web.

```mermaid
sequenceDiagram
    autonumber
    actor Pengguna as Tamu / Pengguna
    participant Web as Web Frontend (SPA)
    participant API as API Gateway / Auth Service
    participant DB as Database (Postgres)
    participant Mail as Transactional Email Service

    Note over Pengguna, Mail: Skenario 1: Registrasi Akun Baru
    Pengguna->>Web: Isi formulir (Email, Password >= 8 Karakter, Nama)
    Web->>API: POST /v1/auth/register
    API->>API: Validasi input & cek keunikan email
    alt Email Sudah Terdaftar
        API-->>Web: 200 OK (Pesan netral: "Silakan periksa kotak masuk email Anda")
    else Email Baru & Valid
        API->>API: Hash password (Argon2id)
        API->>DB: INSERT INTO users (status='unverified')
        API->>Mail: Kirim email token verifikasi (valid 24 jam)
        API-->>Web: 201 Created ("Registrasi berhasil. Silakan verifikasi email")
    end
    Web-->>Pengguna: Tampilkan notifikasi konfirmasi email

    Note over Pengguna, Mail: Skenario 2: Verifikasi Email
    Pengguna->>Web: Klik tautan verifikasi di email (/verify?token=XYZ)
    Web->>API: POST /v1/auth/verify-email
    API->>DB: UPDATE users SET status='active' WHERE token=XYZ
    API-->>Web: 200 OK ("Email berhasil diverifikasi")
    Web-->>Pengguna: Arahkan ke halaman Login

    Note over Pengguna, Mail: Skenario 3: Login & Pembuatan Sesi
    Pengguna->>Web: Masukkan Email dan Password
    Web->>API: POST /v1/auth/login
    API->>DB: Query user by email
    alt Kredensial Salah
        API-->>Web: 401 Unauthorized ("Email atau kata sandi tidak valid")
        Web-->>Pengguna: Tampilkan pesan error generik
    else Brute Force Terdeteksi (> 5 Percobaan Gagal)
        API-->>Web: 429 Too Many Requests ("Akun terkunci sementara 15 menit")
    else Kredensial Valid
        API->>DB: Catat riwayat login terakhir
        API-->>Web: 200 OK (Set HttpOnly Session Cookie: session_id)
        Web-->>Pengguna: Arahkan ke /chat (Antarmuka Utama)
    end
```

---

## 3. Alur Percakapan AI (Web Application)

Alur komprehensif mulai dari pengetikan pesan, validasi kuota, pengiriman ke LLM, respons streaming Server-Sent Events (SSE), hingga penyimpanan persisten.

```mermaid
flowchart TD
    Start([Pengguna mengetik prompt di Composer]) --> CheckLen{Panjang teks <= 4000 karakter & tidak kosong?}
    CheckLen -- Tidak --> ShowInputError[Tampilkan peringatan batas karakter / Disable tombol Kirim]
    CheckLen -- Ya --> ClickSend[Pengguna menekan tombol Kirim / Enter]
    
    ClickSend --> DisableSend[Klien: Nonaktifkan input & composer berganti ke tombol 'Stop']
    DisableSend --> SendPost[Klien: POST /v1/conversations/:id/messages]
    
    SendPost --> RateCheck{Middleware: Kuota harian/menit mencukupi?}
    RateCheck -- Tidak --> Ret429[Kembalikan HTTP 429: Batas kuota tercapai]
    Ret429 --> ShowQuotaModal[Klien menampilkan modal waktu reset kuota]
    
    RateCheck -- Ya --> SaveUserMsg[Conversation Service: Simpan Pesan Pengguna ke DB]
    SaveUserMsg --> AssembleCtx[AI Orchestrator: Bangun Konteks Prompt + Sliding Window]
    AssembleCtx --> CallAdapter[Model Abstraction Layer: Panggil Adapter LLM Aktif]
    
    CallAdapter --> StreamInit{Koneksi Streaming Terbentuk?}
    StreamInit -- Gagal / Timeout --> FallbackProvider{Tersedia Provider Cadangan?}
    FallbackProvider -- Ya --> CallBackup[Panggil Adapter Provider Cadangan]
    FallbackProvider -- Tidak --> ReturnAIError[Kembalikan Galat: 'Layanan AI sedang sibuk']
    ReturnAIError --> ShowErrorUI[Klien menampilkan tombol 'Coba Lagi']
    
    StreamInit -- Berhasil --> StreamChunks[Kirim Event Stream SSE ke Web Client]
    CallBackup --> StreamChunks
    
    StreamChunks --> RenderUI[Klien: Render Markdown & Syntax Highlighting bertahap]
    RenderUI --> UserStopCheck{Pengguna klik 'Stop'?}
    UserStopCheck -- Ya --> ClientAbort[Klien putuskan SSE & POST /conversations/:id/stop]
    ClientAbort --> SavePartial[Simpan respons parsial dengan status 'incomplete']
    
    UserStopCheck -- Tidak --> StreamFinish{Stream Selesai dari LLM?}
    StreamFinish -- Belum --> StreamChunks
    StreamFinish -- Ya --> SaveCompleteMsg[Simpan pesan asisten ke DB status 'complete']
    SaveCompleteMsg --> CheckFirstTurn{Apakah ini giliran pesan pertama?}
    CheckFirstTurn -- Ya --> AsyncTitle[Picu Asynchronous Job: Generate Judul Percakapan]
    CheckFirstTurn -- Tidak --> ResetComposer[Aktifkan kembali input & Composer siap untuk prompt berikutnya]
    AsyncTitle --> ResetComposer
    ResetComposer --> End([Selesai])
```

---

## 4. Alur Pengelolaan Sesi Percakapan (Web)

Pengguna dapat menavigasi, mencari, mengubah nama, dan menghapus percakapan di area sidebar.

```mermaid
stateDiagram-v2
    [*] --> SidebarIdle: Sidebar memuat daftar riwayat (GET /v1/conversations)
    
    SidebarIdle --> NewChat: Klik tombol "+ Chat Baru"
    NewChat --> EmptyChatState: Area obrolan dikosongkan (konteks baru disiapkan)
    EmptyChatState --> SesiAktif: Kirim pesan pertama (DB membuat record percakapan)
    
    SidebarIdle --> SwitchChat: Klik salah satu item percakapan
    SwitchChat --> LoadMessages: GET /v1/conversations/:id/messages
    LoadMessages --> SesiAktif: Render seluruh riwayat pesan
    
    SidebarIdle --> SearchTriggered: Pengguna mengetik kata kunci pencarian
    SearchTriggered --> SearchAPI: GET /v1/search?q=kata_kunci (Debounce 300ms)
    SearchAPI --> RenderSearchResults: Tampilkan percakapan yang cocok
    RenderSearchResults --> SwitchChat: Pilih dari hasil pencarian
    
    SesiAktif --> EditTitle: Klik ikon pensil pada judul
    EditTitle --> SaveTitle: PATCH /v1/conversations/:id {title}
    SaveTitle --> SesiAktif: Judul terupdate di UI
    
    SesiAktif --> DeleteChat: Klik ikon tempat sampah
    DeleteChat --> ConfirmModal: Muncul dialog konfirmasi
    ConfirmModal --> CancelDelete: Klik Batal
    CancelDelete --> SesiAktif
    ConfirmModal --> ExecuteDelete: Klik Hapus
    ExecuteDelete --> API_Delete: DELETE /v1/conversations/:id
    API_Delete --> EmptyChatState: Hapus dari sidebar & alihkan ke chat baru
```

---

## 5. Alur Penggunaan Telegram Bot

Alur interaksi pengguna melalui Telegram Bot, mulai dari auto-provisioning hingga eksekusi perintah dan percakapan teks multi-turn.

```mermaid
flowchart TD
    TGUser([Pengguna Telegram mengirim pesan ke Bot]) --> TGServer[Telegram Cloud Platform]
    TGServer -->|HTTPS Webhook POST| TGWebhook[Backend: POST /v1/telegram/webhook]
    
    TGWebhook --> VerifySecret{Validasi X-Telegram-Bot-Api-Secret-Token?}
    VerifySecret -- Tidak Valid --> Drop403[Drop Request: HTTP 403 Forbidden]
    
    VerifySecret -- Valid --> CheckType{Jenis Input?}
    
    CheckType -- Foto / Dokumen / Suara / Video --> SendNonTextNotice[Kirim Balasan: 'Maaf, asisten baru mendukung teks']
    SendNonTextNotice --> TGEnd([Selesai])
    
    CheckType -- Perintah Teks /start --> LookupUser[Cari / Buat Pengguna berdasarkan telegram_id]
    LookupUser --> SendWelcome[Kirim Pesan Sambutan & Panduan /help]
    SendWelcome --> TGEnd
    
    CheckType -- Perintah /new atau /reset --> CloseActiveConv[Tandai percakapan lama selesai & buat sesi baru]
    CloseActiveConv --> SendResetNotice[Kirim Pesan: 'Konteks baru telah dimulai']
    SendResetNotice --> TGEnd
    
    CheckType -- Perintah /usage --> FetchUsage[Ambil data kuota token & pesan dari Redis/DB]
    FetchUsage --> SendUsageCard[Kirim Rincian Kuota Harian & Waktu Reset]
    SendUsageCard --> TGEnd
    
    CheckType -- Perintah /link KODE --> ProcessLink[Validasi kode penautan dengan akun Web]
    ProcessLink --> LinkResult{Kode Valid & Belum Expired?}
    LinkResult -- Tidak --> SendLinkFail[Kirim Pesan: 'Kode salah atau kedaluwarsa']
    LinkResult -- Ya --> MergeAccounts[Tautkan telegram_id ke user_id Web]
    MergeAccounts --> SendLinkSuccess[Kirim Pesan: 'Akun berhasil ditautkan!']
    SendLinkSuccess --> TGEnd
    
    CheckType -- Pesan Teks Biasa --> SendTyping[Kirim Telegram Action: typing]
    SendTyping --> CheckTGQuota{Kuota Pengguna Mencukupi?}
    CheckTGQuota -- Habis --> SendQuotaNotice[Kirim Pesan Batas Kuota]
    
    CheckTGQuota -- Cukup --> LoadTGContext[Ambil Riwayat Percakapan Aktif]
    LoadTGContext --> CallOrchestrator[Kirim ke Shared AI Orchestrator]
    CallOrchestrator --> Formatter[Format Respons ke HTML/MarkdownV2]
    Formatter --> SplitCheck{Panjang > 4096 Karakter?}
    SplitCheck -- Ya --> ChunkMessage[Pecah pesan pada batas paragraf terdekat]
    SplitCheck -- Tidak --> SendSingleMsg[Kirim pesan tunggal via Telegram API]
    ChunkMessage --> SendChunkSequence[Kirim pesan berurutan]
    SendSingleMsg --> TGEnd
    SendChunkSequence --> TGEnd
```

---

## 6. Alur Penautan Akun (Web ke Telegram Linking Flow)

Sinkronisasi akun untuk menyatukan riwayat percakapan dan konsumsi kuota antara Web dan Telegram.

```mermaid
sequenceDiagram
    autonumber
    actor Pengguna as Pengguna Terdaftar
    participant Web as Web Frontend (Settings)
    participant API as Backend (Auth & Identity Service)
    participant Cache as Redis (Temp Storage)
    actor TG as Klien Telegram
    participant Bot as Telegram Bot Handler

    Pengguna->>Web: Masuk ke Pengaturan -> "Tautkan Akun Telegram"
    Web->>API: POST /v1/link/telegram-code
    API->>API: Hasilkan kode acak 6-karakter (misal: "TG-89A2")
    API->>Cache: Simpan key link_code:TG-89A2 -> {user_id, exp: 600s}
    API-->>Web: 200 OK {code: "TG-89A2", expires_in: 600}
    Web-->>Pengguna: Tampilkan kode instruksi: "Ketik /link TG-89A2 pada bot kami"

    Pengguna->>TG: Buka Telegram Bot & ketik /link TG-89A2
    TG->>Bot: Webhook update {text: "/link TG-89A2", from: {id: 12345678}}
    Bot->>API: Verifikasi kode TG-89A2
    API->>Cache: GET link_code:TG-89A2
    alt Kode Tidak Ditemukan / Kedaluwarsa
        Bot-->>TG: Balas: "Kode tidak valid atau telah kedaluwarsa. Silakan buat kode baru di Web."
    else Kode Valid
        API->>API: Tautkan telegram_id 12345678 ke user_id pemilik kode
        API->>Cache: DEL link_code:TG-89A2
        Bot-->>TG: Balas: "Selamat! Akun Telegram Anda berhasil ditautkan ke akun Web Anda."
        API-->>Web: Event SSE / polling status: "Telegram Connected"
        Web-->>Pengguna: Indikator status di Pengaturan berubah menjadi "Tertaut"
    end
```

---

## 7. Alur Penanganan Galat & Ketahanan Sistem (Error Recovery Flow)

Alur komprehensif saat terjadi gangguan teknis pada penyedia eksternal LLM, jaringan terputus, atau kehabisan kuota pengguna.

```mermaid
flowchart TD
    ReqStart([Permintaan Inferensi AI Masuk]) --> CallLLM1[Panggil Model API Utama]
    
    CallLLM1 --> Result1{Status Pemanggilan?}
    
    Result1 -- HTTP 200 / Stream Sukses --> StreamBack[Lanjutkan Pengiriman Respons Normal]
    
    Result1 -- HTTP 429 Rate Limit Vendor --> ExponentialWait[Tunggu Backoff Eksponensial 1-2 Detik]
    ExponentialWait --> RetryLLM1[Retry Panggilan ke Vendor Utama Sekali]
    RetryLLM1 --> ResultRetry{Status Retry?}
    ResultRetry -- Berhasil --> StreamBack
    ResultRetry -- Gagal --> SwitchToBackup
    
    Result1 -- HTTP 500 / 503 / Network Timeout 60s --> SwitchToBackup[Alihkan ke Provider AI Cadangan / Fallback]
    
    SwitchToBackup --> CallLLM2[Panggil Model Cadangan via Adapter 2]
    CallLLM2 --> Result2{Status Provider Cadangan?}
    
    Result2 -- Berhasil --> StreamBackFallback[Kirim Respons (Log Event: Provider Fallback Active)]
    
    Result2 -- Gagal --> LogCorrelation[Catat Error Log + Correlation ID di Monitoring]
    LogCorrelation --> ReturnFriendlyError[Kirim Pesan Galat Bersahabat ke Pengguna]
    
    ReturnFriendlyError --> PlatformCheck{Platform Pengguna?}
    PlatformCheck -- Web --> ShowWebRetryUI[Tampilkan pesan: 'Layanan sedang mengalami gangguan sementara' + Tombol 'Coba Lagi']
    PlatformCheck -- Telegram --> SendTGErrMsg[Kirim Pesan: 'Mohon maaf, sistem sedang sibuk. Silakan coba beberapa saat lagi.']
```

