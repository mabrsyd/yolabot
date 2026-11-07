# User Stories: Multi-Platform General-Purpose AI Assistant

**Versi Dokumen:** 1.0  
**Tanggal:** 7 November 2026  
**Status:** Approved Baseline  
**Referensi:** PRD Section 20 (FR), Section 21 (NFR), Section 22 (User Stories)

---

## 1. Definisi User Roles

Sistem mengenali 3 peran utama pengguna:
1. **Tamu (Guest):** Pengunjung yang belum terautentikasi dan mengakses aplikasi Web.
2. **Pengguna Terautentikasi (Authenticated User):** Pengguna terdaftar yang memiliki akun aktif di Web dan/atau terhubung melalui Telegram Bot.
3. **Administrator (Operational / System Admin):** Pengelola sistem yang bertugas memantau operasional, konfigurasi model AI, dan penegakan tata tertib penggunaan.

---

## 2. Matriks User Stories

### 2.1 Peran: Tamu (Guest)

#### US-G01: Pendaftaran Akun Baru (Self-Registration)
- **Sebagai** Tamu,
- **Saya ingin** mendaftar akun baru menggunakan alamat email dan kata sandi yang aman,
- **Agar** saya dapat memiliki akses pribadi ke layanan asisten AI.
- **Prioritas:** Must Have
- **Referensi:** FR-001, NFR-004, AUTH-001
- **Acceptance Criteria:**
  1. Form registrasi memvalidasi format email yang sah (RFC 5322).
  2. Kata sandi minimal 8 karakter, wajib memuat kombinasi huruf dan angka.
  3. Kata sandi di-hash menggunakan algoritma modern (Argon2id / bcrypt) sebelum disimpan ke basis data.
  4. Sistem mengirimkan token/email verifikasi; akun ditandai status `unverified` sampai verifikasi tuntas.
  5. Jika email sudah terdaftar, sistem menampilkan pesan netral untuk mencegah *user enumeration attack*.

#### US-G02: Autentikasi Masuk (Login) & Pengendalian Sesi
- **Sebagai** Tamu / Pengguna Terdaftar,
- **Saya ingin** masuk ke aplikasi Web dengan kredensial saya dan mendapatkan sesi yang aman,
- **Agar** data percakapan saya tetap terlindungi dari akses orang lain.
- **Prioritas:** Must Have
- **Referensi:** FR-002, NFR-004, AUTH-002, AUTH-004
- **Acceptance Criteria:**
  1. Kredensial diverifikasi secara aman; kegagalan login menampilkan pesan kesalahan umum ("Email atau kata sandi tidak valid").
  2. Sistem memberlakukan pembatasan percobaan login (*rate limiting* / proteksi brute force): maksimal 5 kali kegagalan beruntun sebelum akun/IP dibekukan sementara selama 15 menit.
  3. Setelah login berhasil, backend menerbitkan session cookie bertipe `HttpOnly`, `Secure`, `SameSite=Strict`.
  4. Pengguna diarahkan ke antarmuka chat utama dalam waktu ≤ 1.5 detik pasca-login.

---

### 2.2 Peran: Pengguna Terautentikasi (Web Application)

#### US-U01: Pengiriman Pesan & Respons AI Ber-Streaming
- **Sebagai** Pengguna,
- **Saya ingin** mengirimkan prompt teks dan melihat respons AI muncul bertahap secara real-time (*streaming*),
- **Agar** saya tidak menunggu lama dalam ketidakpastian dan dapat membaca jawaban secara instan.
- **Prioritas:** Must Have
- **Referensi:** FR-004, NFR-001, OBJ-01, WEB-002, RH-001
- **Acceptance Criteria:**
  1. Pesan pengguna divalidasi panjang karakternya (maksimal 4.000 karakter per input) dan dipastikan tidak kosong.
  2. Waktu ke token pertama (TTFT) p95 ≤ 3.0 detik pada kondisi jaringan normal.
  3. Respons diterima melalui Server-Sent Events (SSE) dan dirender ke antarmuka tanpa memblokir thread UI.
  4. Tombol kirim dinonaktifkan (*disabled*) saat sedang streaming atau saat input kosong.
  5. Setelah respons selesai, pesan pengguna dan asisten tersimpan lengkap di basis data.

#### US-U02: Memulai Percakapan Baru (Context Isolation)
- **Sebagai** Pengguna,
- **Saya ingin** menekan tombol "Chat Baru" untuk memulai sesi pembicaraan baru,
- **Agar** topik obrolan sebelumnya tidak tercampur dengan topik baru.
- **Prioritas:** Must Have
- **Referensi:** FR-005, NFR-005, BR-001
- **Acceptance Criteria:**
  1. Menekan "Chat Baru" mengosongkan area pesan aktif dan mereset memori konteks sesi saat itu.
  2. Entitas percakapan di database hanya dibuat saat pesan pertama berhasil dikirimkan (mencegah *empty ghost chats*).
  3. Konteks percakapan lama dijamin tidak terinjeksi ke dalam prompt assembly percakapan baru.

#### US-U03: Riwayat Percakapan di Sidebar & Paginasi
- **Sebagai** Pengguna,
- **Saya ingin** melihat daftar riwayat percakapan saya di sidebar yang tersusun dari yang paling baru,
- **Agar** saya dapat melanjutkan topik diskusi sebelumnya kapan saja.
- **Prioritas:** Must Have
- **Referensi:** FR-006, NFR-001, NFR-005, BE-001
- **Acceptance Criteria:**
  1. Sidebar menampilkan daftar sesi obrolan yang difilter ketat hanya milik `user_id` yang sedang aktif.
  2. Daftar diurutkan berdasarkan `updated_at` menurun (paling baru di atas).
  3. Memuat 100 percakapan pertama membutuhkan waktu ≤ 2.0 detik.
  4. Mengklik salah satu sesi memuat seluruh riwayat pesan percakapan terkait.

#### US-U04: Penamaan Otomatis dan Perubahan Judul Percakapan
- **Sebagai** Pengguna,
- **Saya ingin** sistem memberikan judul ringkas otomatis pada percakapan saya dan mengizinkan saya mengubahnya secara manual,
- **Agar** daftar percakapan saya rapi dan mudah diidentifikasi.
- **Prioritas:** Should Have
- **Referensi:** FR-007, BE-004
- **Acceptance Criteria:**
  1. Setelah giliran pertama (pesan pengguna + jawaban asisten), backend secara asinkron men-generate judul singkat (≤ 5 kata atau ≤ 80 karakter).
  2. Jika pembuatan judul otomatis gagal atau timeout, sistem menggunakan potongan pesan pertama (30 karakter pertama) sebagai judul fallback.
  3. Pengguna dapat mengklik ikon pensil / edit judul dan menyimpannya; perubahan judul terupdate di database dan sidebar secara instan.

#### US-U05: Pencarian Percakapan
- **Sebagai** Pengguna,
- **Saya ingin** mencari kata kunci di antara judul dan riwayat pesan saya,
- **Agar** saya dapat menemukan kembali referensi informasi yang pernah dibahas.
- **Prioritas:** Should Have
- **Referensi:** FR-008, DB-001
- **Acceptance Criteria:**
  1. Kolom pencarian memicu debounce kueri (300 ms).
  2. Hasil pencarian hanya menampilkan sesi percakapan milik pengguna aktif (0 cross-user leak).
  3. Hasil tampil dalam waktu ≤ 2.0 detik untuk basis data hingga ribuan pesan.
  4. Menampilkan status kosong jika tidak ada pesan yang cocok.

#### US-U06: Penghapusan Percakapan (Soft Delete)
- **Sebagai** Pengguna,
- **Saya ingin** menghapus satu sesi percakapan tertentu yang tidak saya butuhkan lagi,
- **Agar** riwayat saya tetap bersih dan data pribadi saya terjaga.
- **Prioritas:** Must Have
- **Referensi:** FR-009, BR-006, DB-002
- **Acceptance Criteria:**
  1. Terdapat dialog konfirmasi modal sebelum aksi penghapusan dieksekusi.
  2. Setelah dikonfirmasi, percakapan ditandai `deleted_at` (soft delete) dan segera dihilangkan dari sidebar dan UI.
  3. Percakapan yang terhapus mengembalikan status HTTP 404 jika diakses via API.

#### US-U07: Rendering Markdown, Tabel, dan Blok Kode
- **Sebagai** Pengembang Perangkat Lunak / Pengguna Teknis,
- **Saya ingin** format teks tebal, miring, daftar, tabel, dan sintaks kode terformat dengan rapi dan berwarna,
- **Agar** kode dan dokumentasi teknis mudah saya pelajari dan evaluasi.
- **Prioritas:** Must Have
- **Referensi:** FR-010, WEB-003, NFR-004
- **Acceptance Criteria:**
  1. Sintaks Markdown standar (heading, list, table, blockquote) dirender secara akurat.
  2. Blok kode menampilkan penyorotan sintaks (*syntax highlighting*) sesuai bahasa pemrograman yang dideklarasikan.
  3. Seluruh output HTML disanitasi menggunakan library sanitizer (seperti DOMPurify) untuk mengeliminasi potensi serangan Stored XSS.

#### US-U08: Penyalinan Respons dan Blok Kode Satu Klik
- **Sebagai** Pengguna,
- **Saya ingin** tombol salin yang mudah diakses pada setiap respons dan blok kode,
- **Agar** saya dapat menyalin konten langsung ke clipboard perangkat saya tanpa memblok teks manual.
- **Prioritas:** Must Have
- **Referensi:** FR-011
- **Acceptance Criteria:**
  1. Setiap respons AI memiliki tombol "Salin Teks" dan setiap code block memiliki tombol "Salin Kode" di sudut kanan atas blok.
  2. Mengklik tombol memindahkan teks mentah ke clipboard dan memicu konfirmasi visual ("Tersalin!") selama 2 detik.

#### US-U09: Pembuatan Ulang Respons (Regenerate Response)
- **Sebagai** Pengguna,
- **Saya ingin** meminta AI membuat ulang respons untuk pertanyaan terakhir,
- **Agar** saya mendapatkan alternatif jawaban yang lebih memuaskan atau komprehensif.
- **Prioritas:** Should Have
- **Referensi:** FR-012, RH-003
- **Acceptance Criteria:**
  1. Tombol Regenerate aktif hanya pada giliran pesan terakhir dari asisten.
  2. Orkestrator menyusun ulang konteks identik dengan konteks permintaan awal.
  3. Respons baru menggantikan atau ditambahkan sebagai varian versi respons terakhir di UI.

#### US-U10: Pengeditan Prompt & Kirim Ulang
- **Sebagai** Pengguna,
- **Saya ingin** mengedit prompt pesan yang telah saya kirimkan dan menjalankannya kembali,
- **Agar** saya dapat mengoreksi kesalahan ketik atau memodifikasi instruksi saya.
- **Prioritas:** Should Have
- **Referensi:** FR-013, G-09
- **Acceptance Criteria:**
  1. Mengklik tombol Edit pada pesan pengguna membuka formulir inline untuk mengubah teks.
  2. Menyimpan dan mengirimkan ulang akan menghapus pesan di bawah titik edit tersebut (strategi pemangkasan linear MVP) dan memicu respons AI baru.
  3. Konteks percakapan di bawah titik edit tidak lagi disertakan dalam prompt assembly berikutnya.

#### US-U11: Penghentian Streaming Respons (Stop Generation)
- **Sebagai** Pengguna,
- **Saya ingin** menghentikan generasi jawaban yang sedang berlangsung secara instan,
- **Agar** saya tidak perlu menunggu teks yang sudah saya anggap tidak relevan dan menghemat konsumsi token.
- **Prioritas:** Should Have
- **Referensi:** FR-014, RH-003
- **Acceptance Criteria:**
  1. Saat respons streaming aktif, tombol Kirim berganti menjadi tombol "Berhenti" (*Stop*).
  2. Mengklik tombol Stop memutuskan koneksi SSE dari sisi klien dan membatalkan stream inferensi di backend dalam waktu ≤ 2.0 detik.
  3. Bagian pesan parsial yang sudah diterima tetap disimpan di database dengan status `incomplete`.

#### US-U12: Preferensi Antarmuka (Tema Terang/Gelap & Bahasa)
- **Sebagai** Pengguna,
- **Saya ingin** beralih antara tema gelap, tema terang, atau mengikuti pengaturan sistem,
- **Agar** mata saya nyaman saat menggunakan aplikasi dalam berbagai kondisi pencahayaan.
- **Prioritas:** Must Have
- **Referensi:** FR-003, FR-015, WEB-006
- **Acceptance Criteria:**
  1. Pilihan tema tersedia di menu Pengaturan: "Terang", "Gelap", "Sistem".
  2. Perubahan tema diaplikasikan ke DOM secara instan (≤ 1.0 detik) tanpa memuat ulang (*reload*) halaman.
  3. Preferensi disimpan di *local storage* dan tersinkronisasi ke profil pengguna di database.

---

### 2.3 Peran: Pengguna Terautentikasi (Telegram Bot)

#### US-T01: Inisialisasi Bot & Auto-Provisioning (/start)
- **Sebagai** Pengguna Telegram,
- **Saya ingin** memulai interaksi dengan bot menggunakan perintah `/start` dan disambut dengan ramah,
- **Agar** profil saya otomatis terdaftar dan saya mengetahui panduan awal cara pemakaian.
- **Prioritas:** Must Have
- **Referensi:** FR-016, FR-018, TGB-001, TGB-003
- **Acceptance Criteria:**
  1. Webhook backend memvalidasi *secret token* dari header Telegram.
  2. Backend memeriksa tabel identitas: jika `telegram_id` belum terdaftar, entitas Pengguna dan Identitas baru dibuat secara otomatis.
  3. Bot mengirimkan pesan sambutan yang menjelaskan fungsionalitas asisten, batasan layanan teks pada MVP, dan daftar perintah utama.
  4. Respons `/start` terkirim dalam waktu ≤ 2.0 detik.

#### US-T02: Percakapan Kontekstual Multi-Turn Telegram
- **Sebagai** Pengguna Telegram,
- **Saya ingin** mengirim pesan teks apa pun ke bot dan menerima jawaban yang memahami konteks obrolan sebelumnya,
- **Agar** interaksi di Telegram terasa mengalir layaknya berbicara dengan asisten cerdas.
- **Prioritas:** Must Have
- **Referensi:** FR-017, AI-001, BR-002, TGB-004
- **Acceptance Criteria:**
  1. Pesan pengguna dimuat ke sesi percakapan aktif di backend bersama riwayat konteks sebelumnya.
  2. Backend memproses inferensi AI melalui AI Orchestrator terpadu.
  3. Jika respons melebihi batas 4.096 karakter Telegram, backend memecah pesan secara cerdas pada batas paragraf tanpa memotong kata.
  4. Format pesan dikonversi ke format yang didukung Telegram (HTML atau MarkdownV2) dengan mekanisme fallback teks biasa jika terjadi kegagalan parser.

#### US-T03: Indikator Mengetik (Typing Status)
- **Sebagai** Pengguna Telegram,
- **Saya ingin** melihat status "mengetik..." (*typing action*) di obrolan Telegram saat menunggu respons,
- **Agar** saya tahu bot telah menerima pesan saya dan sedang memprosesnya.
- **Prioritas:** Should Have
- **Referensi:** FR-019
- **Acceptance Criteria:**
  1. Backend mengirimkan aksi `sendChatAction(action="typing")` ke Bot API dalam waktu ≤ 1.0 detik setelah webhook diterima.
  2. Jika proses inferensi membutuhkan waktu lebih dari 5 detik, aksi pengetikan diulang secara berkala hingga pesan siap dikirim.

#### US-T04: Perintah Reset / Konteks Baru (/new & /reset)
- **Sebagai** Pengguna Telegram,
- **Saya ingin** mengirimkan perintah `/new` atau `/reset`,
- **Agar** percakapan di Telegram dibersihkan dan konteks baru dimulai.
- **Prioritas:** Must Have
- **Referensi:** FR-018, BR-002
- **Acceptance Criteria:**
  1. Perintah `/new` menandai sesi percakapan aktif sebelumnya telah ditutup dan menyiapkan sesi percakapan baru.
  2. Bot membalas dengan konfirmasi: "Percakapan baru telah dimulai. Konteks sebelumnya telah direset."

#### US-T05: Penautan Akun Web & Telegram (Account Linking)
- **Sebagai** Pengguna yang memakai Web dan Telegram,
- **Saya ingin** menautkan akun Telegram saya ke akun Web menggunakan kode `/link <KODE>`,
- **Agar** riwayat percakapan dan kuota saya menyatu di kedua platform.
- **Prioritas:** Should Have
- **Referensi:** FR-020, AUTH-007, OBJ-02, BR-004
- **Acceptance Criteria:**
  1. Di aplikasi Web (halaman Pengaturan), pengguna mengklik "Tautkan Telegram" untuk menghasilkan kode acak 6 karakter alfa-numerik (validitas 10 menit, sekali pakai).
  2. Pengguna mengirimkan perintah `/link <KODE>` di obrolan bot Telegram.
  3. Backend memverifikasi kode; jika valid, relasi `identity` Telegram dialihkan ke `user_id` akun Web.
  4. Setelah tertaut, seluruh percakapan yang dibuat di Telegram dapat diakses di Web, dan kuota pemakaian dihitung terpadu.
  5. Jika kode salah atau kedaluwarsa, bot memberikan pesan error ramah dan petunjuk pembuatan kode baru.

#### US-T06: Penanganan Pesan Non-Teks
- **Sebagai** Pengguna Telegram,
- **Saya ingin** diberi tahu secara sopan jika saya mengirim gambar, berkas dokumen, atau pesan audio,
- **Agar** saya memahami batasan kemampuan asisten pada versi saat ini.
- **Prioritas:** Must Have
- **Referensi:** FR-021, BR-005
- **Acceptance Criteria:**
  1. Webhook mendeteksi tipe konten foto, dokumen, voice note, stiker, atau lokasi.
  2. Bot merespons secara otomatis: "Mohon maaf, saat ini saya baru mendukung percakapan berbasis teks. Fitur analisis berkas dan gambar akan hadir pada pembaruan mendatang."
  3. Bot tidak memanggil orkestrator AI sehingga tidak ada token terbuang.

---

### 2.4 Fitur Lintas Platform & Tata Kelola

#### US-X01: Penegakan Kuota & Rate Limiting Terpadu
- **Sebagai** Pemilik Produk & Pengguna,
- **Saya ingin** sistem membatasi penggunaan pesan/token harian secara terpadu dan transparan,
- **Agar** biaya operasional inferensi AI terkendali dan pengguna mengetahui sisa hak aksesnya.
- **Prioritas:** Must Have
- **Referensi:** FR-022, TK-002, TK-004, BG-02
- **Acceptance Criteria:**
  1. Setiap permintaan pesan memeriksa sisa kuota token/pesan di Redis cache sebelum memanggil model AI.
  2. Jika kuota telah habis, sistem menolak pemanggilan model dan mengembalikan HTTP 429 pada Web atau pesan khusus di Telegram yang memuat jam reset kuota berikutnya.
  3. Pengguna dapat mengecek sisa kuota kapan saja melalui `/usage` di Telegram atau menu Pengaturan di Web.

#### US-X02: Penghapusan Akun & Hak Privasi Mandiri
- **Sebagai** Pengguna,
- **Saya ingin** dapat menghapus seluruh akun dan data riwayat percakapan saya secara mandiri,
- **Agar** hak privasi data saya terlindungi sepenuhnya.
- **Prioritas:** Must Have
- **Referensi:** FR-024, BR-006, DB-002
- **Acceptance Criteria:**
  1. Fitur "Hapus Akun" tersedia di Web Settings dengan proteksi konfirmasi ganda (memasukkan kata sandi).
  2. Menghapus akun menandai status pengguna `deleted` dan meng-anonymize data sensitif.
  3. Sesi langsung dicabut, dan akun tidak dapat lagi digunakan untuk login.
  4. Riwayat pesan dibersihkan dari basis data aktif secara permanen sesuai jadwal retensi sistem (maksimal 30 hari).

---

### 2.5 Peran: Administrator Sistem & Operasional

#### US-A01: Konfigurasi Model AI dan Prompt Dinamis Tanpa Redeploy
- **Sebagai** Admin Sistem,
- **Saya ingin** mengubah konfigurasi penyedia model aktif dan instruksi sistem (*system prompt*) melalui konfigurasi runtime,
- **Agar** sistem dapat cepat beradaptasi terhadap gangguan vendor LLM atau perbaikan panduan respons tanpa *downtime*.
- **Prioritas:** Should Have
- **Referensi:** FR-025, PM-001, PM-005, OBJ-03
- **Acceptance Criteria:**
  1. Konfigurasi model aktif dan system prompt disimpan terversi pada database/config store.
  2. Mengganti model aktif langsung diterapkan pada permintaan obrolan berikutnya tanpa restart server backend.
  3. Setiap perubahan tercatat di tabel `audit_logs` (mencatat `admin_id`, `timestamp`, dan `diff_config`).

#### US-A02: Pemantauan Penggunaan & Penonaktifan Akun Abusif
- **Sebagai** Admin Sistem,
- **Saya ingin** memantau metrik penggunaan token dan memiliki kemampuan menonaktifkan akun yang melakukan penyalahgunaan,
- **Agar** keandalan infrastruktur dan efisiensi biaya tetap terlindungi.
- **Prioritas:** Could Have (MVP minimum via database/CLI script; Web Admin UI Post-MVP)
- **Referensi:** FR-026, BR-007, MON-002, MON-005
- **Acceptance Criteria:**
  1. Admin dapat mengubah status pengguna menjadi `suspended` melalui query/API internal.
  2. Akun dengan status `suspended` langsung diblokir di middleware otentikasi Web dan Telegram Adapter.
  3. Admin tidak memiliki akses UI bebas untuk membaca isi teks percakapan pengguna (*conversation privacy principle*).

