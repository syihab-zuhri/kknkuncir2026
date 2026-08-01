import { describe, expect, it } from "vitest";

import { getSystemStatus } from "../src/lib/system-status";

describe("system status", () => {
  it("exposes the Phase 1 readiness contract", () => {
    expect(getSystemStatus()).toEqual({
      application: "kkndesakuncir",
      phase: "Phase 1",
      status: "ready",
      runtime: "Cloudflare Workers melalui OpenNext",
      database: "Schema D1 dan fondasi autentikasi tersedia",
    });
  });
});
