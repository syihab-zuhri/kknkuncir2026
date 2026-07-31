const systemStatus = {
  application: "kkndesakuncir",
  phase: "Phase 0",
  status: "ready",
  runtime: "Cloudflare Workers melalui OpenNext",
  database: "D1 belum diprovisikan",
} as const;

export function getSystemStatus() {
  return { ...systemStatus };
}
