import { describe, expect, it } from "vitest";

import { getSystemStatus } from "../src/lib/system-status";

describe("system status", () => {
  it("exposes the Phase 2 readiness contract", () => {
    expect(getSystemStatus()).toEqual({
      application: "kkndesakuncir",
      phase: "Phase 2",
      status: "ready",
      runtime: "Cloudflare Workers melalui OpenNext",
      database: "Kelompok dan manajemen mahasiswa tersedia di D1",
    });
  });
});
