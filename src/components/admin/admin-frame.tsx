import Link from "next/link";
import type { ReactNode } from "react";

type AdminFrameProps = {
  active: "overview" | "group" | "students";
  actorName: string;
  title: string;
  description: string;
  children: ReactNode;
};

const navigation = [
  { id: "overview", href: "/admin", label: "Ringkasan", marker: "01" },
  {
    id: "group",
    href: "/admin/settings/group",
    label: "Kelompok",
    marker: "02",
  },
  {
    id: "students",
    href: "/admin/students",
    label: "Mahasiswa",
    marker: "03",
  },
] as const;

export function AdminFrame({
  active,
  actorName,
  title,
  description,
  children,
}: AdminFrameProps) {
  return (
    <main className="admin-shell">
      <header className="admin-masthead">
        <Link className="admin-brand" href="/admin">
          <span className="admin-brand-mark" aria-hidden="true">
            K
          </span>
          <span>
            <strong>Desa Kuncir</strong>
            <small>Presence fieldbook · 2026</small>
          </span>
        </Link>
        <div className="admin-identity">
          <span>Operator aktif</span>
          <strong>{actorName}</strong>
        </div>
      </header>

      <div className="admin-workspace">
        <aside className="admin-rail" aria-label="Navigasi Admin">
          <p className="admin-rail-label">Manajemen dasar</p>
          <nav>
            {navigation.map((item) => (
              <Link
                aria-current={active === item.id ? "page" : undefined}
                className="admin-nav-link"
                href={item.href}
                key={item.id}
              >
                <span>{item.marker}</span>
                {item.label}
              </Link>
            ))}
          </nav>
          <p className="admin-rail-note">
            Fase 2<strong>Kelompok & mahasiswa</strong>
          </p>
        </aside>

        <section className="admin-canvas">
          <header className="admin-page-heading">
            <p className="eyebrow">KKN Desa Kuncir · Admin</p>
            <h1>{title}</h1>
            <p>{description}</p>
          </header>
          {children}
        </section>
      </div>
    </main>
  );
}
