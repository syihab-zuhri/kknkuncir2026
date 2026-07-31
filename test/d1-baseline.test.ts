import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";

describe("Cloudflare test runtime", () => {
  it("provides an isolated D1 binding", async () => {
    const result = await env.DB.prepare("SELECT 1 AS ok").first<{
      ok: number;
    }>();

    expect(result).toEqual({ ok: 1 });
  });
});
