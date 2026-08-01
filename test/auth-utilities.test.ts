import { APIError } from "better-auth/api";
import { describe, expect, it } from "vitest";

import { apiErrorResponse } from "../src/lib/api-errors";
import {
  createInternalEmail,
  isValidNim,
  normalizeNim,
} from "../src/lib/auth/identity";
import { validatePassword } from "../src/lib/auth/password-policy";

describe("authentication utilities", () => {
  it("normalizes NIM deterministically while preserving leading zeroes", () => {
    expect(normalizeNim("  00 AB-12  ")).toBe("00ab-12");
    expect(isValidNim("00 AB-12")).toBe(true);
    expect(createInternalEmail(" 00 AB-12 ")).toBe(
      "00ab-12@users.zuhrirey.my.id",
    );
  });

  it("rejects unsafe identifiers", () => {
    expect(isValidNim("ab@example.com")).toBe(false);
    expect(() => createInternalEmail("ab@example.com")).toThrow(
      "NIM tidak valid.",
    );
  });

  it("enforces the password baseline", () => {
    expect(validatePassword("short1")).toMatch(/minimal/i);
    expect(validatePassword("abcdefghij")).toMatch(/huruf dan angka/i);
    expect(validatePassword("amanSekali2026")).toBeNull();
  });

  it("does not expose upstream authentication error details", async () => {
    const response = apiErrorResponse(
      new APIError("BAD_REQUEST", { message: "sensitive upstream detail" }),
    );
    const body = await response.text();

    expect(response.status).toBe(400);
    expect(body).toContain("Permintaan autentikasi tidak dapat diproses.");
    expect(body).not.toContain("sensitive upstream detail");
  });
});
