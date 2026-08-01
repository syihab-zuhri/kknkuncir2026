import type { Metadata } from "next";
import Link from "next/link";

import { AdminFrame } from "@/components/admin/admin-frame";
import { requirePageSession } from "@/lib/auth/page-guards";

export const metadata: Metadata = { title: "Admin" };

export default async function AdminPage() {
  const session = await requirePageSession(["ADMIN"]);

  return (
    <AdminFrame
      active="overview"
      actorName={session.user.name}
      description="Atur identitas kelompok dan anggota sebelum sesi kehadiran mulai dibangun."
      title="Pusat data lapangan"
    >
      <div className="phase-banner">
        <span>Phase 2</span>
        <p>
          Fondasi kelompok dan mahasiswa aktif. Sesi, QR, serta dashboard
          kehadiran belum dimulai.
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
      </div>
    </AdminFrame>
  );
}
