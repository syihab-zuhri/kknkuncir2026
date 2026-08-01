# PRD: Group & Student Management

**Status**: Implemented; Production Rollout Pending
**Priority**: P0  
**Owner Agent**: Fullstack  
**Dependencies**: `AUTH.md`  
**Last Updated**: 2026-08-01
**Document Version**: 1.2.0

## Overview

Fitur ini menyimpan identitas satu kelompok KKN Desa Kuncir serta daftar mahasiswa anggotanya. Walaupun MVP hanya satu kelompok, data tetap ditempatkan pada tabel konfigurasi agar sistem tidak hardcoded.

> 💡 Reasoning: Menyimpan group sebagai entity tunggal mempermudah migrasi ke multi-group tanpa mengubah struktur attendance secara besar.

## User Stories

- Sebagai Admin, saya ingin mengatur identitas kelompok agar laporan memiliki konteks.
- Sebagai Admin, saya ingin melihat dan mencari mahasiswa.
- Sebagai Admin, saya ingin memperbarui data mahasiswa tanpa mengubah histori kehadiran.
- Sebagai Mahasiswa, saya ingin melihat profil kelompok dan data saya sendiri.

## Acceptance Criteria

- [x] Hanya satu `group_settings` aktif pada MVP.
- [x] Admin dapat mengubah nama kelompok, desa, alamat, periode mulai/selesai.
- [x] Admin dapat mengatur jadwal default harian, batas terlambat, mode default, dan auto-create.
- [x] Admin dapat mencari mahasiswa berdasarkan nama atau NIM.
- [x] Mahasiswa hanya dapat melihat profilnya sendiri.
- [x] Menonaktifkan mahasiswa tidak menghapus histori attendance.
- [x] NIM tidak dapat diubah setelah memiliki attendance tanpa flow koreksi administratif.

## UI/UX Specifications

### Halaman

- `/admin/settings/group`
- `/admin/students`
- `/admin/students/:id`
- `/student/profile`

### Komponen

- Group settings form.
- Daily attendance policy form.
- Student table/card responsive.
- Import CSV dialog.
- Status badge aktif/nonaktif.

### States

- Empty: belum ada mahasiswa, tampilkan CTA tambah/impor.
- Error: gagal menyimpan setting.
- Loading: skeleton daftar mahasiswa.
- Success: toast dan data ter-refresh.

## API Contract

| Method | Endpoint | Auth | Request Body | Response |
|---|---|---|---|---|
| GET | `/api/v1/group` | User | none | `{ group }` |
| PATCH | `/api/v1/group` | Admin | `{ name, village, address, periodStart, periodEnd, dailyPolicy }` | `{ group }` |
| GET | `/api/v1/students` | Admin | query filters | `{ items, pagination }` |
| GET | `/api/v1/students/:id` | Admin/Own | none | `{ student }` |
| PATCH | `/api/v1/students/:id` | Admin | editable student fields | `{ student }` |
| POST | `/api/v1/admin/students` | Admin | `{ nim, fullName, phone?, notes?, temporaryPassword }` | `{ student }` |
| PATCH | `/api/v1/admin/students/:id/status` | Admin | `{ isActive, reason }` | `{ student }` |
| POST | `/api/v1/admin/students/:id/reset-password` | Admin | `{ temporaryPassword, reason }` | `{ success }` |
| POST | `/api/v1/admin/students/import` | Admin | `{ csv, dryRun }` | `{ dryRun, summary, results }` |
| GET | `/api/v1/me/profile` | Student | none | `{ student }` |

Endpoint `/api/v1/admin/students` dipertahankan untuk compatibility dengan kontrak provisioning Phase 1. Read/list/edit canonical tetap berada di `/api/v1/students` sesuai blueprint.

### CSV Import Contract

- Encoding text UTF-8, header wajib `nim,nama`, header opsional `telepon`.
- Alias `fullName`/`phone` diterima untuk interoperability, tetapi template operator tetap memakai header Indonesia.
- Maksimal 50 data rows; blank rows diabaikan.
- Quoted field dan escaped quote didukung; malformed quote ditolak sebagai satu request 422.
- Dry-run wajib dilakukan UI sebelum apply. Dry-run memeriksa format, duplikat di CSV, dan NIM yang sudah tersimpan.
- Apply memproses setiap baris valid secara terpisah dan mengembalikan `CREATED`, `INVALID`, atau `ERROR` per baris.
- Password sementara dibuat server-side, minimal 16 karakter berisi huruf/angka, hanya tampil pada response apply, dan tidak masuk CSV, audit, atau log.

## Data Model (Ringkas)

- `group_settings`: single active configuration.
- `students`: profile extension, NIM, phone optional.
- Better Auth `user`: name, role, active/banned status.
- `students`: domain profile, NIM, phone optional.

## Business Logic & Rules

- `GROUP-R1`: satu group aktif untuk deployment MVP.
- `GROUP-R2`: `period_end` harus setelah `period_start`.
- `GROUP-R3`: data historis tidak dihapus saat akun dinonaktifkan.
- `GROUP-R4`: mahasiswa tidak dapat mengubah NIM sendiri.
- `GROUP-R5`: jadwal harian hanya menghasilkan sesi di antara `period_start` dan `period_end`.
- `GROUP-R6`: start/end time harian disimpan sebagai waktu lokal Asia/Jakarta.

## Error Handling

| Skenario Error | HTTP Code | Pesan ke User |
|---|---:|---|
| Group config tidak ditemukan | 404 | “Konfigurasi kelompok belum dibuat.” |
| Periode tidak valid | 422 | “Tanggal selesai harus setelah tanggal mulai.” |
| Mahasiswa tidak ditemukan | 404 | “Data mahasiswa tidak ditemukan.” |
| Akses profil mahasiswa lain | 403 | “Kamu tidak memiliki akses ke data ini.” |

## Security Considerations

- Worker repository query Mahasiswa wajib di-scope dengan `students.user_id = authenticatedUser.id`.
- Nomor telepon bersifat opsional dan tidak masuk laporan default.
- Update data admin dicatat ke audit log umum.

## Testing Checklist

- [x] Unit: period date validation.
- [x] Integration: mahasiswa tidak dapat list semua mahasiswa.
- [x] Integration: deactivation preserves attendance.
- [ ] E2E: admin edit group settings.
- [ ] E2E: pencarian nama dan NIM.

## Open Questions

Tidak ada blocker.
