const systemStatus = {
  application: "kkndesakuncir",
  phase: "Phase 0",
  status: "ready",
  runtime: "Cloudflare Workers melalui OpenNext",
  database: "Resource dan binding D1 siap; schema aplikasi belum dibuat",
} as const;

export function getSystemStatus() {
  return { ...systemStatus };
}
