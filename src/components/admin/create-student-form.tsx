"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";

export function CreateStudentForm() {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setMessage(null);

    startTransition(async () => {
      const response = await fetch("/api/v1/admin/students", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          nim: form.get("nim"),
          fullName: form.get("fullName"),
          phone: form.get("phone"),
          notes: form.get("notes"),
          temporaryPassword: form.get("temporaryPassword"),
        }),
      });
      const result = (await response.json()) as {
        student?: { fullName: string; nim: string };
        error?: { message?: string };
      };

      if (!response.ok || !result.student) {
        setError(true);
        setMessage(
          result.error?.message ?? "Mahasiswa belum dapat ditambahkan.",
        );
        return;
      }

      setError(false);
      setMessage(
        `${result.student.fullName} (${result.student.nim}) berhasil ditambahkan.`,
      );
      formElement.reset();
      router.refresh();
    });
  }

  return (
    <details className="action-panel">
      <summary>
        <span className="action-panel-marker">+</span>
        Tambah satu mahasiswa
      </summary>
      <form className="compact-form" onSubmit={submit}>
        <div className="field-grid field-grid-two">
          <label className="field-control">
            <span>NIM</span>
            <input
              inputMode="numeric"
              name="nim"
              pattern="[0-9]{3,32}"
              required
            />
          </label>
          <label className="field-control">
            <span>Nama lengkap</span>
            <input name="fullName" required />
          </label>
          <label className="field-control">
            <span>Nomor telepon</span>
            <input name="phone" type="tel" />
          </label>
          <label className="field-control">
            <span>Password sementara</span>
            <input
              minLength={10}
              name="temporaryPassword"
              required
              type="password"
            />
          </label>
          <label className="field-control field-wide">
            <span>Catatan internal</span>
            <textarea name="notes" rows={2} />
          </label>
        </div>
        <p className="form-security-note">
          Password harus minimal 10 karakter, mengandung huruf dan angka.
          Berikan langsung kepada mahasiswa dan jangan simpan di spreadsheet.
        </p>
        <div className="compact-form-footer">
          <p
            aria-live="polite"
            className={error ? "notice notice-error" : "notice notice-success"}
          >
            {message}
          </p>
          <button
            className="button button-primary"
            disabled={pending}
            type="submit"
          >
            {pending ? "Membuat akun…" : "Buat akun"}
          </button>
        </div>
      </form>
    </details>
  );
}
