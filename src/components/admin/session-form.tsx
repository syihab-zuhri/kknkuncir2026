"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";

import type {
  AttendanceSessionDto,
  SessionAttendanceMode,
} from "@/modules/sessions/schema";

type SessionFormValues = {
  sessionType: "DAILY" | "EVENT";
  title: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  lateTime: string;
  attendanceMode: SessionAttendanceMode;
  notes: string;
};

type SessionFormProps = {
  initial: SessionFormValues;
  session?: AttendanceSessionDto;
};

export function SessionForm({ initial, session }: SessionFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);
  const timeLocked = session?.status === "OPEN";

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);
    const form = new FormData(event.currentTarget);
    const payload = {
      sessionType: form.get("sessionType"),
      title: form.get("title"),
      sessionDate: form.get("sessionDate"),
      startTime: form.get("startTime"),
      endTime: form.get("endTime"),
      lateTime: form.get("lateTime"),
      attendanceMode: form.get("attendanceMode"),
      notes: form.get("notes"),
    };

    startTransition(async () => {
      const response = await fetch(
        session ? `/api/v1/sessions/${session.id}` : "/api/v1/sessions",
        {
          method: session ? "PATCH" : "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const body = (await response.json().catch(() => ({}))) as {
        session?: AttendanceSessionDto;
        error?: { message?: string };
      };

      if (!response.ok || !body.session) {
        setNotice({
          tone: "error",
          message: body.error?.message ?? "Sesi tidak dapat disimpan.",
        });
        return;
      }

      if (!session) {
        router.push(`/admin/sessions/${body.session.id}`);
        return;
      }

      setNotice({ tone: "success", message: "Perubahan sesi tersimpan." });
      router.refresh();
    });
  }

  return (
    <form className="field-form" onSubmit={submit}>
      <section className="field-section">
        <span className="field-section-index">01</span>
        <header>
          <p>Konteks kehadiran</p>
          <h2>Identitas sesi</h2>
        </header>
        <div className="field-grid field-grid-two">
          <label className="field-control">
            Tipe sesi
            <select
              defaultValue={initial.sessionType}
              disabled={timeLocked}
              name="sessionType"
            >
              <option value="DAILY">Harian</option>
              <option value="EVENT">Kegiatan</option>
            </select>
            {timeLocked ? (
              <input
                name="sessionType"
                type="hidden"
                value={initial.sessionType}
              />
            ) : null}
          </label>
          <label className="field-control">
            Judul
            <input
              defaultValue={initial.title}
              maxLength={120}
              name="title"
              placeholder="Otomatis untuk sesi harian"
            />
          </label>
          <label className="field-control field-wide">
            Catatan opsional
            <textarea
              defaultValue={initial.notes}
              maxLength={1000}
              name="notes"
              rows={3}
            />
          </label>
        </div>
      </section>

      <section className="field-section">
        <span className="field-section-index">02</span>
        <header>
          <p>Asia/Jakarta</p>
          <h2>Jendela waktu</h2>
        </header>
        <div className="field-grid field-grid-two">
          <label className="field-control">
            Tanggal
            <input
              defaultValue={initial.sessionDate}
              disabled={timeLocked}
              name="sessionDate"
              required
              type="date"
            />
            {timeLocked ? (
              <input
                name="sessionDate"
                type="hidden"
                value={initial.sessionDate}
              />
            ) : null}
          </label>
          <label className="field-control">
            Mode kehadiran
            <select defaultValue={initial.attendanceMode} name="attendanceMode">
              <option value="SELF_SCAN">Mahasiswa scan sesi</option>
              <option value="ADMIN_SCAN">Admin scan mahasiswa</option>
              <option value="HYBRID">Keduanya</option>
            </select>
          </label>
          <label className="field-control">
            Mulai
            <input
              defaultValue={initial.startTime}
              disabled={timeLocked}
              name="startTime"
              required
              type="time"
            />
            {timeLocked ? (
              <input name="startTime" type="hidden" value={initial.startTime} />
            ) : null}
          </label>
          <label className="field-control">
            Selesai
            <input
              defaultValue={initial.endTime}
              disabled={timeLocked}
              name="endTime"
              required
              type="time"
            />
            {timeLocked ? (
              <input name="endTime" type="hidden" value={initial.endTime} />
            ) : null}
          </label>
          <label className="field-control">
            Terlambat setelah
            <input
              defaultValue={initial.lateTime}
              disabled={timeLocked}
              name="lateTime"
              type="time"
            />
            {timeLocked ? (
              <input name="lateTime" type="hidden" value={initial.lateTime} />
            ) : null}
          </label>
        </div>
        {timeLocked ? (
          <p className="field-callout">
            Sesi aktif: tanggal dan waktu dikunci. Judul, catatan, dan mode
            masih dapat diaudit dan diubah.
          </p>
        ) : null}
      </section>

      <footer className="form-dock">
        <p
          aria-live="polite"
          className={`notice ${notice?.tone === "error" ? "notice-error" : "notice-success"}`}
        >
          {notice?.message ??
            "Semua waktu disimpan sebagai UTC dan ditampilkan dalam WIB."}
        </p>
        <button
          className="button button-primary"
          disabled={pending}
          type="submit"
        >
          {pending ? "Menyimpan…" : session ? "Simpan perubahan" : "Buat sesi"}
        </button>
      </footer>
    </form>
  );
}
