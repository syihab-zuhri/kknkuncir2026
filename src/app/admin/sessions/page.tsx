import type { Metadata } from "next";
import Link from "next/link";

import { AdminFrame } from "@/components/admin/admin-frame";
import { requirePageSession } from "@/lib/auth/page-guards";
import { getAppEnv } from "@/lib/cloudflare-env";
import {
  formatBusinessDate,
  formatBusinessClock,
} from "@/lib/time/business-time";
import {
  attendanceModeLabels,
  sessionStatusClass,
  sessionStatusLabels,
  sessionTypeLabels,
} from "@/modules/sessions/presentation";
import { getSessions } from "@/modules/sessions/service";

export const metadata: Metadata = { title: "Sesi Kehadiran" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function SessionsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const actor = await requirePageSession(["ADMIN"]);
  const raw = await searchParams;
  const params = new URLSearchParams();
  for (const key of ["date", "type", "status"] as const) {
    if (typeof raw[key] === "string") params.set(key, raw[key]);
  }
  const { items } = await getSessions(getAppEnv().DB, params, {
    role: "ADMIN",
  });

  return (
    <AdminFrame
      active="sessions"
      actorName={actor.user.name}
      description="Buat konteks kehadiran, atur jendela WIB, lalu kendalikan lifecycle tanpa menghapus histori."
      title="Sesi kehadiran"
    >
      <div className="session-list-actions">
        <Link className="button button-primary" href="/admin/sessions/new">
          Buat sesi
        </Link>
        <p>Maksimal satu sesi harian non-batal per tanggal.</p>
      </div>

      <section className="roster-panel" aria-labelledby="session-list-title">
        <header className="roster-toolbar session-toolbar">
          <div>
            <p>Ledger sesi</p>
            <h2 id="session-list-title">{items.length} sesi</h2>
          </div>
          <form className="search-form session-filter-form">
            <label>
              <span>Tanggal</span>
              <input
                defaultValue={params.get("date") ?? ""}
                name="date"
                type="date"
              />
            </label>
            <label>
              <span>Tipe</span>
              <select defaultValue={params.get("type") ?? "all"} name="type">
                <option value="all">Semua</option>
                <option value="DAILY">Harian</option>
                <option value="EVENT">Kegiatan</option>
              </select>
            </label>
            <label>
              <span>Status</span>
              <select
                defaultValue={params.get("status") ?? "all"}
                name="status"
              >
                <option value="all">Semua</option>
                <option value="DRAFT">Draf</option>
                <option value="OPEN">Aktif</option>
                <option value="CLOSED">Ditutup</option>
                <option value="CANCELLED">Dibatalkan</option>
              </select>
            </label>
            <button className="button button-secondary" type="submit">
              Terapkan
            </button>
          </form>
        </header>

        {items.length === 0 ? (
          <div className="empty-state">
            <span aria-hidden="true">00</span>
            <h3>Belum ada sesi yang cocok</h3>
            <p>Ubah filter atau buat sesi baru untuk memulai.</p>
          </div>
        ) : (
          <div className="session-card-grid">
            {items.map((item) => (
              <article className="session-card" key={item.id}>
                <header>
                  <span className={sessionStatusClass(item.status)}>
                    {sessionStatusLabels[item.status]}
                  </span>
                  <code>{sessionTypeLabels[item.sessionType]}</code>
                </header>
                <p className="session-card-date">
                  {formatBusinessDate(item.sessionDate)}
                </p>
                <h3>{item.title}</h3>
                <dl>
                  <div>
                    <dt>Waktu</dt>
                    <dd>
                      {formatBusinessClock(item.startsAt)}–
                      {formatBusinessClock(item.endsAt)} WIB
                    </dd>
                  </div>
                  <div>
                    <dt>Mode</dt>
                    <dd>{attendanceModeLabels[item.attendanceMode]}</dd>
                  </div>
                  <div>
                    <dt>Catatan hadir</dt>
                    <dd>{item.attendanceTotal}</dd>
                  </div>
                </dl>
                <Link href={`/admin/sessions/${item.id}`}>Buka detail →</Link>
              </article>
            ))}
          </div>
        )}
      </section>
    </AdminFrame>
  );
}
