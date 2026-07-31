# DEPLOYMENT — Cloudflare Workers

**Document Version**: 1.1.0  
**Last Updated**: 2026-07-31  
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

Baseline dependencies:

```bash
npm install better-auth drizzle-orm zod
npm install -D @opennextjs/cloudflare wrangler drizzle-kit vitest @playwright/test
```

Pin versions melalui lockfile dan commit `package-lock.json`.

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
    "dev": "next dev",
    "build": "next build",
    "cf:build": "opennextjs-cloudflare build",
    "preview": "opennextjs-cloudflare build && opennextjs-cloudflare preview",
    "deploy": "opennextjs-cloudflare build && wrangler deploy",
    "deploy:version": "opennextjs-cloudflare build && wrangler versions upload",
    "test:ci": "vitest run",
    "db:generate": "drizzle-kit generate",
    "db:migrate:local": "wrangler d1 migrations apply kknkuncir2026-db --local",
    "db:migrate:remote": "wrangler d1 migrations apply kknkuncir2026-db --remote",
    "test": "vitest run",
    "test:e2e": "playwright test"
  }
}
```

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

## 7. Generate and Apply Migrations

```bash
npm run db:generate
npm run db:migrate:local
```

Before production:

```bash
npx wrangler d1 migrations list kknkuncir2026-db --remote
npm run db:migrate:remote
```

Rules:

- Review generated SQL before apply.
- Test migration against local and preview database first.
- Record D1 Time Travel bookmark before high-risk schema changes.
- Never modify an already-applied production migration.

## 8. Configure Worker Secrets

```bash
npx wrangler secret put BETTER_AUTH_SECRET
npx wrangler secret put QR_SIGNING_SECRET
npx wrangler secret put BOOTSTRAP_ADMIN_PASSWORD
```

Verify names only, never print values into logs.

## 9. Connect GitHub to Workers Builds

In Cloudflare Dashboard:

1. Workers & Pages → Create application → Import a repository.
2. Select `syihab-zuhri/kknkuncir2026`.
3. Production branch: `main`.
4. Build command: `npm run test:ci && npm run cf:build`.
5. Deploy command: `npx wrangler deploy`.
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

## 11. Cron Trigger

Wrangler baseline:

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
npm run db:migrate:remote
git push origin main
```

> 💡 Reasoning: Migration dijalankan sebelum automatic Worker deployment dan harus backward-compatible dengan versi aplikasi sebelumnya. Gunakan pola expand/contract untuk perubahan schema setelah launch.

## 13. Smoke Test Checklist

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

## 14. Rollback Plan

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

## 15. Preview Strategy

- Pull request/branch builds use Workers preview URLs.
- Preview must use `kknkuncir2026-preview-db`.
- Preview must have separate auth and QR secrets.
- Never seed real Mahasiswa data in preview.
- Custom production domain is only attached to production environment.

## 16. Operational Checklist

- [ ] Workers Logs enabled.
- [ ] Traces enabled.
- [ ] Source maps uploaded.
- [ ] D1 query errors monitored.
- [ ] Cron invocation checked daily during first week.
- [ ] Secrets rotation owner documented.
- [ ] Monthly dependency update scheduled.
- [ ] D1 Time Travel restore procedure tested before launch.

## 17. Official References

- https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/
- https://developers.cloudflare.com/workers/ci-cd/builds/
- https://developers.cloudflare.com/workers/configuration/routing/custom-domains/
- https://developers.cloudflare.com/d1/reference/migrations/
- https://developers.cloudflare.com/d1/reference/time-travel/
- https://developers.cloudflare.com/workers/configuration/secrets/
- https://developers.cloudflare.com/workers/configuration/cron-triggers/
