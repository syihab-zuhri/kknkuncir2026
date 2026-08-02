const systemStatus = {
  application: "kkndesakuncir",
  phase: "Phase 3",
  status: "ready",
  runtime: "Cloudflare Workers melalui OpenNext",
  database: "Kelompok, mahasiswa, dan sesi tersedia di D1",
} as const;

export function getSystemStatus() {
  return { ...systemStatus };
}
