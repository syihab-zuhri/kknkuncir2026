# kkndesakuncir — Documentation Blueprint

**Document Version**: 1.1.0  
**Last Updated**: 2026-07-31  
**Language**: Bahasa Indonesia  
**Status**: Ready for Implementation  
**Repository**: `https://github.com/syihab-zuhri/kknkuncir2026`  
**Production Domain**: `https://zuhrirey.my.id`

Folder ini adalah single source of truth untuk implementasi website absensi KKN `kkndesakuncir` menggunakan Claude Code atau Codex.

## Platform Baseline

- Full-stack runtime: Cloudflare Workers.
- Framework adapter: `@opennextjs/cloudflare`.
- Database: Cloudflare D1.
- Authentication: Better Auth dengan D1, Admin plugin, dan Username plugin.
- Object storage P1: Cloudflare R2.
- Scheduled daily attendance: Cloudflare Cron Triggers.
- Rate limiting: Cloudflare Workers Rate Limiting bindings per sensitive flow.
- Observability: Cloudflare Workers Logs dan Traces.
- CI/CD: Cloudflare Workers Builds terhubung ke GitHub branch `main`.
- Custom domain: `zuhrirey.my.id`.

> 💡 Reasoning: Next.js full-stack ditempatkan pada Workers, bukan Cloudflare Pages statis, karena aplikasi memerlukan route handler, session auth, akses D1, dan scheduled job.

## Urutan Baca untuk Agent

1. `PLANNING.md`
2. `SRS.md`
3. `ARCHITECTURE.md`
4. `ERD.md`
5. `PERMISSION.md`
6. `DSD.md`
7. `PRD/_INDEX.md`
8. PRD fitur yang sedang dikerjakan
9. `TASKS.md`
10. `DEPLOYMENT.md`
11. `credential.md`
12. `agent.md`

## Aturan Utama

- Jangan menambahkan role baru tanpa memperbarui `PERMISSION.md`, `SRS.md`, dan PRD terkait.
- Jangan mengubah schema tanpa memperbarui `ERD.md`, migration D1, API contract, dan `CHANGELOG.md`.
- Jangan menggunakan package yang bergantung pada native Node.js API tanpa memverifikasi kompatibilitas Cloudflare Workers.
- Seluruh akses D1 dilakukan dari server melalui binding `DB`; browser tidak pernah menerima credential database.
- Waktu resmi berasal dari server dengan zona waktu bisnis `Asia/Jakarta`.
- Lokasi pengguna direkam saat absensi mandiri, tetapi tidak digunakan sebagai geofence pemblokir pada MVP.
- Absensi harian dan absensi kegiatan adalah dua jenis sesi yang berbeda.
- `wrangler.jsonc` adalah source of truth untuk binding, domain, cron, observability, dan environment Cloudflare.
- Push ke branch `main` memicu build dan deployment produksi setelah integrasi GitHub diaktifkan.

## Repository Bootstrap

Repo tujuan sudah ditetapkan:

```bash
git init
git add .
git commit -m "first commit"
git branch -M main
git remote add origin https://github.com/syihab-zuhri/kknkuncir2026.git
git push -u origin main
```

> Catatan: gunakan `git add .`, bukan hanya `git add README.md`, agar source code dan dokumentasi ikut ter-push.

## Dokumen yang Sengaja Tidak Dibuat

- `MIGRATION.md`: belum diperlukan karena sistem diasumsikan baru dan tidak memiliki data produksi lama.
