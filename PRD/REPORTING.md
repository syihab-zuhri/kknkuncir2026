# PRD: Reporting & Export

**Status**: Approved  
**Priority**: P0  
**Owner Agent**: Fullstack  
**Dependencies**: `ATTENDANCE_SESSION.md`, `QR_ATTENDANCE.md`, `ATTENDANCE_CORRECTION.md`  
**Last Updated**: 2026-07-31  
**Document Version**: 1.1.0

## Overview

Reporting menyediakan rekap harian, per kegiatan, dan per mahasiswa. Admin dapat memfilter data dan mengunduh CSV. Mahasiswa hanya dapat melihat riwayatnya sendiri.

## User Stories

- Sebagai Admin, saya ingin melihat siapa yang belum hadir pada sesi tertentu.
- Sebagai Admin, saya ingin melihat rekap per mahasiswa.
- Sebagai Admin, saya ingin mengunduh CSV untuk laporan KKN.
- Sebagai Mahasiswa, saya ingin memeriksa riwayat kehadiran saya.

## Acceptance Criteria

- [ ] Dashboard menampilkan ringkasan sesi aktif dan kehadiran hari ini.
- [ ] Laporan dapat difilter berdasarkan rentang tanggal, tipe sesi, status, dan mahasiswa.
- [ ] Detail sesi menampilkan hadir dan belum tercatat.
- [ ] CSV menggunakan UTF-8 BOM agar nyaman dibuka di spreadsheet umum.
- [ ] Export memuat waktu lokal Asia/Jakarta.
- [ ] Lokasi tidak masuk CSV default; admin dapat memilih kolom lokasi.
- [ ] Mahasiswa hanya melihat record miliknya.

## UI/UX Specifications

### Halaman

- `/admin/dashboard`
- `/admin/reports`
- `/admin/reports/sessions/:id`
- `/student/history`

### Dashboard Cards

- Sesi aktif.
- Hadir hari ini.
- Terlambat hari ini.
- Belum tercatat.

### Table Columns

- Tanggal.
- Jenis sesi.
- Nama sesi.
- Nama mahasiswa.
- NIM.
- Status.
- Waktu tercatat.
- Metode.
- Status lokasi.

### Responsive Behavior

- Desktop: table.
- Mobile: card list dengan filter drawer.

## API Contract

| Method | Endpoint | Auth | Request Body | Response |
|---|---|---|---|---|
| GET | `/api/v1/dashboard/summary` | Admin | query date | `{ activeSessions, counts }` |
| GET | `/api/v1/reports/attendance` | Admin | query filters | `{ items, totals, pagination }` |
| GET | `/api/v1/reports/sessions/:id` | Admin | none | `{ session, records, missingStudents }` |
| GET | `/api/v1/reports/students/:id` | Admin/Own | query range | `{ student, summary, records }` |
| GET | `/api/v1/reports/attendance.csv` | Admin | query filters | CSV stream |

## Data Model (Ringkas)

Menggunakan join/read model dari:

- `attendance_sessions`
- `attendance_records`
- `students`
- Better Auth `user`

Materialized view belum diperlukan pada MVP.

> 💡 Reasoning: Data satu kelompok cukup kecil. Query terindeks lebih sederhana daripada menambah pipeline agregasi prematur.

## Business Logic & Rules

- `REP-R1`: semua tanggal ditampilkan dalam Asia/Jakarta.
- `REP-R2`: missing student dihitung dari mahasiswa aktif dikurangi attendance record sesi.
- `REP-R3`: cancelled session tidak masuk agregat default.
- `REP-R4`: CSV mematuhi filter yang sama dengan UI.
- `REP-R5`: kolom koordinat bersifat opt-in.

## Error Handling

| Skenario Error | HTTP Code | Pesan ke User |
|---|---:|---|
| Rentang terlalu besar | 422 | “Pilih rentang tanggal yang lebih kecil.” |
| Session tidak ditemukan | 404 | “Sesi tidak ditemukan.” |
| Export gagal | 500 | “Laporan gagal dibuat. Coba lagi.” |
| Tidak ada data | 200 | Empty state, bukan error. |

## Security Considerations
- API laporan private mengirim `Cache-Control: private, no-store`.
- Query Mahasiswa selalu di-scope pada authenticated `user.id` melalui repository.

- Export endpoint Admin-only.
- Formula injection CSV dicegah dengan escaping nilai yang diawali `=`, `+`, `-`, `@`.
- Batasi pagination dan export row count.
- Jangan cache laporan private pada CDN publik.

## Testing Checklist

- [ ] Unit: aggregate counts.
- [ ] Unit: CSV escaping/formula injection.
- [ ] Integration: missing student calculation.
- [ ] Integration: student own report only.
- [ ] E2E: filter report and download CSV.
- [ ] Timezone: record UTC tampil benar di Asia/Jakarta.

## Open Questions

Tidak ada blocker.
