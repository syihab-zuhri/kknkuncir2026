# kkndesakuncir

Website kehadiran KKN Desa Kuncir 2026. Repository ini memakai Next.js App Router dan ditargetkan ke Cloudflare Workers melalui OpenNext.

## Status implementasi

Phase 0 sampai Phase 3 telah tersedia di production. Sesi harian/kegiatan, lifecycle, halaman Admin, kartu aktif Mahasiswa, dan scheduler Cloudflare sudah dideploy dari `main` serta lulus validation gate production. QR token, scanner, geolocation, serta pencatatan attendance tetap belum dimulai sampai Phase 4.

Resource D1 production dan preview sudah dibuat terpisah di Cloudflare dan ID binding aktual telah dicatat di `wrangler.jsonc`. Worker production serta preview sudah diverifikasi sehat, custom domain `zuhrirey.my.id` sudah aktif, dan Workers Builds terhubung ke GitHub branch `main`. Setelah bootstrap, secret password/token sementara telah dihapus; hanya `BETTER_AUTH_SECRET` yang dipertahankan.

## Stack aktif

- Next.js 16 App Router, React 19, dan TypeScript strict.
- Tailwind CSS 4 dan ESLint 9.
- `@opennextjs/cloudflare` dan Wrangler 4.
- Vitest dengan runtime pool Cloudflare dan D1 lokal terisolasi.
- Playwright Chromium untuk smoke test Worker-compatible preview.
- Prettier dan scripts lint/typecheck/build/deploy.
- Drizzle ORM 0.45.2 dan Drizzle Kit 0.31.10 untuk schema SQLite/D1.
- Better Auth 1.6.25 dengan D1 adapter, Username plugin, dan Admin plugin.
- Zod 4.4.3 untuk validasi kontrak API.

## Menjalankan lokal

Gunakan Node.js 24 dan npm 10.9 atau 11.

```bash
npm ci
npm run cf:typegen
npm run db:migrate:local
npm run db:seed:local
npm run dev
```

Halaman status tersedia di `http://localhost:3000/health`.

Untuk menjalankan hasil OpenNext pada runtime Worker lokal:

```bash
npm run preview
```

Untuk mengekspos endpoint Cron lokal resmi Wrangler tanpa menambahkan trigger preview otomatis:

```bash
npm run preview:scheduled
curl "http://127.0.0.1:8787/cdn-cgi/handler/scheduled?cron=5+*+*+*+*&time=<epoch-ms>&format=json"
```

Preview memakai environment `preview`, URL `http://127.0.0.1:8787`, dan binding `kknkuncir2026-preview-db`. Preview tidak memakai D1 production.

Seed kelompok sengaja no-op jika belum ada Admin aktif. Scheduler membaca kebijakan active group dari D1 dan tidak memakai nilai tanggal/jam hard-code. Preview mendeklarasikan `crons: []`; hanya production yang memakai `5 * * * *`.

## Validation commands

```bash
npm run lint
npm run typecheck
npm test
npm run db:check
npm run build
npm run cf:build
npm run cf:validate
npm run cf:validate:production
npm run test:smoke
```

Untuk smoke Worker yang sudah dideploy tanpa menyalakan preview lokal:

```bash
PLAYWRIGHT_BASE_URL=https://worker-preview.example.workers.dev npm run test:smoke
```

`cf:validate` dan `cf:validate:production` hanya menjalankan Wrangler `--dry-run`; keduanya tidak mengunggah Worker.

## Deployment safety

- Jangan jalankan `npm run deploy` sebelum secrets, migrations, dan seluruh gate deployment ditinjau.
- Migration Phase 1 sudah diterapkan ke production setelah local/preview validation dan recovery bookmark; migration production berikutnya tetap harus melalui runbook yang sama.
- Top-level Wrangler adalah production Worker `kknkuncir2026`; named environment `preview` menghasilkan Worker preview terpisah.
- `.dev.vars` dan seluruh `.env*` lokal di-ignore. Hanya `.dev.vars.example` yang boleh di-commit.
- Production deploy berasal dari branch `main` melalui Workers Builds setelah konfigurasi eksternal selesai.

## Dokumentasi

Mulai dari `PLANNING.md`, lalu ikuti urutan source-of-truth di `agent.md`. Checklist implementasi ada di `TASKS.md`; runbook Cloudflare ada di `DEPLOYMENT.md`.
