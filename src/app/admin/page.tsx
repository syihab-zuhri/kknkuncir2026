import type { Metadata } from "next";

import { requirePageSession } from "@/lib/auth/page-guards";

export const metadata: Metadata = { title: "Admin" };

export default async function AdminPage() {
  const session = await requirePageSession(["ADMIN"]);

  return (
    <main className="shell auth-shell">
      <section className="health-panel">
        <p className="eyebrow">Area terproteksi</p>
        <h1>Halo, {session.user.name}.</h1>
        <p className="lede">
          Guard Admin dan pemeriksaan server-side sudah aktif. Fitur dashboard
          bisnis belum dibuat pada Phase 1.
        </p>
      </section>
    </main>
  );
}
