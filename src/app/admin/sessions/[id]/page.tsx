import type { Metadata } from "next";
import Link from "next/link";

import { AdminFrame } from "@/components/admin/admin-frame";
import { SessionForm } from "@/components/admin/session-form";
import { SessionLifecycleActions } from "@/components/admin/session-lifecycle-actions";
import { requirePageSession } from "@/lib/auth/page-guards";
import { getAppEnv } from "@/lib/cloudflare-env";
import {
  formatBusinessClock,
  formatBusinessDate,
} from "@/lib/time/business-time";
import {
  attendanceModeLabels,
  sessionStatusClass,
  sessionStatusLabels,
  sessionTypeLabels,
} from "@/modules/sessions/presentation";
import { getSessionDetail } from "@/modules/sessions/service";

export const metadata: Metadata = { title: "Detail Sesi" };

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await requirePageSession(["ADMIN"]);
  const { id } = await params;
  const { session, summary } = await getSessionDetail(getAppEnv().DB, id, {
    role: "ADMIN",
  });

  return (
    <AdminFrame
      active="sessions"
      actorName={actor.user.name}
      description={`${sessionTypeLabels[session.sessionType]} · ${formatBusinessDate(session.sessionDate)} · ${formatBusinessClock(session.startsAt)}–${formatBusinessClock(session.endsAt)} WIB`}
      title={session.title}
    >
      <div className="detail-heading-strip">
        <Link href="/admin/sessions">← Kembali ke sesi</Link>
        <span className={sessionStatusClass(session.status)}>
          {sessionStatusLabels[session.status]}
        </span>
      </div>

      <section className="session-summary-grid" aria-label="Ringkasan sesi">
        <article>
          <span>Mode</span>
          <strong>{attendanceModeLabels[session.attendanceMode]}</strong>
        </article>
        <article>
          <span>Catatan kehadiran</span>
          <strong>{summary.total}</strong>
        </article>
        <article>
          <span>Batas terlambat</span>
          <strong>
            {session.lateAfter
              ? `${formatBusinessClock(session.lateAfter)} WIB`
              : "Tidak ada"}
          </strong>
        </article>
      </section>

      <div className="session-detail-grid">
        <SessionForm
          initial={{
            sessionType: session.sessionType,
            title: session.title,
            sessionDate: session.sessionDate,
            startTime: formatBusinessClock(session.startsAt),
            endTime: formatBusinessClock(session.endsAt),
            lateTime: session.lateAfter
              ? formatBusinessClock(session.lateAfter)
              : "",
            attendanceMode: session.attendanceMode,
            notes: session.notes ?? "",
          }}
          session={session}
        />
        <SessionLifecycleActions session={session} />
      </div>
    </AdminFrame>
  );
}
