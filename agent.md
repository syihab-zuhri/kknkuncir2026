# agent — Handoff Instructions: kkndesakuncir

**Document Version**: 1.1.0  
**Last Updated**: 2026-07-31  
**Status**: Ready for Claude Code / Codex

## 1. Mission

Implement `kkndesakuncir`, website absensi KKN untuk satu kelompok dengan absensi harian dan per kegiatan, dua role (`ADMIN`, `STUDENT`), serta QR self-scan/Admin-scan/hybrid.

Production target:

- Repository: `https://github.com/syihab-zuhri/kknkuncir2026.git`
- Runtime: Cloudflare Workers melalui OpenNext
- Database: Cloudflare D1
- Domain: `https://zuhrirey.my.id`

## 2. Source-of-Truth Order

Baca sebelum coding:

1. `PLANNING.md`
2. `SRS.md`
3. `ARCHITECTURE.md`
4. `ERD.md`
5. `PERMISSION.md`
6. `DSD.md`
7. `PRD/_INDEX.md` dan PRD fitur yang sedang dikerjakan
8. `TASKS.md`
9. `credential.md`
10. `DEPLOYMENT.md`

Bila dokumen bertentangan, hentikan implementasi bagian tersebut dan perbarui dokumen secara konsisten sebelum lanjut.

## 3. Non-Negotiable Architecture Rules

- Gunakan Next.js App Router + TypeScript.
- Deploy full-stack ke Cloudflare Workers dengan `@opennextjs/cloudflare`.
- Jangan menambahkan Vercel, Supabase, Firebase, atau backend eksternal tanpa keputusan arsitektur baru.
- Gunakan D1 binding `DB`; browser tidak boleh mengakses database langsung.
- Gunakan Drizzle ORM dan committed SQL migrations.
- Gunakan Better Auth dengan D1 adapter, Username plugin, dan Admin plugin. Definisikan custom access-control roles `ADMIN`/`STUDENT`; jangan mengandalkan default lowercase `admin`/`user`.
- Gunakan NIM sebagai username Mahasiswa.
- Gunakan internal auth email `<nim>@users.zuhrirey.my.id`; jangan perlakukan sebagai email nyata.
- Gunakan Web Crypto API untuk random token, hashing, dan signed QR token.
- Gunakan Cloudflare Rate Limiting untuk login dan attendance endpoints.
- Gunakan Workers Logs/Traces; jangan menambahkan Sentry pada MVP kecuali diminta.
- Gunakan `wrangler.jsonc` sebagai source of truth bindings/deployment.

## 4. Domain Rules

- Hanya satu kelompok aktif pada MVP.
- Hanya dua role: `ADMIN`, `STUDENT`.
- Akun Mahasiswa hanya dibuat Admin; public signup dilarang.
- Sesi terdiri dari `DAILY` dan `EVENT`.
- Hanya satu `DAILY` non-cancelled per tanggal.
- Satu Mahasiswa hanya memiliki satu attendance record per sesi.
- Satu sesi dapat memakai `SELF_SCAN`, `ADMIN_SCAN`, atau `HYBRID`.
- Self-scan wajib memiliki geolocation yang berhasil ditangkap.
- Lokasi disimpan tetapi tidak digunakan untuk geofence pada MVP.
- Bila lokasi tidak tersedia, Mahasiswa menunjukkan QR pribadinya kepada Admin.
- Waktu attendance selalu ditentukan server.
- Manual attendance dan correction wajib memiliki alasan serta audit.

## 5. For the Frontend Agent

- Ikuti `DSD.md`; jangan hardcode warna/spacing di luar design tokens.
- Prioritaskan browser HP dan satu CTA utama pada scanner flow.
- Handle Loading, Empty, Error, Success, permission denied, camera unavailable, dan duplicate states.
- Cleanup `MediaStream` saat scanner unmount atau route berubah.
- Jangan percaya role, timestamps, `studentId`, status, atau coordinates yang hanya ada di client state.
- Jangan tampilkan precise location kepada Mahasiswa setelah submit.
- Gunakan API error `code` untuk mapping UI, bukan string matching message.

## 6. For the Backend/Fullstack Agent

- Implement schema sesuai `ERD.md` dengan D1-safe types.
- Jangan memakai PostgreSQL-specific SQL/types.
- Semua endpoint mengikuti API Contract pada PRD terkait.
- Enforce `PERMISSION.md` pada route, service, dan ownership-scoped query.
- Self-scan menentukan student dari authenticated user; abaikan/tolak `studentId` client.
- Gunakan unique constraint `(session_id, student_id)` sebagai final duplicate guard.
- Gunakan D1 prepared statements/Drizzle dan atomic `DB.batch()` untuk multi-step mutations.
- Gunakan optimistic `revision` untuk correction.
- Jangan log password, cookie, raw QR token, signing secret, atau precise location.
- Set private attendance/report responses ke `Cache-Control: private, no-store`.

## 7. For the Database Agent

- Generate Better Auth schema dari config/version package yang benar.
- Review plugin-added fields sebelum migration.
- Store IDs as `TEXT`, timestamps as epoch milliseconds, booleans as `INTEGER`, JSON as `TEXT`.
- Implement all critical indexes/check constraints from `ERD.md`.
- Jangan hard-delete attendance or audit history.
- Test migrations local and preview before production.
- Jangan mengubah migration production yang sudah applied.

## 8. For the Infra/DevOps Agent

- Ikuti `credential.md` dan `DEPLOYMENT.md`.
- Resource production names harus konsisten dengan dokumen.
- Workers Builds terhubung ke GitHub branch `main`.
- Preview deployment harus memakai preview D1 dan secrets berbeda.
- Domain production adalah `zuhrirey.my.id`.
- Cron baseline `5 * * * *` dan handler idempotent.
- Aktifkan Logs, Traces, dan source maps.
- Catat healthy deployment version dan D1 recovery point sebelum release besar.

## 9. For the QA Agent

Minimal test suites:

- Auth provisioning, first-login change, reset, deactivate, session revocation.
- Role escalation dan IDOR antar-Mahasiswa.
- Daily session Cron idempotency.
- Session lifecycle/time boundaries.
- QR signature, expiry, rotation, wrong mode, replay, and duplicate.
- Geolocation missing/invalid/denied fallback.
- Concurrent scans menghasilkan tepat satu attendance row.
- Correction optimistic conflict dan immutable audit.
- CSV formula injection.
- Cloudflare preview/production binding separation.

## 10. Implementation Workflow

Untuk setiap feature:

1. Baca PRD feature dan dependencies.
2. Identifikasi schema/API/UI/tests yang diwajibkan.
3. Implement migration/schema lebih dulu bila diperlukan.
4. Implement service/repository dan authorization.
5. Implement API contract.
6. Implement UI states.
7. Jalankan unit, integration, dan E2E relevant.
8. Update docs bila contract berubah.
9. Update `CHANGELOG.md` pada perubahan signifikan.

## 11. Git Rules

- Work in small, reviewable commits.
- Commit migration bersama schema/code yang memerlukannya.
- Jangan commit `.dev.vars`, `.env*` berisi secret, local D1 files, exports, atau screenshots berisi data pribadi.
- Jangan force-push `main` setelah production digunakan.
- Suggested commit prefixes: `feat:`, `fix:`, `docs:`, `test:`, `chore:`, `db:`.

## 12. Completion Gate

Jangan nyatakan proyek selesai sebelum:

- seluruh P0 acceptance criteria terpenuhi;
- seluruh P0 endpoint memiliki authorization tests;
- migration production berhasil;
- custom domain dan HTTPS sehat;
- Admin dan Student flows lulus mobile E2E;
- attendance race condition test lulus;
- Workers Logs tidak membocorkan sensitive data;
- rollback runbook dapat dijalankan.
