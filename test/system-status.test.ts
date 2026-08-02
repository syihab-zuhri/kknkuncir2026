import { describe, expect, it } from "vitest";

import { getSystemStatus } from "../src/lib/system-status";

describe("system status", () => {
  it("exposes the Phase 3 readiness contract", () => {
    expect(getSystemStatus()).toEqual({
      application: "kkndesakuncir",
      phase: "Phase 3",
      status: "ready",
      runtime: "Cloudflare Workers melalui OpenNext",
      database: "Kelompok, mahasiswa, dan sesi tersedia di D1",
    });
  });
});
