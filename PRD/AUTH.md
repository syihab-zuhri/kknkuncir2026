# PRD: Authentication & Account Provisioning

**Status**: Approved  
**Priority**: P0  
**Owner Agent**: Fullstack  
**Dependencies**: Cloudflare Worker, D1 binding `DB`, Better Auth configuration  
**Last Updated**: 2026-07-31  
**Document Version**: 1.1.0

## Overview

Fitur ini menyediakan login dua role serta pembuatan akun Mahasiswa oleh Admin. Registrasi publik tidak tersedia. Authentication memakai Better Auth dengan Cloudflare D1, Username plugin, dan Admin plugin.

Mahasiswa login menggunakan NIM. Saat provisioning, server membuat identity email internal `<nim>@users.zuhrirey.my.id` hanya untuk kompatibilitas auth dan tidak menjadikannya kanal komunikasi.

> 💡 Reasoning: Registrasi publik dihilangkan untuk mencegah akun asing masuk ke kelompok tunggal. Login NIM lebih mudah dipahami Mahasiswa daripada email yang mungkin tidak dikumpulkan.

## User Stories

- Sebagai Admin, saya ingin membuat akun Mahasiswa agar hanya anggota kelompok yang dapat menggunakan sistem.
- Sebagai Admin, saya ingin mengimpor akun dari CSV agar onboarding cepat.
- Sebagai Mahasiswa, saya ingin login menggunakan NIM dan mengganti password awal.
- Sebagai Admin, saya ingin menonaktifkan akun serta mencabut session aktif.
- Sebagai Admin, saya ingin mereset password menjadi password sementara yang wajib diganti.

## Acceptance Criteria

- [ ] Tidak ada halaman atau endpoint public registration.
- [ ] Admin dapat membuat akun dengan nama, NIM, dan password sementara.
- [ ] Username login sama dengan normalized NIM dan bersifat unik.
- [ ] Internal email dibuat server dan tidak diminta dari Mahasiswa.
- [ ] Mahasiswa dipaksa mengganti password pada login pertama.
- [ ] Role route guard dan endpoint authorization bekerja di server.
- [ ] Akun nonaktif/banned tidak dapat login atau memakai session lama.
- [ ] Reset password mencabut session aktif dan mengaktifkan `must_change_password`.
- [ ] Login gagal tidak mengungkap apakah NIM terdaftar.
- [ ] Password atau password hash tidak pernah dikembalikan API/log.

## UI/UX Specifications

### Halaman

- `/login`
- `/admin/students/new`
- `/admin/students/import`
- `/change-password`
- `/profile`

### Login Form

- Label identity: `NIM`.
- Preserve leading zero dan jangan cast ke number.
- Password visibility toggle.
- Tidak ada link daftar atau forgot-password publik.

### States

- Loading: tombol login disabled dan spinner.
- Error: generic credential error, akun nonaktif, rate limit, jaringan gagal.
- Success: redirect berdasarkan role.
- First login: redirect paksa ke perubahan password.

### Edge Cases

- NIM memiliki leading zero atau spasi saat input.
- CSV memiliki NIM duplikat, kosong, atau format tidak konsisten.
- Import diulang setelah sebagian row berhasil.
- Admin menonaktifkan user yang masih memiliki session.

## API Contract

Better Auth handler dapat berada di `/api/auth/[...all]`. Endpoint domain berikut membungkus flow Admin/application-specific:

| Method | Endpoint | Auth | Request Body | Response |
|---|---|---|---|---|
| POST | `/api/v1/auth/login` | Public | `{ nim, password }` | `{ user, nextAction }` |
| POST | `/api/v1/auth/logout` | User | none | `{ success }` |
| POST | `/api/v1/auth/change-password` | User | `{ currentPassword, newPassword }` | `{ success }` |
| GET | `/api/v1/auth/session` | User | none | `{ user, role, nextAction }` |
| POST | `/api/v1/admin/students` | Admin | `{ nim, fullName, temporaryPassword, phone? }` | `{ student }` |
| POST | `/api/v1/admin/students/import` | Admin | multipart CSV | `{ created, skipped, failed[] }` |
| PATCH | `/api/v1/admin/students/:id/status` | Admin | `{ isActive, reason }` | `{ student }` |
| POST | `/api/v1/admin/students/:id/reset-password` | Admin | `{ temporaryPassword, reason }` | `{ success }` |

## Data Model (Ringkas)

Merujuk `ERD.md`:

- Better Auth: `user`, `session`, `account`, `verification`.
- `user`: name, email internal, username/NIM, role, active/banned status, first-login flag.
- `students`: NIM dan data domain Mahasiswa.
- `audit_logs`: provisioning, import, reset, deactivation, and session revocation events.

## Business Logic & Rules

- `AUTH-R1`: hanya Admin dapat membuat akun Mahasiswa.
- `AUTH-R2`: public signup disabled pada server config dan UI.
- `AUTH-R3`: NIM dinormalisasi deterministik tetapi disimpan sebagai `TEXT`.
- `AUTH-R4`: `username = normalized NIM`.
- `AUTH-R5`: `email = <normalized-nim>@users.zuhrirey.my.id` dibuat server.
- `AUTH-R6`: Better Auth Admin plugin memakai custom access control dengan roles `ADMIN` dan `STUDENT`; `defaultRole = STUDENT`, dan hanya `ADMIN` memiliki administrative permissions.
- `AUTH-R6A`: role dari payload client diabaikan; account provisioning menetapkan `STUDENT` server-side.
- `AUTH-R7`: password baru minimal 10 karakter dan tidak sama dengan password sementara.
- `AUTH-R8`: akun nonaktif/banned ditolak pada setiap protected request, bukan hanya saat login.
- `AUTH-R9`: reset/deactivation mencabut seluruh session user.
- `AUTH-R10`: impor CSV idempotent berdasarkan NIM dan menghasilkan hasil per baris.
- `AUTH-R11`: bootstrap Admin hanya boleh berjalan bila belum ada Admin dan harus idempotent.

## Error Handling

| Skenario Error | HTTP Code | Pesan ke User |
|---|---:|---|
| Kredensial salah | 401 | “NIM atau password tidak sesuai.” |
| Akun nonaktif | 403 | “Akun dinonaktifkan. Hubungi admin.” |
| Password wajib diganti | 403/action | Redirect ke perubahan password |
| NIM sudah digunakan | 409 | “NIM sudah terdaftar.” |
| CSV tidak valid | 422 | “Beberapa baris tidak dapat diproses.” |
| Rate limit login | 429 | “Terlalu banyak percobaan. Coba lagi nanti.” |
| Auth service/database error | 503 | “Layanan login sedang bermasalah. Coba lagi.” |

## Security Considerations

- Better Auth secret hanya tersimpan sebagai Worker secret.
- D1 binding hanya tersedia pada Worker, tidak di browser.
- Rate limit login berdasarkan normalized identifier hash; IP hanya dicatat sebagai security signal, bukan key utama.
- Session cookie secure, HTTP-only, dan SameSite.
- Validate request origin pada state-changing cookie-authenticated calls.
- Jangan menyimpan internal email sebagai alamat komunikasi.
- Jangan mengembalikan password sementara setelah request selesai; tampilkan hanya sekali pada secure Admin workflow bila diperlukan.
- Audit pembuatan, import, reset, deactivate, dan session revocation.
- Generic auth error mencegah username enumeration.
- Disable Better Auth path `/is-username-available` karena tidak ada public registration dan endpoint tersebut dapat membantu enumerasi NIM.

## Testing Checklist

- [ ] Unit: normalization NIM dan internal email.
- [ ] Unit: password policy.
- [ ] Unit: CSV validation/idempotency.
- [ ] Integration: public signup disabled.
- [ ] Integration: Student cannot provision users.
- [ ] Integration: role payload cannot create Admin.
- [ ] Integration: inactive/banned account and existing session rejected.
- [ ] Integration: reset revokes existing sessions.
- [ ] E2E: first login forces password change.
- [ ] E2E: login redirects by role.
- [ ] Security: brute-force rate limiting and generic error.

## Open Questions

Tidak ada blocker. Login identifier final adalah NIM.
