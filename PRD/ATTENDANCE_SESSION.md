# PRD: Daily & Event Attendance Sessions

**Status**: Approved  
**Priority**: P0  
**Owner Agent**: Fullstack  
**Dependencies**: `AUTH.md`, `GROUP_MANAGEMENT.md`  
**Last Updated**: 2026-07-31  
**Document Version**: 1.1.0

## Overview

Sesi adalah konteks untuk setiap catatan kehadiran. Sistem mendukung `DAILY` untuk satu slot per tanggal dan `EVENT` untuk kegiatan tertentu. Keduanya menggunakan lifecycle, mode QR, dan mesin validasi yang sama.

> 💡 Reasoning: Model sesi tunggal mencegah duplikasi implementasi antara absensi harian dan kegiatan, tetapi unique constraint khusus menjaga aturan satu daily session per hari.

## User Stories

- Sebagai Admin, saya ingin absensi harian tersedia otomatis setiap hari.
- Sebagai Admin, saya ingin membuat kegiatan dan mengambil kehadiran khusus kegiatan itu.
- Sebagai Admin, saya ingin memilih metode scan per sesi.
- Sebagai Mahasiswa, saya ingin melihat sesi yang sedang aktif.

## Acceptance Criteria

- [ ] Tipe sesi hanya `DAILY` atau `EVENT`.
- [ ] `DAILY` memiliki judul otomatis yang dapat disunting, misalnya “Absensi Harian 1 Agustus 2026”.
- [ ] Hanya satu sesi `DAILY` non-cancelled per tanggal.
- [ ] Job terjadwal membuat sesi `DAILY` untuk tanggal berjalan selama periode KKN menggunakan konfigurasi default kelompok.
- [ ] Auto-create idempotent; eksekusi berulang tidak membuat sesi ganda.
- [ ] Admin dapat membuat sesi harian manual bila sesi belum tersedia.
- [ ] `EVENT` wajib memiliki nama kegiatan.
- [ ] Mode hanya `SELF_SCAN`, `ADMIN_SCAN`, atau `HYBRID`.
- [ ] Lifecycle: `DRAFT`, `OPEN`, `CLOSED`, `CANCELLED`.
- [ ] Sesi hanya menerima attendance saat `OPEN` dan dalam jendela waktu.
- [ ] Admin dapat menutup sesi lebih awal.
- [ ] Batas terlambat dapat kosong; jika kosong semua valid scan menjadi hadir.

## UI/UX Specifications

### Halaman

- `/admin/sessions`
- `/admin/sessions/new`
- `/admin/sessions/:id`
- `/admin/sessions/:id/present`
- `/admin/sessions/:id/scan`
- `/student/home`

### Form Fields

- Tipe sesi.
- Judul/nama kegiatan.
- Tanggal.
- Waktu mulai dan selesai.
- Waktu batas terlambat.
- Mode QR.
- Catatan opsional.

### States

- Draft: dapat diedit penuh.
- Open: CTA tampilkan QR/scan mahasiswa.
- Closed: hanya read/report/correction.
- Cancelled: tidak menerima attendance.

## API Contract

| Method | Endpoint | Auth | Request Body | Response |
|---|---|---|---|---|
| GET | `/api/v1/sessions` | User | filters | `{ items }` |
| POST | `/api/v1/sessions` | Admin | session payload | `{ session }` |
| GET | `/api/v1/sessions/:id` | User | none | `{ session, summary }` |
| PATCH | `/api/v1/sessions/:id` | Admin | editable fields | `{ session }` |
| POST | `/api/v1/sessions/:id/open` | Admin | none | `{ session }` |
| POST | `/api/v1/sessions/:id/close` | Admin | none | `{ session }` |
| POST | `/api/v1/sessions/:id/cancel` | Admin | `{ reason }` | `{ session }` |
| GET | `/api/v1/sessions/active` | User | none | `{ daily?, events[] }` |

## Data Model (Ringkas)

`attendance_sessions`:

- `session_type`
- `title`
- `session_date`
- `starts_at`, `ends_at`, `late_after`
- `attendance_mode`
- `status`
- `created_by`

## Business Logic & Rules

- `SESSION-R1`: `starts_at < ends_at`.
- `SESSION-R2`: `late_after` harus berada antara start dan end.
- `SESSION-R3`: open hanya boleh bila waktu sekarang belum melewati end.
- `SESSION-R4`: session dengan attendance tidak boleh dihapus; hanya close/cancel sesuai rule.
- `SESSION-R5`: perubahan mode setelah ada attendance harus dicatat audit dan tidak mengubah metode record lama.
- `SESSION-R6`: mahasiswa hanya melihat sesi aktif dan histori sesi yang memiliki record miliknya.
- `SESSION-R7`: daily generator tidak berjalan di luar periode KKN atau saat auto-create dimatikan.
- `SESSION-R8`: sesi hasil auto-create tetap dapat diedit Admin sebelum status `OPEN`.

## Error Handling

| Skenario Error | HTTP Code | Pesan ke User |
|---|---:|---|
| Daily session sudah ada | 409 | “Absensi harian untuk tanggal ini sudah tersedia.” |
| Rentang waktu salah | 422 | “Waktu selesai harus setelah waktu mulai.” |
| Mode tidak valid | 422 | “Pilih metode absensi yang tersedia.” |
| Open session kedaluwarsa | 409 | “Sesi tidak dapat dibuka karena waktunya telah berakhir.” |
| Cancel tanpa alasan | 422 | “Alasan pembatalan wajib diisi.” |

## Security Considerations
- Daily generator dijalankan melalui Cloudflare Cron Trigger dan harus idempotent.
- Cron menggunakan D1 binding `DB`; waktu bisnis dihitung eksplisit dalam `Asia/Jakarta`.

- Semua mutasi session Admin-only.
- Validasi waktu dilakukan di server.
- Jangan percaya status atau timestamp dari client.
- Log perubahan lifecycle.

## Testing Checklist

- [ ] Unit: daily uniqueness logic.
- [ ] Unit: time and late boundary.
- [ ] Integration: mahasiswa tidak dapat membuat sesi.
- [ ] Integration: closed/cancelled session rejects attendance.
- [ ] E2E: create and open daily session.
- [ ] E2E: create event on same date as daily session.

## Open Questions

Tidak ada blocker. Default jendela absensi harian dapat dikonfigurasi pada environment/app setting.
