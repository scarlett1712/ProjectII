import { describe, expect, it } from "vitest";
import { readStoredJson, writeStoredJson } from "./storage";
import { createMemoryStorage } from "./testStorage";

describe("readStoredJson / writeStoredJson", () => {
  it("ghi rồi đọc lại đúng giá trị", () => {
    const storage = createMemoryStorage();
    writeStoredJson("k", { a: [1, 2] }, storage);
    expect(readStoredJson("k", storage)).toEqual({ a: [1, 2] });
  });

  it("trả undefined khi chưa có, JSON hỏng hoặc không có storage", () => {
    expect(readStoredJson("missing", createMemoryStorage())).toBeUndefined();
    expect(readStoredJson("k", createMemoryStorage({ k: "{bad" }))).toBeUndefined();
    expect(readStoredJson("k", undefined)).toBeUndefined();
  });

  it("bỏ qua lỗi khi ghi (vd hết dung lượng)", () => {
    const storage = { getItem: () => null, setItem: () => { throw new Error("quota"); } };
    expect(() => writeStoredJson("k", 1, storage)).not.toThrow();
  });
});
