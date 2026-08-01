import Link from "next/link";

const infrastructure = [
  { label: "Runtime", value: "Cloudflare Workers + OpenNext" },
  { label: "Framework", value: "Next.js App Router" },
  { label: "Data", value: "Cloudflare D1 + Drizzle ORM" },
] as const;

export default function Home() {
  return (
    <main className="shell">
      <section className="hero" aria-labelledby="page-title">
        <div>
          <p className="eyebrow">Phase 1 · Auth &amp; data foundation</p>
          <h1 id="page-title">Fondasi akun sudah siap diuji.</h1>
        </div>

        <div>
          <p className="lede">
            Schema D1, Better Auth, login NIM, dan kontrol akses server-side
            sudah tersedia. Fitur kehadiran tetap belum diaktifkan pada fase
            ini.
          </p>
          <div className="action-row">
            <Link className="status-link" href="/health">
              Periksa status aplikasi
            </Link>
            <Link className="status-link" href="/login">
              Masuk
            </Link>
          </div>
        </div>
      </section>

      <section className="status-grid" aria-label="Ringkasan infrastruktur">
        {infrastructure.map((item) => (
          <article className="status-card" key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </article>
        ))}
      </section>
    </main>
  );
}
