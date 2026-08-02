# CHANGELOG — kkndesakuncir Documentation

**Document Version**: 1.5.0
**Last Updated**: 2026-08-02

## 2026-08-02 — Version 1.5.0

### Added

- Module sesi terpisah untuk validasi Zod, repository prepared-query D1, service lifecycle, RBAC scope, DTO, presentasi status, dan error contract.
- Endpoint `GET/POST /api/v1/sessions`, detail/edit, open, close, cancel, dan active cards sesuai kontrak `PRD/ATTENDANCE_SESSION.md`.
- Utilitas waktu eksplisit `Asia/Jakarta` untuk business date, konversi waktu WIB ke UTC epoch millisecond, serta format tanggal/waktu Bahasa Indonesia.
- Custom Worker resmi OpenNext yang meneruskan fetch handler hasil build dan menambahkan scheduled handler Cloudflare pada `5 * * * *`.
- Scheduler idempotent untuk membuat satu sesi `DAILY` selama periode aktif, menutup sesi `OPEN` yang kedaluwarsa, menulis audit atomik, dan menghasilkan structured log tanpa PII.
- Halaman Admin list/create/detail sesi, form edit yang mengunci waktu saat sesi aktif, lifecycle controls, loading/empty states, serta beranda Mahasiswa dengan kartu sesi aktif.
- Test unit/integrasi untuk batas tengah malam WIB, validasi waktu, unique daily, lifecycle/audit, sesi kedaluwarsa, scheduler berulang, auto-close, query scope Mahasiswa, dan penolakan create endpoint untuk role `STUDENT`.

### Changed

- Entrypoint Wrangler berubah dari `.open-next/worker.js` ke `worker.ts` mengikuti pola custom Worker resmi OpenNext; fetch tetap menggunakan generated handler.
- Production mendeklarasikan Cron `5 * * * *`; named environment preview mendeklarasikan `crons: []` agar deployment preview tidak menjalankan scheduler otomatis.
- Redirect login/forced-password-change Mahasiswa dan alias `/me` kini menuju `/student/home`; profil tetap tersedia di `/student/profile`.
- Admin navigation/dashboard dinaikkan ke Phase 3 dan menampilkan jalur pengelolaan sesi tanpa membuka fitur QR Phase 4.
- Tidak ada package baru, perubahan versi dependency, atau migration D1; schema `attendance_sessions`, indexes, dan audit table dari Phase 1 sudah mencukupi.

### Validation

- D1 production diperiksa read-only: konfigurasi aktif memakai periode 1 Agustus–1 September 2026, zona waktu `Asia/Jakarta`, jadwal 07.00–17.00, batas terlambat 07.15, mode `HYBRID`, dan auto-create aktif.
- 34 Vitest tests, lint, strict typecheck, Next.js build, OpenNext build, Wrangler dry-run preview/production, dan sembilan smoke test Playwright berhasil.
- Worker-compatible local preview merespons `/health` dengan HTTP 200. Scheduled endpoint resmi Wrangler dipicu dua kali pada timestamp yang sama dan tetap menghasilkan tepat satu sesi harian serta satu audit auto-create di D1 lokal.
- Worker preview version `9c2f6620-0382-4593-8587-7af0d5f91e31` dideploy dengan startup 49 ms dan lulus sembilan smoke test remote. Cloudflare API mengonfirmasi `schedules: []`; query D1 preview tetap menunjukkan nol sesi dan nol audit scheduler.

### Rollout Status

- Branch implementasi belum digabung ke `main`; remote preview sudah tervalidasi tanpa Cron, sedangkan Cron production belum diaktifkan.
- Karena group production sudah mengaktifkan auto-create dan periodenya sedang berjalan, merge ke `main` akan membuat Cron eligible pada propagasi trigger berikutnya. Rollout wajib mengikuti `DEPLOYMENT.md` dan memverifikasi Cron Events, Workers Logs, serta D1 sesudah deploy.

### Known Limitations

- Fitur membuat token QR, scanner, geolocation, dan pencatatan attendance tetap ditunda ke Phase 4; kartu sesi Mahasiswa pada Phase 3 bersifat informasional.
- OpenNext tetap memperingatkan dukungan Windows belum penuh dan native SWC host ini gagal dimuat; fallback WebAssembly menyelesaikan build dengan sukses.
- Audit dependency tetap melaporkan empat temuan moderate pada `esbuild` yang hanya transitif melalui Drizzle Kit development tooling; saran `npm audit fix --force` akan melakukan downgrade breaking dan tidak diterapkan.

## 2026-08-01 — Version 1.4.0

### Added

- Repository/service modular untuk konfigurasi single-group dan manajemen mahasiswa dengan D1 prepared statements, atomic batch, DTO, validasi Zod, dan audit log.
- Halaman Admin untuk konfigurasi kelompok, roster/search/detail mahasiswa, provisioning satu akun, edit profil, deactivate/reactivate, dan reset password.
- Impor CSV `nim,nama,telepon` dengan maksimal 50 baris, quoted-field parser, dry-run wajib, deteksi duplikat/existing NIM, hasil per baris, serta password sementara yang hanya dikembalikan saat apply.
- Endpoint profil ownership-scoped dan halaman `/student/profile`; query D1 memfilter `user_id`, soft-delete, akun aktif, dan status banned.
- Seed kelompok idempotent `KKN Desa Kuncir 2026` yang hanya berjalan setelah Admin aktif tersedia, mempertahankan auto-create nonaktif, dan menulis audit `GROUP_SEEDED`.
- UI administrasi responsive bergaya field-operations ledger dengan loading state, empty state, status/result notices, mobile cards, desktop table, dan fokus keyboard.

### Changed

- Runbook Time Travel diselaraskan dengan Wrangler 4.118.0: subcommand tersebut selalu remote dan tidak menerima flag `--remote`.
- Login dan forced password change Mahasiswa kini diarahkan ke `/student/profile`; `/me` dipertahankan sebagai redirect kompatibilitas.
- Response API sensitif memakai `Cache-Control: private, no-store`.
- Periode kelompok wajib memiliki `period_end` setelah `period_start`; NIM terkunci setelah memiliki attendance.
- Health contract dinaikkan ke Phase 2.

### Validation

- 24 Vitest tests, lint, strict typecheck, Drizzle schema check, Next.js 16 production build, OpenNext Cloudflare bundle, Wrangler preview/production dry-run, dan enam Playwright Worker smoke tests berhasil.
- D1 preview dan production diperiksa secara read-only: preview tidak memiliki Admin; production memiliki satu Admin aktif dan belum memiliki group aktif sebelum seed.
- Worker preview Phase 2 dideploy dan seluruh enam smoke test dijalankan ulang terhadap URL workers.dev remote dengan hasil lulus.
- Recovery bookmark D1 production dicatat sebelum seed; group awal dan audit `GROUP_SEEDED` kemudian terverifikasi tanpa mengaktifkan daily auto-create.

### Production Rollout

- Pull request #6 digabung ke `main` sebagai merge commit `8ce338b`.
- Workers Builds `9f350867-4b88-498c-9037-fc1e30daec68` menyelesaikan install, lint, strict typecheck, 24 tests, Drizzle check, Next.js build, OpenNext build, asset upload, dan deploy dengan outcome `success`.
- Worker deployment version `8117212f-5fd4-4709-a19c-297e04d69ff7` menerima 100% traffic production.
- `https://zuhrirey.my.id/health` dan `/login` merespons HTTP 200; `/api/v1/group` tanpa session merespons 401.
- Enam smoke test Playwright lulus terhadap domain production, termasuk guard `/admin`, pengaturan group, roster mahasiswa, dan profil Mahasiswa.
- D1 production terverifikasi memiliki satu group aktif, auto-create nonaktif, dan tepat satu audit seed.

### Known Limitations

- OpenNext masih memperingatkan dukungan Windows belum penuh dan native SWC Windows tidak dapat dimuat pada host ini; fallback WebAssembly menyelesaikan Next.js serta OpenNext build tanpa error.
- Tanggal seed menggunakan rentang aman tahun 2026 penuh dan `daily_auto_create=0`; Admin wajib memasukkan tanggal/jam operasional nyata sebelum Phase 3.
- Preview tidak menerima seed karena belum memiliki Admin, sehingga tidak ada akun atau credential palsu yang dibuat untuk memaksa seed.

## 2026-08-01 — Version 1.3.1

### Production Rollout

- Migration Phase 1 diterapkan ke D1 production setelah recovery bookmark dicatat.
- Pull request Phase 1 digabung ke `main`; Workers Builds berhasil menguji, membangun, dan mendeploy merge commit `bdfa8a0`.
- Endpoint production `/health` dan `/login` terverifikasi HTTP 200; halaman `/admin` menolak pengguna anonim melalui redirect Next.js ke `/login`.
- Satu akun Admin aktif berhasil dibootstrap dengan kewajiban mengganti password awal, dan audit `ADMIN_BOOTSTRAPPED` terverifikasi di D1.
- Secret bootstrap password/token dihapus setelah pembuatan akun; daftar secret Worker kini hanya memuat `BETTER_AUTH_SECRET`.
- Endpoint bootstrap terverifikasi tertutup kembali setelah secret sementara dihapus.

### Operator Validation

- Login pertama dan penggantian password awal Admin berhasil; D1 memuat `must_change_password=0`, satu audit `PASSWORD_CHANGED`, dan satu session aktif setelah session lain direvoke.

## 2026-08-01 — Version 1.3.0

### Added

- Schema D1 Phase 1 untuk Better Auth, group, student, QR credential, attendance, correction audit, dan application audit log dengan foreign key, CHECK, unique, serta partial indexes yang sesuai SQLite/D1.
- Better Auth 1.6.25 dengan Drizzle D1 adapter, Username plugin, custom two-role access control (`ADMIN` dan `STUDENT`), request-scoped server factory, dan secure cookie settings.
- API login berbasis NIM, session, logout, forced password change, one-time Admin bootstrap, student provisioning, reset password, activate/deactivate, session revocation, dan audit logging.
- Server-side page/API authorization yang memeriksa session, role, status akun, kewajiban ganti password, dan soft-delete student.
- Cloudflare Rate Limiting pada login menggunakan identifier NIM yang di-hash sebelum diteruskan ke binding.
- Unit/integration tests yang menjalankan migration aktual pada D1 lokal, termasuk role constraint, atomic attendance correction/audit, auth policy, dan baseline Playwright untuk halaman publik/protected.

### Changed

- Package stabil dipin ke Better Auth 1.6.25, `@better-auth/drizzle-adapter` 1.6.25, Drizzle ORM 0.45.2, Drizzle Kit 0.31.10, Zod 4.4.3, dan Workers types 5.20260801.1.
- Official Better Auth CLI dijalankan secara exact melalui `auth@1.6.25` hanya saat generate schema; package CLI tidak disimpan sebagai dependency runtime.
- Contoh Drizzle D1 yang merekomendasikan tag RC tidak diikuti karena blueprint melarang pre-release; versi stabil yang peer-compatible digunakan.
- Next.js 16 `proxy.ts` tidak digunakan karena Proxy selalu memakai Node runtime sementara OpenNext 1.20.2 belum mendukung Node Middleware. Proteksi nyata tetap dilakukan pada server page guards dan setiap API handler; optimistic cookie check hanya mengurangi render yang tidak perlu.
- Override stabil `adm-zip`, PostCSS, dan Sharp diterapkan untuk menghilangkan temuan high-severity tanpa downgrade/breaking package.
- Username dan display name bootstrap yang non-secret ditetapkan eksplisit per Wrangler environment; password dan bearer token tetap hanya disimpan sebagai Worker secrets.

### Validation

- Install dependency, format, lint, strict typecheck, 13 Vitest tests, Drizzle schema check, local/preview migration, Next.js build, OpenNext build, Wrangler dry-run, dan Worker-compatible Playwright smoke berhasil.
- Preview dan production D1 menerima migration Phase 1 setelah local validation serta pencatatan recovery bookmark; Worker production belum diubah.

### Known Limitations

- Audit dependency menyisakan empat moderate findings pada esbuild lama yang hanya transitif melalui Drizzle Kit development tooling. Saran otomatis npm memerlukan downgrade Drizzle Kit yang breaking dan tidak diterapkan.
- Build Windows memakai fallback WebAssembly SWC karena native binary tidak dapat dimuat; Next.js dan OpenNext build tetap berhasil. OpenNext juga masih memberi peringatan bahwa dukungan Windows belum penuh.

### Deferred

- Secret production, Admin bootstrap production, merge ke `main`, dan deployment Worker Phase 1 menunggu penyelesaian rollout terkontrol.

## 2026-07-31 — Version 1.2.1

### Changed

- Cron production ditunda sampai scheduled handler Phase 3 tersedia, sehingga baseline Phase 0 tidak membuat invocation terjadwal tanpa handler.
- Sampling trace production ditetapkan ke `0.05`; preview tetap `1` untuk diagnosis penuh dengan lingkungan terisolasi.
- Branch `main` dan `feat/bootstrap-cloudflare` dipublikasikan ke repository GitHub tanpa merge atau force-push.
- Copy halaman health diselaraskan dengan status resource D1 yang sudah dibuat tanpa mengklaim schema aplikasi telah tersedia.
- Worker preview dan production dideploy dari bundle yang sama; `/health` diverifikasi HTTP 200 dan dirender melalui browser pada workers.dev preview serta `https://zuhrirey.my.id`.
- Metadata versi production diverifikasi hanya memiliki handler `fetch` dan binding `DB` menunjuk D1 production; custom domain aktif dengan TLS Cloudflare.
- Workers Builds dihubungkan ke repository `syihab-zuhri/kknkuncir2026` dengan production branch `main`; build pertama dipicu melalui commit dokumentasi setelah koneksi dibuat.
- Range engine npm diselaraskan menjadi `>=10.9 <12` setelah Workers Builds mendeteksi npm 10.9.2; npm 11 lokal tetap didukung.

## 2026-07-31 — Version 1.2.0

### Added

- Next.js 16.2.12 App Router scaffold dengan TypeScript strict, Tailwind CSS 4, ESLint, Prettier, dan Node.js 24 baseline.
- OpenNext/Cloudflare configuration, typed Worker bindings, production/preview environment separation, D1 resources terpisah, rate limiter declarations, Cron declaration, Logs, Traces, dan source maps.
- Halaman status `/health`, root status page, loading state, dan error boundary dasar.
- Vitest 4 + Cloudflare Workers pool dengan D1 test lokal serta Playwright Chromium smoke test.
- Scripts lint, typecheck, unit test, Next build, OpenNext build, preview, Wrangler dry-run, upload, dan deploy.

### Changed

- `ARCHITECTURE.md` dan `DEPLOYMENT.md` diselaraskan dengan OpenNext CLI terbaru, named preview environment, dan compatibility date `2026-07-30`.
- Better Auth dan Drizzle dipertahankan sebagai Phase 1; dokumentasi mencatat agar contoh Drizzle `@rc` tidak digunakan dan adapter Better Auth stabil dipilih saat Phase 1.
- Build memakai Webpack karena native SWC/Turbopack Windows tidak tersedia pada environment validasi; WebAssembly SWC berhasil menyelesaikan Next.js dan OpenNext build.
- Template credential memakai nilai secret kosong; tidak ada password/token contoh atau secret aktual yang di-commit.

### Validation

- Dependency install, lint, strict typecheck, dua baseline tests, Next.js build, OpenNext build, local Worker preview, Playwright smoke, serta Wrangler preview/production dry-run berhasil.

### Deferred

- Workers Builds, custom domain, push, dan production deployment menunggu konfigurasi/otorisasi remote berikutnya.

## 2026-07-31 — Version 1.1.0

### Added

- `DEPLOYMENT.md`: runbook GitHub → Cloudflare Workers Builds → D1 migration → custom domain → rollback.
- `ARCHITECTURE.md`: Cloudflare Worker resources, OpenNext runtime, D1 atomicity, Cron, Rate Limiting, Workers Logs/Traces, and Wrangler baseline.
- `ERD.md`: D1/SQLite type conventions, Better Auth tables/plugins, D1 indexes, constraints, and atomic audit strategy.
- `credential.md`: Cloudflare bindings, Worker secrets, environment separation, and onboarding checklist.

### Changed

- `README.md`: production baseline, repository, domain, and read order updated.
- `PLANNING.md`: stack changed to Cloudflare-native and repository/domain assumptions recorded.
- `SRS.md`: platform NFR and server-side ownership authorization updated for D1.
- `PRD/AUTH.md`: Better Auth + D1, NIM username, internal email, Admin provisioning, and session revocation.
- `PRD/ATTENDANCE_CORRECTION.md`: D1 atomic batch, optimistic revision, and conditional audit insert.
- `PERMISSION.md`: removed database RLS dependency and defined Worker/service/repository authorization layers.
- `TASKS.md`: execution plan replaced with Cloudflare setup, D1 migrations, Workers Builds, Cron, and deployment tasks.
- `agent.md`: handoff rules updated for Claude Code/Codex using Cloudflare Workers and D1.
- `PRD/_INDEX.md`, all remaining PRDs, and `DSD.md`: document version synchronized and stale data-model terms corrected.

### Removed

- Active Vercel deployment dependency.
- Active Supabase Auth/PostgreSQL/Storage dependency.
- Supabase service-role and PostgreSQL RLS implementation requirements.
- Sentry as an MVP requirement.

### Decisions

- Full-stack Next.js runs on Cloudflare Workers using OpenNext.
- Cloudflare D1 is the production database; Drizzle manages schema and migrations.
- Better Auth provides authentication with D1, Username, and Admin plugins.
- Production deploys from GitHub repo `syihab-zuhri/kknkuncir2026`, branch `main`.
- Production domain is `zuhrirey.my.id`.
- R2 is reserved for P1 evidence attachments.
- Cron runs hourly and generates daily sessions idempotently in `Asia/Jakarta`.

## 2026-07-31 — Version 1.0.0

### Added

- Initial project brief and implementation assumptions.
- `PLANNING.md`: objectives, sitemap, roadmap, initial stack, assumptions, and risks.
- `SRS.md`: P0/P1/P2 requirements, personas, journeys, NFR, and out-of-scope.
- `PRD/_INDEX.md`: feature registry and dependency order.
- `PRD/AUTH.md`: account provisioning and login requirements.
- `PRD/GROUP_MANAGEMENT.md`: single-group and student management.
- `PRD/ATTENDANCE_SESSION.md`: daily/event session lifecycle.
- `PRD/QR_ATTENDANCE.md`: session QR, student QR, location capture, and duplicate prevention.
- `PRD/ATTENDANCE_CORRECTION.md`: manual attendance, correction, and audit.
- `PRD/REPORTING.md`: dashboard, filters, and CSV export.
- `DSD.md`: mobile-first design system and scanner UX.
- `ERD.md`: initial schema, relations, indexes, and constraints.
- `ARCHITECTURE.md`: initial modular monolith architecture.
- `PERMISSION.md`: two-role access matrix.
- `TASKS.md`: implementation checklist.
- `credential.md`: environment template.
- `agent.md`: specialist-agent handoff.

### Decisions

- Hanya dua role: Admin dan Mahasiswa.
- Satu kelompok KKN pada MVP.
- Absensi satu kali per sesi tanpa check-out.
- Absensi harian dan kegiatan memakai entity sesi yang sama.
- Self-scan menyimpan lokasi Mahasiswa tanpa geofence.
- Jika lokasi gagal, gunakan fallback Admin scan.
- Akun Mahasiswa dibuat oleh Admin; tidak ada registrasi publik.
- `MIGRATION.md` tidak dibuat karena tidak ada sistem lama.
