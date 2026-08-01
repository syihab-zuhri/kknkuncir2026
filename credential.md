# credential — Environment & Cloudflare Services Template

**Document Version**: 1.4.0
**Last Updated**: 2026-08-01
**Status**: Phase 2 Data Ready; Worker Rollout Pending

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
APP_NAME=kkndesakuncir
APP_URL=http://localhost:3000
APP_TIMEZONE=Asia/Jakarta
NEXT_PUBLIC_APP_NAME=kkndesakuncir
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_TIMEZONE=Asia/Jakarta

BETTER_AUTH_SECRET=
BETTER_AUTH_URL=http://localhost:3000
QR_SIGNING_SECRET=
BOOTSTRAP_ADMIN_USERNAME=admin
BOOTSTRAP_ADMIN_NAME=Administrator
BOOTSTRAP_ADMIN_PASSWORD=
BOOTSTRAP_ADMIN_TOKEN=
```

Nilai kosong pada template disengaja. Phase 1 memerlukan `BETTER_AUTH_SECRET`, `BOOTSTRAP_ADMIN_PASSWORD`, dan token terpisah `BOOTSTRAP_ADMIN_TOKEN`. `QR_SIGNING_SECRET` tetap belum digunakan sampai phase QR.

## 3. Production Worker Secrets

Set secret melalui input interaktif Wrangler:

```bash
npx wrangler secret put BETTER_AUTH_SECRET
npx wrangler secret put BOOTSTRAP_ADMIN_PASSWORD
npx wrangler secret put BOOTSTRAP_ADMIN_TOKEN
```

`BOOTSTRAP_ADMIN_USERNAME` dan `BOOTSTRAP_ADMIN_NAME` adalah konfigurasi non-secret yang harus ditetapkan per environment saat bootstrap dijalankan. Setelah bootstrap berhasil, hapus password/token bootstrap dari Worker sesuai runbook dan wajibkan Admin mengganti password awal pada login pertama. Di production, kedua secret bootstrap sudah dihapus dan hanya `BETTER_AUTH_SECRET` yang tersisa. `QR_SIGNING_SECRET` baru ditambahkan pada phase QR.

Jangan simpan nilai secret pada `wrangler.jsonc`, Workers Builds build variables, GitHub variables, issue, atau log CI.

## 4. Non-Secret Worker Variables

`wrangler.jsonc` menyimpan konfigurasi non-secret berikut:

```jsonc
{
  "vars": {
    "APP_NAME": "kkndesakuncir",
    "APP_URL": "https://zuhrirey.my.id",
    "APP_TIMEZONE": "Asia/Jakarta",
    "BOOTSTRAP_ADMIN_USERNAME": "admin",
    "BOOTSTRAP_ADMIN_NAME": "Administrator"
  }
}
```

## 5. Cloudflare Bindings

Bindings adalah izin/resource handle, bukan string credential.

| Binding | Type | Phase | Purpose |
|---|---|---:|---|
| `DB` | D1 | 1 | Better Auth dan application schema |
| `ASSETS` | Workers Static Assets | 0 | Aset hasil OpenNext |
| `LOGIN_RATE_LIMITER` | Rate Limit | 1 active | Login abuse protection berdasarkan hash NIM |
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

| Service | Resource | Status 2026-08-01 |
|---|---|---|
| Workers | `kknkuncir2026` | Phase 1 deployed; Phase 2 PR ready to merge |
| D1 Production | `kknkuncir2026-db` | Phase 1 migration; one Admin; Phase 2 group seed applied with auto-create off |
| D1 Preview | `kknkuncir2026-preview-db` | Phase 1 migration applied |
| Workers Builds | GitHub `syihab-zuhri/kknkuncir2026`, branch `main` | Connected |
| Custom Domain | `zuhrirey.my.id` | Active on Phase 1 Worker |
| Observability | Workers Logs and Traces | Active |
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
