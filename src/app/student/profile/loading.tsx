export default function StudentProfileLoading() {
  return (
    <main className="profile-shell" aria-busy="true">
      <p className="eyebrow">Memuat profil</p>
      <div className="skeleton" />
    </main>
  );
}
