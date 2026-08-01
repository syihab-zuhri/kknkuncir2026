import type { Metadata } from "next";

import { requirePageSession } from "@/lib/auth/page-guards";

export const metadata: Metadata = { title: "Akun saya" };

export default async function StudentHomePage() {
  const session = await requirePageSession(["STUDENT"]);

  return (
    <main className="shell auth-shell">
      <section className="health-panel">
        <p className="eyebrow">Area terproteksi</p>
        <h1>Halo, {session.user.name}.</h1>
        <p className="lede">
          Guard kepemilikan Mahasiswa sudah aktif. Fitur kehadiran belum dibuat
          pada Phase 1.
        </p>
      </section>
    </main>
  );
}
