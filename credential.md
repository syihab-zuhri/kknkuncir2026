# credential — Environment & Cloudflare Services Template

**Document Version**: 1.1.0  
**Last Updated**: 2026-07-31  
**Status**: Approved Template

> ⚠️ File ini hanya berisi nama variable dan setup. Jangan pernah menaruh secret asli di Git.

## 1. Public Application Variables

```dotenv
NEXT_PUBLIC_APP_NAME=kkndesakuncir
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_TIMEZONE=Asia/Jakarta
```

Production:

```dotenv
NEXT_PUBLIC_APP_URL=https://zuhrirey.my.id
```

`NEXT_PUBLIC_*` dianggap public dan tidak boleh berisi secret.

## 2. Local Secrets Template

Buat `.dev.vars.example` dan commit file example saja:

```dotenv
BETTER_AUTH_SECRET=replace-with-at-least-32-random-bytes
BETTER_AUTH_URL=http://localhost:3000
QR_SIGNING_SECRET=replace-with-independent-random-secret
BOOTSTRAP_ADMIN_USERNAME=admin
BOOTSTRAP_ADMIN_PASSWORD=replace-on-first-login
```

File lokal sebenarnya:

```text
.dev.vars
```

Wajib masuk `.gitignore`.

## 3. Production Worker Secrets

Set menggunakan Wrangler:

```bash
npx wrangler secret put BETTER_AUTH_SECRET
npx wrangler secret put QR_SIGNING_SECRET
npx wrangler secret put BOOTSTRAP_ADMIN_PASSWORD
```

Non-secret production variables dapat didefinisikan pada `wrangler.jsonc`:

```jsonc
{
  "vars": {
    "APP_NAME": "kkndesakuncir",
    "APP_URL": "https://zuhrirey.my.id",
    "APP_TIMEZONE": "Asia/Jakarta",
    "BETTER_AUTH_URL": "https://zuhrirey.my.id",
    "BOOTSTRAP_ADMIN_USERNAME": "admin"
  }
}
```

> 💡 Reasoning: `BETTER_AUTH_SECRET` dan `QR_SIGNING_SECRET` harus berbeda. Kebocoran satu secret tidak boleh otomatis membahayakan fungsi lainnya.

## 4. Cloudflare Bindings

Bindings bukan environment string credentials. Mereka dideklarasikan di `wrangler.jsonc` dan diakses melalui Worker environment.

| Binding | Type | Required | Purpose |
|---|---|---:|---|
| `DB` | D1 | Yes | Auth dan application database |
| `ASSETS` | Workers Static Assets | Yes | Next.js static assets |
| `ATTACHMENTS` | R2 | P1 | Bukti izin/sakit |
| `LOGIN_RATE_LIMITER` | Rate Limit | Yes | Login abuse protection |
| `SELF_SCAN_RATE_LIMITER` | Rate Limit | Yes | Self-scan abuse protection |
| `ADMIN_SCAN_RATE_LIMITER` | Rate Limit | Yes | Continuous Admin scan protection |
| `ADMIN_MUTATION_RATE_LIMITER` | Rate Limit | Yes | QR rotation, import, and sensitive Admin mutations |

TypeScript environment example:

```ts
export interface CloudflareEnv {
  DB: D1Database;
  ASSETS: Fetcher;
  ATTACHMENTS?: R2Bucket;
  LOGIN_RATE_LIMITER: RateLimit;
  SELF_SCAN_RATE_LIMITER: RateLimit;
  ADMIN_SCAN_RATE_LIMITER: RateLimit;
  ADMIN_MUTATION_RATE_LIMITER: RateLimit;
  APP_NAME: string;
  APP_URL: string;
  APP_TIMEZONE: string;
  BETTER_AUTH_URL: string;
  BETTER_AUTH_SECRET: string;
  QR_SIGNING_SECRET: string;
  BOOTSTRAP_ADMIN_USERNAME: string;
  BOOTSTRAP_ADMIN_PASSWORD: string;
}
```


## 4.1 Workers Builds Variables

Set build-time variables pada konfigurasi Workers Builds:

```dotenv
NEXT_PUBLIC_APP_NAME=kkndesakuncir
NEXT_PUBLIC_APP_URL=https://zuhrirey.my.id
NEXT_PUBLIC_TIMEZONE=Asia/Jakarta
```

Jangan menaruh Worker secrets pada build variables bila tidak dibutuhkan saat build.

## 5. Cloudflare Resources to Create

| Service | Resource |
|---|---|
| Workers | `kknkuncir2026` |
| D1 Production | `kknkuncir2026-db` |
| D1 Preview | `kknkuncir2026-preview-db` |
| R2 P1 | `kknkuncir2026-attachments` |
| Workers Builds | GitHub repo `syihab-zuhri/kknkuncir2026`, branch `main` |
| Custom Domain | `zuhrirey.my.id` |
| Observability | Workers Logs and Traces enabled |

## 6. External Accounts / Services

### Required

- GitHub: https://github.com/
- Cloudflare dashboard: https://dash.cloudflare.com/
- Cloudflare Wrangler login: `npx wrangler login`

### Not Required in Baseline

- Vercel account
- Supabase project
- External Redis
- External auth provider
- External object storage
- Sentry account for MVP

## 7. Local Onboarding Checklist

- [ ] Install Node.js version defined in `.nvmrc` or `package.json#engines`.
- [ ] Clone `https://github.com/syihab-zuhri/kknkuncir2026.git`.
- [ ] Run `npm ci`.
- [ ] Copy `.dev.vars.example` to `.dev.vars`.
- [ ] Generate independent random auth and QR secrets.
- [ ] Create/apply local D1 migrations.
- [ ] Seed one Admin account.
- [ ] Run local Worker-compatible dev command.
- [ ] Verify login, create student, daily session, self-scan fallback, and report.

## 8. Secret Generation

Example using Node.js:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

Run independently for each secret.

## 9. Security Rules

- Never commit `.dev.vars`, `.env.local`, database export, or secret output.
- Never expose bindings through `NEXT_PUBLIC_*`.
- Never print secrets or raw QR tokens in CI logs.
- Rotate `QR_SIGNING_SECRET` only with a planned invalidation of active session QR tokens.
- Rotating `BETTER_AUTH_SECRET` invalidates or affects active auth sessions; document the maintenance.
- Bootstrap Admin password must be changed immediately and secret removed if bootstrap code no longer needs it.

## 10. Environment Separation

| Environment | Database | Domain | Deployment |
|---|---|---|---|
| Local | Wrangler local D1 | localhost | `wrangler dev` |
| Preview | Preview D1 | Workers preview URL | branch/preview deployment |
| Production | `kknkuncir2026-db` | `zuhrirey.my.id` | `main` via Workers Builds |

Do not connect preview deployments to production D1.
