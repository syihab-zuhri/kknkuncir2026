# DSD — Design System & UI/UX: kkndesakuncir

**Document Version**: 1.1.0  
**Last Updated**: 2026-07-31  
**Status**: Approved Baseline

## 1. Design Principles

1. **Mobile-first** — alur scan harus nyaman dengan satu tangan.
2. **Status-first** — sukses, duplikat, terlambat, dan gagal terlihat dalam <1 detik.
3. **Low cognitive load** — satu CTA primer per layar utama.
4. **Resilient** — izin kamera/lokasi gagal memiliki fallback jelas.
5. **Accessible** — warna selalu disertai ikon dan teks.

## 2. Design Tokens

### 2.1 Colors

```css
:root {
  --color-primary-50: #F0FDF4;
  --color-primary-100: #DCFCE7;
  --color-primary-600: #16A34A;
  --color-primary-700: #15803D;
  --color-primary-800: #166534;

  --color-info: #2563EB;
  --color-warning: #F59E0B;
  --color-danger: #DC2626;
  --color-success: #15803D;

  --color-bg: #F8FAFC;
  --color-surface: #FFFFFF;
  --color-border: #E2E8F0;
  --color-text: #0F172A;
  --color-muted: #64748B;
}
```

### 2.2 Spacing Scale

| Token | Value |
|---|---:|
| `space-1` | 4px |
| `space-2` | 8px |
| `space-3` | 12px |
| `space-4` | 16px |
| `space-5` | 20px |
| `space-6` | 24px |
| `space-8` | 32px |
| `space-10` | 40px |
| `space-12` | 48px |

### 2.3 Radius

| Token | Value | Use |
|---|---:|---|
| `radius-sm` | 6px | input kecil |
| `radius-md` | 10px | button/input |
| `radius-lg` | 16px | card/modal |
| `radius-full` | 9999px | badge/avatar |

### 2.4 Shadow

```css
--shadow-sm: 0 1px 2px rgb(15 23 42 / 0.06);
--shadow-md: 0 8px 24px rgb(15 23 42 / 0.10);
```

## 3. Typography

Font family: `Inter, system-ui, -apple-system, sans-serif`.

| Style | Size / Line | Weight | Use |
|---|---|---:|---|
| Display | 32/40 | 700 | halaman konfirmasi besar |
| H1 | 28/36 | 700 | judul halaman |
| H2 | 22/30 | 700 | section title |
| H3 | 18/26 | 600 | card title |
| Body | 16/24 | 400 | teks utama |
| Small | 14/20 | 400 | metadata |
| Caption | 12/16 | 500 | label/badge |

## 4. Responsive Breakpoints

| Breakpoint | Width | Behavior |
|---|---:|---|
| `sm` | 640px | form mulai dua kolom bila perlu |
| `md` | 768px | sidebar admin dapat muncul |
| `lg` | 1024px | table penuh dan dashboard grid |
| `xl` | 1280px | max content width 1200px |

### Layout Rules

- Mobile: bottom navigation untuk mahasiswa, top bar sederhana.
- Admin mobile: drawer navigation.
- Desktop admin: sidebar tetap 240px.
- Content max width: 1200px.
- Scanner viewport: rasio 1:1, max 520px.

## 5. Core Components

### 5.1 Button

Variants: Primary, Secondary, Danger, Ghost.

- Tinggi minimum 44px.
- Loading mempertahankan lebar tombol.
- Disabled memiliki cursor dan opacity jelas.

### 5.2 Input

- Label selalu terlihat.
- Error text di bawah input.
- Mobile input font minimal 16px untuk mencegah zoom otomatis iOS.

### 5.3 Status Badge

| Status | Label | Icon |
|---|---|---|
| PRESENT | Hadir | check-circle |
| LATE | Terlambat | clock |
| PERMITTED | Izin | file-check |
| SICK | Sakit | activity |
| ABSENT | Alpa | x-circle |

### 5.4 Attendance Result Card

Menampilkan:

- Ikon besar.
- Nama mahasiswa.
- Nama sesi.
- Waktu server lokal.
- Status.
- Metode.
- Lokasi: “Terekam ±24 m” / “Izin lokasi ditolak”.

### 5.5 QR Scanner

- Camera viewport dengan scan frame.
- Tombol ganti kamera bila tersedia.
- Tombol flash bila didukung.
- Fallback input token/kode manual.
- Self-scan tidak submit sebelum lokasi berhasil diperoleh.
- Jika lokasi ditolak/tidak tersedia, tampilkan CTA “Coba lokasi lagi” dan “Tampilkan QR Saya ke Admin”.
- Tidak menampilkan live camera setelah route berpindah.
- Cleanup MediaStream pada unmount.

### 5.6 Data Table / Mobile Cards

Desktop:

- Sticky header.
- Sort/filter server-side.
- Pagination.

Mobile:

- Card per record.
- Status di kanan atas.
- Detail expandable.

### 5.7 Dialog

- Fokus terkunci.
- Escape untuk menutup kecuali proses kritis.
- Konfirmasi destructive action menyebut objek secara spesifik.

## 6. Global States

### Loading

- Skeleton untuk list/dashboard.
- Inline spinner untuk submit.
- Scanner menampilkan “Memvalidasi…” tanpa mematikan kamera terlalu awal.

### Empty

- Beri penjelasan dan satu CTA.
- Contoh: “Belum ada sesi hari ini. Buat absensi harian.”

### Error

- Pesan manusiawi.
- Error code kecil untuk support.
- CTA “Coba lagi” jika aman/idempotent.

### Success

- Toast untuk mutasi admin ringan.
- Full result card untuk attendance.
- Haptic/audio hanya sebagai tambahan, tidak wajib.

## 7. Page-Level Specifications

### 7.1 Login

- Logo/nama `kkndesakuncir`.
- Input NIM/identifier dan password.
- Password visibility toggle.
- Tidak ada link daftar.

### 7.2 Student Home

Prioritas visual:

1. Sesi aktif.
2. Tombol “Scan QR Sesi”.
3. Tombol “Tampilkan QR Saya”.
4. Ringkasan kehadiran.

### 7.3 Admin Dashboard

- Active session cards.
- Quick create daily/event.
- Attendance count live.
- Recent activity.

### 7.4 Present Session QR

- QR besar dengan countdown expiry.
- Session title dan waktu.
- Tombol refresh token.
- Fullscreen mode.

### 7.5 Admin Continuous Scanner

- Nama sesi fixed header.
- Viewport.
- Last 5 scans.
- Success green panel 1–1.5 detik lalu scanner ready.
- Duplicate warning tidak menghentikan scanner.

## 8. Accessibility

- Target WCAG 2.2 AA.
- Contrast normal text ≥ 4.5:1.
- Focus ring minimum 2px.
- Semua icon button memiliki accessible name.
- Camera preview memiliki instruksi teks.
- Modal focus management diuji keyboard.
- `aria-live="polite"` untuk status scanner; error kritis `assertive`.

## 9. Content Style

- Gunakan Bahasa Indonesia yang singkat.
- Hindari istilah teknis seperti “payload” pada UI.
- Gunakan “Kehadiran berhasil dicatat”, bukan “Insert sukses”.
- Tanggal: `31 Juli 2026`.
- Waktu: `19.45 WIB`.
