# Design System: Multi-Platform General-Purpose AI Assistant

**Versi Dokumen:** 1.0  
**Tanggal:** 7 November 2026  
**Status:** Approved Design Baseline  
**Framework Implementasi:** Tailwind CSS v3+ / Radix UI Primitives  
**Referensi:** PRD Section 24.1, FR-015, WEB-006

---

## 1. Design System Philosophy

Design system ini dirancang untuk menciptakan antarmuka asisten percakapan yang modern, elegan, jernih, dan fungsional. Kami menggunakan palet warna netral berbasis **Zinc / Slate** yang dipadukan dengan aksen warna **Electric Indigo & Teal** yang orisinal, menjauhkan produk dari imitasi visual produk AI lain.

---

## 2. Color System & Theme Tokens

Sistem warna mendukung tema **Light Mode** dan **Dark Mode** secara native menggunakan CSS custom properties dan utilitas Tailwind CSS.

### 2.1 Palet Warna Utama (Palette Values)

| Token Name | Hex Code | Deskripsi Pemakaian |
| :--- | :--- | :--- |
| **Brand Primary 600** | `#4F46E5` | Aksen tombol utama, status aktif, link (Light Mode) |
| **Brand Primary 500** | `#6366F1` | Aksen tombol hover, elemen interaktif aktif (Dark Mode) |
| **Brand Primary 50** | `#EEF2FF` | Latar belakang subtle hover, bubble pengguna (Light Mode) |
| **Accent Emerald** | `#10B981` | Indikator sukses, status online, aksi tersalin |
| **Accent Amber** | `#F59E0B` | Peringatan kuota mendekati batas, status retry |
| **Accent Rose** | `#EF4444` | Pesan error, tombol destruktif (hapus akun/chat) |

### 2.2 Semantic Color Mapping (Light vs. Dark Theme)

| Peran Elemen UI | Token Tailwind (Light Mode) | Token Tailwind (Dark Mode) |
| :--- | :--- | :--- |
| **Latar Belakang Aplikasi** | `bg-white` (`#FFFFFF`) | `bg-zinc-950` (`#09090B`) |
| **Latar Belakang Sidebar** | `bg-zinc-50` (`#FAFAFA`) | `bg-zinc-900` (`#18181B`) |
| **Garis Batas / Border** | `border-zinc-200` (`#E4E4E7`) | `border-zinc-800` (`#27272A`) |
| **Teks Utama (Headings)** | `text-zinc-900` (`#18181B`) | `text-zinc-50` (`#FAFAFA`) |
| **Teks Sekunder (Body/Muted)**| `text-zinc-500` (`#71717A`) | `text-zinc-400` (`#A1A1AA`) |
| **Bubble Pesan Pengguna** | `bg-zinc-100 text-zinc-900` | `bg-zinc-800 text-zinc-100` |
| **Bubble Pesan Asisten** | `bg-transparent text-zinc-900`| `bg-transparent text-zinc-100`|
| **Latar Composer Input** | `bg-white border-zinc-300` | `bg-zinc-900 border-zinc-700` |
| **Latar Blok Kode (Syntax)** | `bg-zinc-900 text-zinc-100` | `bg-black text-zinc-200` |

---

## 3. Typography Scale & Hierarchy

Sistem tipografi menggunakan font sans-serif modern yang mudah dibaca di layar digital.
- **Font Family Utama:** `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- **Font Family Monospace (Blok Kode):** `"JetBrains Mono", "Fira Code", Menlo, Monaco, Consolas, monospace`

| Tingkat (Scale) | Ukuran (Size) | Line Height | Weight | Penggunaan |
| :--- | :--- | :--- | :--- | :--- |
| `text-xs` | 12 px (0.75rem) | 16 px | Regular (400) / Medium (500) | Timestamp, disclaimer footer, label counter |
| `text-sm` | 14 px (0.875rem) | 20 px | Regular (400) / Medium (500) | Item riwayat sidebar, tombol navigasi, teks form |
| `text-base` | 16 px (1.000rem) | 26 px | Regular (400) | Teks isi percakapan (body text chat bubble) |
| `text-lg` | 18 px (1.125rem) | 28 px | SemiBold (600) | Sub-heading (Markdown H3), judul modal |
| `text-xl` | 20 px (1.250rem) | 30 px | SemiBold (600) | Markdown H2, judul percakapan aktif |
| `text-2xl` | 24 px (1.500rem) | 34 px | Bold (700) | Markdown H1, headline halaman autentikasi |

---

## 4. Spacing, Sizing, & Layout Grid

Sistem grid dan margin menggunakan kelipatan standar **4 px (0.25rem)**:
- `space-1`: 4 px
- `space-2`: 8 px (Jarak antar ikon dan teks)
- `space-3`: 12 px (Padding vertikal input form)
- `space-4`: 16 px (Padding standar card dan container mobile)
- `space-6`: 24 px (Jarak vertikal antar giliran pesan)
- `space-8`: 32 px (Padding container desktop)

**Radius Sudut Elemen (Border Radius):**
- Komponen kecil (Badge, Tag, Tombol Salin): `rounded-md` (6 px)
- Tombol Utama & Input Form: `rounded-lg` (8 px)
- Container Card & Modal: `rounded-xl` (12 px)
- Composer Input Pill & Chat Bubbles: `rounded-2xl` (16 px)

---

## 5. Component Guidelines

### 5.1 Button Variants

```html
<!-- Primary Button -->
<button class="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-4 py-2 rounded-lg transition-colors focus:ring-2 focus:ring-indigo-500 focus:outline-none">
  Chat Baru
</button>

<!-- Secondary / Outline Button -->
<button class="border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 px-4 py-2 rounded-lg transition-colors">
  Pengaturan
</button>

<!-- Destructive Button -->
<button class="bg-red-600 hover:bg-red-700 text-white font-medium px-4 py-2 rounded-lg transition-colors">
  Hapus Percakapan
</button>

<!-- Ghost / Icon-only Button -->
<button class="p-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-md transition-colors" aria-label="Salin">
  <CopyIcon class="w-4 h-4" />
</button>
```

### 5.2 Form & Input Components
- **Input Text:** Background putih (gelap pada dark mode), border `zinc-300` (`zinc-700` pada dark mode), ring fokus `indigo-500`.
- **Textarea Composer:** Borderless atau border halus transparan, background menyatu dengan pill wrapper, auto-expanding tanpa scrollbar melompat.
- **Status Validasi Error:** Border berganti merah `red-500`, teks peringatan kecil di bawah input `text-xs text-red-500`.

### 5.3 Chat Thread Components

#### User Message Bubble
- Tata letak: Rata kanan (`flex justify-end`).
- Kontainer: `max-w-2xl bg-zinc-100 dark:bg-zinc-800 rounded-2xl px-4 py-3 text-zinc-900 dark:text-zinc-100 text-base`.
- Aksi: Tombol pensil edit prompt muncul halus (*fade-in*) di sisi kiri bubble saat pointer mouse berada di atas elemen (`group-hover:opacity-100`).

#### Assistant Message Bubble
- Tata letak: Rata kiri (`flex justify-start gap-4 items-start`).
- Avatar: Lingkaran 32 px (`w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white`).
- Kontainer Teks: `max-w-3xl flex-1 text-base text-zinc-900 dark:text-zinc-100 leading-relaxed`.
- Animasi Kursor: Saat streaming aktif, kursor ditampilkan menggunakan elemen inline:
  ```html
  <span class="inline-block w-2 h-4 ml-1 bg-indigo-500 animate-pulse"></span>
  ```

#### Syntax Highlighted Code Block
- Kontainer luar: `rounded-xl overflow-hidden border border-zinc-800 my-4 bg-zinc-950`.
- Header bar kode: `flex justify-between items-center px-4 py-2 bg-zinc-900 text-xs text-zinc-400 font-mono border-b border-zinc-800`.
  - Sisi kiri: Nama bahasa (misal: `TYPESCRIPT`, `PYTHON`, `SQL`).
  - Sisi kanan: Tombol interaktif "Salin Kode" dengan ikon clip.
- Area kode: `p-4 overflow-x-auto text-sm font-mono text-zinc-200 leading-normal`.

---

## 6. Starter Suggestion Cards (Empty State)

Saat pengguna berada di sesi baru tanpa pesan, area chat menampilkan grid 2x2 kartu inspirasi prompt:
- Kontainer kartu: `p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-indigo-500 dark:hover:border-indigo-400 transition-all cursor-pointer shadow-sm hover:shadow-md`.
- Judul kartu: `text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1 flex items-center gap-2`.
- Deskripsi: `text-xs text-zinc-500 dark:text-zinc-400`.

