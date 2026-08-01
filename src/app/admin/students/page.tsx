import type { Metadata } from "next";
import Link from "next/link";

import { AdminFrame } from "@/components/admin/admin-frame";
import { CreateStudentForm } from "@/components/admin/create-student-form";
import { StudentImportForm } from "@/components/admin/student-import-form";
import { requirePageSession } from "@/lib/auth/page-guards";
import { getAppEnv } from "@/lib/cloudflare-env";
import { getStudents } from "@/modules/students/service";

export const metadata: Metadata = { title: "Mahasiswa" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await requirePageSession(["ADMIN"]);
  const raw = await searchParams;
  const params = new URLSearchParams();
  for (const key of ["q", "status", "page", "pageSize"] as const) {
    const value = raw[key];
    if (typeof value === "string") params.set(key, value);
  }
  const result = await getStudents(getAppEnv().DB, params);
  const currentQuery = params.get("q") ?? "";
  const currentStatus = params.get("status") ?? "all";

  return (
    <AdminFrame
      active="students"
      actorName={session.user.name}
      description="Daftar anggota yang dapat dicari, diaudit, dan dipertahankan tanpa menghapus histori."
      title="Roster mahasiswa"
    >
      <div className="student-actions">
        <CreateStudentForm />
        <StudentImportForm />
      </div>

      <section className="roster-panel" aria-labelledby="roster-heading">
        <header className="roster-toolbar">
          <div>
            <p>Database anggota</p>
            <h2 id="roster-heading">{result.pagination.total} mahasiswa</h2>
          </div>
          <form className="search-form">
            <label>
              <span>Cari nama atau NIM</span>
              <input
                defaultValue={currentQuery}
                name="q"
                placeholder="contoh: 2201 atau Siti"
              />
            </label>
            <label>
              <span>Status</span>
              <select defaultValue={currentStatus} name="status">
                <option value="all">Semua</option>
                <option value="active">Aktif</option>
                <option value="inactive">Nonaktif</option>
              </select>
            </label>
            <button className="button button-secondary" type="submit">
              Terapkan
            </button>
          </form>
        </header>

        {result.items.length === 0 ? (
          <div className="empty-state">
            <span aria-hidden="true">00</span>
            <h3>Belum ada mahasiswa yang cocok</h3>
            <p>Ubah filter atau gunakan panel tambah/impor di atas.</p>
          </div>
        ) : (
          <>
            <div className="responsive-table roster-table">
              <table>
                <thead>
                  <tr>
                    <th>Mahasiswa</th>
                    <th>NIM</th>
                    <th>Kontak</th>
                    <th>Status</th>
                    <th>
                      <span className="sr-only">Aksi</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {result.items.map((student) => (
                    <tr key={student.id}>
                      <td>
                        <strong>{student.fullName}</strong>
                        <small>{student.groupName}</small>
                      </td>
                      <td>
                        <code>{student.nim}</code>
                      </td>
                      <td>{student.phone ?? "—"}</td>
                      <td>
                        <span
                          className={
                            student.isActive
                              ? "status-pill status-active"
                              : "status-pill status-inactive"
                          }
                        >
                          {student.isActive ? "Aktif" : "Nonaktif"}
                        </span>
                        {student.mustChangePassword ? (
                          <small>Wajib ganti password</small>
                        ) : null}
                      </td>
                      <td>
                        <Link
                          className="row-link"
                          href={`/admin/students/${student.id}`}
                        >
                          Detail →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="student-card-list">
              {result.items.map((student) => (
                <article className="student-card" key={student.id}>
                  <header>
                    <span
                      className={
                        student.isActive
                          ? "status-dot status-dot-active"
                          : "status-dot"
                      }
                    >
                      {student.isActive ? "Aktif" : "Nonaktif"}
                    </span>
                    <code>{student.nim}</code>
                  </header>
                  <h3>{student.fullName}</h3>
                  <p>{student.phone ?? "Kontak belum diisi"}</p>
                  <Link href={`/admin/students/${student.id}`}>
                    Buka detail →
                  </Link>
                </article>
              ))}
            </div>
          </>
        )}

        <Pagination
          current={result.pagination.page}
          params={params}
          total={result.pagination.totalPages}
        />
      </section>
    </AdminFrame>
  );
}

function Pagination({
  current,
  total,
  params,
}: {
  current: number;
  total: number;
  params: URLSearchParams;
}) {
  if (total <= 1) return null;
  const hrefFor = (page: number) => {
    const next = new URLSearchParams(params);
    next.set("page", String(page));
    return `/admin/students?${next}`;
  };
  return (
    <nav aria-label="Paginasi mahasiswa" className="pagination">
      <Link
        aria-disabled={current === 1}
        href={current === 1 ? "#" : hrefFor(current - 1)}
      >
        ← Sebelumnya
      </Link>
      <span>
        Halaman {current} dari {total}
      </span>
      <Link
        aria-disabled={current === total}
        href={current === total ? "#" : hrefFor(current + 1)}
      >
        Berikutnya →
      </Link>
    </nav>
  );
}
