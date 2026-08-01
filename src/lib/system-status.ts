const systemStatus = {
  application: "kkndesakuncir",
  phase: "Phase 2",
  status: "ready",
  runtime: "Cloudflare Workers melalui OpenNext",
  database: "Kelompok dan manajemen mahasiswa tersedia di D1",
} as const;

export function getSystemStatus() {
  return { ...systemStatus };
}
