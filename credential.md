# credential — Environment & Cloudflare Services Template

**Document Version**: 1.2.0  
**Last Updated**: 2026-07-31  
**Status**: Phase 0 Implemented Template

> File ini hanya mendokumentasikan nama variable dan prosedur setup. Secret asli maupun nilai secret contoh tidak boleh ditaruh di Git.

## 1. Public Application Variables

```dotenv
NEXT_PUBLIC_APP_NAME=kkndesakuncir
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_TIMEZONE=Asia/Jakarta
```

Production memakai `NEXT_PUBLIC_APP_URL=https://zuhrirey.my.id`. Semua variable `NEXT_PUBLIC_*` dianggap public dan tidak boleh memuat secret.

## 2. Local Variables Template

Repository hanya menyimpan `.dev.vars.example`. Salin secara lokal menjadi `.dev.vars`, lalu isi secret di mesin developer tanpa mencetak nilainya ke terminal atau log.

```dotenv
NEXTJS_ENV=development
NEXT_PUBLIC_APP_NAME=kkndesakuncir
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_TIMEZONE=Asia/Jakarta

BETTER_AUTH_SECRET=
BETTER_AUTH_URL=http://localhost:3000
QR_SIGNING_SECRET=
BOOTSTRAP_ADMIN_USERNAME=admin
BOOTSTRAP_ADMIN_PASSWORD=
```

Nilai kosong pada template disengaja. `BETTER_AUTH_SECRET`, `QR_SIGNING_SECRET`, dan `BOOTSTRAP_ADMIN_PASSWORD` baru diisi pada phase fitur yang membutuhkannya.

## 3. Production Worker Secrets

Set secret melalui input interaktif Wrangler:

```bash
npx wrangler secret put BETTER_AUTH_SECRET
npx wrangler secret put QR_SIGNING_SECRET
npx wrangler secret put BOOTSTRAP_ADMIN_PASSWORD
```

Jangan simpan nilai secret pada `wrangler.jsonc`, Workers Builds build variables, GitHub variables, issue, atau log CI.

## 4. Non-Secret Worker Variables

`wrangler.jsonc` menyimpan konfigurasi non-secret berikut:

```jsonc
{
  "vars": {
    "APP_NAME": "kkndesakuncir",
    "APP_URL": "https://zuhrirey.my.id",
    "APP_TIMEZONE": "Asia/Jakarta"
  }
}
```

## 5. Cloudflare Bindings

Bindings adalah izin/resource handle, bukan string credential.

| Binding | Type | Phase | Purpose |
|---|---|---:|---|
| `DB` | D1 | 0 | Auth dan application database pada phase berikutnya |
| `ASSETS` | Workers Static Assets | 0 | Aset hasil OpenNext |
| `LOGIN_RATE_LIMITER` | Rate Limit | 0 declaration | Login abuse protection pada Phase 1 |
| `SELF_SCAN_RATE_LIMITER` | Rate Limit | 0 declaration | Self-scan protection pada Phase 4 |
| `ADMIN_SCAN_RATE_LIMITER` | Rate Limit | 0 declaration | Admin scanner protection pada Phase 4 |
| `ADMIN_MUTATION_RATE_LIMITER` | Rate Limit | 0 declaration | Sensitive Admin mutations pada phase fitur |
| `ATTACHMENTS` | R2 | P1 | Bukti izin/sakit; belum dibuat |

Environment type dihasilkan melalui:

```bash
npm run cf:typegen
```

Output `cloudflare-env.d.ts` di-commit dan harus digenerate ulang setiap kali binding berubah.

## 6. Cloudflare Resources

| Service | Resource | Status Phase 0 |
|---|---|---|
| Workers | `kknkuncir2026` | Configured, not deployed |
| D1 Production | `kknkuncir2026-db` | Created |
| D1 Preview | `kknkuncir2026-preview-db` | Created |
| Workers Builds | GitHub `syihab-zuhri/kknkuncir2026`, branch `main` | Pending |
| Custom Domain | `zuhrirey.my.id` | Pending healthy Worker |
| Observability | Workers Logs and Traces | Configured, effective after deploy |
| R2 | `kknkuncir2026-attachments` | P1, not created |

## 7. Environment Separation

| Environment | Database | Domain | Wrangler target |
|---|---|---|---|
| Local | local D1 storage | `localhost` | `--env preview` |
| Preview | `kknkuncir2026-preview-db` | Workers preview URL | `--env preview` |
| Production | `kknkuncir2026-db` | `zuhrirey.my.id` | top-level `--env=""` |

Rules:

- Top-level `preview_database_id` menunjuk D1 preview agar development/dry-run tidak menyentuh production.
- Named environment `preview` mendeklarasikan ulang `DB` karena bindings tidak diwariskan antar-environment Wrangler.
- Preview secrets harus berbeda dari production secrets.
- Data Mahasiswa nyata tidak boleh digunakan pada preview.

## 8. Local Onboarding

```bash
npm ci
npm run cf:typegen
npm run dev
```

Untuk Worker-compatible preview dan smoke test:

```bash
npm run preview
npm run test:smoke
```

## 9. Secret Security Rules

- `.dev.vars`, `.env`, `.env.local`, database export, dan local Wrangler state wajib di-ignore.
- Jangan pernah menaruh binding atau secret pada `NEXT_PUBLIC_*`.
- Jangan log password, cookie, raw QR token, signing secret, auth secret, atau precise location.
- Generate auth dan QR secret secara independen menggunakan CSPRNG saat phase terkait dimulai.
- Rotasi auth/QR secret harus mengikuti maintenance plan karena dapat menginvalidasi session atau QR aktif.
- Bootstrap Admin password harus diubah segera setelah setup dan dihapus bila bootstrap tidak lagi memerlukannya.
