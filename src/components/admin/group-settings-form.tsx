"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent, type ReactNode } from "react";

import type { GroupSettingsDto } from "@/modules/group/schema";

type MutationNotice = { tone: "success" | "error"; message: string } | null;

export function GroupSettingsForm({
  initialGroup,
}: {
  initialGroup: GroupSettingsDto;
}) {
  const router = useRouter();
  const [notice, setNotice] = useState<MutationNotice>(null);
  const [pending, startTransition] = useTransition();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setNotice(null);

    startTransition(async () => {
      const response = await fetch("/api/v1/group", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          village: form.get("village"),
          district: form.get("district"),
          regency: form.get("regency"),
          address: form.get("address"),
          periodStart: form.get("periodStart"),
          periodEnd: form.get("periodEnd"),
          dailyPolicy: {
            autoCreate: form.get("dailyAutoCreate") === "on",
            startTime: form.get("dailyStartTime"),
            endTime: form.get("dailyEndTime"),
            lateTime: form.get("dailyLateTime"),
            defaultMode: form.get("dailyDefaultMode"),
          },
        }),
      });
      const result = (await response.json()) as {
        error?: { message?: string };
      };

      if (!response.ok) {
        setNotice({
          tone: "error",
          message: result.error?.message ?? "Konfigurasi belum dapat disimpan.",
        });
        return;
      }

      setNotice({
        tone: "success",
        message: "Konfigurasi kelompok tersimpan.",
      });
      router.refresh();
    });
  }

  return (
    <form className="field-form" onSubmit={submit}>
      <section className="field-section" aria-labelledby="identity-heading">
        <div className="field-section-index">A</div>
        <header>
          <p>Identitas lapangan</p>
          <h2 id="identity-heading">Profil kelompok</h2>
        </header>
        <div className="field-grid field-grid-two">
          <Field label="Nama kelompok" name="name" wide>
            <input
              defaultValue={initialGroup.name}
              id="name"
              name="name"
              required
            />
          </Field>
          <Field label="Desa" name="village">
            <input
              defaultValue={initialGroup.village ?? ""}
              id="village"
              name="village"
            />
          </Field>
          <Field label="Kecamatan" name="district">
            <input
              defaultValue={initialGroup.district ?? ""}
              id="district"
              name="district"
            />
          </Field>
          <Field label="Kabupaten" name="regency">
            <input
              defaultValue={initialGroup.regency ?? ""}
              id="regency"
              name="regency"
            />
          </Field>
          <Field label="Alamat posko" name="address" wide>
            <textarea
              defaultValue={initialGroup.address ?? ""}
              id="address"
              name="address"
              rows={3}
            />
          </Field>
        </div>
      </section>

      <section className="field-section" aria-labelledby="period-heading">
        <div className="field-section-index">B</div>
        <header>
          <p>Rentang operasional</p>
          <h2 id="period-heading">Periode KKN</h2>
        </header>
        <div className="field-grid field-grid-two">
          <Field label="Tanggal mulai" name="periodStart">
            <input
              defaultValue={initialGroup.periodStart}
              id="periodStart"
              name="periodStart"
              required
              type="date"
            />
          </Field>
          <Field label="Tanggal selesai" name="periodEnd">
            <input
              defaultValue={initialGroup.periodEnd}
              id="periodEnd"
              name="periodEnd"
              required
              type="date"
            />
          </Field>
        </div>
        <p className="field-callout">
          Seed awal memakai tahun 2026 penuh dan auto-create nonaktif. Sesuaikan
          tanggal nyata sebelum Phase 3.
        </p>
      </section>

      <section className="field-section" aria-labelledby="policy-heading">
        <div className="field-section-index">C</div>
        <header>
          <p>Kebijakan default</p>
          <h2 id="policy-heading">Absensi harian</h2>
        </header>
        <div className="field-grid field-grid-three">
          <Field label="Mulai" name="dailyStartTime">
            <input
              defaultValue={initialGroup.dailyPolicy.startTime.slice(0, 5)}
              id="dailyStartTime"
              name="dailyStartTime"
              required
              type="time"
            />
          </Field>
          <Field label="Selesai" name="dailyEndTime">
            <input
              defaultValue={initialGroup.dailyPolicy.endTime.slice(0, 5)}
              id="dailyEndTime"
              name="dailyEndTime"
              required
              type="time"
            />
          </Field>
          <Field label="Batas terlambat" name="dailyLateTime">
            <input
              defaultValue={
                initialGroup.dailyPolicy.lateTime?.slice(0, 5) ?? ""
              }
              id="dailyLateTime"
              name="dailyLateTime"
              type="time"
            />
          </Field>
          <Field label="Mode default" name="dailyDefaultMode" wide>
            <select
              defaultValue={initialGroup.dailyPolicy.defaultMode}
              id="dailyDefaultMode"
              name="dailyDefaultMode"
            >
              <option value="SELF_SCAN">Scan mandiri</option>
              <option value="ADMIN_SCAN">Scan oleh Admin</option>
              <option value="HYBRID">Hybrid</option>
            </select>
          </Field>
        </div>
        <label className="field-toggle">
          <input
            defaultChecked={initialGroup.dailyPolicy.autoCreate}
            name="dailyAutoCreate"
            type="checkbox"
          />
          <span>
            <strong>Aktifkan pembuatan sesi harian otomatis</strong>
            <small>
              Belum berjalan sampai scheduled handler Phase 3 tersedia.
            </small>
          </span>
        </label>
      </section>

      <footer className="form-dock">
        <p
          aria-live="polite"
          className={notice ? `notice notice-${notice.tone}` : "notice"}
        >
          {notice?.message ?? `Zona waktu terkunci: ${initialGroup.timezone}`}
        </p>
        <button
          className="button button-primary"
          disabled={pending}
          type="submit"
        >
          {pending ? "Menyimpan…" : "Simpan konfigurasi"}
        </button>
      </footer>
    </form>
  );
}

function Field({
  label,
  name,
  wide = false,
  children,
}: {
  label: string;
  name: string;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <label
      className={wide ? "field-control field-wide" : "field-control"}
      htmlFor={name}
    >
      <span>{label}</span>
      {children}
    </label>
  );
}
