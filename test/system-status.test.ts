import { describe, expect, it } from "vitest";

import { getSystemStatus } from "../src/lib/system-status";

describe("system status", () => {
  it("exposes only the Phase 0 readiness contract", () => {
    expect(getSystemStatus()).toEqual({
      application: "kkndesakuncir",
      phase: "Phase 0",
      status: "ready",
      runtime: "Cloudflare Workers melalui OpenNext",
      database: "D1 belum diprovisikan",
    });
  });
});
