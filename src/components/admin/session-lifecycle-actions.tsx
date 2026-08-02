"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";

import type { AttendanceSessionDto } from "@/modules/sessions/schema";

export function SessionLifecycleActions({
  session,
}: {
  session: AttendanceSessionDto;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function mutate(action: "open" | "close", success: string) {
    setMessage(null);
    startTransition(async () => {
      const response = await fetch(`/api/v1/sessions/${session.id}/${action}`, {
        method: "POST",
      });
      const body = (await response.json().catch(() => ({}))) as {
        error?: { message?: string };
      };
      setMessage(
        response.ok ? success : (body.error?.message ?? "Tindakan gagal."),
      );
      if (response.ok) router.refresh();
    });
  }

  function cancel(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const reason = new FormData(event.currentTarget).get("reason");
    setMessage(null);
    startTransition(async () => {
      const response = await fetch(`/api/v1/sessions/${session.id}/cancel`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const body = (await response.json().catch(() => ({}))) as {
        error?: { message?: string };
      };
      setMessage(
        response.ok
          ? "Sesi dibatalkan."
          : (body.error?.message ?? "Pembatalan gagal."),
      );
      if (response.ok) router.refresh();
    });
  }

  if (session.status === "CLOSED" || session.status === "CANCELLED") {
    return (
      <section className="session-lifecycle-panel">
        <strong>Lifecycle selesai</strong>
        <p>Sesi hanya dapat dibaca dan tidak menerima kehadiran.</p>
      </section>
    );
  }

  return (
    <section
      className="session-lifecycle-panel"
      aria-labelledby="lifecycle-title"
    >
      <header>
        <p>Kontrol server</p>
        <h2 id="lifecycle-title">Lifecycle sesi</h2>
      </header>
      <div className="action-row">
        {session.status === "DRAFT" ? (
          <button
            className="button button-primary"
            disabled={pending}
            onClick={() => mutate("open", "Sesi dibuka.")}
            type="button"
          >
            Buka sesi
          </button>
        ) : null}
        {session.status === "OPEN" ? (
          <button
            className="button button-secondary"
            disabled={pending}
            onClick={() => mutate("close", "Sesi ditutup.")}
            type="button"
          >
            Tutup lebih awal
          </button>
        ) : null}
      </div>
      <form className="cancel-session-form" onSubmit={cancel}>
        <label className="field-control">
          Alasan pembatalan
          <input maxLength={500} minLength={3} name="reason" required />
        </label>
        <button
          className="button button-danger"
          disabled={pending}
          type="submit"
        >
          Batalkan sesi
        </button>
      </form>
      <p aria-live="polite" className="notice">
        {message}
      </p>
    </section>
  );
}
