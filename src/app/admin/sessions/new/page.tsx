import type { Metadata } from "next";
import Link from "next/link";

import { AdminFrame } from "@/components/admin/admin-frame";
import { SessionForm } from "@/components/admin/session-form";
import { requirePageSession } from "@/lib/auth/page-guards";
import { getAppEnv } from "@/lib/cloudflare-env";
import { getBusinessDate } from "@/lib/time/business-time";
import { getActiveGroup } from "@/modules/group/service";

export const metadata: Metadata = { title: "Buat Sesi" };

export default async function NewSessionPage() {
  const actor = await requirePageSession(["ADMIN"]);
  const group = await getActiveGroup(getAppEnv().DB);

  return (
    <AdminFrame
      active="sessions"
      actorName={actor.user.name}
      description="Default mengikuti kebijakan kelompok dan tetap divalidasi kembali di server."
      title="Buat sesi baru"
    >
      <div className="detail-heading-strip">
        <Link href="/admin/sessions">← Kembali ke sesi</Link>
        <span>WIB · {group.timezone}</span>
      </div>
      <SessionForm
        initial={{
          sessionType: "DAILY",
          title: "",
          sessionDate: getBusinessDate(),
          startTime: group.dailyPolicy.startTime.slice(0, 5),
          endTime: group.dailyPolicy.endTime.slice(0, 5),
          lateTime: group.dailyPolicy.lateTime?.slice(0, 5) ?? "",
          attendanceMode: group.dailyPolicy.defaultMode,
          notes: "",
        }}
      />
    </AdminFrame>
  );
}
