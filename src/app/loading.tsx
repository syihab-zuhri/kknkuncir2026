export default function Loading() {
  return (
    <main className="shell" aria-busy="true" aria-label="Memuat halaman">
      <p className="eyebrow">Memuat</p>
      <div className="skeleton" />
    </main>
  );
}
