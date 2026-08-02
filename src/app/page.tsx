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
          <p className="eyebrow">Phase 3 · Session operations</p>
          <h1 id="page-title">Sesi kehadiran siap dikelola.</h1>
        </div>

        <div>
          <p className="lede">
            Kelompok, roster, login NIM, lifecycle sesi, dan scheduler WIB
            sudah tersedia. Pemindaian QR serta pencatatan kehadiran tetap
            menunggu Phase 4.
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
