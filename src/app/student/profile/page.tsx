import type { Metadata } from "next";

import { requirePageSession } from "@/lib/auth/page-guards";
import { getAppEnv } from "@/lib/cloudflare-env";
import { getOwnStudentProfile } from "@/modules/students/service";

export const metadata: Metadata = { title: "Profil Saya" };

export default async function StudentProfilePage() {
  const session = await requirePageSession(["STUDENT"]);
  const student = await getOwnStudentProfile(getAppEnv().DB, session.user.id);

  return (
    <main className="profile-shell">
      <header className="profile-hero">
        <p className="eyebrow">Profil mahasiswa</p>
        <span className="profile-number">{student.nim}</span>
        <h1>{student.fullName}</h1>
        <p>Data ini hanya dapat dilihat oleh Anda dan Admin kelompok.</p>
      </header>
      <section className="profile-ledger" aria-label="Data profil">
        <div>
          <span>Kelompok</span>
          <strong>{student.group.name}</strong>
        </div>
        <div>
          <span>Desa</span>
          <strong>{student.group.village ?? "Belum ditetapkan"}</strong>
        </div>
        <div>
          <span>Periode</span>
          <strong>
            {formatDate(student.group.periodStart)} —{" "}
            {formatDate(student.group.periodEnd)}
          </strong>
        </div>
        <div>
          <span>Nomor telepon</span>
          <strong>{student.phone ?? "Belum diisi"}</strong>
        </div>
        <div>
          <span>Status akun</span>
          <strong>{student.isActive ? "Aktif" : "Nonaktif"}</strong>
        </div>
      </section>
      <p className="profile-footnote">
        Perubahan NIM dan data administratif dilakukan oleh Admin agar histori
        kehadiran tetap konsisten.
      </p>
    </main>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00.000Z`));
}
