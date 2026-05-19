import { describe, expect, it } from "vitest";
import { isStrongPassword } from "../src/password-policy";
import {
  createAvatarFallback,
  createSessionToken,
  hashPassword,
  hashToken,
  verifyPassword,
} from "../src/server/security";

describe("security primitives", () => {
  it("hashes and verifies passwords correctly", () => {
    const storedHash = hashPassword("ichigo-secure-password");

    expect(storedHash).toContain(":");
    expect(verifyPassword("ichigo-secure-password", storedHash)).toBe(true);
    expect(verifyPassword("wrong-password", storedHash)).toBe(false);
  });

  it("rejects malformed stored hashes", () => {
    expect(verifyPassword("anything", "not-a-valid-hash")).toBe(false);
  });

  it("enforces the shared password policy", () => {
    expect(isStrongPassword("short")).toBe(false);
    expect(isStrongPassword("alllowercase123!")).toBe(false);
    expect(isStrongPassword("ALLUPPERCASE123!")).toBe(false);
    expect(isStrongPassword("MissingNumber!")).toBe(false);
    expect(isStrongPassword("MissingSymbol123")).toBe(false);
    expect(isStrongPassword("ValidPassword123!")).toBe(true);
  });

  it("creates unique session tokens and deterministic token hashes", () => {
    const firstToken = createSessionToken();
    const secondToken = createSessionToken();

    expect(firstToken).not.toBe(secondToken);
    expect(firstToken).toHaveLength(64);
    expect(hashToken(firstToken)).toBe(hashToken(firstToken));
    expect(hashToken(firstToken)).not.toBe(hashToken(secondToken));
  });

  it("creates encoded avatar fallback URLs", () => {
    const avatarUrl = createAvatarFallback("Nia Grace");

    expect(avatarUrl).toContain("dicebear");
    expect(avatarUrl).toContain("Nia%20Grace");
  });
});
