# PRD: QR Attendance

**Status**: Approved  
**Priority**: P0  
**Owner Agent**: Fullstack  
**Dependencies**: `AUTH.md`, `GROUP_MANAGEMENT.md`, `ATTENDANCE_SESSION.md`  
**Last Updated**: 2026-07-31  
**Document Version**: 1.1.0

## Overview

Fitur QR Attendance mendukung mahasiswa memindai QR sesi dan Admin memindai QR pribadi mahasiswa. Pada self-scan, browser wajib memperoleh lokasi perangkat dan mengirimkannya bersama token sesi. Koordinat disimpan sebagai lokasi pengambilan absensi, tetapi tidak dibandingkan dengan geofence pada MVP.

> 💡 Reasoning: Menyimpan status lokasi selain koordinat membedakan izin ditolak, timeout, API tidak tersedia, dan lokasi berhasil. Ini lebih jujur daripada menyimpan koordinat kosong tanpa konteks.

## User Stories

- Sebagai Mahasiswa, saya ingin scan QR sesi agar kehadiran saya tercatat.
- Sebagai Mahasiswa, saya ingin melihat konfirmasi waktu dan status kehadiran.
- Sebagai Mahasiswa, saya ingin menunjukkan QR pribadi ketika admin mengambil absensi.
- Sebagai Admin, saya ingin memindai banyak mahasiswa secara cepat pada satu sesi.
- Sebagai Admin, saya ingin melihat lokasi self-scan untuk konteks verifikasi.

## Acceptance Criteria

- [ ] QR sesi berisi opaque signed token, session reference, nonce, dan expiry.
- [ ] QR tidak memuat data mahasiswa.
- [ ] QR mahasiswa berisi token acak yang dapat dirotasi/revoke.
- [ ] Self-scan hanya berhasil pada mode yang mengizinkan self-scan.
- [ ] Admin-scan hanya berhasil pada mode yang mengizinkan admin-scan.
- [ ] Lokasi diminta tepat sebelum submit self-scan.
- [ ] Jika lokasi berhasil, simpan latitude, longitude, accuracy, captured_at.
- [ ] Jika lokasi gagal/ditolak, attendance self-scan tidak diproses dan UI menawarkan coba lagi atau Admin scan.
- [ ] Satu mahasiswa tidak dapat memiliki dua record pada satu sesi.
- [ ] Response duplicate mengembalikan record existing.
- [ ] Scanner Admin tetap aktif setelah sukses dan memberikan feedback audio/haptic bila didukung.
- [ ] Timestamp official berasal dari server.

## UI/UX Specifications

### Halaman / Komponen

- `/student/scan`
- `/student/my-qr`
- `/admin/sessions/:id/present`
- `/admin/sessions/:id/scan`
- `QrScannerViewport`
- `LocationConsentSheet`
- `AttendanceResultCard`
- `StudentScanResultToast`

### Self-Scan Flow

1. Kamera permission.
2. Decode QR.
3. Validasi format client secara minimal.
4. Tampilkan penjelasan lokasi.
5. Ambil lokasi dengan timeout.
6. Submit ke server.
7. Tampilkan hasil final.

### Location States

- `CAPTURED`
- `DENIED` — UI error, tidak tersimpan sebagai attendance.
- `UNAVAILABLE` — UI error, tidak tersimpan sebagai attendance.
- `TIMEOUT` — UI error, tidak tersimpan sebagai attendance.
- `UNSUPPORTED` — UI error, gunakan Admin scan.

### Scanner Admin States

- Ready.
- Reading.
- Validating.
- Success dengan nama/NIM.
- Duplicate.
- Invalid/inactive student.
- Network retry.

## API Contract

| Method | Endpoint | Auth | Request Body | Response |
|---|---|---|---|---|
| POST | `/api/v1/sessions/:id/qr-token` | Admin | `{ ttlSeconds? }` | `{ token, expiresAt }` |
| POST | `/api/v1/attendance/self-scan` | Student | `{ qrToken, location, idempotencyKey }` | `{ attendance, duplicate }` |
| POST | `/api/v1/attendance/admin-scan` | Admin | `{ sessionId, studentQrToken, idempotencyKey }` | `{ attendance, student, duplicate }` |
| GET | `/api/v1/students/me/qr` | Student | none | `{ qrToken, qrVersion }` |
| POST | `/api/v1/students/:id/qr/rotate` | Admin | none | `{ qrVersion }` |
| GET | `/api/v1/attendance/me` | Student | filters | `{ items }` |

### Self-Scan Request Shape

```json
{
  "qrToken": "opaque.signed.token",
  "idempotencyKey": "uuid",
  "location": {
    "status": "CAPTURED",
    "latitude": -7.123456,
    "longitude": 111.123456,
    "accuracyMeters": 24.5,
    "capturedAt": "2026-07-31T12:00:00.000Z"
  }
}
```

## Data Model (Ringkas)

- `qr_credentials`: token hash/version untuk mahasiswa.
- `attendance_sessions`: sumber token sesi dan mode.
- `attendance_records`: status, method, timestamps, location fields.
- `attendance_audits`: perubahan administratif.

## Business Logic & Rules

- `QR-R1`: token sesi ditandatangani menggunakan secret server dan memiliki expiry maksimum configurable.
- `QR-R2`: server harus mencocokkan session id token dengan session aktif.
- `QR-R3`: mahasiswa dari token auth adalah mahasiswa yang dicatat pada self-scan; client tidak boleh mengirim student id.
- `QR-R4`: admin-scan memperoleh student id dari hash QR credential.
- `QR-R5`: status otomatis `LATE` bila `recorded_at > late_after`, selain itu `PRESENT`.
- `QR-R6`: database unique `(session_id, student_id)` adalah proteksi final duplikasi.
- `QR-R7`: `SELF_SCAN` hanya menerima `location.status = CAPTURED` dengan koordinat valid; kegagalan lokasi diselesaikan di UI sebelum request attendance dikirim.
- `QR-R8`: akurasi lokasi disimpan apa adanya dan ditampilkan sebagai “±N meter”.
- `QR-R9`: koordinat tidak pernah dimasukkan ke token QR.

## Error Handling

| Skenario Error | HTTP Code | Pesan ke User |
|---|---:|---|
| QR sesi invalid | 400 | “QR tidak dikenali.” |
| QR sesi expired | 410 | “QR telah kedaluwarsa. Scan QR terbaru.” |
| Sesi belum/ditutup | 409 | “Sesi absensi tidak sedang dibuka.” |
| Mode tidak mengizinkan | 403 | “Metode absensi ini tidak diaktifkan.” |
| Sudah tercatat | 200 | “Kehadiranmu sudah tercatat.” |
| QR mahasiswa invalid | 404 | “QR mahasiswa tidak valid.” |
| Akun mahasiswa nonaktif | 403 | “Akun mahasiswa tidak aktif.” |
| Lokasi tidak tersedia | 422 | “Lokasi diperlukan. Aktifkan izin lokasi atau tunjukkan QR kamu kepada admin.” |
| Rate limit | 429 | “Terlalu banyak percobaan. Tunggu sebentar.” |

## Security Considerations
- D1 unique constraint `(session_id, student_id)` adalah proteksi final double attendance.
- Multi-statement attendance mutation menggunakan atomic `DB.batch()` bila diperlukan.
- QR signing secret disimpan sebagai Cloudflare Worker secret.

- Signed token menggunakan algoritma dan secret yang layak; verifikasi di server.
- Simpan hash token QR mahasiswa, bukan token plaintext bila token persisten.
- Rate limit berdasarkan user, session, dan IP.
- Jangan log koordinat pada application log umum; simpan hanya dalam row terproteksi.
- Terapkan CSP dan permission policy untuk kamera/geolocation.
- Cegah replay dengan expiry, unique constraint, dan idempotency key.

## Testing Checklist

- [ ] Unit: sign/verify token dan expiry boundary.
- [ ] Unit: status late tepat pada boundary.
- [ ] Unit: location payload validation.
- [ ] Integration: self-scan success dengan lokasi.
- [ ] Integration: self-scan menolak payload tanpa koordinat.
- [ ] E2E: location denied menampilkan fallback Admin scan.
- [ ] Integration: wrong mode rejected.
- [ ] Integration: duplicate returns existing record.
- [ ] Integration: admin scan inactive student rejected.
- [ ] Concurrency: dua request bersamaan menghasilkan satu row.
- [ ] E2E mobile: camera permission denied fallback.
- [ ] E2E mobile: admin continuous scan.

## Open Questions

Tidak ada blocker. Default token QR sesi MVP: 5 menit; dapat diturunkan bila ingin lebih ketat.
