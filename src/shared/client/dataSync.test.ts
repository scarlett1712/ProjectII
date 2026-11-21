import { describe, expect, it } from "vitest";
import { isSyncRelevant, parseSyncStorageValue, readSyncDomain } from "./dataSync";

describe("readSyncDomain", () => {
  it("lấy domain từ detail của sự kiện", () => {
    expect(readSyncDomain({ domain: "water" })).toBe("water");
  });

  it("thiếu domain thì coi như all", () => {
    expect(readSyncDomain(undefined)).toBe("all");
    expect(readSyncDomain({})).toBe("all");
    expect(readSyncDomain({ domain: "" })).toBe("all");
  });
});

describe("parseSyncStorageValue", () => {
  it("đọc domain từ giá trị notifyDataChanged ghi", () => {
    expect(parseSyncStorageValue(JSON.stringify({ domain: "meals", time: 1 }))).toBe("meals");
  });

  it("giá trị rỗng hoặc hỏng thì coi như all", () => {
    expect(parseSyncStorageValue(null)).toBe("all");
    expect(parseSyncStorageValue("{oops")).toBe("all");
  });
});

describe("isSyncRelevant", () => {
  it("all luôn liên quan", () => {
    expect(isSyncRelevant("all", ["water"])).toBe(true);
  });

  it("chỉ nhận domain đang theo dõi", () => {
    expect(isSyncRelevant("water", ["water"])).toBe(true);
    expect(isSyncRelevant("meals", ["water"])).toBe(false);
    expect(isSyncRelevant("tasks", ["calendar", "tasks"])).toBe(true);
  });

  it("không khai báo domain thì nhận tất cả", () => {
    expect(isSyncRelevant("budget")).toBe(true);
  });
});
