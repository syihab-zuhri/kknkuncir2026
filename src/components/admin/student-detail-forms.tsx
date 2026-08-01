"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";

import type { StudentDetailDto } from "@/modules/students/schema";

type Notice = { tone: "success" | "error"; message: string } | null;

export function StudentProfileForm({ student }: { student: StudentDetailDto }) {
  const router = useRouter();
  const [notice, setNotice] = useState<Notice>(null);
  const [pending, startTransition] = useTransition();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    startTransition(async () => {
      const response = await fetch(`/api/v1/students/${student.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          nim: form.get("nim"),
          fullName: form.get("fullName"),
          phone: form.get("phone"),
          notes: form.get("notes"),
        }),
      });
      const result = (await response.json()) as {
        error?: { message?: string };
      };
      if (!response.ok) {
        setNotice({
          tone: "error",
          message: result.error?.message ?? "Perubahan belum tersimpan.",
        });
        return;
      }
      setNotice({ tone: "success", message: "Profil mahasiswa diperbarui." });
      router.refresh();
    });
  }

  return (
    <form className="field-section detail-form" onSubmit={submit}>
      <div className="field-section-index">A</div>
      <header>
        <p>Data akademik</p>
        <h2>Profil mahasiswa</h2>
      </header>
      <div className="field-grid field-grid-two">
        <label className="field-control">
          <span>Nama lengkap</span>
          <input defaultValue={student.fullName} name="fullName" required />
        </label>
        <label className="field-control">
          <span>NIM</span>
          <input
            aria-describedby="nim-rule"
            defaultValue={student.nim}
            name="nim"
            readOnly={!student.nimEditable}
            required
          />
        </label>
        <label className="field-control">
          <span>Nomor telepon</span>
          <input defaultValue={student.phone ?? ""} name="phone" type="tel" />
        </label>
        <label className="field-control field-wide">
          <span>Catatan internal</span>
          <textarea defaultValue={student.notes ?? ""} name="notes" rows={4} />
        </label>
      </div>
      <p className="form-security-note" id="nim-rule">
        {student.nimEditable
          ? "NIM masih dapat diubah karena belum ada histori kehadiran."
          : "NIM terkunci karena sudah terhubung dengan histori kehadiran."}
      </p>
      <FormFooter
        notice={notice}
        pending={pending}
        pendingLabel="Menyimpan…"
        submitLabel="Simpan profil"
      />
    </form>
  );
}

export function StudentStatusForm({ student }: { student: StudentDetailDto }) {
  const router = useRouter();
  const [notice, setNotice] = useState<Notice>(null);
  const [pending, startTransition] = useTransition();
  const nextStatus = !student.isActive;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    startTransition(async () => {
      const response = await fetch(
        `/api/v1/admin/students/${student.id}/status`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            isActive: nextStatus,
            reason: form.get("reason"),
          }),
        },
      );
      const result = (await response.json()) as {
        error?: { message?: string };
      };
      if (!response.ok) {
        setNotice({
          tone: "error",
          message: result.error?.message ?? "Status belum dapat diubah.",
        });
        return;
      }
      setNotice({
        tone: "success",
        message: nextStatus
          ? "Akun diaktifkan kembali."
          : "Akun dinonaktifkan dan session dicabut.",
      });
      router.refresh();
    });
  }

  return (
    <form className="field-section detail-form" onSubmit={submit}>
      <div className="field-section-index">B</div>
      <header>
        <p>Kontrol akses</p>
        <h2>{student.isActive ? "Nonaktifkan akun" : "Aktifkan kembali"}</h2>
      </header>
      <p className="section-copy">
        Histori kehadiran tidak akan dihapus. Menonaktifkan akun juga mencabut
        seluruh session aktif mahasiswa.
      </p>
      <label className="field-control">
        <span>Alasan administratif</span>
        <textarea minLength={3} name="reason" required rows={3} />
      </label>
      <FormFooter
        danger={student.isActive}
        notice={notice}
        pending={pending}
        pendingLabel="Memproses…"
        submitLabel={student.isActive ? "Nonaktifkan akun" : "Aktifkan akun"}
      />
    </form>
  );
}

export function StudentPasswordResetForm({ studentId }: { studentId: string }) {
  const [notice, setNotice] = useState<Notice>(null);
  const [pending, startTransition] = useTransition();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    startTransition(async () => {
      const response = await fetch(
        `/api/v1/admin/students/${studentId}/reset-password`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            temporaryPassword: form.get("temporaryPassword"),
            reason: form.get("reason"),
          }),
        },
      );
      const result = (await response.json()) as {
        error?: { message?: string };
      };
      if (!response.ok) {
        setNotice({
          tone: "error",
          message: result.error?.message ?? "Password belum dapat direset.",
        });
        return;
      }
      setNotice({
        tone: "success",
        message: "Password sementara ditetapkan dan session lama dicabut.",
      });
      formElement.reset();
    });
  }

  return (
    <form className="field-section detail-form" onSubmit={submit}>
      <div className="field-section-index">C</div>
      <header>
        <p>Pemulihan akses</p>
        <h2>Reset password</h2>
      </header>
      <div className="field-grid field-grid-two">
        <label className="field-control">
          <span>Password sementara</span>
          <input
            minLength={10}
            name="temporaryPassword"
            required
            type="password"
          />
        </label>
        <label className="field-control">
          <span>Alasan reset</span>
          <input minLength={3} name="reason" required />
        </label>
      </div>
      <p className="form-security-note">
        Mahasiswa wajib mengganti password ini pada login berikutnya.
      </p>
      <FormFooter
        notice={notice}
        pending={pending}
        pendingLabel="Mereset…"
        submitLabel="Reset password"
      />
    </form>
  );
}

function FormFooter({
  notice,
  pending,
  pendingLabel,
  submitLabel,
  danger = false,
}: {
  notice: Notice;
  pending: boolean;
  pendingLabel: string;
  submitLabel: string;
  danger?: boolean;
}) {
  return (
    <footer className="compact-form-footer">
      <p
        aria-live="polite"
        className={notice ? `notice notice-${notice.tone}` : "notice"}
      >
        {notice?.message}
      </p>
      <button
        className={danger ? "button button-danger" : "button button-primary"}
        disabled={pending}
        type="submit"
      >
        {pending ? pendingLabel : submitLabel}
      </button>
    </footer>
  );
}
