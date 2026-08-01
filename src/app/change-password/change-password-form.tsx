"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type ChangePasswordResult = {
  success?: boolean;
  error?: { message?: string };
};

export function ChangePasswordForm({ destination }: { destination: string }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);
    const form = new FormData(event.currentTarget);

    try {
      const response = await fetch("/api/v1/auth/change-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          currentPassword: form.get("currentPassword"),
          newPassword: form.get("newPassword"),
        }),
      });
      const result = (await response.json()) as ChangePasswordResult;

      if (!response.ok || !result.success) {
        setMessage(result.error?.message ?? "Password belum dapat diganti.");
        return;
      }

      router.replace(destination);
      router.refresh();
    } catch {
      setMessage("Layanan sedang bermasalah. Coba lagi.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={submit}>
      <label>
        <span>Password saat ini</span>
        <input
          autoComplete="current-password"
          maxLength={128}
          name="currentPassword"
          required
          type="password"
        />
      </label>
      <label>
        <span>Password baru</span>
        <input
          autoComplete="new-password"
          maxLength={128}
          minLength={10}
          name="newPassword"
          required
          type="password"
        />
      </label>
      <p className="form-hint">
        Minimal 10 karakter serta memuat huruf dan angka.
      </p>
      {message ? (
        <p className="form-message" role="alert">
          {message}
        </p>
      ) : null}
      <button disabled={submitting} type="submit">
        {submitting ? "Menyimpan..." : "Ganti password"}
      </button>
    </form>
  );
}
