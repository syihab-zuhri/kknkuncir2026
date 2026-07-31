import type { Metadata } from "next";

import { getSystemStatus } from "@/lib/system-status";

export const metadata: Metadata = {
  title: "Status",
};

export default function HealthPage() {
  const status = getSystemStatus();

  return (
    <main className="shell">
      <section className="health-panel" aria-labelledby="health-title">
        <span className="health-badge">{status.status}</span>
        <h1 id="health-title">Aplikasi dapat dirender.</h1>
        <p className="lede">
          Halaman ini adalah smoke target Phase 0. Status database hanya
          menunjukkan deklarasi binding; belum ada koneksi atau schema aplikasi.
        </p>

        <dl className="health-list">
          <div>
            <dt>Aplikasi</dt>
            <dd>{status.application}</dd>
          </div>
          <div>
            <dt>Fase</dt>
            <dd>{status.phase}</dd>
          </div>
          <div>
            <dt>Runtime</dt>
            <dd>{status.runtime}</dd>
          </div>
          <div>
            <dt>Database</dt>
            <dd>{status.database}</dd>
          </div>
        </dl>
      </section>
    </main>
  );
}
