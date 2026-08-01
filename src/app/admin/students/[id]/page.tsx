import type { Metadata } from "next";
import Link from "next/link";

import { AdminFrame } from "@/components/admin/admin-frame";
import {
  StudentPasswordResetForm,
  StudentProfileForm,
  StudentStatusForm,
} from "@/components/admin/student-detail-forms";
import { requirePageSession } from "@/lib/auth/page-guards";
import { getAppEnv } from "@/lib/cloudflare-env";
import { getStudentForActor } from "@/modules/students/service";

export const metadata: Metadata = { title: "Detail Mahasiswa" };

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requirePageSession(["ADMIN"]);
  const { id } = await params;
  const student = await getStudentForActor(getAppEnv().DB, id, {
    role: "ADMIN",
    userId: session.user.id,
  });

  return (
    <AdminFrame
      active="students"
      actorName={session.user.name}
      description={`${student.nim} · ${student.groupName}`}
      title={student.fullName}
    >
      <div className="detail-heading-strip">
        <Link href="/admin/students">← Kembali ke roster</Link>
        <span
          className={
            student.isActive
              ? "status-pill status-active"
              : "status-pill status-inactive"
          }
        >
          {student.isActive ? "Akun aktif" : "Akun nonaktif"}
        </span>
      </div>
      <div className="detail-stack">
        <StudentProfileForm student={student} />
        <StudentStatusForm student={student} />
        <StudentPasswordResetForm studentId={student.id} />
      </div>
    </AdminFrame>
  );
}
