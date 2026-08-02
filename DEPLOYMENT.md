# DEPLOYMENT — Cloudflare Workers

**Document Version**: 1.4.0
**Last Updated**: 2026-08-01
**Status**: Approved Deployment Runbook

## 1. Deployment Targets

| Item | Value |
|---|---|
| Repository | `https://github.com/syihab-zuhri/kknkuncir2026.git` |
| Production branch | `main` |
| Worker name | `kknkuncir2026` |
| Production domain | `https://zuhrirey.my.id` |
| Production D1 | `kknkuncir2026-db` |
| Framework adapter | `@opennextjs/cloudflare` |

## 2. Repository Bootstrap

Untuk folder project baru:

```bash
git init
git add .
git commit -m "first commit"
git branch -M main
git remote add origin https://github.com/syihab-zuhri/kknkuncir2026.git
git push -u origin main
```

> 💡 Reasoning: Gunakan `git add .`, bukan hanya `git add README.md`, agar source code dan dokumentasi project ikut masuk pada initial commit.

Jika remote sudah pernah dibuat:

```bash
git remote -v
git remote set-url origin https://github.com/syihab-zuhri/kknkuncir2026.git
```

## 3. Required Packages

Project menggunakan package stabil yang terkunci pada `package-lock.json`:

```bash
npm install
```

Versi utama platform adalah Next.js 16.2.12, `@opennextjs/cloudflare` 1.20.2, Wrangler 4.118.0, Vitest 4.1.10, Cloudflare Vitest pool 0.20.1, dan Playwright 1.62.1. Phase 1 menambahkan Better Auth dan adapter Drizzle 1.6.25, Drizzle ORM 0.45.2, Drizzle Kit 0.31.10, serta Zod 4.4.3.

Runtime Workers Builds yang tervalidasi memakai Node.js 24.18.1 dan npm 10.9.2. Range engine repository menerima npm `>=10.9 <12`, sehingga npm 10.9 pada CI dan npm 11 pada development lokal sama-sama didukung.

Dokumentasi Drizzle D1 saat audit masih menampilkan contoh package `@rc`; contoh RC tersebut sengaja tidak diikuti. Repository memakai rilis stabil yang memenuhi peer dependency Better Auth. Schema auth digenerate memakai exact official CLI `auth@1.6.25`, lalu schema dan SQL migration direview sebelum diterapkan.

## 4. Next.js OpenNext Configuration

Create `open-next.config.ts`:

```ts
import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig();
```

Recommended scripts:

```json
{
  "scripts": {
    "dev": "next dev --webpack",
    "build": "next build --webpack",
    "cf:build": "opennextjs-cloudflare build",
    "preview": "opennextjs-cloudflare build && opennextjs-cloudflare preview --env preview --port 8787",
    "deploy": "opennextjs-cloudflare build && opennextjs-cloudflare deploy --env=\"\"",
    "test": "vitest run",
    "test:e2e": "playwright test",
    "typecheck": "tsc --noEmit && tsc --noEmit -p test/tsconfig.json"
  }
}
```

OpenNext terbaru merekomendasikan CLI `opennextjs-cloudflare` untuk preview/deploy. Wrangler langsung tetap dipakai untuk type generation, D1 commands, dan configuration dry-run. Flag `--env=""` memilih top-level production secara eksplisit; preview selalu memakai `--env preview`.

## 5. Cloudflare Authentication

```bash
npx wrangler login
npx wrangler whoami
```

Do not use personal API tokens in committed files.

## 6. Create D1 Databases

Production:

```bash
npx wrangler d1 create kknkuncir2026-db
```

Preview:

```bash
npx wrangler d1 create kknkuncir2026-preview-db
```

Copy production ID ke `database_id` dan preview ID ke `preview_database_id` pada binding `DB` di `wrangler.jsonc`.

Sebelum kedua resource remote dibuat, repository memakai sentinel UUID yang berbeda untuk production dan preview. Sentinel bukan credential dan tidak menunjuk resource Cloudflare. Deployment remote dilarang sampai sentinel diganti dengan ID hasil command di atas.

## 7. Generate and Apply Migrations

```bash
npm run db:generate
npm run db:check
npm run db:migrate:local
npm run db:migrations:list:preview
npm run db:migrate:preview
```

Repository sengaja tidak menyediakan script singkat untuk migration production agar target tidak tertukar. Setelah review/approval production, gunakan binding top-level secara eksplisit:

```bash
npx wrangler d1 migrations list DB --remote --env=""
npx wrangler d1 migrations apply DB --remote --env=""
```

Rules:

- Review generated SQL before apply.
- Test migration against local and preview database first.
- Jangan menghubungkan preview Worker atau preview migration ke D1 production.
- Record D1 Time Travel bookmark before high-risk schema changes.
- Never modify an already-applied production migration.

Status Phase 1 per 2026-08-01: migration telah lulus pada local/preview D1 dan diterapkan ke production D1 setelah recovery bookmark dicatat. Worker Phase 1 telah dideploy melalui Workers Builds dan Admin production telah dibootstrap.

## 8. Configure Worker Secrets

```bash
npx wrangler secret put BETTER_AUTH_SECRET
npx wrangler secret put BOOTSTRAP_ADMIN_PASSWORD
npx wrangler secret put BOOTSTRAP_ADMIN_TOKEN
```

Set `BOOTSTRAP_ADMIN_USERNAME` dan `BOOTSTRAP_ADMIN_NAME` sebagai non-secret vars hanya saat bootstrap dibutuhkan. Panggil endpoint bootstrap dengan bearer token melalui client yang tidak merekam header, lalu hapus password/token bootstrap dari Worker segera setelah akun berhasil dibuat. Admin tetap harus mengganti password awal pada login pertama. `QR_SIGNING_SECRET` belum diperlukan sampai Phase 4. Verify names only, never print values into logs.

Checkpoint rollout production 2026-08-01:

- merge commit Phase 1 `bdfa8a0` berhasil melalui Workers Builds;
- `/health` dan `/login` merespons HTTP 200, sedangkan request anonim ke `/admin` menghasilkan redirect Next.js ke `/login`;
- D1 berisi tepat satu Admin aktif dengan `must_change_password=1` dan satu audit `ADMIN_BOOTSTRAPPED`;
- secret `BOOTSTRAP_ADMIN_PASSWORD` dan `BOOTSTRAP_ADMIN_TOKEN` telah dihapus; hanya `BETTER_AUTH_SECRET` yang tersisa;
- endpoint bootstrap tertutup kembali dengan HTTP 503 karena secret setup sudah tidak tersedia;
- penggantian password awal Admin terverifikasi melalui `must_change_password=0`, satu audit `PASSWORD_CHANGED`, dan satu session aktif setelah session lain direvoke.

## 9. Connect GitHub to Workers Builds

In Cloudflare Dashboard:

1. Workers & Pages → Create application → Import a repository.
2. Select `syihab-zuhri/kknkuncir2026`.
3. Production branch: `main`.
4. Build command: `npm run test:ci`.
5. Deploy command: `npx opennextjs-cloudflare deploy --env=""`.
6. Root directory: repository root.
7. Enable build on push to `main`.
8. Add `NEXT_PUBLIC_APP_URL=https://zuhrirey.my.id` dan public build variables lain yang diperlukan; secrets tetap Worker secrets.

> 💡 Reasoning: GitHub integration makes every production deployment traceable to a commit and removes manual upload steps.

## 10. Custom Domain

Primary method is configuration-as-code:

```jsonc
{
  "routes": [
    {
      "pattern": "zuhrirey.my.id",
      "custom_domain": true
    }
  ]
}
```

Requirements:

- Zone `zuhrirey.my.id` must already be active in the same Cloudflare account.
- Do not separately point the domain to Vercel or another provider.
- Cloudflare manages certificate provisioning for the Worker custom domain.
- Confirm existing DNS records do not conflict before first deployment.

## 11. Cron Trigger (Phase 3)

Phase 3 mengaktifkan trigger production berikut setelah custom scheduled handler diuji:

```jsonc
{
  "triggers": {
    "crons": ["5 * * * *"]
  }
}
```

Scheduled handler must:

- calculate business time in `Asia/Jakarta`;
- create missing daily session idempotently;
- close expired sessions;
- log summary and errors;
- never depend on cron alone for submission authorization.

Entrypoint production adalah `worker.ts`, yang meneruskan generated OpenNext `fetch` handler dan menambahkan `scheduled`. Named environment preview wajib mempertahankan konfigurasi berikut agar tidak pernah berjalan otomatis:

```jsonc
{
  "env": {
    "preview": {
      "triggers": { "crons": [] }
    }
  }
}
```

Local Worker validation:

```bash
npm run preview:scheduled
curl "http://127.0.0.1:8787/cdn-cgi/handler/scheduled?cron=5+*+*+*+*&time=<epoch-ms>&format=json"
```

Cron Cloudflare memakai UTC dan perubahan trigger dapat memerlukan waktu hingga 15 menit untuk tersebar. Job menghitung business date dari `controller.scheduledTime`, tidak dari jam browser. Phase 3 tidak memerlukan migration baru karena schema/index sesi sudah diterapkan pada Phase 1.

Sebelum merge Phase 3 ke `main`:

1. Query konfigurasi group production secara read-only dan pastikan periode, waktu, mode, timezone, serta `daily_auto_create` benar.
2. Jalankan unit/integration test, OpenNext build, Wrangler preview/production dry-run, dan local scheduled endpoint dua kali pada timestamp sama.
3. Pastikan D1 lokal hanya berisi satu daily session dan satu audit auto-create.
4. Deploy branch ke named preview; pastikan preview tidak memiliki Cron trigger.
5. Merge hanya setelah review. Karena Workers Builds memantau `main`, merge dapat langsung mendeploy trigger production.
6. Setelah deploy, tunggu propagasi, periksa Cron Events/Workers Logs, lalu query sesi/audit production secara read-only.

Checkpoint preview Phase 3 pada 2026-08-02:

- Worker version `9c2f6620-0382-4593-8587-7af0d5f91e31`, startup 49 ms;
- sembilan smoke test remote lulus;
- Cloudflare schedules API mengembalikan array kosong untuk preview dan production sebelum merge;
- query D1 preview mengembalikan nol sesi dan nol audit scheduler dengan `rows_written=0`.

## 12. First Production Deployment

Because push ke `main` dapat langsung memicu deploy, lakukan production D1 migration **sebelum** push/merge pertama:

```text
1. Test code dan migration pada local/preview D1
2. Record D1 recovery point
3. Apply production migration yang backward-compatible
4. Push/merge tested commit ke main
5. Workers Builds runs tests/build/deploy
6. Verify custom domain
7. Run smoke tests
8. Seed/change Admin credential
```

First deployment commands:

```bash
npm ci
npm test
npm run cf:build
npx wrangler d1 migrations apply DB --remote --env=""
git push origin main
```

> 💡 Reasoning: Migration dijalankan sebelum automatic Worker deployment dan harus backward-compatible dengan versi aplikasi sebelumnya. Gunakan pola expand/contract untuk perubahan schema setelah launch.

## 13. Phase 2 Group Seed

Seed awal bersifat additive dan idempotent. Ia hanya membuat group jika satu Admin aktif sudah tersedia dan belum ada group aktif. Seed tidak membuat Admin, user, password, atau credential apa pun.

Validasi lokal/preview:

```bash
npm run db:seed:local
npm run db:seed:preview
```

Preview tanpa Admin akan menghasilkan no-op; jangan membuat credential palsu untuk memaksanya. Sebelum production seed, catat recovery bookmark D1 lalu jalankan file yang sama secara eksplisit:

```bash
npx wrangler d1 time-travel info DB --env="" --json
npx wrangler d1 execute DB --remote --env="" --file drizzle/seeds/initial-group.sql
npx wrangler d1 execute DB --remote --env="" --command "SELECT id, name, period_start, period_end, daily_auto_create FROM group_settings WHERE is_active = 1" --json
```

Expected baseline: `KKN Desa Kuncir 2026`, periode `2026-01-01` sampai `2026-12-31`, dan `daily_auto_create=0`. Admin wajib mengoreksi periode/jadwal nyata melalui `/admin/settings/group` sebelum scheduled handler Phase 3 diaktifkan.

Checkpoint production Phase 2 pada 2026-08-01:

- recovery bookmark dicatat sebelum seed production;
- PR #6 digabung sebagai `8ce338b`;
- Workers Builds menyelesaikan build/deploy dengan outcome `success`;
- deployment version `8117212f-5fd4-4709-a19c-297e04d69ff7` menerima 100% traffic;
- health, login, authorization guards, enam smoke browser, group D1, dan audit seed terverifikasi.

## 14. Smoke Test Checklist

- [ ] `https://zuhrirey.my.id` returns application, not placeholder/error.
- [ ] HTTPS certificate valid.
- [ ] Admin login succeeds.
- [ ] Wrong login is rate-limited after repeated attempts.
- [ ] Admin can create one student.
- [ ] Student is forced to change temporary password.
- [ ] Daily session exists for current KKN date.
- [ ] Event session can be created/opened.
- [ ] Session QR renders and rotates.
- [ ] Self-scan requests geolocation and creates one record only.
- [ ] Admin scan works as fallback.
- [ ] Attendance correction creates audit entry.
- [ ] CSV/Excel export downloads correctly.
- [ ] Workers Logs show request IDs without sensitive values.

## 15. Rollback Plan

### Application rollback

- Roll back to the previous healthy Worker deployment/version from Cloudflare.
- Confirm compatibility with current database schema.

### Database rollback

- Prefer forward-fix migration for additive changes.
- For destructive/incorrect production migration, use D1 Time Travel to restore to a known point/bookmark.
- Freeze attendance mutations during emergency restoration.
- Re-run smoke tests before reopening access.

### Domain rollback

- Keep custom domain attached to the last healthy Worker version.
- Do not change DNS unless routing itself is the failure source.

## 16. Preview Strategy

- Pull request/branch builds use Workers preview URLs.
- Preview must use `kknkuncir2026-preview-db`.
- Preview must have separate auth and QR secrets.
- Never seed real Mahasiswa data in preview.
- Custom production domain is only attached to production environment.

## 17. Operational Checklist

- [ ] Workers Logs enabled.
- [ ] Traces enabled.
- [ ] Source maps uploaded.
- [ ] D1 query errors monitored.
- [ ] Cron invocation checked daily during first week.
- [ ] Secrets rotation owner documented.
- [ ] Monthly dependency update scheduled.
- [ ] D1 Time Travel restore procedure tested before launch.

## 18. Official References

- https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/
- https://developers.cloudflare.com/workers/ci-cd/builds/
- https://developers.cloudflare.com/workers/configuration/routing/custom-domains/
- https://developers.cloudflare.com/d1/reference/migrations/
- https://developers.cloudflare.com/d1/reference/time-travel/
- https://developers.cloudflare.com/workers/configuration/secrets/
- https://developers.cloudflare.com/workers/configuration/cron-triggers/
- https://opennext.js.org/cloudflare/howtos/custom-worker
