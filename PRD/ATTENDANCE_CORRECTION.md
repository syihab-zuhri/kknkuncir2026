# PRD: Attendance Correction & Audit

**Status**: Approved  
**Priority**: P0  
**Owner Agent**: Backend + Frontend  
**Dependencies**: `QR_ATTENDANCE.md`, D1 audit migration  
**Last Updated**: 2026-07-31  
**Document Version**: 1.1.0

## Overview

Fitur ini memungkinkan Admin menambah catatan manual dan mengoreksi status kehadiran. Setiap perubahan harus dapat ditelusuri tanpa menghapus sejarah sebelumnya. Current state disimpan di `attendance_records`; setiap transisi disimpan append-only di `attendance_audits`.

> 💡 Reasoning: Current-state table membuat laporan cepat, sedangkan audit table mempertahankan histori. D1 atomic batch dan conditional audit insert memastikan update tidak terlepas dari audit.

## User Stories

- Sebagai Admin, saya ingin menambahkan Mahasiswa yang gagal scan.
- Sebagai Admin, saya ingin mengubah status karena izin, sakit, atau kesalahan input.
- Sebagai Admin, saya ingin melihat siapa yang melakukan perubahan dan alasannya.
- Sebagai Mahasiswa, saya ingin melihat status terbaru tanpa memperoleh data audit internal.

## Acceptance Criteria

- [ ] Admin dapat menambah attendance manual pada sesi valid.
- [ ] Manual attendance dan correction membutuhkan alasan 10–500 karakter.
- [ ] Manual create menghasilkan audit `MANUAL_CREATE`.
- [ ] Setiap status update menghasilkan audit dalam operasi atomic yang sama.
- [ ] Audit menyimpan before/after JSON yang relevan dan actor.
- [ ] Audit tidak dapat diedit atau dihapus dari application API.
- [ ] Manual insert tunduk pada unique `(session_id, student_id)`.
- [ ] Update memakai optimistic `expectedRevision`.
- [ ] Correction tidak mengubah waktu `recorded_at` awal.

## UI/UX Specifications

### Halaman / Komponen

- `/admin/attendance`
- `/admin/attendance/:id`
- `ManualAttendanceDialog`
- `CorrectionDialog`
- `AuditTimeline`

### States

- Empty audit: “Belum ada perubahan.”
- Validation: alasan terlalu pendek/panjang.
- Conflict: record sudah ada atau revision berubah.
- Success: timeline dan current state langsung diperbarui.

## API Contract

| Method | Endpoint | Auth | Request Body | Response |
|---|---|---|---|---|
| POST | `/api/v1/attendance/manual` | Admin | `{ sessionId, studentId, status, reason }` | `{ attendance, audit }` |
| PATCH | `/api/v1/attendance/:id` | Admin | `{ status, reason, expectedRevision }` | `{ attendance, audit }` |
| GET | `/api/v1/attendance/:id` | Admin/Own | none | `{ attendance }` |
| GET | `/api/v1/attendance/:id/audits` | Admin | none | `{ items }` |

## Data Model (Ringkas)

- `attendance_records`: current status, original method/time, `revision`.
- `attendance_audits`: append-only action, before/after JSON, reason, actor, time.
- `audit_logs`: optional higher-level administrative event metadata.

## Business Logic & Rules

- `COR-R1`: correction tidak mengubah `recorded_at` asli.
- `COR-R2`: manual record memakai `method = MANUAL`.
- `COR-R3`: koreksi status tidak mengubah method awal.
- `COR-R4`: hard delete attendance dan audit dilarang.
- `COR-R5`: reason disanitasi dan panjang 10–500 karakter.
- `COR-R6`: update condition harus menyertakan `revision = expectedRevision`.
- `COR-R7`: successful update increment `revision` satu kali.
- `COR-R7A`: service mengisi `updated_by` dari authenticated Admin sebelum correction.
- `COR-R8`: service memakai `DB.batch()` untuk optimistic mutation dan conditional audit insert.
- `COR-R9`: before/after JSON tidak boleh memasukkan password, auth token, raw QR, atau location.

## Error Handling

| Skenario Error | HTTP Code | Pesan ke User |
|---|---:|---|
| Alasan kosong/pendek | 422 | “Tuliskan alasan perubahan minimal 10 karakter.” |
| Attendance tidak ditemukan | 404 | “Data kehadiran tidak ditemukan.” |
| Manual duplicate | 409 | “Mahasiswa sudah memiliki catatan pada sesi ini.” |
| Concurrent update | 409 | “Data telah berubah. Muat ulang sebelum mengoreksi.” |
| D1 batch/audit gagal | 500 | “Perubahan tidak tersimpan. Coba lagi.” |

## Security Considerations

- Mutation Admin-only.
- Student own endpoint tidak mengembalikan audit timeline atau actor metadata.
- Actor ditentukan dari authenticated Admin, bukan request body.
- Audit endpoint Admin-only.
- Audit history bersifat append-only.
- Structured logs hanya menyimpan attendance ID/request ID, bukan before/after detail lengkap.

## Testing Checklist

- [ ] Integration: manual attendance creates audit.
- [ ] Integration: correction creates audit and increments revision.
- [ ] Integration: whole operation rollback bila salah satu statement gagal.
- [ ] Integration: duplicate manual rejected.
- [ ] Integration: stale revision returns 409.
- [ ] Integration: Student cannot correct or read audits.
- [ ] E2E: correction timeline.
- [ ] Integration: conditional audit insert tidak berjalan saat optimistic update gagal.

## Open Questions

Tidak ada blocker.
