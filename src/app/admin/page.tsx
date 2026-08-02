import type { Metadata } from "next";
import Link from "next/link";

import { AdminFrame } from "@/components/admin/admin-frame";
import { requirePageSession } from "@/lib/auth/page-guards";
import { getAppEnv } from "@/lib/cloudflare-env";
import { getActiveSessionCards } from "@/modules/sessions/service";

export const metadata: Metadata = { title: "Admin" };

export default async function AdminPage() {
  const session = await requirePageSession(["ADMIN"]);
  const active = await getActiveSessionCards(getAppEnv().DB);
  const activeCount = (active.daily ? 1 : 0) + active.events.length;

  return (
    <AdminFrame
      active="overview"
      actorName={session.user.name}
      description="Kelola kelompok, roster, dan jendela kehadiran dari satu pusat operasi."
      title="Pusat operasi lapangan"
    >
      <div className="phase-banner">
        <span>Phase 3</span>
        <p>
          {activeCount} sesi sedang aktif. QR dan pencatatan kehadiran tetap
          belum tersedia sampai Phase 4.
        </p>
      </div>
      <div className="admin-launch-grid">
        <Link className="launch-card" href="/admin/settings/group">
          <span>02 / Kelompok</span>
          <h2>Konfigurasi operasi harian</h2>
          <p>
            Identitas desa, periode, jam harian, batas terlambat, dan mode scan
            default.
          </p>
          <strong>Buka pengaturan →</strong>
        </Link>
        <Link className="launch-card launch-card-dark" href="/admin/students">
          <span>03 / Mahasiswa</span>
          <h2>Daftar anggota terkontrol</h2>
          <p>
            Cari, tambah, impor, perbarui, nonaktifkan, dan pulihkan akses
            mahasiswa.
          </p>
          <strong>Kelola mahasiswa →</strong>
        </Link>
        <Link className="launch-card" href="/admin/sessions">
          <span>04 / Sesi</span>
          <h2>Jendela kehadiran terjadwal</h2>
          <p>
            Buat sesi harian atau kegiatan, buka, tutup, batalkan, dan pantau
            scheduler WIB.
          </p>
          <strong>Kelola sesi →</strong>
        </Link>
      </div>
    </AdminFrame>
  );
}
