# Product Overview: Multi-Platform General-Purpose AI Assistant

**Versi Dokumen:** 1.0  
**Tanggal:** 7 November 2026  
**Status:** Approved Baseline berdasarkan PRD v0.1  
**Referensi:** `Product Requirements Document (PRD).md`

---

## 1. Product Vision

Membangun AI Assistant serba guna yang mudah diakses, cerdas, fleksibel, dan dapat dipakai berbagai kalangan untuk membantu aktivitas sehari-hari melalui percakapan bahasa natural, di atas fondasi arsitektur terpadu (shared backend) yang mampu mengakomodasi ekspansi kapabilitas spesialisasi baru tanpa membangun ulang sistem dasar **[FAKTA]**.

---

## 2. Product Objectives

Objektif produk dirancang untuk memvalidasi *product-market fit* pada fase MVP, mengendalikan beban biaya operasional, serta memastikan keandalan teknis sistem:

| ID | Sasaran Objektif | Indikator Kunci (KPI / Metrik Terukur) | Kategori |
| :--- | :--- | :--- | :--- |
| **OBJ-01** | Pengalaman percakapan interaktif & responsif | Time-to-First-Token (TTFT) p95 ≤ 3.0 detik pada kondisi beban operasional normal **[REKOMENDASI]** | Teknis & UX |
| **OBJ-02** | Konsistensi lintas platform tanpa fragmentasi | 100% percakapan yang ditautkan sinkron secara riil antara Web dan Telegram dengan konteks multi-turn utuh **[FAKTA]** | Fungsional |
| **OBJ-03** | Portabilitas dan fleksibilitas model AI | Penggantian atau penambahan penyedia model AI dilakukan 100% via konfigurasi & adapter tanpa merombak *business logic* **[FAKTA]** | Arsitektur |
| **OBJ-04** | Keamanan data, kunci API, dan isolasi pengguna | 0 insiden kebocoran API Key ke sisi klien; 100% endpoint terproteksi autentikasi, otorisasi kepemilikan, dan *rate limiting* **[FAKTA]** | Keamanan |
| **OBJ-05** | Arsitektur modular siap ekstensi masa depan | Fondasi *Assistant Profile* dan titik ekstensi tools tersedia untuk penambahan modul spesialisasi pasca-MVP **[FAKTA]** | Skalabilitas |
| **OBJ-06** | Keandalan dan ketersediaan layanan | Ketersediaan sistem bulanan (*uptime*) ≥ 99.0% di luar pemeliharaan terjadwal **[REKOMENDASI / TBD]** | Operasional |

---

## 3. Problem Statement

Berdasarkan analisis kebutuhan pengguna dan pemilik produk:

1. **Fragmentasi Layanan AI:** Pengguna harus berpindah-pindah aplikasi pihak ketiga untuk mencari informasi, menulis dokumen, menerjemahkan teks, atau mencari solusi pemrograman **[ASUMSI]**.
2. **Friksi Akses Perangkat Bergerak:** Pengguna sering memerlukan asisten AI saat beraktivitas di ponsel pintar tanpa ingin membuka peramban web atau memasang aplikasi native baru berukuran besar **[ASUMSI]**.
3. **Konteks Percakapan yang Terputus:** Pengguna yang menggunakan lebih dari satu perangkat kerap kehilangan riwayat obrolan dan konteks pembicaraan sebelumnya **[ASUMSI]**.
4. **Duplikasi Logika Bisnis:** Mengembangkan logika AI, manajemen sesi, dan filter keamanan secara terpisah untuk platform Web dan Telegram menyebabkan pembengkakan biaya pemeliharaan dan potensi inkonsistensi respons **[FAKTA]**.
5. **Vendor Lock-in Risiko Tinggi:** Ketergantungan total pada satu vendor LLM berisiko tinggi terhadap downtime layanan, lonjakan harga token, dan perubahan kebijakan sepihak **[FAKTA]**.

---

## 4. Target Users & Persona Arketipe

Pengguna awal produk adalah masyarakat umum dewasa tanpa batasan latar belakang teknis atau profesional **[FAKTA]**.

### 4.1 Segmen Pengguna

| Segmen | Kebutuhan Utama | Platform Dominan |
| :--- | :--- | :--- |
| **Pelajar & Mahasiswa** | Penjelasan konsep rumit, perangkuman materi kuliah, bimbingan penulisan tugas | Web & Telegram |
| **Pekerja Profesional** | Penyusunan draf email, perangkuman risalah rapat, analisis data tekstual | Web (Desktop) |
| **Pengembang Perangkat Lunak** | Penjelasan kode, debugging sintaksis, pembuatan boilerplate algoritma | Web (Desktop) |
| **Pelaku Usaha Mikro & UKM** | Ide konten promosi, penyusunan deskripsi produk, templat balasan pelanggan | Telegram & Web |
| **Content Creator & Penulis** | Brainstorming sudut pandang, penyusunan kerangka naskah/konten | Web & Telegram |
| **Masyarakat Umum** | Tanya jawab umum, terjemahan antar-bahasa, panduan praktis harian | Telegram (Mobile) |

### 4.2 Arketipe Persona

- **Sari (21 tahun, Mahasiswa):** Memerlukan respons instan di Telegram saat di perjalanan dan menggunakan Web saat menyusun tugas akhir di laptop.
- **Budi (30 tahun, Eksekutif Kantor):** Mengutamakan kecepatan menyusun draf laporan di peramban web kantor tanpa perlu berpindah-pindah tab browser.
- **Rangga (27 tahun, Software Engineer):** Membutuhkan *code block* Markdown dengan penyorotan sintaks (*syntax highlighting*) yang presisi dan tombol salin instan.
- **Dewi (35 tahun, Pengusaha Online):** Membutuhkan draf promosi cepat via aplikasi perpesanan Telegram yang sudah digunakannya setiap hari.

---

## 5. Value Proposition

| Pemangku Kepentingan | Nilai Tambah Utama (Value Proposition) |
| :--- | :--- |
| **Bagi Pengguna Akhir** | Akses fleksibel ke asisten pintar melalui platform pilihan (Web interaktif penuh atau Telegram yang ringan) dengan sinkronisasi riwayat yang mulus dan jaminan privasi data. |
| **Bagi Pemilik Produk** | Efisiensi biaya *engineering* melalui arsitektur terpusat (*shared backend*), proteksi anggaran via *rate limiting* terpadu, dan kedaulatan platform tanpa terkunci pada satu penyedia AI. |
| **Bagi Tim Pengembang** | Basis kode berbasis *clean architecture*, kontrak API terstandarisasi (*API-First*), orkestrasi AI modular dengan pola *adapter pattern*, dan kemudahan *vibe coding* berkat spesifikasi yang presisi. |

---

## 6. Product Scope

### 6.1 Dalam Lingkup MVP (In-Scope)

1. **Aplikasi Web (SPA):**
   - Autentikasi berbasis email dan kata sandi (Registrasi, Login, Verifikasi Email, Logout).
   - Pengaturan profil (Nama Tampilan, Tema Terang/Gelap, Bahasa Antarmuka).
   - Antarmuka Chat interaktif: respons *streaming* bertahap (Server-Sent Events), pembuatan percakapan baru, riwayat obrolan di sidebar, pencarian lokal percakapan, penggantian judul otomatis dan manual, penghapusan percakapan.
   - Fitur Composer: *multiline textarea*, tombol Kirim, tombol Stop generasi pesan parsial, tombol Regenerate, tombol Edit & Kirim Ulang prompt.
   - Rendering Respons: Markdown lengkap, tabel, blok kode dengan *syntax highlighting*, dan tombol salin clipboard satu ketukan.
   - Responsif pada resolusi layar mulai dari 360 px (ponsel, tablet, desktop).
2. **Telegram Bot:**
   - Registrasi dan pemetaan otomatis Telegram ID ke entitas pengguna backend.
   - Percakapan *multi-turn* kontekstual.
   - Eksekusi perintah bot dasar: `/start`, `/help`, `/new`, `/reset`, `/link`, `/usage`.
   - Indikator aksi mengetik (*typing action*) selama AI menginferensi respons.
   - Fitur *Account Linking* (Web-Telegram) menggunakan kode OTP sekali pakai valid 10 menit.
   - Penolakan ramah terhadap input non-teks (dokumen, suara, gambar) dengan edukasi batasan MVP.
3. **Shared Backend & AI Orchestration:**
   - Arsitektur stateless dengan API Gateway/Router terpadu.
   - Manajemen percakapan terisolasi per *user_id*.
   - Abstraksi penyedia model AI (*Model Abstraction Layer*) dengan dukungan minimal 2 adapter penyedia model (utama dan cadangan/pengujian).
   - Orkestrasi konteks percakapan: *sliding window token context builder*, pemisahan instruksi sistem dari input pengguna (*prompt injection guard*).
   - *Rate limiting* terpusat (kuota token dan jumlah request harian/bulanan).
   - Konfigurasi model aktif dan *system prompt* dinamis tanpa *re-deployment*.
   - Logging terstruktur dengan Correlation ID tanpa mengekspos isi pesan sensitif atau kredensial.
   - Mekanisme penghapusan akun mandiri (*soft delete* diikuti *hard purge*).

### 6.2 Di Luar Lingkup MVP (Out-of-Scope)

- Akses internet real-time (web search / browsing agent).
- Analisis dan pembacaan berkas (PDF, DOCX, TXT, CSV).
- Kemampuan multimodal (Computer Vision / pengenalan gambar, Voice speech-to-text / text-to-speech).
- Eksekusi kode secara dinamis (*code interpreter / sandbox runner*).
- Spesialisasi domain modular (Academic, Coding, Research, Business Profiles) — *akan diimplementasikan pasca-MVP via Assistant Profiles*.
- Self-hosted LLM (Ollama/vLLM on-premise) — *disiapkan titik ekstensi adapter-nya, implementasi host pasca-MVP*.
- Memori jangka panjang lintas percakapan (*cross-conversation semantic memory / vector database / RAG*).
- Grup obrolan Telegram (Telegram Group Chat) — *hanya 1-on-1 private message pada MVP*.
- Aplikasi mobile native (iOS / Android Flutter/React Native).
- Sistem pembayaran langganan (Payment Gateway / Billing Engine).
- Panel Admin dengan UI grafis penuh (manajemen via database & CLI/API script pada tahap awal).

---

## 7. Status Keputusan & Klasifikasi Informasi

- **[FAKTA]:** Spesifikasi telah dikunci oleh PRD (Shared backend, 2 platform Web & Telegram, Hybrid AI via abstraction layer, isolasi data, MVP teks).
- **[ASUMSI]:** Telegram memiliki penetrasi tinggi pada target pengguna; pengguna memiliki koneksi internet stabil (perlu validasi saat fase pilot).
- **[REKOMENDASI]:** Menggunakan arsitektur monolit modular (Node.js/TypeScript atau Python FastAPI) dengan PostgreSQL dan Redis untuk menjaga kesederhanaan dan performa; TTFT target ≤ 3 detik; masa retensi soft-delete 30 hari.
- **TBD (To Be Decided):** Pemilihan spesifik vendor AI komersial untuk MVP (menunggu hasil pengujian uji benchmark Bahasa Indonesia & kalkulasi biaya token), model monetisasi final, dan peninjauan kepatuhan UU Perlindungan Data Pribadi (UU PDP).

