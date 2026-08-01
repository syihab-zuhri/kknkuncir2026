"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type LoginResult = {
  nextAction?: "CHANGE_PASSWORD" | "ADMIN_HOME" | "STUDENT_HOME";
  error?: { message?: string };
};

export function LoginForm() {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);
    const form = new FormData(event.currentTarget);

    try {
      const response = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          nim: form.get("nim"),
          password: form.get("password"),
        }),
      });
      const result = (await response.json()) as LoginResult;

      if (!response.ok || !result.nextAction) {
        setMessage(result.error?.message ?? "Login belum berhasil.");
        return;
      }

      const destination =
        result.nextAction === "CHANGE_PASSWORD"
          ? "/change-password"
          : result.nextAction === "ADMIN_HOME"
            ? "/admin"
            : "/me";
      router.replace(destination);
      router.refresh();
    } catch {
      setMessage("Layanan login sedang bermasalah. Coba lagi.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={submit}>
      <label>
        <span>NIM</span>
        <input
          autoComplete="username"
          inputMode="text"
          maxLength={64}
          name="nim"
          required
        />
      </label>
      <label>
        <span>Password</span>
        <input
          autoComplete="current-password"
          maxLength={128}
          name="password"
          required
          type="password"
        />
      </label>
      {message ? (
        <p className="form-message" role="alert">
          {message}
        </p>
      ) : null}
      <button disabled={submitting} type="submit">
        {submitting ? "Memeriksa..." : "Masuk"}
      </button>
    </form>
  );
}
