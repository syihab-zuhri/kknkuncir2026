# kkndesakuncir

Website kehadiran KKN Desa Kuncir 2026. Repository ini memakai Next.js App Router dan ditargetkan ke Cloudflare Workers melalui OpenNext.

## Status implementasi

Phase 0 lokal telah tersedia dan tervalidasi. Implementasi authentication, schema aplikasi, QR attendance, dashboard, dan fitur bisnis belum dimulai.

Resource D1 production dan preview sudah dibuat terpisah di Cloudflare dan ID binding aktual telah dicatat di `wrangler.jsonc`. Workers Builds belum diaktifkan dan domain production belum ditempelkan ke Worker.

## Stack Phase 0

- Next.js 16 App Router, React 19, dan TypeScript strict.
- Tailwind CSS 4 dan ESLint 9.
- `@opennextjs/cloudflare` dan Wrangler 4.
- Vitest dengan runtime pool Cloudflare dan D1 lokal terisolasi.
- Playwright Chromium untuk smoke test Worker-compatible preview.
- Prettier dan scripts lint/typecheck/build/deploy.

## Menjalankan lokal

Gunakan Node.js 24 dan npm 11.

```bash
npm ci
npm run cf:typegen
npm run dev
```

Halaman status tersedia di `http://localhost:3000/health`.

Untuk menjalankan hasil OpenNext pada runtime Worker lokal:

```bash
npm run preview
```

Preview memakai environment `preview`, URL `http://127.0.0.1:8787`, dan binding `kknkuncir2026-preview-db`. Preview tidak memakai D1 production.

## Validation commands

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run cf:build
npm run cf:validate
npm run cf:validate:production
npm run test:smoke
```

`cf:validate` dan `cf:validate:production` hanya menjalankan Wrangler `--dry-run`; keduanya tidak mengunggah Worker.

## Deployment safety

- Jangan jalankan `npm run deploy` sebelum secrets, migrations, dan seluruh gate deployment ditinjau.
- Top-level Wrangler adalah production Worker `kknkuncir2026`; named environment `preview` menghasilkan Worker preview terpisah.
- `.dev.vars` dan seluruh `.env*` lokal di-ignore. Hanya `.dev.vars.example` yang boleh di-commit.
- Production deploy berasal dari branch `main` melalui Workers Builds setelah konfigurasi eksternal selesai.

## Dokumentasi

Mulai dari `PLANNING.md`, lalu ikuti urutan source-of-truth di `agent.md`. Checklist implementasi ada di `TASKS.md`; runbook Cloudflare ada di `DEPLOYMENT.md`.
