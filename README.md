# kkndesakuncir

Website kehadiran KKN Desa Kuncir 2026. Repository ini memakai Next.js App Router dan ditargetkan ke Cloudflare Workers melalui OpenNext.

## Status implementasi

Phase 0 dan Phase 1 telah tersedia di production. Implementasi Phase 2 untuk konfigurasi kelompok, roster mahasiswa, provisioning/edit/deactivation, impor CSV, dan profil ownership-scoped sudah selesai serta terverifikasi pada Worker preview. Seed group Phase 2 sudah diterapkan secara idempotent ke D1 production setelah recovery bookmark dicatat. Worker production masih menjalankan merge commit Phase 1 `bdfa8a0` sampai pull request #6 digabung dan Workers Builds lulus. QR attendance, sesi, scheduler, dashboard, serta Phase 3 dan seterusnya belum dimulai.

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

Preview memakai environment `preview`, URL `http://127.0.0.1:8787`, dan binding `kknkuncir2026-preview-db`. Preview tidak memakai D1 production.

Seed kelompok sengaja no-op jika belum ada Admin aktif. Nilai awal memakai periode 2026 penuh dan `daily_auto_create=0`; tanggal/jam nyata harus ditinjau Admin sebelum Phase 3.

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
