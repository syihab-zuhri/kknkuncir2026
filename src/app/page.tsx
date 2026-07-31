import Link from "next/link";

const infrastructure = [
  { label: "Runtime", value: "Cloudflare Workers + OpenNext" },
  { label: "Framework", value: "Next.js App Router" },
  { label: "Data", value: "D1 binding declared, not provisioned" },
] as const;

export default function Home() {
  return (
    <main className="shell">
      <section className="hero" aria-labelledby="page-title">
        <div>
          <p className="eyebrow">Phase 0 · Infrastructure baseline</p>
          <h1 id="page-title">Fondasi aplikasi sudah siap diuji.</h1>
        </div>

        <div>
          <p className="lede">
            Bootstrap Next.js untuk Cloudflare Workers telah tersedia. Autentikasi, schema aplikasi,
            dan fitur kehadiran sengaja belum diaktifkan pada fase ini.
          </p>
          <Link className="status-link" href="/health">
            Periksa status aplikasi
          </Link>
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
