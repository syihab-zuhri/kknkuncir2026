"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application render failed", { digest: error.digest });
  }, [error]);

  return (
    <main className="shell">
      <section
        className="health-panel"
        role="alert"
        aria-labelledby="error-title"
      >
        <p className="eyebrow">Terjadi kendala</p>
        <h1 id="error-title">Halaman belum dapat ditampilkan.</h1>
        <p className="lede">
          Coba muat kembali halaman. Tidak ada data sensitif yang ditampilkan.
        </p>
        <button className="retry-button" onClick={reset} type="button">
          Coba lagi
        </button>
      </section>
    </main>
  );
}
