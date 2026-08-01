import type { Metadata } from "next";

import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Masuk" };

export default function LoginPage() {
  return (
    <main className="shell auth-shell">
      <section className="health-panel" aria-labelledby="login-title">
        <p className="eyebrow">Akses anggota KKN</p>
        <h1 id="login-title">Masuk dengan NIM.</h1>
        <p className="lede">
          Akun dibuat oleh Admin. Tidak tersedia registrasi atau pemulihan
          password publik.
        </p>
        <LoginForm />
      </section>
    </main>
  );
}
