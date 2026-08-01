const systemStatus = {
  application: "kkndesakuncir",
  phase: "Phase 1",
  status: "ready",
  runtime: "Cloudflare Workers melalui OpenNext",
  database: "Schema D1 dan fondasi autentikasi tersedia",
} as const;

export function getSystemStatus() {
  return { ...systemStatus };
}
