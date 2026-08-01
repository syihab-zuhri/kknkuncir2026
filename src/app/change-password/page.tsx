import type { Metadata } from "next";

import { requirePasswordChangeSession } from "@/lib/auth/page-guards";

import { ChangePasswordForm } from "./change-password-form";

export const metadata: Metadata = { title: "Ganti password" };

export default async function ChangePasswordPage() {
  const session = await requirePasswordChangeSession();
  const destination = session.user.role === "ADMIN" ? "/admin" : "/me";

  return (
    <main className="shell auth-shell">
      <section className="health-panel" aria-labelledby="password-title">
        <p className="eyebrow">Keamanan akun</p>
        <h1 id="password-title">Buat password pribadi.</h1>
        <p className="lede">
          Password sementara harus diganti sebelum fitur lain dapat diakses.
        </p>
        <ChangePasswordForm destination={destination} />
      </section>
    </main>
  );
}
