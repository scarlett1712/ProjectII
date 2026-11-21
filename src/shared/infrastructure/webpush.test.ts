import { describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({ db: {} }));

import { isValidVapidPrivateKey, isValidVapidPublicKey } from "./webpush";

const b64 = (bytes: number[]) => Buffer.from(bytes).toString("base64url");

describe("VAPID key validation", () => {
  it("accepts a 65-byte uncompressed P-256 public key", () => {
    expect(isValidVapidPublicKey(b64([0x04, ...new Array(64).fill(1)]))).toBe(true);
  });

  it("rejects public keys with the wrong length or prefix", () => {
    expect(isValidVapidPublicKey(b64([0x02, ...new Array(64).fill(1)]))).toBe(false);
    expect(isValidVapidPublicKey(b64([0x04, 1, 2]))).toBe(false);
    expect(isValidVapidPublicKey("")).toBe(false);
    expect(isValidVapidPublicKey(undefined)).toBe(false);
  });

  it("accepts only 32-byte private keys", () => {
    expect(isValidVapidPrivateKey(b64(new Array(32).fill(7)))).toBe(true);
    expect(isValidVapidPrivateKey(b64(new Array(31).fill(7)))).toBe(false);
  });
});
