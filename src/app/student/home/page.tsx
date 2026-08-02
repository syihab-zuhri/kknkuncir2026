import type { Metadata } from "next";
import Link from "next/link";

import { requirePageSession } from "@/lib/auth/page-guards";
import { getAppEnv } from "@/lib/cloudflare-env";
import {
  formatBusinessClock,
  formatBusinessDate,
} from "@/lib/time/business-time";
import {
  attendanceModeLabels,
  sessionTypeLabels,
} from "@/modules/sessions/presentation";
import { getActiveSessionCards } from "@/modules/sessions/service";
import type { AttendanceSessionDto } from "@/modules/sessions/schema";

export const metadata: Metadata = { title: "Beranda Mahasiswa" };

export default async function StudentHomePage() {
  const actor = await requirePageSession(["STUDENT"]);
  const active = await getActiveSessionCards(getAppEnv().DB);
  const sessions = [...(active.daily ? [active.daily] : []), ...active.events];

  return (
    <main className="student-home-shell">
      <header className="student-home-header">
        <div>
          <p className="eyebrow">KKN Desa Kuncir · WIB</p>
          <h1>Halo, {actor.user.name}</h1>
          <p>
            Sesi hanya tampil saat status aktif dan berada dalam jendela waktu
            server.
          </p>
        </div>
        <Link className="button button-secondary" href="/student/profile">
          Profil saya
        </Link>
      </header>

      <section aria-labelledby="active-session-heading">
        <div className="student-section-heading">
          <span>01</span>
          <div>
            <p>Sekarang</p>
            <h2 id="active-session-heading">Sesi aktif</h2>
          </div>
        </div>

        {sessions.length === 0 ? (
          <div className="student-session-empty">
            <strong>Belum ada sesi aktif.</strong>
            <p>Halaman ini akan menampilkan sesi setelah Admin membukanya.</p>
          </div>
        ) : (
          <div className="student-session-grid">
            {sessions.map((session) => (
              <ActiveSessionCard key={session.id} session={session} />
            ))}
          </div>
        )}
      </section>

      <p className="student-phase-note">
        Pemindaian QR belum diaktifkan pada Phase 3. Kartu ini bersifat
        informasi dan tidak mencatat kehadiran.
      </p>
    </main>
  );
}

function ActiveSessionCard({ session }: { session: AttendanceSessionDto }) {
  return (
    <article className="student-session-card">
      <header>
        <span className="status-pill status-active">Aktif</span>
        <code>{sessionTypeLabels[session.sessionType]}</code>
      </header>
      <p>{formatBusinessDate(session.sessionDate)}</p>
      <h3>{session.title}</h3>
      <dl>
        <div>
          <dt>Waktu</dt>
          <dd>
            {formatBusinessClock(session.startsAt)}–
            {formatBusinessClock(session.endsAt)} WIB
          </dd>
        </div>
        <div>
          <dt>Mode</dt>
          <dd>{attendanceModeLabels[session.attendanceMode]}</dd>
        </div>
      </dl>
    </article>
  );
}
