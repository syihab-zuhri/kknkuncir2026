"use client";

import { useState, useTransition, type ChangeEvent } from "react";

import type { StudentImportResult } from "@/modules/students/schema";

type ImportResponse = {
  dryRun: boolean;
  summary: {
    total: number;
    valid: number;
    invalid: number;
    created: number;
    failed: number;
  };
  results: StudentImportResult[];
  error?: { message?: string };
};

export function StudentImportForm() {
  const [csv, setCsv] = useState("");
  const [fileName, setFileName] = useState("");
  const [result, setResult] = useState<ImportResponse | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setResult(null);
    setMessage(null);

    if (!file) {
      setCsv("");
      setFileName("");
      return;
    }

    setFileName(file.name);
    startTransition(async () => setCsv(await file.text()));
  }

  function runImport(dryRun: boolean) {
    setMessage(null);
    startTransition(async () => {
      const response = await fetch("/api/v1/admin/students/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ csv, dryRun }),
      });
      const payload = (await response.json()) as ImportResponse;

      if (!response.ok) {
        setMessage(payload.error?.message ?? "CSV belum dapat diproses.");
        return;
      }

      setResult(payload);
      setMessage(
        dryRun
          ? "Dry-run selesai. Periksa setiap baris sebelum membuat akun."
          : `${payload.summary.created} akun berhasil dibuat. Salin password sementara sekarang.`,
      );
    });
  }

  const canApply =
    result?.dryRun === true &&
    result.summary.valid > 0 &&
    result.summary.invalid === 0;

  return (
    <details className="action-panel">
      <summary>
        <span className="action-panel-marker">⇧</span>
        Impor CSV
      </summary>
      <div className="compact-form">
        <div className="import-dropzone">
          <label className="button button-secondary" htmlFor="student-csv">
            Pilih berkas CSV
          </label>
          <input
            accept=".csv,text/csv"
            id="student-csv"
            onChange={chooseFile}
            type="file"
          />
          <span>{fileName || "Belum ada berkas dipilih"}</span>
          <small>
            Header wajib: nim,nama. Opsional: telepon. Maksimal 50 baris.
          </small>
        </div>
        <div className="action-row">
          <button
            className="button button-secondary"
            disabled={!csv || pending}
            onClick={() => runImport(true)}
            type="button"
          >
            {pending ? "Memeriksa…" : "Jalankan dry-run"}
          </button>
          <button
            className="button button-primary"
            disabled={!canApply || pending}
            onClick={() => runImport(false)}
            type="button"
          >
            Buat akun valid
          </button>
        </div>
        <p
          aria-live="polite"
          className={result ? "notice notice-success" : "notice notice-error"}
        >
          {message}
        </p>
        {result ? <ImportResults result={result} /> : null}
      </div>
    </details>
  );
}

function ImportResults({ result }: { result: ImportResponse }) {
  return (
    <div className="import-results">
      <div className="metric-strip" aria-label="Ringkasan impor">
        <span>
          Total <strong>{result.summary.total}</strong>
        </span>
        <span>
          Valid{" "}
          <strong>{result.summary.valid || result.summary.created}</strong>
        </span>
        <span>
          Masalah{" "}
          <strong>{result.summary.invalid + result.summary.failed}</strong>
        </span>
      </div>
      <div className="responsive-table">
        <table>
          <thead>
            <tr>
              <th>Baris</th>
              <th>Mahasiswa</th>
              <th>Status</th>
              <th>Password sementara</th>
            </tr>
          </thead>
          <tbody>
            {result.results.map((row) => (
              <tr key={`${row.row}-${row.nim}`}>
                <td>{row.row}</td>
                <td>
                  <strong>{row.fullName || "—"}</strong>
                  <small>{row.nim || "NIM kosong"}</small>
                </td>
                <td>
                  <span
                    className={`status-pill status-${row.status.toLowerCase()}`}
                  >
                    {row.status}
                  </span>
                  {row.errors.map((error) => (
                    <small key={error}>{error}</small>
                  ))}
                </td>
                <td>
                  <code>{row.temporaryPassword ?? "—"}</code>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
