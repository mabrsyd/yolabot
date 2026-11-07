# UI/UX Specification: Multi-Platform General-Purpose AI Assistant

**Versi Dokumen:** 1.0  
**Tanggal:** 7 November 2026  
**Status:** Approved Design Baseline  
**Platform Target:** Modern Web Desktop, Tablet, Mobile (Breakpoint min 360 px)  
**Referensi:** PRD Section 24.1 (Web Layout), Section 37 (Web App Requirements), WEB-001 s.d. WEB-006

---

## 1. Design Principles & UX Vision

1. **Focus on the Dialogue (Content-First):** Antarmuka dirancang minimalis dan bersih (*decluttered*) agar fokus utama pengguna tertuju pada percakapan dan kejelasan informasi yang disajikan.
2. **Instant Feedback & Zero Anxiety:** Mengurangi beban tunggu pengguna saat inferensi AI dengan respons *streaming* bertahap, kursor pengetikan aktif, dan indikator status yang transparan.
3. **Ergonomic & Responsive Usability:** Interaksi satu tangan yang nyaman pada layar ponsel (composer mudah dijangkau ibu jari) serta tata letak lebar yang efisien dan produktif pada layar monitor desktop.
4. **Universal Accessibility (a11y):** Navigasi keyboard penuh, kontras warna yang memenuhi standar WCAG 2.1 AA, dan kompatibilitas dengan screen reader.
5. **Original Visual Identity:** Desain memiliki identitas visual yang segar, profesional, dan orisinal—tanpa meniru mentah-mentah aset visual atau trademark produk lain.

---

## 2. Page Structure & Information Architecture

Aplikasi Web tersusun atas 3 tampilan utama:
1. **Halaman Autentikasi (`/login`, `/register`, `/verify-email`):** Formulir terpusat (*card container*) dengan panduan yang jelas, validasi instan, dan penanganan kesalahan ramah.
2. **Antarmuka Utama Obrolan (`/chat`, `/chat/:conversationId`):** Struktur 3 zona: Sidebar Kiri (Navigasi & Riwayat), Area Percakapan Tengah (Daftar Bubble Pesan), dan Composer Bawah (Input Prompt & Kontrol).
3. **Modal / Halaman Pengaturan (`/settings`):** Pengelolaan profil pengguna, pemilihan tema tampilan, bahasa, status penautan Telegram, serta tombol penghapusan akun mandiri.

```
+-------------------------------------------------------------------------------+
| TOP BAR (Mobile Only): [Hamburger Button]   [Judul Sesi]   [Tombol New Chat]  |
+----------------------+--------------------------------------------------------+
|                      |                                                        |
|  SIDEBAR (Desktop)   |  AREA PERCAKAPAN (Scrollable Stream Area)              |
|                      |                                                        |
|  [+ Chat Baru]       |  [User Bubble]                                         |
|  [Search Input]      |    "Jelaskan arsitektur microservices vs monolith"     |
|                      |                                                        |
|  Daftar Riwayat:     |  [Assistant Bubble]                                    |
|  - Hari Ini          |    "Perbedaan utama terletak pada batas domain..."     |
|    * Microservices   |    ```typescript                                       |
|    * Ide Bisnis UKM  |    interface ModularMonolith { ... }                   |
|  - 7 Hari Terakhir   |    ```                                                 |
|    * Golang Channels |    [Salin Teks] [Salin Kode] [Regenerate] [Thumbs Up]  |
|                      |                                                        |
|  ------------------  +--------------------------------------------------------+
|  [Profil Pengguna]   |  COMPOSER (Sticky Bottom)                              |
|  [Menu Settings]     |  [ Tulis pesan... (Shift+Enter baris baru)   ] [Kirim] |
|  [Keluar (Logout)]   |  Catatan: "AI dapat membuat kekeliruan. Cek kembali."  |
+----------------------+--------------------------------------------------------+
```

---

## 3. Detailed Component Specifications

### 3.1 Sidebar Kiri (Navigation & History Drawer)
- **Status Tampilan:**
  - *Desktop (≥ 1024 px):* Lebar tetap 260 px, dapat dilipat (*collapsible*) dengan menekan ikon toggle di sudut kiri atas.
  - *Tablet & Mobile (< 1024 px):* Menjadi *off-canvas drawer* yang muncul dari kiri dengan lapisan latar belakang gelap (*backdrop blur overlay*).
- **Elemen Sidebar:**
  1. **Tombol "Chat Baru":** Tombol aksen utama di bagian paling atas dengan ikon `Plus`. Mengosongkan viewport dan mereset memori konteks sesi.
  2. **Kolom Pencarian Cepat:** Input teks dengan ikon kaca pembesar untuk memfilter daftar percakapan secara *real-time* (debounce 300 ms).
  3. **Pengelompokan Waktu Riwayat:** Percakapan dikelompokkan secara visual: "Hari Ini", "Kemarin", "7 Hari Terakhir", "Bulan Ini".
  4. **Item Percakapan:** Menampilkan judul (dipotong jika > 24 karakter dengan ellipsis `...`), menu tiga titik (*kebab menu*) yang berisi aksi "Ubah Judul" dan "Hapus".
  5. **Footer Pengguna:** Menampilkan avatar inisial, nama tampilan pengguna, serta tombol pop-up menu "Pengaturan" dan "Logout".

---

### 3.2 Area Percakapan Tengah (Chat Thread Viewport)
- **Scroll Behavior:**
  - *Auto-Scroll:* Secara otomatis menggulir ke bawah saat potongan token streaming diterima.
  - *User Scroll Override:* Jika pengguna menggulir ke atas saat streaming berlangsung untuk membaca bagian sebelumnya, *auto-scroll* dijeda sementara. Muncul tombol melayang (*floating pill*) "Gulir ke Bawah ↓" di sudut kanan bawah.
- **Bubble Pesan Pengguna (User Message):**
  - Rata kanan (*right-aligned*) dengan latar belakang lembut (*subtle tint background*).
  - Dilengkapi tombol "Edit Prompt" (ikon pensil) yang muncul saat di-hover.
- **Bubble Pesan Asisten (Assistant Message):**
  - Rata kiri (*left-aligned*) dengan avatar robot/asisten orisinal.
  - Menampilkan teks berformat Markdown bersih:
    - *Heading 1-3:* Ukuran proporsional, margin vertikal yang rapi.
    - *List & Bullet:* Indentasi rapi.
    - *Tabel:* Garis tepi tipis dengan kontainer horizontal scrollable jika kolom lebar.
    - *Blok Kode:* Latar belakang kontras gelap, penomoran baris opsional, tag bahasa di sudut kiri atas, dan tombol "Salin Kode" di sudut kanan atas.
  - *Footer Pesan Asisten:* Tombol "Salin Jawaban", "Regenerate" (hanya pada pesan terakhir), dan penanda disclaimer singkat.

---

### 3.3 Composer Bawah (Message Input & Controls)
- **Komponen Input:**
  - *Textarea auto-expand:* Membesar secara fleksibel dari 1 baris hingga maksimal 6 baris teks sebelum memunculkan *internal scrollbar*.
  - *Keyboard Shortcut:* Menekan `Enter` mengirim pesan; menekan `Shift + Enter` membuat baris baru.
  - *Counter Karakter:* Indikator peringatan muncul jika karakter mencapai > 3.500 / 4.000 karakter.
- **Tombol Aksi (Send / Stop State):**
  - *Status Standby:* Tombol berikon panah atas `Send`. Nonaktif (*disabled/opacity 50%*) saat input kosong.
  - *Status Streaming:* Tombol secara dinamis bertransisi menjadi kotak merah/gelap `Stop` dengan label "Hentikan Generasi" untuk memutus aliran SSE (FR-014).
- **Disclaimer Banner:**
  - Teks kecil di bawah composer: *"Asisten AI dapat melakukan kesalahan. Harap verifikasi informasi penting."*

---

## 4. UI States: Loading, Empty, and Error Handling

### 4.1 Loading States
1. **Inisialisasi Pemuatan Percakapan:** Menampilkan *skeleton loader* pada sidebar dan area chat (balok abu-abu berkedip lembut / shimmer effect) saat mengambil data riwayat dari API.
2. **Menunggu Token Pertama (TTFT Waiting):** Menampilkan animasi 3 titik berdenyut (*pulsing typing indicator*) di baris asisten sebelum token pertama tiba.
3. **Streaming Aktif:** Menampilkan kursor garis vertikal berkedip (`cursor: blink`) tepat di akhir kata yang sedang di-generate.

### 4.2 Empty States
1. **Layar Chat Baru (Kosong):**
   - Menampilkan logo produk dan pesan sambutan ramah: *"Halo! Ada yang bisa saya bantu hari ini?"*
   - Menampilkan 4 kartu saran prompt awal (*starter prompt cards*), misalnya:
     - 💡 *"Bantu saya menyusun email lamaran kerja formal"*
     - 💻 *"Jelaskan cara kerja async/await pada JavaScript"*
     - 📝 *"Ringkas materi tentang dasar kecerdasan buatan"*
     - 🌐 *"Terjemahkan kalimat ini ke dalam bahasa Inggris formal"*
   - Mengklik kartu langsung mengisi composer atau mengirimkan prompt.
2. **Riwayat Sidebar Kosong:**
   - Menampilkan ilustrasi obrolan minimalis dengan teks: *"Belum ada riwayat percakapan. Mulai obrolan pertama Anda!"*
3. **Pencarian Tidak Ditemukan:**
   - Teks: *"Tidak ada percakapan yang cocok dengan kata kunci '<keyword>'."*

### 4.3 Error States
1. **Koneksi Terputus / Jaringan Offline:**
   - Banner bar kuning di bagian atas: *"Koneksi terputus. Mencoba menghubungkan kembali..."*
2. **Kegagalan Pemanggilan Model AI (HTTP 500 / Timeout):**
   - Pesan asisten menampilkan kotak peringatan lembut (*alert box* warna merah muda/oranye): *"Layanan asisten sedang sibuk atau mengalami gangguan sesaat."* Disertai tombol **"Coba Lagi"** (*Retry*).
3. **Batas Kuota Tercapai (HTTP 429):**
   - Modal pop-up informatif yang menjelaskan bahwa kuota token harian telah habis, menampilkan jam waktu reset kuota (UTC/WIB), dan tombol "Tutup".

---

## 5. Responsive Behavior & Breakpoints

| Breakpoint | Target Perangkat | Perilaku Layout |
| :--- | :--- | :--- |
| `< 640 px` (sm) | Mobile Phone (360px - 639px) | Sidebar tersembunyi (Drawer). Header atas menampilkan hamburger menu. Composer menempel di bagian bawah layar dengan padding kompak. |
| `640 px - 1023 px` (md) | Tablet & Ponsel Lipat | Sidebar default tertutup; dapat dibuka dengan gestur geser (*swipe*) atau tombol menu. |
| `≥ 1024 px` (lg/xl) | Laptop & Monitor Desktop | Sidebar terbuka secara permanen di kiri (260 px). Lebar area pesan dibatasi maksimal 768 px (*max-w-3xl*) di tengah layar agar ergonomis dibaca. |

---

## 6. Accessibility Standards (WCAG 2.1 AA Compliance)

1. **Rasio Kontras Warna:** Semua teks pada mode terang maupun gelap memiliki rasio kontras minimal **4.5:1** terhadap warna latar belakangnya (dan minimal 3:1 untuk elemen UI grafis aktif).
2. **Navigasi Keyboard:**
   - Seluruh tombol dan tautan dapat difokuskan menggunakan tombol `Tab`.
   - Tombol yang sedang fokus menampilkan *focus outline ring* kontras tinggi.
   - Menekan `Escape` menutup modal dialog atau drawer sidebar.
3. **Screen Reader Support (ARIA Attributes):**
   - Tombol ikon memiliki label deskriptif (`aria-label="Salin kode"`, `aria-label="Hapus percakapan"`).
   - Area pesan asisten menggunakan atribut `aria-live="polite"` sehingga pembaruan teks streaming dibacakan secara teratur oleh teknologi pembaca layar.

